<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cartograph-workflow -->

# How work happens here

Read `CLAUDE.md` for what is true about this codebase. This section is the
process, and it applies whether the request arrives as one line or as ten.

## 0. Regenerate the prompt before obeying it

**This fires on every request, before any other section.** The message as typed is
evidence about what someone wants, not a specification. Restate it first, work
from the restatement, and show the restatement so it can be corrected in one line
instead of after a merge.

The rewrite has five parts, and a part with nothing in it is a question to ask,
not a gap to fill by guessing:

| Part | What goes in it |
| --- | --- |
| **Outcome** | What is true afterwards that is not true now. One sentence. If it takes three, this is two requests. |
| **Constraints** | The standing rules that bind this work: token-only styling, no new dependency without asking, secrets never client-side, one commit per idea. Only the ones that apply — a wall of boilerplate gets skipped. |
| **Definition of done** | The check that will be run, named. `pnpm gate` + `pnpm e2e` + the specific assertion this change should make pass. "It works" is not a check. |
| **Failure modes** | What this change is most likely to break. Name it before starting, because the thing you did not name is the thing that ships. |
| **Scope** | What is deliberately not being done, so it does not get done by accident on the way past. |

Then follow the factory loop below: measure, read the failure, fix the smallest
thing, prove it twice, write it down.

Three rules about the rewrite itself:

- **Merged requests split.** "Fix X and also Y and also build Z" is three tickets.
  Say so, then do the first — one commit per idea is already the standing rule.
- **Ambiguity is stated, not resolved silently.** "Which of these two did you
  mean?" costs one turn. Guessing wrong costs the whole change.
- **The rewrite never adds scope.** It is a restatement, not a proposal; if the
  restated version contains something the request did not, the restatement is wrong.

### Pi context before you start

Before restating, load durable context from `~/.pi/agent/pi-hermes-memory/`
(`MEMORY.md`, `USER.md`, `data.json`) — memory mode is **policy-only**, full style,
with 5000-char limits, review enabled, and auto-consolidate on. Anything decided
here gets written back to memory (target `memory` for global, `project` for
codegraph-scoped) so the next session starts informed. Report agent state
(working/blocked/idle) via the `herdr-agent-state.ts` extension when
`HERDR_ENV=1` is set; it is a no-op otherwise. The pi supervision runtime
(`pi-herdsman`, build v0.46.0, role `lead`) tracks the current session — the
codegraph repo is trusted in `trust.json`. If the current model is struggling,
rotate with `~/.pi/agent/bin/cline-rotate next`.

### The lane

Work arrives through a map, never as a bullet in a transcript. The shape is Matt
Pocock's wayfinder: one `wayfinder:map` issue holds the intent and the refusals, its
children are lanes, and **one lane is open at a time**. A lane is not started until
the measurement that justifies it exists, and it is not closed until a named check
passes — a lane with no check is a wish with a number.

If a request spans several lanes, file them all and open the first. Saying so out
loud is part of the job: "that is three lanes" is a better answer than three
half-built lanes.

### 0.3 The name, and what a price may claim

**The product is Portolan.** A portolan chart is the medieval chart that plots
routes between ports; that is the shape of what this tool draws — modules as
ports, resolved imports as routes. Renamed from `Cartograph` and researched twice
through `agent-reach` (`npm`, `github`, `hn` taps). The evidence, including the two
candidates that were rejected for colliding with *this* category (`rhumb`,
`soundings`) and why every short nautical `.vercel.app` is already taken, is in
`docs/naming.md`. The repository is `IsaacMorzy/portolan`; the deploy host stays
`codegraph-navy.vercel.app`, because a free slug somebody else owns is not a name.

**A price may name only what exists, or be labelled `in build`.** `#pricing`
lists plans whose rows are either shipped or carry that label in the row itself,
and the section says billing is not switched on. A plan that sells a feature the
code does not have is a refund with a delay, and the honesty is the marketing.

**A vendored block brings structure, never a palette.** Velora and TypeUI blocks
are imported for their layout (a comparison table, a footer bar, a code panel) and
their colours are replaced with the tokens in `docs/design-system.md`. A block that
arrives with its own `--primary` or gradient is a second design system, and
`scripts/check/design.mjs` refuses it.

