# 0012 — Portolan, a price that states its status, and every language we read

## Categorised request

| Kind | Request | Verdict |
| --- | --- | --- |
| **Brand** | Research a marketable name for developers, replacing Cartograph | **build** — `portolan`: 156 GitHub repos / one stale npm package against 10,670 for the runner-up |
| **Positioning** | A SaaS with pricing "like the other platforms" | **build** — a comparison table, not three identical cards |
| **Truth** | The product parses more than TypeScript | **build** — Python is parsed in `lib/parser/python.ts` and every sentence said otherwise |
| **Motion** | Improve the hero with animation | **build** — a packet per edge, demonstrating an import resolving |
| **Failed tasks** | G1 wiring, the clipped attribution, the false OAuth claim, the `(workspace)` ellipsis | **build / close / correct** |

## Outcome

The public surface says Portolan, states three languages, prices three plans with
each unbuilt row labelled, and the hero's map moves in a way that means something.

## Constraints

- Tokens only; `scripts/check/design.mjs` is the arbiter, not taste.
- A vendored block brings structure, never a palette.
- No price on a feature that does not exist — `in build` in the row, and billing
  declared off.

## Failure modes

- A rebrand that leaves one surface saying the old name.
- A pricing table that sells the roadmap as if it shipped.
- Motion added because the section felt static.

## Definition of done

- `pnpm gate` and `pnpm test` clean; screenshots in `img/`, judged.
