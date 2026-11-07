# 0008 — The graph, the canvas and the dashboard: what is improvable, and what is taste

The request was "improve the React Flow in every possible way… plus the dashboard and
canvas". Unbounded, so it is split into facets, and each facet is either a change
with evidence behind it or a refusal with a reason. "Every possible way" is the
request most likely to end in slop.

## Categorised facets

| Facet | Finding | Verdict |
| --- | --- | --- |
| **Structure — node spacing** | `nodesep: 16` in `layout.ts`; the dark screenshot showed edges bunching and crossing near the centre | **change**: widen to 28 |
| **Structure — rank spacing** | `ranksep: 72`, unchanged since first layout; reads fine at both themes | **keep** |
| **Looks — panel row type** | `text-[11px]` while node labels are now `text-xs`; two sizes doing one job | **change**: `text-xs` |
| **Looks — panel row height** | `ROW_HEIGHT: 20` with 12px text is cramped; 20 is also off the 4pt rhythm | **change**: 24 |
| **Canvas — grid** | on `--line`, present, deliberately quieter than data | **keep** |
| **Canvas — direction** | arrowheads are blocked by this version's `Edge`/`EdgeMarker` types; the vision pass said direction is guesswork | **change**: a two-line legend, since a cast is not available |
| **Canvas — attribution clip** | React Flow's attribution is cut at the panel's bottom edge | **refuse**: it is the library's own link, positioned by the library; a CSS override that nudges it is a fight with a dependency for a link that only exists because the graph is cheap to use without paying |
| **Dashboard — row rhythm** | cells at `py-1.5` give ~32px rows, not the 28px the spec names | **change**: `py-1`, so 20px of text plus 8px is 28 |
| **Dashboard — strip** | `h-7` items inside an `h-9` strip | **keep**, shipped in `dd66c14` |
| **Dashboard — empty state** | file tree beside one sentence | **keep**, shipped in `dd66c14` |
| **Animation / minimap / controls** | none present | **refuse**: motion and chrome are not legibility, and a minimap of a graph that fits is decoration |

## The five parts

**Outcome.** A map that is easier to follow at a glance — fewer collisions, one type
size per job, and a key for direction — and a table whose rows sit on the rhythm the
spec names.

**Constraints.** Tokens only; no new dependency; no shadows or glow; layout changes
must keep the left-to-right reading order; nothing touches selection or the inspector.

**Definition of done.** `pnpm gate` clean; `scripts/unclassified.ts` and the analysis
API still agree with the screen; screenshots in `img/` in **both** themes, judged by
vision; a commit that cites them.

**Failure modes.**
- **"Improved" by adding furniture.** A legend, a minimap, zoom buttons, animation —
  four additions that each look like care and none of which makes a node readable.
  Only the legend survives, and only because direction is a real missing fact.
- **Widening spacing until nothing fits.** `nodesep` costs canvas: at 28 a wide graph
  zooms out more. It is checked against the same screenshot, not assumed better.
- **Changing the dashboard by reflex.** The strip and empty state were just measured;
  touching them again without new evidence is churn dressed as work.

## Action plan

| # | Step | Loop stage | Check |
| --- | --- | --- | --- |
| 1 | `nodesep` 16 → 28; `ROW_HEIGHT` 20 → 24; panel rows `text-xs` | fix smallest | `pnpm gate` |
| 2 | Direction legend, bottom-left, token colours | fix smallest | legend names both colours, not "in/out" alone |
| 3 | Dashboard cells `py-1.5` → `py-1` | fix smallest | row height 28px in the browser |
| 4 | Screenshot light + dark | prove it twice | `look_at_image` on each |
| 5 | Commit images, comment on the issue | write it down | commit cites the images |
