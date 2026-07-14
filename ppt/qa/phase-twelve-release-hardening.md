# Phase twelve release hardening

Phase twelve turns the HTML PPT Skill from a feature-complete project into a continuously verifiable release surface.

## Authoritative verification

Permanent GitHub Actions completed successfully on 2026-07-14.

- Workflow: `HTML PPT CI`
- Run: `29297011656`
- Result: passed
- `PPT contracts`: job `86972656960`
- `PPT browser (chromium)`: job `86972656996`
- `PPT browser (webkit)`: job `86972656991`
- `PPT rendered regression`: job `86972656964`

The workflow uses stable job names suitable for branch protection.

## Scope

- deterministic npm dependency installation through `package-lock.json` and `npm ci`;
- permanent GitHub Actions for contracts, browser behavior, accessibility, and rendered QA;
- Chromium complete browser regression;
- WebKit bundled playback, navigation, edit-mode, reduced-motion, and accessibility smoke regression;
- automated accessibility findings and JSON reports;
- retained Actions artifacts for contracts, browser diagnostics, accessibility, screenshots, contact sheets, and rendered-task reports;
- release changelog and migration guidance;
- offline bundled-manifest loading before any sibling `deck.json` fetch;
- deterministic editor reset regression timing.

No presentation feature, theme, free-form editing capability, external image provider, collaboration feature, or native PPTX output is added.

## Permanent checks

The permanent `.github/workflows/ppt-ci.yml` runs on pull requests and pushes to `main` when `ppt/` or the workflow changes. It is read-only and never pushes commits.

### PPT contracts

Passed:

- exact npm and Playwright dependency installation through `npm ci`;
- layout registry validation;
- task registry validation;
- complete core Node regression;
- all 10 task contracts;
- 12-page production example structure;
- strict production manifest validation;
- delivery-stage visual work-order validation;
- single-file bundling and bundled structural validation;
- contract reports uploaded as artifacts.

### PPT browser (chromium)

Passed:

- fixed-stage runtime regression;
- presenter mode and speaker-note regression;
- constrained editor regression;
- semantic visual-QA regression;
- production-example semantic visual QA;
- bundled delivery smoke;
- accessibility fixture regression;
- production-example accessibility report;
- browser diagnostics uploaded as artifacts.

### PPT browser (webkit)

Passed:

- bundled fixed-stage playback;
- keyboard navigation and hash updates;
- constrained edit-mode entry and exit;
- reduced-motion media behavior;
- zero page-level runtime errors;
- accessibility fixture regression;
- production-example accessibility report;
- browser diagnostics uploaded as artifacts.

WebKit is the automated Safari-compatible release gate. It is not a claim that every Safari version or platform-specific browser API has been exhaustively tested.

### PPT rendered regression

Passed:

- all 10 rendered task cases and 52 task slides;
- all three core-theme layout catalogs, 42 registered-layout pages total;
- 12-page production example screenshots;
- production-example contact sheet;
- mechanical browser QA;
- rendered screenshots and reports uploaded as artifacts.

## Accessibility contract

The automated accessibility audit reports blocking errors for:

- missing document language;
- missing document title;
- missing deck stage;
- duplicate DOM IDs;
- missing or duplicate slide IDs;
- invalid active-slide and `aria-hidden` state;
- images without an `alt` attribute;
- visible interactive controls without an accessible name;
- `aria-controls` references to missing elements;
- browser runtime errors during the audit.

It reports warnings for:

- slides without semantic headings;
- approximate text contrast below the applicable threshold.

The browser smoke tests separately verify keyboard playback, edit-mode entry and exit, and reduced-motion media behavior.

Manual review remains required for:

- visible focus treatment and focus order;
- screen-reader pronunciation and reading order;
- the usefulness and factual accuracy of alternative text;
- gradients, images, transparency, and projected-display contrast;
- cognitive accessibility and information density;
- language quality in mixed-language decks;
- complete WCAG conformance.

The automated audit does not claim accessibility certification.

## Offline manifest correction

The bundled HTML already contains `#deckManifest`. The runtime now parses that embedded manifest before attempting to fetch a sibling `deck.json`.

This prevents local-file access-control errors in WebKit while preserving development-project fallback behavior. Presenter regression asserts that bundled decks do not request `deck.json`.

## Dependency reproducibility

- Node: `>=20`
- npm: `>=10 <11`
- package manager metadata: `npm@10.8.2`
- Playwright: exact `1.55.0`
- lockfile version: 3
- `package-lock.json` committed
- permanent CI uses `npm ci`

Changing dependency versions requires updating and reviewing `package.json`, `package-lock.json`, `CHANGELOG.md`, and compatibility notes together.

## Repository cleanup

The final phase removes:

- the temporary lockfile-generation workflow;
- the diagnostic preparation workflow accidentally merged into `main`;
- all `.phase-twelve-*` trigger files;
- one-time editor-test patch scripts and write-enabled workflows.

Only `.github/workflows/ppt-ci.yml` remains as the permanent HTML PPT workflow.

## Branch protection

Recommended required checks:

- `PPT contracts`
- `PPT browser (chromium)`
- `PPT browser (webkit)`
- `PPT rendered regression`

Branch protection itself is a repository setting and is not modified by this code change.
