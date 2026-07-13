---
name: image-expansion
description: Expand an existing image to a requested aspect ratio with GPT Image outpainting while preserving the original composition and pixels. Use when the user asks to expand, outpaint, extend, widen, make taller, change canvas ratio, add space around an image, or convert an image to ratios such as 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 4:5, 5:4, or 21:9 without cropping.
---

# Expand an image

Use GPT Image through Codex's `image_gen.imagegen` tool. Do not call Gemini, Workflow 754, an external image API, or a CDN uploader.

## Workflow

1. Identify the source image and target ratio. If the user did not provide an image, ask them to attach one. If the target ratio is missing and cannot be inferred, ask for it.
2. Inspect the source image with `view_image` before editing it.
3. Preserve the full original image unless the user explicitly requests cropping or repositioning.
4. Create an exact-ratio transparent canvas around the source:

   ```bash
   python3 <skill-directory>/scripts/prepare_canvas.py \
     --image /absolute/path/to/source.jpg \
     --ratio 16:9 \
     --position center \
     --output /tmp/image-expansion-canvas.png
   ```

   Use `--position left`, `right`, `top`, or `bottom` when the user asks to expand mainly in the opposite direction. The script never downscales or crops the original.
   The script requires Pillow. If `python3 -c 'import PIL'` fails, stop and tell the user that Pillow is missing; do not install dependencies without permission.
5. Inspect the prepared canvas with `view_image`. Confirm that the original is intact and the added region is transparent.
6. Call `image_gen.imagegen` as an edit with `referenced_image_paths` containing only the prepared canvas. Do not pass `num_last_images_to_include` at the same time.
7. Use a prompt based on this template, adapted to the image and the user's intent:

   ```text
   Outpaint this image to fill every transparent area and produce a complete <ratio> image. Preserve the existing non-transparent pixels, main subject, facial identity, text, logos, camera perspective, lighting, color, texture, and visual style. Continue the scene naturally into the new canvas with seamless boundaries. Do not crop, move, resize, redraw, or replace the original content. Do not add new focal subjects or text unless requested. <user-specific direction>
   ```

8. Return the generated image directly. Follow the image generation tool's response rules.

## Quality rules

- Prefer one edit from the prepared canvas over recreating the scene from a text description.
- Treat preservation of the original region as the highest priority.
- Describe likely off-canvas continuation when it helps GPT Image infer structure, such as extending a wall, sky, floor, landscape, or background pattern.
- Keep people, products, typography, watermarks, and brand marks unchanged unless the user explicitly asks to edit them.
- If the result visibly alters the original or leaves seams, retry once with a stricter preservation prompt and more concrete scene-continuation details.
- Do not promise exact pixel identity inside the original region; generative editing can introduce small changes. State this limitation only when it matters to the user's use case.
