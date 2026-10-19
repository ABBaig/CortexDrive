# AGENTS.md — CortexDrive AI Assistant Guide

This AGENTS.md is the authoritative guide for AI coding assistants working on the CortexDrive repository. It outlines the project context, stack, conventions, safety rules, and folder ownership so all future builds and edits follow the same constraints.

Project: CortexDrive — AI-verified driving school + vehicle companion platform (Pakistan)

Purpose
- Provide clear, machine- and human-readable rules so assistants make safe, consistent changes.
- Enforce the stack, theme, folder ownership, RLS-first security model, i18n rules, and DB table reuse from SPEC.md.

Quick start (developer commands)

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
```

Stack & architecture
- Language: TypeScript (strict mode). No JavaScript files for new code.
- Framework: Next.js (App Router) at repository root.
- Database: Supabase (Postgres). Use @supabase/supabase-js for client and server. RLS is authoritative for RBAC.
- Edge Functions: Supabase Edge Functions live in /supabase/functions for server-only privileged logic (e.g. wallet ledger operations).
- UI: Tailwind CSS + shadcn/ui. Theme tokens use CSS variables (see Theme section). Never use raw hex values in components; use tokens.
- LLM: Google Gemini via @google/generative-ai. All AI calls through /lib/gemini; system prompts stored in /lib/gemini/prompts and versioned.
- State: Server state via Supabase client + React Query. Use Zustand only for small client UI state.
- i18n: next-intl with locales at /locales (en.json, ur.json, roman_ur.json). No hardcoded visible strings in JSX — use translation keys.
- Styling: mobile-first PWA. Use Tailwind utilities that reference CSS variables for theme colors.
- Testing: ESLint + light E2E smoke tests (login, booking flow, wallet balance).
- Hosting: Vercel for Next.js, Supabase Cloud for DB and Edge Functions.

Theme tokens (must be used as CSS variables in tailwind.config)
- --cd-bg: dark slate background (Hex: #0f172a) — use token, not hex directly
- --cd-primary: electric cyan (Hex: #22d3ee)
- --cd-success: emerald green (Hex: #10b981)

Component library & styling rules
- Use shadcn/ui as the base component set. Prefer existing components before adding new ones.
- Co-locate component styles (if any) inside the component folder.
- Do not hardcode visible strings inside JSX; use next-intl translation keys.
- Keep components small (< ~200 lines), export a single main thing per file.

Gemini & prompts
- All Gemini logic goes under /lib/gemini. Create a small adapter around @google/generative-ai.
- Load the Gemini key from process.env (e.g. GOOGLE_API_KEY). Fail gracefully with a clear message if missing.
- System prompts must live in /lib/gemini/prompts/v1/*.txt and be versioned. A prompt manifest (JSON) may live next to prompts.
- Use server-side calls (Edge Function or server route) for OCR, face-match, tutor chat, quiz generation — never call Gemini directly from client-side code.

Supabase & DB rules
- Use /supabase/migrations for SQL migrations. All migrations must be idempotent (create if not exists) and include RLS policies.
- Seeds go in /supabase/seed and must create: one learner, one instructor, one vendor, one super admin, sample bookings, wallet transactions, fuel logs, and one sos alert.
- Reuse table and column names from SPEC.md section 6 exactly. Do not rename or invent tables.
- RBAC must be enforced using Row-Level Security (RLS) only. UI must never attempt to enforce RBAC in place of RLS.
- Supabase client usage rules:
  - Client-side code: use the public anon key (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).
  - Server-side / Edge Functions: read SUPABASE_SERVICE_ROLE_KEY from process.env; never commit it.
- Wallet ledger logic (escrow, fee split, payout, refund) must be implemented as Supabase Edge Functions under /supabase/functions. Client code must never write directly to wallets/transactions tables.

Security & secrets
- Never commit secrets or service role keys. Add any required secrets in the workspace Secrets panel or the Vercel dashboard.
- Add a .env.example at the repo root listing required env vars (empty values + one-line comment). Do NOT commit .env.local.

i18n rules
- Use next-intl. Add translations to /locales/en.json, /locales/ur.json, /locales/roman_ur.json.
- All visible UI copy must use translation keys via next-intl hooks or components.

Folder ownership and allowed touch areas
- Assistants must respect module ownership. For a given task only modify files inside the module folders listed below unless the task explicitly requires touching shared infra files (lib/, supabase/, app/):
  - /modules/auth
  - /modules/verification
  - /modules/marketplace
  - /modules/wallet
  - /modules/vehicle
  - /modules/safety
  - /modules/admin
- Shared infra (lib/, supabase/, app/, locales/, styles/) may be modified when implementing cross-cutting features, but document changes in PR description.

Onboarding & roles
- Implement a 4-step onboarding wizard for roles: learner, instructor, vendor, admin. Store role in profiles table and in auth.user_metadata when appropriate.

SOS & realtime
- SOS alerts are a realtime feed (sos_alerts table) to super admin dashboards only. Use Supabase Realtime for v1.0.
- Do not implement push notifications or emergency contacts in v1.0.

Payments & ledger
- Payments: sandbox/stub gateway for v1.0.
- Wallet ledger: implement real ledger behavior in Edge Functions with idempotency, audit columns (created_by, created_at), and deterministic fee split (10% platform, 90% instructor).

Tests & CI
- Add ESLint + TypeScript checks. Provide a few Playwright/Cypress smoke tests covering login, booking a lesson, and a wallet balance check.

Migrations & seeds
- Add initial migration at supabase/migrations/0001_init.sql defining core tables and RLS (profiles, instructor_profiles, vendor_profiles, services, bookings, wallets, transactions, verifications, documents, sos_alerts, fuel_logs, service_records, reviews, disputes).
- Add seeds under supabase/seed that populate demo data (learner, instructor, vendor, admin, bookings, wallet txns, fuel logs, sos alert).

Development safety checklist for PRs touching sensitive areas
- Run lint and typecheck
- Add migration and call database_schema() before apply_migration
- Ensure RLS policies reference auth.uid() and cover new tables
- Add an E2E smoke test exercising the primary user flow
- Never expose SUPABASE_SERVICE_ROLE_KEY or other secrets in code or logs

.env.example (must be present at repo root)

```
NEXT_PUBLIC_SUPABASE_URL=    # public Supabase URL for client
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # public anon key for client
SUPABASE_URL=    # server Supabase URL
SUPABASE_SERVICE_ROLE_KEY=    # server-only service role key (DO NOT COMMIT)
GOOGLE_API_KEY=    # Gemini / Generative AI key (server-side).
NEXT_PUBLIC_GA_MEASUREMENT_ID=    # optional Google Analytics measurement id
```

Rules for assistants
- AGENTS.md is authoritative: follow it for stack, theme, roles, i18n, DB table reuse, RLS, folder ownership and rules.
- Make small focused edits and prefer editing existing files. Read files you will modify before changing them.
- Do not add secrets or .env.local files. Fail gracefully when a required secret is missing.
- Use conventional commits for commit messages and create feature branches like feat/wallet.

Where to get help
- Consult SPEC.md for table names and domain rules.
- Ask a human reviewer for changes that affect RLS, wallets, or billing logic.

This AGENTS.md must be kept up-to-date as project requirements evolve. All future builds and assistant actions should use this file as the single source of behavior and safety rules.