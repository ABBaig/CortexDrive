AI Verification additions

Files added/changed in this patch:
- Database migration applied: create_verification_tables (users, verifications, license_progress).
- src/lib/db.ts - small pg pool helper.
- src/app/[locale]/verification/page.tsx - AI Verification UI (file upload, run verification).
- src/app/api/upload/route.ts - demo upload that stores files to /tmp and returns a URL.
- src/app/api/verification/route.ts - server route that mocks calling Gemini and persists results to verifications table and updates users.verification_status.
- src/app/[locale]/license/page.tsx - License progress form + visual stepper.
- src/app/api/license/route.ts - API to save license progress.

Important notes:
- The preview environment cannot call Google Gemini. The Next API route currently mocks the AI response. In production implement the Supabase Edge Function `ai-verify` which will call Gemini with the secret stored as an Edge Function secret.
- Uploaded files are saved to /tmp for preview only; replace with Supabase Storage 'documents' private bucket upload in production.

How to run:
- npm install
- npm run dev

Assumptions:
- There is no existing users table; migration created one for demo purposes. If your real project has a users table, merge carefully.
