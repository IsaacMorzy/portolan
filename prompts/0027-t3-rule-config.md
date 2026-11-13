# 0027 — T3: In-repo rule config enforced

## Ask
Lane T3 of wayfinder map #50: implement an in-repo rule config whose violations are flagged/blocked in a review. Acceptance check: a rule violation blocks or flags in a review output.

## Reading
Depends on T2 (webhook + reviewAnalysis core, closed #54). Existing patterns: `lib/graph/rules.ts` already has `checkRules`, `parseRules`, `under` for dependency rules. The `github_apps` table stores per-organization App config — a parallel pattern could store rule config, or a `.portolan/rules.yaml`-style file in the repo being reviewed. The review layer writes to `reviews`/`review_comments` tables in Supabase.

## Scope
**In:** Rule config format + loader, rule-checking integration into reviewAnalysis (flag violations as comments), rejection/block behavior for severe violations.
**Out:** Dashboard UI for editing rules, GitHub App marketplace listing, scheduled repo-wide review.

## Done when
- Rule config exists and is loadable
- reviewAnalysis flags rule violations as review comments (or blocks)
- `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` + `pnpm build` pass
- Demo noted as comment on #55; map #50 updated; all lanes closed

## Known unknowns
- Config location: in-repo `.portolan/rules.yaml` vs Supabase-stored per-org config
- Rule format: dependency rules (existing `lib/graph/rules.ts`) vs new rule type
