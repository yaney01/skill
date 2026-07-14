# Release CI contract

The permanent workflow is `.github/workflows/ppt-ci.yml`. It runs for pull requests that change `ppt/` or the workflow itself, for pushes to `main`, and by manual dispatch.

## Stable checks

The workflow exposes stable job names suitable for branch protection:

- `PPT contracts`
- `PPT browser (chromium)`
- `PPT browser (webkit)`
- `PPT rendered regression`

Require these checks before merging changes that affect the HTML PPT Skill.

## Deterministic installation

- Node: 20
- npm: 10.8.2
- dependency install: `npm ci`
- browser package: Playwright 1.55.0
- dependency graph: `ppt/package-lock.json`

Do not update `package.json` without updating and reviewing `package-lock.json` in the same pull request.

## Contracts job

Validates schemas, source ingestion, layout registration, visual manifests, visual work orders, task contracts, the 12-page production example, bundling, and bundled reopening.

## Browser matrix

Chromium runs the complete runtime, presenter, editor, semantic visual QA, accessibility, and delivery smoke suites.

WebKit runs bundled playback, keyboard navigation, constrained edit-mode smoke, reduced-motion behavior, and accessibility QA. This is the automated Safari-compatibility gate.

## Rendered regression

The rendered job runs:

- the 10 task cases and 52 task slides;
- the three 14-page core-theme layout catalogs;
- the 12-page production example;
- contact-sheet generation;
- mechanical Playwright QA.

Screenshots, contact sheets, and JSON reports are uploaded as workflow artifacts even when the job fails.

## Updating dependencies

1. change the exact version in `package.json`;
2. run `npm install --package-lock-only` with npm 10.8.2;
3. run `npm ci` from a clean checkout;
4. install Chromium and WebKit;
5. run all permanent CI jobs;
6. record compatibility changes in `CHANGELOG.md` and `MIGRATIONS.md`.

## Failure policy

Do not bypass a failing permanent check with a temporary workflow. Fix the underlying contract, test, fixture, or implementation. Temporary diagnostics may be used on isolated branches but must not replace or weaken the permanent release gates.
