# 0005 — The map should fill its canvas, and keep doing so

Issue #36. Found by looking at a live signed-in screenshot, not by reading code:
the graph was a knot in the lower-middle of a large empty canvas.

## Outcome

The map fits its canvas on load and again whenever the canvas changes size, so
the graph occupies most of the visible area instead of a fraction of it.

## Constraints

- No new dependency. React Flow is already here; its own `fitView` is the tool.
- Semantic tokens only. Edge contrast is *not* changed in this pass: the pale
  edges may be a token problem or a `opacity: 0.15` dimming working as designed,
  and changing a token to fix a screenshot is how a theme breaks silently.
- Node labels keep their sanctioned size. Zoom-aware detail would be the real fix
  and is out of scope; shrinking type is not a fix for unreadable type.

## Definition of done

- `pnpm gate` green.
- A fresh screenshot of `/analyses/:id` in the signed-in browser, judged with
  `look_at_image`: the graph must occupy most of the canvas.
- Resizing the window does not leave the graph small and off-centre.

## Failure modes

- **Fitting on mount only.** The reason it looked wrong may be measurement before
  layout settles; a one-shot `fitView` would then be correct at a size the
  container never had. The resize path is the fix, not the padding number.
- **Fitting on every keystroke.** Re-fitting on unrelated state changes yanks the
  viewport while somebody is reading it.
- **Zoom cap mistaken for fit.** `INITIAL_MAX_ZOOM` deliberately stops a
  two-node graph filling the screen at 8x; keeping that cap is the point.

## Scope

- Not edge contrast, not label size, not zoom-aware ladders of detail.
- Not the layout algorithm: if nodes are spread badly, that is a `layout.ts`
  question with its own evidence.
