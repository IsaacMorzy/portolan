# The design system

The rules that keep this product from looking like every other AI-built developer
tool. Written down because an unwritten system is a series of arguments.

Sources: the token layer in `app/globals.css` is the implementation. This file is
the reasoning. Where they disagree, the CSS wins and this file is wrong — fix it.

---

## 1. What this product is

A map of a codebase, for a person deciding whether a change is safe. That single
sentence settles every layout question below. The reader is looking at **code
they did not write**, trying to answer **"what breaks if I touch this."**

Two consequences:

- **Code is the content, not the decoration.** Panels, chrome and labels recede.
  Any element that draws the eye away from a filename or an edge is a bug.
- **Density is a feature.** A map that shows eleven nodes is a diagram. A map
  that shows two hundred is an answer. Marketing pages breathe; product pages
  compact. Getting these backwards is the most common way a tool like this reads
  as unserious.

## 2. Two densities, one token base

Borrowed from how Sourcegraph split its own product: an IDE-like surface for
code, a web-application surface for everything else. They share tokens and
differ in rhythm.

| | **Marketing** (`/`, `/security`) | **Product** (`/dashboard`, `/analyses/:id`) |
|---|---|---|
| Line length | 60–70ch prose | files and edges, no prose column |
| Section padding | 80px mobile / 112px desktop | 16–24px |
| Type scale use | display 56/80, lead 17 | 11–15 only, never above 32 |
| Chrome | one nav, one footer | header strip, no footer |
| Contrast | `fg` for headlines, `fg-muted` for support | `fg` for everything the reader acts on |
| Density | one idea per band | as many rows as fit without scrolling |

The rule that follows: **a product screen never borrows a marketing size.** An
11px label on a marketing page is a mistake; a 56px headline on the map is a
bigger one.

## 3. Colour

Six semantic tokens and no raw hex anywhere outside `globals.css`. This is not
tidiness — Tailwind v4 resolves `border` to `currentColor`, so a stray `border`
class renders near-white in dark mode, which is how this project shipped a
broken file tree once already.

### The palette

| Token | Light | Dark | Job |
|---|---|---|---|
| `canvas` | `#fafafa` | `#0c0c0d` | page |
| `surface` | `#ffffff` | `#131315` | panels, cards, code blocks |
| `raised` | `#f0f0f2` | `#1d1d20` | inputs, hovered rows, nested panels |
| `line` | `#dcdce2` | `#3f3f47` | every border and divider |
| `fg` | `#18181b` | `#e6e6e9` | primary text |
| `fg-muted` | `#63636b` | `#9d9da7` | support text only |
| `accent` | `#2563eb` | `#4f8bff` | the one action, focus rings, active state |
| `accent-fg` | `#ffffff` | `#0c0c0d` | text on accent |

Graph semantics carry their own hues, and they are the only other colour in the
product: `incoming` (what imports this), `outgoing` (what this imports),
`kind-1..4` (edge kinds), `edge` (the lines themselves).

### Why `accent-fg` inverts

`--accent` is deliberately brighter in dark mode, because a dim blue on near-black
reads as disabled. That brightness means white text on it only reaches **3.25:1**.
The foreground inverts instead of the accent dimming: `#0c0c0d` on `#4f8bff` is
**6.02:1**, and the accent still clears **6.02:1** against canvas for link text.
Darkening the accent would have fixed the button by dropping every accent link to
**3.76:1** — saving the smaller surface and breaking the larger one.

This is the whole method: **measure both ends of a swap before choosing which end
to move.**

### Contrast floor

Everything that paints text clears WCAG AA — **4.5:1** normal, **3:1** large
(≥24px, or ≥18.66px bold). Measured, not assumed, in **both themes**, by
`scripts/e2e/budget.mjs`, which walks every element that renders its own text,
resolves the background by ancestor walk, and computes the ratio from the numbers
the browser reported.

A pair that passes and still looks wrong is a size or weight problem, not a
colour problem. `fg-muted` at 12px is legal and muddy; at 13px and up it is right.

## 4. Type

Two families, both Geist, no third. Sans for interface and prose, mono for
identifiers and **only** identifiers — a filename, a commit sha, a command. Mono
on a prose sentence is a costume.

### The scale

Twelve sizes. This is the measured set the product renders, and every one of them
is now deliberate:

