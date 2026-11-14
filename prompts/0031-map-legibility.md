# 0032 — Map legibility fixes (issue #37)

## Ask
Issue #37 (lane T2 of wayfinder map #38): "Map legibility: one label ellipsized, attribution clipped, density at the centre"

Three defects found in vision pass:
1. `(workspace)` ellipsized to `(workspac…` — 11 chars at 12px in Geist Mono is ~79px, box min is 120px, so something narrower is winning
2. React Flow attribution clipped by panel bottom edge
3. Centre density still too high — orthogonal routing helped but centre of 113-file graph still has lines behind node labels

## Reading
The map renders in components/map/dependency-map.tsx with nodes in components/map/nodes.tsx. Node labels use font-mono text-xs. The FoldedNodeView shows directory names, PanelNodeView shows file rows with fan-in/fan-out. The map layout is in lib/graph/view.ts (buildView) and components/map/layout.ts.

## Scope
**In:** Fix the three defects:
1. Fix `(workspace)` ellipsis — ensure folded node labels have enough width
2. Fix attribution clipping — ensure React Flow attribution isn't clipped by panel bottom
3. Improve centre density — reduce edge crossings or increase node spacing in dense centre
**Out:** New UI, new sections, new dependencies

## Done when
- `(workspace)` label shows fully without ellipsis
- Attribution text not clipped at bottom edge
- Centre density improved (fewer edges behind node labels)
- `pnpm gate` + `npx tsc --noEmit` + `npx eslint . --quiet` + `pnpm build` pass
- Issue #37 closed with commit SHA; map #38 updated

## Known unknowns
- Exact width needed for `(workspace)` label at 12px Geist Mono
- Whether attribution clipping is CSS overflow or React Flow positioning
- Best approach for centre density (fold by default? rank by dependency depth?)
