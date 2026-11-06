import Link from "next/link";
import { ThemeControl } from "@/components/theme-control";
import type { Theme } from "@/lib/theme";

/**
 * The mark is three nodes and the two edges between them — the smallest true
 * statement of what the product draws. No ornament beyond that.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="none">
      <path d="M4.6 4.4 11.4 8 4.6 11.6" stroke="currentColor" strokeWidth="1.1" opacity="0.4" />
      <path d="M4.6 4.4v7.2" stroke="currentColor" strokeWidth="1.1" opacity="0.4" />
      <circle cx="4.6" cy="4.4" r="1.9" fill="currentColor" />
      <circle cx="11.4" cy="8" r="1.9" fill="currentColor" opacity="0.65" />
      <circle cx="4.6" cy="11.6" r="1.9" fill="currentColor" opacity="0.65" />
    </svg>
  );
}

const LINKS = [
  { href: "#workflow", label: "How it works" },
  { href: "#map", label: "The map" },
  { href: "#grounding", label: "Why it's true" },
  { href: "#teams", label: "Teams" },
];

export function Nav({ theme, signedIn }: { theme: Theme; signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-tight">
          <Mark className="size-[1.125rem] text-accent" />
          Cartograph
        </Link>

        <nav className="hidden items-center gap-5 text-xs text-fg-muted md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ThemeControl initial={theme} />
          {signedIn ? (
            <Link href="/dashboard" className="flex h-6 items-center rounded bg-accent px-2.5 text-xs text-accent-fg">
              Open dashboard
            </Link>
          ) : (
            <Link href="/sign-in" className="flex h-6 items-center rounded bg-accent px-2.5 text-xs text-accent-fg">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
