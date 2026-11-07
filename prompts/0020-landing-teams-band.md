# 0020 — Teams section reads as a band, not a gap (issue #33)

## Ask (verbatim)
Issue #33: "Two landing sections still read as gaps in both light and dark." Follow-up "proceed wiht next steps and tasks that are agent ready in github" → pick the ready-for-agent lane.

## Reading
Issue #33 (label `ready-for-agent`, no comments): a vision pass over `home-light.png`/`home-dark.png` flagged **Teams** ("One map your whole team can read") as a weak section — two `spotlight-card`s and a note, no visual ground, reading as a gap rather than a band. The pipeline section already got an anchor (code block); Compare is deliberately left alone (densest thing, no decoration needed). FAQ already has a left column + `<details>` list.

Options, cheapest first per the issue:
1. FAQ — add a left column (already has one; skip).
2. **Teams — give the section a ground the way the value band got one, so it reads as a band rather than a gap.** ← chosen.
3. Compare — leave it.

**Why this reading:** #33's own ordering says cheapest first; option 1 is already done (FAQ has heading + intro paragraph + details list); option 2 is concrete and measurable ("band rather than a gap"). Option 3 is explicitly refused ("leave it").

## Scope
**In:** Rework only `components/landing/sections.tsx` `Teams()`:
- Keep the existing content (two team points, Clerk note) and the heading.
- Give Teams the same "band" ground the Value section uses (`bg-raised/40`) instead of flat `bg-surface`, so it separates from the page as a distinct band rather than floating on canvas.
- Keep left column = heading + one strong claim sentence; right column = the two SpotlightCards + Clerk note as supporting evidence.
- No new dependency, no `motion`/blur/gradient/semantic palette (all banned by AGENTS.md house style).
**Out:** FAQ, Compare, Value, pipeline — untouched. No new components. No dark-mode-only changes (must work in both modes, per acceptance).

## Done when
- `pnpm gate` passes
- `npx tsc --noEmit`, `npx eslint . --quiet`, `pnpm build` pass
- Both light and dark mode screenshotted and looked at (1440 + 390) — Teams no longer reads as the weakest section; pipeline is not weaker after.
- Acceptance from #33: the section identified as weakest in the next vision pass is not Teams or the pipeline.

## Known unknowns
- None — Value's band pattern (`bg-raised/40`, left claim column, right evidence column) is already in the same file and is the template to mirror.
