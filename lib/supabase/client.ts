import { createBrowserClient as createBrowserSupabaseClient } from '@supabase/ssr';
import { Database } from '../../types/database';

export { createBrowserSupabaseClient };

// Legacy default export name for other code
export default createBrowserSupabaseClient as unknown as typeof createBrowserSupabaseClient;
