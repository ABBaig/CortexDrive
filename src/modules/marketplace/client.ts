import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Marketplace module Supabase accessor.
 * Single source of truth: always delegate to the shared browser client at
 * src/lib/supabase/client.ts. Never create a client copy or import
 * createBrowserClient directly here.
 */
export function getSupabase() {
  return getSupabaseBrowserClient();
}
