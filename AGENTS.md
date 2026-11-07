<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cartograph-workflow -->

# How work happens here

Read `CLAUDE.md` for what is true about this codebase. This section is the
process, and it applies whether the request arrives as one line or as ten.

## 1. Prompt first

Every request is rewritten before it is executed. Improve it with the
`prompt-engineering-patterns` skill, land it in `prompts/NNNN-<slug>.md`, then
build. The file records the ask verbatim, the reading chosen, what is out of
scope, and how the result will be checked. See `prompts/README.md`.

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
`wayfinder:map` and links its children.

## 3. Build it

`ponytail` at full intensity unless told otherwise:

1. Does this need to exist? Speculative need is skipped and said out loud.
2. Does this codebase already do it? Reuse the helper that is a few files over.
3. Stdlib. 4. Native platform feature. 5. An installed dependency.
6. One line. 7. Then, the minimum that works.

A shortcut with a known ceiling gets a `ponytail:` comment naming the ceiling.

## 4. Check it

Non-trivial logic leaves one runnable check behind (`pnpm test`, `node --test`,
no framework). UI work is screenshotted at 1440 light, 1440 dark and 390 and
looked at before it is called done. The build, the type check and the linter
must pass; a failing check is reported, never weakened.

## 5. Report it

Say what shipped, what was skipped and why, and what is blocked on whom. One
line of status at the end that is not a summary of the summary.


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
