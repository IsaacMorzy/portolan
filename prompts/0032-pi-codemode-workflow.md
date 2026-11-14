# 0033 — Integrate pi-1.0 codemode into workflow

## Ask (verbatim)
"read this thoriously install the tool and conite and smoke tst then add it to our wokrlfow and agents.mf https://getaibook.com/news/pi-1-0-ships-codemode-and-durable-agent-substrate/" plus prior context "use free models from cline please and proceed wiht tasks and try to use automated work loop there are extesnion fro it"

## Reading
pi v1.4.0 is already installed at `/home/sage/.pi/agent/bin/pi`. Codemode is a **built-in extension** (not a separate npm install) — it must be enabled via `defaultTools: ["+codemode"]` in `~/.pi/agent/settings.json` or via `pi --tools +codemode` for one invocation. Codemode lets scripts run JavaScript in a QuickJS sandbox that calls pi's other tools (read, bash, edit, write, etc.) in parallel, filters output, and calls classifier/image models via `models.*`. Output is the only thing that reaches the model.

The URL `https://getaibook.com/news/pi-1-0-ships-codemode-and-durable-agent-substrate/` was not browsed (no browsing tool); the local docs at `/home/sage/.pi/agent/install/releases/1.4.0/node_modules/@earendil-works/pi-coding-agent/docs/codemode.md` were read instead — they fully describe codemode's API: `tools.*`, `text()`, `image()`, `console.log()`, `return`, `store()`/`load()`, `ALL_TOOLS`, `searchTools()`, `describeTool()`, `describeNamespace()`, and `models.*` (classify/generateImages).

## Scope
**In:**
- Enable codemode in `~/.pi/agent/settings.json` (add `+codemode` to defaultTools)
- Smoke test codemode with a real script that calls multiple tools in parallel
- Add a "pi codemode" section to AGENTS.md documenting the capability and how to invoke it
- Commit everything with gate/tsc/lint/build passing
**Out:** Writing new codemode scripts beyond the smoke test, changing pi version, installing npm packages

## Done when
- `pi --tools +codemode` runs a script successfully (output observed)
- AGENTS.md has a codemode section under Tooling explaining what codemode is and how to invoke it
- `pnpm gate` passes
- Commit `git add -A && git commit` made

## Known unknowns
- None — codemode is built into the already-installed pi binary; no external install needed.
