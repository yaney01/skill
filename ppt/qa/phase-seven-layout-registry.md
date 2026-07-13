# Phase seven layout registry verification

Verified on GitHub Actions against PR #14 on 2026-07-13.

## Purpose

Earlier themes exposed six preview layouts, while the semantic layout guide named a larger library. Phase seven turns layout names into registered production components with canonical contracts, theme support declarations, actual CSS implementations, generated catalogs, and deck-level enforcement.

## Delivered registry

Canonical contracts are stored in:

```text
assets/themes/shared/layout-contracts.json
```

Each contract records:

- communication purpose
- supported variants
- required and optional content slots
- item and text-capacity limits
- supported image-slot ratios
- visual requirement policy

Each installed theme now contains:

```text
theme.json
layout-manifest.json
tokens.css
layouts.css
preview.html
```

The layout manifest maps canonical layout IDs to actual CSS selectors and declares compatibility aliases.

## Registered coverage

### Core themes

The following themes each register and implement 14 production layouts:

- `swiss-grid`
- `editorial-ink`
- `technical-field`

Registered IDs:

```text
cover
section
statement
split
image-focus
three-up
four-grid
metrics
comparison
timeline
process
chart
quote
closing
```

The eight layouts added beyond the original preview scope are implemented in each core theme's own visual language rather than by a shared generic skin.

### Backup themes

The two Guizang-inspired clean-room backup themes retain their existing six-layout production scope:

- `guizang-magazine`
- `guizang-swiss`

Registered IDs:

```text
cover
section
statement
split
three-up
closing
```

The legacy ID `grid` is registered only as a compatibility alias for canonical `three-up`.

## Generator integration

A generated themed project now receives:

```text
theme/
├── theme.json
├── layout-manifest.json
├── layout-contracts.json
├── tokens.css
├── layouts.css
└── cjk.css
```

`deck.json` records:

```json
{
  "layoutRegistry": "theme/layout-manifest.json"
}
```

The generator normalizes legacy preview markup from `grid` to `three-up`. Generated project instructions require agents to select from the copied registry before inventing a new layout.

## Validation behavior

`validate-layouts.mjs` checks:

- manifest version, theme identity, tier, and stage
- core and backup minimum layout counts
- canonical contract existence and required contract fields
- duplicate IDs and invalid aliases
- exact agreement between `theme.json` and `layout-manifest.json`
- actual CSS implementation for every registered selector
- preview use of registered IDs or explicit aliases

`validate-manifest.mjs` now loads a project's copied layout registry and checks every slide:

- unknown IDs produce `layout.unregistered` errors
- legacy aliases produce `layout.legacy-alias` warnings
- registry path traversal is rejected
- deck style and registry theme mismatch is rejected
- missing or malformed registries are rejected

## Layout catalogs

`render-layout-catalog.mjs` creates a standalone development project containing one page per registered layout. Each catalog includes runtime files, theme CSS, CJK rules, a portable registry, canonical contracts, HTML, and `deck.json`.

The following catalogs were generated and rendered:

| Theme | Registered pages |
|---|---:|
| Swiss Grid | 14 |
| Editorial Ink | 14 |
| Technical Field | 14 |
| **Total** | **42** |

## Automated result

- generator syntax: passed
- layout registry validator syntax: passed
- layout catalog generator syntax: passed
- deck manifest validator syntax: passed
- layout registry helper syntax: passed
- layout schema JSON validation: passed
- deck schema JSON validation: passed
- canonical layout-contract JSON validation: passed
- all five installed theme registries passed strict validation
- three core themes each registered 14 layouts
- two backup themes each registered 6 layouts
- all registered selectors were found in their theme CSS
- generated themed projects copied portable registries and contracts
- generated projects normalized `grid` to `three-up`
- unregistered deck layouts were rejected
- legacy alias use was reported
- core regression suite passed
- browser runtime and editor regression suite passed
- three 14-page layout catalogs passed structural validation
- three 14-page layout catalogs passed strict manifest validation
- all 42 catalog pages passed Playwright mechanical rendering QA
- existing 12-page Chinese production example validation passed
- existing production manifest and semantic visual QA passed
- existing single-file bundling and bundled validation passed

## Scope

Permanent phase-seven changes are confined to `ppt/`. No new themes, native PPTX output, presenter mode, or editor enhancements were added. The temporary repository-level verification workflow was removed after this record was written. The existing `扩图/` Skill was not modified.
