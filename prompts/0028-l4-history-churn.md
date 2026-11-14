# 0029 — L4 history: churn and hotspots per module (issue #47)

## Ask (verbatim)
Issue #47 (lane L4 of wayfinder map #43): "CodeScene wins on behavioural analysis because it reads git log. This product keeps no history, so it cannot say which module changes most. The rule for this lane is narrow: one number per module (changes in the last 90 days), dated and sourced, not a score. Check: a module node shows its change count with the window stated."

## Reading
Lane L4 is narrow: one number per module, changes in the last 90 days, dated and sourced. Not a score, not per-file, not full git log analysis. The existing `lib/graph/churn.ts` has `countChurn(repository, path)` which counts ALL commits for a file path via GitHub API (`commits?path=...&per_page=1` with `Link` header for total). This lane needs:
- Per-module rollup (not per-file)
- Last-90-days window (not all time)
- Display on module node with the window stated

The check: "a module node shows its change count with the window stated."

## Scope
**In:** Modify/extend churn infrastructure to count commits per module root in the last 90 days; display the number with window on module nodes; test the count function.
**Out:** Full git history view, per-file counts, scoring/ranking, displaying change count on file nodes (only module nodes), storing history in Supabase (product keeps no history per the issue).

## Done when
- Module node displays change count with "last 90 days" window stated
- Count function tested (unit test for totalCommits and/or countChurn with 90-day filter)
- `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` + `pnpm build` pass
- Issue #47 closed with commit SHA; map #43 updated

## Known unknowns
- How module roots are determined (lib/, src/lib/, packages/*/src/ — see issue #35 discussion about module roots)
- Where the change count is displayed on the module node (rail panel? node tooltip?)
- Whether the 90-day window uses commit date or author date
