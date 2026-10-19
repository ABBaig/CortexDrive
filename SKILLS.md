# SKILLS.md — CortexDrive Team Skill Matrix

> CortexDrive — AI-verified driving school + vehicle companion platform (Pakistan)
> Stack: Next.js (App Router) · Tailwind CSS · Supabase (Auth, Postgres + RLS, Realtime, Storage, Edge Functions) · Google Gemini (gemini-1.5-flash) · Recharts · shadcn/ui
> Status: 3-member team building via Devmarketplace AI builder (token-efficient mega-prompts)

---

## 1. Required Project Skills (All Members)

| Skill | Level Needed | Where It's Used |
|---|---|---|
| Next.js App Router (pages, layouts, route groups) | Working | Every module |
| Tailwind CSS + shadcn/ui | Working | All UI, Dark Slate theme (#0f172a / #22d3ee / #10b981) |
| Supabase JS SDK (client + server) | Working | Auth, DB, Storage, Realtime everywhere |
| PostgreSQL + Row-Level Security (RLS) | Strong | 4-tier RBAC (learner/instructor/vendor/admin) — critical |
| Git hygiene (own folders only, no cross-file conflicts) | Working | 3 accounts → 1 repo |
| Mega-prompt writing (one command = one full module) | Working | Token economy on the AI builder |
| i18n discipline (en / ur / roman_ur keys, no hardcoded strings) | Working | All user-facing UI |

---

## 2. Member Skill Profiles & Module Ownership

### Member 1 — Auth, Onboarding & Admin (Module A)
**Owns:** `/modules/auth`, `/modules/admin`, repo docs, AGENTS.md/SPEC.md upkeep, Gig 1 publishing

- Supabase Auth: email/password signup, session refresh, **MFA/2FA (TOTP)** — the rubric's non-negotiable path starts here
- Postgres **event trigger on `auth.users`** for atomic profile creation (server-side, chosen approach)
- Route guarding (`RouteGuard`) + `guard_plus_hide` pattern for admin UI (RLS still enforces)
- Admin dashboard shell: verification queue, SOS feed, bookings overview
- Docs/writing: README, .env.example, gig packaging

### Member 2 — AI Verification, Tutor & Telematics (Module B)
**Owns:** `/modules/verification`, `supabase/functions/ai-verify`, tutor chatbot, trip telematics, Gig 2 publishing

- **Gemini 1.5 Flash** multimodal calls (vision): CNIC / driving-license OCR → structured JSON extraction
- Face-match scoring (selfie vs document photo) → threshold decisions (verified / needs_review)
- Supabase **Edge Functions** (Deno): secure server-side GEMINI_API_KEY, CORS, error handling
- Supabase Storage: document upload paths, signed URLs
- Geolocation: **3s sampling**, harsh-event detection at **≥10 km/h delta** (store derived events only, latest pin for live tracking)
- RLS policies on `verifications`, `license_progress`, `sos_alerts`

### Member 3 — Marketplace, Wallet & Vehicle (Module C)
**Owns:** `/modules/marketplace`, `/modules/wallet`, `/modules/vehicle`, seed data, theme polish

- Marketplace UI: instructor/vendor cards, availability slots, booking flow (booked → completed → refunded)
- **Escrow wallet logic**: topup → escrow_hold → payout/refund with 10% platform fee split — transaction ledger integrity (balance_after chain)
- Realtime chat (Supabase Realtime) on bookings, GPS live-tracking map
- `vehicle_logs` (fuel/spare_part/service) + **Recharts** spend analytics
- `demo-data.sql` seeding with deterministic UUIDs (7 accounts, password `CortexDemo123`)

---

## 3. Skill-to-Rubric Mapping (M1–M6)

| Rubric | Skills Required | Owner(s) |
|---|---|---|
| M1 — Core judge path (signup → 2FA → CNIC → Gemini OCR → persistence after re-login) | Supabase Auth + MFA, Edge Functions, Gemini vision, RLS | Member 1 + Member 2 (joint, build first) |
| M2 — RBAC & data isolation | RLS policies, role claims, route guard + hide | Member 1 |
| M3 — Marketplace & payments | Escrow transactions, booking state machine, Realtime | Member 3 |
| M4 — Telematics & safety | Geolocation sampling, harsh-event detection, SOS alerts | Member 2 |
| M5 — Vehicle companion & analytics | vehicle_logs CRUD, Recharts dashboards | Member 3 |
| M6 — Gig publishing DURING build (≥2) | Gig packaging: title, description, stranger-friendly setup, 3 contributors credited | Member 1 (Gig 1, Day 1–2), Member 2 (Gig 2, Day 2–3) |

---

## 4. Cross-Team Working Agreements (Skills Applied)

1. **Build order:** Member 1 foundation (schema + auth trigger) → Members 2 & 3 in parallel.
2. **Folder exclusivity:** each member touches only their owned folders; shared files changed only by Member 1.
3. **Token economy:** one mega-prompt per module; fixes go back into the same builder thread.
4. **Security baseline:** no secrets in repo — `.env.example` only; Gemini key lives only in Edge Function secrets.
5. **RLS is the enforcement layer**; the UI only hides/redirects. Never trust client-side role checks for security.
6. **Demo readiness:** all demo flows must work with the seeded accounts at any time (deterministic UUIDs, `CortexDemo123`).
---

no
---
yes
