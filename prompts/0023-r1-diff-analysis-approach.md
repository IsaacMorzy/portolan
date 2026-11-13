# 0023 — R1: Diff analysis approach decision

## Ask
Lane R1 of wayfinder map #50: decide how the CodeRabbit replica analyzes a PR diff — parse `git diff` in-house (stdlib/native) vs. pull in a diff library. Record the decision as a comment on issue #51.

## Reading
The MVP parses repos into node/edge graphs but has no diff-analysis capability. A PR reviewer must read a `git diff` to know which files changed and how. The constraint "no new dependency without asking" plus ponytail (stdlib → native → existing helper → one line) favor an in-house parse unless stdlib genuinely cannot do it.

## Scope
**In:** Research `git diff` format, survey what Node stdlib offers (child_process `git diff`, fs), evaluate whether an in-house parse suffices for the reviewer's needs (changed files + added/removed lines), document the decision.
**Out:** Writing any diff parser code, installing a dependency, building T1/T2/T3.

## Done when
- A one-paragraph decision posted as a comment on GitHub issue #51 naming the approach and why.
- Map #50's Decisions-so-far updated with a pointer to #51's decision comment.
- No new dependency added to package.json.

## Known unknowns
- Whether the reviewer needs hunk-level granularity or just file-level (affects parse complexity).
