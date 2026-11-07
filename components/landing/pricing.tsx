import Link from "next/link";

/**
 * Pricing, as a comparison table rather than three cards.
 *
 * Three identical cards force the reader to diff three paragraphs by eye; a table
 * puts the same fact on one row so the answer to "what do I lose by staying free"
 * is a glance. The pattern is Velora's pricing block, de-slopped: no "Most popular"
 * ribbon, no crossed-out price, no per-plan icon.
 *
 * Every row states something the product does today or says in build. A plan that
 * sells a feature the code does not have is a refund with a delay.
 */

type Status = "shipped" | "building";

type Row = { label: string; free: string; pro: string; team: string; status: Status };

const ROWS: readonly Row[] = [
  { label: "Public repositories", free: "Yes", pro: "Yes", team: "Yes", status: "shipped" },
  { label: "Private repositories", free: "No", pro: "Through the GitHub App", team: "Through the GitHub App", status: "shipped" },
  { label: "Analyses a month", free: "3", pro: "Unlimited", team: "Unlimited", status: "shipped" },
  { label: "Languages parsed", free: "TS, JS, Python", pro: "TS, JS, Python", team: "TS, JS, Python", status: "shipped" },
  { label: "The map, the categories, the explanations", free: "Yes", pro: "Yes", team: "Yes", status: "shipped" },
  { label: "Maps pinned to a commit", free: "Yes", pro: "Yes", team: "Yes", status: "shipped" },
  { label: "Workspaces", free: "1", pro: "1", team: "Unlimited", status: "shipped" },
  { label: "Members per workspace", free: "1", pro: "5", team: "Unlimited", status: "shipped" },
  { label: "Re-read when the branch moves", free: "Weekly", pro: "Daily", team: "Daily", status: "building" },
  { label: "Blast-radius drill-down and history", free: "—", pro: "Yes", team: "Yes", status: "building" },
  { label: "Single sign-on and an audit of who opened which map", free: "—", pro: "—", team: "Yes", status: "building" },
];

const PLANS = [
  { key: "free", name: "Free", price: "$0", note: "for one public repository", cta: { href: "/sign-up", label: "Start with a public repo" } },
  { key: "pro", name: "Pro", price: "$24", note: "per seat, per month", cta: { href: "/start", label: "Connect a private repo" } },
  { key: "team", name: "Team", price: "$59", note: "per seat, per month", cta: { href: "/security", label: "Read the boundary first" } },
] as const;

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="max-w-xl">
        <h2 className="text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.03em] md:text-[2rem]">
          Priced per person, because a map is read by people.
        </h2>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-pretty text-fg-muted">
          An analysis costs us a download and a parse, not a model call per file. That is why public repositories are free
          and private ones are the paid part: the private path is the one that needs a GitHub App installation, a token
          minted per workspace, and somebody to keep it rotated.
        </p>
      </div>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <caption className="sr-only">Plans and what each one includes</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-[34%] px-2 py-3 text-[0.75rem] font-medium text-fg-muted">
                What you get
              </th>
              {PLANS.map((plan) => (
                <th key={plan.key} scope="col" className="px-2 py-3 align-bottom">
                  <span className="block text-[0.8125rem] font-medium text-fg">{plan.name}</span>
                  <span className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[1.25rem] leading-none font-semibold tracking-[-0.03em] text-fg">{plan.price}</span>
                    <span className="text-[0.6875rem] text-fg-muted">{plan.note}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-line/60 last:border-b-0">
                <th scope="row" className="px-2 py-2 text-[0.8125rem] font-normal text-fg">
                  {row.label}
                  {row.status === "building" && (
                    <span className="ml-2 inline-block whitespace-nowrap text-[0.6875rem] text-fg-muted">
                    {/* nowrap: a two-word status that breaks after "in" reads as a
                        typo in a table where every other cell is one line. */}
                    in build
                  </span>
                  )}
                </th>
                <td className="px-2 py-2 text-[0.8125rem] text-fg-muted">{row.free}</td>
                <td className="px-2 py-2 text-[0.8125rem] text-fg-muted">{row.pro}</td>
                <td className="px-2 py-2 text-[0.8125rem] text-fg-muted">{row.team}</td>
              </tr>
            ))}
            <tr>
              <td />
              {PLANS.map((plan) => (
                <td key={plan.key} className="px-2 pt-5">
                  <Link
                    href={plan.cta.href}
                    className={
                      plan.key === "pro"
                        ? "flex h-8 items-center justify-center rounded bg-accent px-3 text-xs font-medium text-accent-fg"
                        : "flex h-8 items-center justify-center rounded ring-1 ring-line px-3 text-xs text-fg transition-colors hover:bg-raised"
                    }
                  >
                    {plan.cta.label}
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* The honest line. A price on a page with no billing behind it is either a
          placeholder or a lie; this says which. */}
      <p className="mt-6 max-w-2xl text-[0.75rem] leading-relaxed text-fg-muted">
        Billing is not switched on. Everything above is free during early access — the prices are what these plans will
        cost, not what you are being charged today. Rows marked <span className="text-fg">in build</span> are written down
        because they are the reason to pay later, and they will not be sold before they exist.
      </p>
    </section>
  );
}
