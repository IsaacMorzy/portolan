# 0009 — A file under a module root is a module, and that is a placement fact

#35 measured 80 of 143 files unclassified (56%), concentrated in `lib/parser`
(17), `lib/graph` (14) and `scripts/e2e` (14).

## Outcome

Files the adapters do not recognise, but which sit under a module root or the
scripts folder, are classified by that placement — `module` and `script` — so the
rail stops calling half a real repository unknown.

## Constraints

- `module` already exists in `ROLES`; `script` is the only addition, and it is a
  placement fact like the others.
- Adapters keep priority. A file under `src/lib/app/api/` that the Next adapter
  recognises as an endpoint stays an endpoint; placement is the *fallback*, never
  an override.
- No per-repository taxonomy. Roots are named once (`lib/`, `src/lib/`,
  `packages/*/src/`, `scripts/`), not inferred by pattern per project.
- No new dependency; pure functions, so `tests/` covers them.

## Definition of done

- `parseSelection` maps a null role to the placement role, using the
  project-relative path (not the repo path, which would make `apps/x/lib` and
  `lib` differ).
- Unit tests: `lib/a.ts` → module, `src/lib/a.ts` → module,
  `packages/p/src/a.ts` → module, `scripts/a.ts` → script, `app/page.tsx` →
  not placement (adapter owns it), `lib` as a bare filename → not a directory.
- `scripts/unclassified.ts` re-run: the unclassified count drops sharply and the
  remaining list is short enough to read.

## Failure modes

- **Classification by folder name alone.** `app/` is not a module root and must
  not become one; the list is explicit for that reason.
- **The bucket reappearing under a new name.** If `module` ends up holding every
  file, the label changed and the information did not — the measurement is the
  count of *reads*, not of renames.
- **Repo-prefix drift.** Matching against repo paths would classify
  `apps/web/lib/db.ts` as unclassified and `lib/db.ts` as a module for no reason
  anyone could explain.

## Scope

- Not services vs models vs repositories: that is about behaviour, and guessing it
  from folders is how "Unclassified" grows back.
- Not the rail's ordering or colours.
