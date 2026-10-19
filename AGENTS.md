# AGENTS.md — CortexDrive AI Assistant Guide

This AGENTS.md guides AI coding assistants working on the CortexDrive repository. It adapts the agentsmd base guidance to CortexDrive's conventions, development commands, architecture notes, and security safeguards. Use this file as the single source of truth for how an assistant should modify, test, and reason about the codebase.

Important: Keep this file prose-first with fenced code blocks for commands, SQL/RLS examples, and env key examples. Do not add YAML/JSON frontmatter.

---

## Table of contents

- Purpose
- Quick start (developer commands)
- Project structure and stack
- Coding conventions & formatting
- Auth, wallets, sensitive data — safeguards
- Database and RLS policies (examples)
- Realtime SOS and admin monitoring notes
- Gemini (LLM) integration guidance
- Seeds, migrations, and supabase folder
- Testing, linting, and CI
- Deployment & secrets handling
- Troubleshooting and agent safety checks

---

Purpose

This file instructs AI assistants how to safely and productively work on CortexDrive:
- Prefer small focused edits and tests.
- Never add secrets or service-role keys to the repo.
- Use Supabase Auth as the source of truth for user identity; perform DB actions as the signed-in user where possible.


Quick start (developer commands)

Use these commands locally in development. Use npm/yarn/pnpm consistently with the repo lockfile.

```bash
# install deps
npm install

# dev server (Next.js app at repo root)
npm run dev

# lint & format
npm run lint
npm run typecheck

# run tests (light smoke tests)
npm run test

# build for production (only outside interactive agent sessions)
npm run build
```

Project structure and stack

- Language: TypeScript (strict mode) — prefer .ts/.tsx for all new code.
- Framework: Next.js (App Router) at repository root.
- DB: Supabase (Postgres); use @supabase/supabase-js ~2.109.0 in browser and server code.
- UI: Tailwind CSS; theme tokens use CSS variables for dark-slate / electric-cyan / emerald.
- Component library: shadcn/ui as base; co-locate component styles in the component folder.
- State: Server state via Supabase client (React Query); minimal client state with Zustand only where required.
- LLM: Gemini via @google/generative-ai SDK calls isolated in /lib/gemini; system prompts versioned files in /lib/gemini/prompts.

Recommended top-level layout (canonical):

```
/ (repo root)
├─ app/                 # Next.js app router
├─ pages/               # optional compatibility pages
├─ supabase/            # migrations, functions, seed data
│  ├─ migrations/
│  ├─ functions/
│  └─ seed/
├─ lib/                 # shared helpers (supabase client, gemini wrapper)
├─ components/          # React components (co-located styles)
├─ styles/              # tailwind, global styles
├─ locales/             # next-intl translations: en, ur, roman_ur
├─ tests/               # e2e smoke tests
├─ README.md
└─ AGENTS.md
```

Coding conventions & formatting

- Prefer functional React components and hooks.
- Keep files small (<~200 lines) and export a single main thing.
- TypeScript strict: type all public function inputs/outputs; prefer narrow types and discriminated unions for domain models.
- Co-locate CSS modules or component styles in the same folder as the component.
- Use next-intl for all UI strings — do not hardcode visible strings in JSX.
- Use conventional commits for commit messages: feat/, fix/, docs/, chore/, refactor/, perf/.

Example git workflow (agents should follow):

```bash
# create a feature branch
git checkout -b feat/describe-feature
# make small commits using conventional prefixes
git commit -m "feat(user): add phone-based 2FA toggle"
# push branch
git push --set-upstream origin feat/describe-feature
```

Auth, wallets, sensitive data — safeguards

As an assistant you must enforce safeguards when touching auth, wallet, documents, or SOS features.

- Never log or commit secrets (API keys, service role keys). The SUPABASE_SERVICE_ROLE_KEY is never stored in the repo.
- All per-user data should use Supabase Auth's auth.uid() and RLS. Don't perform privileged DB actions using a service key in code that could be dropped into the browser.
- When writing server code that must run with elevated privileges (Edge Functions, server-only scripts), read SUPABASE_SERVICE_ROLE_KEY from process.env and do not print it. Note: the preview environment does not expose the service role key.
- Wallet transactions and ledger updates must require explicit review: add idempotency tokens, audit columns (created_by, created_at), and tests that simulate concurrent operations.
- Mark sensitive documents (e.g. ID scans) with explicit access policies and audit logs. Never return full document contents to unprivileged users.

