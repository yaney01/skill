# Automated testing

Use the test suite whenever changing shared PPT infrastructure. A normal deck-content edit does not require the entire suite unless it changes shared runtime, validation, bundling, themes, layouts, source ingestion, visual QA, presenter mode, or editor behavior.

## Core tests

```bash
npm run test:core
```

These tests use Node's built-in test runner and require no browser. They validate the real Chinese regression deck, validator failure modes, single-file bundling, embedded deck manifests, local SVG embedding, bundled-output validation, source ingestion, registered layouts, task contracts, and protection against in-place overwrites.

## Browser tests

```bash
npm install
npx playwright install chromium
npm run test:browser
```

These tests verify:

- fixed 1920×1080 stage behavior
- one-active-slide invariant
- keyboard, hash, wheel, and touch navigation
- mobile whole-stage scaling
- slide overview and numbered jump
- presenter popup creation
- current and next slide previews
- speaker-note loading from the embedded manifest
- audience-to-presenter and presenter-to-audience synchronization
- presenter refresh reconnection
- elapsed timer rendering
- edit-mode hooks and text persistence
- image replacement
- edited-HTML download without presenter or overview clones
- browser-driven semantic visual QA

Run presenter tests alone:

```bash
npm run test:presenter
```

Read [`presenter-mode.md`](presenter-mode.md).

## Task-level regression

Validate all task definitions:

```bash
npm run tasks:validate
```

Run deterministic contract checks across all task cases:

```bash
npm run tasks:run
```

Run the complete rendered task pipeline:

```bash
npm run tasks:qa
```

The task suite covers topic-only Chinese and English decks, Markdown, PPTX semantic redesign, PPTX preserve-layout migration, DOCX, PDF, data-heavy reporting, long CJK titles, and offline delivery. Contract mode checks source mappings, registered layouts, manifest coverage, bundling, bundled validation, and network independence. Render mode additionally runs mechanical QA, semantic visual QA, and contact sheets.

Read [`task-regression.md`](task-regression.md).

## Complete regression command

```bash
npm run ci
```

Regular `ci` includes layout validation, task-registry validation, core and browser tests, all task contracts, and the committed production example. Run `npm run tasks:qa` separately before accepting changes that affect shared layout rendering, image behavior, CJK typography, source framing, or visual QA.

Run complete regression before merging changes to:

- `assets/runtime/*`
- `assets/templates/*`
- `assets/themes/*`
- `schemas/*`
- `scripts/create-deck.mjs`
- `scripts/ingest-source.py`
- `scripts/bundle-html.mjs`
- `scripts/validate-deck.mjs`
- `scripts/validate-manifest.mjs`
- `scripts/qa-deck.mjs`
- `scripts/qa-visual.mjs`
- `scripts/run-task-regression.mjs`
- source, layout, task, presenter, or visual contracts
- the real regression example

Fix the implementation rather than weakening a test unless the public contract intentionally changed. When the contract changes, update the tests, README, Skill instructions, and relevant reference documentation together.
