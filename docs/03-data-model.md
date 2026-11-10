# Data model

The model separates three concerns so that each can change independently:

| Concern | Location | Contents |
| --- | --- | --- |
| Classification | `classifications/` | Definitions, tests and thresholds |
| Color data | `schemas/color`, `schemas/direction`, future `corpus/` | Colors, roles, ranges and usage |
| Recommendation logic | Future `engine/`, designed in [`04-recommendation-design.md`](04-recommendation-design.md) | Interpreting context, then selecting and adapting directions |

`contexts/domains.json` is a fourth, supporting input. It lists the 89 domains the system must cover and the questions that separate projects within them. It contains no color.

## Color

Each color stores its OKLCH value and its HEX output:

```json
{
  "id": "persimmon",
  "name": "Persimmon",
  "oklch": { "l": 0.58, "c": 0.18, "h": 38 },
  "hex": "#CE4714",
  "css": "oklch(0.58 0.18 38)",
  "srgb": { "status": "in-gamut", "deltaEOK": 0.0008 },
  "relativeChroma": 0.948
}
```

| Field | Rule |
| --- | --- |
| `oklch` | The source of truth. All reasoning and derived colors use it |
| `oklch.h` | `null` for achromatic colors, matching CSS `none` |
| `hex` | Derived from `oklch`, uppercase, six digits |
| `srgb.status` | `in-gamut`, or `gamut-mapped` with a `mappedOklch` value |
| `srgb.deltaEOK` | The distance between the authored color and the final HEX |
| `relativeChroma` | Derived. C divided by the sRGB limit at the same L and H |

A gamut-mapped color's HEX no longer equals its OKLCH. Keeping both values and the mapped result makes this visible.

## Direction

A direction is one complete, usable recommendation. The nine required outputs correspond to these fields:

| Requirement | Field |
| --- | --- |
| Name | `name`, `summary` |
| Primary classification | `classification.primary` |
| Secondary classifications | `classification.secondary`, each with basis and evidence |
| Color palette | `palette` |
| Color roles | `roles` |
| Color ranges | `ranges` |
| Reasoning | `reasoning` |
| Usage guidance | `usage` |
| Accessibility | `accessibility` |

### Roles

Roles refer to palette colors by id, so every value exists in one place.

```json
"roles": {
  "foundation": "ground",
  "primary": "persimmon",
  "secondary": "aubergine",
  "accent": "teal",
  "supportingNeutrals": [
    { "use": "text", "color": "text" },
    { "use": "text-muted", "color": "muted" },
    { "use": "border", "color": "line" },
    { "use": "surface-raised", "color": "raised" }
  ]
}
```

Supporting neutrals stay at or below C 0.04. `surface-raised` may match the foundation's chroma, because a raised panel on a chromatic field needs to stay related to it.

### Ranges

Ranges are generated in OKLCH. A step number is L multiplied by 100, so step 40 means about the same lightness in any range. The base color is included and marked `isBase`, and each range records the method that produced it.

### Reasoning

Each reason is a claim with a kind. The schema requires sources for any `cultural-context` claim.

| Kind | Meaning |
| --- | --- |
| `measured` | Computed from the colors |
| `convention` | Established design practice |
| `cultural-context` | A sourced statement about a tradition or place |
| `interpretation` | A design judgement, offered as one |

There is deliberately no kind for psychological effects.

### Usage

`usage.area` holds target shares that sum to 1. These targets feed classification, so they are part of a direction's definition. `assignments` maps interface or brand elements to colors, and `do` and `avoid` give practical limits.

### Accessibility

Each pair records foreground, background, intended use, ratio, the required minimum and the result. A palette passes by its stated uses. It makes no claim about pairs that it does not list.

## Recommendation response

[`schemas/recommendation.schema.json`](../schemas/recommendation.schema.json) wraps directions with:

- `request`, including optional constraints such as required primary, existing colors, avoided hue arcs and excluded directions.
- `context`, where every field records whether it was `stated`, `inferred` or `unknown`.
- `signals`, the design intent expressed as color properties.
- `diversity`, which reports how the directions differ.
- `openQuestions`, listing facts that would change the result.

## Invariants

JSON Schema covers structure. A future validator must also enforce the rules below, all of which were applied when checking the example files:

1. HEX matches OKLCH: for in-gamut colors with L of at least 0.15, ΔEOK is at most 0.01.
2. Curated palette colors are in sRGB.
3. Every role and assignment refers to an existing palette color.
4. Every secondary id exists in `classifications/secondary.json`.
5. Primary and measured secondary tags equal the results of their tests.
6. Area shares sum to 1.
7. Every contrast pair meets its intended use, computed without rounding.
8. Directions in one response differ on at least two measured properties.
9. Every domain id exists in `contexts/domains.json`.

## Versioning

Every data file carries a `schemaVersion`. Adding optional fields is a minor change. Renaming a field, or changing a threshold in a way that reclassifies existing colors, is a breaking change.
