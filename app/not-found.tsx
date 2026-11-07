import Link from "next/link";
import { Mark } from "@/components/landing/mark";

// A mistyped or expired link is a real page someone reaches. It gets the mark,
// one sentence that says what happened, and both useful exits — rather than a
// bare Next.js default with no way back.
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="mx-auto flex h-12 w-full max-w-6xl items-center px-6">
        <Link href="/" className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-tight">
          <Mark className="size-[1.125rem] text-accent" />
          Cartograph
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16">
        <p className="font-mono text-[0.75rem] text-fg-muted">404</p>
        <h1 className="mt-3 max-w-[22ch] text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance md:text-[2.5rem]">
          There is no page at this address
        </h1>
        <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed text-fg-muted">
          An analysis link points at a row that no longer exists once it is deleted, and a mistyped
          path lands here too. Both exits below work.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-8 items-center rounded bg-accent px-4 text-xs font-medium text-accent-fg"
          >
            Go to the dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded border-line border-line px-4 text-xs text-fg transition-colors hover:bg-raised"
          >
            Back to the site
          </Link>
        </div>
      </main>
    </div>
  );
}
