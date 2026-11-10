# Research

Evidence for testing the provisional classifications. Phase 2 is in progress: all five steps have run. Findings and the decisions they raise are in [`report.md`](report.md).

| Path | Contents |
| --- | --- |
| `report.md` | Phase 2 report: findings, limits and the decisions they raise |
| `data/source.json` | The SOTD Index data file, pinned to an upstream commit with its SHA-256. The file itself is not redistributed |
| `data/review-selection.json` | 320 sites chosen for a thumbnail review, in three groups reported separately: (A) every Site of the Month or Year from 2018, (B) 120 random two-color Sites of the Day stratified by year, (C) 80 random two-color Sites of the Day with exact recorded colors, 2023 onward |
| `tools/select.mjs` | Rebuilds the selection from the pinned data (seed 20261110; group C uses 20261111) |
| `tools/analyze.mjs` | Swatch analysis of every site. Labels pairs with the library's own classifier under both possible ground assignments |
| `data/analysis/datasets.json` | Record counts, the exact and category dataset definitions, and every exclusion |
| `data/analysis/exact.json` | Findings from exact recorded colors, 2023 onward |
| `data/analysis/category.json` | Findings from category swatches, before 2023, limited to what swatches can establish |
| `data/analysis/sample.json` | The thumbnail selection, per group, never pooled |
| `data/analysis/library.json` | The library's mix, for comparison with the exact pairs |
| `data/analysis/summary.md` | Generated readable summary of the files above |
| `tools/thumb-measure.mjs` | Measures how much of each thumbnail is near each recorded color; suggests a ground for the visual review |
| `data/thumbnail-measures.json` | Those measurements, numbers only |
| `data/thumbnail-review.json` | The visual review: ground, figure, accent, composition, mockup flag, proposed label and confidence for all 320 sites. Judgement, not measurement |
| `tools/review-summary.mjs` | Validates the review against the selection and summarises it per group |
| `data/analysis/review.json`, `review.md` | Review summary, per group, exact and category records apart |
| `tools/compare.mjs` | Classifies the reviewed pairs by evidence tier, compares the eight-way and two-axis models, and sets the evidence against the library without changing it |
| `data/analysis/classified.json`, `models.json`, `library-challenge.json`, `compare.md` | Those results |
| `data/observations-v0.json` | 14 homepage observations from the earlier v0 prototype (captured 2026-11-09), showing where area alone misleads |
| `tools/palette-from-image.mjs` | Reduces a screenshot to an area-weighted palette, ported from v0 |
| `tools/sheets.mjs` | Downloads the selected thumbnails and lays them out as numbered review sheets in `.cache/` |

`.cache/` holds the downloaded data, thumbnails and sheets. It is not committed, because it contains third-party images.

## Known limits of the source

- Recorded colors were chosen by the people who submitted the sites, not measured.
- Until 2021, Awwwards recorded category swatches from a fixed set of black, white and eight hues. Exact colors appear from 2022 and cover almost every entry from 2023. Saturation, and so Muted versus Vibrant, can be measured only for the exact-color era.
- The order of recorded colors does not identify the ground.
