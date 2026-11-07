# 13 — Where UI comes from, other than Velora

Velora is one registry, and most of it is refused by house style. The question
worth answering is not "which registry replaces it" but "what is actually
missing", because the answer changes what is safe to adopt.

## 1. What is already here

`components/` holds 23 hand-built components: `analysis-view`, `category-rail`,
`detail-pane`, `route-table`, `explanation-panel`, `state-mark`, `shell`,
`submit-form`, `theme-control`, plus `landing/` and `map/` and the five `velora/`
blocks. There is **no** `components/ui/` and no primitive dependency at all —
not Radix, not Base UI, not Headless UI. `grep -c 'radix|base-ui' package.json`
is zero.

That single fact decides this document. The visual layer is not thin; the
*behavioural* layer is. Nothing in this app needs another colour, another card, or
another gradient. What it needs is a dialog that traps focus, a tooltip that is
not a `title` attribute, a combobox that handles a thousand repositories, and a
menu that closes on Escape.

## 2. The shortlist, filtered by house style

Two constraints do all the filtering: semantic tokens only (§3) and two densities
(§2). A library that ships its own palette, its own spacing scale, or its own
opinions about shadows cannot be adopted — it would either lose to the tokens or
fight them on every file.

| Source | Licence | Ships | Verdict |
| --- | --- | --- | --- |
| **Base UI** (`@base-ui/react` v1.7) | MIT | 35 unstyled primitives, behaviour only | **Adopt when the first interactive component needs it.** From Radix's authors at MUI, v1.0 in Dec 2025, RSC-aware, and now shadcn's default for new projects. Unstyled means it cannot fight the tokens — it has no CSS at all. |
| **Radix Primitives** | MIT | 30+ primitives, behaviour only | Fine and slightly broader catalogue, but less actively developed. No reason to pick it over Base UI for a greenfield surface. |
| **React Aria** (Adobe) | Apache-2.0 | Hooks, not components | Best accessibility of the three; the heaviest API. Choose it only if we hit a pattern Base UI handles badly. |
| **Ark UI** | MIT | State machines, multi-framework | Solves a problem we do not have (Vue/Solid parity). |
| **shadcn/ui registry** | MIT | Styled components, token-driven | **Adopt selectively.** It reads `app/globals.css` variables, so its neutral theme already maps onto ours. Never run `shadcn init` — it rewrites `globals.css`. |
| **Origin UI** | MIT | Large block library, shadcn-based | **Adopt selectively, re-tokenized.** Closest in taste to what we have; blocks still arrive with `text-gray-*` and get fixed by `design.mjs`. |
| **Kibo UI**, **Float UI** | MIT | Composition blocks | Same treatment as Origin. Small catalogues, low risk. |
| **Aceternity UI**, **Magic UI** | MIT | Motion, gradient, glow | **Refused.** They are the opposite of §8: animated beams, gradient borders, spotlight cards. The house style bans what these are made of, not the licence. |
| **HeroUI**, **NextUI** | MIT | Complete themed kit | **Refused.** Own theme provider and gradient defaults; adopting it means two sources of colour. |
| **Mantine**, **Chakra**, **daisyUI** | MIT | Complete themed kits | **Refused** for the same reason, plus a build-level one: daisyUI's colour system is Tailwind plugin classes that bypass our custom properties entirely. |
| **tweakcn** | MIT | Theme editor exporting CSS vars | Not needed — the twelve sizes and the token layer are already decided and enforced; a theme editor would propose values a script then rejects. |

## 3. What "compatible" means here, mechanically

The gate is the compatibility layer. Any component from any of the sources above
is safe to *try*, because drift cannot ship:

- `scripts/check/design.mjs` fails on `text-gray-*`, `bg-slate-*`, raw hex,
  off-scale type sizes, bare `border`, and off-grid spacing.
- `scripts/check/slop.mjs` fails on gradients, glass/blur, shadows, emoji, eyebrow
  labels, and `01/02/03` markers.
- `scripts/check/guards.mjs` fails if a pulled component drags a server-only import
  into a client bundle.

So the cost of adopting a block is not "will it look wrong forever" — it is the
ten minutes of re-tokenizing, and a machine that says no if that step is skipped.
That is a much better position than picking a registry that happens to be close.

The re-tokenizing procedure, in order, for any pulled file:

1. Replace every colour utility with the semantic name it means:
   `text-gray-500` → `text-fg-muted`, `bg-white`/`bg-neutral-50` → `bg-surface`,
   `bg-neutral-100` → `bg-raised`, `border-*` → `border-line`.
2. Replace arbitrary sizes with the twelve (`text-[11px]`, `text-[13px]`, …) and
   arbitrary spacing with multiples of 4.
3. Delete shadows, gradients, blurs, and any `animate-` that is not a 150–200ms
   transition.
4. Run `node scripts/check/design.mjs && node scripts/check/slop.mjs`.
5. If it survives, it belongs to this project and no longer to the registry.

## 4. The order of adoption

Nothing is installed today, and nothing should be installed for a hypothesis.
Adopt in the order the product needs behaviour:

1. **Dashboard inspector (§12)** — needs none of this at first: it is a panel, not
   a dialog. Build it from tokens.
2. **A repository combobox** — the first genuine need. `@base-ui/react` Combobox,
   ~40KB, unstyled, and the alternative is hand-rolling keyboard handling for a
   list that can hold 5,000 entries.
3. **A command palette / detail dialog** — Base UI Dialog or shadcn's wrapper, once
   a modal actually exists. There is none today.
4. **Nothing else.** Tooltips can be CSS. Menus can be `<details>` (already the FAQ's
   approach). A table is a table.

The rule that keeps this honest: **one primitive dependency, added at the moment a
component needs it, with the check suite as the acceptance test** — not a kit
adopted up front that then shapes what gets built.

## 5. What to do with Velora

Keep it. Five blocks are in use (`file-tree`, `code-block`, `globe`, `marquee`,
`footer-columns`, `spotlight-card`), and the reason most of the catalogue is
refused is that most of any catalogue is marketing. Velora stays as the source for
*structural* marketing blocks — the ones that show a shape rather than decorate a
paragraph. It was never going to be the source for a dense table, and it does not
need to be.