| px | use |
|---|---|
| 11 | labels, badges, SVG annotations |
| 12 | micro-copy, table headers, metadata |
| 13 | default UI text (buttons, nav, dense rows) |
| 14 | inputs, secondary body |
| 15 | body prose on marketing pages |
| 17 | lead paragraph, card titles |
| 20 | sub-heads |
| 26 | section headline (small) |
| 32 | section headline |
| 40 | page headline |
| 56 | hero headline (sm) |
| 80 | hero display |

It is roughly a 1.25 ratio in the body range and widens at display, which is
normal: ratios that hold perfectly at 80px produce a 19.5px and a 24.4px nobody
wants.

`9px` was in this product on SVG node labels. It was below readable at any
distance and is now 11px.

### Rules

- **Line height by size.** 1.6 below 15px, 1.5 at body, 1.25 at 20–32, 1.08 above
  40. Copy-pasting one value everywhere is how headlines get airy and text gets
  cramped.
- **Tracking at display only.** `-0.02em` above 40px. Never on body text.
- **Headlines ≤ 2 lines.** If it needs three at desktop, the headline is doing the
  subtitle's job.
- **No eyebrows.** A small all-caps label above a heading is a tell.
- **No monospace outside real code.**

## 5. Space

A 4pt grid, and only these values: **4, 8, 12, 16, 20, 24, 32, 48, 64, 96, 128.**

- Inner group (icon → label): **8**
- Component padding: **12–16**
- Between related blocks: **24**
- Between sections, product: **32–48** (`py-8` to `py-12`)
- Section padding, marketing: **80px / 112px** (`py-20 md:py-28`), and **128px** (`py-32`) for the closing band, which gets more air because nothing follows it to carry the eye onward

**Padding is what you set; the gap is what results.** A section with `py-28` top
and bottom puts **224px** of air between the last text of one band and the first
text of the next. An earlier draft of this file said "96–128px between sections",
which was measuring the padding and calling it the gap — the kind of error that
makes a reader trust the wrong number and then fight the CSS.

Spacing carries hierarchy. Two blocks 16px apart are one thing; the same two 48px
apart are two things. A section that needs a border to separate it from the
previous one needs space instead.

## 6. Shape and depth

- Radius: **4px** controls, **6px** panels, **8px** containers. Nothing rounder.
- **No shadows.** Depth is `surface` on `canvas`, `raised` on `surface`, and
  `line` when a boundary must be explicit. Shadows on a dark canvas are invisible
  smudges; on a light one they are the default Bootstrap look this system exists
  to avoid.
- **No gradients.** Not subtle ones, not as a "wash", not on text.
- **No glass, no blur.** Behind nothing. `backdrop-filter` costs frames to make
  text harder to read.
- One-pixel rules are borders between real regions, never ornament under a
  heading.

## 7. Motion

- **150–200ms, ease-out.** Nothing longer.
- **State changes animate; entrances do not.** A row highlighting on hover is
  feedback. A section sliding in is decoration.
- **No scroll-triggered reveals.** The reader scrolled; they already know
  something changed.
- **No looping animation**, with one sanctioned exception: the hero globe, which
  is a demonstration of the product, not an ornament, and stops under
  `prefers-reduced-motion`.
- `prefers-reduced-motion` disables all of the above. Every time.

## 8. The don'ts

Each of these shipped in this repository at least once.

| Don't | Because |
|---|---|
| emoji as iconography | renders differently per OS, knows nothing about our intent |
| pill/badge spam | four pills per card is a tag cloud with no tags |
| `01 / 02 / 03` section markers | sequence is not information |
| uniform card grids | six identical cards means six things that could have been a list |
| indigo→violet gradients | the single most reliable "AI made this" signal |
| centered everything | a left axis is what makes a page readable |
| atmospheric background blobs | decoration that spends frames to say nothing |
| raw hex in a component | the theme cannot reach it; light/dark breaks quietly |
| `text-[<arbitrary>]` for a new size | twelve sizes exist; a thirteenth is a decision, not a shortcut |
| invented statistics | a number without a source is a liability with a font |

## 9. How the system is enforced

Not by review, because review only sees what gets reviewed.

