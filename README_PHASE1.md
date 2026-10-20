Phase 1: Core wallet & booking skeleton

Run:
1. npm install
2. npm run dev

Notes:
- Database migration to add wallets/transactions/platform_settings/sos/vehicle_logs was prepared but held for approval (see Database panel).
- Supabase Edge Functions created: "fee-split" and "no-show-refund" under supabase/functions. They use SUPABASE_URL and SUPABASE_ANON_KEY from env.
- Demo seed SQL in supabase/seed/demo-data.sql to populate basic demo rows (run via supabase CLI or DB panel after applying migration).
