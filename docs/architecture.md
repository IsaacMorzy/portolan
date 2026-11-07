# Architecture

One page, on purpose. Every pattern here has a name, the name is used in review,
and a change that does not fit one needs a sentence saying why. An agent picks
whatever architecture feels right in the moment; naming the plates is how a
generated change gets judged against something other than taste.

## The shape

```
URL ──> submit ──> analyses row ──> run (fetch → select → parse → store)
                                          │
                                          ├─> files, edges     (the map)
                                          ├─> ai_cache          (model answers)
                                          └─> coverage          (what was skipped)

page ──> auth() ──> organization ──> ONE gate ──> the four things above
```

## Named patterns

### The single gate

`readAnalysis(db, analysisId)` in `lib/analysis/load.ts` is the only way an
analysis reaches a caller. Pages, actions and routes all go through it; nothing
queries `analyses`, `files` or `edges` directly for display.

**Why a gate and not a filter.** The Supabase secret key bypasses row policies,
so a forgotten `.eq("organization_id", …)` in one of ~25 queries is one line
away from a cross-workspace read. A gate is one place to check, and its failure
is visible on the first read rather than the twenty-fifth.

**Consequence.** A new feature reads the graph through `readAnalysis` or it does
not read the graph.

### One guard per entry point

Authorization lives at the four doors into workspace data — dashboard, analysis
page, server action, API route — not sprinkled through the queries behind them.
Each door calls `auth()`, takes `orgId`, and refuses without it.

**Doors:** `app/(workspace)/dashboard/page.tsx`,
`app/(workspace)/analyses/[id]/page.tsx`, `app/(workspace)/actions.ts`,
`app/api/*/route.ts`.

### Scoped by row, not by request

Where there is no session — the refresh cron — the organization comes from the
row being processed, never from the request body. Nothing in a scheduled request
is trusted; the query is the authorization.

### The seam

Model calls take their dependencies as an argument, not an import:
`explainFile(input, { cache, source })`. `cache` is anything with `read`/`write`;
`source` is a thunk so a cache hit never fetches the file.

**Consequence.** The AI provider, the cache and the source of truth can each be
swapped without touching a call site. It is also why Puter.js was rejected: it
cannot run inside a server action, and the seam is the reason that mattered
immediately rather than three months later.

### Claim, then continue

A run claims its row (`claimAnalysis`) before doing any work, so two tabs cannot
double-run an analysis. `continueRun` owns everything after the claim, and any
failure marks the row failed with its reason in the stage it happened.

**Consequence.** There is no queue. A process that dies mid-run leaves a row
saying "running" until `isStale()` says otherwise.

### Anonymous answers what missing answers

An analysis belonging to another workspace returns exactly what a nonexistent
one returns — 404 in both cases. Any difference would let the endpoint be used
to enumerate what other people have analysed.

### Fail open for reads, closed for cost

The rate limiter is per-instance and therefore a speed bump. Where it matters is
anything that spends money — model calls and the GitHub token — and those are
opt-in and budgeted. A limiter store being down must not silently remove the
ceiling.

## The data

- `analyses` — one per repository per organization. Unique constraint, not a
  check-then-insert, so two tabs cannot create two. Constraints in the database:
  `(status='failed') = (error is not null)`, `(status='queued') = (stage is null)`,
  `(status='queued') = (started_at is null)`.
- `edges` — `source_file_id`/`target_file_id`, never paths. Paths are joined
  through `files.id`. A loader that skips that join hands an agent opaque ids.
- `ai_cache` — keyed on `sha256(task, PROMPT_VERSION, model, input-hash)`. The
  source is keyed by hash, not sent, so a whitespace change is a cache hit.

## Styling

Semantic tokens only: `canvas surface raised line fg fg-muted accent accent-fg
incoming outgoing kind-1..4`. No raw hex, no gradient, no emoji. `light-dark()`
carries both themes from one declaration, so a token cannot exist in one mode
and be missing in the other.

**Consequence.** Tailwind's default border colour is `currentColor`, which in
dark mode is near-white. `border` without `border-line` is a bug that only
appears in one theme, which is the worst kind.
