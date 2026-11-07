# 0015 — The header becomes a menu; the page gets a floor

## Categorised request

| Kind | Request | Verdict |
| --- | --- | --- |
| **Menu** | "Awesome" header menu with Velora blocks | **build** — a grouped two-column panel with an end card, replacing a flat list |
| **Index** | Improve the page in all respects | **build** — anchors clear the sticky header, one focus ring for links, a skip link and a `main` landmark |

## Constraints

- Tokens only; `ring-1 ring-line` rather than a bare `border` (the design check refuses the latter, correctly).
- No new dependency, no second palette from Velora: structure only.
- The panel must be keyboard-usable: `aria-expanded`, `aria-controls`, Escape returns focus to the trigger.

## Failure modes

- A "mega menu" that is one long column with more padding — a sitemap wearing a dropdown.
- Scroll-spy that writes `aria-current` on a link whose section is not visible.
- A skip link that is visible all the time and becomes a second header.

## Definition of done

- `pnpm gate` clean; screenshot of the open panel judged; anchors land below the header.
