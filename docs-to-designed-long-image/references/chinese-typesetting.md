# Chinese Typesetting for Long Images

## Set hierarchy from ratios

Measure the reference's title/body ratio, line lengths, margins, and image share before selecting project values. Readability floors prevent failure; they do not define the visual system. Do not scale headline, body, labels, padding, and illustrations upward together.

Build a specimen table from actual reference crops. For each title, tab, label, lead, body, note, or quote style record:

- visible font height relative to canvas width;
- baseline-to-baseline leading and `leading / font-size` ratio;
- average and maximum characters per line;
- paragraph gap relative to leading;
- left/right/top/bottom padding relative to body size;
- alignment, weight, color, and perceived tracking.

Define three to five reusable type tokens from these specimens. Do not tune font size and leading independently for each content block. A same-token metric variation greater than 10% requires a visible hierarchy or density reason.

For Chinese body text, start with the typeface's natural tracking. Do not add positive letter spacing merely to fill width. Adjust tracking only after comparing a reference specimen at the same display width, and record the value in the layout manifest.

## Break by meaning

- Draft headings as semantic phrase groups separated with `/`, then place line breaks only at those boundaries.
- Keep modifier + head noun, verb + object, fixed expressions, names, numbers + units, and Chinese + attached English terms together.
- Do not leave a single Chinese character on the final line. Avoid two-character orphan lines unless the phrase itself is intentionally isolated.
- Avoid a line ending with `（《“‘【` or starting with `，。！？；：、）》”’】`.
- Prefer changing the text box width, tracking, or phrase arrangement before shrinking type.
- Insert a manual line break only after the semantic grouping is approved. Record it explicitly in the raster layout manifest. Keep terms that must stay together unbroken.
- A line break is not permission to edit punctuation. Do not add a comma, colon, semicolon, bullet, or label to make a break look natural; change the break or text-box width instead.

## Renderer baseline

For raster output, record approved line breaks, line boxes, font size, leading, tracking, paragraph gap, and type token explicitly; measure every line with the selected CJK font before drawing. Keep body line-height based on measured reference specimens and typeface rather than a universal value.

## Inspect at final size

Review headings and paragraphs at the target display width without zoom. Read them aloud: a visual line should end where a Chinese reader can naturally pause. Compare at least three body crops side by side with the reference for line rhythm, paragraph separation, and card padding. Reject visible crowding, floating lines, arbitrary gaps, or multiple leading values inside one type token. Automated punctuation/orphan checks are only a safety net; semantic quality still requires visual review.

Compare each rendered block with `content-checklist.txt` after removing whitespace only. A checklist that has merged independent list items or introduced punctuation is invalid even when every visible sentence appears present.
