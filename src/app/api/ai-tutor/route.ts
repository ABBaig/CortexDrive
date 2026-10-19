import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;
    // Forward to Supabase Edge Function ai-tutor
    const ef = await fetch(`${process.env.SUPABASE_URL?.replace(/\/$/, '')}/functions/v1/ai-tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ message }),
    });
    if (!ef.ok) {
      const txt = await ef.text();
      return NextResponse.json({ message: 'Edge Function error', detail: txt }, { status: 502 });
    }
    const d = await ef.json();
    return NextResponse.json(d);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
