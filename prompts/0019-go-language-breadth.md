# 0046 — Go language breadth (issue #46, lane L3)

## Ask (verbatim)
"next step is #46 then update pi and pi hermes memeory" + "supports emost programming languages expand on this"

## Reading
Issue #46 (lane L3 of map #43): "Language breadth — beyond TS/JS/Python". Its check: "a Go or Java repository produces a map with resolved imports, or the UI says 'not yet' honestly." The lane offers two options: (a) one more resolved language with tests, or (b) an honest-refusal UI stating the supported-languages limit.

The user's follow-up ("supports most programming languages expand on this") chooses option (a): expand language support rather than refuse. Per ponytail (one line before fifty, don't build ahead, one commit per idea) and #46's own bar ("one more language with tests"), this commit adds exactly ONE more resolved language — Go — plus tests. "Most languages" is the vision; this single change is the first step toward it, not the whole staircase. Java and any further language are deliberate future steps, not part of this diff.

## Scope
**In:** Add Go (`.go`) as a parseable language alongside TS/JS/Python:
- `walk.ts` CODE_EXTENSIONS gains `.go`
- New `lib/parser/go.ts`: a Go import line scanner (modeled on `python.ts`) that extracts quoted import specifiers from `import "a/b"` and parenthesized import blocks, and a `resolveGo` that resolves relative (`./`) specifiers against the importing file's directory and bare module paths against repository nodes (`specifier.go`)
- `lib/parser/index.ts` wires Go into `parseSelection`: separate goCandidates (Go never reaches ts-morph), extract imports, resolve via resolveGo, add to the units list with the same coverage classification as Python
- Tests: a Go fixture repo and unit tests for scanning + resolution
**Out:** Adding Java or any other language; changing the UI; altering SCHEMA_VERSION (Go reuses existing EdgeKind/StatusCounts shapes); full Go semantics (build constraints, vendor, module graphs — deliberately honest limits, like Python's).

## Done when
- `pnpm gate` passes (secrets, guards, slop, design, bar, workflow)
- `npx tsc --noEmit` passes
- `npx eslint . --quiet` passes
- `pnpm build` passes
- New Go tests pass (`node --test tests/...`)
- A Go repository parses to internal edges for its own imports and external/package for out-of-repo imports

## Known unknowns
- Whether to name the language "go" in project adapter output — keep minimal, mirror Python (no new adapter concept unless one is needed).
