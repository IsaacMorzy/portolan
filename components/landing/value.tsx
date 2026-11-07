import { SpotlightCard } from "@/components/velora/spotlight-card";

/**
 * The value propositions, stated as claims with a mechanism behind each one.
 * A promise with no mechanism under it is the thing this page exists to avoid,
 * so every line below names the code that makes it true.
 */
const CLAIMS = [
  {
    claim: "The edges are resolved, not inferred",
    mechanism:
      "ts-morph resolves every specifier to the file it names, aliases and re-exports included. An import that cannot be resolved is counted and shown, never drawn as a guess.",
    fact: "0 invented edges",
  },
  {
    claim: "The explanation can only cite what was read",
    mechanism:
      "The model receives the parsed edges and is asked to explain them. It never decides what exists, and a claim it cannot tie to a file is dropped rather than softened.",
    fact: "Every claim cites a file",
  },
  {
    claim: "One workspace cannot see another",
    mechanism:
      "Every read is narrowed by organization before it leaves the server, with the row policies still standing behind it in the database.",
    fact: "Scoped server-side",
  },
];

export function Value() {
  return (
    <section className="border-t border-line bg-raised/40">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="max-w-[46ch] text-[1.25rem] leading-[1.25] font-semibold tracking-[-0.02em] text-balance md:text-[1.625rem]">
          Most tools guess at your architecture. This one reads it.
        </h2>

        <ul className="mt-10 grid items-stretch gap-4 md:grid-cols-3 md:gap-6">
          {CLAIMS.map((c) => (
            <li key={c.claim} className="h-full">
              {/* Velora's spotlight follows the cursor and is the only motion on
                  the page that responds to a person rather than to time. */}
              <SpotlightCard className="h-full p-5">
                <p className="font-mono text-[0.6875rem] tracking-wide text-accent uppercase">{c.fact}</p>
                <h3 className="mt-2 text-[0.9375rem] font-medium">{c.claim}</h3>
                <p className="mt-2 max-w-[44ch] text-[0.8125rem] leading-relaxed text-fg-muted">{c.mechanism}</p>
              </SpotlightCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
