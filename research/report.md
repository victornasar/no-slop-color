# Phase 2 report: testing the color system against award sites

9 November 2026. Evidence: every Awwwards Site of the Day in the pinned SOTD Index (6,295 sites, June 2009 to October 2026) and a visual review of 320 thumbnails.

The question was whether the eight provisional primaries describe the color patterns of award-winning sites, or whether the evidence points to a more useful classification, and what that means for the 48 directions. **Nothing in the library or the classifications has been changed.** Section 6 lists the decisions this report asks for.

## 1. Short version

- **Award pairs are mostly neutral and, when they use color, mostly vibrant.** Of 1,157 exact two-color records from 2023 onward, 49% are neutral pairs and 15% are pure black and white. Where one color is chromatic, it is vibrant 73% of the time.
- **About a third of award sites have no flat pair at all.** In the random exact-era sample, 36% (95% CI 27–47%) could not be given a pair, mostly because a photograph fills the frame. Neither model has a place for them.
- **The eight-way list mixes two questions.** It hides Light/Dark for 56% of reviewed pairs, and it ties saturation to a threshold that cuts through the middle of the data. The two-axis model (structure + foundation, saturation as a tag) loses less, and its structure half can be measured from recorded colors without knowing the ground.
- **The library leans away from the evidence in three primaries.** It has fewer Neutral directions than award sites would suggest, and more Two-Tone and Light + Muted. It has no black-and-white direction and no image-led direction, it leans light, and it leans violet.
- **These are prompts, not quotas.** A pattern common on award sites is not automatically a good recommendation.

## 2. Evidence and its limits

### Source

The SOTD Index data file, pinned to commit `54d2f17` and verified by SHA-256 on every load (`data/source.json`). The colors on each Awwwards page were **chosen by the site's submitter**, not measured from the site.

### Two kinds of record, never mixed

| Dataset | Sites | What it can establish |
| --- | ---: | --- |
| Exact colors, 2023 onward | 1,308 (1,157 two-color pairs) | Lightness, chroma, hue, temperature, contrast, structure. Not which color is the ground |
| Category swatches, before 2023 | 4,491 | Which of ten fixed swatches were chosen: whether any hue was recorded, which hue names, black and white. Nothing about actual lightness, chroma or exact hue |
| Excluded | 496 | 379 with no colors; 117 exact records before 2023 |

The 117 early exact records are excluded on purpose. In 2022, black-and-white records cannot be told apart from legacy swatches, so keeping only the visibly exact ones would admit chromatic records and shut out neutral ones.

Category-swatch findings are reported only at category level. Red, orange and pink swatches sit within 18° of OKLCH hue, so even "two different hue swatches" does not mean two hue families. **No precision is claimed for the earlier records, and the two eras are not compared on a common scale**, because a difference between them could come from the change in recording method.

### The thumbnail sample

320 sites in three groups, chosen by `tools/select.mjs` with fixed seeds (20261110; group C 20261111):

| Group | Rule | Sites | What it can say |
| --- | --- | ---: | --- |
| A | Every Site of the Month or Year, 2018 onward | 120 | The top tier, described as counts |
| B | Two-color Sites of the Day, 7 or 8 random per year, 2011–2026 | 120 | Spread over time, described as counts |
| C | Two-color exact-era Sites of the Day, random from 1,111 eligible | 80 | **Estimates** for exact-era two-color Sites of the Day, with 95% Wilson intervals |

The groups are never pooled into a prevalence figure. Group C's draw rule first excluded pure black-and-white records. That was corrected before review, because it would have skewed the sample toward chromatic. C now holds 11 pure black-and-white sites (13.8%), against 14.9% in its population. The eligible pool included up to 21 December 2022 records; none were drawn.

### The review

One reviewer (Claude) judged ground, figure, accent, composition and a proposed label for every thumbnail, reading each one beside a pixel measurement of how much of the thumbnail sits near each recorded color (`data/thumbnail-review.json`, `data/thumbnail-measures.json`). These are judgements, not measurements:

- Thumbnails are small submitter images. 38% of group C thumbnails are device mockups, against about 5% in the category era.
- Unrecorded colors are described in words and never given values.
- There is no second rater. A spot-check of the medium- and low-confidence entries would strengthen every finding that depends on the review.

## 3. What award pairs look like

### Exact colors, 2023 onward (records)

| Structure (needs no ground) | Pairs | Share |
| --- | ---: | ---: |
| Neutral: both colors C ≤ 0.04 | 570 | 49.3% |
| Chromatic: one color chromatic | 394 | 34.1% |
| Two-Tone: both chromatic, > 30° apart | 149 | 12.9% |
| Monochromatic: both chromatic, within 30° | 44 | 3.8% |

