# 0018 — Packages, not files (#45)

## Categorised request

| Kind | Request | Result |
| --- | --- | --- |
| **Work** | Lane L2 from #43: monorepo boundaries | attribution + crossings + rail grouping |

## Measurement before the change

A fixture monorepo (`tests/fixtures/mono`): `apps/web/src/page.ts` imports
`../../../packages/ui/src/button`. Before this commit the parser produced two edges
and no notion of a package, so the map drew `apps/web/src/page.ts →
packages/ui/src/button.ts` and nothing said a package had been crossed.

## Built

- `lib/workspace/packages.ts` — reads `pnpm-workspace.yaml` (the `packages:` list) or a
  `package.json` `workspaces` array/object, expands `dir/*` by listing the directory,
  and maps a path to the package whose directory is its longest prefix.
  `packageEdges()` collapses edges to the pairs of packages they cross.
- `ParsedFile.pkg` (SCHEMA_VERSION 5, `contract.ts` accepts string or null).
- Rail gains a **Packages** list when the repository declares more than one; the key is
  `pkg:<name>`, so a click dims everything outside that package.
- `categoryFocus` now takes *every key a file answers to* — its role and its package —
  instead of one role. A file is both "a page" and "inside web".
- Tests: five in `tests/workspace.test.ts`, including the npm-workspaces fallback and
  a repository with no globs at all.

## Deliberate omissions

- **No glob dialect.** `dir/*` and literals only. A glob engine is a language to
  document and a source of "why didn't my package match" support questions.
- **No js-yaml.** It is in `node_modules` only transitively; importing it would be an
  undeclared dependency. The `packages:` list is parsed directly.
- **No root package row.** A file outside every package has `pkg: null` and shows under
  no package — inventing a row for the root would give the repository two names.
- **No rail screenshot.** The deployed analyses are single-package repositories, so the
  Packages list has nothing to draw. Verified by fixture and by unit test, not by eye,
  and that is the honest state.

## Failure modes

- A package directory with no `package.json` is skipped rather than named after its
  path.
- Longest-directory match, so `packages/ui/nested` stays with `packages/ui` unless it
  declares itself.
