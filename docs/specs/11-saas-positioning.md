# Phase 11 — SaaS positioning and the gaps that decide it

**Goal.** Know what this is, who it is up against, and which missing features
stand between the current build and someone paying for it. Nothing here is
built in this phase; each gap gets a spec, and the phase exists so the next one
has a reason.

## Positioning

> **Cartograph maps a TypeScript repository from what the parser resolved, then
> explains it without inventing anything.** Paste a public URL, get the module
> graph and the blast radius of any file, and read an explanation whose every
> claim points at a file that exists.

Three sentences, each of which a competitor cannot say as a whole:

- **Parsed, not inferred.** The edge exists because `ts-morph` resolved a
  specifier to a file. Unresolved imports are counted and shown.
- **Grounded explanations.** The model is given parsed edges and asked to
  explain them. A claim it cannot tie to a file is dropped, not softened.
- **Scoped per organization.** Access is a server-side filter on every read,
  not a client-side convenience.

## The field, October 2026

| Tool | What it actually does | Pricing | Where it wins | Where we differ |
| --- | --- | --- | --- | --- |
| **Madge** | JS/TS module graph, circular imports, Graphviz output | Free, MIT | Fastest way to a cycle list in one project | No explanations, no host, no org, CLI only |
| **dependency-cruiser** | Graph plus rules you can fail CI on, DOT/Mermaid/D2/HTML | Free, MIT | Architecture boundaries enforced in CI | We have no rule enforcement at all — they win |
| **Nx** | Project graph for monorepos, affected tasks and caching | Free, MIT | Build order across packages | We draw files, not packages; no task runner |
| **Sourcegraph** | Code search and navigation across repos | Enterprise, from ~$16K/yr | Search at organisation scale | We are one repo at a time; they win on breadth |
| **CodeScene** | Hotspots, code health, team and knowledge maps | From €18/author/mo | Behavioural analysis of git history | We have no history at all — they win |
| **GitDiagram** | An LLM reads the tree and writes a Mermaid diagram | Free, MIT | Instant picture of any public repo | The diagram is inferred by a model; ours is resolved by a parser |
| **Emerge** | Interactive force-directed dependency maps, 13 languages | Free, MIT | Local exploration across languages | We host it and explain it; they cover more languages |
| **repowise** | Parsed file and symbol graph, ownership, churn, MCP for agents | Free for 2 public repos, Pro $15/mo | 28 languages plus git history on one map | Closest competitor. They win on breadth and history, we win on cited explanations |
| **RepoGrasp** | Answers behaviour questions with `file:line` citations | Demo live, connections in development | Behaviour, not structure | Adjacent, not identical: they explain a path on demand, we map first |
| **CodeSee** | Codebase maps and onboarding tours | Sunset after the GitKraken acquisition (May 2024) | — | A real hole in the market: nobody sells guided tours now |

Two rows are losses on purpose. A comparison that has no losing row is a
brochure.

## Feature gaps, ranked

Ordered by what unlocks a paid SaaS motion, not by what is most fun to build.

### G1 — Private repositories

**Problem.** Every competitor that charges money reads private code.
Sourcegraph, CodeScene and repowise all do; a tool that only reads public
repositories is a demo.

**What.** A GitHub App installation, so the grant is per repository and
revocable, and the archive is fetched with a short-lived installation token.
The token is used once and never stored; the analysis keeps only the commit SHA
and the parsed result.

**Acceptance.** A private repository produces the same map as an equivalent
public one. Revoking the installation makes the next run fail with a message
naming the revocation, not a 404. No token is written to any table.

**Rank.** Blocking. Nothing else converts until this exists.

### G2 — Pull-request blast radius

**Problem.** The map answers "what does this file touch" only after a manual
run. The daily question is "what does *this diff* touch".

**What.** Given a PR number, run the analysis at the head commit, then intersect
changed files with the parsed graph and show two sets: what the diff imports,
and what imports the diff. Comments nothing back to GitHub.

**Acceptance.** A PR changing one file reports the same dependent set a manual
analysis of that commit reports. A PR touching a file the parser could not
resolve says so in the result rather than rendering an empty list.

### G3 — Cycles and boundary rules

**Problem.** dependency-cruiser's core value is rules that fail a build. We have
a graph and nothing to enforce with it.

**What.** Cycle detection over the parsed graph, and a rules file
(`cartograph.rules.json`) with `allow`/`deny` between folders, checked in CI via
one CLI command.

**Acceptance.** A synthetic cycle is reported with the exact path, and an
`npm` script exits non-zero when a denied edge exists.

### G4 — History, churn and ownership

**Problem.** CodeScene and repowise attach git history, which is how they say
"this file changes every week and one person owns it". A map with no history
cannot prioritise.

**What.** Shallow-clone the pinned commit's history, compute churn per file and
last-touched author, and join it to the existing nodes. No new table: two
columns and a nightly-free recompute.

**Acceptance.** Every node shows a commit count for the last 90 days, and a file
with no history in the window shows zero rather than being dropped.

**Shipped differently, and the difference is the point.** The plan was to
compute churn for every file during the run and store it. That is one GitHub
request per file, so a thousand-file repository spends a fifth of the hourly
limit filling a column most readers never open — and it was the *cost*, not the
schema, that had this ticket stuck on a decision.

So it is computed for one file when someone asks about that file, and stored
nowhere (`lib/graph/churn.ts`, `POST /api/churn`). One request, not a paginated
walk: `per_page=1` plus the `Link` header's `rel="last"` page number gives the
total, so a repository with 400 commits costs the same as one with 4. The
schema question disappeared instead of being answered.

