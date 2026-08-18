import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest, type NextResponse } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { middleware, config } from './middleware';

const ORIGIN = 'https://docs.movementnetwork.xyz';

function run(url = `${ORIGIN}/`, headers: Record<string, string> = {}) {
  const response = middleware(new NextRequest(new Request(url, { headers })));
  return {
    response,
    csp: response.headers.get('content-security-policy') ?? '',
  };
}

// NextResponse.next({ request: { headers } }) surfaces the overridden request
// headers on the response, which is the only way to see what the app receives.
function requestHeader(response: NextResponse, key: string) {
  return response.headers.get(`x-middleware-request-${key}`);
}

function directive(csp: string, name: string) {
  return csp.split('; ').find((d) => d === name || d.startsWith(`${name} `));
}

function matches(url: string, headers: Record<string, string> = {}) {
  return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url, headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('csp', () => {
  it('nonces every request differently', () => {
    const nonceOf = (csp: string) => csp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonceOf(run().csp)).toBeTruthy();
    expect(nonceOf(run().csp)).not.toBe(nonceOf(run().csp));
  });

  it('hands the app the same nonce it advertises in the response policy', () => {
    // Next reads the nonce off the request's own policy header and stamps it
    // onto the script tags it generates. If the two ever drift, every script on
    // every page is blocked, and the response policy alone cannot show it.
    const { response, csp } = run();
    const advertised = csp.match(/'nonce-([^']+)'/)?.[1];

    expect(advertised).toBeTruthy();
    expect(requestHeader(response, 'x-nonce')).toBe(advertised);
    expect(requestHeader(response, 'content-security-policy')).toBe(csp);
  });

  it('overwrites inbound nonce and policy headers rather than passing them through', () => {
    const { response, csp } = run(`${ORIGIN}/`, {
      'x-nonce': 'attacker-supplied',
      'content-security-policy': "script-src 'unsafe-inline'",
    });

    expect(requestHeader(response, 'x-nonce')).not.toBe('attacker-supplied');
    expect(requestHeader(response, 'x-nonce')).toBe(
      csp.match(/'nonce-([^']+)'/)?.[1]
    );
    expect(requestHeader(response, 'content-security-policy')).toBe(csp);
  });

  it("never allows 'unsafe-inline' in script-src, which would void the nonce", () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(directive(run().csp, 'script-src')).not.toContain("'unsafe-inline'");
  });

  it("keeps 'unsafe-eval' out of the production policy", () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(directive(run().csp, 'script-src')).not.toContain("'unsafe-eval'");
  });

  it('keeps the tight directives tight', () => {
    // Nothing in content/ or src/ hot-links an image or embeds an iframe.
    // Widening either of these should be a deliberate edit, not a drift.
    const { csp } = run();
    expect(directive(csp, 'img-src')).toBe("img-src 'self' data:");
    expect(directive(csp, 'frame-src')).toBe("frame-src 'none'");
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
  });

  it('leaves connect-src broad enough for the API playground', () => {
    // Send Request fetches whichever node endpoint the spec names, and those
    // hosts change per network.
    vi.stubEnv('NODE_ENV', 'production');
    expect(directive(run().csp, 'connect-src')).toBe("connect-src 'self' https:");
  });

  it('scopes the dev-hostile directives to their environment', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const prod = run().csp;
    expect(prod).toContain('upgrade-insecure-requests');
    expect(directive(prod, 'connect-src')).not.toContain(' ws:');

    vi.stubEnv('NODE_ENV', 'development');
    const dev = run().csp;
    expect(dev).not.toContain('upgrade-insecure-requests');
    // Space-prefixed so this cannot pass on a bare https: or wss: token.
    expect(directive(dev, 'connect-src')).toContain(' ws:');
  });
});

describe('matcher', () => {
  it('runs on documents, including the API reference', () => {
    // src/app/api/[[...slug]]/page.tsx renders these through DocsPage: they are
    // documents, and they host the OpenAPI playground.
    for (const url of [
      `${ORIGIN}/`,
      `${ORIGIN}/general`,
      `${ORIGIN}/devs/oracles`,
      `${ORIGIN}/api`,
      `${ORIGIN}/api/accounts/get-account`,
    ]) {
      expect(matches(url), url).toBe(true);
    }
  });

  it('skips the two real route handlers, the build output and static assets', () => {
    for (const url of [
      `${ORIGIN}/api/search`,
      `${ORIGIN}/api/spec`,
      `${ORIGIN}/_next/static/chunks/main.js`,
      `${ORIGIN}/favicon.ico`,
      `${ORIGIN}/fonts/oracle.woff2`,
      `${ORIGIN}/images/diagram.png`,
    ]) {
      expect(matches(url), url).toBe(false);
    }
  });

  it('skips prefetches, so a cached prefetch cannot pin a stale nonce', () => {
    expect(matches(`${ORIGIN}/`, { 'next-router-prefetch': '1' })).toBe(false);
    expect(matches(`${ORIGIN}/`, { purpose: 'prefetch' })).toBe(false);
  });
});
