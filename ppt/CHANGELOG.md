# Changelog

All notable changes to the HTML PPT Agent Skill are recorded here. Versions follow semantic versioning for the `ppt/` package and its production contracts.

## 0.15.0 — Composition-faithful theme expansion

- Add `cobalt-executive-deck`, `coral-startup-deck`, `ribbon-tab-brochure`, and `blue-growth-deck` as explicit-selection backup themes.
- Implement independent composition systems for all four themes instead of recoloring existing theme layouts.
- Register the complete 14-layout contract for every new theme and provide editable six-slide previews.
- Preserve fixed 1920×1080 playback, browser editing, presenter mode, CJK typography, bundling, and structural validation.
- Add dynamic theme discovery tests and composition-prefix checks so future themes cannot remain outside CI coverage.
- Extend theme validation and rendered-QA commands to cover all nine installed themes.
- Record clean-room provenance; no source script, media, or template asset from the visual-reference repository is copied.

## 0.14.0 — Release hardening

- Add a permanent pull-request CI workflow.
- Pin npm and Playwright through `package-lock.json` and exact dependency versions.
- Add Chromium and WebKit delivery smoke tests.
- Add automated accessibility QA with JSON reports.
- Retain rendered screenshots, contact sheets, and QA reports as CI artifacts.
- Add migration and compatibility documentation.

## 0.13.0 — Visual production lifecycle

- Add per-slide visual work orders in JSON and Markdown.
- Separate planning-stage and delivery-stage validation.
- Add work-order build, validation, and synchronization commands.
- Validate local paths, file existence, image ratios, alt text, prompts, and deck drift.

## 0.12.0 — Constrained editor enhancements

- Add versioned edit-state envelopes.
- Add Undo, Redo, scoped reset, image fit, focal position, alt text, and state import/export.
- Preserve presenter-preview isolation.

## 0.11.0 — Presenter mode

- Add current and next slide previews, notes, elapsed timer, slide overview, go-to-slide, and bidirectional synchronization.

## 0.10.0 — Task-level regression

- Add deterministic topic-only and source-conversion task cases.
- Add contract and rendered regression across 52 task slides.

## 0.9.0 — Registered layouts

- Add canonical layout contracts, per-theme layout manifests, validation, and catalog rendering.

## 0.8.0 — Source ingestion

- Add standardized PPTX, DOCX, PDF, and Markdown ingestion.
- Add source provenance, preservation rules, notes, images, tables, chart caches, and source validation.

## Earlier releases

Earlier versions established the fixed 1920×1080 runtime, themes, CJK typography, browser editing, bundling, PDF export, structural QA, and semantic visual QA.
