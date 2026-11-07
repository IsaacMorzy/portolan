/**
 * The comparison, kept honest. Ten tools, what each actually does, and the
 * column where this one loses — a table with no losing row is a brochure, and
 * the reader this is for has already used two of these.
 *
 * Prices are the vendors' published figures as of October 2026.
 */
const ROWS = [
  {
    tool: "Madge",
    does: "JS/TS module graph and circular imports, Graphviz output",
    price: "Free, MIT",
    differs: "No explanations, no host, CLI only",
    loses: false,
  },
  {
    tool: "dependency-cruiser",
    does: "Graph plus rules you can fail CI on",
    price: "Free, MIT",
    differs: "We have no rule enforcement — they win",
    loses: true,
  },
  {
    tool: "Nx",
    does: "Project graph for monorepos, affected tasks and caching",
    price: "Free, MIT",
    differs: "We draw files, not packages; no task runner",
    loses: false,
  },
  {
    tool: "Sourcegraph",
    does: "Code search and navigation across repositories",
    price: "Enterprise, from ~$16K/yr",
    differs: "One repository at a time here — they win on breadth",
    loses: true,
  },
  {
    tool: "CodeScene",
    does: "Hotspots, code health, team and knowledge maps",
    price: "From €18/author/mo",
    differs: "We keep no git history — they win on behavioural analysis",
    loses: true,
  },
  {
    tool: "GitDiagram",
    does: "An LLM reads the tree and writes a Mermaid diagram",
    price: "Free, MIT",
    differs: "Their diagram is inferred; ours is resolved by a parser",
    loses: false,
  },
  {
    tool: "Emerge",
    does: "Interactive dependency maps across 13 languages",
    price: "Free, MIT",
    differs: "We host it and explain it; they cover more languages",
    loses: false,
  },
  {
    tool: "repowise",
    does: "Parsed file and symbol graph, ownership, churn, MCP for agents",
    price: "Free for 2 public repos, Pro $15/mo",
    differs: "Closest competitor: they win on breadth and history",
    loses: true,
  },
  {
    tool: "RepoGrasp",
    does: "Answers behaviour questions with file:line citations",
    price: "Demo live, connections in development",
    differs: "Adjacent: they explain a path on demand, we map first",
    loses: false,
  },
  {
    tool: "CodeSee",
    does: "Codebase maps and onboarding tours",
    price: "Sunset after the GitKraken acquisition, May 2024",
    differs: "A hole nobody has filled: guided tours are gone",
    loses: false,
  },
];

export function Compare() {
  return (
    <section id="compare" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-16">
          <h2 className="max-w-[22ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2rem]">
            Ten tools that draw something close, and where this one still loses
          </h2>
          <p className="max-w-[46ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            Four rows below are losses, written down on purpose. If one of them is the thing you
            need, that tool is the right answer and the link in the footer is still here.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.6875rem] text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: "var(--incoming)" }} />
            a difference in this product&apos;s favour
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: "var(--outgoing)" }} />
            a difference in the other tool&apos;s favour
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left text-[0.875rem]">
            <caption className="sr-only">Comparison with ten dependency-mapping tools</caption>
            <thead>
              <tr className="border-b border-line text-[0.6875rem] text-fg-muted">
                <th scope="col" className="py-2 pr-4 font-normal">Tool</th>
                <th scope="col" className="py-2 pr-4 font-normal">What it does</th>
                <th scope="col" className="py-2 pr-4 font-normal">Price</th>
                <th scope="col" className="py-2 font-normal">Where this differs</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.tool} className="border-b border-line/60 last:border-0 align-top">
                  <th scope="row" className="py-3 pr-4 text-left font-medium text-fg">{r.tool}</th>
                  <td className="py-3 pr-4 text-fg-muted">{r.does}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-fg-muted tabular-nums">{r.price}</td>
                  <td className="py-3 text-fg">
                    <span className="flex gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-1.5 shrink-0 rounded-full"
                        style={{ background: r.loses ? "var(--outgoing)" : "var(--incoming)" }}
                      />
                      <span>{r.differs}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-[64ch] text-[0.75rem] leading-relaxed text-fg-muted">
          What none of them do is the combination this page argues for: a parsed graph, an
          explanation that may only cite what the parse found, and a workspace boundary enforced
          before the query runs rather than after.
        </p>
      </div>
    </section>
  );
}
