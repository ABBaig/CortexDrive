import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const body = await req.json();
  const other = body.other_user_id;
  const bookingId: string | null = body.booking_id ?? null;
  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user;
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!other) return NextResponse.json({ error: 'missing other_user_id' }, { status: 400 });

  // call RPC to get or create conversation
  const rpc = await supabase.rpc('get_or_create_conversation', { p_user_a: user.id, p_user_b: other });
  if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 500 });
  const conversation_id = rpc.data;

  // Link the conversation to the booking (booking -> chat feature).
  // Only the booking's learner or instructor may create the link; duplicates
  // are tolerated (unique constraint) so this is safe to call repeatedly.
  if (bookingId) {
    try {
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select('id,learner_id,instructor_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (!bErr && booking && (booking.learner_id === user.id || booking.instructor_id === user.id)) {
        const { error: linkErr } = await supabase
          .from('conversation_bookings')
          .insert({ conversation_id, booking_id: bookingId });
        // 23505 = unique_violation: link already exists — that's success for us
        if (linkErr && (linkErr as any).code !== '23505') {
          // non-fatal: the conversation still opens even if the link can't be written
          console.warn('conversation_bookings link failed:', linkErr.message);
        }
      }
    } catch (e) {
      console.warn('conversation_bookings link failed:', e);
    }
  }

  return NextResponse.json({ conversation_id });
}