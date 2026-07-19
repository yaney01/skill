#!/usr/bin/env python3
"""Validate a raster long-image manifest, source checklist, assets, and final PNG."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re

from PIL import Image, ImageStat


def canonical(value: str) -> str:
    return re.sub(r"\s+", "", value)


def parse_checklist(path: Path) -> dict[str, str]:
    blocks: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"\[(\d{3})\]\[[^\]]+\]\s*(.*)", line)
        if match:
            blocks[match.group(1)] = match.group(2)
    if not blocks:
        raise SystemExit(f"No checklist blocks found in {path}")
    return blocks


def valid_box(box: object) -> bool:
    return isinstance(box, list) and len(box) == 4 and all(isinstance(value, (int, float)) for value in box)


def inside(box: list[float], width: int, height: int) -> bool:
    x0, y0, x1, y1 = box
    return 0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checklist", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--display-width", type=int, default=375)
    parser.add_argument("--min-text-px", type=float, default=11.0)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    checklist = parse_checklist(args.checklist.expanduser().resolve())
    manifest_path = args.manifest.expanduser().resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    canvas = manifest.get("canvas", {})
    width = int(canvas.get("width", 0))
    height = int(canvas.get("height", 0))
    if width <= 0 or height <= 0:
        raise SystemExit("Manifest canvas width and height must be positive.")

    problems: dict[str, list] = {
        "missingText": [], "duplicateText": [], "extraText": [], "changedText": [],
        "manifestErrors": [], "outOfBoundsText": [], "tinyText": [], "badLineBreaks": [],
        "assetOutOfBounds": [], "aspectErrors": [], "alphaProblems": [],
        "failedImages": [], "outputErrors": [],
    }
    by_id: dict[str, list[dict]] = {}
    required_text_fields = {
        "source_id", "text", "approved_lines", "box", "line_boxes", "type_token",
        "font", "size", "leading", "tracking", "paragraph_gap", "panel", "z_order",
    }
    opening = "（《“‘【"
    closing = "，。！？；：、）》”’】"

    for item in manifest.get("text_blocks", []):
        source_id = str(item.get("source_id", ""))
        missing_fields = sorted(required_text_fields - set(item))
        if missing_fields:
            problems["manifestErrors"].append(f"{source_id or '?'}:missing:{','.join(missing_fields)}")
        by_id.setdefault(source_id, []).append(item)

    for source_id in checklist:
        items = by_id.get(source_id, [])
        if not items:
            problems["missingText"].append(source_id)
        elif len(items) > 1:
            problems["duplicateText"].append(source_id)
    problems["extraText"] = sorted(source_id for source_id in by_id if source_id not in checklist)

    scale = args.display_width / width
    for source_id, items in by_id.items():
        for item in items:
            expected = checklist.get(source_id)
            if expected is not None and canonical(str(item.get("text", ""))) != canonical(expected):
                problems["changedText"].append(source_id)
            box = item.get("box")
            if not valid_box(box) or not inside(box, width, height):
                problems["outOfBoundsText"].append(source_id)
            size = float(item.get("size", 0))
            if size * scale < args.min_text_px:
                problems["tinyText"].append(source_id)
            lines = item.get("approved_lines")
            if not isinstance(lines, list) or not lines:
                problems["manifestErrors"].append(f"{source_id}:approved_lines")
                continue
            if canonical("".join(str(line) for line in lines)) != canonical(str(item.get("text", ""))):
                problems["changedText"].append(f"{source_id}:lines")
            for index, raw_line in enumerate(lines):
                line = canonical(str(raw_line))
                if not line:
                    problems["badLineBreaks"].append(f"{source_id}:empty-line")
                    continue
                if line[0] in closing:
                    problems["badLineBreaks"].append(f"{source_id}:starts-{line[0]}")
                if line[-1] in opening:
                    problems["badLineBreaks"].append(f"{source_id}:ends-{line[-1]}")
                if index == len(lines) - 1 and len(line) == 1:
                    problems["badLineBreaks"].append(f"{source_id}:orphan")
            line_boxes = item.get("line_boxes")
            if not isinstance(line_boxes, list) or len(line_boxes) != len(lines):
                problems["manifestErrors"].append(f"{source_id}:line_boxes")
            elif any(not valid_box(line_box) or not inside(line_box, width, height) for line_box in line_boxes):
                problems["outOfBoundsText"].append(f"{source_id}:line")

    for asset in manifest.get("assets", []):
        asset_id = str(asset.get("asset_id", "?"))
        path = Path(str(asset.get("path", ""))).expanduser()
        if not path.is_absolute():
            path = (manifest_path.parent / path).resolve()
        if not path.is_file():
            problems["failedImages"].append(asset_id)
            continue
        placed = asset.get("placed_box")
        if not valid_box(placed) or not inside(placed, width, height):
            problems["assetOutOfBounds"].append(asset_id)
        crop = asset.get("crop_box")
        placed_size = asset.get("placed_size")
        if valid_box(crop) and isinstance(placed_size, list) and len(placed_size) == 2:
            crop_w, crop_h = crop[2] - crop[0], crop[3] - crop[1]
            placed_w, placed_h = float(placed_size[0]), float(placed_size[1])
            if crop_w <= 0 or crop_h <= 0 or placed_w <= 0 or placed_h <= 0:
                problems["aspectErrors"].append(asset_id)
            else:
                ratio_error = abs((crop_w / crop_h) / (placed_w / placed_h) - 1)
                if ratio_error > 0.015:
                    problems["aspectErrors"].append(asset_id)
        elif asset.get("aspect_preserved") is not True:
            problems["aspectErrors"].append(asset_id)

        if asset.get("background") == "transparent":
            with Image.open(path) as source:
                rgba = source.convert("RGBA")
                alpha = rgba.getchannel("A")
                corners = [
                    alpha.getpixel((0, 0)), alpha.getpixel((rgba.width - 1, 0)),
                    alpha.getpixel((0, rgba.height - 1)), alpha.getpixel((rgba.width - 1, rgba.height - 1)),
                ]
                transparent_share = alpha.histogram()[0] / max(1, rgba.width * rgba.height)
                if not all(value == 0 for value in corners) or transparent_share < 0.10:
                    problems["alphaProblems"].append(asset_id)

    image_path = args.image.expanduser().resolve()
    if not image_path.is_file():
        problems["outputErrors"].append("missing-output")
    else:
        with Image.open(image_path) as output:
            if output.size != (width, height):
                problems["outputErrors"].append(f"size:{output.width}x{output.height}")
            stat = ImageStat.Stat(output.convert("L"))
            if not stat.extrema or stat.extrema[0][1] - stat.extrema[0][0] < 3:
                problems["outputErrors"].append("blank-output")

    for key in problems:
        problems[key] = sorted(set(problems[key]))
    report = {
        "passed": not any(problems.values()),
        "canvas": [width, height],
        "display_width": args.display_width,
        "semantic_blocks_expected": len(checklist),
        "semantic_blocks_rendered": len(manifest.get("text_blocks", [])),
        **problems,
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        target = args.report.expanduser().resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
