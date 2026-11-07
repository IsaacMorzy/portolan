# scripts/e2e

Browser checks, one file per task. Each runs with no arguments and exits
non-zero on failure, so any of them can be put in CI as-is.

| Script | Task |
| --- | --- |
| `landing.mjs` | Every public page renders at 1440 and 390, with no sideways scroll and no page error |
| `api-graph.mjs` | `/api/graph` is not open to an anonymous caller |
| `api-churn.mjs` | `/api/churn` is not open to an anonymous caller either |
| `sign-in.mjs` | A Clerk ticket signs in and lands in the workspace (deployed host only) |
| `screenshots.mjs` | Writes light, dark and mobile shots to `.scratch/shots` for a human look |
| `harness.mjs` | Shared launch, open, check and report helpers — not run directly |

```
pnpm e2e                                    # landing + both API guards
pnpm e2e:sign-in                            # needs .env.local and the deployed host
pnpm e2e:shots http://localhost:3100 /      # screenshots
```

`playwright-core` is deliberately **not** a dependency of this app: the harness
resolves it from `PW_ROOT` (default `/tmp/pw/node_modules`) and says so plainly
when it is missing. A browser driver does not belong in a production
dependency tree to take screenshots.
