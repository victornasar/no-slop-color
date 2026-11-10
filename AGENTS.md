# no-slop-color

Curated color pairs for agents.

## Picking colors for a project

Follow [`skills/find-color/SKILL.md`](skills/find-color/SKILL.md). From a clone, the engine is either `skills/find-color/scripts/find-color.mjs`, the bundled file the skill ships, or `node tools/cli.mjs`, the same commands run against the source files.

## Changing the library

1. Edit pairs in `library/source/*.json`. Write colors in OKLCH and never set HEX by hand. List `industry` ids closest fit first, because the order breaks ties for the default pick.
2. Run `node tools/build.mjs all`. This:
   - Rebuilds `examples/` and `library/directions.json`.
   - Checks the Image-Led path on the fixture in `tools/fixtures/`.
   - Regenerates the bundled skill script.
   - Runs the golden briefs in `tools/golden.json`.
3. The build stops on any of these:
   - An out-of-gamut color.
   - An unexpected display label (a source's `expect`).
   - A contrast failure for a stated use.
   - A near-duplicate direction.
   - A display label paused in `library/policy.json` growing past its cap.
   - A golden brief that changed.
   - A bundle that disagrees with the repo.

   If a recommendation changed on purpose, update `tools/golden.json` and say why in the commit.

Rules that never bend:

- No invented colors, only measured or curated ones.
- No unsourced psychology or industry folklore.
- Conventions are context, not rules.

See [`README.md`](README.md) and [`docs/`](docs/).
