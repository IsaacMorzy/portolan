# 0004 — Empty state, strip rhythm, and where report images live

Written after the work started. That is the failure this prompt exists to stop:
the first edit of this session happened before any of this was on paper, and the
request arrived as a chat message that read as a task list. Restating it here in
the five parts, so the next request of this shape has somewhere to start.

## Outcome

A dashboard with no analyses shows the *shape* of what a run produces — a small
file tree beside one sentence — and its status strip sits on the 28px row rhythm
with type from the sanctioned scale. Report images live in `img/` in the repo.

## Constraints

- Semantic tokens only; no raw hex, no gradients, no shadows, no emoji.
- No new dependency. `components/velora/file-tree.tsx` already exists and is used
  as it is; the empty state composes it rather than reimplementing it.
- The empty state must not fake data. The tree is a fixture and says so in a
  comment, because a sample that looks like somebody's code invites the question
  of whose.
- `pnpm gate` green. Twelve sizes only — the gate enforces the scale.
- Nothing about this touches the authenticated path, so no browser check applies.

## Definition of done

- `pnpm gate` passes: `tsc` clean, `eslint --quiet` clean, `pnpm test` green,
  design/slop/bar checks hold.
- `app/(workspace)/dashboard/page.tsx` renders `FileTree` when `rows.length === 0`
  and renders the table otherwise, with no change to the table path.
- The tally `<li>` carries `h-7`, so the strip's items are 28px rather than
  whatever their content happens to make them.
- `img/2026-11-07-analyses-live.png` is tracked, and `img/README.md` states the
  rule that makes it tracked while `scripts/e2e/shots/` stays ignored.

## Failure modes

- **The empty state becomes a marketing block.** A tree plus a sentence is the
  limit; a second column of claims is the slop check's problem and mine.
- **A hard-coded tree drifts into looking like real data.** Fixture named as a
  fixture, in code and in this file.
- **`h-7` on the tally items changes the strip's height.** The strip is `h-9`
  with `items-center`, so a 28px child fits inside 36px without growing it —
  verified by the layout being unchanged, not assumed.
- **The image folder becomes a dump.** Date-prefixed names, one per finding.

## Scope

- Not doing spec 12 step 5 ("anything else, only after the four above pass §5").
- Not rebuilding the table, not touching selection or the inspector.
- Not fixing #36 (map fit and label contrast) here. It was opened this session
  and needs its own pass with a screenshot to verify, because structure alone
  cannot see either defect.
