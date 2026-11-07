# 0013 — Re-research the name, and make the page say it with weight

## Categorised request

| Kind | Request | Verdict |
| --- | --- | --- |
| **Tooling** | "Give agent-reach all the tools it needs" | **build** — the package ships only `rss`/`youtube`; three taps added (`npm`, `github`, `hn`) |
| **Name** | Research the name again | **done** — six candidates measured; `portolan` survives, `rhumb`/`soundings`/`sextant` rejected as same-category collisions |
| **Rebrand** | GitHub and production | **partition** — repository renamed to `portolan` with the live URL as its homepage; the deploy slug stays, because all short nautical `*.vercel.app` names are taken and the Clerk proxy is bound to this one |
| **Design** | "The list should be a moving carousel", "wow" | **build** — the ticker was boxed inside the column; it is full-bleed now, two rows, opposite directions. `Value` was three identical SpotlightCards, which §8 bans, and is a datasheet with a mechanism column |

## Constraints

- Tokens only; §8's don'ts are binding, including "uniform card grids".
- Research claims must cite the registry/GitHub result that produced them.
- No second loop without a reason: the ticker is a demonstration of what the map records.

## Failure modes

- Renaming the repo and calling the product rebranded while every sentence still says the old name.
- Moving the deploy domain and breaking the sign-in path for a subdomain somebody else owns.
- "Wow" as more motion.

## Definition of done

- `pnpm gate` clean, tests green, screenshots judged.
- `docs/naming.md` carries the research table.
