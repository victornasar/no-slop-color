# Recommendation design

**Status:** v1 is implemented and installable as the `find-color` skill. `tools/query.mjs` handles retrieval, diverse selection, conventions and a default `pick`, giving each candidate a `chooseIf` condition. `tools/apply.mjs` turns a chosen pair into CSS, Tailwind or design tokens. `skills/find-color/SKILL.md` covers interpretation and presentation, in an interactive mode and an autonomous mode. The bundled `skills/find-color/scripts/find-color.mjs` contains all of this with the data built in, and `tools/check.mjs` runs the golden briefs against both. Not built yet: adapting a direction to an existing brand color, linked light and dark counterparts, and status colors.

## Core principle

**The language model interprets and explains. The curated data and deterministic code supply and verify the colors.**

A language model is good at understanding a brief. It is poor at inventing accurate color values, and left alone it tends toward the same generic palettes. So it never writes a HEX or OKLCH value. Every color comes from a curated direction or from a recorded calculation on one.

## Pipeline

```text
Brief
  -> 1. Interpret context
  -> 2. Derive signals
  -> 3. Retrieve curated directions
  -> 4. Select a diverse set
  -> 5. Adapt within limits
  -> 6. Validate
  -> 7. Explain
Structured recommendation
```

### 1. Interpret context

Turn the brief into structured context, recording each field as `stated`, `inferred` or `unknown`:

- Domains, from `contexts/domains.json`. A project may span several.
- Offering, audience, locale and positioning.
- Surfaces, such as packaging, a marketing site or a dense interface.
- Constraints, such as existing brand colors.

Each domain group lists **differentiators**, the questions that separate one project from another in that domain. They exist to prevent an industry label from standing in for the project. A proposal is still returned when facts are missing: unknowns become broader options and entries in `openQuestions`.

### 2. Derive signals

Express intent as **color properties**, never as a hue chosen for its supposed meaning:

| Axis | Example range | Typical source |
| --- | --- | --- |
| Foundation polarity | Light, dark or both | Surfaces and the environment of use |
| Chromatic commitment | From a small accent to full color fields | Positioning and need to stand out |
| Temperature | Warm, cool or open | Material, place or concept |
| Contrast posture | Quiet to stark | Reading conditions and tone |
| Convention posture | Follow, reference or depart | Competitors and the goal |
| Reading load | Minimum text contrast | Amount of long-form or dense content |

Hue stays **open by default**. A hue preference may arise only from a constraint, a concrete reference such as a material or place, a sourced cultural note, or a deliberate decision about category convention.

Each signal records its reason, and these mappings are design judgements. They are never presented as psychological effects.

### 3. Retrieve curated directions

Search the corpus using hard filters first, then fit.

**Hard filters:** required primary, avoided hue arcs, excluded direction ids and minimum text contrast.

**Fit score:** a weighted match between signals and measured direction properties, with weights tuned on the evaluation set. Domain may influence which differentiators get asked, but **domain is not a retrieval key**, so a direction is never reserved for one industry.

### 4. Select a diverse set

Choose directions that offer real alternatives, using a method such as maximal marginal relevance:

- Include more than one primary classification unless constrained.
- Require every two directions to differ on at least two of the diversity measures in [`03-data-model.md`](03-data-model.md): primary, foundation, structure, key-color hue, ground hue, figure hue, figure lightness, ground lightness, tint and accent.
- Across repeat calls, accept `excludeDirectionIds` so an agent can ask for something different.

The same input and corpus must return the same output.

**Default pick.** v1 names one `pick`: the highest-scoring direction in the selected set. When several are tied on score, they are ranked in three steps (`tieBreak` in `tools/query.mjs`):

1. **Contrast eligibility.** Only candidates at or above 7:1 (AAA) figure on ground take part. If none reach it, all take part, and `notes` says the pick is below AAA with its ratio. The pick is never presented as meeting AAA.
2. **Domain fit.** A direction's `industry` ids are listed closest fit first, so the candidate whose requested domains sit earliest in its list wins. Candidates not curated for any requested domain carry no fit evidence and rank after curated ones.
3. **Stable fallback.** Highest contrast, then id.

Above the threshold, contrast never decides on its own, so a 21:1 pair is not preferred for being 21:1. It is not penalised either: it wins when it is the closest curated fit, or when nothing separates the candidates. `pick.reason` names the step that decided.

**Cross-domain usage is not a ranking signal.** Being curated for fewer domains is rarity, not suitability. Each card reports it as `crossDomainUsage` (curated domains outside the request) for analysis, and multi-result diversity may use it, but it never changes which direction is the pick.

**The AAA gate can exclude a closer fit.** When at least one tied candidate reaches 7:1 and a candidate below it is listed earlier for the requested domains than the pick, the query says so in `notes`, so an agent can still offer it. At the time of writing, across every domain under the default, light, dark, quiet and bold settings:

| Domain | Closer fit, excluded | Pick |
| --- | --- | --- |
| Music | Afterhours, 5.51:1 | Blackout |
| Fine dining | Clay and Linen, 4.92:1; Lacquer Room, 4.11:1 | Oxblood and Pistachio |
| Healthcare | Clinic Blue, 3.66:1; Sage Morning, 4.23:1 | Lab Clean |
| Wellness (quiet) | Sage Morning, 4.23:1 | Matcha Field |
| Education (bold) | Tile and Courtyard, 5.33:1 | Porcelain and Indigo |
| Religious and educational institutions | Tile and Courtyard, 5.33:1 | Chalk and Slate; Porcelain and Indigo (bold) |
| Real estate (light) | Concrete and Brass, 6.98:1; Dusty Blue Room, 3.65:1 | Bottle Green Ledger |
| Art and illustration | Risograph, 3.61:1 | Gallery White |
| Advertising | Risograph, 3.61:1 | Ultramarine Field; Signal Yellow (light) |
| Marketing campaigns | Risograph, 3.61:1; Tangerine Wallet, 5.62:1 | Ultramarine Field |

