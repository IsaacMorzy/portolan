# 0007 — The graph has to be visible, and it has to follow the theme

## Categorised request (what was actually asked, sorted by kind)

| Kind | The request | Why it is separate |
| --- | --- | --- |
| **Verification** | Close #36 with a screenshot instead of arithmetic | `ba7e8f1` changed a token by calculation; nobody has looked since |
| **Change** | Make the React Flow graph very visible | Direction, weight and separation are the product's whole claim |
| **Change** | The graph must change with the theme | A token that resolves at paint time does, if nothing snapshots it |
| **Evidence** | Images live in `img/` in the repo | Already a standing rule (§0.2); this is where the two theme shots go |
| **Queued** | #35: print the 58 unclassified paths | Measure before inventing categories |
| **Queued** | Spec 12 step 5 | Explicitly gated on §5 passing, so it is not in this pass |
| **Blocked on a human** | Rotate `VERCEL_TOKEN`, `CEREBRAS_API_KEY`, bypass secret | Cannot be done from here; recorded, not attempted |

## Outcome

The dependency graph is legible at a glance in both themes: lines carry direction
and weight, nodes separate from the canvas, and switching theme changes the graph
without a reload. #36 is closed by a screenshot, not by a calculation.

## The five parts

**Outcome.** As above, in one sentence: a map you can read, in either theme.

**Constraints.**
- Semantic tokens only — `fg`, `fg-muted`, `line`, `edge`, `incoming`, `outgoing`,
  `kind-1..4`. No raw hex, no `#` literals, no `rgb()`.
- No new dependency. React Flow already renders markers and backgrounds; the
  library's *defaults* are what must not leak (its default edge `#b1b1b7` was the
  bug in `d0470fc`).
- Theme switching must work by CSS resolution, not by re-render: React Flow
  snapshots props, so any colour baked into a JS constant goes stale on switch.
- `pnpm gate` green; `docs/design-system.md` §8 unchanged (no shadows, no glow).
- Do not "improve" the layout algorithm. A wide left-to-right band is correct.

**Definition of done.**
- `pnpm gate` clean.
- Two screenshots committed to `img/`: `2026-11-07-graph-light-after.png` and
  `-graph-dark-after.png`, both from the same live analysis, both judged with
  `look_at_image`.
- The dark shot differs from the light shot in the graph itself — edges and node
  text — which is the only proof that theme propagation is real.
- #36 closed with a comment citing the commit and the two files.

**Failure modes.**
- **A theme-aware fix that is only theme-aware on reload.** Watch for it by
  switching theme in the same session and photographing the result.
- **Visibility by darkening everything.** Raising every line to full `fg` defeats
  the hierarchy edges still need; the floor is 3:1, not maximum contrast.
- **A grid behind the graph that competes with the data.** `Background` must sit
  at `line`, not `fg-muted`.
- **Measuring the fix with the fix.** Judging contrast from source values is
  arithmetic; judging it from a screenshot is evidence. Both, in that order.

**Scope.** Not the layout, not zoom-aware label detail, not the inspector, not
#35's categoriser (measured here, not changed), not spec 12 step 5.

## Action plan — factory loop, in order

| # | Step | Loop stage | Check | Trust layer |
| --- | --- | --- | --- | --- |
| 1 | Screenshot the current build (light) | measure | `look_at_image` asks for a fraction, not an adjective | black box |
| 2 | Switch theme in the same session, screenshot dark | measure | the two images differ in the graph itself | black box |
| 3 | Raise edge weight floor; add direction markers | fix the smallest | `pnpm gate` | tooling |
| 4 | Confirm colours come from tokens, not constants | fix the smallest | `grep` for hex in `components/map/` returns nothing | adversarial |
| 5 | Re-shoot both themes | prove it twice | vision on two images, one per mode | black box |
| 6 | Commit images to `img/`, close #36, add a learnings row | write it down | commit cites the images; issue cites the commit | retained context |

Step 4 is the one that would have caught `d0470fc`'s predecessor: the default edge
colour was not in this repo at all, so grepping the repo could never have found it.
That is why the check is "what does the library draw that we did not ask for".
