"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mark } from "@/components/landing/mark";
import { ThemeControl } from "@/components/theme-control";
import type { Theme } from "@/lib/theme";

/**
 * The header.
 *
 * Two things make this a menu rather than a list of links:
 *
 * 1. **Groups.** Seven anchors in one column is a sitemap; the same seven under
 *    "The product" and "Trust" is a menu, because the reader can skip a group
 *    instead of reading all of it.
 * 2. **Where you are.** The section in view is marked `aria-current`, so the
 *    header answers "where am I" without a second control. The scroll spy is an
 *    IntersectionObserver over the anchors' own targets — no scroll handler.
 *
 * Velora's block structure (brand left, groups centre, actions right, a card at
 * the end of the panel) with this product's tokens. The card earns its place by
 * holding the one action a first-time reader needs, not a decorative thumbnail.
 */

const SECTIONS = [
  { href: "#workflow", label: "How it works", hint: "URL to map, stage by stage", group: "product" },
  { href: "#map", label: "The map", hint: "Blast radius for one file", group: "product" },
  { href: "#pricing", label: "Pricing", hint: "Three plans, and what is shipped", group: "product" },
  { href: "#compare", label: "Compared", hint: "Ten tools, four honest losses", group: "product" },
  { href: "#grounding", label: "Why it's true", hint: "What every claim cites", group: "trust" },
  { href: "#teams", label: "Teams", hint: "One workspace, one boundary", group: "trust" },
  { href: "/security", label: "Security", hint: "What is read, who reads it back", group: "trust" },
];

const GROUPS = [
  { key: "product", title: "The product" },
  { key: "trust", title: "Trust" },
] as const;

// The three that earn a place in the bar itself.
const INLINE = SECTIONS.filter((s) => ["#map", "#pricing"].includes(s.href));

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function Nav({ theme, signedIn }: { theme: Theme; signedIn: boolean }) {
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The section under the header, so the bar can say where the reader is. Only
  // the anchor targets are observed; /security is a page, not a section.
  useEffect(() => {
    const targets = INLINE.concat(SECTIONS.filter((s) => s.group === "product"))
      .map((s) => document.querySelector(s.href))
      .filter((el): el is Element => el !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(`#${visible.target.id}`);
      },
      { rootMargin: "-64px 0px -60% 0px", threshold: 0 },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menu && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      setSheet(false);
      trigger.current?.focus();
    };
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [menu, sheet]);

  const action = signedIn
    ? { href: "/dashboard", label: "Open dashboard" }
    : { href: "/sign-in", label: "Sign in" };

  return (
    <header
      className={`sticky top-0 z-30 bg-canvas transition-colors ${scrolled ? "border-b border-line" : "border-b border-transparent"}`}
    >
      <div ref={wrap} className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-6">
        <Link href="/" className={`flex items-center gap-2 text-[0.9375rem] font-semibold tracking-tight ${focusRing}`}>
          <Mark className="size-[1.125rem] text-accent" />
          Portolan
        </Link>

        <nav aria-label="Sections" className="ml-3 hidden items-center gap-0.5 md:flex">
          {INLINE.map((s) => (
            <a
              key={s.href}
              href={s.href}
              aria-current={current === s.href ? "true" : undefined}
              className={`flex h-7 items-center rounded px-2 text-xs transition-colors ${focusRing} ${
                current === s.href ? "bg-raised text-fg" : "text-fg-muted hover:bg-raised hover:text-fg"
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="relative ml-0.5 hidden md:block">
          <button
            ref={trigger}
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="nav-menu"
            aria-haspopup="true"
            className={`flex h-7 items-center gap-1.5 rounded px-2 text-xs transition-colors ${focusRing} ${
              menu ? "bg-raised text-fg" : "text-fg-muted hover:bg-raised hover:text-fg"
            }`}
          >
            Everything
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={`transition-transform duration-150 ${menu ? "rotate-180" : ""}`}>
              <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>

          {menu && (
            <div
              id="nav-menu"
              className="absolute top-full left-0 z-40 mt-2 grid w-[34rem] grid-cols-[minmax(0,1fr)_12.5rem] gap-4 rounded ring-1 ring-line bg-surface p-3"
            >
              <div className="grid content-start gap-3">
                {GROUPS.map((group) => (
                  <div key={group.key}>
                    <p className="px-2 text-[0.6875rem] tracking-wide text-fg-muted">{group.title}</p>
                    <ul className="mt-1">
                      {SECTIONS.filter((s) => s.group === group.key).map((s) => (
                        <li key={s.href}>
                          <Link
                            href={s.href}
                            onClick={() => setMenu(false)}
                            aria-current={current === s.href ? "true" : undefined}
                            className={`block rounded px-2 py-1.5 transition-colors hover:bg-raised ${focusRing} ${
                              current === s.href ? "bg-raised" : ""
                            }`}
                          >
                            <span className="block text-xs font-medium text-fg">{s.label}</span>
                            <span className="mt-0.5 block text-[0.6875rem] text-fg-muted">{s.hint}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* The panel's end card: the one action a cold reader needs, and
                  the number that makes it worth doing. */}
              <div className="flex flex-col justify-between rounded bg-canvas p-3">
                <div>
                  <p className="text-xs font-medium text-fg">Start with a public repo</p>
                  <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-fg-muted">
                    Paste a URL. The map is pinned to the commit it read, and every unresolved import is counted rather
                    than drawn.
                  </p>
                </div>
                <Link
                  href={signedIn ? "/dashboard" : "/start"}
                  onClick={() => setMenu(false)}
                  className={`mt-3 flex h-7 items-center justify-center rounded bg-accent px-2.5 text-[0.6875rem] font-medium text-accent-fg ${focusRing}`}
                >
                  {signedIn ? "Open the dashboard" : "Connect a repository"}
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeControl initial={theme} />
          <Link
            href={action.href}
            className={`hidden h-7 items-center rounded bg-accent px-2.5 text-xs text-accent-fg sm:flex ${focusRing}`}
          >
            {action.label}
          </Link>
          <button
            type="button"
            onClick={() => setSheet((v) => !v)}
            aria-expanded={sheet}
            aria-controls="nav-sheet"
            aria-label="Menu"
            className={`grid size-7 place-items-center rounded text-fg-muted transition-colors hover:bg-raised hover:text-fg md:hidden ${focusRing}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              {sheet ? (
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              ) : (
                <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* The sheet keeps the menu's grouping rather than flattening it back into
          the list the desktop panel just stopped being. */}
      {sheet && (
        <div id="nav-sheet" className="border-t border-line bg-canvas px-6 py-4 md:hidden">
          {GROUPS.map((group) => (
            <div key={group.key} className="mb-3 last:mb-0">
              <p className="text-[0.6875rem] tracking-wide text-fg-muted">{group.title}</p>
              <ul className="mt-1.5 grid gap-0.5">
                {SECTIONS.filter((s) => s.group === group.key).map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      onClick={() => setSheet(false)}
                      aria-current={current === s.href ? "true" : undefined}
                      className="flex items-baseline justify-between gap-3 rounded px-2 py-2 text-xs text-fg hover:bg-raised"
                    >
                      {s.label}
                      <span className="text-[0.6875rem] text-fg-muted">{s.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link
            href={action.href}
            onClick={() => setSheet(false)}
            className="mt-2 flex h-9 items-center justify-center rounded bg-accent text-xs font-medium text-accent-fg"
          >
            {action.label}
          </Link>
        </div>
      )}
    </header>
  );
}
