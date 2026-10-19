import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_LOCALE = 'en';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // If the pathname already contains a locale (first segment), continue
  const segments = pathname.split('/');
  if (segments[1] && ['en', 'ur', 'roman_ur'].includes(segments[1])) {
    return NextResponse.next();
  }

  // Redirect root or paths without locale to default locale preserving path and search
  const url = req.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  url.search = search;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/:path*',
};
