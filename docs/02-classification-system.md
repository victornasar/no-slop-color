# Classification system

Every classification is **provisional**: adopted for testing on 10 November 2026 and to be confirmed, merged or removed by research. The data lives in [`classifications/primary.json`](../classifications/primary.json) and [`classifications/secondary.json`](../classifications/secondary.json), which are authoritative for exact values. [`tools/classify.mjs`](../tools/classify.mjs) applies every measured rule.

## The unit is a pair

A color direction is identified by a **pair**:

| Part | Meaning |
| --- | --- |
| Ground | The color that covers the most area and sits behind the other |
| Figure | The color that stands on the ground and defines the identity with it |
| Accent | Optional, small and supporting |
| Area distribution | Intended shares, such as `80/20` or `70/22/8` |
| Derived colors | Text neutrals, tints and shades, generated from the pair in OKLCH |

**Ground and figure come from visual evidence**, never from the order a source lists colors. In the Awwwards data, the first listed color is the lighter one in only 25% of two-color entries, so the order says nothing about which color is the background.

Three layers stay separate:

| Layer | Says | Example |
| --- | --- | --- |
| Context | What the project is | `fine-dining`, `hospitality` |
| Primary | The pair's overall visual foundation | Dark + Muted |
| Secondary | How the colors behave and the impression they create | Warm, Earthy, Low Contrast, Sophisticated |

## Primary classification

Two models are applied side by side so research can compare them.

### Flat model: one of eight

The first rule that matches decides:

| Order | Label | Rule |
| --- | --- | --- |
| 1 | Neutral | Ground and figure both have C at most 0.04 |
| 2 | Colorful / Multicolor | Ground, figure and accent are chromatic, in three different hue families, and the accent holds at least 15% of the area |
| 3 | Two-Tone | Ground and figure are both chromatic and more than 30° apart in hue |
| 4 | Monochromatic Foundation | Ground and figure are both chromatic and within 30° |
| 5 | Light + Vibrant | Ground L is at least 0.60, and the chromatic pair color is vibrant |
| 6 | Dark + Vibrant | Ground L is below 0.60, and the chromatic pair color is vibrant |
| 7 | Light + Muted | Ground L is at least 0.60, and the chromatic pair color is not vibrant |
| 8 | Dark + Muted | Ground L is below 0.60, and the chromatic pair color is not vibrant |

The terms these rules use:

| Term | Definition |
| --- | --- |
| Chromatic | C above 0.04 |
| Vibrant | Relative chroma at least 0.65 and C at least 0.08 |
| Pastel | L at least 0.80 and C at most 0.10. Pastel counts as muted for the primary |
| Hue family | Within 30° of OKLCH hue |

A model or curator may assign **Unresolved**, with a free-text `proposed_label`, when the evidence is led by imagery or gradients or doesn't fit. The script never does. Recurring proposed labels are evidence for missing categories.

### Two-axis model

| Axis | Values | Rule |
| --- | --- | --- |
| Foundation | Light, Dark | Ground L at least 0.60 is Light |
| Structure | Neutral, Chromatic, Monochromatic, Two-Tone, Multicolor | Chromatic means exactly one pair color is chromatic. The rest match the flat rules above |

Saturation stays in the secondary tags. Because Monochromatic and Two-Tone describe structure while Light + Vibrant describes a foundation and treatment, the flat model has to discard information whenever both apply. The two-axis model keeps both.

### Confidence

`high` unless a value sits near a threshold:

- Ground L between 0.50 and 0.70.
- A pair color's C within 0.008 of 0.04.
- A relative chroma within 0.05 of the vibrant floor.
- A hue difference within 6° of 30°.

One flag gives `medium`, two or more give `low`, and the reasons are listed in `flags`.

## Secondary characteristics

Each tag has a basis:

- **Measured:** the script decides, and the tag must be listed if and only if its test passes.
- **Hybrid:** the script suggests, and a curator confirms.
- **Curated:** judgement from visual evidence and context.

| Dimension | Tags | Basis |
| --- | --- | --- |
| Temperature | Warm, Cool, Balanced | Measured, from the pair. The accent counts only if the pair has no temperature |
| Saturation and intensity | Vibrant, Muted, Pastel, High Intensity, Low Intensity | Measured |
| Color character | Jewel Tones | Measured |
| | Earthy | Hybrid |
| | Natural, Industrial, Pastoral | Curated |
| Relationships | Monochromatic, Analogous, Complementary, Split Complementary, Triadic, Tetradic, Near-Neutral + Accent | Measured. Tetradic needs four colors, so it applies only in research on multi-color entries |
| Contrast | High (7:1 or more), Moderate (3:1 to 7:1), Low (under 3:1), Tonal | Measured. This is visual contrast between ground and figure; accessibility is checked separately |
| Aesthetic | Sophisticated, Playful, Minimal, Elegant, Bold, Luxurious, Futuristic, Vintage, Organic, Professional, Experimental, Romantic, Energetic, Calm, Dramatic | Curated |
| Composition | Color Blocking, Gradient, Accent-Led, Background-Led, Section-Based, Layered, Image-Led | Curated, because it needs visual evidence or a usage plan |

### Merge candidates to test

Some tags are probably not distinct. Research should check whether each group can be told apart:

- Sophisticated, Elegant and Luxurious.
- Bold, Energetic and Dramatic.
- Natural, Organic, Pastoral and Earthy.
- Vibrant and Muted against the flat primaries that contain those words.

## Examples

| Direction | Pair | Flat primary | Two-axis | Notable secondary tags |
| --- | --- | --- | --- | --- |
| Audit Trail | Report White / Ledger Ink, amber accent | Neutral | Light / Neutral | Cool, Near-Neutral + Accent, High Contrast, Minimal |
| Clear Signal | Warm White / Persimmon | Light + Vibrant | Light / Chromatic | Warm, Moderate Contrast, Bold |
| Night Shift | Night Violet / Chartreuse | Dark + Vibrant | Dark / Chromatic | Cool, High Contrast, Futuristic |
| Building Blocks | Block Blue / Tomato, Sunflower at 20% | Colorful / Multicolor | Dark / Multicolor | Color Blocking, Playful (medium confidence: ground L 0.50) |
| Wood and Felt | Oat / Walnut, pale peach accent | Neutral | Light / Neutral | Warm, Monochromatic, Natural, Calm |
| Nightlight | Story Night / Moon Yellow | Two-Tone | Dark / Two-Tone | Complementary, High Contrast, Playful |

## Rule history

| Change | Reason |
| --- | --- |
| The pair replaced five equal palette roles | Award-site data records colors as small sets, and a pair is what defines a direction |
| Eight candidate primaries replaced three | To test Light + Muted, Dark + Muted, Multicolor, Monochromatic and Two-Tone |
| Polarity uses OKLCH L at 0.60 | Keeps the system in OKLCH. The gray crossover for black or white text is near L 0.58 |
| Two-Tone means both pair colors are chromatic | Every pair has two colors, so the old meaning no longer separated anything |
| The vibrant floor needs both C and relative chroma | Absolute C misses deep emeralds, and relative chroma alone accepts pale pinks |
| Jewel Tones lightness ends at 0.49 | A bright vermilion at L 0.55 passed. Reference gem colors fall at L 0.43 to 0.47 |
| Temperature comes from the pair, not the accent | A 3% amber accent made a cool gray pair read as warm |
