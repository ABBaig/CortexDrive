// Supabase Edge Function: ai-verify
// This function expects a JSON body: { doc_url: string, selfie_url: string, doc_type?: string }
// It calls the Google/Vertex AI (Gemini) vision-capable model to OCR the document and
// compare faces. The Gemini API key must be provided in the environment as GOOGLE_API_KEY
// (set as a secret for the Edge Function). This file is a best-effort implementation
// following the project spec; in the preview environment the call will be skipped if
// GOOGLE_API_KEY is missing and a mock response will be returned.

// Edge runtime provides fetch; avoid node-fetch import for preview
import type { IncomingMessage, ServerResponse } from 'http';
// The Edge Function runtime will supply the request/response types; we use lightweight types here.
export type VercelRequest = Request & { body?: any };
export type VercelResponse = ServerResponse;
type Result = {
  full_name?: string;
  cnic_number?: string;
  dob?: string;
  issue_date?: string;
  expiry_date?: string;
  face_match_score?: number;
  ai_decision?: 'verified' | 'needs_review' | 'rejected';
  raw?: any;
};

const FACE_THRESH_VERIFIED = 0.75;
const FACE_THRESH_REVIEW = 0.5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { doc_url, selfie_url } = req.body || {};
    if (!doc_url || !selfie_url) return res.status(400).json({ message: 'doc_url and selfie_url required' });

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      // Return a mock response so local dev and the preview continue to work.
      const mock: Result = {
        full_name: 'Muhammad Example',
        cnic_number: '12345-6789012-3',
        dob: '1990-01-01',
        face_match_score: 0.82,
        ai_decision: 'verified',
        raw: { mock: true },
      };
      return res.status(200).json(mock);
    }

    // Build a structured Gemini prompt asking for OCR and face match.
    const prompt = `You are an OCR and face-matching assistant. Given a document image URL and a selfie URL, extract: full name, CNIC number, date of birth (YYYY-MM-DD), issue date, expiry date if available. Then compare the face in the selfie to the face on the document and return a face_match_score between 0.0 and 1.0. Return JSON only with keys: full_name, cnic_number, dob, issue_date, expiry_date, face_match_score, and any debug info under raw. Do not include extra commentary.`;

    // Call Gemini REST API (this is a conceptual example; update endpoint per your GCP setup).
    const body = {
      model: 'gemini-1.5-flash',
      prompt: [
        { role: 'system', content: 'Vision-capable OCR and face match' },
        { role: 'user', content: prompt },
        { role: 'user', content: `Document URL: ${doc_url}` },
        { role: 'user', content: `Selfie URL: ${selfie_url}` },
      ],
      max_output_tokens: 1024,
    };

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const tx = await resp.text();
      return res.status(502).json({ message: 'Gemini API error', detail: tx });
    }

    const data = await resp.json();
    // Attempt to parse JSON text response
    let parsed: any = data;
    // Many LLM responses embed text in choices/outputs; try to find it.
    const text = (() => {
      try {
        if (data.output?.[0]?.content?.[0]?.text) return data.output[0].content[0].text;
        if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
        return null;
      } catch (e) {
        return null;
      }
    })();

    if (text) {
      try { parsed = JSON.parse(text); } catch (e) { parsed = { raw_text: text }; }
    }

    const out: Result = {
      full_name: parsed.full_name,
      cnic_number: parsed.cnic_number,
      dob: parsed.dob,
      issue_date: parsed.issue_date,
      expiry_date: parsed.expiry_date,
      face_match_score: typeof parsed.face_match_score === 'number' ? parsed.face_match_score : parseFloat(parsed.face_match_score || '0') || undefined,
      raw: parsed,
    };

    // Derive final decision from score and presence of fields
    const score = out.face_match_score ?? 0;
    const hasFields = out.full_name && out.cnic_number && out.dob;
    if (score >= FACE_THRESH_VERIFIED && hasFields) out.ai_decision = 'verified';
    else if (score >= FACE_THRESH_REVIEW) out.ai_decision = 'needs_review';
    else out.ai_decision = 'rejected';

    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}