Database and RLS policies (examples)

Always call database_schema before creating migrations. Apply changes through supabase migrations with apply_migration.

Example RLS snippets you may include in migrations. These are examples — adapt column names to actual schema.

```sql
-- Make per-user table
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users default auth.uid(),
  balance numeric not null default 0,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table wallets enable row level security;

-- allow users to select and insert their own wallet
create policy "wallets_select_by_owner" on wallets
  for select using (user_id = auth.uid());

create policy "wallets_insert_by_owner" on wallets
  for insert with check (user_id = auth.uid());

-- admins (identified by a role column in users or a custom claim)
create policy "wallets_admin_full" on wallets
  for all using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin'));
```

Recommended RLS patterns

- For per-user resources (wallets, documents, bookings): add `user_id uuid references auth.users default auth.uid()` and RLS policies using auth.uid() = user_id.
- For cross-user resources (bookings): allow SELECT for related parties (booking.user_id = auth.uid() OR booking.vendor_id = auth.uid()).
- For admin dashboards: restrict access to users with a role='admin' claim stored in auth.user_metadata, and check in both DB policies and server routes.

Realtime SOS and admin monitoring notes

- v1.0: SOS alerts are a realtime feed to admin dashboards only. Do not implement push notifications yet.
- Store sos_events with strict RLS: only the creating user (and admins) may insert; only admins may select all events; users may select their own events.

Example sos_events RLS example:

```sql
create table if not exists sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users default auth.uid(),
  location jsonb,
  message text,
  severity text,
  created_at timestamptz default now()
);

alter table sos_events enable row level security;

create policy "sos_insert_owner" on sos_events
  for insert with check (user_id = auth.uid());

create policy "sos_select_owner" on sos_events
  for select using (user_id = auth.uid());

create policy "sos_admin_select_all" on sos_events
  for select using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin'));
```

Gemini (LLM) integration guidance

