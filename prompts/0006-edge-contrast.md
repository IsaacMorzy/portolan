# 0006 — Edges use the `edge` token, not React Flow's default grey

Second half of #36. The fit is fixed; the lines are still pale.

## Outcome

Every dependency edge is drawn with `--edge`, and a bright edge uses `--incoming`
or `--outgoing`. No edge takes React Flow's built-in default.

## Constraints

- Semantic tokens only. `#a1a1aa` / `#52525b` in `globals.css` are the token's
  values and stay where they are; nothing hard-codes them again.
- No new dependency, no theme change: this is a missing `stroke`, not a taste
  decision about how strong a line should be.
- The `0.15` dimming for edges unrelated to a selection is deliberate and stays.

## Definition of done

- Every edge in the `flowEdges` memo has a defined `stroke`.
- `pnpm gate` green.
- A screenshot of the same analysis, judged with `look_at_image`.

## Failure modes

- **Fixing the symptom with a darker literal.** The default was `#b1b1b7`; a
  hard-coded replacement would pass the screenshot and fail in dark mode.
- **Confusing dim with pale.** An edge at `0.15` opacity is dimmed on purpose
  because a selection is active. Contrast is judged on undimmed edges only.
- **Reading one theme.** `light-dark()` means one value per mode; a fix measured
  only in light mode is half a fix.

## Scope

- Not label size (a zoom-aware ladder of detail is its own issue).
- Not edge width, curvature or the layout.