Where no tied candidate reaches 7:1, fit decides and the pick is reported below AAA: Festival Primaries for festivals (5.22:1), Kelly Sheet for mobile applications (3.28:1), Dusty Blue Room for interior design (3.65:1) and Risograph for light marketing campaigns (3.61:1). Body text in these directions uses the derived text neutral, 8.61:1 to 10.09:1 on the ground.

### 5. Adapt within limits

A direction can be adjusted to fit, such as adopting an existing brand color. Adaptation stays in OKLCH and preserves the relationships that make the direction work:

- Rotate hues together, within limits, so relative hue distances hold.
- Keep each role's L, and its relative chroma where possible.
- Regenerate ranges with the recorded method.

If an adaptation fails validation or needs to move too far, the system selects a different direction. It does not force a poor fit.

### 6. Validate

Run every invariant in [`03-data-model.md`](03-data-model.md). Classifications are **recomputed** after adaptation, because adapting a color can change its tags. Output that fails is never returned.

Add a **generic-palette check**, which flags, and does not automatically ban, colors very close to overused framework defaults, and common patterns such as blue-to-violet gradients. The list is a project judgement and must be maintained.

### 7. Explain

Generate the reasoning from the measured results and the context. Each claim uses a `reasoning` kind, and these are checked:

- Numbers in `measured` claims must come from computed values.
- `cultural-context` claims need sources.
- Reject causal psychology such as "blue builds trust" or "red increases appetite".
- Say what a direction would suit **less well**, where useful.

## Category conventions

Domains still never pick a color. But some categories do have real, measured habits, and an agent should be able to say so. [`contexts/conventions.json`](../contexts/conventions.json) records each one with its domains, strength (`strong`, `soft` or `shifting`), confidence, sources and a stance:

| Stance | Example | Effect on the query |
| --- | --- | --- |
| `context` | Blue as the lead color in finance and technology | At most one selected direction follows it, and the presentation names it. `--convention follow` boosts followers; `--convention avoid` removes them |
| `preferred` | Black, or black and white, for luxury (a curator taste rule) | Followers rank higher |
| `cliche-risk` | Gold on black | Never boosted; flagged when selected |

Claims that could not be sourced, such as red for food, are listed under `unverified` and are not used.

## Avoiding stereotypes

| Risk | Safeguard |
| --- | --- |
| An industry always gets the same color | Domains hold no color and are not retrieval keys |
| One culture stands in for many | Cultural notes need sources, scope and hedged wording |
| The usual category color wins by default | Convention posture is explicit, and options vary it |
| Assumptions are hidden | Inferred fields and open questions are returned |
| Results look alike across briefs | Diversity rules, a repetition measure and the generic-palette check |

The two files in `examples/` show the intended result. Cybersecurity spans a quiet neutral interface, a warm lead color that departs from category habits, and a reworked dark theme. Children's products span bold color fields, a restrained natural palette and a narrative night-time direction.

## The curated corpus

Taste comes from here, and the corpus does not exist yet. Each entry would be a reviewed direction, not bound to an industry. It would need:

- Review of the rendered result on realistic layouts, because numeric checks are not sufficient.
- A recorded origin or reference, and the curator's reasoning.
- Passing all invariants.
- Coverage across foundations and structures, the hue circle, lightness and chroma, so the system does not cluster.

Coverage is weighed against evidence, not filled to quotas. A pattern common on award sites is not automatically a good recommendation. The current policy, from the Phase 2 decisions ([`research/report.md`](../research/report.md)) and enforced where it can be by [`library/policy.json`](../library/policy.json):

| Decision | Policy |
| --- | --- |
| D3 | Neutral was under-represented (10 directions against 49% of award pairs). Blackout, Slate Press and Overcast were added; Blackout is the library's only pure #000000 and #FFFFFF pair |
| D2 | Image-Led is the other gap. No direction until its model is validated on independent data |
| D4 | Two-Tone (11) and Light + Muted (7) are paused: the build fails if either grows. Existing directions stay. The seven Light + Muted directions were reviewed for overlap and kept ([`research/data/analysis/light-muted-overlap.md`](../research/data/analysis/light-muted-overlap.md)) |
| D7 | Hue balance is a prompt for future curation, not a target. Against award chromatic colors the library leans violet and has no magenta, but award frequency says nothing about which hues suit a brief |
| D8 | Foundation and saturation shares are not adjusted on their own |

Generated candidates may be proposed, but only reviewed ones may enter.

## Evaluation

Run a test set before trusting the system:

| Test | Passes when |
| --- | --- |
| Coverage | All 89 domains produce valid, diverse results |
| Contextual response | Different briefs in one domain produce different directions |
| Repetition | No direction or hue family dominates across domains |
| Invariants | All output validates |
| Claims | No unsupported psychology and no unsourced cultural claims |
| Human review | Designers rate the results as usable and distinct |

The human review is the one that decides whether this is tasteful. No automated test can settle that.

## Future agent interface

The structured response is designed for direct use. A later interface, such as an MCP server, could offer:

| Tool | Purpose |
| --- | --- |
| `recommend_colors(brief, constraints)` | Return a `recommendation` |
| `get_direction(id)` | Fetch one direction |
| `list_classifications()` | Return definitions |
| `validate_palette(direction)` | Check an agent's existing palette against the invariants |

These are a sketch. The interface should be designed after the corpus exists, since the corpus will determine what is practical.
