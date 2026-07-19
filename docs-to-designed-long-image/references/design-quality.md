# Design and Critique Standard

## Respect the selected fidelity mode

In structure-faithful mode, judge the work first against `reference-blueprint.md`. Do not reward originality that comes from removing the reference's defining anatomy. Create originality through content mapping, new imagery, diagrams, copy, and details inside the inherited grammar.

In style-only or original mode, let the document's dominant relationship shape composition more freely.

## Make the concept serve the reference anatomy

Translate the document's central relationship into one visual action, such as disorder becoming order, evidence accumulating, branching choices, compression, a path, or layers being revealed. Place that action where the reference allocates imagery or emphasis; do not turn every section into a separate generated poster.

## Preserve long-form rhythm

Plan opening, lead, dense explanation, pause, emphasis, and close. Match the reference's characteristic distribution of these states in structure-faithful mode. Vary section height only where content requires it while retaining the recognizable sequence.

## Use typography spatially and linguistically

Build hierarchy with measured scale, placement, line breaks, width, density, and whitespace. Compare title/body/image/whitespace ratios with the reference. For Chinese, break at syntactic phrase boundaries, keep numbers with units and modifiers with nouns, and reject punctuation and orphan-line defects.

## Make imagery perform the same job

Match the reference's number and role of major images. If it uses one integrated hero illustration and text-led lower panels, generate one hero rather than a full illustration for each panel. Ensure title and hero imagery share direction, overlap, framing, or motion when the reference integrates them.

Judge generated art at its final placed size. Reject it when it contains generic dashboard/UI fragments, pseudo-text, noisy micro-detail, mushy silhouettes, anatomy defects, inconsistent perspective, extra focal subjects, or a different simplification level from the reference. Source art should normally be downsampled rather than enlarged; use high-quality resampling and only restrained sharpening after the semantic and stylistic quality already passes. Never stretch width and height independently. Use contain or a reviewed aspect-preserving crop, and verify that the crop retains every required subject and the intended negative space.

Match the reference's image-background relationship. When a doodle sits directly on a colored paper field, require an alpha PNG with transparent corners and opaque subject colors. Reject ivory rectangles, accidental card edges, pale-color washout, key-color halos, or white interiors that should reveal the section color. Keep an opaque paper patch only when the reference visibly uses collage paper or a sticker.

## Keep graphics explanatory

Use lines for connection, paths for sequence, separation for contrast, convergence for aggregation, and scale for priority. Preserve defining tabs, labels, bands, or containers from the reference; remove only graphics that neither belong to that language nor clarify the content.

## Critique the rendered result

Score each dimension from 1 to 10 and cite visible evidence:

- reference resemblance: silhouette and anatomy;
- reference resemblance: hierarchy, density, and rhythm;
- content fit and completeness;
- Chinese readability;
- typography spacing and token consistency;
- composition and balance;
- visual-system consistency;
- image integration and completeness;
- implementation quality.

In structure-faithful mode, require both reference-resemblance scores to be at least 8 and every other score to be at least 7. Do not deliver an image that only matches palette or illustration style.

## Run technical completeness checks

- Compare the final page against `content-checklist.txt` and compare that checklist back to the source inventory.
- Reject clipped or missing semantic text and incomplete required subjects.
- Inspect at the intended display width without zoom.
- Compare at least three type specimens against the reference for leading, paragraph gap, line length, padding, and tracking character.
- Check title and body line breaks by meaning, not only punctuation rules.
- Verify the final PNG is complete, readable, and free of failed assets, unintended output transparency, asset-alpha defects, and overflow.

Run a template-residue pass only after the resemblance gate. Remove generic SaaS/dashboard conventions that are not present in the reference. Never remove repeated cards, tabs, or labels when they are the reference's defining visual system.
