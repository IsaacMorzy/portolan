/**
 * Where this tool loses.
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
 */
const LOSSES = [
  {
    tool: "dependency-cruiser",
    better: "It can fail your CI on a rule. This product has no rule enforcement at all — it shows you the dependency, and you decide.",
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
          <h2 className="max-w-[20ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2rem]">
            Four things other tools do better
          </h2>
          <p className="max-w-[46ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            Written down on purpose. If one of these is what you need, that tool is the right answer — this page is not
            going to pretend otherwise.
          </p>
        </div>

        <dl className="mt-10 border-t border-line">
          {LOSSES.map((loss) => (
            <div
              key={loss.tool}
              className="grid gap-2 border-b border-line py-5 md:grid-cols-[11rem_minmax(0,1fr)] md:items-baseline md:gap-8"
            >
              <dt className="text-[0.875rem] font-medium text-fg">{loss.tool}</dt>
              <dd className="max-w-[62ch] text-[0.875rem] leading-relaxed text-fg-muted">{loss.better}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 max-w-[62ch] text-[0.875rem] leading-relaxed text-fg">
          What none of them do is the combination this page argues for: a graph resolved by a parser rather than inferred,
          an explanation that may only cite what the parse found, and a workspace boundary enforced before the query runs
          rather than after it.
        </p>
      </div>
    </section>
  );
}
