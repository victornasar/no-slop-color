# Errata to the Phase 2 report

`report.md` is kept as written. Corrections found while applying its decisions are recorded here.

## 1. "No black-and-white direction" (sections 1, 6 D3)

The report says the library has no black-and-white direction. That is true only for **pure** #000000 on #FFFFFF, which is what the figure (14.7% of exact award pairs) measures. The library already had two **near**-black-and-white pairs with zero chroma:

| Direction | Ground | Figure |
| --- | --- | --- |
| Gallery White | L 0.99, `#FCFCFC` | L 0.16, `#0D0D0D` |
| Atelier Black | L 0.15, `#0B0B0B` | L 0.97, `#F5F5F5` |

The gap was smaller than stated. D3 was applied with this in mind: the new Blackout direction is the pure pair, and it had to differ from these two to pass the build's diversity rule.

## 2. Cabin Navy's borderline Muted tag (section 6 D6)

The report says Cabin Navy's figure has relative chroma 0.658, within 0.05 of the vibrant floor. That is correct, but it is not why the figure is Muted. Vibrant needs both relative chroma at least 0.65 and C at least 0.08. Flight Navy clears the relative floor and is Muted only because its C, 0.065, is under 0.08. The classifier's own near-floor flag checks relative chroma only for colors that clear the C floor, so it does not flag Cabin Navy. The curation note on the direction states the actual mechanism.

Update: the classifier now also flags a color whose relative chroma clears its floor and whose C is within 0.02 of 0.08, since C then decides the tag. This flags Cabin Navy, and Mint Ledger, Burgundy Silk, Cyanotype and Club Cream as well. The flag does not lower confidence.

## 3. Image-Led test (section 6 D2)

The report recommended an Image-Led value "with foundation taken from the overall tone". That version was tested before any direction was written, with criteria fixed in advance, and failed: see `data/analysis/image-led-test.md`. Image-Led was introduced without a foundation, and no direction has been written.
