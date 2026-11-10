# no-slop-color

A context-aware color intelligence system for AI agents. An agent describes what it is building and receives structured, curated color directions it can use directly.

A direction is built around a **pair**: a ground color and a figure color, with an optional small accent, the way award galleries summarize a site. Text colors, tints and shades are derived from the pair in OKLCH.

**Status:** the classification system is in place and provisional. There is no curated library or recommendation engine yet.

## What exists

| Path | Contents |
| --- | --- |
| [`docs/01-color-principles.md`](docs/01-color-principles.md) | Researched color principles, separating standards and evidence from convention and project decisions |
| [`docs/02-classification-system.md`](docs/02-classification-system.md) | The pair model, eight candidate primaries, the two-axis alternative and seven secondary dimensions |
| [`docs/03-data-model.md`](docs/03-data-model.md) | Colors, pair classifications, directions and the build |
| [`docs/04-recommendation-design.md`](docs/04-recommendation-design.md) | How contextual recommendations should work |
| [`classifications/`](classifications/) | The provisional classifications, with OKLCH tests and thresholds |
| [`prompts/classify-pair.md`](prompts/classify-pair.md) | The classifier prompt for judgement-only tags |
| [`prompts/test-the-classifier.md`](prompts/test-the-classifier.md) | A prompt for a fresh agent to test the classifier and report problems |
| [`tools/classify.mjs`](tools/classify.mjs) | Measures and classifies a pair (Node, no dependencies) |
| [`tools/build.mjs`](tools/build.mjs) | Builds curated sources and checks every rule |
| [`contexts/domains.json`](contexts/domains.json) | 89 domains in 17 groups, with no colors attached |
| [`schemas/`](schemas/) | JSON Schemas for all of the above |
| [`examples/`](examples/) | Two hand-authored recommendations with six pairs, built from `examples/source/` |
| [`research/`](research/) | The pinned Awwwards source data and research tools, not yet run |

## Try it

```bash
node tools/classify.mjs --ground "oklch(0.95 0.02 90)" --figure "oklch(0.62 0.06 140)" --area 80/20
node tools/build.mjs examples
```

## Principles

- OKLCH is the source of truth, and HEX is its sRGB output.
- Ground and figure are assigned from visual evidence, never from the order a source lists colors.
- Classifications are provisional until research confirms them.
- Measured tags come from tests, and judgement tags are labelled as judgement.
- Domains never determine colors.
- Language models interpret and explain, and they never invent color values.
- Reasoning makes no unsupported psychological claims.

## Open questions

1. **Which primary model wins?** The flat eight-way model and the two-axis model run side by side until research compares them.
2. **Which secondary tags merge?** For example Sophisticated, Elegant and Luxurious, or Natural, Organic, Pastoral and Earthy.
3. **Should directions include status colors?** SaaS and data products need success, warning and error colors.
4. **How should light and dark themes relate?** Two linked pairs, or one direction carrying both.

## Next steps

1. Research: analyze the recorded Awwwards colors and review thumbnails to test the taxonomy.
2. Curate the library of about 36 directions on the confirmed taxonomy.
3. Add a query script that returns distinct directions for a context.

## License

[MIT](LICENSE)
