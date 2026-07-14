# Migration guide

This guide covers durable project contracts. Generated decks remain plain HTML and do not require a package runtime after bundling.

## General upgrade procedure

1. Preserve the existing project and final bundled HTML.
2. Read `CHANGELOG.md` from the target version.
3. Copy the current canonical `runtime/`, schemas, and selected theme assets into a working copy.
4. Validate the existing `deck.json` before changing it.
5. Apply the version-specific migration below.
6. Run source, layout, manifest, work-order, browser, accessibility, rendered, and visual QA.
7. Re-bundle and reopen the final HTML offline.

Do not silently replace stable slide IDs, element IDs, or source IDs. Those identifiers connect local edits, presenter notes, source mapping, visual work orders, and QA reports.

## 0.13.x to 0.14.x

No deck schema migration is required.

Repository and contributor changes:

- run `npm ci`, not `npm install`, for verification;
- keep `package-lock.json` committed;
- use Node 20 and npm 10;
- install the Playwright browser required by the check;
- use `HTML_PPT_BROWSER=webkit` for the WebKit smoke and accessibility checks;
- run `npm run ci` for the complete Chromium production chain;
- review accessibility warnings manually even when no blocking errors are reported.

Project delivery changes:

- add accessibility QA to the final checklist;
- confirm the final HTML in Chromium and WebKit-compatible Safari behavior;
- retain QA JSON, screenshots, and contact sheets with auditable deliveries when appropriate.

## Edit-state version 1 to version 2

The editor migrates legacy flat localStorage records automatically.

Version 2 uses:

```json
{
  "version": 2,
  "deckId": "annual-review",
  "updatedAt": "2026-07-14T00:00:00Z",
  "elements": {}
}
```

Keep `data-deck-id` and every `data-element-id` stable. Export edit-state JSON before intentionally renaming an editable element.

## Deck manifest version 1 to version 2

A version 2 manifest adds registered layouts, explicit visual strategy, typed per-slide visual decisions, optional source mapping, and speaker notes.

Required procedure:

1. set `manifestVersion` to `2`;
2. add `layoutRegistry` when a registered theme is used;
3. add `visualStrategy`;
4. give every slide a stable ID, purpose, registered layout, and visual object;
5. add source mapping for converted documents;
6. validate with `schemas/deck.schema.json` and `validate-manifest.mjs`.

Do not mark a required visual `ready` before its file or semantic DOM visual exists.

## Visual plan to work-order lifecycle

Projects created before 0.13.0 may contain only `deck.json`.

Generate work orders:

```bash
node scripts/build-visual-work-orders.mjs project/deck.json \
  --output project/qa/visual-work-orders.json \
  --markdown project/qa/visual-work-orders.md \
  --stage planning \
  --force
```

After production, synchronize them back to the deck and run delivery validation. Never regenerate over unsynchronized production progress.

## Source-aware projects

Projects created before standardized source ingestion may have copied source files without provenance.

Re-import the untouched original into `source/`, preserve the old project separately, and build an explicit source-page-to-final-slide mapping. Do not infer that old extracted text or screenshots are complete.

## Layout aliases

The legacy layout name `grid` maps to `three-up`. New work should use `three-up`. Validate the selected theme registry before introducing a custom layout.

## Browser support policy

Required automated coverage:

- Chromium: full runtime, presenter, editor, visual QA, task, example, and rendered regression;
- WebKit: bundled playback, keyboard navigation, edit-mode smoke, reduced-motion behavior, and accessibility QA.

Firefox may be run as an additional diagnostic target but is not a required release gate in 0.14.0.
