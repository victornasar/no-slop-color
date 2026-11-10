# Classification system

Every classification is **provisional**: adopted for testing on 10 November 2026 and to be confirmed, merged or removed by research. Phase 2 research ([`research/report.md`](../research/report.md)) tested the primaries against award sites, and its decisions D1 to D8 are applied here. The data lives in [`classifications/primary.json`](../classifications/primary.json) and [`classifications/secondary.json`](../classifications/secondary.json), which are authoritative for exact values. [`tools/classify.mjs`](../tools/classify.mjs) applies every measured rule.

## The unit is a pair

A color direction is identified by a **pair**:

| Part | Meaning |
| --- | --- |
| Ground | The color that covers the most area and sits behind the other |
| Figure | The color that stands on the ground and defines the identity with it |
| Accent | Optional, small and supporting |
| Area distribution | Intended shares, such as `80/20` or `70/22/8` |
| Derived colors | Text neutrals, tints and shades, generated from the pair in OKLCH |

**Ground and figure come from visual evidence**, never from the order a source lists colors. In the Awwwards data, the first listed color is the lighter one in only 25% of two-color entries, and in the Phase 2 review the ground was listed first in 55–64% of records, close to chance.

One kind of direction is not a pair: **Image-Led**, where imagery carries the color and there is no ground. See [Image-Led](#image-led).

Three layers stay separate:

| Layer | Says | Example |
| --- | --- | --- |
| Context | What the project is | `fine-dining`, `hospitality` |
| Primary | Foundation and structure | Dark / Chromatic (display label Dark + Muted) |
| Secondary | How the colors behave and the impression they create | Warm, Earthy, Low Contrast, Sophisticated |

## Primary classification

The primary is the **two-axis model** (Phase 2 decision D1): a foundation value and a structure value. Saturation is not part of the primary; it is the secondary Vibrant, Muted and Pastel tags.

| Axis | Values | Rule |
| --- | --- | --- |
| Foundation | Light, Dark | Ground L at least 0.60 is Light. Image-Led has no foundation |
| Structure | Neutral | Ground and figure both have C at most 0.04 |
| | Chromatic | Exactly one of ground and figure is chromatic |
| | Monochromatic | Ground and figure are both chromatic and within 30° |
| | Two-Tone | Ground and figure are both chromatic and more than 30° apart in hue |
| | Multicolor | Ground, figure and accent are chromatic, in three different hue families, and the accent holds at least 15% of the area |
| | Image-Led | No flat ground: a type color on imagery, with a scrim |

The terms these rules use:

| Term | Definition |
| --- | --- |
| Chromatic | C above 0.04 |
| Vibrant | Relative chroma at least 0.65 and C at least 0.08 |
| Pastel | L at least 0.80 and C at most 0.10. Pastel counts as muted |
| Hue family | Within 30° of OKLCH hue |

**Why two axes.** In Phase 2, the eight-way list hid Light/Dark for 56% of reviewed award pairs, and its Vibrant/Muted split sits where award colors have no natural break. Structure can be measured from recorded colors without knowing which is the ground; the flat list could be settled for only 77% of award records.

### Display labels

The former eight primaries stay as **display labels**, names for people, derived from the axes. They are not the classification.

| Display label | Derivation |
| --- | --- |
| Neutral | Structure Neutral |
| Colorful / Multicolor | Structure Multicolor |
| Two-Tone | Structure Two-Tone |
| Monochromatic Foundation | Structure Monochromatic |
| Light + Vibrant | Light, Chromatic, and the chromatic pair color is vibrant |
| Dark + Vibrant | Dark, Chromatic, and the chromatic pair color is vibrant |
| Light + Muted | Light, Chromatic, and the chromatic pair color is not vibrant |
| Dark + Muted | Dark, Chromatic, and the chromatic pair color is not vibrant |
| Image-Led | Structure Image-Led |

Multicolor stays in the model but **cannot be measured from award records**, which hold at most two colors and no area shares. The Phase 2 review found multicolor sites as imagery or color blocking rather than as a 15% accent.

### Light and Dark for chromatic grounds

The 0.60 threshold is sound for neutral grounds: award neutrals split into dark (L 0–0.30) and light (L 0.80–1.0), and only 54 of 1,607 sit between 0.35 and 0.75. It is **least certain for chromatic grounds**, whose lightness peaks at L 0.60–0.70, right on the boundary. A Mid value was considered and not adopted (Phase 2 D5): only six reviewed pairs fell in the band, too few to define it. Instead the binary is kept and a chromatic ground in the 0.50–0.70 review band gets its own flag. Tangerine Wallet is the library's example.

### Image-Led

An Image-Led direction has **no ground and no foundation**. It is a type color set on imagery, plus a scrim, an overlay at a stated opacity that is also used solid for text panels. Contrast is checked against the worst case: the scrim at its opacity over pure white and over pure black, composited in sRGB as CSS does, so the stated ratio holds on any image. `classifyImageLed` in [`tools/classify.mjs`](../tools/classify.mjs) measures it.

**Status: provisional, with no library directions.** Phase 2 tested a tone-based version first, where imagery tone (Light or Dark) plus a type color defines the direction, against the 62 photo-led reviewed sites, with pass criteria fixed in advance ([`research/data/analysis/image-led-test.md`](../research/data/analysis/image-led-test.md)). It failed. 40% of photo-led thumbnails are mid-tone overall, and type is light in 54 of the 59 cases where its tone is known, whatever the image tone. What held is that 98% use one flat type color. The type-and-scrim model follows from that result but has not been tested on independent data, so no Image-Led direction has been written. The engine supports the kind, and a fixture in `tools/fixtures/` keeps the path tested.

### Unresolved

A model or curator may assign **Unresolved**, with a free-text `proposed_label`, when the evidence is gradient-led or otherwise doesn't fit. The script never does. Recurring proposed labels are evidence for missing categories; in Phase 2, photo-led sites were the largest family and led to Image-Led.

### Confidence

`high` unless a foundation or structure value sits near a threshold:

- Ground L between 0.50 and 0.70.
- A pair color's C within 0.008 of 0.04.
- A hue difference within 6° of 30°.

One flag gives `medium`, two or more give `low`, and the reasons are listed in `flags`. A relative chroma within 0.05 of the vibrant floor is still flagged, but it no longer lowers confidence, because saturation is secondary; it can change the Vibrant/Muted tag and the display label, not the primary.

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

## Examples

| Direction | Pair | Display label | Primary | Notable secondary tags |
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
| The two-axis model became the primary; the eight labels became derived display labels | Phase 2 D1: the flat list hid Light/Dark for 56% of reviewed award pairs and tied saturation to a threshold with no natural break |
| Vibrant-floor proximity no longer lowers primary confidence | Saturation moved to the secondary tags |
| Image-Led added as a structure with no ground or foundation, provisional | Phase 2 D2: a third of award sites carry color through imagery. The tone-based model failed its test, so foundation is null and no directions exist yet |
| Chromatic grounds in the review band get a specific flag | Phase 2 D5: award chromatic colors peak on the Light/Dark boundary |
| The pair replaced five equal palette roles | Award-site data records colors as small sets, and a pair is what defines a direction |
| Eight candidate primaries replaced three | To test Light + Muted, Dark + Muted, Multicolor, Monochromatic and Two-Tone |
| Polarity uses OKLCH L at 0.60 | Keeps the system in OKLCH. The gray crossover for black or white text is near L 0.58 |
| Two-Tone means both pair colors are chromatic | Every pair has two colors, so the old meaning no longer separated anything |
| The vibrant floor needs both C and relative chroma | Absolute C misses deep emeralds, and relative chroma alone accepts pale pinks |
| Jewel Tones lightness ends at 0.49 | A bright vermilion at L 0.55 passed. Reference gem colors fall at L 0.43 to 0.47 |
| Temperature comes from the pair, not the accent | A 3% amber accent made a cool gray pair read as warm |
