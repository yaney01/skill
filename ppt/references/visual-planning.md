# Visual planning

Visual planning happens before HTML generation. The goal is not to maximize image count; it is to decide how each slide communicates and to prevent a complete deck from becoming a sequence of text containers.

## Required output

Create or update `deck.json` before authoring the full deck. Use `schemas/deck.schema.json` as the contract.

<!-- phase-eleven-visual-production -->
Then generate `qa/visual-work-orders.json` and `qa/visual-work-orders.md`. The work orders convert each visual decision into an executable production task and keep planning separate from delivery readiness.

Read [`visual-production.md`](visual-production.md) for the build, validate, synchronize, and delivery contract.

Every slide must declare one visual decision:

- supplied or generated image
- product screenshot
- data chart
- workflow or system diagram
- comparison diagram
- timeline
- HTML/CSS information visualization
- typographic visual
- intentional text-only slide
- no visual, with a reason

Do not leave the decision implicit.

## Visual strategy

For a typical `speaker-led` deck:

```json
{
  "visualStrategy": {
    "mode": "generated-and-diagram",
    "targetCoverage": 0.5,
    "targetEvidenceCoverage": 0.33,
    "maxConsecutiveTextOnly": 2
  }
}
```

- `targetCoverage` counts evidence visuals, diagrams, charts, strong typographic pages, and intentional statement pages.
- `targetEvidenceCoverage` excludes typographic and intentional text-only pages.
- `maxConsecutiveTextOnly` counts plain text pages that do not contain an intentional visual treatment.

These are defaults, not universal laws. Reading-first reports may use denser tables and charts; image-led keynotes may target much higher coverage.

## Planning sequence

1. Identify audience, purpose, duration, density, and delivery environment.
2. Inspect all supplied images and screenshots before finalizing the outline.
3. Assign each slide a purpose, headline, layout, and visual decision.
4. Check visual distribution across the whole deck.
5. Confirm slot ratios before generating or framing assets.
6. Generate or build visuals.
7. Mark each required visual `ready` only after the actual file or DOM visual exists.
8. Run manifest validation, mechanical QA, visual QA, and contact-sheet review.

## Narrative roles

A visual must declare why it exists:

| Role | Function |
|---|---|
| `evidence` | proves a claim with a screenshot, photo, data, or source material |
| `explanation` | explains a process, system, mechanism, or relationship |
| `context` | establishes a place, person, product, market, or situation |
| `comparison` | makes difference, progression, or trade-off visible |
| `typography` | uses type and scale as the primary visual device |
| `decoration` | supplies atmosphere but does not carry meaning |

A deck whose visuals are all `decoration` is not visually complete.

## Distribution checks

Before generation, review the slide map as a sequence:

- avoid more than two plain text-only pages in a row for speaker-led decks
- avoid using the same layout for more than half the deck
- distribute evidence visuals across the beginning, middle, and end
- place section, statement, image-focus, or data-hero pages where attention needs to reset
- do not repeat the same metaphor or generated scene on multiple pages
- reserve pure text pages for deliberate rhetorical emphasis

## Slot ratios

Use standard ratios and declare them in the manifest and DOM:

```html
<img data-image-slot="16:10" ...>
```

Recommended defaults:

| Use | Ratio |
|---|---|
| wide product or workflow visual | `16:10` or `16:9` |
| editorial photo | `3:2` or `4:3` |
| square comparison tile | `1:1` |
| portrait/mobile UI | `9:16` or `3:4` |
| panoramic cover | `21:9` |

Generate or frame the asset for the slot. Do not rely on aggressive `object-fit: cover` cropping to repair a mismatched source.

## DOM contract

Use semantic attributes so QA can understand the rendered slide:

```html
<section
  class="slide"
  data-slide-id="slide-07"
  data-layout="process"
  data-visual-required="true"
>
  <div
    class="workflow-diagram"
    data-visual-type="workflow-diagram"
    data-visual-role="explanation"
  >...</div>
</section>
```

For intentional overlap, add `data-allow-overlap` to the slide or the relevant container. For reusable logos or persistent brand marks, add `data-reuse="allowed"`.

## Completion definition

Visual planning is complete only when:

- every slide has a visual decision
- required assets have status `ready`
- visual and evidence coverage targets are met or deliberately revised
- no speaker-led run exceeds the text-only threshold
- asset ratios match their slots
- the visual roles support the narrative rather than merely decorate it
