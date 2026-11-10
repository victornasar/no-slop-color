# no-slop-color

A context-aware color intelligence system for AI agents. An agent describes what it is building and receives curated color directions it can use directly.

A direction is built around a **pair**: a ground color and a figure color, with an optional small accent, the way award galleries summarize a site. Text colors, tints and shades are derived from the pair in OKLCH.

**Status:** 51 curated directions and an engine that any agent can run. Phase 2 research tested the classifications and the library against Awwwards sites ([`research/report.md`](research/report.md)); the two-axis primary was adopted as a result. Everything stays provisional.

## Install

Any agent (Claude Code, Cursor, Codex and others), with the [`npx skills`](https://github.com/vercel-labs/agent-skills) CLI. Only the skill folder is installed, about 280 KB:

```bash
npx skills add https://github.com/victornasar/no-slop-color --skill find-color
```

<details>
<summary>Claude Code plugin</summary>

```
/plugin marketplace add victornasar/no-slop-color
/plugin install no-slop-color@no-slop-color
```

`/plugin update` upgrades it later.

</details>

<details>
<summary>Codex plugin</summary>

```bash
codex plugin marketplace add victornasar/no-slop-color
codex plugin add no-slop-color@no-slop-color
```

</details>

No clone is needed. The skill needs only Node 18 or later: no install, no API keys and no network.

## Use it

Ask your agent:

```
/find-color premium halal fine-dining restaurant
```

Or tell it to pick colors while it builds, for example "use find-color to choose and apply a palette". It then takes the engine's default pick, applies it and tells you what it chose.

The engine underneath, which agents run for you:

```bash
node scripts/find-color.mjs recommend --brief "premium halal fine-dining restaurant"
node scripts/find-color.mjs recommend --domains saas,fintech --foundation dark --count 5
node scripts/find-color.mjs apply lib.parchment-and-ink --format css --text
node scripts/find-color.mjs classify --ground "oklch(0.95 0.02 90)" --figure "oklch(0.62 0.06 140)" --area 80/20
```

From a clone, run the same commands with `node tools/cli.mjs`.

## What exists

| Path | Contents |
| --- | --- |
| [`skills/find-color/`](skills/find-color/) | The installable skill: [`SKILL.md`](skills/find-color/SKILL.md) and the bundled engine `scripts/find-color.mjs` |
| [`library/`](library/) | 51 curated directions. Edit `library/source/`, then run `node tools/build.mjs all` |
| [`tools/cli.mjs`](tools/cli.mjs) | The engine's entry point: `recommend`, `get`, `apply`, `classify`, `domains`, `conventions` |
| [`tools/query.mjs`](tools/query.mjs), [`tools/apply.mjs`](tools/apply.mjs), [`tools/classify.mjs`](tools/classify.mjs) | Selection with a default pick, the tokens output, and the pair classifier |
| [`tools/build.mjs`](tools/build.mjs), [`tools/bundle.mjs`](tools/bundle.mjs), [`tools/check.mjs`](tools/check.mjs) | Build and rule checks, the skill bundle, and the golden briefs (`tools/golden.json`) |
| [`AGENTS.md`](AGENTS.md) | How agents use the repo and change the library |
| [`classifications/`](classifications/) | The provisional classifications, with OKLCH tests and thresholds |
| [`contexts/`](contexts/) | 89 domains in 17 groups, and sourced category conventions |
| [`prompts/`](prompts/) | The classifier prompt and a prompt for testing the classifier |
| [`docs/`](docs/) | Color principles, the classification system, the data model and the recommendation design |
| [`schemas/`](schemas/) | JSON Schemas for all data |
| [`examples/`](examples/) | Two hand-authored recommendations |
| [`research/`](research/) | Pinned Awwwards source data, the Phase 2 analysis, thumbnail review and report |

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

The 51 directions are classified on two axes, foundation and structure: Light 31 and Dark 20; Chromatic 23, Neutral 13, Two-Tone 11, Monochromatic 3 and Multicolor 1. By display label: Neutral 13, Two-Tone 11, Light + Muted 7, Light + Vibrant 7, Dark + Vibrant 6, Dark + Muted 3, Monochromatic Foundation 3, Multicolor 1. There is no Image-Led direction yet; see [`docs/02-classification-system.md`](docs/02-classification-system.md#image-led). Every one of the 89 domains has at least one direction. Most have several, and the thinnest are the newest additions such as Pet brands and Science and research.

## Open questions

1. **When is Image-Led ready?** The engine supports directions with no ground, but the model needs validating on fresh award data before any are written.
2. **Which secondary tags merge?** For example Sophisticated, Elegant and Luxurious, or Natural, Organic, Pastoral and Earthy.
3. **Should directions include status colors?** SaaS and data products need success, warning and error colors.
4. **How should light and dark counterparts link?** Currently the skill re-queries with the opposite foundation.
5. **Should the engine adapt a pair to an existing brand color?** Today `--existing` only ranks directions that already contain a close color.

## Next steps

1. Validate the Image-Led model on photo-led sites outside the Phase 2 sample, then write the first Image-Led directions.
2. Deepen the domains with only one or two directions, without growing the paused Two-Tone and Light + Muted groups.
3. Link light and dark counterparts and add status colors.

## License

[MIT](LICENSE)
