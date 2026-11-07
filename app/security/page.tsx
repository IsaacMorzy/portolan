import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { FooterColumns } from "@/components/velora/footer-columns";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "How reads are scoped — Cartograph",
  description:
    "What Cartograph reads from a repository, where the AI runs, and how every query is narrowed to your organization before it leaves the server.",
};

// The four doors into workspace data. Named individually because a security
// page that says "we scope everything" is a slogan; the list is checkable.
const DOORS = [
  { door: "Dashboard", file: "app/(workspace)/dashboard/page.tsx", scopes: "analyses by organization_id" },
  { door: "Analysis page", file: "app/(workspace)/analyses/[id]/page.tsx", scopes: "analysis, files and edges by organization_id" },
  { door: "Re-run action", file: "app/(workspace)/actions.ts", scopes: "refuses without an active organization" },
  { door: "Explain / classify", file: "app/(workspace)/analyses/[id]/actions.ts", scopes: "one readAnalysis gate, then ai_cache by organization" },
  { door: "Progress poll", file: "app/api/progress/[id]/route.ts", scopes: "401 without an organization, 404 for another's row" },
];

export default async function SecurityPage() {
  const [{ userId }, jar] = await Promise.all([auth(), cookies()]);
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <Nav theme={theme} signedIn={Boolean(userId)} />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="max-w-[24ch] text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance md:text-[2.5rem]">
            What this reads, and who can read it back
          </h1>
          <p className="mt-5 max-w-[54ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            A security page is worth reading only if it names the specific thing that stops one
            workspace seeing another. This one does, and each claim below is a file you could open.
          </p>

          <section className="mt-14 border-t border-line pt-8">
            <h2 className="text-[1.0625rem] font-medium">Reads are scoped, not filtered afterwards</h2>
            <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-fg-muted">
              Every query that returns workspace data is narrowed by <code className="font-mono text-[0.8125rem] text-fg">organization_id</code>{" "}
              before it runs. There are five entry points into that data and each carries its own
              guard, so a route added later fails closed rather than falling through to the whole
              table.
            </p>
            <ul className="mt-6 grid gap-3">
              {DOORS.map((d) => (
                <li key={d.door} className="grid gap-1 border-t border-line pt-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                  <span className="text-[0.8125rem] font-medium text-fg">{d.door}</span>
                  <span className="text-[0.8125rem] leading-relaxed text-fg-muted">
                    {d.scopes}
                    <span className="mt-1 block font-mono text-[0.6875rem] text-fg-muted/70">{d.file}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12 border-t border-line pt-8">
            <h2 className="text-[1.0625rem] font-medium">Why the database policies are the second line, not the first</h2>
            <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-fg-muted">
              Row-level security is on, and its policies remain in the migrations. But Supabase signs
              its tokens with an asymmetric key whose private half is not exportable, so this
              application cannot mint a token that PostgREST will accept on a user&apos;s behalf. Rather
              than pretend otherwise, reads are performed server-side with a service key that never
              reaches the browser, and the policies stand behind them as a second boundary.
            </p>
          </section>

          <section className="mt-12 border-t border-line pt-8">
            <h2 className="text-[1.0625rem] font-medium">What a repository leaves behind</h2>
            <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-fg-muted">
              A public default branch is fetched as an archive and pinned to the commit it came from.
              No personal token is requested or stored, so nothing here can act on your account at
              GitHub. What is kept is the parsed result — file paths, resolved edges, counts — plus
              the explanations generated from them, cached against the prompt version and model that
              produced them.
            </p>
          </section>

          <section className="mt-12 border-t border-line pt-8">
            <h2 className="text-[1.0625rem] font-medium">Where the model sits</h2>
            <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-fg-muted">
              Server-side only. The model is given parsed edges and asked to explain them; it is
              never given a database credential and never decides what exists in your repository. A
              claim it cannot tie to a file the parser read is dropped.
            </p>
          </section>

          <p className="mt-12 border-t border-line pt-6 text-[0.8125rem] text-fg-muted">
            Something here that reads wrong?{" "}
            <Link href="/#questions" className="text-fg underline-offset-4 hover:underline">
              The questions section
            </Link>{" "}
            covers the same ground in shorter form.
          </p>
        </div>
      </main>
      <FooterColumns />
    </div>
  );
}
