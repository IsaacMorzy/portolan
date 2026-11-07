# 0017 — A dependency rule that can fail CI, and a comparison that survives the product

## Categorised request

| Kind | Request | Result |
| --- | --- | --- |
| **Work** | Next step: #44, rule enforcement | runner + config + gate + measurement |
| **Content** | Comparison should show feature similarity, updated when features land | two data-driven lists |

## #44 — the rule runner

`lib/graph/rules.ts` already held `parseRules` / `checkRules` / `under`; the lane was
missing the half that makes a rule matter — something that exits non-zero.

- `scripts/deps-rules.ts` parses the repo with the product's own parser, loads
  `.deps-rules.json`, prints violations and exits 1.
- Refuses to pass on zero edges (`exit 2`): a gate that reports success when it
  parsed nothing is the failure mode this repo keeps finding.
- `.deps-rules.json`: three rules that hold today — `lib → app`, `lib →
  components`, `lib/parser → lib/supabase`.
- Wired into `scripts/gate.sh` (so CI, which runs the gate with `--full`, gets it),
  and `pnpm rules` for the terminal.

### The rule that was wrong

The first config included `components → app` ("a component that imports a route
action couples the page to the router"). It fired four times on idiomatic Next.js:
client components importing server actions is the sanctioned pattern. The rule was
wrong, not the code, so the rule was deleted rather than the code reshaped.

### The measurement

Seeded a forbidden edge (`components → lib/parser`): exit 1, five violations listed.
Removed it: exit 0, `3 rules hold across 300 resolved edges`.

## The comparison, as data

`compare.tsx` now holds `SHARED` (four overlapping capabilities, each with the
mechanism that makes it true here) and `LOSSES` (four that remain). The rule stated
in the file: when a lane ships, one entry moves between the lists — the copy is not
re-argued by hand.

The dependency-cruiser entry says what is true rather than what is flattering: the
product has no rule enforcement, this repository has a runner.

## What this does not do

- No rule UI, no rule storage, no product feature. #44 is closed as *this repo's
  gate*, and the Compare row says exactly that.
- No price column, no competitor badge — ponytail's earlier verdict stands.
