# Reference Long-Image Analysis

Use this guide whenever reference long images are supplied.

## Decide what the reference controls

Use structure-faithful mode by default for “参考这张”“像这个”“按这个排版” and unqualified reference requests. In this mode the reference controls macro anatomy and visual grammar. Use style-only mode only when the user explicitly limits the request to mood, color, typography, or illustration style.

Do not protect originality by discarding the reference structure. Keep the layout grammar and replace the source copy, branding, characters, and proprietary artwork.

## Inspect at two scales

Inspect the overview and generated blurred silhouette for major color masses, opening height, section sequence, density changes, pauses, transitions, climax, and ending. Inspect the grayscale view for hierarchy independent of palette. Use the measurement grid, palette, and row-density profile to locate zone boundaries and contrast changes. Inspect overlapping crops for type scale, natural line length, spacing, alignment, borders, tabs, radius, shadow, texture, image treatment, and recurring details.

Blur or heavily downscale the reference mentally or with an image tool. If the remaining mass distribution cannot be described precisely, the analysis is not ready.

## Measure normalized anatomy

Record ratios to canvas width or total height rather than blindly copying pixels:

1. canvas aspect ratio and major vertical-zone shares;
2. hero/opening height and body/ending shares;
3. title width, position, line count, title/body scale ratio, outline, and shadow;
4. major illustration count, role, crop, direction, and occupied area;
5. content width, edge space, panel height rhythm, gap rhythm, and text density;
6. tab/label dimensions, overlap, border, radius, shadow, and repeated geometry;
7. canvas, surface, text, accent, and illustration color-area proportions;
8. reading path and repeated visual anchors.

## Measure specimens, not only the whole page

Record crop coordinates and uncertainty ranges so another compositor can reproduce the observations:

- at least one headline specimen with line boxes, outline/shadow layers, leading, and negative space;
- at least one section tab and every distinct label style with baseline position and overlap;
- at least three body specimens from different density zones with font height, baseline gap, characters per line, paragraph gap, padding, and alignment;
- every distinct panel type with normalized bounds, inner padding, radius, border, shadow, and inter-panel gap;
- every major image with subject boxes, complete/cropped policy, foreground/background scale, negative space, edge finish, and detail density.
- every major image's background treatment: transparent cutout, paper patch, masked crop, or full bleed. Record whether the underlying section color remains visible through unfilled areas.

Do not report “compact,” “large,” “soft,” or “high density” without an accompanying ratio, range, crop coordinate, or comparison specimen.

If the reference is too small to measure type reliably, preserve its macro anatomy and record a range for text metrics. Use final-width readability as the lower bound; never treat upscaled blur as precise font evidence.

Distinguish a reference-defining system from incidental decoration. A repeated white panel with a protruding blue section tab may be the page's main grammar; removing it would not be “de-templating” but losing the reference.

## Produce a fidelity contract

Create `reference-blueprint.md` with three labels:

- **Must match:** macro layout, hierarchy pattern, visual density, image count/role, defining container/tab language, and rhythm in structure-faithful mode.
- **Must match:** image-to-background integration. A transparent doodle on a colored field must not become an opaque white sticker unless a sticker is visible in the reference.
- **May adapt:** section count, exact heights, local diagrams, and content grouping when the source requires it.
- **Must replace:** wording, logos, QR codes, branded characters, distinctive proprietary artwork, and unsupported claims.

For multiple references, assign each a role such as primary anatomy, typography, illustration treatment, color, or ending. Never average incompatible structures without stating which reference wins.

## Pass the resemblance gate

Compare reference and output at the same display width and in grayscale or blurred thumbnail form. Evaluate:

- silhouette and major mass distribution;
- normalized geometry;
- title hierarchy;
- illustration count and semantic role;
- container/tab/label grammar;
- information density and line rhythm;
- open/dense/pause/close sequence;
- color-role proportions.
- typography-token consistency and measured spacing ratios;
- generated-image subject count, detail density, edge quality, and negative-space match.

Sharing blue, rounded corners, or an illustration style is not sufficient. In structure-faithful mode, reject the output if two or more defining categories visibly diverge or if the reference family is no longer recognizable at thumbnail size.
