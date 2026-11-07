# 0010 — Informational richness, lane by lane

## Outcome

The three surfaces say more with the same pixels: the graph shows the repo's shape,
the canvas answers "what is this node" without a side trip, and the dashboard lets
two runs be compared by reading a column instead of opening two inspectors.

## Constraints

- Filed first: map **#38**, lanes **#39/#40/#41**. Nothing built outside a lane.
- Tokens only; no new dependency; no new panel unless a fact has nowhere else to go
  (§8 of the design system already refuses decoration).
- Measurements before changes: every lane names the number or the image that says
  it is done.
- Matt Pocock's shape: a map that holds the work, children as lanes, one lane open
  at a time, each with a check the agent cannot soften.

## Definition of done

Per lane. For this prompt: lanes are filed, the map links them, and the standing
rule is written into `AGENTS.md` and `CLAUDE.md` so the next session cannot start a
side quest without noticing.

## Failure modes

- **Richness as furniture.** A second panel, a badge, a sparkline — each is a claim
  that a reader needs it, and none is checkable. The test: name the decision the
  fact changes.
- **A lane with no check.** "Make the map better" is not a lane.
- **Folding by default that hides the answer.** A folded graph can omit the very
  edge somebody opened the page to see; the threshold and the fold state have to be
  argued against a real repo, not a toy one.

## Scope

- Not the inspector's facts (already complete), not the empty state, not the rail's
  colours.
