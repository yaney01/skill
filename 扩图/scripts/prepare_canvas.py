#!/usr/bin/env python3
"""Place an image unchanged on the smallest larger transparent canvas of an exact ratio."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageOps


POSITIONS = ("center", "left", "right", "top", "bottom")


def parse_ratio(value: str) -> tuple[int, int]:
    try:
        width_text, height_text = value.split(":", 1)
        width = int(width_text)
        height = int(height_text)
    except (ValueError, AttributeError) as exc:
        raise argparse.ArgumentTypeError("ratio must be two positive integers, for example 16:9") from exc
    if width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("ratio values must be positive")
    divisor = math.gcd(width, height)
    return width // divisor, height // divisor


def target_size(source: tuple[int, int], ratio: tuple[int, int]) -> tuple[int, int]:
    source_width, source_height = source
    ratio_width, ratio_height = ratio
    scale = max(
        math.ceil(source_width / ratio_width),
        math.ceil(source_height / ratio_height),
    )
    return ratio_width * scale, ratio_height * scale


def offset_for(
    source: tuple[int, int], target: tuple[int, int], position: str
) -> tuple[int, int]:
    source_width, source_height = source
    target_width, target_height = target
    x = (target_width - source_width) // 2
    y = (target_height - source_height) // 2

    if position == "left":
        x = 0
    elif position == "right":
        x = target_width - source_width
    elif position == "top":
        y = 0
    elif position == "bottom":
        y = target_height - source_height
    return x, y


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, type=Path, help="source image path")
    parser.add_argument("--ratio", required=True, type=parse_ratio, help="target ratio, e.g. 16:9")
    parser.add_argument("--position", choices=POSITIONS, default="center")
    parser.add_argument("--output", required=True, type=Path, help="output PNG path")
    args = parser.parse_args()

    if not args.image.is_file():
        parser.error(f"source image does not exist: {args.image}")
    if args.output.suffix.lower() != ".png":
        parser.error("output must use the .png extension to preserve transparency")

    with Image.open(args.image) as opened:
        source = ImageOps.exif_transpose(opened).convert("RGBA")
        icc_profile = opened.info.get("icc_profile")

    canvas_size = target_size(source.size, args.ratio)
    offset = offset_for(source.size, canvas_size, args.position)
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.alpha_composite(source, dest=offset)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    save_options = {"icc_profile": icc_profile} if icc_profile else {}
    canvas.save(args.output, format="PNG", **save_options)

    ratio_width, ratio_height = args.ratio
    print(
        f"created {args.output} ({canvas.width}x{canvas.height}, "
        f"ratio {ratio_width}:{ratio_height}, source offset {offset[0]},{offset[1]})"
    )


if __name__ == "__main__":
    main()
