# SKILLS.md — CortexDrive

> **Project:** CortexDrive — AI-verified driving school + vehicle companion platform (Pakistan)
> **Type:** Mobile-first responsive PWA (web app)
> **Purpose:** A unified platform where learners verify identity via AI (CNIC/license OCR + face-match), book driving instructors, complete a guided license-progress journey, access a tutor chatbot, track driving behavior (harsh braking/acceleration, SOS alerts), manage an escrow wallet, and maintain a vehicle cost-companion logbook.

---

## 1. Project Overview

CortexDrive combines four domains into one product:

1. **AI identity verification** — document (CNIC/driving license) OCR and selfie face-match, scored server-side and persisted with audit status (`verified` / `needs_review`).
2. **Driving school marketplace** — discover instructors by city/language/price, book lessons, chat in realtime, and pay through an escrow wallet (`topup → escrow_hold → payout/refund` with a platform fee).
3. **Telematics & safety** — GPS-based trip sampling, harsh braking/acceleration event detection, SOS alert dispatch, and live location tracking.
4. **Vehicle companion** — fuel, spare-part, and service expense logging with analytics dashboards.

The platform enforces **4-tier role-based access control** (learner, instructor, vendor, admin) at the database layer, is **trilingual** (English, Urdu, Roman Urdu), and uses a **Dark Slate / Electric Cyan / Emerald** themed, mobile-first UI.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling / UI | Tailwind CSS, shadcn/ui |
| Auth | Supabase Auth (email/password, sessions, TOTP-based MFA/2FA) |
| Database | Supabase PostgreSQL with Row-Level Security (RLS) |
| Server compute | Supabase Edge Functions (Deno runtime) |
| Realtime & Storage | Supabase Realtime, Supabase Storage |
| AI / ML | Google Gemini API (`gemini-1.5-flash`, vision/multimodal) |
| Charts | Recharts |
| Internationalization | i18n keys (en / ur / roman_ur) |

---

## 3. Required Skills

### 3.1 Frontend Engineering
- **Next.js App Router** — route groups, layouts, protected-route guards, server vs. client components
- **Tailwind CSS + shadcn/ui** — responsive mobile-first design, dark theme system, reusable component composition
- **Progressive Web App (PWA)** basics — installable, mobile-first behavior
- **Internationalization (i18n)** — key-based translations across three languages; no hardcoded user-facing strings

### 3.2 Backend & Database Engineering
- **PostgreSQL data modeling** — users, verifications, license_progress, bookings, wallets, transactions, sos_alerts, vehicle_logs
- **Row-Level Security (RLS)** — 4-tier role policies so every row is isolated by role and owner; RLS is the *enforcement* layer, UI only hides
- **Supabase Auth** — signup, session management, TOTP MFA/2FA enrollment and challenge flows
- **Database triggers** — server-side profile creation on user signup (atomic, race-free)
- **Transaction-ledger integrity** — escrow wallet state machine (`topup → escrow_hold → payout/refund`), platform-fee splitting, consistent balance chains

### 3.3 AI / Multimodal Engineering
- **Gemini 1.5 Flash vision API** — image input (CNIC/license photos, selfies), structured JSON output for OCR extraction
- **Face-match scoring** — comparing selfie vs. document photo with a decision threshold (`verified` / `needs_review`)
- **Prompt engineering** — deterministic, structured extraction prompts for identity documents
- **Edge Function (Deno) integration** — calling Gemini securely server-side, API key management via function secrets, CORS and error handling

### 3.4 Realtime & Geolocation
- **Supabase Realtime** — live chat on bookings, live location broadcasting
- **Browser Geolocation API** — periodic position sampling (3s interval), speed-delta computation
- **Telematics event logic** — harsh braking/acceleration flagged at ≥10 km/h change between samples; storing derived events, not raw GPS trails

### 3.5 Data Visualization
- **Recharts** — vehicle expense dashboards, spend breakdowns, license-progress completion visuals

### 3.6 Product & Domain Skills
- **Driving-school domain understanding** — license-progress stage mapping, instructor availability/slot booking, lesson lifecycle (`booked → completed → refunded`)
- **Payments/escrow concepts** — hold, release, refund, fee-split flows
- **Pakistan-market localization** — CNIC document format awareness, city/language data, trilingual UX

### 3.7 Security & DevOps
- **Secrets hygiene** — API keys only in Edge Function secrets / `.env` (never in repo); `.env.example` pattern
- **Auth-first UX** — route guards + role-based UI hiding layered *on top of* RLS
- **Demo/seeding discipline** — deterministic seed data for reproducible demos
- **Git workflow** — scoped commits, avoiding cross-folder conflicts in a shared repository

---

## 4. Skill Categories Summary

| Category | Key Skills |
|---|---|
| Frontend | Next.js App Router, Tailwind, shadcn/ui, PWA, i18n |
| Backend | PostgreSQL, RLS policies, triggers, Supabase Auth + MFA |
| AI/ML | Gemini 1.5 Flash vision, OCR extraction, face-match scoring |
| Realtime/Geo | Supabase Realtime, Geolocation API, telematics thresholds |
| Payments | Escrow state machine, ledger integrity, fee splitting |
| Data Viz | Recharts dashboards |
| Security | Secrets management, RLS-enforced RBAC, route guarding |
| Domain | Driving school operations, CNIC verification, Pakistani localization |

---

## 5. Definition of "Done" for Any Feature

- Works end-to-end for the demo path: signup → 2FA → CNIC upload

```
