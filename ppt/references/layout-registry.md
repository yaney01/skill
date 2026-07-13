# Registered layout workflow

A layout name is not sufficient. Production layouts must be registered, implemented, selectable, and mechanically verifiable.

## Files

```text
assets/themes/
├── shared/
│   └── layout-contracts.json
└── <theme>/
    ├── theme.json
    ├── layout-manifest.json
    ├── layouts.css
    └── preview.html
```

`shared/layout-contracts.json` defines the canonical communication contract:

- purpose
- variants
- required and optional slots
- maximum item counts and text capacities
- supported image ratios
- whether a visual is required, optional, or forbidden

Each theme's `layout-manifest.json` declares which canonical layouts it actually supports and which CSS selector implements each one.

## Selection rule

For a themed deck:

1. read `theme/layout-manifest.json`
2. select a canonical registered layout ID
3. read its canonical contract from `theme/layout-contracts.json`
4. keep content within the declared slots and capacities
5. use the registered selector and DOM grammar
6. update `deck.json.slides[].layout`
7. validate the deck manifest before browser QA

Do not invent a layout ID merely because it sounds appropriate. Either use the nearest registered layout or extend the theme registry and CSS implementation first.

## Core production layouts

The three core themes support 14 layouts:

| ID | Primary role |
|---|---|
| `cover` | title and positioning |
| `section` | chapter transition |
| `statement` | decisive claim or number |
| `split` | explanation plus visual |
| `image-focus` | visual evidence as the main subject |
| `three-up` | three parallel items |
| `four-grid` | four compact parallel categories |
| `metrics` | one to four KPIs |
| `comparison` | before/after or option A/B |
| `timeline` | chronological milestones |
| `process` | directional workflow |
| `chart` | quantitative evidence |
| `quote` | sourced testimony or principle |
| `closing` | synthesis, decision, or action |

`evidence-wall` and `roadmap` remain semantic library patterns but are not yet guaranteed across every core theme. Use them only after registering and implementing them for the selected theme.

## Legacy alias

`grid` is retained only as a compatibility alias for `three-up`. New manifests and HTML must use:

```html
<section class="slide" data-layout="three-up">
```

The generator normalizes old preview markup automatically. The manifest validator reports legacy aliases and rejects unknown IDs.

## Validation

Validate all installed themes:

```bash
node scripts/validate-layouts.mjs --strict
```

Validate one theme:

```bash
node scripts/validate-layouts.mjs --theme editorial-ink --strict
```

Validate a generated deck against its copied registry:

```bash
node scripts/validate-manifest.mjs \
  project/deck.json \
  --html project/index.html \
  --strict
```

An unregistered layout produces:

```text
ERROR [slide-07] layout.unregistered: slide-07 uses unregistered layout invented-layout.
```

## Catalog QA

Generate a complete standalone catalog:

```bash
node scripts/render-layout-catalog.mjs \
  --theme technical-field \
  --output qa/layout-catalogs/technical-field
```

Then run:

```bash
node scripts/validate-deck.mjs qa/layout-catalogs/technical-field/index.html
node scripts/validate-manifest.mjs \
  qa/layout-catalogs/technical-field/deck.json \
  --html qa/layout-catalogs/technical-field/index.html \
  --strict
node scripts/qa-deck.mjs \
  qa/layout-catalogs/technical-field/index.html \
  --screenshots qa/layout-catalogs/technical-field/screenshots
```

The catalog verifies actual rendering of every registered layout, not only the six-slide style preview.

## Extending a theme

To add a layout:

1. define or approve the canonical contract in `shared/layout-contracts.json`
2. add the canonical ID and selector to the theme's `layout-manifest.json`
3. add the ID to `theme.json.layouts` in the same order
4. implement the selector in `layouts.css`
5. add a catalog sample in `render-layout-catalog.mjs`
6. run registry, structural, manifest, and browser QA
7. document any theme-specific capacity override

Registration without CSS implementation is invalid. CSS implementation without registration is not part of the supported production API.
