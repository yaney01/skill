# Standardized source ingestion

Use source ingestion before converting or redesigning PPTX, PDF, DOCX, or Markdown. The importer separates source truth from the final narrative and visual plan.

## Command

```bash
python3 scripts/ingest-source.py input.pptx \
  --output ./project/source

node scripts/validate-source.mjs \
  ./project/source/manifest.json \
  --source input.pptx \
  --strict
```

Supported input types:

- `.pptx` — Office Open XML slides
- `.docx` — Office Open XML documents
- `.pdf` — selectable text through Poppler, with optional image extraction
- `.md`, `.markdown`, `.mdown` — headings, local or remote images, and basic tables

## Output contract

```text
source/
├── manifest.json
├── README.md
├── citations.json
├── text/
│   ├── page-001.md
│   └── page-002.md
├── images/
├── notes/
├── tables/
└── charts/
```

`source/manifest.json` records:

- source filename, type, digest, byte size, and importer
- original page or section order
- extracted page titles and text files
- images with dimensions, media type, fidelity, and crop policy
- speaker notes
- tables and cached chart data
- source geometry when `--preserve-layout` is used
- preservation rules: verbatim, layout, merge, condense, and omit
- provenance for every page
- explicit importer warnings and limitations

## Modes

### Semantic conversion

Default mode. It preserves source order and provenance but allows the downstream narrative plan to merge or condense content. Omission remains disabled unless `--allow-omit` is supplied.

```bash
python3 scripts/ingest-source.py report.docx \
  --output ./project/source \
  --allow-omit
```

### Layout-preserving conversion

Use when the user asks for close reconstruction, migration, or fidelity review.

```bash
python3 scripts/ingest-source.py old-deck.pptx \
  --output ./project/source \
  --preserve-layout
```

This records PPTX geometry where available and sets:

```json
{
  "verbatim": false,
  "layout": true,
  "allowMerge": false,
  "allowCondense": false,
  "allowOmit": false
}
```

## Format behavior

### PPTX

The dependency-free OOXML reader extracts:

- presentation slide order
- text paragraphs
- embedded images
- speaker notes
- tables
- chart cached categories and values when available
- text-shape geometry in EMU for layout-preserving work

It does not promise pixel-perfect rendering of SmartArt, animations, effects, unsupported vector formats, or theme-dependent typography. Preserve the original file for visual comparison.

### DOCX

The importer creates one source section per Word heading. It extracts paragraphs, embedded images, and tables. Footnotes are reported as a warning until section-level association is implemented.

A Word section is not automatically a final slide. The narrative planner decides how many slides it should become.

### PDF

PDF is a flattened delivery format. The importer prefers:

```text
pdftotext
pdfinfo
pdfimages
```

When Poppler is unavailable, optional `pypdf` provides text-only extraction. OCR is not run automatically. Scanned PDFs therefore require a separately approved OCR step.

Every PDF import records a manual-review warning because reading order, figure association, and original editability cannot be fully recovered from a flattened page.

### Markdown

Level-one and level-two headings define source sections. Local images are copied into `source/images/`; remote images are recorded but not downloaded. Basic pipe tables are converted into JSON.

## Validation policy

`validate-source.mjs` checks:

- manifest version and source type
- source digest and byte size when the original file is supplied
- stable sequential page IDs
- required text, notes, image, table, and chart paths
- path traversal outside the source directory
- asset metadata and JSON validity
- preservation flags and provenance
- importer warnings

Use `--strict` for PPTX, DOCX, and controlled Markdown inputs. For PDF, review the expected flattened-layout warning before deciding whether strict mode is appropriate.

## Source manifest versus deck manifest

`source/manifest.json` describes what the source contains and what must be preserved.

`deck.json` describes the final narrative, layouts, visual decisions, and production status.

Do not overwrite one with the other. Build and record an explicit mapping:

```text
source page/section → final slide(s) → treatment
```

Treatments include:

- preserve
- split
- merge
- condense
- omit with reason
- redraw chart from extracted data
- retain screenshot pixel-faithfully

## Safety and fidelity

- Never delete the original source.
- Never claim OCR or image understanding was performed when it was not.
- Do not silently omit source pages.
- Do not redraw product UI, legal text, financial data, or evidence screenshots with generative images.
- Keep source and final manifests under version control when the project is auditable.
- Record unresolved parsing warnings before designing the final deck.
