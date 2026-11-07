/**
 * Two lists about the same ten tools: what this shares with the field, and where
 * it still loses.
 *
 * This section used to be a ten-row table of competitors with their published
 * prices. Ponytail's first rung applies: it does not need to exist. Prices move,
 * rivals rename themselves, and every row was a promise this repo cannot keep
 * accurate without somebody re-reading ten pricing pages each quarter. Worse, nine
 * of the ten rows were arguments in this product's favour — a comparison where one
 * side is always right is a brochure with a table around it.
 *
 * What survives is the part with information in it: the four things another tool
 * does better, stated flatly, with no pricing and no "closest competitor" badge.
 * A reader who needs one of these four should use that tool, and the page says so.
 *
 * The lists are data, not prose, because the section has to survive the product
 * moving. When a lane ships (#43 holds them), one entry changes and the row moves
 * from LOSSES to SHARED — the copy is not re-argued by hand. A comparison edited
 * by hand after each release is a comparison that will be wrong for a while.
 */

// Overlapping capability, with the mechanism that makes it true here. "Similar"
// without a mechanism is a word doing the work of a fact.
const SHARED = [
  {
    what: "A resolved import graph",
    how: "Madge, dependency-cruiser and Nx all resolve imports rather than guess them, and so does this: an edge exists only when a file exists and a parser read the import.",
  },
  {
    what: "Circular imports, named",
    how: "A cycle comes back as the list of files in it, in order, so you can open the first one rather than read a warning symbol.",
  },
  {
    what: "Free on public repositories",
    how: "No card and no trial for a public repo — the same terms Madge, GitDiagram and Emerge offer, because a map of public code is not the scarce thing.",
  },
  {
    what: "An output you can send to somebody",
    how: "A page with a URL you can paste in a review thread, the way these tools export a diagram or a CLI prints a graph.",
  },
];
const LOSSES = [
  {
    tool: "dependency-cruiser",
    better: "It can fail your CI on a rule. The product still has no rule enforcement — its map shows you the dependency and you decide. This repository has a runner of its own, scripts/deps-rules.ts, which is not the same as a feature.",
  },
  {
    tool: "Sourcegraph",
    better: "It searches across every repository you have. This one reads a single repository per analysis, so breadth is theirs.",
  },
  {
    tool: "CodeScene",
    better: "It reads git history and reports hotspots and code health. This product keeps no history, so it cannot tell you where the churn is.",
  },
  {
    tool: "repowise",
    better: "It indexes symbols and ownership and exposes an MCP server to agents. Here the graph is files and imports, for people reading a page.",
  },
];

export function Compare() {
  return (
    <section id="compare" className="scroll-mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-16">
          <h2 className="max-w-[24ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2rem]">
            What it shares with these tools, and where it still loses
          </h2>
          <p className="max-w-[46ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            Four claims the field already makes, and four things it does better. If one of the second list is what you
            need, that tool is the right answer — this page is not going to pretend otherwise.
          </p>
        </div>

        <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-[0.8125rem] font-medium tracking-wide text-fg-muted">Shared with the field</h3>
            <dl className="mt-4 border-t border-line">
              {SHARED.map((item) => (
                <div key={item.what} className="border-b border-line py-4">
                  <dt className="text-[0.9375rem] font-medium text-fg">{item.what}</dt>
                  <dd className="mt-1 max-w-[52ch] text-[0.875rem] leading-relaxed text-fg-muted">{item.how}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="text-[0.8125rem] font-medium tracking-wide text-fg-muted">Still theirs</h3>
            <dl className="mt-4 border-t border-line">
              {LOSSES.map((loss) => (
                <div key={loss.tool} className="border-b border-line py-4">
                  <dt className="text-[0.9375rem] font-medium text-fg">{loss.tool}</dt>
                  <dd className="mt-1 max-w-[52ch] text-[0.875rem] leading-relaxed text-fg-muted">{loss.better}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <p className="mt-8 max-w-[62ch] text-[0.875rem] leading-relaxed text-fg">
          What none of them do is the combination this page argues for: a graph resolved by a parser rather than inferred,
          an explanation that may only cite what the parse found, and a workspace boundary enforced before the query runs
          rather than after it.
        </p>
      </div>
    </section>
  );
}
