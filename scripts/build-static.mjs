#!/usr/bin/env node
/**
 * Static-export build of `movement-docs` for LAMP / Apache hosting at
 * `/mvdocs`. Output: `out/` (upload its contents to `/mvdocs/` on the
 * server).
 *
 * Two adjustments to the project happen for the duration of the build:
 *  - `src/app/api/search/route.ts` (the Fumadocs Orama search backend) is
 *    moved aside, because dynamic POST routes can't be statically pre-
 *    rendered. The search bar UI is also hidden in the static build via
 *    `RootProvider`'s `search.enabled` prop, gated by
 *    `process.env.STATIC_EXPORT` in `src/app/layout.tsx`.
 *  - `STATIC_EXPORT=true` is set so `next.config.mjs` switches on
 *    `output: 'export'`, `basePath: '/mvdocs'`, unoptimised images, and
 *    `trailingSlash: true` (Apache needs the trailing-slash + index.html
 *    convention to serve nested paths).
 *
 * The stash is restored in a `finally`, so the search route is back even
 * if the build fails or is interrupted.
 */
import { rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const STASHED = [
  ['src/app/api/search/route.ts', 'src/app/api/search/route.ts.static-skip'],
  // `llms.mdx/[[...slug]]` clashes with itself in a static export: with
  // `trailingSlash: true`, the parent slugs (`/llms.mdx/api`) would write
  // a file, but the nested slugs (`/llms.mdx/api/node/...`) need that
  // path to be a directory. Next can't reconcile in `output: 'export'`.
  // The route is a build-time convenience for LLM consumers; not needed
  // for the static mirror.
  ['src/app/llms.mdx/[[...slug]]/route.ts', 'src/app/llms.mdx/[[...slug]]/route.ts.static-skip'],
  // Middleware sends the nonce-based CSP, and `output: 'export'` has no server
  // to run it — Next fails the build outright if the file is present. The
  // Apache vhost serving `/mvdocs` needs an equivalent policy set there.
  ['src/middleware.ts', 'src/middleware.ts.static-skip'],
];

async function stash() {
  for (const [src, dst] of STASHED) {
    if (existsSync(src)) await rename(src, dst);
  }
}

async function restore() {
  for (const [src, dst] of STASHED) {
    if (existsSync(dst)) await rename(dst, src);
  }
}

async function main() {
  await stash();
  try {
    const result = spawnSync('next', ['build'], {
      stdio: 'inherit',
      env: { ...process.env, STATIC_EXPORT: 'true' },
    });
    process.exitCode = result.status ?? 0;
  } finally {
    await restore();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
