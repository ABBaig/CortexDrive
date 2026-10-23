import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../../../types/database';

export async function getSupabaseServerClient() {
  const cookieStore = cookies();
  // createServerClient signature in @supabase/ssr accepts one options object in v0.5.x
  return createServerClient<Database>({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', // service key may be absent in preview; functions using this should handle it
    cookieOptions: { name: 'sb:session' },
    getCookie: (name: string) => cookieStore.get(name)?.value,
    setCookie: (_name: string, _value: string, _opts?: any) => undefined,
    getAll: () => Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])),
    setAll: (_cookiesObj: Record<string,string>) => undefined,
  });
}