### 0.1 The prompt file comes before the first edit

Written down here because it was skipped: a session began editing on the first
tool call and only wrote the prompt afterwards. §0 says restate the request; this
says *where* — `prompts/NNNN-slug.md`, five parts, before the first `edit` or
`write`, not after it.

If the request is genuinely a one-line question, the prompt is the answer and no
file is needed. If it will produce a diff, it gets a file first. The test is
mechanical: **did anything change before the prompt existed?**

### 0.2 Report images live in `img/`

`scripts/e2e/shots/` is gitignored because those are measurements, worthless once
the run ends. `img/` is tracked because those are evidence: a claim that something
was checked by looking has to survive the session that looked. Name them
`YYYY-MM-DD-<screen>-<what>.png` and link them from the issue or PR making the
claim.

## 1. Prompt first

Every request is rewritten before it is executed. Improve it with the
`prompt-engineering-patterns` skill, land it in `prompts/NNNN-<slug>.md`, then
build. The file records the ask verbatim, the reading chosen, what is out of
scope, and how the result will be checked. See `prompts/README.md`.

When a decision is durable (a convention, a preference, a failure mode, or a
tool quirk), write it to `~/.pi/agent/pi-hermes-memory/` — target `memory` for
global notes, `project` for codegraph-scoped decisions. Memory is policy-only
(full style, 5000-char limit, review on, auto-consolidate on); a decision that
is not written to memory is a decision the next session re-discovers.

Shorthand executed verbatim is how a repo fills with features nobody asked for.

## 2. Map it

Run `wayfinder` before writing code on anything larger than a single file:

- **Decision tickets** — things nobody has decided, including the requester.
  Resolve those first, in writing, and close them.
- **Implementation tickets** — vertical slices, each one shippable on its own.
- **Blocked tickets** — anything needing a human (an account, a credential, a
  purchase, a platform choice) is filed as blocked with the exact human action
  named. It is never faked.

Issues go to GitHub on `IsaacMorzy/codegraph`; the map issue is labelled
`wayfinder:map` and links its children. The pi supervision runtime
(`pi-herdsman`) tracks the session under `~/.pi/agent/pi-herdsman/runtime/`
(peer correspondences, coordinators, supervision-v2) — a lane is not started
until the measurement that justifies it exists, and it is not closed until a
named check passes.

## 3. Build it

`ponytail` at full intensity unless told otherwise:

1. Does this need to exist? Speculative need is skipped and said out loud.
2. Does this codebase already do it? Reuse the helper that is a few files over.
3. Stdlib. 4. Native platform feature. 5. An installed dependency.
6. One line. 7. Then, the minimum that works.

A shortcut with a known ceiling gets a `ponytail:` comment naming the ceiling.

When simplifying, reach for the pi simplification extensions before
hand-rolling: `pi-simplify`, `pi-deltabox`, `pi-straw-boss`, `pi-background-tasks`,
`pi-loop`, `pi-acp`, and `pi-durable-subagents` are installed. If the model is
struggling, rotate with `~/.pi/agent/bin/cline-rotate next`.

## 4. Check it

Non-trivial logic leaves one runnable check behind (`pnpm test`, `node --test`,
no framework). UI work is screenshotted at 1440 light, 1440 dark and 390 and
looked at before it is called done. The build, the type check and the linter
must pass; a failing check is reported, never weakened.

Before any change that touches auth, secrets, rate limits, or entry points,
check `~/.pi/agent/extensions/pi-permission-system/logs/
pi-permission-system-permission-review.jsonl` for prior permission review
decisions — the permission system logs config resolution and review events
there. Vision is enabled (cline provider, nemotron model, audit log on) — use
it to verify screenshots rather than assuming.

The build, the type check and the linter must pass; a failing check is
reported, never weakened.

## 5. Report it

Say what shipped, what was skipped and why, and what is blocked on whom. One
line of status at the end that is not a summary of the summary.

When a phase closes, write the decision to `~/.pi/agent/pi-hermes-memory/`
(target `memory` for global, `project` for codegraph-scoped) and cite the
commit SHA in the issue comment. A closed lane with no memory entry and no
commit citation is not closed.


