# 0031 — L6: Guided tours — the hole CodeSee left (issue #49)

## Ask
Issue #49 (lane L6 of wayfinder map #43): "CodeSee's tours died with the GitKraken acquisition in May 2024. A tour is an ordered walk through the map with a sentence per stop — closer to this product's explanations than to a graph view, which is why it is worth a lane."

**Check:** a reader can step through five ordered stops on a real analysis and the map follows. (map: #43)

## Reading
Lane L6 is narrow: guided tours through the parsed dependency graph. A tour is an ordered sequence of stops, each with:
- A file or module node
- A sentence explaining why it's on the tour
- Navigation between stops (next/previous)
- The map should highlight/focus the current stop

This is NOT:
- A full guided tour builder UI
- Tour sharing or collaboration
- Tour templates or library
- Export/import of tours

Scope: client-side tour state (current stop, ordered list of stops), navigation controls, map highlighting of current stop. Stored in browser state (not server), since tours are personal navigation aids.

Existing patterns:
- `components/map/dependency-map.tsx` — React Flow map with nodes/edges
- `components/map/nodes.tsx` — PanelNodeView, FoldedNodeView, node selection/highlight
- `lib/graph/highlight.ts` — highlight logic for edges/nodes
- `lib/graph/view.ts` — buildView, foldRepository
- `components/analysis-view.tsx` — ties map, rail, detail pane together

## Done when
- Tour state: ordered list of stop paths, current stop index
- Navigation: next/previous stop buttons
- Map highlights current stop (node highlighted, view centered)
- Each stop has a sentence explanation
- Five-stop tour works on a real analysis
- `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` + `pnpm build` pass
- Issue #49 closed with commit SHA; map #43 updated

## Known unknowns
- Whether tours are stored per-analysis or globally
- Whether tour data persists across page reloads
- Exact UI placement of tour controls (top bar? sidebar? overlay)
