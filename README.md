# no-slop-color

A context-aware color intelligence system for AI agents. An agent describes what it is building and receives structured, curated color directions it can use directly.

**Status:** foundation only. There is no recommendation engine and no curated corpus yet.

## What exists

| Path | Contents |
| --- | --- |
| [`docs/01-color-principles.md`](docs/01-color-principles.md) | Researched color principles, separating standards and evidence from convention and project decisions |
| [`docs/02-classification-system.md`](docs/02-classification-system.md) | How primary and secondary classifications work |
| [`docs/03-data-model.md`](docs/03-data-model.md) | The OKLCH and HEX data model and its invariants |
| [`docs/04-recommendation-design.md`](docs/04-recommendation-design.md) | How contextual recommendations should work |
| [`classifications/`](classifications/) | The 3 primary and 12 secondary classifications, with tests and thresholds |
| [`contexts/domains.json`](contexts/domains.json) | The 89 domains to cover, in 17 groups, with no colors attached |
| [`schemas/`](schemas/) | JSON Schemas for all of the above |
| [`examples/`](examples/) | Two hand-authored recommendations that test the data model |

The examples are design fixtures, not engine output, and they are not part of a corpus.

## Principles

- OKLCH is the source of truth, and HEX is its sRGB output.
- There are exactly three primary classifications. Adding one requires the owner's approval.
- Secondary classifications overlap freely with any primary.
- Domains never determine colors.
- Language models interpret and explain, and they never invent color values.
- Reasoning makes no unsupported psychological claims.

## Open questions

1. **Where do fully muted palettes belong?** A palette like sage and clay on cream has too much color for Neutral and no vibrant anchor, so it currently has no primary. This matters for domains such as Skincare, Wellness and Organic products. Options:
   - **Recommended:** keep three primaries and read "Vibrant" as "color-led", letting palettes tagged Muted use a lower anchor. This also honors the requirement that Muted can overlap with every primary.
   - Keep the rule strict and exclude these palettes.
   - Add a fourth primary, which needs an explicit decision.
2. **Should directions include status colors?** Domains like SaaS, Enterprise software and Data analytics need success, warning and error colors, which are outside the five roles defined so far.
3. **How should light and dark themes relate?** A product with both themes could link two directions, or a single direction could carry both.

## Next steps

1. Resolve the open questions.
2. Review the provisional thresholds against a larger set of real palettes.
3. Build the validator that enforces the data model's invariants.
4. Curate the first corpus, reviewing each direction as a rendered composition.
5. Build the recommendation engine and its evaluation set.
6. Design the agent interface.
