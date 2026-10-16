# SPEC.md — CortexDrive
## Your Complete Driving Companion: From AI-Verified Learning to Lifetime Vehicle Mastery

> **One-line pitch:** CortexDrive is an AI-verified, marketplace-driven driving school platform that turns the opaque, offline driver-licensing journey into a transparent, tracked, and lifelong vehicle ownership experience — built for Pakistan's learners, freelance instructors, and service partners.

**Status:** Active Development · **Repository root document** · **Target release:** MVP v1.0

---

## 0. Document Map

| Section | Contents |
|---------|----------|
| 1–2 | Problem, impact, users, and solution overview |
| 3 | Scope & release strategy (MVP cut and roadmap) |
| 4–7 | User journey, feature list, data model, technical approach |
| 8 | Team, engineering methodology, risks, and success criteria |

---

## 1. Problem & Impact

### 1.1 The Problems

Pakistan's driving-education ecosystem is fragmented, offline, and trust-poor:

1. **No live GPS tracking** — local driving apps give students no visibility into instructor arrival; lessons start late and cancellations go undetected.
2. **No open instructor marketplace** — centralized fleet models are opaque; verified freelance instructors have no transparent channel to find students.
3. **No government portal sync** — learner permits, test dates, and license status (DLIMS/DLS) live in disconnected silos; users re-verify manually.
4. **Rigid scheduling & financial unfairness** — harsh late-cancel penalties, no automated refund or dispute resolution, cash-first culture with zero audit trail.
5. **Subjective grading** — no telematics; instructors grade by feel instead of measurable hard-braking, speeding, and cornering data.
6. **Language barriers** — English-only apps exclude the Urdu and Roman Urdu majority.
7. **Safety gaps** — no dashcam integration, no SOS panic button for learners (disproportionately affecting female students).
8. **Zero post-license utility** — every existing app abandons the user the day they pass their test, ignoring a lifetime of vehicle ownership costs.

### 1.2 The User

**Primary persona — Amna, 21, Lahore:** a first-time learner who must find a trustworthy instructor, verify her permit progress against DLIMS, pay safely without carrying cash, feel safe during lessons, and — after passing — needs help tracking fuel costs and repair spending on her first used car.

**Secondary personas:** Rizwan, a freelance instructor fighting opaque platform commissions; Bilal, a garage owner with idle service capacity; Faisal, a platform operations admin who must arbitrate disputes.

### 1.3 Why It Matters (Impact)

- **Trust:** AI-verified CNIC/license OCR + face-match removes the #1 barrier for female learners — safety and instructor legitimacy.
- **Financial inclusion:** a wallet with automated fee-splitting and refunds replaces cash, protects both sides, and creates a transparent commission model for freelancers.
- **Accessibility:** Urdu / Roman Urdu multi-language support opens driving education to tens of millions currently underserved.
- **Longevity:** the post-license vehicle-companion module converts a one-time lesson purchase into a lifetime retention loop (fuel, parts, vendor services) — the platform's durable business case.

---

## 2. Solution Overview

CortexDrive is a single web platform (responsive PWA) with a **4-tier RBAC system**:

| Role | Core capabilities |
|------|-------------------|
| **Learner** | Book lessons, AI quizzes, live GPS tracking of instructor, wallet payments, license progress tracking, post-license vehicle companion |
| **Instructor** | Freelancer profile & bidding, booking acceptance, earnings dashboard, AI verification (CNIC/license OCR + face match) |
| **Service Partner / Vendor** | Offer car repair, towing, car-wash services; receive bookings |
| **Super Admin** | Verify accounts, manage disputes, monitor SOS alerts, oversee commissions |

---

## 3. Scope & Release Strategy

The full vision (Phases 1–6) is a product roadmap. The **MVP is a deliberate horizontal slice**: every tier of the RBAC and the highest-impact trust, marketplace, and safety features, with AI doing the heavy lifting that would otherwise require manual backend logic.

### 3.1 MVP Scope (v1.0)

| Phase | MVP cut | Deferred (v1.1+) |
|-------|---------|------------------|
| **P1: Auth** | Supabase email/phone auth, 2FA toggle, 4-tier onboarding wizard | Social login, biometric unlock |
| **P2: Trust & AI Verification** | Gemini OCR on CNIC/license upload, face-match score, verification status badge, digital document vault (Supabase Storage) | Live DLIMS/DLS API sync (structured manual entry + document OCR serve as the bridge until a public API is available) |
| **P3: Marketplace** | Instructor listings, city filter, slot booking, in-app chat (Supabase Realtime) | In-app audio/video calls (WhatsApp deep link in v1.0), bidding engine |
| **P4: Financials** | Digital wallet ledger, booking escrow → auto fee-split on completion, refund on instructor no-show (rule-based) | Live payment-gateway integration (sandbox at launch), full dispute workflow |
| **P5: Vehicle Management** | Fuel-log entry + efficiency chart, spare-parts cost breakdown, vendor listing & booking | VIN decoding, predictive maintenance |
| **P6: Safety & AI Tutors** | SOS button → alert to admin dashboard, Gemini chatbot tutor (Urdu/Roman Urdu/English), quiz generation, **telematics via browser Geolocation API** (speed + harsh acceleration heuristics during a lesson) | Real OBD-II/dashcam hardware integration, native mobile app |

