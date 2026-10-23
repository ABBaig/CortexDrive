// Gemini adapter for server-side AI calls (AGENTS.md: all Gemini logic under /lib/gemini).
// Used by the ai-verify Edge Function and server routes. Never call from client code.

import { GoogleGenerativeAI } from '@google/generative-ai';

let cached: GoogleGenerativeAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_API_KEY || Deno?.env?.get?.('GOOGLE_API_KEY'));
}

export function getGeminiModel(model = 'gemini-1.5-flash') {
  const key =
    (typeof process !== 'undefined' && process.env.GOOGLE_API_KEY) ||
    (typeof Deno !== 'undefined' ? Deno.env.get('GOOGLE_API_KEY') : undefined);

  if (!key) {
    throw new Error('GOOGLE_API_KEY is not configured. Add it to .env.local or run: supabase secrets set GOOGLE_API_KEY=...');
  }
  if (!cached) cached = new GoogleGenerativeAI(key);
  return cached.getGenerativeModel({ model });
}
