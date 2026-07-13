# Phase eleven visual production work-order verification

Verified on GitHub Actions on 2026-07-13.

- Workflow run: `29291693836`
- Job: `86956492759`
- Result: passed

## Purpose

The existing HTML PPT workflow could declare a visual decision in `deck.json` and inspect the rendered result, but it did not provide a durable production queue between those two states.

Phase eleven adds a tool-neutral visual production lifecycle:

```text
deck.json planning
→ per-slide work orders
→ asset / screenshot / DOM production
→ synchronization
→ delivery validation
→ rendered visual QA
```

The workflow supports GPT, Claude, local image models, screenshot tools, human designers, and semantic HTML/SVG/chart production without coupling the Skill to one image provider.

## Planning and delivery stages

Manifest and work-order validation now distinguish two stages.

### Planning

A required visual may be:

- `planned`
- `missing`
- `ready`

Incomplete required visuals are reported as warnings so the narrative, registered layouts, prompts, asset sources, and slot ratios can be reviewed before production.

### Delivery

Every required visual must be `ready`.

Delivery validation blocks:

- required visuals that are not ready
- required visuals marked `not-needed`
- missing file paths
- remote or data-URL work-order paths
- paths outside the deck project
- missing files
- non-file paths
- missing target ratios for file deliveries
- ratio mismatches beyond the configured tolerance
- missing alt text on meaningful file visuals
- missing prompts for generated visuals
- work-order drift from `deck.json`
- omitted or duplicated slide work orders
- work orders belonging to another deck

`validate-manifest.mjs` continues to default to delivery mode, preserving the previous strict final-delivery behavior.

## Work-order contract

New schema:

```text
schemas/visual-work-orders.schema.json
```

Every slide produces one ordered work order with:

- stable work-order ID
- slide ID and order
- headline, purpose, and registered layout
- visual type, source, role, required flag, and status
- delivery type: `file`, `dom`, `typography`, or `none`
- slot ratio
- path, alt text, and focal position when applicable
- production brief and instructions
- generated-image prompt and exclusions when applicable
- optional notes, credit, and license

The JSON work orders are the machine-readable production queue. A synchronized Markdown file provides a human-readable review and handoff view.

## Commands

### Build

```bash
node scripts/build-visual-work-orders.mjs deck.json \
  --output qa/visual-work-orders.json \
  --markdown qa/visual-work-orders.md \
  --stage planning \
  --force
```

### Validate

```bash
node scripts/validate-visual-work-orders.mjs \
  qa/visual-work-orders.json \
  --deck deck.json \
  --stage planning

node scripts/validate-visual-work-orders.mjs \
  qa/visual-work-orders.json \
  --deck deck.json \
  --stage delivery \
  --strict
```

### Synchronize

```bash
node scripts/sync-visual-work-orders.mjs \
  qa/visual-work-orders.json \
  --deck deck.json \
  --stage delivery \
  --write
```

Without `--write` or `--output`, synchronization performs a compatibility dry run and changes no files.

## Project generation

`create-deck.mjs` now automatically creates:

```text
qa/
├── visual-work-orders.json
└── visual-work-orders.md
```

The generated project README identifies the files, adds visual production and synchronization to the production order, and includes delivery-stage validation commands.

The work-order JSON points back to `../deck.json`, contains exactly one item for each generated slide, and passes strict planning validation.

## File inspection

Dependency-free image-dimension inspection supports:

- PNG
- JPEG
- GIF
- WebP
- SVG

The default relative ratio tolerance is 5%. It can be changed explicitly with `--ratio-tolerance`, but should not be loosened to hide incorrect framing.

The validator resolves paths relative to the deck project, checks path containment, verifies the file exists, and compares source dimensions with the declared slot ratio.

## Generated visual prompts

When a generated visual has no explicit prompt, the builder synthesizes a production prompt from:

- slide headline
- purpose
- narrative role
- slot ratio
- focal position
- theme or style direction
- layout-safe negative space
- exclusions

Default exclusions prohibit:

- text
- letters
- numbers
- logos
- watermarks
- signatures
- presentation chrome
- slide borders
- captions
- page numbers

The synthesized prompt is a production starting point and remains reviewable in both JSON and Markdown.

## DOM and typographic visuals

The lifecycle does not equate visual completeness with image count.

Semantic HTML/CSS, SVG diagrams, charts, timelines, workflows, comparisons, and system diagrams are represented as `dom` deliveries. Intentional covers, statements, section resets, quotes, and closings may be represented as `typography` deliveries.

Exact labels and critical numbers remain semantic DOM text instead of being rasterized into generated images.

## Synchronization safety

Synchronization updates only visual-production fields:

- asset ID
- type
- required flag
- status
- source
- role
- slot
- path
- alt text
- focus
- prompt
- brief
- exclusions
- instructions
- notes
- credit
- license

It does not change:

- slide IDs
- slide order
- purpose
- headline
- registered layout
- source-to-slide mapping
- theme configuration
- HTML structure

Synchronization refuses a different deck or a work-order file that omits a slide.

## Automated coverage

The new regression suite verifies:

1. one ordered work order per slide;
2. generated prompt synthesis and exclusions;
3. planning warnings versus delivery errors;
4. synchronized ready assets;
5. SVG dimension and 16:9 ratio validation;
6. wrong-ratio failure;
7. missing-alt failure;
8. path-escape failure;
9. deck-ID mismatch rejection;
10. omitted-slide rejection;
11. overwrite protection;
12. CLI build, validate, synchronize, and strict-delivery round trip;
13. planning and delivery behavior in `validate-manifest.mjs`;
14. automatic work-order creation in newly generated themed projects.

## Authoritative complete regression

The final workflow passed:

- visual production script syntax
- deck and work-order schema parsing
- complete core regression
- fixed-stage runtime regression
- presenter-mode regression
- constrained editor regression
- semantic visual-QA regression
- strict task-registry validation
- all 10 task contracts
- existing 12-page Chinese production example
- delivery-stage visual work-order generation and strict validation for the production example
- example structural validation, strict manifest validation, semantic visual QA, bundling, and bundled-output validation
- all 10 rendered task cases
- all 52 task slides through semantic visual QA, contact-sheet generation, and mechanical Playwright QA

## Scope

Permanent changes are confined to `ppt/`. No image provider API, account system, cloud queue, collaboration layer, native PPTX output, free-form editor behavior, or repository-level permanent workflow is added.

All one-time patch scripts, trigger files, and feature-branch workflows were removed before finalization. The existing `扩图/` Skill remains unchanged.