- 170 of the 570 neutral pairs are pure #000000 and #FFFFFF (14.7% of all pairs).
- Of 857 chromatic colors, 73.4% are vibrant and 333 sit at the sRGB maximum chroma for their lightness and hue. Orange-red (hue ≈ 30°) is 25.7% of chromatic colors and violet (≈ 270°) 17.2%.
- Contrast between the two colors: high 58.8%, moderate 20.1%, low 21.2%.
- No exact record holds more than two colors, so **Colorful / Multicolor cannot be measured from the records**.
- From 2023 to 2026, no structure share moved by more than about 5 points.

The review tempers this. **The record holds both ground and figure for only about 40% of sites in every group**, and in 15–18% the visible ground is not recorded at all. So these shares describe what submitters chose to record. In group C, the reviewed exact pairs agree with the population: Neutral 47.1% (CI 31.5–63.3) and Two-Tone 11.8% (CI 4.7–26.6).

### Category swatches, 2009–2022 (records, category level only)

- 34.6% of records use only black, white or gray swatches; 34.4% add one hue swatch; 24.0% use two or more hue swatches.
- Black + white is 35% of two-swatch records.
- Of records with any hue, 49.9% use warm-named swatches only and 26.2% cool-named only.

## 4. Do the eight candidates fit?

**Not as one flat list.**

1. **A third of sites need a category the system lacks.** In group C, 36.3% (CI 26.6–47.2%) of sites are Unresolved, and 22.5% (CI 14.7–32.8%) have an image as their ground. Families of the proposed labels:

   | Family | A | B | C |
   | --- | ---: | ---: | ---: |
   | Photo-led | 22 | 23 | 17 |
   | Multicolor imagery or blocking | 12 | 7 | 3 |
   | Mockup hides the site | 0 | 3 | 6 |
   | Dark ground, luminous figure | 6 | 0 | 2 |
   | Illustration-led | 3 | 2 | 1 |
   | Tonal, low contrast | 2 | 1 | 0 |
   | Gradient-led | 0 | 1 | 0 |

   Photo-led alone is 21.3% of group C (CI 13.7–31.4%).

2. **Multicolor exists, but not as the rule defines it.** The rule needs an accent holding at least 15% of the area, which no record states. The review found multicolor sites, but as imagery or color blocking, and mostly in group A.

3. **Uneven labels.** Neutral alone is half of all pairs. The four "ground + saturation" labels together are at most 34%. Dark + Muted is between 0.7% and 7.4%, depending on how the undecided pairs resolve.

4. **Thresholds against the shape of the data** (exact colors):

   | Threshold | Where it falls |
   | --- | --- |
   | Light ground, L 0.60 | **Sound for neutral grounds.** Neutrals split into dark (L 0–0.30) and light (L 0.80–1.0); only 54 of 1,607 sit between 0.35 and 0.75. **Weak for chromatic grounds**, whose lightness peaks at 0.60–0.70, right on the line |
   | Vibrant, relative chroma 0.65 | **On a slope.** Relative chroma rises steadily to a spike at maximum chroma, with no gap near 0.65 |
   | Neutral, C 0.04 | On the tail of the neutral peak; the lowest density is near C 0.05 |
   | Hue family, 30° | A slight dip, on counts too small to rely on |

5. **Ground order and area.** List order is a weak signal for the ground: in reviewed two-color records the ground is listed first in 63.3% (C), 54.5% (B) and 63.6% (A). Thumbnail area finds the ground in 81.6% (C), 81.8% (B) and 65.7% (A), which is useful but not reliable without a look.

## 5. Eight-way against two-axis

| Test | Eight-way | Two-axis |
| --- | --- | --- |
| Places the 31–38% of sites with no flat pair | No | No |
| Settled by the recorded colors alone (1,157 pairs) | 77.4% | Structure 100%; foundation 22.6% |
| Keeps Light/Dark | Hidden for 34 of 61 reviewed exact pairs (55.7%) | Always |
| Keeps saturation | Only for single-chromatic pairs | For every pair, as a secondary tag |
| Reviewed pairs near a threshold | 19.7% | 19.7% |

The fragility row is a tie only because no reviewed pair sat near the vibrant floor. Across all exact pairs, 3.3% do, and that floor has no natural gap to protect it.

**Recommendation: adopt the two-axis model as the primary classification.** Keep Vibrant/Muted as a measured secondary tag. The eight flat labels can stay as display names derived from the two axes, if they are useful to people choosing a direction.

## 6. Decisions

Each item gives the evidence and a recommendation. Nothing changes until you decide.

### D1. Which primary model

Two-axis, as above. If accepted, `classifications/primary.json`, `tools/classify.mjs` and `docs/02-classification-system.md` change, and `tools/golden.json` will need updating, with the reason recorded in the commit.

