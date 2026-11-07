"use client";

import Link from "next/link";
import { useEffect } from "react";

// The root error boundary. Production hides the real message, so the digest is
// the only thing that can be matched against the server logs — shown, not
// swallowed, because without it a bug report is unsearchable.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16">
        <p className="font-mono text-[0.75rem] text-fg-muted">500</p>
        <h1 className="mt-3 max-w-[24ch] text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance md:text-[2.5rem]">
          This page failed to load
        </h1>
        <p className="mt-4 max-w-[48ch] text-[0.9375rem] leading-relaxed text-fg-muted">
          The error was logged on the server. Trying again is worth one attempt — if it fails the
          same way, it is not transient.
        </p>
        {error.digest && (
          <p className="mt-4 font-mono text-[0.75rem] text-fg-muted">digest {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 items-center rounded bg-accent px-4 text-xs font-medium text-accent-fg"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded border border-line px-4 text-xs text-fg transition-colors hover:bg-raised"
          >
            Back to the site
          </Link>
        </div>
      </main>
    </div>
  );
}
