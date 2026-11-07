# 0011 — The public surface: fewer words, one control, real evidence

## Categorised request

| Kind | Request | Verdict |
| --- | --- | --- |
| **Control** | Theme switch becomes a sun/moon toggle | **build** — three radios for one binary choice is a menu where a switch belongs |
| **Copy** | Remove genericisms from every section | **measure first** — the banned-word list already returns nothing; the genericism is structural, so it is judged from a screenshot |
| **Structure** | Improve header, footer, all sections | **lane** — improvement without a named defect is decoration, so each section gets a finding or nothing |
| **Components** | Use Velora UI / TypeUI `file-tree` components | **build** — `components/velora/file-tree.tsx` already exists and is used by the dashboard empty state; the landing footer/columns are its siblings |

## Outcome

The header carries one theme control that names its action and shows the state as an
icon; the sections say specific things; the footer's columns stay as navigation and
do not become a link dump.

## Constraints

- Tokens only: `currentColor`, `fg`, `fg-muted`, `line`, `accent`. No emoji — a sun
  and a moon are inline SVG paths, not characters.
- The control keeps the cookie (`THEME_COOKIE`) and the `data-theme` attribute that
  `app/layout.tsx` reads, so nothing about first paint changes.
- No new dependency; no animation beyond a colour transition the design system
  already allows.
- A section that cannot name its defect is not edited.

## Definition of done

- `pnpm gate` clean.
- The toggle announces "Switch to dark theme" / "Switch to light theme", and its
  `aria-pressed`/label match the state rather than the icon.
- Screenshot in light and in dark, judged with `look_at_image`: the icon matches the
  mode it is showing.
- Landing screenshots committed to `img/`.

## Failure modes

- **An icon-only control nobody can name.** Solved by the label, not by a tooltip.
- **Losing `system`.** The cookie has three values; the toggle writes two and leaves
  an existing `system` alone until it is first used.
- **"Improved" sections with no defect named.** The failure mode this prompt exists
  to prevent.

## Scope

- Not the app surfaces, not the map, not the dashboard.
- Not a redesign of the hero: it is measured first, and a finding is needed before a
  line of it moves.
