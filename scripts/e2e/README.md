# scripts/e2e

Browser checks, one file per task. Each runs with no arguments and exits
non-zero on failure, so any of them can be put in CI as-is.

| Script | Task |
| --- | --- |
| `landing.mjs` | Every public page renders at 1440 and 390, with no sideways scroll and no page error |
| `budget.mjs` | CLS, DOM size, heading structure, canonical, social card, JSON-LD — fails with the measured number |
| `api-graph.mjs` | `/api/graph` is not open to an anonymous caller |
| `api-churn.mjs` | `/api/churn` is not open to an anonymous caller either |
| `sign-in.mjs` | A Clerk ticket signs in and lands in the workspace (deployed host only) |
| `screenshots.mjs` | Writes light, dark and mobile shots to `.scratch/shots` for a human look |
| `harness.mjs` | Shared launch, open, check and report helpers — not run directly |

```
pnpm e2e                                    # landing + budget + both API guards
pnpm e2e:sign-in                            # needs .env.local and the deployed host
pnpm e2e:shots http://localhost:3100 /      # screenshots
```

`playwright-core` is deliberately **not** a dependency of this app: the harness
resolves it from `PW_ROOT` (default `/tmp/pw/node_modules`) and says so plainly
when it is missing. A browser driver does not belong in a production
dependency tree to take screenshots.

## The rest

| Script | Question it answers |
|---|---|
| `audit.mjs` | Does every page answer honestly — real 404s, one `h1`, named controls, no sideways scroll, a description a search result could show? |
| `measure.mjs` | What type sizes does this page actually render, and how much air does each section carry? Prints numbers; decides nothing. |
| `oauth.mjs` | Can this browser complete an MCP OAuth consent page? Says BLOCKED when a bot check refuses it. |

`audit.mjs` and `measure.mjs` both read from the browser on purpose: Tailwind
resolves `rem` against a page font-size the source never mentions, and section
padding is set on inner wrappers, so a grep reports `0px` for every section.

```
pnpm e2e            # landing + audit + budget + both API guards
pnpm e2e:measure    # the numbers behind the budget
node scripts/e2e/measure.mjs localhost /,/security
```
