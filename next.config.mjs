import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const isStatic = process.env.STATIC_EXPORT === 'true';

// Baseline security headers. The Content-Security-Policy is not here: it
// carries a per-request nonce and is set in src/middleware.ts.
// No HSTS here — the platform already sends it, and
// setting it per-repo is how the estate ended up with inconsistent max-ages.
// Permissions-Policy deliberately omits accelerometer/gyroscope/magnetometer:
// a top-level policy is inherited by iframes and cannot be widened by their
// `allow` attribute, so blocking those breaks embedded video players.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'bluetooth=()',
    ].join(', '),
  },
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Only applied to the server-rendered build. `output: 'export'` has no
  // server to send headers, and Next drops `headers()` silently — the Apache
  // vhost serving the static build needs these set there instead.
  ...(!isStatic && {
    async headers() {
      return [{ source: '/(.*)', headers: securityHeaders }];
    },
  }),
  // Static-export build for LAMP/Apache hosting under `/mvdocs`.
  // Enabled by `STATIC_EXPORT=true` (see `pnpm build:static`).
  // Search bar is hidden in static mode (no backend); the Fumadocs search
  // API route is stashed out of the way by `scripts/build-static.mjs`.
  ...(isStatic && {
    output: 'export',
    basePath: '/mvdocs',
    images: { unoptimized: true },
    trailingSlash: true,
  }),
};

export default withMDX(config);
