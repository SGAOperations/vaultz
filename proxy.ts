import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ACCESS_COOKIE_NAME, verifyAccessCookieValue } from '@/lib/access-gate';

// Gates every route behind a single shared passphrase cookie. This is a
// temporary stopgap (no per-user identity or permissions) meant to keep
// casual/unauthorized visitors out until real per-user auth is built.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  const passThrough = { request: { headers: requestHeaders } };

  if (pathname === '/access') return NextResponse.next(passThrough);

  if (verifyAccessCookieValue(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) {
    return NextResponse.next(passThrough);
  }

  const accessUrl = new URL('/access', request.url);
  accessUrl.searchParams.set('from', pathname + search);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: [
    '/((?!api/uploadthing|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
