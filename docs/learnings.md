# Learnings, and what each one changes

Categorised by where the mistake lived. Each entry names the *mechanism* and the
action it produced, because "we learned to test more" is not a learning.

Kept in the order the factory loop uses: measure → read the failure → fix the
smallest thing → prove it twice → write it down. An entry here is the last step,
and it is only worth writing if it changes a check.

## Transport and pairing (bsk)

| Learned | Mechanism | Action taken |
|---|---|---|
| Regenerating a pairing link cannot fix a closed port | `ss -ltn` showed listeners on `52800`, nothing on `5447`; every link pointed at the empty one | `scripts/bsk-daemon.sh` prints `bind:` before `pair:` |
| A version skew looks exactly like a broken client | daemon `0.3.3` / protocol `1.3` vs CLI `1.8` — the extension could never connect | the script prints `cli:` and `daemon version` on `status` |
| An HTTP reverse proxy resets a WebSocket upgrade | 11 × `Connection reset without closing handshake` while `curl` got `502` | the daemon binds the tailnet address with a cert; no proxy in the path |
| `502` proves a route, not an upgrade | I called it proof; it was proof of HTTP only | judgement moved to the daemon log, which names the reset |

## Accessibility

| Learned | Mechanism | Action taken |
|---|---|---|
| A CSS margin is not a space | `Routes` + `ml-1` + `2` announces as `Routes2` | `aria-label` carries the separator; the badge is `aria-hidden` |
| A tool's annotation is not the page's name | `[ctx: …]` was the observer's context, not the tab's accessible name — I filed a defect that did not exist | retracted before it reached an issue |

## Process

| Learned | Mechanism | Action taken |
|---|---|---|
| A rule without a location gets skipped | §0 said "restate the request"; the restatement happened after the first edit | §0.1 names `prompts/NNNN.md` and asks: did anything change before the prompt existed? |
| Evidence that does not outlive a run is not evidence | `scripts/e2e/shots/` is gitignored; the finding vanished with the session | `img/` is tracked, date-named, linked from the issue |

## Verification

| Learned | Mechanism | Action taken |
|---|---|---|
| Structure and appearance fail differently | the semantic tree showed the tab name; only the screenshot showed the knot in the corner | both passes, always: tree for naming, image for scale |
| A screenshot can be measured | "clusters in the lower-middle" became "90% × 85%" | `look_at_image` asks for a fraction, not an adjective |

## Open questions this leaves

- Edge contrast in dark mode has never been measured. `light-dark()` gives one
  value per mode and every check so far looked at light mode.
- The map's label size is below comfortable reading at 960px. Whether that is a
  type-scale problem or a zoom-detail problem is unmeasured — hence prompt 0006
  keeping it out of scope.
