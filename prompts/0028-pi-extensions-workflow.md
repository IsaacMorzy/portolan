# 0028 — Integrate pi extensions into AGENTS.md workflows

## Ask (verbatim)
"procee wiht task and amake suse of new pi extension in the workflows and update agents.ms wiht all of hem"

## Reading
The user wants the pi extensions discovered on this machine documented and integrated into the codegraph repo's `AGENTS.md` workflow. The extensions are:

- `herdr-agent-state.ts` (user extensions dir) — reports agent state (working/blocked/idle) to herdr via Unix socket, keyed on `HERDR_ENV`/`HERDR_SOCKET_PATH`/`HERDR_PANE_ID`.
- `pi-permission-system` (user extensions dir) — permission review logging, config resolved from global + project paths.
- `pi-herdsman` runtime (`v0.46.0`, role `lead`) — supervision v2 with peer correspondences and coordinators.
- CLI binaries: `pi`, `cline-rotate`, `rg`, `fd` in `~/.pi/agent/bin/`.
- settings.json packages: pi-hermes-memory, pi-herdsman, pi-harness-runtime, pi-web-access, pi-lens, pi-mcp-extension, pi-subagents, pi-deltabox, pi-simplify, pi-loop, pi-goal-x, pi-plan-mode, pi-permission-system, pi-straw-boss, pi-acp, pi-background-tasks, pi-durable-subagents, @getpipher/pi-permission-system, @braintrust/pi-extension, context-mode, pi-goal-x, @getpipher/vision, @narumitw/pi-usage, billion-context, @narumitw/pi-plan-mode, pi-btw, pi-acp, pi-background-tasks, pi-herdsman, @trevonistrevon/pi-loop, pi-durable-subagents.
- Trust: codegraph repo is trusted (`/home/sage/Documents/frontend/nextjs/codegraph`: true).
- Memory: `hermes-memory-config.json` — policy-only, full style, 5000 char limits, review enabled, autoConsolidate true.
- Vision: enabled, cline provider, nemotron model, audit log on.

The AGENTS.md needs a new section documenting these extensions and how they integrate into the repo's workflow (prompt → map → build → check → report), plus where each extension fits.

## Scope
**In:** Add a "Pi extensions" section to `AGENTS.md` documenting each installed extension, its purpose, and how it fits into the codegraph workflow. Update the CLI and MCP tables where relevant. Keep it concise and accurate — no invented behavior.
**Out:** Writing new extension code, changing extension behavior, installing new packages, or changing the build/test/check commands.

## Done when
- AGENTS.md has a new "Pi extensions" section that accurately documents each extension and its workflow integration.
- `pnpm gate` passes (workflow check verifies AGENTS.md points at real files and agrees with CLAUDE.md).
- Commit message says what was measured.
- Pi-hermes memory and pi project memory updated.

## Known unknowns
- Whether the user wants a local `.pi/` directory in the codegraph repo for project-specific extensions (currently none exists).
