---
name: docs-to-designed-long-image
description: Convert pasted content or Markdown, TXT, HTML, and DOCX documents into structure-faithful, readable, high-resolution PNG long images using pure raster composition. Use when Codex must design a document as a social-sharing long image or editorial poster; closely follow supplied references for anatomy, proportions, typography, illustration role, density, rhythm, and image-background treatment; preserve Chinese copy exactly; generate transparent raster illustrations; or avoid HTML, CSS, SVG, browser, card-stack, and webpage-style layouts.
---

# Document to Designed Long Image

Produce a designed PNG, not a webpage screenshot. Treat copy fidelity, reference fidelity, Chinese readability, image integration, and final-image inspection as separate gates.

## Non-negotiable rules

- Compose with a bitmap engine such as Pillow. Do not use HTML, CSS, SVG, browser layout, DOM cards, or a universal section template.
- Preserve every source heading, paragraph, list item, quote, number, qualifier, and punctuation mark unless the user authorizes rewriting. Line breaks may change; wording may not.
- When a reference is supplied, default to **structure-faithful**. Match its macro anatomy, proportions, title/body/image scale, illustration count and role, density, pauses, transitions, container grammar, and ending pattern.
- Do not isolate title and image when the reference overlaps or interlocks them.
- Do not place an opaque white or ivory rectangle behind an illustration when the reference places the illustration directly on a colored field. Use transparent PNG cutouts.
- Inspect the exported PNG at the intended display width. A clean manifest is not a substitute for looking at the image.

## 1. Inventory the source before designing

Create `content-checklist.txt` before layout. For file input, run `scripts/inventory_document.py`; for pasted content, create the same format manually.

- Give every semantic block its own ID and role. Keep each original list item separate.
- Whitespace-normalize only. Never join list items with semicolons or add colons, bullets, labels, or punctuation that are not in the source.
- Keep a step heading and its following explanation in one block only when they form one source item; separate unrelated lines.
- Compare the checklist back to the source line by line. Repair an unexpectedly short inventory before continuing.

Example:

```text
[001][H1] 标题
[002][P] 正文。
[003][LI] 第一条
[004][LI] 第二条
```

## 2. Extract a reference blueprint

When references exist, read [references/reference-analysis.md](references/reference-analysis.md), run `scripts/prepare_references.py`, and inspect its overview, blurred silhouette, grayscale view, grid, palette/profile, and crops.

Create `reference-blueprint.md` with measured normalized evidence:

- canvas ratio and vertical zones;
- hero, body, pause, transition, climax, and ending shares;
- title width, line count, position, title/body scale, outline, and shadow;
- content width, side margins, line length, paragraph rhythm, and density;
- every distinct panel, tab, label, band, torn edge, overlap, and gap;
- every major illustration's count, role, subject box, negative space, crop policy, detail level, and background treatment;
- color roles and approximate area shares.

Mark each observation **must match**, **may adapt**, or **must replace**. Record uncertainty ranges when the reference is too small to measure exactly. Do not proceed if the blueprint could describe many unrelated long images.

## 3. Map content into the reference anatomy

Create `section-content-map.md` assigning every checklist ID exactly once to a reference role. Preserve the reference's open/dense/pause/close rhythm while adapting section heights to the source.

Read [references/chinese-typesetting.md](references/chinese-typesetting.md). Define three to five reusable type tokens from measured specimens. Approve Chinese line breaks by syntax before drawing them; never shrink text merely to rescue a bad break.

Choose one content-specific visual action, such as disorder becoming order or scattered evidence becoming a path. Put it where the reference allocates visual emphasis; do not turn every paragraph into a separate poster.

## 4. Generate only the required illustration assets

Use the `imagegen` skill when the reference contains authored illustration, photography, collage, or painterly imagery.

- Match each asset's reference role, framing, subject count, occupied area, direction, simplification, and palette relationship.
- Generate no semantic copy, labels, pseudo-text, logos, or QR codes. Typeset exact text during composition.
- If the reference places art directly on color, generate each opaque subject on a flat removable chroma-key background and convert it to an alpha PNG with the ImageGen skill's installed removal helper.
- Validate transparent corners, complete silhouettes, opaque pastel colors, and no key-color fringe. Do not use a soft near-white matte that fades pale blue, yellow, green, skin, or paper fills.
- Save final project assets inside the workspace. Preserve source aspect ratio and record crop and placement data.

Reject an asset at final placed size when it has pseudo-UI, unreadable micro-text, mushy edges, anatomy defects, extra focal subjects, inconsistent perspective, or incomplete silhouettes.

## 5. Compose as a raster poster

Draw the measured paper fields, bands, collage shapes, diagrams, texture, and typography directly into the bitmap canvas. Reproduce the reference's layout grammar; do not introduce cards, shadows, radii, or grids that are absent from it.

Keep `layout-manifest.json` using [references/raster-manifest.md](references/raster-manifest.md). Record every source block, approved line, line box, type token, font, size, leading, tracking, paragraph gap, bounds, color, section, asset, alpha/background policy, crop, scale, focal retention, and z-order.

Maintain these invariants:

- each checklist ID appears exactly once;
- manual line breaks reconstruct the source after removing whitespace only;
- every line fits its measured text box;
- semantic text and complete subjects stay inside the canvas;
- same-token metrics stay within 10% unless the reference visibly requires a variant;
- raster assets are never stretched independently in width and height;
- illustration backgrounds follow the reference: transparent/direct, paper patch, or full bleed as measured.

## 6. Export, inspect, and revise

Export a full PNG and a preview at the intended display width, normally 375px. Run `scripts/validate_raster_output.py` against the checklist, manifest, and PNG.

Read [references/design-quality.md](references/design-quality.md), then inspect the actual preview side by side with the reference:

1. Compare blurred silhouettes and major color masses.
2. Compare normalized hero, text, illustration, pause, and ending proportions.
3. Compare title hierarchy, line rhythm, information density, and illustration roles.
4. Read all Chinese at actual size; check punctuation, orphan lines, and phrase boundaries.
5. Inspect every illustration edge on its real section color; reject opaque background patches, faded pastels, clipping, and halos.
6. Compare the final render with `content-checklist.txt`.

Complete at most three purposeful rounds: structure; resemblance/image integration; typography/export defects. Reject the result if either reference-resemblance score is below 8/10 or any other quality score is below 7/10.

## Deliver

Return the final PNG as the primary artifact. Keep the blueprint, content map, checklist, prompts, transparent assets, manifest, validation report, previews, comparisons, and iterations in `work/`. Keep only user-facing artifacts in `outputs/`.

Before delivery require empty `missingText`, `duplicateText`, `extraText`, `changedText`, `manifestErrors`, `outOfBoundsText`, `tinyText`, `badLineBreaks`, `assetOutOfBounds`, `aspectErrors`, `alphaProblems`, `failedImages`, and `outputErrors`.

## Bundled tools

- `scripts/inventory_document.py`: preserve semantic blocks from Markdown, TXT, HTML, and DOCX and write a checklist.
- `scripts/prepare_references.py`: create measured reference-analysis artifacts.
- `scripts/validate_raster_output.py`: validate copy, line breaks, bounds, sizes, assets, alpha policy, and final PNG integrity.
