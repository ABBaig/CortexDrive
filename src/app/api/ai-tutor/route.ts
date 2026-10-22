import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;
    if (!message) return NextResponse.json({ error: 'missing message' }, { status: 400 });

    // Do not use SUPABASE_SERVICE_ROLE_KEY from browser — server-only required
    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) {
      // clear mock response labeled as MOCK
      return NextResponse.json({ answer: `[MOCK ANSWER] ${message}` });
    }

    // Call Google Generative Language API
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${googleKey}` },
      body: JSON.stringify({ prompt: { text: message }, temperature: 0.2, maxOutputTokens: 400 }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: 'provider_error', detail: txt }, { status: 502 });
    }
    const json = await res.json();
    const answer = json?.candidates?.[0]?.content ?? json?.output?.[0]?.content ?? '[NO_ANSWER]';
    return NextResponse.json({ answer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
