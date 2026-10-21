import { createBrowserClient } from '@supabase/ssr';
import type Database from '@/types/database';

export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_* env vars; Supabase client will fail in browser.');
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
