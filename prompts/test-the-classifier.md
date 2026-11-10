# Test the no-slop-color classifier

You are testing **no-slop-color**, a color classification system for AI agents:
https://github.com/victornasar/no-slop-color

Your job is to use it as an agent would, then report what worked, what broke and what was confusing. Do not modify the repository. Put all your work in a separate scratch folder.

## Setup

1. Clone the repo: `git clone https://github.com/victornasar/no-slop-color.git`
2. Read, in this order:
   1. `README.md`
   2. `docs/02-classification-system.md`
   3. `prompts/classify-pair.md`, which are your instructions for classifying
   4. `docs/03-data-model.md`
   5. `contexts/domains.json`, which holds the industry ids
3. Confirm the tools run (Node 18 or later, no install needed):
   ```bash
   node tools/classify.mjs --ground "oklch(0.95 0.02 90)" --figure "oklch(0.62 0.06 140)" --area 80/20
   node tools/build.mjs examples
   ```

## Key rules

- A color direction is a **pair**: a ground color and a figure color, with an optional small accent and an area split such as `80/20`.
- OKLCH is the source of truth. Every color must have OKLCH and HEX values.
- Run `tools/classify.mjs` first. Then fill in only the judgement fields the prompt allows: aesthetic, composition, Natural/Industrial/Pastoral, confirming Earthy, industry, summary, and lowering confidence or setting Unresolved.
- Never edit a measured value and never invent a color the script did not produce.

## Task 1: classify known pairs

Classify each pair below and save each result as JSON in your scratch folder. For each one, say whether you agree with the primary label and the measured tags, and why.

| # | Ground | Figure | Accent | Area |
| --- | --- | --- | --- | --- |
| 1 | `#0E0E0E` | `#F2F2F2` | none | 85/15 |
| 2 | `oklch(0.96 0.015 85)` | `oklch(0.42 0.09 35)` | none | 80/20 |
| 3 | `oklch(0.22 0.03 160)` | `oklch(0.78 0.11 85)` | none | 75/25 |
| 4 | `#FFFFFF` | `#2779A7` | `#ECD06F` | 80/15/5 |
| 5 | `oklch(0.55 0.2 30)` | `oklch(0.95 0.01 90)` | none | 70/30 |
| 6 | `oklch(0.45 0.16 262)` | `oklch(0.75 0.15 60)` | `oklch(0.85 0.14 120)` | 50/30/20 |

## Task 2: a real brief

Brief: **"I'm creating a premium halal fine-dining restaurant."**

There is no curated library yet, so you will propose the pairs yourself:

1. Pick domain ids from `contexts/domains.json` and write down your assumptions about audience, locale and positioning. List the open questions that would change your answer.
2. Propose **4 clearly different directions**, each a ground and figure pair in OKLCH, with an optional accent and an area split. Aim for different primary labels or two-axis values, not four variations of one idea. Avoid stereotypes: halal does not imply a particular color.
3. Run each pair through `tools/classify.mjs`, then complete the judgement fields following `prompts/classify-pair.md`.
4. For each direction, write:
   - A name.
   - Two or three reasoning claims labelled `measured` or `interpretation`. Every number must come from the script output.
   - Usage notes: which elements use ground, figure, accent and the derived text colors.
   - The WCAG ratios for body text and the main button, taken from the script output.
5. Save the four results as one JSON array.

## Task 3: report

Write a short report covering:

1. **Correctness:** any label, tag, measurement or derived color that looks wrong, with the exact input that produced it.
2. **Taxonomy fit:** pairs where the eight-way primary felt forced, whether the two-axis model described them better, and any Unresolved cases with your proposed label.
3. **Overlapping tags:** secondary tags you couldn't tell apart (for example Sophisticated, Elegant and Luxurious) and tags you wanted but didn't have.
4. **Instructions:** anything in the docs or prompt that was unclear, contradictory or missing.
5. **Usefulness:** could you build a real page from this output alone? What was missing?

Be specific and critical. A bug report with a reproducing command is worth more than praise.
