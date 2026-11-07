# 0002 — Build the gaps G1–G10, in an order that does not lie about progress

## Ask

> proceed with all gaps gathered from your research then wayfinder the tickets in
> map as issues in github using matpocock workflow and implement the gaps
> remember to write the prompt fast then execute also update our agents.md with
> our workflow

## Reading

"All gaps" is ten features, three of which cannot be finished by an agent alone:
a GitHub App needs an account owner to create it, scheduled refresh needs a
platform scheduler and a plan, and Python needs a parser that does not exist in
this repository. So the honest execution splits the ten into three lanes:

1. **Pure logic, buildable now.** Cycle detection and boundary rules (G3),
   DOT/Mermaid export (G6), analysis diff (G7). These are functions over the
   parsed graph: no schema, no credentials, no new service. They get built,
   tested, and wired to a CLI.
2. **Buildable but needs a surface decision.** Tours (G10), MCP (G8), churn
   (G4). Each needs a schema change; they get tickets and a place in the queue,
   not a half-built table.
3. **Blocked on an owner.** Private repositories (G1) needs a GitHub App created
   by the account owner; refresh (G9) needs a scheduler choice; PR impact (G2)
   depends on G1's installation. They get tickets marked as blocked, with the
   exact thing a human must do.

Filing ten tickets and implementing three is the truthful version. Implementing
ten by faking the three blocked ones would produce a repo that claims features
it does not have.

## Scope

**In**

- `prompts/0002` (this file), `AGENTS.md` workflow section.
- Wayfinder map issue plus one ticket per gap, with blocking edges in the body.
- G3, G6, G7 implemented as pure libraries, tested, and reachable from a CLI.
- `pnpm test` covering the new logic.

**Out**

- Any database migration in this pass.
- Anything that needs a GitHub App, a scheduler, or a Python parser.
- Changing the house style.

## Done when

- Ten issues exist, each naming its gap, its acceptance check and what blocks it.
- `pnpm cartograph cycles <dir>`, `... rules <dir>`, `... export <dir>` and
  `... diff <a.json> <b.json>` run against a real directory.
- A synthetic cycle is caught, a denied edge exits non-zero, and an export
  round-trips.

## Known unknowns

- Whether churn belongs in the existing `analyses` row or its own table.
- Whether tours are authored by a person or generated from the graph.
