import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient as getServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { verification_id, doc_url, selfie_url } = body;

    const supabase = await getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'not signed in' }, { status: 401 });
    }

    // Call Edge Function with service role key
    let aiRes: Response | null = null;
    let aiJson: any = null;
    try {
      aiRes = await fetch(`${process.env.SUPABASE_URL?.replace(/\/$/, '')}/functions/v1/ai-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ doc_url, selfie_url }),
      });
      if (!aiRes.ok) throw new Error('edge function returned non-ok');
      aiJson = await aiRes.json();
    } catch (e) {
      // AI unavailable: leave verification row as pending and return ai_unavailable
      return NextResponse.json({ ai_unavailable: true });
    }

    // Map ai_decision to status
    const mapping: Record<string, string> = {
      verified: 'verified',
      needs_review: 'needs_review',
      rejected: 'rejected',
    };
    const aiDecision = aiJson.ai_decision ?? aiJson.aiDecision ?? null;
    const status = mapping[String(aiDecision)] ?? 'needs_review';

    // Update verifications row with owner check
    const updates: any = {
      status,
    };
    if (aiJson.raw !== undefined) updates.ocr_payload = aiJson.raw;
    if (aiJson.face_match_score !== undefined) updates.face_match_score = aiJson.face_match_score;

    const { data, error: updateError } = await supabase.from('verifications').update(updates).eq('id', verification_id).eq('user_id', user.id).select().limit(1).single();
    if (updateError) {
      // If columns missing or other db error, still return ai result summary but report error
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    const out = {
      status: status,
      face_match_score: aiJson.face_match_score ?? null,
      ocr: {
        full_name: aiJson.full_name ?? null,
        cnic_number: aiJson.cnic_number ?? null,
        dob: aiJson.dob ?? null,
      },
    };

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