### D2. Image-led sites

A third of award sites carry their color through imagery. Options:

- (a) Leave them Unresolved and say so plainly in the docs.
- (b) Add an **Image-Led** value outside the pair structure, with foundation taken from the overall tone, so a direction can be "photograph + type color".
- (c) Treat photography as an accent-free Neutral pair plus imagery.

**Recommendation: (b), tested on the 62 photo-led review entries before any directions are added.** The library cannot currently recommend anything for the most common unresolved case.

### D3. Neutral and black-and-white

The library has 10 Neutral directions (20.8%); award pairs are 49.3% neutral, and 14.7% are pure black and white. The library has no black-and-white direction.

**Recommendation: curate a small number of neutral directions, including at least one near-pure black-and-white pair with a real point of view** (type color, accent policy). Don't add plain defaults. The project exists to avoid generic palettes, so the value is in what makes a black-and-white direction specific.

### D4. Two-Tone and Light + Muted

| Primary | Library | Award range |
| --- | ---: | ---: |
| Two-Tone | 11 directions (22.9%) | 12.9% |
| Light + Muted | 7 directions (14.6%) | 1.8–8.6% |

The Light + Muted directions are Kraft and Black, Bare Skin, Clay and Linen, Sage Morning, Dusty Blue Room, Cabin Navy and Bottle Green Ledger.

**Recommendation: keep them.** Matching award frequency is not the library's goal, and the library's coverage contexts were not compared with the Awwwards categories. But review the seven Light + Muted directions together for overlap, and stop adding to either primary until the gaps in D2 and D3 are filled. A primary was flagged only when the library is at least two whole directions outside the award range; Monochromatic Foundation (3 directions against 3.8%) is within it.

### D5. Ground lightness and the chromatic mid-tone

Chromatic colors cluster at L 0.60–0.70, exactly where Light turns to Dark. Options:

- (a) Keep the binary split with the existing review band.
- (b) Add a **Mid** foundation for chromatic grounds between L 0.50 and 0.70.

**Recommendation: (a) for now**, with lowered confidence in the band. Revisit when more chromatic-ground pairs have been reviewed; the evidence here (6 reviewed pairs in the band) is too thin to justify a new value.

### D6. Two individual directions

- **Cabin Navy** (Light + Muted): figure relative chroma 0.658, within 0.05 of the vibrant floor, which sits on a slope. Under D1 this stops being a primary question; until then its label is fragile.
- **Tangerine Wallet** (Two-Tone): orange ground at L 0.70, C 0.18, a mid-tone that the rule calls Light. It is affected by D5.

**Recommendation: no change to either direction's colors**; note the fragility in their curation text.

### D7. Hue balance

| Hue family | Library | Award chromatic colors |
| --- | ---: | ---: |
| Violet (≈ 270°) | 28.3% | 17.2% |
| Orange-red (≈ 30°) | 13.2% | 25.7% |
| Magenta (≈ 300°) | 0% | 5.0% |

**Recommendation: a prompt for future curation, not a correction.** Hue frequency on award sites says nothing about which hues suit a given brief.

### D8. Library foundation and saturation

- Light grounds: library 62.5%; group C estimate 44.8% (CI 32.7–57.5%).
- Vibrant single-chromatic directions: library 13 of 23 (56.5%); award pairs 72.8%.

**Recommendation: no action on its own.** Both shift naturally if D2 and D3 add dark neutral and image-led directions.

## 7. What this cannot say

- **Whether the patterns work.** Award selection reflects juries and fashion; it does not measure readability, conversion or fit for a brand.
- **Anything aesthetic.** The secondary aesthetic tags, and the merge candidates in `docs/02-classification-system.md` (for example Sophisticated, Elegant and Luxurious), were not tested; that needs curated judgement on a different sample.
- **The real colors of the category-era sites.** Only the submitter's category choice is known.
- **What a second reviewer would see.** Review-dependent findings rest on one reviewer.

## 8. Reproducing

```sh
node research/tools/select.mjs          # selection (fixed seeds)
node research/tools/analyze.mjs         # Step 2: datasets, exact, category, sample, library
node research/tools/sheets.mjs          # thumbnails and sheets into research/.cache (not committed)
node research/tools/thumb-measure.mjs   # pixel measurements for the review
node research/tools/review-summary.mjs  # Step 3: validates and summarises the review
node research/tools/compare.mjs         # Step 4: classification, models, library challenge
```

Every script is deterministic. Generated summaries live in `research/data/analysis/`: `summary.md` (Step 2), `review.md` (Step 3) and `compare.md` (Step 4). The JSON beside them holds every figure in this report.