### 3.2 Engineering Rationale

The MVP ships fast and stays maintainable because:

1. **~70% of the backend is delegated to Supabase** — Postgres, Row-Level Security for the 4-tier RBAC, Auth (incl. 2FA), Realtime chat, and Storage for the document vault. No custom auth, no custom sockets, no file server.
2. **The "hard" features are AI-API calls, not custom ML** — verification is one Gemini OCR + face-match prompt pipeline; the tutor chatbot and quiz generator are single-endpoint Gemini calls with role-scoped system prompts.
3. **Telematics v1.0 uses the browser Geolocation API** — a credible, live measurement of speed/hard-braking detection without hardware.
4. **AI-assisted code generation handles all CRUD scaffolding** — the engineering team writes prompts and reviews, not boilerplate.
5. **RLS policies replace bespoke authorization code** — the 4-tier RBAC ships as declarative SQL policies.

### 3.3 Delivery Milestones

| Milestone | Deliverables |
|-----------|--------------|
| **M1 — Foundation** | Supabase schema + migrations, RLS policies for 4 roles, auth + 2FA, onboarding wizards for all 4 tiers, deployed Next.js shell with Tailwind theme (Dark Slate / Electric Cyan / Emerald) |
| **M2 — Trust & Marketplace** | Gemini OCR verification pipeline + document vault; instructor marketplace: listings, city filters, slot booking, real-time chat |
| **M3 — Financials & Vehicle** | Wallet ledger, escrow fee-splitting, rule-based refunds; fuel tracker + charts, parts cost breakdown, vendor booking flow |
| **M4 — Safety, AI Tutor & Launch** | SOS hub + admin alert feed, Gemini tutor chatbot (tri-lingual), quiz engine, GPS live-tracking view + telematics, i18n strings, E2E smoke tests, demo seed data |

**Release discipline:** every milestone ends with a working, deployable build. Stretch items are cut, not deferred mid-stream.

---

## 4. User Journey (Concrete — Amna, the Learner)

1. **Sign-up & onboarding:** Amna registers, selects role *Learner*, toggles 2FA, and picks **Urdu** as her interface language.
2. **AI verification:** she uploads her CNIC and learner permit photos → Gemini OCR extracts name/number → face-match confirms liveness → status badge: **AI-Verified**. Documents are stored in her private document vault.
3. **License tracking:** she enters her DLIMS permit number; the platform tracks her permit → test → license stages with a visual progress tracker.
4. **Find an instructor:** she filters by city (Lahore), rating, and verified status; books a 6:00 PM slot via the marketplace calendar.
5. **Pay safely:** her wallet escrows the lesson fee (sandbox gateway at launch); the instructor sees *funds secured*, not cash-on-arrival.
6. **Live tracking:** at 5:45 PM she watches the instructor's car approach on a live map (Google Maps API). If the instructor doesn't arrive within the grace window, **the refund rule auto-fires**.
7. **AI-graded lesson:** during the drive, the browser telematics module logs speed events and flags two harsh-braking instances — her score is objective, not vibes.
8. **SOS:** at any point, one tap on the SOS button alerts the Super Admin dashboard (and, in v1.1, emergency contacts).
9. **Learn:** at home, the Gemini tutor quizzes her on road signs in Roman Urdu and explains her mistakes.
10. **Post-license (retention loop):** after passing, Amna logs fuel purchases (app computes PKR/km efficiency), gets a spare-parts cost breakdown, and books a discounted car wash from a verified vendor — all in the same app.

**Instructor journey (Rizwan):** sign-up → AI CNIC/license verification → set city + availability slots → receive booking (escrow-secured) → navigate to student → lesson recorded with telematics score → automatic fee-split lands in his earnings dashboard minus transparent commission.

---

## 5. Feature List (v1.0-flagged)

**P1 — Auth (v1.0)**
- Email/phone login, 2FA, 4-tier role onboarding wizard, RLS-enforced RBAC.

**P2 — Trust & AI Verification (v1.0)**
- AI NADRA/CNIC agent: OCR extraction, face-match score, car registration check (instructor tier).
- Provisional/Permanent license progress tracker.
- Digital document vault (per-user, storage-isolated).

