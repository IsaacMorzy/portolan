# 0025 — T1: Manual API-triggered review of one PR diff

## Ask
Lane T1 of wayfinder map #50: implement a manual API endpoint that takes a PR diff, runs it against the parsed dependency graph + OpenAI, and posts AI review comments. Acceptance check: a PR diff produces AI comments via the API — demonstrated end to end.

## Reading
Depends on R1 (parse `git diff` in-house via Node stdlib) and R2 (reviews/review_comments tables in cloud Supabase). Existing patterns: API routes under `app/api/`, OpenAI client wrapped in one place (`lib/ai/client.ts`), traced with LangSmith, rate limiting via `lib/ratelimit.ts`, server-side Supabase client with `service_role` for writes. The parser (`lib/parser/index.ts`) parses a directory into files+edges.

## Scope
**In:** API route that accepts a repo + PR diff, parses the diff to find changed files, runs OpenAI over the diff + relevant graph context, writes review + comments to Supabase, returns review id. Depends on R1+R2.
**Out:** GitHub App webhook (T2), rule config (T3), UI, scheduling, multi-repo.

## Done when
- API route exists and responds to a manual request with AI review comments
- Review + comments written to cloud Supabase `reviews`/`review_comments`
- `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` + `pnpm build` pass
- Demo recorded as comment on #53; map #50 updated

## Known unknowns
- Exact request shape (repo owner/name + diff text vs PR number fetched from GitHub)
- Whether OpenAI is available/configured for this (check env)
