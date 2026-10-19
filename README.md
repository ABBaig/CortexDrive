CortexDrive — AI-verified driving school + vehicle companion platform (Pakistan)

Stack
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres with RLS, Realtime, Storage, Edge Functions)
- Google Gemini (server-side via @google/generative-ai)

Setup (dev)
1. Clone repository
2. Add required environment variables in the workspace Secrets panel or .env.local (do NOT commit .env.local). See .env.example.
3. npm install
4. npm run dev

Database
- Run the SQL migration in supabase/migrations/0001_init.sql against your Supabase project (use the Supabase CLI or dashboard).

Notes
- Wallet ledger and other privileged operations must run via Supabase Edge Functions under /supabase/functions.
- Seeds are in supabase/seed (not yet created in this commit).

Live URL: (placeholder)