**P3 — Marketplace (v1.0: listings, slots, chat, city filters; v1.1: bidding, in-app A/V calls)**
- Instructor profiles with ratings, flexible slot booking, real-time chat, nationwide city filters.

**P4 — Financials (v1.0: wallet ledger, escrow fee-split, rule-based refund; v1.1: gateway go-live, full dispute workflow)**
- Digital wallet, automated platform/instructor fee split, transparent refund protocol on no-shows.

**P5 — Vehicle Management (v1.0)**
- Fuel efficiency tracker with charts, spare-parts cost breakdown, vendor service booking (repair / towing / wash).

**P6 — Safety & AI Tutors (v1.0)**
- SOS Emergency hub → Super Admin alert feed.
- AI Driving Instructor chatbot: verification quizzes, learning-outcome quizzes, tri-lingual (English / Urdu / Roman Urdu).
- Telematics tracker (browser Geolocation in v1.0; OBD-II hardware integration in v1.1+).
- Live GPS lesson tracking (Google Maps).

**Cross-cutting:** Dark Slate + Electric Cyan + Emerald theme; mobile-first responsive; i18n layer.

---

## 6. Data Model (Core Tables)

PostgreSQL via Supabase. All tables use `uuid` PKs (`gen_random_uuid()`), `created_at timestamptz default now()`, and RLS keyed on `auth.users.id`.

```sql
-- users: extends Supabase auth with app-level profile + RBAC
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('learner','instructor','vendor','admin')),
  phone text,
  city text,
  language text not null default 'en' check (language in ('en','ur','roman_ur')),
  two_factor_enabled boolean default false,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','ai_verified','rejected')),
  wallet_id uuid,                      -- fk set after wallet creation
  created_at timestamptz default now()
);

-- verifications: AI OCR + face-match audit trail
create table verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  doc_type text not null check (doc_type in ('cnic','driving_license','car_registration')),
  doc_url text not null,               -- Supabase Storage path (private bucket)
  ocr_payload jsonb,                   -- raw Gemini OCR extraction
  face_match_score numeric,            -- 0.0–1.0
  ai_decision text check (ai_decision in ('verified','needs_review','rejected')),
  reviewed_by uuid references users(id),
  created_at timestamptz default now()
);

-- license_progress: DLIMS/DLS tracking (structured manual entry + OCR, v1.0)
create table license_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  permit_number text not null,
  stage text not null default 'learner_permit'
    check (stage in ('learner_permit','test_scheduled','test_passed','provisional','permanent')),
  test_date date,
  updated_at timestamptz default now()
);

-- bookings: marketplace core (learner ↔ instructor | vendor)
create table bookings (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references users(id),
  provider_id uuid not null references users(id),   -- instructor or vendor
  service_type text not null check (service_type in ('driving_lesson','repair','towing','car_wash')),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status text not null default 'booked'
    check (status in ('booked','in_progress','completed','cancelled','refunded')),
  price_pkr numeric not null check (price_pkr >= 0),
  gps_track_url text,                 -- live-tracking session ref
  telematics jsonb,                   -- [{event:'harsh_brake',ts,speed_kmh}, ...]
  created_at timestamptz default now()
);

-- wallets & transactions: escrow, fee-split, refunds
create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  balance_pkr numeric not null default 0 check (balance_pkr >= 0),
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id),
  booking_id uuid references bookings(id),
  kind text not null check (kind in ('topup','escrow_hold','fee_split','payout','refund')),
  amount_pkr numeric not null,
  platform_fee_pkr numeric default 0,
  balance_after numeric not null,
  created_at timestamptz default now()
);

-- sos_alerts: safety hub
create table sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  booking_id uuid references bookings(id),
  lat numeric, lng numeric,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  resolved_by uuid references users(id),
  created_at timestamptz default now()
);

-- vehicle_logs: post-license companion
create table vehicle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  log_type text not null check (log_type in ('fuel','spare_part','service')),
  odometer_km numeric,
  amount_pkr numeric not null,
  liters numeric,                     -- fuel only
  note text,
  created_at timestamptz default now()
);
```

**Key relationships:** `users 1—1 wallets` · `users 1—N verifications/bookings/vehicle_logs` · `bookings 1—N transactions` (escrow → split → payout chain) · `bookings 1—N sos_alerts`.

**RLS examples:** learners read only their own rows; instructors read bookings where `provider_id = auth.uid()`; vendors read bookings for their own services; admins bypass via a `role = 'admin'` policy — enforced declaratively, no app-layer auth code.

---

## 7. Technical Approach

