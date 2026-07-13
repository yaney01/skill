# Phase eight task-level regression verification

Verified on GitHub Actions on 2026-07-13.

- Workflow run: `29262104532`
- Job: `86857795000`
- Result: passed

## Purpose

Earlier phases validated individual infrastructure layers: fixed-stage runtime, browser editing, source ingestion, production manifests, semantic visual QA, themes, and registered layouts. Phase eight adds deterministic regression at the complete-task level so a change cannot pass by validating each subsystem in isolation while breaking the end-to-end production chain.

The suite validates the artifact contract expected from Codex, Claude Code, and other coding agents. It does not claim to invoke those models inside CI.

## Task matrix

The registry contains 10 representative tasks and 52 total slides:

| Case | Input / scenario | Density | Theme | Slides |
|---|---|---|---|---:|
| `topic-only-zh-speaker` | Chinese topic-only creation | speaker-led | Swiss Grid | 8 |
| `topic-only-en-reading` | English topic-only brief | reading-first | Editorial Ink | 7 |
| `markdown-with-images` | Markdown, local image, and table | speaker-led | Editorial Ink | 5 |
| `pptx-semantic-redesign` | PPTX semantic reconstruction | speaker-led | Swiss Grid | 5 |
| `pptx-preserve-layout` | PPTX one-to-one preserve-layout migration | reading-first | Swiss Grid | 1 |
| `docx-to-deck` | DOCX chapters, image, and table | reading-first | Editorial Ink | 5 |
| `pdf-selectable-text` | Selectable-text PDF with flattened-layout warning | reading-first | Technical Field | 3 |
| `data-heavy-report` | Metrics, charts, comparisons, and operational reporting | reading-first | Technical Field | 8 |
| `cjk-long-title` | Long Chinese title with an explicit semantic line break | speaker-led | Swiss Grid | 4 |
| `no-network` | Fully offline delivery and bundled reopening | speaker-led | Swiss Grid | 6 |

Coverage includes:

- Chinese and English
- speaker-led and reading-first density
- topic-only and source-backed production
- Markdown, PPTX, DOCX, and PDF ingestion
- semantic redesign and preserve-layout policy
- data-heavy reporting
- long CJK typography
- offline runtime and single-file delivery

## Contract-mode verification

For every case, contract mode executes the real production path and checks:

- task registry and schema validity
- project creation through `create-deck.mjs`
- source ingestion and source-manifest validation when applicable
- expected source warnings
- complete source-to-slide mapping coverage
- preserve-layout one-to-one policy
- registered layout availability and minimum layout variety
- slide count and visual-strategy thresholds
- structural HTML validation
- strict deck-manifest validation
- single-file bundling
- bundled-output reopening and validation
- absence of remote runtime dependencies
- explicit long-title line-break retention

## Render-mode verification

Render mode adds browser-backed checks for every generated project:

- semantic visual QA
- required-visual and evidence-visual rendering
- image dimensions, ratios, crop focus, reuse, and alt text
- text/visual overlap checks
- whole-deck contact-sheet generation
- Playwright mechanical QA and per-slide screenshots
- fixed-stage rendering integrity

All 10 rendered task pipelines completed successfully. The suite rendered and checked all 52 task slides without a blocking P0 visual finding or a mechanical QA failure.

## Defect found and corrected

The task suite exposed a disagreement between static manifest validation and browser semantic visual QA.

A `three-up` slide declared its HTML visualization on the slide root:

```html
<section
  class="slide"
  data-visual-type="html-visualization"
  data-visual-required="true"
>
```

Static validation recognized this declaration, but browser QA initially searched only descendant elements. After root-element detection was added, the real task still failed because the canonical runtime had set the non-current slide to `aria-hidden="true"`; the QA iterator changed only the `active` and `visible` classes and left the accessibility state stale.

The final correction makes browser QA:

1. include the slide root when it carries visual semantics;
2. synchronize `active`, `visible`, and `aria-hidden` while iterating pages;
3. apply the same candidate set to meaningful, evidence, diagram, chart, and decorative counts.

A browser regression now covers root-level visual semantics on multiple slides, including a later slide initially marked `aria-hidden="true"`.

## Automated result

The final GitHub Actions run passed every stage:

- script syntax and JSON schema checks
- strict task-registry validation
- task-level Node regression tests
- existing core regression suite
- existing browser runtime, editor, and visual-QA regression suite
- all 10 contract-mode tasks
- all 10 render-mode tasks
- all 52 task slides through semantic visual QA, contact-sheet generation, and mechanical browser QA
- Markdown source ingestion and mapping
- PPTX semantic redesign
- PPTX preserve-layout one-to-one migration
- DOCX source ingestion and mapping
- PDF ingestion with the expected flattened-layout warning
- data-heavy reporting
- long CJK title handling
- offline delivery and bundled reopening
- the existing 12-page Chinese production example: structure, strict manifest, semantic visual QA, bundling, and bundled validation

## Agent boundary

Automated CI validates deterministic artifacts and contracts. It does not run Codex or Claude Code and therefore does not certify model-specific planning quality. Real agent executions should be recorded in `references/agent-acceptance-matrix.md` using the same task IDs and acceptance criteria.

## Scope

Permanent phase-eight changes are confined to `ppt/`. The repository-level workflow used for final verification is temporary and is removed after this record is written. No native PPTX output, presenter mode, editor enhancement, theme expansion, or collaboration feature is added in this phase. The existing `扩图/` Skill is unchanged.
