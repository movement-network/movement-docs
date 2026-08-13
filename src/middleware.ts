import { NextResponse, type NextRequest } from 'next/server';

/**
 * Enforcing Content-Security-Policy with a per-request nonce.
 *
 * Next emits inline bootstrap and streaming-payload scripts, so an enforcing
 * policy needs either 'unsafe-inline' or a nonce. Next reads the nonce off the
 * request's own content-security-policy header and stamps it onto the script
 * tags it generates, so the header has to be set on both request and response.
 *
 * Applies to the server-rendered build only. `output: 'export'` has no server
 * to run middleware, so `scripts/build-static.mjs` stashes this file for the
 * duration of that build and the Apache vhost serving `/mvdocs` has to send an
 * equivalent policy itself.
 *
 * Runtime surface this is tuned to:
 *   - fumadocs-ui -> bundled; its search UI calls the same-origin Orama route
 *     at /api/search, and it drives next-themes, whose inline anti-flash
 *     script is nonced via RootProvider's `theme` prop in src/app/layout.tsx
 *   - next/font/local (ABC Oracle) -> self-hosted woff2 only
 *   - no third-party script tags, no iframes and no hot-linked images; outbound
 *     links are navigations, not fetches
 */
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    `default-src 'self'`,
    // 'strict-dynamic' trusts scripts loaded by an already-trusted (nonced)
    // script. Host allowlists in script-src are ignored once it is set. HMR
    // needs 'unsafe-eval' in dev; production builds do not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Next and fumadocs-ui inject styles at runtime; nonces do not propagate
    // to those the way 'strict-dynamic' does for script.
    `style-src 'self' 'unsafe-inline'`,
    // Every image in content/ and src/ is served from this origin; nothing is
    // hot-linked. Adding an external image or an embedded video player means
    // naming its host here rather than widening this back to https:.
    `img-src 'self' data:`,
    `font-src 'self' data:`,
    `frame-src 'none'`,
    `connect-src 'self' https:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Documents only. Static assets and images carry no script, and prefetches
    // are excluded so a cached prefetch cannot pin a stale nonce.
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
