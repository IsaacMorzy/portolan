import Link from "next/link";
import { Globe } from "@/components/velora/globe";
import { FileTree, type FileNode } from "@/components/velora/file-tree";
import { SpotlightCard } from "@/components/velora/spotlight-card";
import { CodeBlock } from "@/components/velora/code-block";

// The shape the map indexes, shown as the tree it actually is. Roles are what
// separate a map from a list of files, so the section names them.
const REPO_TREE: FileNode[] = [
  {
    name: "app",
    children: [
      { name: "api", children: [{ name: "projects/route.ts" }, { name: "auth/route.ts" }] },
      { name: "layout.tsx" },
      { name: "page.tsx" },
    ],
  },
  {
    name: "lib",
    children: [
      { name: "db", children: [{ name: "client.ts" }, { name: "schema.ts" }] },
      { name: "session.ts" },
      { name: "time.ts" },
    ],
  },
];

/**
 * Workflow. Three real stages, in order, so it is marked up as an ordered list
 * rather than numbered ornaments. Composition is deliberately not a card row:
 * the heading holds the left column while the list runs down the right.
 */
const STEPS = [
  {
    title: "Point it at a repository",
    body: "Paste a public GitHub URL. Cartograph clones the default branch at a pinned commit and reads it as a tree, not as text.",
  },
  {
    title: "The parser walks the imports",
    body: "ts-morph resolves every import to the file it names, including aliases and re-exports. Anything it cannot resolve is counted and shown, never guessed.",
  },
  {
    title: "The map is what was found",
    body: "Nodes are files and packages. Edges are imports that resolved. Select one to separate the modules that import it from the modules it imports.",
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 [&>*]:min-w-0 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16 md:py-28">
        <div>
          <h2 className="max-w-[18ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2rem]">
            From a URL to a map you can read
          </h2>
          <p className="mt-4 max-w-[42ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            One analysis, three stages. Each stage only reports what the stage before it produced, so
            a gap in the picture is always traceable to a gap in the parse.
          </p>
          <div className="mt-8 max-w-[38ch] border-t border-line pt-4">
            <p className="text-[0.875rem] leading-relaxed text-fg-muted">
              A file the parser can&apos;t resolve is never dropped quietly. It is counted, and the
              count is printed beside the map.
            </p>
          </div>

          {/* The four stages the run actually reports, in order, with the line
              each one logs. This column had nothing to look at before — a
              heading and two paragraphs beside a list — so the section read as
              the page's flattest stretch. It is the pipeline's own vocabulary,
              not a diagram invented for the marketing page. */}
          <div className="mt-8 min-w-0">
            <CodeBlock
              filename="cartograph run"
              language="bash"
              code={`$ cartograph analyze https://github.com/acme/web

fetch    archive at 7f2c1ab          4.1 MB
select   1,204 files, 812 sources
parse    3,916 imports, 41 unresolved
store    3,875 edges, 812 roles

done     analysis 9e01f4c2`}
            />
          </div>
        </div>

        {/* min-w-0 because a single-column grid sizes its track to the widest
            child's min-content: without it the code block below widens the
            whole page instead of scrolling inside itself. */}
        <ol className="min-w-0 divide-y divide-line border-t border-line md:border-t-0">
          {STEPS.map((s) => (
            <li key={s.title} className="py-6 first:pt-0">
              <h3 className="text-[0.9375rem] font-medium">{s.title}</h3>
              <p className="mt-1.5 max-w-[52ch] text-[0.875rem] leading-relaxed text-fg-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Blast radius. The figure is a real table because the data is tabular and the
 * value is in the counts and the direction, not in a drawing of them.
 */
const IMPACT = [
  { module: "lib/session.ts", direction: "incoming", count: 14 },
  { module: "app/api/projects/route.ts", direction: "incoming", count: 3 },
  { module: "lib/db/client.ts", direction: "outgoing", count: 6 },
  { module: "lib/db/schema.ts", direction: "outgoing", count: 2 },
];

export function MapSection() {
  return (
    <section id="map" className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:gap-16 md:py-28">
        <div className="order-2 md:order-1">
          <table className="w-full border-collapse text-left text-[0.8125rem]">
            <caption className="pb-3 text-left text-[0.75rem] text-fg-muted">
              Impact of changing <span className="font-mono text-fg">lib/auth.ts</span>
            </caption>
            <thead>
              <tr className="border-b border-line text-[0.6875rem] text-fg-muted">
                <th scope="col" className="py-2 pr-3 font-normal">Module</th>
                <th scope="col" className="py-2 pr-3 font-normal">Direction</th>
                <th scope="col" className="py-2 text-right font-normal">Edges</th>
              </tr>
            </thead>
            <tbody>
              {IMPACT.map((r) => (
                <tr key={r.module} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pr-3 font-mono text-[0.75rem] text-fg">{r.module}</td>
                  <td className="py-2.5 pr-3">
                    <span className="inline-flex items-center gap-1.5 text-fg-muted">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full"
                        style={{ background: r.direction === "incoming" ? "var(--incoming)" : "var(--outgoing)" }}
                      />
                      {r.direction}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 border-t border-line pt-4">
            <p className="mb-2 text-[0.75rem] text-fg-muted">
              Every file in the tree gets a role, so the map says what a module is for, not only what
              it links to.
            </p>
            <FileTree tree={REPO_TREE} className="text-[0.8125rem]" />
          </div>
        </div>

        <div className="order-1 md:order-2">
          <h2 className="max-w-[20ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2rem]">
            Change one file, see everything it touches
          </h2>
          <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            Every edge has a direction. Pick a module and Cartograph splits its neighbours into the
            ones that import it and the ones it imports, so a refactor starts from the real blast
            radius instead of a search box and a hunch.
          </p>
          <p className="mt-4 max-w-[46ch] text-[0.875rem] leading-relaxed text-fg-muted">
            The counts are edges, not files, so a module imported twice from two places reads as two.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Grounding. The differentiating claim is that the prose is anchored to lines
 * that exist. A quotation from the parser output carries that better than a
 * sentence asserting it.
 */
export function Grounding() {
  return (
    <section id="grounding" className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:gap-16 md:py-28">
        <div>
          <h2 className="max-w-[22ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2rem]">
            The explanation can only cite what the parser saw
          </h2>
          <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            A language model that has never opened your repository will describe it fluently and
            wrongly. So the model here never decides what exists. It is handed the parsed edges and
            asked to explain them, and a claim it cannot tie to a file is dropped rather than softened.
          </p>
          <p className="mt-4 max-w-[46ch] text-[0.875rem] leading-relaxed text-fg-muted">
            Where a file could not be parsed, the explanation says so and shows the count.
          </p>
        </div>

        <blockquote className="rounded border-line border-line bg-surface p-5">
          <p className="text-[0.9375rem] leading-relaxed">
            <span className="font-mono text-xs text-accent">route.ts</span> imports
            <span className="font-mono text-xs text-accent"> session.ts</span> to read the caller, then
            imports <span className="font-mono text-xs text-accent">db/client.ts</span> to load the
            projects owned by that caller. Two edges, both resolved on lines 1 and 2.
          </p>
          <footer className="mt-4 space-y-2 border-t border-line pt-3 text-[0.75rem] text-fg-muted">
            <p>
              Explanation of <span className="font-mono text-fg">app/api/projects/route.ts</span> —
              every module named here exists in the parsed tree.
            </p>
            <p className="flex flex-wrap gap-x-5 gap-y-1 tabular-nums">
              <span>2 of 2 edges cited</span>
              <span>0 unresolved imports</span>
            </p>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}

/**
 * Teams. A short statement and a plain list; the point is isolation, and that
 * survives being stated once.
 */
const TEAM_POINTS = [
  "Every organization gets its own workspace, and every read is scoped to it before the query leaves the server, with row policies in the database behind that. One workspace never sees another's files.",
  "Adding a teammate means inviting them to the workspace, not handing over a database password.",
];

export function Teams() {
  return (
    <section id="teams" className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-16 md:py-28">
        <h2 className="max-w-[16ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2rem]">
          One map your whole team can read
        </h2>
        <ul className="space-y-4">
          {TEAM_POINTS.map((p) => (
            <li key={p}>
              <SpotlightCard className="p-5 text-[0.9375rem] leading-relaxed text-fg-muted">{p}</SpotlightCard>
            </li>
          ))}
          <li className="max-w-[54ch] px-1 text-[0.875rem] text-fg-muted">
            Sign-in runs through Clerk, so one account covers every workspace you belong to.
          </li>
        </ul>
      </div>
    </section>
  );
}

export function Close({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-[minmax(0,1fr)_300px] md:py-32">
        <div>
          <h2 className="max-w-[24ch] text-[2rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance md:text-[2.5rem]">
            Find out what breaks before you change it
          </h2>
          <p className="mt-5 max-w-[44ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            Pick the module everyone is nervous about. Paste the repository. You get the map, and the
            list of what depends on it, in about a minute.
          </p>
          <div className="mt-8">
            <Link
              href={signedIn ? "/dashboard" : "/sign-up"}
              className="inline-flex h-8 items-center rounded bg-accent px-4 text-xs font-medium text-accent-fg"
            >
              {signedIn ? "Open dashboard" : "Map a repository"}
            </Link>
          </div>
        </div>

        {/* The product draws maps; this is one, in the smallest form that still
            reads as a map. Dots take the border-line colour so it stays quiet, and
            the arcs take the accent so there is one moving thing on the page. */}
        <div className="relative mx-auto aspect-square w-full max-w-[300px] opacity-80" aria-hidden="true">
          <Globe
            className="size-full"
            dotColor="var(--fg-muted)"
            accentColor="var(--accent)"
            samples={6000}
            speed={4}
            markers={[
              { lat: 51.5, lng: -0.1 },
              { lat: 40.7, lng: -74 },
              { lat: 52.5, lng: 13.4 },
              { lat: 35.7, lng: 139.7 },
            ]}
            arcs={[
              { from: [51.5, -0.1], to: [35.7, 139.7] },
              { from: [40.7, -74], to: [52.5, 13.4] },
              { from: [51.5, -0.1], to: [40.7, -74] },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