Proved against the live API: `lib/pipeline/run.ts` → 1 commit, `README.md` → 2,
a path with no history → 0 and no date, never an error. Four unit tests cover
the Link-header arithmetic, because reading it wrong reports 1 commit for a file
with 400 — which reads as "nobody touches this", the exact opposite of true.

### G5 — Language coverage

**Problem.** TS/JS only. Every general tool in the table is multi-language.

**What.** One adapter interface, then Python first (its imports are resolvable
without a full type checker). Not a rewrite of the parser.

**Acceptance.** A Python repository resolves relative and absolute module
imports, and unresolved ones are counted the same way TypeScript ones are.

**Shipped (`lib/parser/python.ts`).** A line scanner, not an AST: `import a.b as c`
contributes `a.b`, `from .base import x` keeps its dots, docstrings and comments
are skipped, and resolution is path arithmetic over the node set
(`a.b` → `a/b.py` or `a/b/__init__.py`, `..` climbs one directory, climbing to the
repository root is refused the way Python refuses it).

Two deliberate limits, because a wrong edge is worse than a missing one:

- `from . import x` names the **package**, not `x`'s module. Touching the package
  is always true; naming the module invents an edge whenever `x` is a name in
  `__init__.py`.
- Python imports never reach the TypeScript resolver. `import os` would otherwise
  be counted as a *Node* builtin — both languages happen to have one — so a wrong
  answer that looks right. A relative import that misses is reported unresolved,
  because in-repository that is a real defect; anything else is `external`.

### G6 — Export and shareable read-only links

**Problem.** The output cannot leave the app. Madge emits DOT, dependency-cruiser
emits five formats.

**What.** DOT and Mermaid export of the current view, and a signed read-only link
to a map that needs no account.

**Acceptance.** A signed link renders the same graph without a session and
expires; the export matches what is on screen, including the depth setting.

### G7 — Analysis diff

**Problem.** Re-running produces a second analysis with no relationship to the
first, so architecture drift is invisible.

**What.** Pick two analyses of the same repository, show added, removed and
reversed edges between their commits.

**Acceptance.** Two commits where one import was added show exactly one added
edge and no spurious removals.

### G8 — MCP access for coding agents

**Problem.** repowise exposes the graph over MCP so agents can query it. Agents
are where the graph gets used next year.

**What.** An MCP server exposing three tools: file dependents, file
dependencies, and a grounded explanation. Same scoping rules as the app.

**Acceptance.** An agent can ask for the dependents of a file and receives the
same list the dashboard shows, or a refusal when the organization does not
match.

### G9 — Continuous refresh

**Problem.** A map is a photograph. repowise refreshes public repositories
weekly with a badge.

**What.** A scheduled re-analysis of each repository, bounded by plan, that
supersedes rather than deletes the previous analysis.

**Acceptance.** A repository whose default branch moved produces a new analysis
within the window and the old one remains readable.

**Shipped as a refresh in place, not a supersede.** One analysis per repository
is a unique constraint that every read in the app depends on, so a second row
would mean adding an `is_latest` filter to each of them — a large, quiet change
to the part of the code that decides what a user can see. Instead the refresh
replaces the map and records the commit it replaced in `previous_commit_sha`
first, so "this map moved" survives the replacement and the header can read
`49ef6c4 was 30cf8e7`. The *intent* of the acceptance line is met — staleness is
visible; the letter of it is not, and an old map is not separately readable.

Proved against the live database: aged an analysis past the six-hour cutoff,
called the route with the real secret, and got `refreshed:["6631d51a"]` — the
map went `30cf8e7` → `49ef6c4`, 245 edges re-read, `previous_commit_sha`
populated, `refreshed_at` stamped. 401 without the secret, 401 with a wrong one.

### G10 — Onboarding tours

**Problem.** A map is a wall of boxes for someone on their first day. Emerge and
CodeScene both guide a reader through an unfamiliar repository.

**What.** Guided walks over the parsed graph.

**Acceptance.** A reader can follow one file's dependencies end to end without
opening the tree, and every step names the import that justifies it.

**Shipped generated, not authored — and the blocker was the whole argument.**
The ticket sat on "authored content or generated?" because authored wins on
polish. It loses on the only thing that matters here: a hand-written walk
through `app/api/projects/route.ts` is wrong the first time that file is
renamed, and nothing fails when it goes wrong. It just quietly stops being true,
which is the exact failure mode this product exists to complain about.

So a tour is derived (`lib/graph/tour.ts`). `follow` walks what a file pulls in,
in reading order; `surface` walks what depends on it, nearest first. Breadth
first, so a tour reads as concentric rings instead of disappearing into the
first import. Every step carries the specifier and line from the parse, because
a step a reader cannot check is a suggestion. A loop back is marked rather than
dropped — returning somewhere you have been is information. The walk is bounded
at 24 steps and reports how many it left behind, because an unbounded tour that
silently truncates is a lie.

Proved on this repository:

```
$ cartograph tour . app/api/graph/route.ts --depth 2
app/api/graph/route.ts — what it pulls in, in reading order

1. app/(workspace)/analyses/[id]/actions.ts  @/app/(workspace)/analyses/[id]/actions:6
2. lib/analysis/load.ts  @/lib/analysis/load:3
...
12. lib/supabase/server.ts  @/lib/supabase/server:11  (already on this tour)
```

Seven tests cover the properties that make a generated tour trustworthy: it
starts where asked, walks the right direction, cites a line per step, marks
repeats, distinguishes type-only edges, and states its own truncation.

