# 0022 — CodeRabbit replica scope and wayfinder map

## Ask
"is it feasible to build a replica of the service using our existing mvp if so show me how and craft a prompt using best practises from prompot enginering practise using the skill then map all the tasks to be done in slices using isues from matpocock workflow and post the wayfinder map in github for the whole project now"

## Reading
The user wants three things: (1) a feasibility assessment of building a CodeRabbit-style AI PR reviewer on top of this repo's MVP, (2) a prompt written with prompt-engineering best practices (using the `prompt-engineering-patterns` skill), and (3) the resulting work mapped as wayfinder/wayfinder:map issue plus child slice issues posted to GitHub. This is a scoping and planning session, not a build session — no implementation code should be written yet.

## Scope
**In:** feasibility assessment, prompt file, wayfinder map issue + child slice issues on GitHub, pi-hermes memory update.
**Out:** implementing the reviewer itself, installing CodeRabbit, adding new dependencies without asking.

## Done when
- Prompt file written at `prompts/0022-coderabbit-replica-scope.md`
- Feasibility documented honestly (what reuses vs what's missing)
- Wayfinder map issue created on `IsaacMorzy/portolan` labelled `wayfinder:map`
- Child slice issues created and linked to the map
- Pi-hermes MEMORY.md updated with the map issue number and plan

## Known unknowns
- Whether the user wants to proceed beyond scoping into implementation (that's a separate decision/lane).
- Whether a GitHub App for PR ingestion should be built or whether reviews are triggered manually via API first (cheapest starting point per ponytail).
