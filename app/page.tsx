import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Hero } from "@/components/landing/hero";
import { Nav } from "@/components/landing/nav";
import { Questions } from "@/components/landing/faq";
import { Close, Grounding, MapSection, Teams, Workflow } from "@/components/landing/sections";
import { FooterColumns } from "@/components/velora/footer-columns";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Cartograph — dependency maps of your codebase",
  description:
    "Cartograph parses a TypeScript repository into a map of modules and the edges between them, then explains each one using only the code it actually read.",
  openGraph: {
    title: "Cartograph — dependency maps of your codebase",
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

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <Nav theme={theme} signedIn={signedIn} />
      <main className="flex-1">
        <Hero />
        <Workflow />
        <MapSection />
        <Grounding />
        <Teams />
        <Questions />
        <Close signedIn={signedIn} />
      </main>
      <FooterColumns />
    </div>
  );
}
