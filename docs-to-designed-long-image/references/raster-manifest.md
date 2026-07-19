# Raster Layout Manifest

Use one JSON object with `canvas`, `type_tokens`, `text_blocks`, and `assets`. This is production evidence, not a design-system abstraction.

## Required shape

```json
{
  "canvas": {"width": 1125, "height": 12600, "display_width": 375},
  "type_tokens": {
    "body": {"font": "CJK font", "size": 37, "leading": 58, "tracking": 0}
  },
  "text_blocks": [
    {
      "source_id": "001",
      "text": "原文",
      "approved_lines": ["原文"],
      "box": [100, 200, 900, 260],
      "line_boxes": [[100, 200, 900, 260]],
      "type_token": "body",
      "font": "CJK font",
      "size": 37,
      "leading": 58,
      "tracking": 0,
      "paragraph_gap": 0,
      "panel": "blue-section",
      "z_order": 20
    }
  ],
  "assets": [
    {
      "asset_id": "reading-illustration",
      "path": "/absolute/or/manifest-relative/asset.png",
      "source_size": [1024, 1536],
      "crop_box": [0, 0, 1024, 1536],
      "placed_box": [650, 1800, 1050, 2400],
      "placed_size": [400, 600],
      "scale": 0.390625,
      "aspect_preserved": true,
      "focal_point_retained": true,
      "background": "transparent",
      "z_order": 10
    }
  ]
}
```

## Rules

- `source_id` must match one checklist ID and occur exactly once.
- `approved_lines` must reconstruct `text` after removing whitespace only.
- `line_boxes` must have the same count as `approved_lines`.
- `size` and `leading` use source-canvas pixels; validate their display-width equivalents.
- `crop_box` and `placed_size` must preserve aspect ratio within 1.5%.
- Use `background: "transparent"` when the reference places the asset directly on a colored field. The asset file must have an alpha channel, transparent corners, and meaningful transparent area.
- Use `background: "paper-patch"` only when the reference visibly contains a paper patch or sticker.
- Record intended overlaps with z-order and section names; do not omit boxes because an overlap is decorative.

Validate with `scripts/validate_raster_output.py` before delivery.
