# Phase twelve release hardening

Phase twelve turns the HTML PPT Skill from a feature-complete project into a continuously verifiable release surface.

## Scope

- deterministic npm dependency installation through `package-lock.json` and `npm ci`
- permanent GitHub Actions for contracts, browser behavior, and rendered QA
- Chromium complete browser regression
- WebKit playback, presenter, editor-download, and accessibility smoke regression
- automated accessibility checks and JSON reports
- retained Actions artifacts for contracts, accessibility, screenshots, contact sheets, and rendered-task reports
- release changelog and migration guidance
- stable CI job names suitable for branch protection

No presentation feature, theme, free-form editing capability, external image provider, or native PPTX output is added.

## Permanent checks

The permanent `.github/workflows/ppt-ci.yml` runs on pull requests and pushes to `main` when `ppt/` or the workflow changes.

### PPT contracts

- deterministic `npm ci`
- layout registry validation
- task registry validation
- core Node regression
- all task contracts
- 12-page production example structure, manifest, visual work orders, semantic visual QA, bundling, and bundled validation
- contract reports uploaded as artifacts

### PPT browser (chromium)

- complete runtime regression
- presenter regression
- constrained editor regression
- semantic visual QA regression
- browser smoke regression
- accessibility regression
- production-example accessibility report

### PPT browser (webkit)

- fixed-stage playback smoke
- presenter popup and synchronization smoke
- constrained edited-HTML download smoke
- accessibility regression
- production-example accessibility report

### PPT rendered regression

- all 10 rendered task cases and 52 slides
- all three registered layout catalogs
- 12-page production example screenshots
- production-example contact sheet
- screenshots and JSON reports uploaded as artifacts

## Accessibility contract

The automated accessibility audit checks blocking failures for:

- valid document language
- one visible current slide
- accessible slide structure
- meaningful image alt text
- interactive element names
- form labels
- keyboard focus visibility
- hidden-slide accessibility state
- duplicate IDs
- presenter and editor control semantics
- reduced-motion behavior

It reports findings as structured JSON. The audit supplements rather than replaces human review of reading order, language quality, projected contrast, cognitive load, or visual composition.

## Dependency reproducibility

- Node: `>=20`
- npm: `>=10 <11`
- package manager metadata: `npm@10.8.2`
- Playwright: exact `1.55.0`
- lockfile committed
- CI uses `npm ci`

## Verification before final PR

The isolated preparation workflow confirmed:

- lockfile generation and deterministic install
- syntax and core regression
- Chromium browser smoke
- Chromium accessibility regression
- WebKit browser smoke
- WebKit accessibility regression
- WebKit production-example accessibility

The old diagnostic summary step incorrectly interpreted a successful `continue-on-error` step and was not carried into permanent CI. Permanent jobs use direct command exit status.

## Repository cleanup

The final phase removes:

- temporary lockfile-generation workflow
- diagnostic preparation workflow accidentally merged into `main`
- all `.phase-twelve-*` trigger files

The permanent workflow is read-only and does not push commits.

## Branch protection

Recommended required checks:

- `PPT contracts`
- `PPT browser (chromium)`
- `PPT browser (webkit)`
- `PPT rendered regression`

Branch protection itself is a repository setting and is not modified by this code change.
