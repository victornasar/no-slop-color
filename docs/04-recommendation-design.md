# Recommendation design

This describes how contextual recommendations should work. Nothing here is implemented yet.

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
- Require each pair to differ on at least two of: primary classification, foundation polarity, chromatic area, primary hue and primary lightness.
- Across repeat calls, accept `excludeDirectionIds` so an agent can ask for something different.

The same input and corpus must return the same output.

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
- Coverage across the three primaries, the hue circle, lightness and chroma, so the system does not cluster.

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
