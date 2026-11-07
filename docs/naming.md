# The name: what was researched, and what survived

Run through `agent-reach` (channels installed for this: `npm`, `github`, `hn`),
which answers the only two questions that matter before a rename — *is the npm name
already a thing* and *is there a project in this category wearing it*.

## Candidates

| Name | npm | GitHub | Same category? | Verdict |
| --- | --- | --- | --- | --- |
| `portolan` | `portolan@0.1.0`, "a format for describing UI flows so one context can resolve them" | `portolan-sdi/portolan-cli`, 43★, updated this month — cloud-native geospatial CLI | adjacent (agent UI flows) | **kept** — collision is in geospatial data and agent flows, not dependency graphs |
| `rhumb` | `rhumb@0.0.1`, "agent-native tool intelligence. Discover, score, and access developer tools" | 109 repos, nothing above 78★ | **yes** — AI-developer tooling | rejected |
| `soundings` | `soundings@0.0.2`, "package-adoption dashboard for people who ship developer tools" | 90 repos | **yes** — developer-tool analytics | rejected |
| `sextant` | `sextant@0.4.0`, "chart application flows, then implement them in code" | 554 repos | **yes** — same author family as `portolan`'s npm package | rejected |
| `chartwright` | exists | 13 repos — lowest collision of any candidate | unclear | rejected: `chartwright.vercel.app` already serves a project of that name |
| `loxodrome` | `loxodrome-sdk` (crypto) | crypto contracts | no | rejected: reads as a crypto project |

Also checked, for the deploy host: `portolan.vercel.app` (a route planner),
`rhumb.vercel.app` (the tool-discovery product), `soundings.vercel.app` (a route
planner). Every short nautical word is occupied on `*.vercel.app`, so a rename
would not have produced a clean domain either — it would have broken the Clerk
proxy on `codegraph-navy.vercel.app` to land on a subdomain somebody else owns.

## Why the product is called Portolan

A portolan chart is the medieval chart that plots **routes between ports**. Modules
are ports; resolved imports are the routes; an unresolved import is a route that
could not be charted, which this product shows instead of guessing. The name says
what the map is, which is the test a product name has to pass.

## What this research changed

The first pass said "one stale npm package". That was wrong: `portolan` on npm was
published in 2026 as an *agent UI-flow format*, and there is an active geospatial
CLI wearing the name. The name survives anyway, because both are different
categories — but the claim is now the researched one, not the lucky one.

The remaining option, if the name ever has to move: coin a compound rather than
take another word from the chart metaphor. Every short one is gone.
