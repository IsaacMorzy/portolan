# Strategy — CodeRabbit-style AI PR reviewer on the Portolan MVP

## Outcome (one sentence)
A working AI PR reviewer that parses a PR's diff against the repository's dependency graph, flags/flags rule violations, and posts review comments — starting from the existing Portolan MVP (parser, Clerk orgs, Supabase RLS, OpenAI client with LangSmith, rate limiting) and adding only PR ingestion, diff analysis, and review posting.

## Why this scope (and what is deliberately out)
The MVP already does the hard part: it parses a repo into a node+edge graph with roles, packages, coverage, and unresolved-import reporting. A CodeRabbit replica is the MVP parser + a PR-review layer on top.

**Out of scope for now:** multi-repo SaaS, GitHub App marketplace listing, dashboard UI for rules, scheduled/repo-wide review, PR status checks, user seats/billing. Those are follow-on lanes, not this task.

## The map (GitHub #50) and its lanes
| # | Lane | Type | Order justification |
|---|------|------|---------------------|
| R1 | Diff analysis approach (in-house vs library) | research | Unblocked; cheap; decides a dependency question before any code |
| R2 | Review state schema + RLS policy | research | Unblocked; must exist before review state can be written |
| T1 | Manual API-triggered review of one PR diff | task | Depends on R1 + R2; first shippable slice |
| T2 | GitHub App webhook ingestion | task | Depends on T1; adds real-time trigger |
| T3 | In-repo rule config enforced | task | Depends on T1; adds the "reviewer" behavior |

**One lane at a time.** R1 is open first. R2 is next (independent of R1, so it can be worked in parallel only if a second agent is available — here, sequential).

## Execution loop per lane (AGENTS.md workflow)
For every lane, in order:

1. **Regenerate the prompt** — restate the lane's request as `prompts/NNNN-slug.md` (five parts: outcome, constraints, done-when, failure modes, scope) before any edit.
2. **Map check** — confirm the lane is unblocked (no open blocker, no assignee) and is first in map order.
3. **Build** — ponytail: stdlib → native → existing helper → one line → minimum that works. No new dependency without asking.
4. **Check** — `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` + `pnpm build`. Lane closes only when green.
5. **Report** — close the issue with a commit SHA + a one-line comment; append a context pointer to map #50's Decisions-so-far.

## Measurement rule
A lane is not started until the measurement that justifies it exists. For research lanes, the measurement is the decision itself recorded in the map comments. For implementation lanes, the measurement is the named check (e.g., "a PR diff produces AI comments via the API").

## Risk / failure modes named up front
- **Diff analysis pulls in a heavy library** → refused; parse `git diff` in-house unless a stdlib-native approach fails.
- **Review state bypasses RLS** → schema + RLS policy reviewed before any write path.
- **AI comments hallucinate dependencies** → LangSmith trace + ground every comment to a parsed edge; never guess an import.
- **Breaking sign-in/page render** → CSP changes (already done in #31) are the model: verify with e2e before claiming done.

## Definition of done (whole task)
All five lanes closed, each with a commit SHA cited in its issue comment, map #50's Decisions-so-far updated with pointers, and `pnpm gate` + `tsc` + `lint` + `build` green after every commit.
