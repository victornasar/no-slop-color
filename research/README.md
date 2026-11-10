# Research

Evidence for testing the provisional classifications. Not yet run.

| Path | Contents |
| --- | --- |
| `data/source.json` | The SOTD Index data file, pinned to an upstream commit with its SHA-256. The file itself is not redistributed |
| `data/review-selection.json` | 240 sites chosen for a thumbnail review: every Site of the Month or Year from 2018, plus 120 random two-color Sites of the Day stratified by year |
| `tools/select.mjs` | Rebuilds the selection from the pinned data (seed 20261110) |
| `data/observations-v0.json` | 14 homepage observations from the earlier v0 prototype (captured 2026-11-09), showing where area alone misleads |
| `tools/palette-from-image.mjs` | Reduces a screenshot to an area-weighted palette, ported from v0 |
| `tools/sheets.mjs` | Downloads the selected thumbnails and lays them out as numbered review sheets in `.cache/` |

`.cache/` holds the downloaded data, thumbnails and sheets. It is not committed, because it contains third-party images.

## Known limits of the source

- Recorded colors were chosen by the people who submitted the sites, not measured.
- Until 2021, Awwwards recorded category swatches from a fixed set of black, white and eight hues. Exact colors appear from 2022 and cover almost every entry from 2023. Saturation, and so Muted versus Vibrant, can be measured only for the exact-color era.
- The order of recorded colors does not identify the ground.
