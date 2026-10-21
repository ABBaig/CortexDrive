import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
// preserve next-intl routing
import { createServerClient } from '@supabase/ssr';

export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};

// Note: Supabase SSR cookie refresh is used in server handlers via createServerSupabaseClient in lib. 
// Middleware can be extended here to manipulate cookies if needed.
