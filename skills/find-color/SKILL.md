---
name: find-color
description: Pick tasteful color pairs (ground + figure, in OKLCH) for a brand, website or product from the curated no-slop-color library, and apply them as CSS, Tailwind or design tokens. Use when choosing colors or a palette for a project, or replacing a generic default palette.
argument-hint: <brief, e.g. "premium halal fine-dining restaurant">
---

# find-color

The engine is `scripts/find-color.mjs`, in the same folder as this file. It holds the whole curated library and needs only Node 18 or later, with no install and no network.

```bash
node <this-skill-folder>/scripts/find-color.mjs <command> ...
```

**Never invent, adjust or estimate a color value or a contrast ratio.** Every color you show or write comes from this script.

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
  | Follow the category's usual colors | `--convention follow` |
  | Avoid the category's usual colors | `--convention avoid` |
  | Show more or other options | `--exclude <ids already shown>` |
  | A number of options | `--count N` (default 4, maximum 5) |

## 2. Read the brief

Choose domain ids. `node scripts/find-color.mjs domains <word>` searches the 89 domains by label and alias. A project often spans two or three domains.

Note what you assumed about audience, positioning and setting, briefly. **Do not apply stereotypes:** a religious, cultural or national descriptor does not imply a color. Only follow a color convention when the user asks for it or the query returns it, and say so.

## 3. Recommend

```bash
node scripts/find-color.mjs recommend --domains <ids> --brief "<brief>" [flags]
```

The result is deterministic JSON:

| Field | Contents |
| --- | --- |
| `directions` | 3 to 5 clearly different pairs: ground and figure in HEX and OKLCH, labels, key contrast numbers, `chooseIf`, `watchOut`, `reasoning` and `follows` |
| `pick` | The engine's default choice and why |
| `openQuestions` | Facts that would change the choice |
| `conventions` | Sourced category patterns. `context`: at most one direction follows it. `preferred`: the tasteful default, such as black and white for luxury. `cliche-risk`: such as gold, always flagged |
| `notes` | For example, when some directions come from related domains |

## 4a. Interactive mode (default, and always when the user typed /find-color)

Present the result in exactly this format, then wait for the user's choice:

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
• Category convention: <summary, evidence, confidence>. <Direction N> follows it; the others deliberately do not.   (only when the query returns a context or preferred convention)

Open questions that would change the recommendation:
• <question>
• <question>

────────────────────────────────────────
<N> directions
────────────────────────────────────────

1. <name>
   <primary.display_label> · <primary.foundation> / <primary.structure> · <contrast tag>
   Ground: <ground.name> <ground.hex>  ·  Figure: <figure.name> <figure.hex>[  ·  Accent: <accent.name> <accent.hex>]
   OKLCH: ground <l c h> · figure <l c h>

   Why this one
   <one or two sentences built only from the reasoning claims; mark interpretation as such>

   Choose if
   <chooseIf>

   Watch out
   <watchOut, plus any flag about a review band or near-threshold value>

   Key numbers
   Figure on ground: <keyNumbers.figureOnGround>:1
   Body text on ground: <keyNumbers.bodyTextOnGround>:1
   Button label on fill: <keyNumbers.button.ratio>:1

<repeat for each direction>

For a direction with kind "image-led" (no ground), replace the color and number lines with:
   Image-Led · no ground: type on imagery · <contrast tag>
   Type: <figure.name> <figure.hex>  ·  Scrim: <scrim.name> <scrim.hex> at <scrim.opacity × 100>%
   Imagery: <imagery>
   Key numbers
   Type on any image under the scrim: <keyNumbers.typeOnWorstCaseImagery>:1
   Type on a solid scrim panel: <keyNumbers.typeOnScrim>:1
Never invent a ground for it.

────────────────────────────────────────
Recommendation
────────────────────────────────────────
Start with <pick.name>: <pick.reason, tied to the brief or an open question>.
<one line per alternative: "Choose <name> if <chooseIf>.">

Tell me which direction to develop and I'll apply it: tokens, derived text colors, tints and shades.
```

## 4b. Autonomous mode (the user told you to choose, or you are mid-build)

1. Start from `pick`. Switch to another direction only when its `chooseIf` clearly matches what you know about the project and the pick's does not.
2. Apply it (step 5).
3. Tell the user in one or two lines what you chose, why, and the main alternative, for example: "Used Parchment and Ink (Neutral, 14.19:1) because the site is photography-led; Lacquer Room is the dark alternative."

## 5. Apply

```bash
node scripts/find-color.mjs apply <direction-id> --format css|tailwind|tokens [--prefix color]
```

It prints JSON with:

- `text`: CSS custom properties with HEX fallbacks and OKLCH values, a Tailwind v4 `@theme` block, or W3C design-tokens JSON.
- `tokens`: ground, figure, accent, text, muted text, tints and shades. An Image-Led direction gives figure, scrim (with its opacity) and accent only: no ground.
- `roles`: which element uses which token.
- `contrast`: each tested pair with its intended use.
- `do`, `avoid` and `watchOut`.

Add `--text` to print only the tokens. Write them into the project's existing theme: CSS variables, the Tailwind theme or a tokens file. Follow `roles` for which element gets which token, and keep every text pair to the uses listed in `contrast`.

## Other commands

- `get <id>`: the full direction record.
- `classify --ground <color> --figure <color> [--accent <color>] [--area 80/20]`: measure and classify a pair the project already has.
- `classify --figure <color> --scrim <color> --opacity <0-1>`: measure type on imagery under a scrim (Image-Led), against the worst-case image.
- `conventions`: the sourced category conventions and the claims deliberately not used.

## Rules

- Every HEX, OKLCH and ratio comes from the script. Copy it, do not compute it.
- "Why this one" uses only the direction's `reasoning`. `measured` claims can be stated as fact. `interpretation` claims must read as judgement.
- Always show the open questions in interactive mode.
- State a convention only as the query returns it. Never add a percentage, a study or a convention that is not in `conventions`, and never present one as a rule the user must follow.
- Never show directions the query did not return.
