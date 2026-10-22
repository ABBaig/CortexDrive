import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const userCooldowns = new Map();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, locale } = body;
    if (!message) return NextResponse.json({ error: 'missing message' }, { status: 400 });

    // simple per-user cooldown based on IP (best-effort in this environment)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anon';
    const last = userCooldowns.get(ip) || 0;
    if (Date.now() - last < 5000) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    userCooldowns.set(ip, Date.now());

    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) {
      return NextResponse.json({ answer: `[MOCK ANSWER] ${message}`, mock: true });
    }

    // Use Google Generative Language Gemini endpoint (API key header x-goog-api-key)
    const systemInstruction = (()=>{
      if (locale && locale.startsWith('ur')) return 'Answer in Urdu, helpful driving instructor tone.';
      if (locale === 'roman_ur') return 'Answer in Roman Urdu (Latin script), helpful driving instructor tone.';
      return 'Answer in English, helpful driving instructor tone.';
    })();

    const payload = {
      prompt: {
        text: `${systemInstruction}\nUser: ${message}`
      },
      temperature: 0.2,
      maxOutputTokens: 400
    };

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-preview:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: 'provider_error', detail: txt }, { status: 502 });
    }
    const json = await res.json();
    const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text || json?.candidates?.[0]?.content || '[NO_ANSWER]';
    return NextResponse.json({ answer, mock: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
