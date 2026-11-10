---
name: find-color
description: Recommend curated color directions (ground and figure pairs in OKLCH) from the no-slop-color library for a brand, website or product brief. Use when choosing colors or a palette for a project, or replacing a generic default palette.
argument-hint: <brief, e.g. "premium halal fine-dining restaurant">
---

The library lives at `~/Documents/no-slop-color` (override with `$NO_SLOP_COLOR`). Every color you show comes from `library/directions.json` through `tools/query.mjs`. **Never invent, adjust or estimate a color value or a contrast ratio.**

Brief:

$ARGUMENTS

## 1. Gather context

- **Brief.** If it is empty, infer one from the current project and say what you inferred.
- **Codebase, if present.** Read the package name and description, the first paragraph of the README, and any existing brand colors: CSS custom properties, Tailwind theme colors or design tokens. Pass at most one existing brand color as `--existing`.
- **Constraints the user gave.** Map them to flags:

  | User says | Flag |
  | --- | --- |
  | Must work in dark mode, or the room or site is dark | `--foundation dark` |
  | Light, airy, or must print on white | `--foundation light` |
  | Photography-heavy, or the product supplies the color | `--prefer quiet` |
  | Bold, loud, or must stand out | `--prefer bold` |
  | No red | `--avoid-hues 0-40,345-360` |
  | No orange | `--avoid-hues 40-70` |
  | No gold or yellow | `--avoid-hues 70-110` |
  | No green | `--avoid-hues 120-175` |
  | No blue | `--avoid-hues 220-275` |
  | No purple or violet | `--avoid-hues 280-330` |
  | No pink | `--avoid-hues 330-360,0-15` |
  | Show more or other options | `--exclude <ids already shown>` |
  | A number of options | `--count N` (default 4, maximum 5) |
  | Follow the category's usual colors | `--convention follow` |
  | Avoid the category's usual colors | `--convention avoid` |

## 2. Read the brief

Choose domain ids from `contexts/domains.json`, matching labels and aliases. A project often spans two or three domains.

Write down what you assumed about audience, positioning and setting, and keep it short. **Do not apply stereotypes:** a religious, cultural or national descriptor does not imply a color. Only follow a color convention when the user asks for it, and say so.

Pick two to four open questions that would change the answer. Use the `differentiators` the query returns, and keep only the ones this brief leaves open.

## 3. Query the library

```bash
cd "${NO_SLOP_COLOR:-$HOME/Documents/no-slop-color}"
node tools/query.mjs --domains <ids> --brief "<brief>" [flags]
```

The query is deterministic and returns 3 to 5 directions that differ in primary classification or in clearly different foundation, structure, hue or lightness. Use its output exactly. If `notes` says some directions come from related domains or the general library, say so in one line.

The query also returns `conventions`: sourced category patterns from `contexts/conventions.json` that apply to these domains. Each has a stance:

| Stance | Meaning | How to present it |
| --- | --- | --- |
| `context` | A real, sourced category convention, such as blue in finance | State it with its evidence and confidence. The query includes at most one direction that follows it, and you say which |
| `preferred` | The tasteful default for the category, such as black or black-and-white for luxury | Say it is the preferred direction for this category. These rank higher |
| `cliche-risk` | A common but easily clichéd pattern, such as gold | If a selected direction follows it, say so in that direction's Watch out |

## 4. Present in exactly this format

```
/find-color "<brief>"

────────────────────────────────────────
Reading
────────────────────────────────────────
I treated this as:
• Domains: <ids>
• <assumption>
• <assumption>
• <any constraint you applied, e.g. "No gold: hues 70–110 excluded">
• Category convention: <convention summary, with its evidence and confidence>. <Direction N> follows it; the others deliberately do not.   (only when the query returns a context or preferred convention)

Open questions that would change the recommendation:
• <question>
• <question>

────────────────────────────────────────
<N> directions
────────────────────────────────────────

1. <name>
   <primary.label> · <twoAxis.foundation> foundation · <contrast tag>
   Ground: <ground.name> <ground.hex>  ·  Figure: <figure.name> <figure.hex>[  ·  Accent: <accent.name> <accent.hex>]
   OKLCH: ground <l c h> · figure <l c h>

   Why this one
   <one or two sentences built only from the reasoning claims. Mark any interpretation as such, e.g. "(interpretation)">

   Use for
   <useFor, joined>

   Watch out
   <watchOut>

   Key numbers
   Figure on ground: <keyNumbers.figureOnGround>:1
   Body text on ground: <keyNumbers.bodyTextOnGround>:1
   Button label on fill: <keyNumbers.button.ratio>:1

<repeat for each direction>

────────────────────────────────────────
Recommendation
────────────────────────────────────────
Start with <name> <one-line reason tied to the brief or an open question>.
<one line per alternative: "Choose <name> if <condition>.">

Tell me which direction to develop and I'll expand the usage, the derived text colors, the tints and shades, and a light or dark counterpart.
```

## Rules

- Every HEX, OKLCH and ratio comes from the query output. Copy, do not compute.
- Every "Why this one" sentence comes from that direction's `reasoning`. `measured` claims can be stated as fact. `interpretation` claims must read as judgement.
- Always show the Reading and the open questions.
- Always end with a concrete starting recommendation and a next action, never just a list.
- Never present two directions that the query did not select, and never reorder them to imply a ranking the query did not give, except in the Recommendation section.
- If a direction's `flags` mention a review band or a near-threshold value, add a short note to Watch out.
- State a convention only as the query returns it. Never add a percentage, a study or a convention that is not in `conventions`, and never present one as a rule the user must follow.
- Conventions listed under `unverified` in `contexts/conventions.json` (for example red for food) are not shown as facts.

## 5. When the user picks a direction

Run the query again with `--full` (and `--exclude` for the others if useful) and expand from `direction`:

- `usage.assignments`, `do` and `avoid`.
- `classification.derived`: text neutrals, tints and shades, with HEX and OKLCH.
- `accessibility.pairs` and their intended uses.

Offer CSS custom properties, using only these values:

```css
:root {
  --color-ground: oklch(L C H);
  --color-figure: oklch(L C H);
  --color-text: oklch(L C H);
  --color-text-muted: oklch(L C H);
}
```

If the user wants a light or dark counterpart, run the query again with the opposite `--foundation` and the same domains, and present the closest option. The library does not yet link counterparts.
