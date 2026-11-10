# Classification system

Classification has two levels. Each direction has **exactly one primary** classification and **any number of secondary** classifications.

The data lives in [`classifications/primary.json`](../classifications/primary.json) and [`classifications/secondary.json`](../classifications/secondary.json). This document explains how it works, and the JSON is authoritative for exact values.

## Primary classifications

There are exactly three. The schema rejects a fourth, and adding one requires the owner's approval.

| Primary | Foundation | Role of color |
| --- | --- | --- |
| **Neutral** | Achromatic or tinted, light or dark | Absent, or confined to a small accent |
| **Light + Vibrant** | Predominantly light | Vibrant color carries the identity |
| **Dark + Vibrant** | Predominantly dark | Vibrant color carries the identity |

Three measurements decide the primary:

1. **Foundation polarity.** Compare the foundation's contrast against black and against white. Black winning means light, and white winning means dark. Foundations with L from 0.50 to 0.70 also need a curator to confirm how they read.
2. **Chromatic area.** The declared area share of foundation, primary, secondary and accent colors with C above 0.04.
3. **Vibrant anchor.** A chromatic color with relative chroma of at least 0.65 and C of at least 0.08.

```text
foundation C <= 0.04 AND chromatic area <= 10%   -> Neutral
otherwise, a vibrant anchor exists               -> Light + Vibrant or Dark + Vibrant, by polarity
otherwise                                        -> unresolved
```

The numbers are project decisions, set by testing them against reference colors. They are provisional and should be reviewed as the corpus grows.

### The unresolved case

A palette of entirely muted color, such as sage and clay on cream, has too much color for Neutral and no vibrant anchor. It currently has no primary. Rather than invent a fourth category, the system reports this as unresolved. See open question 1 in the [README](../README.md).

## Secondary classifications

Secondary classifications describe further characteristics. They are not mutually exclusive, and each one defines how it appears under **all three** primaries, so any secondary can overlap with any primary.

| Secondary | Facet | Decided by | Summary of test |
| --- | --- | --- | --- |
| Warm | Temperature | Measured | At least 40% of the palette body's chroma-weighted area is in the warm arc |
| Cool | Temperature | Measured | At least 40% of the palette body's chroma-weighted area is in the cool arc |
| Monochromatic | Relationship | Measured | All visibly hued colors fit a 30 degree arc |
| Analogous | Relationship | Measured | Core chromatic colors span 20 to 60 degrees |
| Complementary | Relationship | Measured | Two chromatic colors are at least 150 degrees apart |
| Pastel | Tonal character | Measured | Most non-foundation chromatic area has L of at least 0.8 and C of at most 0.1 |
| Jewel Tones | Tonal character | Measured | A chromatic color has L from 0.25 to 0.49 and high relative chroma |
| Muted | Tonal character | Measured | Most non-foundation chromatic area is below 0.65 relative chroma |
| High Contrast | Contrast structure | Measured | Primary reaches 7:1 on the foundation and most figure area reaches 4.5:1 |
| Earthy | Aesthetic direction | Hybrid | Color falls in an earth-tone range and a curator confirms it |
| Color Blocking | Composition | Hybrid | At least three colors each hold 15% of area in flat fields, and a curator confirms it |
| Playful | Aesthetic direction | Curated | Assigned by a curator, with the reason recorded |

### How tags are assigned

- **Measured** tags are computed. Every measured test that passes must be listed, and one that fails must not be, so filtering by tag gives honest results.
- **Hybrid** tags need the measured test to pass and a curator to confirm. Passing alone does not apply the tag.
- **Curated** tags have no numeric test, because no number can establish them.

Warm and Cool can both apply to a palette with a split temperature. Analogous and Complementary can both apply, because Analogous looks at core colors while Complementary can involve an accent.

### Examples of overlap

| Direction | Primary | Secondary |
| --- | --- | --- |
| Wood and Felt | Neutral | Warm, Monochromatic, Pastel |
| Building Blocks | Light + Vibrant | Warm, Complementary, Playful, Color Blocking |
| Night Shift | Dark + Vibrant | Cool, Complementary, High Contrast |

## Adding a secondary

A new secondary must:

1. Name a facet.
2. State whether it is measured, hybrid or curated.
3. Provide a test, or explain why none can exist.
4. Define an expression under all three primaries, which the schema requires.
5. Be checked against colors that should pass and colors that should not.

Do not add one just because a word is popular. An unmeasurable, undefined tag is the kind of arbitrary classification this project exists to avoid.

## Rule history

Testing changed these rules, and the reasons are worth keeping:

| Change | Reason |
| --- | --- |
| Vibrant anchor requires both C and relative chroma | Absolute C misses deep emeralds, and relative chroma alone accepts pale pinks |
| Jewel Tones lightness range ends at 0.49 | A bright vermilion at L 0.55 passed. The reference gem colors fall at L 0.43 to 0.47 |
| Muted ignores the foundation | Bright figures on a pale tinted ground were counted as muted |
| Temperature ignores the accent | A 4% amber accent made a cool gray interface measure as warm |
| Raised surfaces may match the foundation's chroma | A raised panel on a chromatic field must stay related to that field |
