import { createServerClient, createBrowserClient } from '@supabase/ssr';
import type { Database } from '../types/supabase';

export function createServerSupabaseClient(opts?: { req?: any; res?: any }) {
  // Next.js App Router route handlers pass request/response through
  const req = opts?.req;
  const res = opts?.res;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
  }
  return createServerClient<Database>({ supabaseUrl, supabaseKey, req, res });
}

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables for browser client');
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
