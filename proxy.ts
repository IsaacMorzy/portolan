import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

// Protection happens here, before any route renders, so a signed-out visitor
// gets a redirect and never receives the page's HTML.
export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
