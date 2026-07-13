# Automated testing

Use the test suite whenever changing shared PPT infrastructure. A normal deck-content edit does not require the entire suite unless it changes shared runtime, validation, bundling, or editor behavior.

## Core tests

```bash
npm run test:core
```

These tests use Node's built-in test runner and require no browser. They validate the real Chinese regression deck, validator failure modes, single-file bundling, local SVG embedding, bundled-output validation, and protection against in-place overwrites.

## Browser tests

```bash
npm install
npx playwright install chromium
npm run test:browser
```

These tests verify the fixed 1920×1080 stage, one-active-slide invariant, keyboard/hash/wheel navigation, mobile whole-stage scaling, edit-mode hooks, text persistence, image replacement, and edited-HTML download behavior.

## Complete regression command

```bash
npm run ci
```

Run this before merging changes to:

- `assets/runtime/*`
- `assets/templates/*`
- `scripts/create-deck.mjs`
- `scripts/bundle-html.mjs`
- `scripts/validate-deck.mjs`
- `scripts/qa-deck.mjs`
- `scripts/export-pdf.mjs`
- the real regression example

Fix the implementation rather than weakening a test unless the public contract intentionally changed. When the contract changes, update the test, README, and relevant reference documentation together.
