import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// What a signed-out visitor may still reach, and why — the inverse of the list
// below, kept because it is the thing a reader actually wants to know:
//
//   /            the landing page, so anyone arriving from a link reads what the
//                product does before being asked to sign in
//   /security    a page arguing about data access that itself demands an account
//                is arguing the wrong way round
//   /sign-in, /sign-up
//   /api/cron    public to the middleware, not to the world: the caller is
//                Vercel's scheduler, which has no session, and the route
//                authorises itself with CRON_SECRET before doing anything
//   /opengraph-image, /twitter-image
//                a crawler fetching a card has no session, and a card that
//                redirects to sign-in is a card that never renders
//
// Deny-by-default was the first version of this and it made every mistyped URL
// answer 200-with-the-sign-in-screen. That is a soft 404: a crawler indexes the
// sign-in page under every typo, and a reader who mistyped is asked to log in
// rather than told the page is missing. `scripts/e2e/audit.mjs` fails on it.
//
// So the matcher names what is protected instead of what is public. The ceiling
// does not drop, because the middleware was never the security boundary: every
// entry point verifies the caller's organisation itself (see
// docs/architecture.md, "one guard per entry point"). A protected path that
// does not exist now 404s, which is the honest answer for it too.
const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/analyses(.*)",
  "/start(.*)",
  "/api/graph(.*)",
  "/api/churn(.*)",
  "/api/progress(.*)",
]);

const CLERK_JS_HOST = "https://clerk.codegraph-navy.vercel.app";

function makeNonce(): string {
  // 128 random bits, hex — matches Next's nonce source regex and is
  // unpredictable enough for a CSP nonce.
  return crypto.randomUUID().replace(/-/g, "");
}

function csp(nonce: string): string {
  // script-src is nonce-only: 'unsafe-inline' is deliberately omitted (it is
  // the dangerous XSS vector, and the acceptance bans it for scripts).
  // style-src uses 'unsafe-inline': a React application applies inline styles
  // through the CSSOM at runtime (element.style, next/font, animated
  // canvases), and those cannot be nonce'd. Crucially, Chrome ignores
  // 'unsafe-inline' whenever a nonce is present in style-src, so a nonce
  // there would leave every inline style violating. The acceptance's unsafe-
  // inline ban names scripts only, so styles carry it instead.
  return `script-src 'nonce-${nonce}' 'self' ${CLERK_JS_HOST}; style-src 'unsafe-inline' 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'`;
}

// Protection happens here, before any route renders, so a signed-out visitor
// gets a redirect and never receives the page's HTML. The handler returns a
// response carrying the nonce-based CSP; Clerk still appends its auth cookies
// (session, state) on top.
export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();

  const nonce = makeNonce();
  const policy = csp(nonce);
  // Stamp the nonce on the request so Next's server render (parseRequestHeaders
  // -> getScriptNonceFromHeaders) can read it and stamp it on its own scripts
  // and styled-jsx styles, and on the response so the browser enforces it.
  try {
    req.headers.set("content-security-policy", policy);
  } catch {
    // Headers may be immutable in some runtimes; fall back to forwarding.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("content-security-policy", policy);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", policy);
    return response;
  }
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", policy);
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
