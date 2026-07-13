# Task-level regression

Task-level regression verifies complete HTML PPT production workflows rather than isolated functions. It sits above source, layout, manifest, runtime, editor, bundling, and visual-QA unit coverage.

## What it verifies

A task case can start from a topic or a standardized PPTX, DOCX, PDF, or Markdown fixture. The runner then:

1. creates a real themed project through `create-deck.mjs`
2. imports and validates source material when present
3. selects only registered layouts
4. writes an auditable `deck.json`, including source mappings
5. validates HTML structure and the production manifest
6. checks visual and evidence coverage targets
7. verifies complete source-page coverage and preserve-layout one-to-one rules
8. bundles the project into a portable single HTML file
9. validates the bundled file and scans for runtime network dependencies
10. optionally runs Playwright mechanical QA, semantic visual QA, and a contact sheet

## Commands

Validate the task registry:

```bash
npm run tasks:validate
```

Run deterministic contract checks for all cases:

```bash
npm run tasks:run
```

Run the full rendered pipeline for all cases:

```bash
npm run tasks:qa
```

Run selected cases directly:

```bash
node scripts/run-task-regression.mjs \
  --mode render \
  --case pptx-semantic-redesign \
  --case cjk-long-title \
  --output qa/task-regression
```

## Contract mode versus render mode

### Contract mode

Designed for regular CI. It performs source import, registered-layout enforcement, source mapping checks, structural validation, strict manifest validation, visual coverage calculations, bundling, bundled validation, and offline dependency scanning.

### Render mode

Runs every contract-mode check and additionally performs:

- Playwright full-slide screenshots
- mechanical overflow, collision, font-size, and asset checks
- semantic visual QA
- whole-deck contact-sheet generation

Render mode is intentionally heavier and should run before final phase acceptance or when shared layout, CJK, image, or runtime behavior changes.

## Current case matrix

| Case | Input | Mode | Theme | Main risk |
|---|---|---|---|---|
| `topic-only-zh-speaker` | topic | speaker-led | Swiss Grid | visual rhythm and evidence coverage |
| `topic-only-en-reading` | topic | reading-first | Editorial Ink | English reading density |
| `markdown-with-images` | Markdown | semantic | Editorial Ink | local images, tables, and source mapping |
| `pptx-semantic-redesign` | PPTX | semantic | Swiss Grid | images, notes, chart data, and splitting |
| `pptx-preserve-layout` | PPTX | preserve-layout | Swiss Grid | one-to-one source preservation |
| `docx-to-deck` | DOCX | semantic | Editorial Ink | heading sections, images, and tables |
| `pdf-selectable-text` | PDF | semantic | Technical Field | flattened-layout warning and review boundary |
| `data-heavy-report` | topic/data | reading-first | Technical Field | metrics, charts, and dense evidence |
| `cjk-long-title` | topic | speaker-led | Swiss Grid | explicit semantic line break and CJK behavior |
| `no-network` | topic | speaker-led | Editorial Ink | local runtime and portable bundle |

The complete matrix contains 52 slides and five source-backed cases.

## Output

```text
qa/task-regression/
├── report.json
├── <case-id>/
│   ├── index.html
│   ├── deck.json
│   ├── README.md
│   ├── source/             # source-backed cases
│   ├── theme/
│   ├── runtime/
│   ├── dist/<case-id>.html
│   └── qa/
│       ├── task-report.json
│       ├── visual-report.json     # render mode
│       ├── contact-sheet.png      # render mode
│       └── screenshots/           # render mode
```

Generated regression outputs are QA artifacts, not production examples to commit wholesale.

## Adding a case

Add a record to `tests/tasks/cases.json` and keep it deterministic:

- select an installed theme
- use only layouts registered for that theme
- declare every slide's visual decision
- define measurable visual/evidence coverage targets
- provide complete source mapping for source-backed cases
- use explicit reasons for split, merge, condense, redraw, retain, or omit decisions
- declare expected layouts, slide count, offline behavior, bundle behavior, and contact-sheet behavior
- use `|` to declare an intentional semantic break in long-title fixtures

Run:

```bash
npm run tasks:validate
npm run test:tasks
npm run tasks:qa
```

Do not lower thresholds solely to make a failing layout pass. Fix the fixture content, source asset, layout implementation, or validation logic according to the public production contract.

## Codex and Claude Code boundary

The automated suite is model-neutral. It validates the files and behavior that any coding agent must produce; it does not claim to execute Codex or Claude Code in CI.

Actual agent acceptance uses `tests/tasks/manual-agent-matrix.md`. Codex and Claude Code may produce different HTML, but both must satisfy the same source, layout, manifest, visual, offline, editing, and bundling contracts.
