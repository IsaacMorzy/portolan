import Link from "next/link";
import { Marquee } from "@/components/velora/marquee";
import { CodeBlock } from "@/components/velora/code-block";

/**
 * The hero shows the transformation the product performs rather than a picture
 * of the product: a real module on the left, the dependency graph that module
 * produces on the right. Both are static markup, so the first screen paints
 * without shipping any JavaScript.
 */

const CODE = `import { db } from "./db/client";
import { session } from "./session";

export async function GET(req: Request) {
  const user = await session(req);
  if (!user) return new Response(null, { status: 401 });

  const rows = await db
    .select({ id: "id", name: "name" })
    .from("projects")
    .where(eq("owner_id", user.id));

  return Response.json(rows);
}`;

type Node = { id: string; x: number; y: number; label: string; kind: 1 | 2 | 3 | 4 };

const NODES: Node[] = [
  { id: "route", x: 24, y: 108, label: "route.ts", kind: 1 },
  { id: "session", x: 168, y: 40, label: "session.ts", kind: 2 },
  { id: "jwt", x: 300, y: 16, label: "jwt.ts", kind: 3 },
  { id: "db", x: 168, y: 168, label: "db/client.ts", kind: 2 },
  { id: "schema", x: 300, y: 144, label: "schema.ts", kind: 4 },
  { id: "auth", x: 300, y: 82, label: "auth.ts", kind: 3 },
];

const EDGES: [string, string][] = [
  ["route", "session"],
  ["route", "db"],
  ["session", "jwt"],
  ["session", "auth"],
  ["db", "schema"],
];

const W = 96;
const H = 26;

// What the map is made of, said plainly. The ticker shows the shape of the
// output before anyone signs up, not a strip of adjectives.
const TRACED = [
  "imports become edges",
  "route handlers marked",
  "every file given a role",
  "impact radius per module",
  "explanations read off the parsed tree",
  "unresolved imports counted, not hidden",
];

function center(n: Node) {
  return { cx: n.x + W / 2, cy: n.y + H / 2 };
}

export function Hero() {
  return (
    // overflow-x-clip is on this section, not on html: the ticker below is full-bleed
    // (100vw includes the scrollbar, so it runs ~7px past the page), and clipping at
    // the root would take the sticky header with it.
    <section className="mx-auto max-w-6xl overflow-x-clip px-6 pt-16 pb-14 md:pt-24">
      <div className="max-w-2xl">
        <h1 className="text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance md:text-[3.5rem]">
          See what your code depends on.
        </h1>
        <p className="mt-5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-fg-muted">
          Portolan reads a repository — TypeScript, JavaScript or Python — into a map of modules and the
          imports between them, then explains each with only the code it actually parsed.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/sign-up" className="flex h-8 items-center rounded bg-accent px-3.5 text-xs font-medium text-accent-fg">
            Map a repository
          </Link>
          <Link href="/sign-in" className="text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline">
            I already have an account
          </Link>
        </div>
      </div>

      <figure className="mt-14 overflow-hidden rounded border-line border-line bg-surface">
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 border-b border-line md:border-b-0 md:border-r">
            <CodeBlock
              code={CODE}
              language="ts"
              filename="app/api/projects/route.ts"
              lineNumbers
              highlightLines={[1, 2]}
              className="rounded-none border-0 [&_pre]:text-[0.6875rem] [&_pre]:leading-[1.65] [&_pre]:py-3"
            />
          </div>

          <div className="blueprint relative min-h-[260px] bg-canvas">
            <svg viewBox="0 0 400 230" className="absolute inset-0 size-full" role="img" aria-label="Dependency graph of the module on the left">
              {EDGES.map(([from, to]) => {
                const a = center(NODES.find((n) => n.id === from)!);
                const b = center(NODES.find((n) => n.id === to)!);
                const x1 = a.cx + W / 2 - 8;
                const y1 = a.cy;
                const x2 = b.cx - W / 2 - 2;
                const y2 = b.cy;
                const mx = (x1 + x2) / 2;
                return (
                  <g key={`${from}-${to}`}>
                    <path
                      d={`M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      className="flow-edge"
                      style={{ stroke: "var(--edge)", animationDelay: `${(x1 % 7) * 0.2}s` }}
                      strokeWidth="1.2"
                      fill="none"
                    />
                    {/* Drawn, not a marker: markers inherit stroke units and render
                        inconsistently at this scale. */}
                    <path d={`M${x2} ${y2} l-6 -2.6 v5.2 z`} style={{ fill: "var(--edge)" }} />
                    {/* One packet per edge, offset so they leave in sequence. This is
                        the product's claim drawn: an import leaves one module and
                        arrives at another. Motion stops under reduced-motion, so the
                        dashed edges alone still read as direction. */}
                    <circle r="1.9" className="packet">
                      <animateMotion
                        dur="4.2s"
                        begin={`${(x1 % 9) * 0.35}s`}
                        repeatCount="indefinite"
                        path={`M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      />
                    </circle>
                  </g>
                );
              })}

              {NODES.map((n) => (
                <g key={n.id}>
                  <rect
                    x={n.x}
                    y={n.y}
                    width={W}
                    height={H}
                    rx="4"
                    className="fill-raised stroke-line"
                    strokeWidth="1"
                  />
                  <rect
                    x={n.x}
                    y={n.y}
                    width="2.5"
                    height={H}
                    rx="1.25"
                    style={{ fill: `var(--kind-${n.kind})` }}
                  />
                  <text
                    x={n.x + 10}
                    y={n.y + H / 2}
                    dominantBaseline="central"
                    className="fill-fg font-mono text-[11px]"
                  >
                    {n.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
        <figcaption className="border-t border-line px-4 py-2.5 text-[0.6875rem] text-fg-muted">
          Six modules, five edges — every node resolved from an import that exists in the parsed tree.
        </figcaption>
      </figure>

      {/* Full-bleed, because a ticker boxed inside the column reads as a caption
          for the figure above it. Spanning the viewport makes it the dateline of
          the page: what the map records, before anyone signs up. Two rows moving
          opposite ways, so the strip has a direction rather than a drift. */}
      <div className="relative left-1/2 mt-10 w-screen -translate-x-1/2 border-y border-line bg-canvas py-2.5">
        <Marquee className="[--duration:52s] [--gap:0rem]" repeat={3}>
          {TRACED.map((item) => (
            <span
              key={item}
              className="whitespace-nowrap px-5 text-xs text-fg-muted after:ml-5 after:text-fg-muted/35 after:content-['/']"
            >
              {item}
            </span>
          ))}
        </Marquee>
        <Marquee reverse className="mt-2.5 border-t border-line/60 pt-2.5 [--duration:64s] [--gap:0rem]" repeat={3}>
          {TRACED.map((item) => (
            <span
              key={item}
              aria-hidden="true"
              className="whitespace-nowrap px-5 text-xs text-fg-muted/55 after:ml-5 after:text-fg-muted/20 after:content-['/']"
            >
              {item}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
