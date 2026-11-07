import type { NextConfig } from "next";
import { assertEnv } from "./lib/env";

assertEnv();

/**
 * Security headers.
 *
 * The CSP here is deliberately a narrow subset — `frame-ancestors`,
 * `base-uri`, `object-src`. Those three stop clickjacking and injected base or
 * plugin URLs, and none of them touch scripts or styles, so nothing about the
 * page can break.
 *
 * A `script-src` policy is the one that would help most and is the one I have
 * not written: Next injects inline bootstrap scripts and Clerk loads its client
 * from the proxied Frontend API, so a `'self'`-only policy either needs a nonce
 * threaded through middleware or it breaks sign-in. Breaking the login page to
 * put a header in a paper is the wrong trade, and a policy written blind and
 * shipped is worse than one that is visibly absent.
 */
const securityHeaders = [
  // A year, subdomains included. The domain is HTTPS-only already; this stops
  // the first request of a session being the one that gets intercepted.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // No guessing a content type. A .txt that sniffs as HTML is a script tag.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The full URL of a page here can contain a repository name. Other sites
  // have no business knowing it.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Belt and braces with frame-ancestors, for anything that predates CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // The framework and its version are not a secret, but announcing them is a
  // free hint for anyone matching against known issues.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
