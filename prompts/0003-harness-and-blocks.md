# 0003 — Move the harness into the repo, and put a real block in every section

## Ask

> all server scripts from this project should be written in their own file
> according to task but stored in the scripts directory, so mv all of them from
> /tmp to scripts with the name of their tasks. also proceed with feature gaps
> and continue with code improvements. use veloraUI in all sections as blocks or
> components.

## Reading

**"mv all of them from /tmp"** — the `/tmp/pw/*.mjs` files are Playwright
scripts I wrote ad hoc this session: sign-in through a ticket, a production
sweep, a screenshot pass, an API probe. They are the most-repeated code in this
session and the least durable, living in a directory that clears itself. They
move to `scripts/e2e/`, named after the task, each one runnable on its own and
documented in one README line.

**"use veloraUI in all sections"** — checked against the registry rather than
assumed. Most of the modules are already Velora: `marquee` (hero), `file-tree`
(map), `globe` (close), `code-block` (hero), `footer-columns` (footer),
`mark` (nav, auth). The sections still using nothing from it are the value band,
the workflow stages, the comparison and the FAQ. Each gets the closest block
that survives the house style.

**"continue with code improvements"** — the unauthenticated-path check for
`/api/graph` is the first automated e2e check this repo has had, and it lands as
`scripts/e2e/api-graph.mjs`.

## Scope

**In**

- `scripts/e2e/` — one file per task, plus a README line each.
- A block or component from Velora in every landing section.
- A regression sweep wired as one script.

**Out**

- New dependencies. Playwright is used through `playwright-core` already
  installed globally; the scripts fail with a clear message when it is absent.
- Anything the house style forbids: no gradients, no motion libraries, no glass.

## Done when

- `node scripts/e2e/<name>.mjs` runs each task with no arguments.
- Every landing section contains at least one vendored primitive.
- Build, lint, types and tests pass; production renders unchanged.
