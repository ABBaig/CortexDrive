Phase 2 build notes — Implement Unfinished Features with Icon Design

What I changed in this phase:

- Identified vehicle_logs schema mismatch: code expected `type` and `meta`, while DB had `event_type` and `note`. Wrote a migration (held for approval) to add `type` and `meta` columns and RLS policies. The migration is held and has NOT run; see Database panel to apply.
- Normalized Vehicle page client-side to accept `event_type` or `type` and `note` fallback. This keeps runtime compatible without applying the migration yet.
- Added small, consistent SVG icon components (WalletIcon, FuelIcon, VerificationIcon, SOSIcon) under src/components/icons and wired them into Learner and Instructor dashboards with subtle color accents.
- Added DashboardIcons aggregator for easy imports.
- Small UI improvements to verification card: added inline verification icon to Learner and Instructor dashboards.

How to run

1. npm install
2. npm run dev

Database migration note

A migration to alter vehicle_logs with new columns and policies was prepared and is waiting for approval in the Database panel. The app will run without it, but applying it will provide a cleaner schema for the Vehicle feature and introduce RLS policies for vehicle_logs.

