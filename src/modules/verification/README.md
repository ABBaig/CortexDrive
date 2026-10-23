# CNIC AI Verification Kit (Gemini OCR + Supabase)

Upload a CNIC or driving licence image → Gemini 1.5 Flash OCR extracts name / CNIC number / DOB → face-match score vs selfie → result saved to the Supabase `verifications` table with a status badge on the user dashboard. Drop-in module for any Next.js (App Router) + Supabase app.

## What's in the kit

| File | Purpose |
|---|---|
| `supabase/functions/ai-verify/index.ts` | Supabase Edge Function (Deno): receives doc + selfie storage paths, calls Gemini 1.5 Flash for OCR + face-match, returns structured result. Falls back to a mock result when no API key is set (demos never break) |
| `supabase/migrations/003_verifications_kit.sql` | Adds `doc_url`, `selfie_url`, `ocr_payload`, `face_match_score`, `ai_decision` columns; `needs_review` status; owner-update RLS policy; private `verifications` storage bucket + owner-scoped storage policies (idempotent) |
| `src/modules/verification/UploadForm.tsx` | Drop-in `<UploadForm />` — CNIC/licence + selfie upload UI, triggers the full flow |
| `src/modules/verification/ResultBadge.tsx` | Reusable status badge (pending / verified / needs_review / rejected) |
| `src/modules/verification/useVerification.ts` | Client hook: uploads images → inserts `pending` row → triggers AI route |
| `src/modules/verification/VerificationStatus.tsx` | Fetches the user's verification rows — proves persistence across sign-out/sign-in |
| `src/modules/verification/useSelfieCapture.ts` | Selfie file input with preview (revokes object URLs) |
| `src/modules/verification/AiResultBanner.tsx` | AI result banner (verified % / needs review / rejected / unavailable) |
| `src/modules/verification/types.ts` | Shared `AiResult` / `AiOcr` types |
| `src/app/api/verification/route.ts` | Owner-checked server route: calls the Edge Function, saves status + OCR payload + score to the DB |
| `src/lib/gemini/index.ts` | Gemini adapter (server-side only, key from env, graceful failure) |
| `src/lib/gemini/prompts/v1/ai-verify.txt` | Versioned OCR + face-match prompt (JSON-only output) |
| `.env.example` | Env var names only — no secrets |

## Setup (5 steps)

**1) Environment variables** — copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=        # from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # public anon key
SUPABASE_URL=                    # same as above (server-side alias)
SUPABASE_SERVICE_ROLE_KEY=       # server-only — never expose to the browser
GOOGLE_API_KEY=                  # Gemini key from https://aistudio.google.com/apikey
```

**2) Database** — run `supabase/migrations/003_verifications_kit.sql` in the Supabase SQL editor (or `supabase db push`). It creates the `verifications` table columns, RLS policies, and the private `verifications` storage bucket.

**3) Deploy the Edge Function** with the Gemini key:

```bash
supabase functions deploy ai-verify
supabase secrets set GOOGLE_API_KEY=your-key
```

**4) Drop in the form** — put `<UploadForm />` on any page behind auth (the kit page `src/app/[locale]/verification/page.tsx` shows exactly this):

```tsx
import UploadForm from '@/modules/verification/UploadForm';

export default function VerificationPage() {
  return <UploadForm />;
}
```

**5) Verify the flow**: sign in → upload CNIC photo + selfie → click Verify → OCR result + status saved → the dashboard badge shows **Verified** / **Needs review**. Sign out and sign back in — the status persists (it's stored in Postgres, not client state).

## How the decision is made

| face_match_score | OCR fields present | Result |
|---|---|---|
| ≥ 0.75 | yes | `verified` |
| ≥ 0.50 | any | `needs_review` |
| < 0.50 | any | `rejected` |

- AI outage or missing key → the row stays `pending` and admins handle it in the manual review queue — user submissions never fail.
- The Gemini key lives only in Supabase secrets / server env — never in client code (see `AGENTS.md` security rules).

## Tech stack

TypeScript · Next.js (App Router) · React · Supabase (Postgres + RLS + Storage + Edge Functions, Deno) · Google Gemini 1.5 Flash · Tailwind CSS · next-intl
