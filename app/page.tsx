import { auth } from "@clerk/nextjs/server";
import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Hero } from "@/components/landing/hero";
import { Nav } from "@/components/landing/nav";
import { Compare } from "@/components/landing/compare";
import { Pricing } from "@/components/landing/pricing";
import { Questions } from "@/components/landing/faq";
import { Value } from "@/components/landing/value";
import { Close, Grounding, MapSection, Teams, Workflow } from "@/components/landing/sections";
import { FooterColumns } from "@/components/velora/footer-columns";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Portolan — dependency maps of your codebase",
  description:
    "Portolan parses a TypeScript repository into a map of modules and the edges between them, then explains each one using only the code it actually read.",
  openGraph: {
    title: "Portolan — dependency maps of your codebase",
    description:
      "Parse a repository into a map of modules and edges, follow the blast radius of a change, and read explanations grounded in the parsed tree.",
    type: "website",
  },
};

// Public by design: this is the page a signed-out visitor lands on. The only
// thing it reads from the session is whether one exists, so it can offer one
// action instead of two. No workspace data is touched here.
export default async function LandingPage() {
  const [{ userId }, jar] = await Promise.all([auth(), cookies()]);
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  const signedIn = Boolean(userId);

  // Structured data, so a search result can say what this is rather than
  // guessing from the page. Static object, serialized once at render.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Portolan",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description:
      "Parses TypeScript, JavaScript and Python into a map of modules and the imports between them, then explains each one using only the code it read.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: `${SITE_URL}/`,
  };

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* First stop for a keyboard. It is invisible until focused, because a
          visible skip link on a page with a 56px header is a second header. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-1.5 focus:text-xs focus:text-fg"
      >
        Skip to content
      </a>
      <Nav theme={theme} signedIn={signedIn} />
      <main id="main" className="flex-1">
        <Hero />
        <Value />
        <Workflow />
        <MapSection />
        <Grounding />
        <Compare />
        <Pricing />
        <Teams />
        <Questions />
        <Close signedIn={signedIn} />
      </main>
      <FooterColumns />
    </div>
  );
}