## The factory

This repo runs the loop the way Isaac Mwendwa's "What is a software factory?"
describes it: the SDLC with as much of it as possible run by agents, and the
trust moved to places the agent cannot soften. Four requirements separate a
factory from a pile of prompts. All four are concrete files here, not
aspirations:

| Requirement | Where it lives | What breaks it |
| --- | --- | --- |
| **Repeatable inputs** | `prompts/NNNN-*.md` -> a `wayfinder:map` issue -> child tickets with a lane. Nothing gets built that is not filed first. | An idea that arrives in chat and gets built in the same turn. |
| **Standardized tooling** | `pnpm test`, `pnpm e2e`, `npx tsc --noEmit`, `npx eslint .`, `pnpm build`. The same five, every time, in that order. | "I'll just check this one page." |
| **Measurable output** | `scripts/e2e/budget.mjs` prints the number it rejected, never a verdict alone. A closing issue comment cites a commit. | "Looks good to me." |
| **Retained context** | `docs/specs/`, `docs/architecture.md`, this file, and issue comments that say what was tried and what was refused. | A change with no sentence explaining its shape. |

### The three trust layers

Trust has to sit somewhere the agent cannot reach, because an agent that can
edit its own test can make anything pass.

**1. Black-box checks that know nothing.** `scripts/e2e/` drives the product the
way a person does — a browser, an HTTP request, a screenshot. None of it imports
app code. That is deliberate: refactoring the map view must not be able to break
the check that says the map renders. `tests/` holds the white-box tests for pure
functions; both exist, the black box carries the weight.

**2. Architecture written down.** `docs/architecture.md` names the patterns and
the vocabulary — the single gate, one guard per entry point, the seam. Written
in words a model already understands so a generated change can be judged against
it instead of against taste.

**3. Adversarial checks that hold an opinion.** `budget.mjs` refuses a layout
shift, a second `h1`, a missing canonical, a contrast pair that fails AA. These
are not pass/fail on features; they are a standard that sends work back.

### Fix the machine, not the model

When a class of error escapes, the fix is a check, never a scolding. Every
entry below is a real escape from this repo and the rule it produced:

| Escape | The machine fix |
| --- | --- |
| `border` with no colour rendered as near-white in dark mode | Token-only styling; raw hex and bare `border` are refused in review |
| A 90-character Tailwind arbitrary class compiled to **no CSS at all**, and the ticker was clipped for weeks | `budget.mjs` asserts layout; visual defects get a screenshot and a vision pass, not an assumption |
| A single-column grid sized its track to its widest child and widened the page at 390px | `landing.mjs` fails on horizontal scroll at 390, every run |
| `/api/graph` explained on every call, so a loop over filenames was a loop over model calls | Cost budgets per route (`lib/ratelimit.ts`), and the expensive part is opt-in |
| An unauthenticated POST answered 307 locally and 200 in production while protecting identically | Assert the invariant (no data came back), not the status code |

### Doing work here

- **One request per prompt file.** Rewrite it, file it, then build it.
- **One commit per idea**, message says what was measured.
- **Prove it locally and against the deployment.** They differ; the difference
  above is the proof.
- **Close the loop.** A ticket closed with a commit sha, or left open with a
  named blocker. Never a silent drop.

## Design system

**`docs/design-system.md` is the source of truth.** Read it before changing any
surface. It is short because it is rules, not examples.

The three things most likely to bite:

1. **Two densities, one token base.** Marketing (`/`, `/security`) runs 96-128px
   between sections and headlines up to 80px. Product (`/dashboard`,
   `/analyses/:id`) runs 16-24px and never exceeds 32px. A product screen never
   borrows a marketing size; an 11px label on a marketing page is the same
   mistake in reverse.
2. **Twelve type sizes, and no thirteenth.** 11, 12, 13, 14, 15, 17, 20, 26, 32,
   40, 56, 80. `budget.mjs` reads every rendered size from the browser and fails
   on anything else, because Tailwind resolves `rem` against a page font-size the
   source never mentions. Adding a size is a design decision, not a typo fix.
