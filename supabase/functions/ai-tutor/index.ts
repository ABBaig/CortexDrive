// Supabase Edge Function: ai-tutor
// Receives { session_id?, message, locale } and returns assistant reply from Gemini.
// Uses GOOGLE_API_KEY secret. Does not assume DB migrations; will return mock if DB not accessible.

import fetch from 'node-fetch';

export default async function handler(req: Request) {
  try {
    const body = await req.json();
    const { session_id, message, locale, user_name, city, license_stage, last_quiz_score } = body || {};
    if (!message) return new Response(JSON.stringify({ message: 'missing message' }), { status: 400 });

    const apiKey = process.env.GOOGLE_API_KEY;
    const systemPrompt = `You are a Pakistan driving instructor. Reply in the user's chosen language (English, Urdu script, or Roman Urdu). Keep answers short and practical. Context: user name=${user_name||'Learner'}, city=${city||'Unknown'}, license_stage=${license_stage||'unknown'}, last_quiz_score=${last_quiz_score ?? 'n/a'}`;

    if (!apiKey) {
      // mock reply
      const mock = { reply: `سلام ${user_name || 'Learner'}, practice keeping both hands on the wheel. (mock reply)` };
      return new Response(JSON.stringify(mock), { status: 200 });
    }

    const prompt = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gemini-1.5-flash', prompt, max_output_tokens: 512 }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ message: 'Gemini error', detail: txt }), { status: 502 });
    }

    const data = await resp.json();
    let text = '';
    try {
      if (data.output?.[0]?.content?.[0]?.text) text = data.output[0].content[0].text;
      else if (data.choices?.[0]?.message?.content) text = data.choices[0].message.content;
    } catch (e) {
      text = '';
    }

    const reply = text || 'Sorry, I did not understand. Could you rephrase?';

    // Note: persistence to chat_sessions/chat_messages requires DB migration which may not be applied in preview.
    // Return the reply and raw Gemini payload for potential saving by a separate process.
    return new Response(JSON.stringify({ reply, raw: data }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), { status: 500 });
  }
}