- All Gemini calls must be isolated under /lib/gemini. Implement a small adapter around @google/generative-ai that:
  - loads the API key from process.env (do not commit the key),
  - validates presence and fails gracefully with a clear message if missing,
  - reads system prompts from versioned files under /lib/gemini/prompts/v1/*.txt,
  - supports deterministic mode toggles and rate limits.
- Keep prompt engineering files small and versioned. Store model/temperature settings next to each prompt file in a small JSON manifest (not as secrets).

Seeds, migrations, and supabase folder

- All DB schema changes must be applied via supabase/migrations SQL files and use apply_migration in this workspace when editing the schema.
- Include an initial migration with core tables and RLS policies (supabase/migrations/0001_init.sql). The migration must be idempotent (create table if not exists, create policy if not exists where supported).
- Provide seed/demo data in supabase/seed/ that creates one learner, one instructor, one vendor, one admin, sample bookings, wallet transactions, and fuel logs.
- Do not commit real emails/passwords; seeds should use example addresses and clearly document how to replace them with real accounts in .env.local or the Supabase dashboard.

Testing, linting, and CI

- Provide ESLint and TypeScript checks. Keep tests light: a few E2E smoke tests for auth, a booking flow, and a wallet transaction.
- Avoid heavyweight unit test suites in v1.0. Use Playwright or Cypress for basic E2E smoke tests if already present in the repo.

Deployment & secrets handling

- Deploy to Vercel. Environment variables for the browser client should use VITE_/NEXT_PUBLIC_ prefixes where needed. Server-only secrets (SUPABASE_SERVICE_ROLE_KEY) must be set only in the Vercel dashboard and never in the repo.
- Add a .env.example at the repo root listing the env names (empty values) and a one-line comment for each. Do not commit .env.local.

Example .env keys (show in examples only):

```text
VITE_SUPABASE_URL=   # public supabase url for client
VITE_SUPABASE_ANON_KEY=   # public anon key for client
SUPABASE_URL=   # server supabase URL
SUPABASE_ANON_KEY=   # server anon key (if used server-side)
SUPABASE_SERVICE_ROLE_KEY=   # DO NOT COMMIT: service role key for server-only scripts
GOOGLE_API_KEY=   # Gemini/Generative AI key (server-side)
```

Troubleshooting and agent safety checks

Before submitting any PR that touches auth, wallet, RLS, or SOS logic, an assistant should:

1. Run `npm run lint` and `npm run typecheck` locally.
2. Add or update a migration and run database_schema() to confirm current schema. Use apply_migration to modify the schema.
3. Ensure every change that affects per-user data is covered by an RLS policy that uses auth.uid().
4. Add an integration or E2E smoke test that runs against a seeded local Supabase (or the provided preview) demonstrating the happy path.
5. Avoid long-running production build steps inside an interactive session; use `npm run dev` instead.

Example PR checklist (for human reviewers)

- [ ] Lint and typecheck pass
- [ ] No secrets in diffs
- [ ] Migrations added via supabase/migrations and reviewed
- [ ] RLS policies present and sensible for new tables
- [ ] Seed data included for demo accounts if applicable
- [ ] E2E smoke test coverage for the primary flow

---

Appendix — Example SQL snippets for common tables

Users (note: Supabase provides auth.users; store app metadata in a separate profile table):

```sql
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role text default 'learner', -- 'learner','instructor','vendor','admin'
  phone text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_admin" on profiles
  for all using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin'));
```

Wallets (ledger design hints)

```sql
create table if not exists wallet_ledgers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users default auth.uid(),
  amount numeric not null,
  balance_after numeric not null,
  type text not null, -- credit, debit, fee, refund
  reference text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table wallet_ledgers enable row level security;

create policy "wallet_ledgers_insert_owner" on wallet_ledgers
  for insert with check (user_id = auth.uid());

create policy "wallet_ledgers_select_owner" on wallet_ledgers
  for select using (user_id = auth.uid());
```

Documents (sensitive)

```sql
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users default auth.uid(),
  type text,
  file_bucket text,
  file_path text,
  verified boolean default false,
  created_at timestamptz default now()
);

alter table documents enable row level security;

create policy "documents_insert_owner" on documents
  for insert with check (user_id = auth.uid());

create policy "documents_select_owner" on documents
  for select using (user_id = auth.uid());

create policy "documents_admin_verify" on documents
  for update using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin')) with check (true);
```

Finish notes

- Always call database_schema() before writing migrations.
- Apply migrations via apply_migration so the preview environment records changes.
- This AGENTS.md is the canonical guide for assistants — keep it updated as the project evolves.



This repository contains a Next.js application located in the root of this repository. When
working on the project interactively with an agent (e.g. the Codex CLI) please follow
the guidelines below so that the development experience â€“ in particular Hot Module
Replacement (HMR) â€“ continues to work smoothly.

## 1. Use the Development Server, **not** `npm run build`

* **Always use `npm run dev` (or `pnpm dev`, `yarn dev`, etc.)** while iterating on the
  application.  This starts Next.js in development mode with hot-reload enabled.
* **Do _not_ run `npm run build` inside the agent session.**  Running the production
  build command switches the `.next` folder to production assets which disables hot
  reload and can leave the development server in an inconsistent state.  If a
  production build is required, do it outside of the interactive agent workflow.

## 2. Keep Dependencies in Sync

If you add or update dependencies remember to:

1. Update the appropriate lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`).
2. Re-start the development server so that Next.js picks up the changes.

## 3. Coding Conventions

* Prefer TypeScript (`.tsx`/`.ts`) for new components and utilities.
* Co-locate component-specific styles in the same folder as the component when
  practical.

## 4. Useful Commands Recap

| Command            | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Start the Next.js dev server with HMR.             |
| `npm run lint`     | Run ESLint checks.                                 |
| `npm run test`     | Execute the test suite (if present).               |
| `npm run build`    | **Production build â€“ _do not run during agent sessions_** |

---

Following these practices ensures that the agent-assisted development workflow stays
fast and dependable.  When in doubt, restart the dev server rather than running the
production build.