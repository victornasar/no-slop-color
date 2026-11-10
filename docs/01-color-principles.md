# Color principles

This is the research behind no-slop-color. Every claim carries one of four labels, because the system must never present taste as science.

| Label | Meaning | How the system may use it |
| --- | --- | --- |
| **[Standard]** | Defined by a specification, or follows mathematically from one | Enforce automatically |
| **[Empirical]** | Measured in studies, with limits | Inform design, and state the limits |
| **[Convention]** | Established design practice | Use as a starting point, and allow departures |
| **[Project]** | A decision made for this system | Revise whenever testing shows a better value |

Figures marked *measured here* were calculated with the published conversion formulas while building this foundation.

## 1. OKLCH

**[Standard]** OKLCH is the cylindrical form of Oklab. CSS Color 4 defines it with three components ([CSS Color 4](https://www.w3.org/TR/css-color-4/), a Candidate Recommendation Draft dated 3 November 2026, so details can still change):

- **L, lightness:** 0 to 1.
- **C, chroma:** 0 upward. CSS maps 100% to 0.4, but values have no fixed maximum.
- **H, hue:** an angle in degrees.

**[Empirical]** Oklab was fitted to predict lightness, chroma and hue as independent perceptual attributes. Björn Ottosson derived it from lightness and chroma pairs generated with CAM16, and from hue data used for IPT. It assumes normal, well-lit viewing and does not model absolute luminance or adaptation to the background. Because some of its training data was model-generated, its author says it cannot prove a closer match to human perception ([Ottosson](https://bottosson.github.io/posts/oklab/)).

What that means in practice:

- Equal L values are a much better guide to equal lightness than HSL, but L does not replace a contrast calculation.
- Color shifts in dark rooms, on bright screens or beside strong surrounds are outside the model.

### Hue angles differ from the traditional color wheel

**[Standard]** *Measured here.* The sRGB primaries and secondaries land at these OKLCH positions, which are not evenly spaced:

| Color | HEX | L | C | H |
| --- | --- | --- | --- | --- |
| Red | `#FF0000` | 0.628 | 0.258 | 29.2 |
| Orange | `#FFA500` | 0.793 | 0.171 | 70.7 |
| Yellow | `#FFFF00` | 0.968 | 0.211 | 109.8 |
| Green | `#00FF00` | 0.866 | 0.295 | 142.5 |
| Cyan | `#00FFFF` | 0.905 | 0.155 | 194.8 |
| Blue | `#0000FF` | 0.452 | 0.313 | 264.1 |
| Magenta | `#FF00FF` | 0.702 | 0.322 | 328.4 |

A hue "opposite" in OKLCH is therefore not the same as an opposite on an RYB or HSL wheel.

### Chroma is not comparable across hues

**[Standard]** *Measured here.* The highest chroma sRGB can show depends on both lightness and hue:

| L | h 30 | h 60 | h 85 | h 110 | h 145 | h 195 | h 265 | h 325 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.20 | 0.080 | 0.047 | 0.041 | 0.044 | 0.063 | 0.034 | 0.137 | 0.094 |
| 0.40 | 0.160 | 0.094 | 0.082 | 0.087 | 0.126 | 0.068 | 0.275 | 0.187 |
| 0.60 | 0.241 | 0.141 | 0.123 | 0.131 | 0.189 | 0.102 | 0.217 | 0.281 |
| 0.80 | 0.115 | 0.140 | 0.164 | 0.175 | 0.252 | 0.137 | 0.100 | 0.187 |
| 0.90 | 0.052 | 0.065 | 0.108 | 0.196 | 0.195 | 0.154 | 0.048 | 0.089 |

An emerald at L 0.465 reaches only C 0.098, yet that is 99% of what sRGB allows at that hue and lightness. A pastel pink at C 0.060 measures 81% of its limit, although nobody would call it saturated. So the system tracks two values:

- **C**, the absolute colorfulness.
- **Relative chroma**, C divided by the sRGB maximum at the same L and H.

**[Project]** Either value alone misclassifies colors, so tests that depend on saturation use both.

**Chroma is a measurement of colorfulness. It says nothing about attractiveness or taste.** High chroma is neither better nor worse than low chroma.

## 2. Neutrals and achromatic foundations

**[Standard]** CSS treats hue as powerless when chroma is at or below a very small epsilon. For OKLCH that is 0.000004. The data model stores such a hue as `null`, matching the CSS `none` keyword.

**[Project]** Designers use "neutral" more broadly than "achromatic". The classification treats C up to 0.04 as behaving like a neutral. For reference, CSS uses 0.02 as its just-noticeable-difference value during gamut mapping, so tints near 0.02 are at the edge of being seen and tints near 0.04 are visible but quiet. *Measured here:* a typical cream (`#F2E8D5`) has C 0.027.

**[Convention]** Pure black and white are often avoided for large surfaces, and tinted neutrals are often used so the grays relate to the brand's other colors. This is a common practice. It is not a rule.

## 3. Lightness, chroma and hue when building ranges

**[Standard]** A tint or shade range is a series of L values. Holding hue constant and changing L is well defined in OKLCH.

**[Convention]** Holding C constant fails, because many L values cannot reach that chroma. Ranges here hold **relative** chroma and cap C near the base value, so tints and shades remain in gamut while keeping the base color's character.

**[Convention]** Professional scales assign steps to jobs. [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) uses 12 steps covering app backgrounds, component states, borders, solid fills and text. This project takes the principle that a step should have a purpose, and names steps by lightness (step 40 means L of about 0.40) so a step means the same thing in any range.

## 4. Temperature

**[Convention]** The warm and cool split is long established and is useful vocabulary. It is not a physical property of a screen color.

**[Project]** Greens around h 110 to 170 and violets around h 290 to 340 are genuinely ambiguous, so the warm arc (h 340 to 110) and cool arc (h 170 to 290) leave them out. Temperature is measured from the body of the palette, weighted by area and chroma, and accents are excluded. Without that exclusion, a 4% amber accent made a cool gray interface measure as warm during testing.

## 5. Color harmony and relationships

**[Convention]** Monochromatic, analogous and complementary are standard descriptive terms. They describe relationships. They do not guarantee a good result.

**[Empirical]** Harmony has been studied directly. Ou and Luo's psychophysical study of 1,431 color pairs modeled two-color harmony using chromatic difference, lightness sum, lightness difference and a hue effect ([Ou and Luo 2006](https://zendy.io/title/10.1002/col.20208)). So harmony depends on more than hue angle. The model's cross-domain performance is moderate: one independent comparison on apparel images reported correlations of 0.50 for two colors and 0.65 for three ([comparison](https://www.scientific.net/AMR.627.524)).

**[Empirical]** Work from Schloss and Palmer's research program separates harmony, preference and similarity as distinct judgments, and reports that preference relies more on the preference for the individual colors and on lightness contrast ([summary](https://www.frontiersin.org/articles/10.3389/fpsyg.2022.1010108/pdf)).

**Implication:** a hue relationship label describes a palette. It must never be used as proof that a palette is good. Good combinations come from curation, and lightness and chroma relationships matter as much as hue.

## 6. Contrast and accessibility

**[Standard]** WCAG 2.2 is the operative contrast standard ([1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)):

| Use | Minimum |
| --- | --- |
| Body text | 4.5:1 |
| Large text (18pt, or 14pt bold) | 3:1 |
| Interface components and meaningful graphics | 3:1 |
| Logotypes and inactive controls | Exempt |

- Relative luminance is `0.2126R + 0.7152G + 0.0722B` on linearized sRGB channels, with a linearization threshold of 0.04045.
- Contrast ratio is `(L1 + 0.05) / (L2 + 0.05)`.
- Thresholds are strict and values must not be rounded up. 4.499:1 fails 4.5:1.
- Color must not be the only means of conveying information.

**[Project]** Ratios are calculated from the delivered sRGB HEX value, stored rounded down and evaluated unrounded.

**[Standard]** A 3:1 or 4.5:1 result only proves that a specific pair passes. Each palette therefore records pairs together with their intended use.

**[Empirical]** APCA is not treated as a standard here. It was dropped from the WCAG 3 drafts in 2023, and the current draft says the contrast algorithm has yet to be determined ([Roselli, April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)). The data model could add it later without changes to existing fields.

**[Empirical]** Color vision deficiency affects roughly 5 to 8% of men and 0.5 to 1% of women ([News-Medical](https://www.news-medical.net/health/Color-Blindness-Prevalence.aspx)), and red-green forms are the most common. This is why reasoning about status or meaning must never depend on hue alone.

## 7. Gamut

**[Standard]** OKLCH can describe colors that sRGB cannot display. Simply clamping RGB values can noticeably shift hue, so CSS Color 4 specifies gamut mapping that reduces chroma while holding L and H, and clips only within a small tolerance (binary search with local MINDE, JND 0.02, epsilon 0.0001).

*Measured here:* for `oklch(0.7 0.3 150)`, naive clipping lands at hue 142.5, while the CSS method lands at L 0.709, C 0.210, hue 147.1 (`#00C248`).

**[Project]** Curated palette colors must be in sRGB, so a designer's chosen color is the color people actually get. Mapping remains available for derived colors and for future wide-gamut output.

**[Standard]** HEX has only 8 bits per channel, so converting to it rounds the color. *Measured here:* the worst round-trip error was ΔEOK 0.003 for L at or above 0.15, but reached 0.052 below that, because Oklab is highly sensitive near black. Tolerance rules must allow for this.

## 8. Perceptual effects the model does not capture

These are well-known effects described from general color science references. They were not re-verified against primary sources for this document.

- **Simultaneous contrast:** a color appears different depending on its surround.
- **Helmholtz-Kohlrausch effect:** saturated colors can look brighter than their luminance predicts.
- **Bezold-Brücke shift:** apparent hue changes with intensity.
- **Hunt effect:** colorfulness appears to increase with luminance.

**Implication:** numeric checks are necessary but not sufficient. Palettes must also be reviewed as rendered compositions.

## 9. What color does and does not communicate

**[Empirical]** Color psychology is less settled than marketing suggests. Andrew Elliot's 2015 review describes the field as being at an early stage, with much of the research underpowered, color often inadequately controlled, and theory focused on hue while largely overlooking chroma. It stresses that effects depend on context and recommends caution ([Elliot 2015](https://www.frontiersin.org/articles/10.3389/fpsyg.2015.00368/full)).

**[Empirical]** A study of 4,598 participants across 30 nations found strong similarity in color-emotion associations (average r = .88), but also differences by nation, shaped by linguistic and geographic proximity ([Jonauskaite et al. 2020](https://biopen.bi.no/bi-xmlui/bitstream/11250/2761614/1/Jonauskaite_etal_2020_PsychScience.pdf)). The study linked color *terms* to emotion concepts, so its results do not transfer directly to a specific shade in a specific brand.

**[Empirical]** Labrecque and Milne studied hue, saturation and value in relation to brand personality and purchase intent ([2012](https://link.springer.com/content/pdf/10.1007/s11747-010-0245-y.pdf)). Its main value here is showing that saturation and value matter as well as hue. Its findings are not industry rules.

**[Empirical]** Palmer and Schloss's ecological valence theory explains average color preference through feelings about associated objects ([2010](https://palmerlab.berkeley.edu/pdf/Palmer%26Schloss%282010%29.pdf)). This implies that associations are learned and can vary. A follow-up with Arabic speakers suggested that other factors are also involved ([Al-Rasheed et al. 2022](https://www.frontiersin.org/articles/10.3389/fpsyg.2022.1010108/pdf)).

**Rules that follow:**

1. The system makes no claim of the form "color X makes people feel Y".
2. It keeps no table that assigns a color to an industry. Category conventions are recorded separately, with sources, strength and confidence, and are shown as context the user can follow or avoid.
3. A cultural statement is allowed only with a source, a stated scope and hedged wording.
4. A category convention may be described as a convention. Recommendations may follow or depart from it, and the choice is recorded.

## 10. How professional systems use color

**[Convention]** Reviewed directly: Radix's step-based scale. The approach it shows, a purpose for every step, is supported by general design-system practice of separating raw palette values from semantic roles. That separation is the basis for the role model in this project.

**[Convention]** The familiar 60-30-10 distribution is a useful starting point. Area shares in this project are design targets and vary with the direction.

**Research gap:** no systematic survey of real brand palettes has been done yet, and Material Design's HCT documentation could not be retrieved. Claims about how brands use color should stay modest until the curated corpus is built from reviewed examples.
