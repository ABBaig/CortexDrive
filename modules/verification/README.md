Module: Verification

This module contains UI and server integration for AI-based document verification
and a license progression tracker. It integrates with a Supabase Edge Function
`ai-verify` (supabase/functions/ai-verify) which calls Gemini (vision-capable) to
OCR a CNIC / driving license and compare faces.

Important: the Gemini API key must be set as the Edge Function secret GOOGLE_API_KEY.
Do not expose it to the client. The server-side Next.js API calls the Edge Function
using SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL from the environment.
