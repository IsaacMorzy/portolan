import type { NextConfig } from "next";
import { assertEnv } from "./lib/env";

assertEnv();

/**
 * Security headers.
 *
 * The CSP is no longer set here: it is built per-request in proxy.ts (a
 * nonce is stamped on the forwarded request header so Next's server render
 * can read it via getScriptNonceFromHeaders, and on the response header so
 * the browser enforces it). A second, nonce-less CSP here would intersect
 * with the middleware one and silently drop the nonce, so only headers safe
 * to apply to every response stay here.
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
