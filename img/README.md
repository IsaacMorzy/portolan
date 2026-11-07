# img/

Screenshots of findings, committed on purpose.

`scripts/e2e/shots/` stays gitignored: those are measurements taken during a run
and they are worth nothing once the run is over. This folder is the opposite — it
holds the evidence that a claim was checked by looking, so a later reader can see
what "the map clusters in the lower-middle" meant without re-authenticating.

Rules:

- One image per finding, named `YYYY-MM-DD-<screen>-<what>.png`.
- The pull request or issue that makes the claim links the file.
- Never crop so that the defect leaves the frame; an image that has been tidied
  is worse than no image, because it looks like evidence.
- No secrets, no tokens, no session cookies. A browser screenshot of a signed-in
  page is fine; a screenshot of a developer tools cookie panel is not.
