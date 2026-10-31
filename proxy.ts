import { NextRequest, NextResponse } from 'next/server';

import { createSgaProxy } from '@nusgaops/sgauth/proxy';

import { SSO_UNAVAILABLE_PATH } from '@/lib/sgauth';

// Only checks that the SGAuth cookie is present; requireSession() in the root
// layout validates it.
const sgaProxy = createSgaProxy({
  publicPaths: ['/api/uploadthing', '/health'],
});

// next dev reports every request URL as localhost, which would send SGAuth's
// return-to back to localhost instead of vaultz.sga.localhost, where the local
// session cookie is actually sent. Rebuild the URL from the Host header.
function withDevHost(request: NextRequest): NextRequest {
  const host = request.headers.get('host');
  if (process.env.NODE_ENV !== 'development' || !host) return request;

  const { protocol, pathname, search } = request.nextUrl;
  return new NextRequest(
    new URL(pathname + search, `${protocol}//${host}`),
    request,
  );
}

export function proxy(request: NextRequest) {
  // The SGAuth cookie is scoped to northeasternsga.com, so the browser never
  // sends it to *.vercel.app and sign-in would redirect forever.
  const hostname = request.headers.get('host')?.split(':')[0] ?? '';
  if (hostname.endsWith('.vercel.app')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', SSO_UNAVAILABLE_PATH);
    return NextResponse.rewrite(new URL(SSO_UNAVAILABLE_PATH, request.url), {
      request: { headers: requestHeaders },
    });
  }

  return sgaProxy(withDevHost(request));
}

export const config = {
  matcher: [
    '/((?!api/uploadthing|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