3. **Semantic tokens only.** `canvas surface raised line fg fg-muted accent
   accent-fg incoming outgoing kind-1..4 edge`. A raw hex in a component cannot
   be reached by the theme, so it breaks in one mode and nobody notices — which
   is exactly how white-on-accent shipped at 3.25:1 in dark until the contrast
   check caught it.

### Working with TypeUI

Vendored, MIT, offline: `.agents/skills/typeui-fundamentals/` (4,267 lines of
type, spacing, UI, UX and accessibility reasoning). Load it when a design
question is genuinely undecided and `docs/design-system.md` is silent. When the
two disagree the repo wins — and that disagreement is a bug in one of them, so
say which rather than quietly picking.

The MCP (`https://mcp.typeui.sh`) is **authenticated in hermes** — 24 tools,
OAuth, no API key. It authenticates per client, and pi *can* complete that flow:
an HTTP server in `mcp.json` may carry an `oauth` block, and pi runs the browser
handshake itself (pi's own MCP guide, section "Authenticate with OAuth"). The earlier note here said pi could not, and that was
wrong. The vendored skill is still the default path because it works offline in
all three harnesses with no session to expire — a preference, not a limitation.

Re-authenticate with `hermes mcp login typeui`, or `opencode mcp auth typeui`.
The listener binds `127.0.0.1:<port>` and the consent page sits behind a Vercel
checkpoint that **rejects headless Chrome** (`Failed to verify your browser —
Code 29`), so the authorize step needs a real browser. If the redirect lands
somewhere unreachable, POST it yourself instead of copy-pasting:

```bash
curl "http://127.0.0.1:<port>/callback?code=...&state=..."
```

The tool map, and which tools are legitimately useful here versus which would
replace a deliberate system with a generic one: `docs/design-system.md` §11.

**Where UI comes from.** Velora is one registry and most of it is refused by house
style. The shortlist of what is admissible, why three popular kits are not, and the
re-tokenizing procedure every pulled file goes through: `docs/specs/13-ui-sources.md`.
The short version: the visual layer is already hand-built, the *behavioural* layer is
empty, so the only thing worth adding is one headless primitive dependency at the
moment a component needs it — not a kit adopted up front.

The CLI is a design-system *generator* — it emits a `SKILL.md` for a stack from a
prompt or a preset:

```bash
npx -y typeui.sh@latest list                 # presets
npx -y typeui.sh@latest pull <slug>          # write one into .agents/skills/
npx -y typeui.sh@latest generate             # answer prompts, emit a skill
```

Use `pull` when you want a starting point for a *new* surface or a different
product. Do not regenerate this project's system — it is hand-built around the
tokens in `app/globals.css` and the measured scale, and a generated one would
trade that for generic defaults.

### When a design defect escapes

Add a check, then a line in `docs/design-system.md`. In that order. The doc
already contains the rules the last three defects broke; what caught them was
`scripts/e2e/budget.mjs`. Prose is not enforcement.

## Tooling: what is wired, and when to reach for it

Every row was used on this repository, not copied from a list. If a tool is not
here it is because nobody needed it yet — that is a different thing from it not
working.

### Skills

Skills live in `~/.agents/skills` (154 installed) plus two vendored under
`.agents/skills/` for this project. Loading all of them is a way to spend the
context budget on instructions nobody reads. These are the ones that earn it:

| Skill | Load it when |
| --- | --- |
| `supabase` / `supabase-postgres-best-practices` | Any schema change, RLS policy, migration, or query that touches Postgres. Vendored in `.agents/skills/`, so they ship with the repo. |
| `design-taste-frontend` | Any landing, marketing or auth surface. Its house rules (no eyebrows, no glass, no monograms, headlines <= 2 lines) are the reason half the Velora registry was refused. |
| `ponytail` | Every code change. Lazy rung that holds: stdlib -> native -> installed dep -> one line. |
| `wayfinder` + `to-tickets` | Splitting a request too big for one commit. Produces the map and the children. |
| `web-quality-audit` | Performance, a11y, SEO sweeps. |
| `code-review` | Before merging anything non-trivial. |
| `typeui-fundamentals` | Deliberately undecided design questions — hierarchy, spacing intent, type scale reasoning, WCAG interpretation. Vendored in `.agents/skills/typeui-fundamentals/` (MIT), so it works offline. **`docs/design-system.md` wins on every concrete value**; this skill supplies the reasoning when the doc is silent. |

Skills are cheap to install and expensive to load. If a task matches nothing in
that table, do it without a skill and write down what you learned.

### CLI

| Command | What it is for here |
| --- | --- |
| `gh issue` / `gh pr` | The tracker. Lanes: `wayfinder:map`, `ready-for-agent`, `ready-for-human`, `needs-info`. Every claim in a closing comment cites a commit. |
| `psql` | The live database, when the question is about what is actually stored. Connect with `SUPABASE_DB_PASSWORD` and `sslmode=require`. Never a schema guess when this is one command away. |
| `pnpm` | Only package manager in use. `pnpm test`, `pnpm e2e`, `pnpm build`. |
| `vercel` / the Vercel API | Deployment state, env vars, attack mode. `scripts/push-vercel-env.sh` for secrets. |
| `npx tsc --noEmit`, `npx eslint .` | Non-negotiable before any claim of done. |
| `node --test` | The test runner. No jest, no vitest, no framework. |
| `curl` | Verifying a deployed header or status. `--max-redirs 0`, or you will measure the redirect target and believe you measured the route. |
| `~/.pi/agent/bin/pi` | The pi agent itself. |
| `~/.pi/agent/bin/cline-rotate` | Rotate/switch cline free models when the current model struggles (`next`, `current`, `list`, `test`). |
| `~/.pi/agent/bin/rg` / `~/.pi/agent/bin/fd` | Fast code search (ripgrep / fd). |

### MCP

One browser driver is live; the rest sit disabled until the task needs them.

| Server | State | When |
| --- | --- | --- |
| `chrome-debug` | on | Drives a Chrome already open on `--remote-debugging-port=9222`. It joins that profile, so it carries its cookies — the only client that gets past a Vercel or Cloudflare challenge, which a fresh headless browser cannot solve. |
| `chrome-devtools` | on | DOM, console, network and performance over the DevTools protocol. |
| `clerk` | on (remote) | Instance config, users, domains. Read-only in practice. |
| `httpstatus` | off | SSL, CORS, redirect chains, HAR. Off because it wants an API key; a server that 401s every call is worse than one that is visibly off. |
| `typeui` | on in hermes | Hosted design-system MCP at `https://mcp.typeui.sh`, OAuth (no API key). **24 tools** once authenticated: account, design-system install, section-prompt generation, and site insights. Use it to start a *different* product or to shape a surface that does not exist yet — never to regenerate this one, because `docs/design-system.md` is the source of truth and generation would trade specificity for plausibility. Full tool map and the split-by-question table: `docs/design-system.md` §11. |
| `typeui` (opencode) | awaiting authorize | `opencode mcp auth typeui` starts its own PKCE flow. |
| `typeui` (pi) | works, unused | pi supports MCP OAuth (its MCP guide, "Authenticate with OAuth"), so `mcp.json` can carry the `oauth` block. The vendored `typeui-fundamentals` skill is still preferred here: offline, no session to expire. |
| `puppeteer`, `playwright` | off | Third and fourth browser drivers. They were already in the global config; three drivers for one job is how you get three answers. |

Refused, with reasons: **`x64dbgMCP`** debugs Windows native binaries and this is
Linux; **WebMCP** is a browser API for a *site* to expose its own tools, not a
server to install.

```
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/codegraph-debug
```

Config lives in `~/.config/opencode/opencode.json`,
`~/.free-pi/agent/mcp.json` and `~/.hermes/profiles/<profile>/config.yaml`.

### Pi extensions

Pi loads extensions from `~/.pi/agent/extensions/` and runs them inside the Pi
process with the same OS permissions. Loaded extensions are part of the
workflow, not optional extras — know what each one does before relying on it.

| Extension | What it does | Workflow integration |
| --- | --- | --- |
| `herdr-agent-state.ts` | Reports agent state (working/blocked/idle) to herdr via Unix socket, keyed on `HERDR_ENV`/`HERDR_SOCKET_PATH`/`HERDR_PANE_ID`. Emits on `session_start`, `agent_start`, `agent_settled`. | Confirms a session is alive and reporting state before starting a lane. If `HERDR_ENV` is not `1`, it is a no-op. |
| `pi-permission-system` | Logs permission review decisions to `extensions/pi-permission-system/logs/pi-permission-system-permission-review.jsonl`. Resolves config from global then project paths. | Before any gate-relevant change (auth, secrets, ratelimit), check the permission log for prior review decisions. |
| `pi-herdsman` | Supervision runtime (build v0.46.0, role `lead`). Maintains peer correspondences, coordinators, and supervision-v2 state under `~/.pi/agent/pi-herdsman/runtime/`. | The codegraph repo is trusted (`trust.json` lists it). A lead coordinator instance tracks the current pi session. |

CLI binaries in `~/.pi/agent/bin/`: `pi` (the pi agent itself), `cline-rotate` (rotate/switch cline free models), `rg` (ripgrep), `fd` (fd find). Use `cline-rotate next/list/test` when the current model is struggling; `rg` and `fd` for fast code search.

Memory is `policy-only` (full style, 5000-char limits, review enabled, auto-consolidate on) at `~/.pi/agent/pi-hermes-memory/`. Project memory lives under `projects-memory/`. Update both `memory` (target=memory) and `project` (target=project) scopes when a decision is durable.

Trust is per-directory in `trust.json`; `/home/sage/Documents/frontend/nextjs/codegraph` is trusted. Vision is enabled (cline provider, nemotron model, audit log on) — screenshots and image reads go through it.

### Pi codemode

pi v1.4.0 includes a built-in **codemode** extension. It is not installed via npm — enable it in `~/.pi/agent/settings.json` with `"defaultTools": ["+codemode"]` (already done in this repo's environment) or per-invocation with `pi --tools +codemode`.

Codemode runs JavaScript in a QuickJS sandbox that calls pi's other tools (`tools.read`, `tools.write`, `tools.edit`, `tools.bash`, etc.) in parallel, filters output before it reaches the model, and can call classifier/image models through `models.*`. The script's return value or `text()` calls are what the model sees — everything else is filtered out.

```js
// Example codemode script
const pkg = await tools.read({ path: "package.json" });
const parsed = JSON.parse(listing);
return { name: parsed.name, version: parsed.version };
```

Codemode scripts have no Node.js, file system, or network access directly — they reach the outside world only through `tools.*` and `models.*`. They are useful for parallel tool calls, filtering large outputs, and calling classifier/image models.

**Limitation in this environment:** The `pi-permission-system` extension blocks tool calls in headless sessions (no interactive UI for approval). Codemode scripts that call `read`, `bash`, `edit`, or `write` will be denied until an interactive approval UI is available. Codemode works fully when run with `herdr-agent-state.ts` providing session context and `HERDR_ENV=1` set.

### Hooks: what fails automatically

`.githooks/pre-commit` runs before every commit (`git config core.hooksPath
.githooks`). No dependency, no Husky, no config file to drift — three scripts and
the two gates that a commit genuinely must not break.

| Hook | Fails on |
| --- | --- |
| `scripts/check/secrets.mjs` | An env file staged, or a credential-shaped string anywhere — `vcp_`, `csk-`/`sk-`, `ghp_`, `sk_live_`, a JWT, an AWS key, a private key block. Scans untracked files too, redacts what it finds, and never echoes the value. |
| `scripts/check/guards.mjs` | An entry point that never asks who is calling; the secret-key Supabase client or an AI/GitHub module imported into a `"use client"` file; an API route that spends money without `lib/ratelimit`; a `LIMITS.<key>` that does not exist; a cron route without its bearer check. |
| `scripts/check/slop.mjs` | Gradients, Tailwind's default palette, glass/blur, shadows, emoji, eyebrows, `01/02/03` markers, and raw hex outside the token layer. Each finding prints the reason, not just the location. |
| `scripts/check/design.mjs` | Type sizes off the twelve-step scale, bare `border` (resolves to `currentColor` in v4), spacing off the 4pt grid, and colour utilities that are not semantic tokens. |
| `scripts/check/workflow.mjs` | A rules file pointing at a file that does not exist, `AGENTS.md` and `CLAUDE.md` disagreeing, a gap in `prompts/` numbering, and an unreadable commit subject. |
| `scripts/check/bar.mjs` | `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `as any`, and `dangerouslySetInnerHTML` above a declared ceiling. The numbers are the counts today, so the rule is "no more", and lowering one is progress you can measure. |
| `npx tsc --noEmit`, `npx eslint . --quiet` | Types and lint. |

**One gate, two callers.** The list lives in `scripts/gate.sh`; `.githooks/pre-commit`
runs it bare, `.github/workflows/ci.yml` runs it with `--full` (which adds the tests
and a build with no environment at all). The workflow is a YAML shim and nothing
more, because two copies of the same list drift and the copy nobody runs is always
the stale one.

The gate runs `next typegen` before `tsc`, because `PageProps` and `LayoutProps`
are generated from the route tree and `next-env.d.ts` is gitignored — a fresh
checkout has no such globals, so types fail on files that are perfectly fine in a
terminal where `dev` has run. Generating them is the fix; committing a generated
file is not.

Run it by hand with `pnpm gate` (`pnpm gate:full` for the CI tail), or one check at
a time with `pnpm check:secrets`,
`check:guards`, `check:slop`, `check:design`, `check:bar`, `check:workflow`.

Each was tested by writing a deliberate violation and confirming it fails — a
check that has never failed is a check nobody knows the shape of. Two earned
their keep that way: `secrets.mjs` was scanning only tracked files, so a secret
written today stayed invisible until the moment it was committed, and
`workflow.mjs` blocked its own commit on a regex where `ts` matched before `tsx`.

The browser checks are deliberately **not** in the hook: `pnpm e2e` takes minutes
and needs a dev server. A hook nobody can afford to wait for is a hook everyone
passes with `--no-verify`. CI or a deliberate run is where those belong.

Three exemptions exist and each is narrow and commented in the source: the token
layer (`app/globals.css`) owns hex by definition, `app/opengraph-image.tsx`
renders through Satori which has no CSS variables, and the hero globe keeps its
radial gradient because it is the one sanctioned animation.

### The loop, in order

1. **Measure.** A claim about performance, contrast or behaviour starts with a
   number from this machine. `scripts/e2e/budget.mjs` prints the value it saw.
2. **Read the failure.** Satori said which node needed `display: flex`; the
   built CSS said the mask rule was never emitted. Both took one look at the
   real output and zero guesses.
3. **Fix the smallest thing.** `min-w-0` on the grid's direct children, not a
   layout rewrite.
4. **Prove it twice** — locally and against the deployment, because they differ.
   `/api/graph` answers 307 to /sign-in locally and a not-found page with 200 in
   production. Same protection, different transport. Assert the invariant, not
   the status code.
5. **Write it down.** A check in `scripts/e2e/`, a row in this file, or an
   issue. Something unrecorded is something the next session re-discovers.

## Debugging tools (MCP)

Not all wired at once. One browser driver is live; the rest sit in config,
disabled, and get switched on for the task that needs them.

| Server | State | What it is for |
| --- | --- | --- |
| `chrome-debug` | on | Drives a Chrome you already have open, over its debugging port. It joins that profile, so it carries its cookies — the only client that gets past a Vercel or Cloudflare challenge, which a fresh headless browser cannot solve. |
| `chrome-devtools` | on | DOM, console, network and performance over the DevTools protocol. |
| `httpstatus` | off | SSL, CORS, redirect chains, HAR. Off because it wants an API key; a server that answers 401 on every call is worse than one that is visibly disabled. |
| `puppeteer`, `playwright` | off | Third and fourth browser drivers. They were already in the global config; three drivers for one job is a way to get three answers. |

Start the browser once, then leave it running:

```
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/codegraph-debug
```

Skipped, with reasons rather than silence:

- **`x64dbgMCP`** debugs Windows native binaries through a Windows debugger.
  This machine is Linux and the project has no native binary.
- **WebMCP** is a browser API for a *site* to expose its own tools, not a
  server to install.
- The MCP debugging page linked alongside them is documentation, not a package.

Config is global, in `~/.config/opencode/opencode.json`,
`~/.free-pi/agent/mcp.json` and `~/.hermes/profiles/<profile>/config.yaml`.

<!-- END:cartograph-workflow -->
