import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The landing page, the security page and the auth screens are the only
// surfaces a signed-out visitor may see. The landing page is served at "/" so
// anyone who arrives from a link reads what the product does before being
// asked to sign in; everything under /dashboard and /analyses stays behind
// auth. /security is public because a page arguing about data access that
// itself demands an account is arguing the wrong way round.
//
// /api/cron is public to the middleware, not to the world: the caller is
// Vercel's scheduler, which has no session, and the route authorises itself
// with CRON_SECRET before it does anything.
const isPublic = createRouteMatcher([
  "/",
  "/security(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/cron(.*)",
  // The social card. A crawler fetching it has no session, and a card that
  // redirects to sign-in is a card that never renders.
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
]);

// Protection happens here, before any route renders, so a signed-out visitor
// gets a redirect and never receives the page's HTML.
export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
