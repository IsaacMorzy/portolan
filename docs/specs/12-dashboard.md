# 12 — The dashboard, architecturally

The dashboard is not a landing page with a table in it. It is the surface people
keep open in a second window while they work, and everything below follows from
one sentence: **it should feel like an instrument, not a brochure.**

That sentence decides the blocks question before taste gets a vote.

## 1. Why most Velora blocks do not belong here

`docs/design-system.md` §2 sets two densities on one token base: marketing runs
80/112/128px of padding and up to 80px of type; the product runs 16–24px and never
above 32px. A product screen never borrows a marketing size. Checked against the
132 registry items, that rule alone removes:

| Block family | Why not, specifically |
| --- | --- |
| `marquee`, `logo-cloud`, `testimonial-*` | Social proof sells a product to someone who does not have it yet. A signed-in user already bought. |
| `spotlight-card`, `glass-*`, `gradient-*` | Blur and gradients are banned by §8; they also cost a compositing layer per card on a surface that is mostly text. |
| `hero`, `cta-band`, `pricing-*` | Marketing density, and they ask for a decision the user already made. |
| `bento-grid`, `feature-grid` | Card grids imply equal importance. The three things on this screen are not equally important: the table is 80% of it. |
| `stats-band` with invented numbers | §8, and a dashboard claiming fabricated figures is worse than one claiming none. |

What survives is three blocks that are **structural** rather than decorative, plus
one that is a table — and the table is hand-built, because no registry table knows
our columns.

## 2. Anatomy

```
┌───────────────────────────────────────────────────────────────┐
│ status strip  · org name · counts · submit form · refresh      │  36px
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ analyses table (sticky head, 28px rows, tabular numerals)     │  fills
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ inspector: what the selected analysis is, and what it found   │  0 or 280px
└───────────────────────────────────────────────────────────────┘
```

Three regions, in the order the eye needs them: **where am I** (strip), **what do
I have** (table), **what does this one mean** (inspector).

### 2.1 Status strip — 36px, `h-9`

One line, no card, no shadow: the workspace name, a count, the submit form, and a
tally of states (`3 running · 12 done · 1 failed`). It is a header, not a hero —
it never grows, and it never repeats what the table already says in full.

The tally uses the state marks the table uses, at the same 11px. A legend that
looks different from the thing it explains is decoration.

### 2.2 The table — the whole product

This exists and is right: `table-fixed`, `border-collapse`, a `colgroup` that
gives the commit column a fixed width so rows cannot reflow as hashes arrive,
sticky `thead` on `bg-canvas`, `tabular-nums` on every number. Row height 28px.
Two columns collapse under `sm`.

The only addition worth making is **selection**: clicking a row opens the
inspector instead of navigating away. Navigating is what a list does when it has
no room to say anything; this screen has room.

### 2.3 The inspector — where the Velora blocks earn their place

Three blocks, each doing a job the table cannot:

| Component | Section | Job |
| --- | --- | --- |
| `components/velora/file-tree.tsx` | **Empty state**, and a collapsed "what a map contains" | Shows the shape of the answer to someone who has not run one yet. A sentence cannot; a small tree can. |
| `components/velora/code-block.tsx` | **Inspector → how to reproduce**, and failure detail | A failed analysis with a 400-character error is a wall of text in a table cell and readable in a code block. Also the CLI line, which is real code. |
| `components/velora/footer-columns.tsx` | Not on this screen | It is a marketing footer. Listed here because "which blocks did you consider" is a question the next person will ask. |

That is the entire Velora budget for the dashboard: **two components, both in the
inspector, neither on the table itself.** The beauty here comes from alignment,
density and one accent, not from borrowed sections — a dense table with correct
numerals looks more considered than a grid of glass cards, and it stays readable
at 11px, which the cards do not.

## 3. States, because a dashboard is mostly not the happy path

Every region has four, and each is designed rather than left to fall through:

| State | Strip | Table | Inspector |
| --- | --- | --- | --- |
| **Empty** | submit form, no tally | one sentence + `file-tree` sample | closed |
| **Running** | tally with `StateMark` | rows at 28px, stage text, no spinner | stage timeline |
| **Failed** | tally counts it | error truncated to one line | full error in `code-block`, retry |
| **Stale** | tally marks it | dimmed mark, `refreshed_at` visible | commit before/after |

Stale is the state that matters most and is cheapest to get wrong: `isStale()` is
computed **at request time**, not in the browser. Nothing ticks, so nothing drifts
and no client component is needed to keep it honest.

## 4. Rules this screen inherits

- Semantic tokens only: `canvas surface raised line fg fg-muted accent accent-fg`.
  No `text-gray-*`, no `bg-slate-*`, no raw hex — `scripts/check/design.mjs` fails the build.
- Twelve sizes: 11px labels and marks, 12px body, 13px the org name, 20px the one
  number that is the point of the screen. Nothing larger on this surface.
- 4pt spacing. Row height 28px, strip height 36px, cell padding 12px.
- Motion: 150ms on row hover and inspector open. No scroll reveals, no skeleton
  shimmer — a skeleton that shimmers is a marketing idea about waiting.
- One accent. `accent` marks the selected row and the primary action; `incoming` /
  `outgoing` / `kind-1..4` are reserved for the graph, not for decoration here.

## 5. Acceptance

Not opinions — the four things that can be checked:

1. `pnpm e2e` audit passes on `/dashboard`: one `h1`, every control named, painted
   text over 120 characters, viewport fits at 375px.
2. `scripts/e2e/budget.mjs` type scale passes: every rendered size is in the twelve,
   in both themes.
3. Contrast: `accent` on `canvas` and `fg-muted` on `canvas` clear 4.5:1 in both
   themes. `fg-muted` is the one that fails quietly, because it is used for labels.
4. The table renders 100 rows without the strip or the head moving — sticky held
   by a scroll container, not by `position: sticky` on a table that has none.

## 6. Order of work

1. Inspector shell + selection state (table → inspector, no navigation).
2. `code-block` for failure detail and the CLI line.
3. `file-tree` in the empty state.
4. Strip tally refined to the twelve sizes and the 28px row rhythm.
5. Anything else, only after the four above pass §5.

Which is also the answer to "why not rebuild it from blocks": the table is already
the hardest part and it is already right. What is missing is the second half —
selection and inspection — and that is two components, one route, and no new
dependency.
