# no-slop-color

A context-aware color intelligence system for AI agents. An agent describes what it is building and receives curated color directions it can use directly.

A direction is built around a **pair**: a ground color and a figure color, with an optional small accent, the way award galleries summarize a site. Text colors, tints and shades are derived from the pair in OKLCH.

**Status:** 41 curated directions, a deterministic query and a `/find-color` skill. The classifications and the library are provisional until the Awwwards research confirms them.

## Use it

In Claude Code, after linking the skill (see below):

```
/find-color premium halal fine-dining restaurant
```

Or query the library directly:

```bash
node tools/query.mjs --brief "premium halal fine-dining restaurant" --prefer quiet
node tools/query.mjs --domains saas,fintech --foundation dark --count 5
node tools/classify.mjs --ground "oklch(0.95 0.02 90)" --figure "oklch(0.62 0.06 140)" --area 80/20
```

Link the skill once:

```bash
ln -s ~/Documents/no-slop-color/skill/find-color ~/.claude/skills/find-color
```

## What exists

| Path | Contents |
| --- | --- |
| [`library/`](library/) | 41 curated directions. Edit `library/source/`, then run `node tools/build.mjs library` |
| [`skill/find-color/SKILL.md`](skill/find-color/SKILL.md) | The `/find-color` skill: reading the brief, querying and the output format |
| [`tools/query.mjs`](tools/query.mjs) | Picks 3 to 5 distinct directions for given domains and constraints |
| [`tools/classify.mjs`](tools/classify.mjs) | Measures and classifies a pair (Node, no dependencies) |
| [`tools/build.mjs`](tools/build.mjs) | Builds curated sources and checks every rule |
| [`classifications/`](classifications/) | The provisional classifications, with OKLCH tests and thresholds |
| [`prompts/classify-pair.md`](prompts/classify-pair.md) | The classifier prompt for judgement-only tags |
| [`prompts/test-the-classifier.md`](prompts/test-the-classifier.md) | A prompt for a fresh agent to test the classifier |
| [`contexts/domains.json`](contexts/domains.json) | 89 domains in 17 groups, with no colors attached |
| [`contexts/conventions.json`](contexts/conventions.json) | Sourced category conventions with strength, confidence and stance |
| [`docs/`](docs/) | Color principles, the classification system, the data model and the recommendation design |
| [`schemas/`](schemas/) | JSON Schemas for all data |
| [`examples/`](examples/) | Two hand-authored recommendations, built from `examples/source/` |
| [`research/`](research/) | Pinned Awwwards source data, v0 observations and research tools, not yet run |

## Principles

- OKLCH is the source of truth, and HEX is its sRGB output.
- Every color an agent shows comes from the library or the classifier. Nothing is invented.
- Ground and figure are assigned from visual evidence, never from the order a source lists colors.
- Measured tags come from tests, and judgement tags are labelled as judgement.
- Domains never determine colors. A domain only helps choose which curated directions to show.
- Real category conventions, such as blue in finance, are surfaced as sourced context to follow or avoid, never as a rule. Unsourced folklore is not used.
- Taste over frequency: a common pattern is not automatically a good recommendation. For luxury, black or black and white is preferred over gold.
- Reasoning makes no unsupported psychological claims.

## Library coverage

The 41 directions span all eight primary labels: Neutral 9, Light + Vibrant 7, Two-Tone 7, Light + Muted 6, Dark + Vibrant 5, Dark + Muted 3, Monochromatic Foundation 3, Multicolor 1. They cover 78 of the 89 domains. These domains have no direction yet, and queries for them use related or general directions:

Consumer electronics, Pet brands, Fitness, Science and research, Art and illustration, Marketing campaigns, Advertising, Retail, Heritage brands, Specialty retail, and Real-world experiences and exhibitions.

## Open questions

1. **Which primary model wins?** The flat eight-way model and the two-axis model run side by side until research compares them.
2. **Which secondary tags merge?** For example Sophisticated, Elegant and Luxurious, or Natural, Organic, Pastoral and Earthy.
3. **Should directions include status colors?** SaaS and data products need success, warning and error colors.
4. **How should light and dark counterparts link?** Currently the skill re-queries with the opposite foundation.

## Next steps

1. Research: analyze the recorded Awwwards colors and review thumbnails to test the taxonomy and the library.
2. Fill the uncovered domains and add Multicolor and Dark + Muted directions.
3. Link light and dark counterparts and add status colors.

## License

[MIT](LICENSE)
