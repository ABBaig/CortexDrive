import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const userCooldowns = new Map();

type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

const MOCK_QUIZ: QuizQuestion[] = [
  {
    question: 'What does a red traffic light mean?',
    options: ['Speed up', 'Stop', 'Turn left', 'Honk'],
    answerIndex: 1,
    explanation: 'A red light means you must stop before the stop line.',
  },
  {
    question: 'What is the legal document you must carry while driving?',
    options: ['Library card', 'Driving license', 'Birth certificate', 'Report card'],
    answerIndex: 1,
    explanation: 'You must carry a valid driving license while driving.',
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, locale } = body;
    if (!topic) return NextResponse.json({ error: 'missing topic' }, { status: 400 });

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'anon';
    const last = userCooldowns.get(ip) || 0;
    if (Date.now() - last < 5000) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    userCooldowns.set(ip, Date.now());

    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) {
      return NextResponse.json({ questions: MOCK_QUIZ, mock: true });
    }

    const langInstruction =
      locale === 'ur'
        ? 'Write all questions, options, and explanations in Urdu.'
        : locale === 'roman_ur'
          ? 'Write all questions, options, and explanations in Roman Urdu (Latin script).'
          : 'Write all questions, options, and explanations in English.';

    const systemInstruction = `You are a driving-test examiner in Pakistan creating short quizzes. ${langInstruction} Return ONLY valid JSON, no markdown fences, in this exact shape: {"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"..."}]}. Exactly 5 questions, each with exactly 4 options, answerIndex is the 0-based index of the single correct option, and explanation is one or two sentences.`;

    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: `Create a quiz about: ${topic}` }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: 'provider_error', detail: txt }, { status: 502 });
    }
    const json = await res.json();
    const text: string =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '';

    let questions: QuizQuestion[] = [];
    try {
      const parsed = JSON.parse(text);
      questions = (parsed?.questions ?? []).filter(
        (q: any) =>
          typeof q?.question === 'string' &&
          Array.isArray(q?.options) &&
          q.options.length === 4 &&
          typeof q?.answerIndex === 'number' &&
          q.answerIndex >= 0 &&
          q.answerIndex < 4
      );
    } catch {
      return NextResponse.json({ error: 'provider_error', detail: 'unparseable quiz JSON' }, { status: 502 });
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: 'provider_error', detail: 'no valid questions' }, { status: 502 });
    }
    return NextResponse.json({ questions, mock: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}