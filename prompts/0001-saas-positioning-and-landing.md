# 0001 — SaaS positioning, competitor check, and the landing page that states the value

## Ask

> position it as a saas, check similar products like 10 of them, then name
> feature gaps that need building and write them in specs. also install prompt
> writing skill and whenever the user invokes a prompt run it through the skill,
> improve the vanilla prompt, write in prompts folder then execute it. always do
> this with the help of matpocock workflow that is map the task to matpocock and
> ponytail and add more velora blocks, they are ~30 almost in each section. the
> site should look wow as a saas product and show the USP and value propositions
> stated clearly on the landing page.

## Reading

Three asks stacked into one: a market check, a process change, and a visual
change. They are separated here because only the first and third change the
product.

- "position it as a SaaS" means the public page has to answer, above the fold
  and again in a section of its own, *what this is, who it is for, why it is not
  the thing you already use*. Not a tagline.
- "check 10 similar products" means named tools, what each actually draws, and
  the honest column where we lose. A comparison that flatters us is worth
  nothing to the reader it is for.
- "feature gaps … write them in specs" means gaps get written before they get
  built, each with an acceptance check, and none get built in this pass.
- "prompt writing skill" is a process rule, so it lands in `prompts/README.md`
  and in `CLAUDE.md`, not in `package.json`. Nothing is installed.
- "~30 velora blocks per section" is a quantity that collides with a rule that
  already exists in this repo. Executed as: every registry item is re-checked,
  the ones that survive the house style are added, and the rest are named with
  the reason they were refused. Volume for its own sake is the thing the noise
  filter in `CLAUDE.md` already forbids.

## Scope

**In**

- `prompts/` convention, wired into `CLAUDE.md` as the first step of any task.
- `docs/specs/11-saas-positioning.md`: ten named competitors, the positioning
  statement, and one spec per feature gap.
- Landing page: a value-proposition band and a comparison section. Both built
  from site tokens, both stating things that are true of the code that exists.
- The Velora review, refreshed, with what was taken and what was refused.

**Out**

- Building any of the feature gaps. They are specs, not work.
- Inventing pricing, logos, testimonials or customer counts. There are none.
- A pricing page. There is no price.

## Done when

- `/` states the USP without scrolling on a 1440×900 screen, and again as its
  own section with three claims that each point at the code that makes it true.
- The comparison table names ten real tools with real published pricing as of
  October 2026, and includes at least two rows where this product is not the
  answer.
- `docs/specs/11-saas-positioning.md` contains a gap spec with an acceptance
  check for each gap it names.
- `pnpm test`, `tsc --noEmit`, `eslint .` and `pnpm build` pass.
- 1440 light, 1440 dark and 390 screenshots show no overflow and no console
  errors.

## Known unknowns

- Whether the product charges per repository or per seat. Both appear in
  competitor pricing, and neither is decided here.
- Whether the next phase is private repositories or pull-request impact. The
  specs rank both; the choice is the owner's.
