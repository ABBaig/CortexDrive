import { createServerClient as createServerSupabaseClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { Database } from '../../types/database';

export function createServerSupabaseClientWithCookies() {
  const cookieStore = cookies();
  const headerStore = headers();
  return createServerSupabaseClient<Database>({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    cookieOptions: { name: 'sb:session' },
    getCookie: (name: string) => cookieStore.get(name)?.value,
    setCookie: (name: string, value: string, opts?: any) => {
      // next/headers doesn't allow setting cookies from server components; this
      // function is provided to match the createServerClient signature. In App Router
      // route handlers, use the helpers getAll/setAll from @supabase/ssr directly.
      return undefined as any;
    },
    getAll: () => {
      // expose getters used by @supabase/ssr
      return Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value]));
    },
    setAll: (cookiesObj: Record<string,string>) => {
      // noop in this minimal setup
      return;
    }
  });
}

export { createServerSupabaseClientWithCookies as createServerSupabaseClient };
