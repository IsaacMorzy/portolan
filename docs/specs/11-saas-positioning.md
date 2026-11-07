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

### G5 — Language coverage

**Problem.** TS/JS only. Every general tool in the table is multi-language.

**What.** One adapter interface, then Python first (its imports are resolvable
without a full type checker). Not a rewrite of the parser.

**Acceptance.** A Python repository resolves relative and absolute module
imports, and unresolved ones are counted the same way TypeScript ones are.

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

### G10 — Onboarding tours

**Problem.** CodeSee sold guided tours and was sunset. Nobody replaced them,
which makes this the least contested gap in the table.

**What.** An ordered list of steps over the parsed graph — file, why it matters,
what it imports — stored as a row, not as a document.

**Acceptance.** A tour renders step by step against a real analysis, and a step
pointing at a file removed since the tour was written reports the removal
instead of rendering nothing.

## What this phase deliberately does not decide

- Per-seat or per-repository pricing. Both exist in the field; picking now
  would be a guess dressed as a decision.
- Which of G1–G10 is next. G1 blocks all of them commercially; G10 is the least
  contested and could be done first by a small team wanting differentiation
  rather than reach.

## Acceptance check (run by hand)

- [ ] The landing page states the positioning in the hero and again as its own
      section, and both say something a competitor cannot.
- [ ] The comparison table names ten tools, gives their published pricing, and
      keeps the rows where this product loses.
- [ ] This file contains one spec per gap, each with an acceptance check.
- [ ] Nothing from G1–G10 has been built in this phase.
