import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The landing page, the security page and the auth screens are the only
// surfaces a signed-out visitor may see. The landing page is served at "/" so
// anyone who arrives from a link reads what the product does before being
// asked to sign in; everything under /dashboard and /analyses stays behind
// auth. /security is public because a page arguing about data access that
// itself demands an account is arguing the wrong way round.
const isPublic = createRouteMatcher(["/", "/security(.*)", "/sign-in(.*)", "/sign-up(.*)"]);

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
