# 0021 — CSP script-src/style-src with nonce (issue #31)

## Ask (verbatim)
Issue #31 (ready-for-agent): "Content-Security-Policy: add script-src with a nonce, without breaking Clerk."

## Reading
Current CSP in `next.config.ts` (`securityHeaders`, applied via `async headers()`): `frame-ancestors 'none'; base-uri 'self'; object-src 'none'` — deliberately narrow, no script-src/style-src. The comment there says script-src needs a nonce threaded through middleware because Next injects inline bootstrap/RSC scripts and Clerk loads its client from the proxied Frontend API; `'self'`-only blanks the page.

Empirical facts (verified against the dev server):
- Next.js 16.4.5 reads the nonce from the request `content-security-policy` header via `get-script-nonce-from-header.js` (`getScriptNonceFromHeaders` extracts `script-src 'nonce-<base64>'`) and applies it to its injected scripts and styled-jsx styles (render.js). So middleware must forward the CSP as a **request** header AND set it as the **response** header.
- Clerk loads its JS from `https://clerk.codegraph-navy.vercel.app/...` — a different subdomain, NOT same-origin. `script-src 'nonce' 'self'` alone blocks clerk-js → sign-in breaks. So script-src must include the clerk domain.
- `clerkMiddleware`'s built-in `contentSecurityPolicy` option cannot satisfy this: its default `script-src` keeps `'unsafe-inline'` and `directives` merge can't remove it. So a **custom** nonce policy in `proxy.ts`, not Clerk's option.
- sign-in e2e (`scripts/e2e/sign-in.mjs`) runs against the **deployed host** (`https://codegraph-navy.vercel.app`), mints a Clerk ticket via `CLERK_SECRET_KEY`, and asserts no page errors. Against localhost the Clerk host has no certificate and the page cannot load, so sign-in e2e cannot be run in this session; it must be run post-deploy.

Scope (chosen per the issue's risk warning: breaking sign-in is worse than a missing header):
**In:**
- `proxy.ts`: keep Clerk auth protection (`clerkMiddleware` + `isProtected`/`auth.protect()`), but make the handler return a `NextResponse` that (a) generates a per-request nonce (`crypto.getRandomValues` → base64), (b) sets `content-security-policy` as a forwarded **request** header so `render.js` picks up the nonce for Next's injected scripts/styles, (c) sets `Content-Security-Policy` as the **response** header for the browser. Policy:
  - `script-src 'nonce-<nonce>' 'self' https://clerk.codegraph-navy.vercel.app` — no `'unsafe-inline'`.
  - `style-src 'nonce-<nonce>' 'self'` (styled-jsx gets the nonce; Tailwind CSS is same-origin `<link>`).
  - keep `frame-ancestors 'none'; base-uri 'self'; object-src 'none'`.
- `next.config.ts`: remove the `Content-Security-Policy` line from `securityHeaders` (keep HSTS/nosniff/Referrer-Policy/X-Frame-Options/Permissions-Policy/COOP) so the middleware-set CSP isn't intersected/overridden by a second, nonce-less CSP header.
**Out:** Clerk's `contentSecurityPolicy` option (doesn't meet "no unsafe-inline for scripts"), adding Java/Go etc., changing Clerk's domain config, the landing page markup.

## Done when
- `pnpm gate` passes
- `npx tsc --noEmit`, `npx eslint . --quiet`, `pnpm build` pass
- `node scripts/e2e/landing.mjs http://localhost:3100` passes at 1440 and 390 (200, heading, no sideways scroll, no console errors — including no CSP violations) for both light (theme cookie absent) and dark (theme cookie `dark`)
- sign-in e2e cannot be run here (no deploy); note it as a post-deploy check: `node --env-file=.env.local scripts/e2e/sign-in.mjs https://codegraph-navy.vercel.app` must pass with no page errors

## Known unknowns / risks
- If Clerk's frontendApi domain changes, script-src must be updated. The domain was observed empirically as `clerk.codegraph-navy.vercel.app`.
- If the deployed Clerk instance loads clerk-js from any other domain, sign-in breaks — hence post-deploy sign-in e2e is the gate.