```
┌────────────────────────────  Client  ────────────────────────────┐
│  Next.js (React) + Tailwind CSS · Dark Slate/Electric Cyan/     │
│  Emerald theme · mobile-first PWA · i18n (en/ur/roman_ur)        │
│  Charts: Recharts · Live map: Google Maps JS SDK                │
└───────────────┬─────────────────────────────────────────────────┘
                │ Supabase JS SDK (auth, PostgREST, Realtime)
┌───────────────▼─────────────────────────────────────────────────┐
│  Supabase                                                       │
│  ├── Auth (email/phone + 2FA)                                  │
│  ├── PostgreSQL + RLS (4-tier RBAC)                             │
│  ├── Realtime (chat, live booking status, SOS feed)             │
│  ├── Storage (private document vault buckets)                   │
│  └── Edge Functions (fee-split, refund rules, AI orchestration) │
└───────────────┬─────────────────────────────────────────────────┘
                │ REST
┌───────────────▼─────────────────────────────────────────────────┐
│  Google Gemini API                                              │
│  ├── Vision/OCR: CNIC, license, car registration extraction     │
│  ├── Face-match scoring on selfie vs. CNIC photo                │
│  └── Chat: Driving Instructor tutor (quiz gen, tri-lingual)    │
│  Google Maps API: instructor live tracking + city geofilters    │
└─────────────────────────────────────────────────────────────────┘
```

**Design decisions:**
- **Supabase over custom backend:** auth, RBAC (RLS), chat (Realtime), and file vault (Storage) are 4 of the 6 hardest subsystems — eliminated as build work.
- **AI as the verification engine:** one OCR+face-match pipeline replaces a human verification queue; decisions are logged with scores for admin audit.
- **Telematics v1.0 on Geolocation API:** speed deltas + acceleration heuristics produce an objective lesson score in-browser, no hardware; OBD-II is the planned hardware path.
- **Escrow as ledger events:** fee-splitting and refunds are Edge Functions writing `transactions` rows — auditable by design.

---

## 8. Team & Engineering Plan

### 8.1 Roles & Skills

| Member | Role | Key skills |
|--------|------|------------|
| Member 1 | **Full-stack lead** | Next.js/React, Supabase, TypeScript |
| Member 2 | **AI engineer** | Gemini API (OCR/vision/chat), prompt design, Edge Functions |
| Member 3 | **Product/UX + frontend** | Tailwind, i18n, component libraries, demo seeding |
| Member 4 | **QA/DevOps** | CI deploys, Playwright smoke tests, RLS policy verification |

### 8.2 Open-Source Reuse (no NIH — "not invented here")

- **Supabase** (open-source BaaS): auth, DB, realtime, storage.
- **shadcn/ui + Tailwind** + open dashboard templates: full component library in hours, not days.
- **Recharts** for fuel/earnings/telematics charts.
- **Supabase community starter kits** for RLS patterns and Edge Function templates.
- **Battle-tested open-source components** for booking calendars, chat widgets, and wallet UIs, adapted to the CortexDrive design system.

### 8.3 AI-Assisted Development Methodology

1. **Prompt library:** a curated set of generation prompts is maintained for repeatable scaffolding — onboarding wizard, booking CRUD, wallet ledger UI, admin dashboard shell.
2. **AI code-generation tools scaffold the Next.js + Supabase skeleton and CRUD pages**; the team reviews diffs rather than writing boilerplate.
3. **Themed UI screens** (marketplace, fuel tracker, SOS hub) are generated against the Dark Slate/Electric Cyan/Emerald design system and refined to match.
4. **Human-owned code (never AI-generated unreviewed):** RLS policies, fee-split/refund logic, SOS alert routing, and the Gemini prompt pipelines — the trust-critical paths are always hand-reviewed.
5. **Discipline rule:** every AI-generated module gets a human review before merge; security-sensitive code gets a second reviewer.

### 8.4 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| DLIMS/DLS has no public API | v1.0 uses OCR + structured manual tracking with the tracker UI fully built; real sync is a documented future integration |
| Payment gateway approval timeline | Sandbox/stub gateway at launch; ledger logic is production-real from day one |
| Telematics credibility without hardware | Browser Geolocation measurement is live and honest; hardware path documented |
| Gemini OCR accuracy on CNIC | Log scores + "needs_review" state; admin dashboard handles the fallback queue |

### 8.5 Launch Success Criteria

- [ ] A learner signs up, is AI-verified (CNIC OCR + face match), and books a verified instructor.
- [ ] Live map shows instructor approach; no-show refund rule fires in a staged demo.
- [ ] Wallet shows the full escrow → fee-split → payout transaction chain.
- [ ] SOS button triggers the admin alert feed.
- [ ] Gemini tutor answers a road-sign question in Roman Urdu and generates a scored quiz.
- [ ] Fuel tracker chart shows computed PKR/km from seeded data.

---

*CortexDrive — from AI-verified first lesson to lifetime vehicle mastery, in one platform.*
