"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mark } from "@/components/landing/mark";
import { ThemeControl } from "@/components/theme-control";
import type { Theme } from "@/lib/theme";

// Each section says what it answers, so the menu is a table of contents rather
// than four words that could belong to any product.
const SECTIONS = [
  { href: "#workflow", label: "How it works", hint: "URL to map, stage by stage" },
  { href: "#map", label: "The map", hint: "Blast radius for one file" },
  { href: "#grounding", label: "Why it's true", hint: "What every claim cites" },
  { href: "#teams", label: "Teams", hint: "One workspace, one boundary" },
  { href: "/security", label: "Security", hint: "What is read, who reads it back" },
];

export function Nav({ theme, signedIn }: { theme: Theme; signedIn: boolean }) {
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes either surface; a click outside the wrapper closes the menu,
  // which is what everyone expects and nobody documents.
  useEffect(() => {
    if (!menu && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      setSheet(false);
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
      <div ref={wrap} className="mx-auto flex h-12 max-w-6xl items-center gap-2 px-6">
        <Link href="/" className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-tight">
          <Mark className="size-[1.125rem] text-accent" />
          Cartograph
        </Link>

        <div className="relative ml-2 hidden md:block">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="nav-menu"
            className="flex h-6 items-center gap-1.5 rounded px-2 text-xs text-fg-muted transition-colors hover:bg-raised hover:text-fg"
          >
            Product
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={`transition-transform ${menu ? "rotate-180" : ""}`}>
              <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>

          <div
            id="nav-menu"
            hidden={!menu}
            className="absolute top-full left-0 z-40 mt-2 w-[19rem] rounded border border-line bg-surface p-1.5"
          >
            <ul>
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    onClick={() => setMenu(false)}
                    className="block rounded px-2.5 py-2 transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-none"
                  >
                    <span className="block text-xs font-medium text-fg">{s.label}</span>
                    <span className="mt-0.5 block text-[0.6875rem] text-fg-muted">{s.hint}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 border-t border-line px-2.5 pt-2 pb-1">
              <Link
                href={signedIn ? "/dashboard" : "/start"}
                onClick={() => setMenu(false)}
                className="text-[0.6875rem] text-fg-muted transition-colors hover:text-fg"
              >
                {signedIn ? "Open the dashboard" : "Connect a repository"}
              </Link>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeControl initial={theme} />
          <Link
            href={action.href}
            className="hidden h-6 items-center rounded bg-accent px-2.5 text-xs text-accent-fg sm:flex"
          >
            {action.label}
          </Link>
          <button
            type="button"
            onClick={() => setSheet((v) => !v)}
            aria-expanded={sheet}
            aria-controls="nav-sheet"
            aria-label="Menu"
            className="grid size-7 place-items-center rounded text-fg-muted transition-colors hover:bg-raised hover:text-fg md:hidden"
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

      {/* The sheet carries the same links the dropdown does: on a phone the
          section nav would otherwise disappear entirely. */}
      <div id="nav-sheet" hidden={!sheet} className="border-t border-line bg-canvas px-6 py-3 md:hidden">
        <ul className="grid gap-1">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                onClick={() => setSheet(false)}
                className="flex items-baseline justify-between gap-3 rounded px-1 py-1.5 text-xs text-fg"
              >
                {s.label}
                <span className="text-[0.6875rem] text-fg-muted">{s.hint}</span>
              </a>
            </li>
          ))}
        </ul>
        <Link
          href={action.href}
          onClick={() => setSheet(false)}
          className="mt-3 flex h-8 items-center justify-center rounded bg-accent text-xs font-medium text-accent-fg"
        >
          {action.label}
        </Link>
      </div>
    </header>
  );
}
