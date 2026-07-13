# Visual production work orders

Visual planning decides what each slide needs. Visual production work orders turn those decisions into an executable, auditable queue for image generation, screenshot capture, supplied-asset review, HTML/SVG diagrams, charts, and intentional typographic pages.

The workflow is tool-neutral. GPT, Claude, local image models, browser capture tools, or human designers may fulfill the same work orders.

## Contracts

The visual production lifecycle uses three files:

| File | Responsibility |
|---|---|
| `deck.json` | Narrative, layout, visual decision, and final synchronized delivery state |
| `qa/visual-work-orders.json` | Executable per-slide production queue |
| `qa/visual-work-orders.md` | Human-readable review and handoff view |

Schemas:

- [`../schemas/deck.schema.json`](../schemas/deck.schema.json)
- [`../schemas/visual-work-orders.schema.json`](../schemas/visual-work-orders.schema.json)

A generated project includes both work-order files automatically.

## Lifecycle stages

### Planning

Planning allows a required visual to be `planned` or `missing`. The state is visible and reviewable but cannot be delivered.

```bash
node scripts/validate-manifest.mjs project/deck.json \
  --html project/index.html \
  --stage planning

node scripts/validate-visual-work-orders.mjs \
  project/qa/visual-work-orders.json \
  --deck project/deck.json \
  --stage planning
```

Use planning validation while the outline, layouts, prompts, source selection, and slot ratios are still being resolved.

### Delivery

Delivery requires every required visual to be `ready`. File assets must exist inside the project, have a valid slot ratio, and provide meaningful alternative text unless the role is purely decorative.

```bash
node scripts/validate-manifest.mjs project/deck.json \
  --html project/index.html \
  --stage delivery \
  --strict

node scripts/validate-visual-work-orders.mjs \
  project/qa/visual-work-orders.json \
  --deck project/deck.json \
  --stage delivery \
  --strict
```

`validate-manifest.mjs` defaults to `delivery`, preserving the existing strict final-delivery behavior.

## Generate the work orders

```bash
node scripts/build-visual-work-orders.mjs \
  project/deck.json \
  --output project/qa/visual-work-orders.json \
  --markdown project/qa/visual-work-orders.md \
  --stage planning \
  --force
```

The builder creates exactly one ordered work order for every slide. It never silently omits text-only, typographic, or DOM-based visuals.

Each work order records:

- stable work-order ID and slide ID
- slide order, headline, purpose, and registered layout
- visual type, role, source, required flag, and status
- delivery form: `file`, `dom`, `typography`, or `none`
- target slot ratio
- path, alt text, and focal position when applicable
- production brief and source-specific instructions
- generated-image prompt and exclusions when applicable
- notes, credit, and license when supplied

## Delivery forms

### File

Used for:

- supplied images
- generated images
- product or interface screenshots

Delivery checks include:

- local path exists and remains inside the deck project
- path resolves to a file
- target slot ratio is declared
- source dimensions can be inspected
- actual ratio is within 5% of the declared slot by default
- meaningful non-decorative visuals include alt text
- remote references are rejected for final delivery

Dimension inspection supports:

- PNG
- JPEG
- GIF
- WebP
- SVG

Use `--ratio-tolerance <n>` to change the relative tolerance for an exceptional case. Do not loosen the tolerance to conceal poor framing.

### DOM

Used for:

- HTML/CSS visualizations
- inline SVG diagrams
- charts
- timelines
- workflow, system, and comparison diagrams

Build exact labels and critical data as semantic DOM text. Do not rasterize precise labels merely to satisfy the work order.

### Typography

Used for:

- typographic covers
- section resets
- statement slides
- quote slides
- intentional text-led closings

Typography is a valid visual treatment. Do not add decorative images solely to increase image count.

### None

Use only when the absence of a visual is intentional and explained. A required visual cannot be marked `not-needed`.

## Source-specific production

### Generated images

The builder synthesizes a prompt when `deck.json` does not already provide one. The prompt includes:

- slide claim
- purpose and narrative role
- slot ratio
- focal position
- theme direction
- negative-space requirement
- exclusions for text, logos, watermarks, slide chrome, and captions

Review and refine the generated prompt before calling an image model. Generated images remain assets inside the slide; they must not be pre-rendered slide screenshots.

### Screenshots

Capture the real interface or product state that proves the slide claim.

- preserve readable UI text
- preserve brands, dates, numbers, and product state
- do not regenerate critical UI labels
- use pixel-faithful framing when the screenshot is evidence
- record crop focus without altering the underlying screenshot

### Supplied assets

Before marking a supplied asset ready, verify:

- provenance and usage permission
- sufficient source resolution
- correct or intentionally framed ratio
- narrative relevance
- no stale, duplicated, or contradictory content

Use `credit` and `license` fields when required.

## Synchronize completed work

After paths, statuses, alt text, focus, prompts, and notes are updated in the work-order JSON, synchronize the approved fields back to `deck.json`:

```bash
node scripts/sync-visual-work-orders.mjs \
  project/qa/visual-work-orders.json \
  --deck project/deck.json \
  --stage delivery \
  --write
```

The synchronizer updates only visual-production fields. It does not change:

- slide IDs
- slide order
- layouts
- headlines or purpose
- source-to-slide mapping
- theme tokens
- HTML structure

It refuses to synchronize a different deck or a work-order file that omits a slide.

Without `--write` or `--output`, the command performs a dry compatibility check and changes nothing.

## Regeneration and drift

Regenerating work orders from `deck.json` overwrites production progress unless the completed fields have first been synchronized back to the deck.

Recommended loop:

1. update `deck.json` narrative and visual decisions;
2. build work orders;
3. fulfill or revise the work orders;
4. synchronize them back to `deck.json`;
5. run delivery validation;
6. author or update the HTML;
7. run rendered visual QA and contact-sheet review.

The work-order validator reports drift between the work orders and `deck.json`. Drift is a warning during planning and an error during delivery.

## Completion definition

Visual production is complete only when:

- every deck slide has exactly one work order;
- all required work orders are `ready`;
- every required file asset exists inside the project;
- file ratios match their declared slots;
- meaningful file visuals have alt text;
- generated visuals have usable prompts and exclusions;
- work-order values are synchronized into `deck.json`;
- delivery-stage manifest and work-order validation pass;
- rendered semantic visual QA and contact-sheet review pass.

Work-order validation proves production readiness. It does not replace human review of visual quality, factual correctness, composition, or brand fidelity.
