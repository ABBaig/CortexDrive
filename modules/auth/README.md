Modules: Auth — CortexDrive

This module implements signup, signin, onboarding (role wizard), TOTP 2FA settings, and a minimal app shell for CortexDrive.

Notes
- Uses Supabase JS client (public) for client-side auth flows.
- On signup the client creates a users row via a server edge function (not implemented here); as a fallback this module creates the users row via client if no edge function is present.
- All UI strings use next-intl keys; placeholder locales must exist in /locales.
- Theme tokens are read from CSS variables (see AGENTS.md).

To run the app you still need the main Next.js app and lib infra; this module provides focused pages and components to be integrated into the app.
