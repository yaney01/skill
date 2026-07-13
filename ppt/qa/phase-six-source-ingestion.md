# Phase six standardized source ingestion verification

Verified on GitHub Actions against PR #10 on 2026-07-13.

## Delivered source contract

Supported inputs:

- PPTX
- DOCX
- PDF
- Markdown

Standardized output:

```text
source/
├── manifest.json
├── README.md
├── citations.json
├── text/
├── images/
├── notes/
├── tables/
└── charts/
```

The source manifest records the original file digest and size, original page or section order, text paths, images and dimensions, notes, tables, cached chart data, optional source geometry, preservation flags, provenance, and importer warnings.

`source/manifest.json` remains separate from `deck.json`: the first records source truth and fidelity constraints; the second records the final narrative and visual production plan.

## Format coverage

### PPTX

The regression fixture verified:

- slide order
- text extraction
- one embedded PNG
- one speaker-notes file
- one table JSON file
- one cached chart-data JSON file
- text-shape geometry in EMU under `--preserve-layout`
- restructuring locks in layout-preserving mode

### DOCX

The regression fixture verified:

- heading-based section splitting
- paragraph extraction
- embedded image extraction
- table extraction
- stable page IDs and provenance

### PDF

The regression fixture verified:

- Poppler `pdftotext` extraction
- page count
- selectable text preservation
- explicit `pdf.layout-flattened` warning
- non-strict source validation after manual-review warning

OCR is not invoked automatically. Poppler is preferred; optional `pypdf` is a text-only fallback.

### Markdown

The regression fixture verified:

- H1/H2 section splitting
- local image copying
- image dimensions
- basic pipe-table extraction
- remote-image recording without network download

## Validator coverage

`validate-source.mjs` verifies:

- manifest version and supported source type
- sequential stable page IDs
- page count agreement
- text, notes, image, table, and chart paths
- path containment inside the standardized source directory
- table and chart JSON validity
- image metadata and crop/fidelity conflicts
- preservation flags and provenance
- importer warnings
- original source SHA-256 and byte size when `--source` is supplied

## Automated result

- Python importer syntax: passed
- fixture-builder syntax: passed
- Node validator syntax: passed
- source schema JSON validation: passed
- dedicated source-ingestion tests: 8 of 8 passed
- PPTX strict source validation: passed
- DOCX strict source validation: passed
- Markdown strict source validation: passed
- PDF extraction and expected warning test: passed
- destructive overwrite protection: passed
- unsupported extension rejection: passed
- original-source digest mismatch detection: passed
- complete existing core and browser regression suite: passed
- 12-page Chinese example validation, manifest, visual QA, bundling, and bundled validation: passed

## Scope

Permanent phase-six changes are contained within `ppt/`. The temporary GitHub Actions workflow used for verification was removed after this record was produced. Native PPTX generation was not added, and the existing `扩图/` Skill was not modified.
