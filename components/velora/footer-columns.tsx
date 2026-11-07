import Link from "next/link";
import { Mark } from "@/components/landing/mark";

/**
 * Vendored from Velora's `footer-columns` block and adapted: the gradient mark
 * tile, the "New"/"Hiring" badges and the placeholder social icons are gone,
 * because none of them describe this product, and every colour is a site token.
 * The structure — brand and tagline beside link columns, one bar underneath —
 * is the block's, and it is what a site with more than one page needs.
 */
const TAGLINE =
  "Dependency maps of a TypeScript repository. Every edge is an import the parser resolved, and every claim cites a file it read.";

const COLUMNS = [
  {
    title: "The product",
    links: [
      { label: "How it works", href: "/#workflow" },
      { label: "The map", href: "/#map" },
      { label: "Why it's true", href: "/#grounding" },
      { label: "Teams", href: "/#teams" },
    ],
  },
  {
    title: "Using it",
    links: [
      { label: "Create an account", href: "/sign-up" },
      { label: "Sign in", href: "/sign-in" },
      { label: "Connect a repository", href: "/start" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "How reads are scoped", href: "/security" },
      { label: "Questions", href: "/#questions" },
    ],
  },
];

const focusRing = "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function FooterColumns() {
  return (
    <footer className="border-t border-line bg-surface px-6 pt-16 pb-8">
      <div className="mx-auto max-w-6xl">
        {/* The wordmark, from Velora's footer-wordmark block: one large line of
            type as the page's last gesture. Opacity, not a second colour, so it
            stays quiet in both themes. */}
        <p className="mb-12 text-[3.25rem] leading-none font-semibold tracking-[-0.045em] opacity-20 select-none md:text-[5rem]">
          Cartograph
        </p>

        <div className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] md:gap-16">
          <div>
            <Link href="/" className={`inline-flex items-center gap-2 text-[0.9375rem] font-semibold tracking-tight ${focusRing}`}>
              <Mark className="size-[1.125rem] text-accent" />
              Cartograph
            </Link>
            <p className="mt-4 max-w-[38ch] text-[0.8125rem] leading-relaxed text-pretty text-fg-muted">
              {TAGLINE}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="text-[0.75rem] font-medium text-fg">{column.title}</h2>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className={`text-[0.8125rem] text-fg-muted transition-colors hover:text-fg ${focusRing}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse gap-3 border-t border-line pt-6 text-[0.75rem] text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getUTCFullYear()} Cartograph</p>
          <p>Analyses are pinned to a commit. A repository that moves on is re-read, not guessed at.</p>
        </div>
      </div>
    </footer>
  );
}
