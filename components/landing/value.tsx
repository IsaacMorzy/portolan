/**
 * The value propositions as a datasheet, not as cards.
 *
 * This was three identical SpotlightCards. The design system bans exactly that
 * ("uniform card grids — six identical cards means six things that could have
 * been a list"), and the cards were also the reason the claims looked smaller
 * than they are: three boxes of equal weight say "features", while a table with
 * a mechanism column says "specification".
 *
 * Each row is a claim, the code that makes it true, and the number the claim
 * produces. The number is the part a competing page cannot copy.
 */
type Row = {
  claim: string;
  mechanism: string;
  fact: string;
};

const ROWS: readonly Row[] = [
  {
    claim: "The edges are resolved, not inferred",
    mechanism:
      "ts-morph resolves every specifier to the file it names — aliases, path maps and re-exports included. A specifier that cannot be resolved is counted and shown as a gap, never drawn as a guess.",
    fact: "0 invented edges",
  },
  {
    claim: "The explanation can only cite what was read",
    mechanism:
      "The model is given the parsed edges and asked to describe them. It never decides what exists; a sentence it cannot tie back to a file is dropped rather than softened into something plausible.",
    fact: "1 file behind every claim",
  },
  {
    claim: "Two workspaces cannot see each other",
    mechanism:
      "Every query is narrowed by organization before it leaves the server, and the database's row policies stand behind that filter rather than in place of it.",
    fact: "Scoped before the query runs",
  },
  {
    claim: "A map belongs to a commit, not to a branch",
    mechanism:
      "The archive is fetched at the sha that was resolved first, so the map describes the code that was parsed — not whatever HEAD had become by the time the download finished.",
    fact: "Pinned to a sha",
  },
];

export function Value() {
  return (
    <section className="border-t border-line bg-raised/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] md:gap-16 md:py-20">
        <div className="md:sticky md:top-16 md:self-start">
          <h2 className="max-w-[20ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance md:text-[2rem]">
            Most tools guess at your architecture. This one reads it.
          </h2>
          <p className="mt-4 max-w-[34ch] text-[0.875rem] leading-relaxed text-fg-muted">
            Four claims. Each one names the code under it, because a promise with no mechanism is how this category
            usually sells.
          </p>
        </div>

        <dl className="border-t border-line">
          {ROWS.map((row) => (
            <div
              key={row.claim}
              className="grid gap-2 border-b border-line py-5 md:grid-cols-[minmax(0,1fr)_11rem] md:items-baseline md:gap-8"
            >
              <div>
                <dt className="text-[0.9375rem] leading-snug font-medium text-fg">{row.claim}</dt>
                <dd className="mt-2 max-w-[58ch] text-[0.8125rem] leading-relaxed text-fg-muted">{row.mechanism}</dd>
              </div>
              <dd className="text-[0.75rem] text-fg-muted tabular-nums md:text-right">{row.fact}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
