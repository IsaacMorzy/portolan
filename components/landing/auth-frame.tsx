import Link from "next/link";
import { Mark } from "@/components/landing/mark";

/**
 * Sign-in and sign-up are the pages a returning person actually visits, and
 * they were a bare Clerk card on an empty canvas. They get the mark, a line
 * saying what they are signing into, and a way back — no second navigation
 * bar, because there is nothing else to navigate to yet.
 */
export function AuthFrame({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="mx-auto flex h-12 w-full max-w-6xl items-center px-6">
        <Link href="/" className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-tight">
          <Mark className="size-[1.125rem] text-accent" />
          Cartograph
        </Link>
        <Link
          href="/"
          className="ml-auto text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          Back to the site
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-6 py-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div>
          <h1 className="max-w-[18ch] text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.025em] text-balance md:text-[2.25rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-[40ch] text-[0.9375rem] leading-relaxed text-fg-muted">{body}</p>
          <p className="mt-6 border-t border-line pt-4 text-[0.75rem] text-fg-muted">
            Every read is scoped to the workspace you belong to, so a map you open is the map you own.
          </p>
        </div>

        <div className="flex justify-center md:justify-end">{children}</div>
      </main>
    </div>
  );
}