| Check | Catches |
|---|---|
| `scripts/e2e/budget.mjs` — contrast, both themes | the `accent-fg` class of bug |
| `scripts/e2e/budget.mjs` — type scale membership | a thirteenth size sneaking in |
| `scripts/e2e/budget.mjs` — CLS < 0.02, one `h1`, no sideways scroll | layout regressions |
| `scripts/e2e/landing.mjs` — 390px horizontal overflow | mobile-only collapse |
| `scripts/e2e/audit.mjs` — status, one `h1`, named controls, description length | soft 404s and unlabelled controls |
| `scripts/e2e/screenshots.mjs` + a vision pass | "passes the numbers, looks wrong" |
| `scripts/check/design.mjs` — off-scale sizes, bare `border`, off-grid spacing, non-token colours | drift in source, before it reaches a browser |
| `scripts/check/slop.mjs` — gradients, default palette, glass, shadows, emoji, eyebrows | the §8 list, mechanically |
| `scripts/gate.sh` | all of the above, in one list — run bare by the commit hook, with `--full` by CI |
| `scripts/check/secrets.mjs` | a credential reaching a commit |
| `scripts/check/guards.mjs` | an entry point without a guard, a secret-key client in a browser bundle, a paid route without a limit |
| `scripts/check/bar.mjs` | a suppression added instead of a fix |

When a defect escapes, **add a check**. A note in this file is not enforcement —
this file is already the note that the last defect ignored.

## 10. Extending it

Adding a surface:

1. Pick the density — marketing or product. Section 2.
2. Reach for a token. If the token you need does not exist, the question is
   whether the design needs a new **concept** or is drawing the wrong thing.
3. Use a size from section 4 and a value from section 5. Neither list is a
   suggestion.
4. Run `pnpm e2e`. It will tell you if either theme disagrees.

---

## 11. The TypeUI tools

`https://mcp.typeui.sh` is authenticated (hermes, 24 tools). The vendored skill is
the offline path; the MCP is the live one. They answer different questions, and
using the wrong one is how a hand-built system gets replaced by a generic one.

| Group | Tools | Use it here for |
|---|---|---|
| **Account** | `get_current_user`, `check_access`, `get_usage` | Checking the session or a quota before a long generation run. Nothing else. |
| **Design systems** | `list_design_systems`, `install_design_system`, `install_fundamentals`, `list_workspace_design_systems`, `install_workspace_design_system`, `list_workspace_design_system_versions` | Starting a **different** product. `install_fundamentals` is how `.agents/skills/typeui-fundamentals/` was produced. |
| **UI generation** | `start_ui_generation`, `get_next_section`, `get_section_prompt`, `list_prompt_sections`, `report_section_cleanup`, `finalize_ui_generation`, `get_started`, `setup_workflow` | `get_section_prompt` when a *new* surface needs a starting shape. Never to regenerate what exists. |
| **Insights** | `insights_list_websites`, `insights_get_overview`, `insights_get_timeseries`, `insights_get_breakdown`, `insights_compare_websites`, `insights_get_revenue`, `insights_get_search_performance` | Traffic and search data for a verified site. Requires a site linked to the TypeUI account; irrelevant until there is one. |

### The rule

**`docs/design-system.md` wins. Always.**

TypeUI's generation tools produce a coherent system from a prompt — for a project
that has not decided what it is. This one has decided: semantic tokens only, two
densities, twelve sizes, no gradients, no shadows, and nine measured checks that
fail the build. `start_ui_generation` would hand back something defensible and
generic, and every check would still pass while the product got less specific.

So the split is by question:

| Question | Tool |
|---|---|
| "What size belongs here?" | This document §4 |
| "How much space between these?" | This document §5 |
| "Is this hierarchy right?" | `typeui-fundamentals` skill (offline, free) |
| "Give me a shape for a pricing page I have not designed" | `get_section_prompt` |
| "What does the registry have for a docs site?" | `list_design_systems` |
| "Is the app fast for real visitors?" | `insights_*`, once a site is linked |

Two things the tools cannot do: they cannot see the twelve-size scale or the
contrast floor, so a generated section will need auditing, and `budget.mjs` is
the audit. Run it before believing any generated UI.

### Client status

| Client | State |
|---|---|
| hermes | **on** — authenticated, 24 tools |
| opencode | configured, awaiting its own authorize |
| pi | disabled — `free-pi-cli` exposes no OAuth command, so the flow cannot complete. The vendored skill is the path there. |
