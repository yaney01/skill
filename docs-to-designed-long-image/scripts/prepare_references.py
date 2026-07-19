#!/usr/bin/env python3
"""Create overview images, overlapping crops, and a manifest for long images."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageStat


def digest(paths: list[Path]) -> str:
    value = hashlib.sha256()
    for path in paths:
        value.update(path.name.encode())
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                value.update(chunk)
    return value.hexdigest()[:16]


def save_jpeg(image: Image.Image, path: Path, quality: int = 90) -> None:
    ImageOps.exif_transpose(image).convert("RGB").save(
        path, "JPEG", quality=quality, optimize=True
    )


def color_palette(image: Image.Image, count: int = 8) -> list[dict]:
    sample = image.copy()
    sample.thumbnail((256, 256), Image.Resampling.LANCZOS)
    quantized = sample.quantize(colors=count, method=Image.Quantize.MEDIANCUT)
    colors = sorted(quantized.getcolors() or [], reverse=True)
    palette = quantized.getpalette() or []
    total = sum(amount for amount, _ in colors) or 1
    result = []
    for amount, index in colors:
        rgb = tuple(palette[index * 3 : index * 3 + 3])
        result.append(
            {
                "hex": "#" + "".join(f"{channel:02X}" for channel in rgb),
                "rgb": list(rgb),
                "share": round(amount / total, 4),
            }
        )
    return result


def row_profile(image: Image.Image, bands: int = 50) -> list[dict]:
    sampled = image.resize((64, bands), Image.Resampling.BILINEAR)
    edges = ImageOps.grayscale(image).filter(ImageFilter.FIND_EDGES).resize(
        (64, bands), Image.Resampling.BILINEAR
    )
    result = []
    for index in range(bands):
        rgb_mean = ImageStat.Stat(sampled.crop((0, index, 64, index + 1))).mean[:3]
        edge_mean = ImageStat.Stat(edges.crop((0, index, 64, index + 1))).mean[0]
        luminance = 0.2126 * rgb_mean[0] + 0.7152 * rgb_mean[1] + 0.0722 * rgb_mean[2]
        result.append(
            {
                "y_start": round(index / bands, 4),
                "y_end": round((index + 1) / bands, 4),
                "mean_rgb": [round(value, 1) for value in rgb_mean],
                "luminance": round(luminance, 1),
                "edge_density": round(edge_mean / 255, 4),
            }
        )
    return result


def measurement_grid(overview: Image.Image) -> Image.Image:
    grid = overview.copy().convert("RGB")
    draw = ImageDraw.Draw(grid)
    width, height = grid.size
    line = max(1, width // 360)
    for step in range(0, 21):
        x = round(width * step / 20)
        color = "#FF5B67" if step % 2 == 0 else "#36D8E8"
        draw.line((x, 0, x, height), fill=color, width=line)
        if step < 20:
            draw.text((x + 3, 3), f"{step * 5}%", fill=color)
    for step in range(0, 21):
        y = round(height * step / 20)
        color = "#FF5B67" if step % 2 == 0 else "#36D8E8"
        draw.line((0, y, width, y), fill=color, width=line)
        if step < 20:
            draw.text((3, y + 3), f"{step * 5}%", fill=color)
    return grid


def palette_strip(colors: list[dict], width: int = 720, height: int = 120) -> Image.Image:
    strip = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(strip)
    swatch = width / max(1, len(colors))
    for index, item in enumerate(colors):
        x0 = round(index * swatch)
        x1 = round((index + 1) * swatch)
        draw.rectangle((x0, 0, x1, height), fill=item["hex"])
        label_color = "white" if sum(item["rgb"]) < 390 else "black"
        draw.text((x0 + 6, height - 30), item["hex"], fill=label_color)
    return strip


def process(path: Path, root: Path, crop_height: int, overlap: int, overview_width: int) -> dict:
    name = path.stem
    target = root / name
    crops = target / "crops"
    crops.mkdir(parents=True, exist_ok=True)
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        width, height = image.size
        overview_height = max(1, round(height * overview_width / width))
        overview = image.resize((overview_width, overview_height), Image.Resampling.LANCZOS)
        overview_path = target / "overview.jpg"
        save_jpeg(overview, overview_path, 88)

        silhouette = overview.filter(
            ImageFilter.GaussianBlur(radius=max(8, overview_width // 32))
        )
        silhouette_path = target / "silhouette.jpg"
        save_jpeg(silhouette, silhouette_path, 86)

        grayscale_path = target / "grayscale.jpg"
        save_jpeg(ImageOps.grayscale(overview).convert("RGB"), grayscale_path, 88)

        grid_path = target / "measurement-grid.jpg"
        save_jpeg(measurement_grid(overview), grid_path, 90)

        palette = color_palette(image)
        palette_path = target / "palette.jpg"
        save_jpeg(palette_strip(palette, max(720, overview_width)), palette_path, 92)

        profile = row_profile(image)
        profile_path = target / "row-profile.json"
        profile_path.write_text(
            json.dumps(profile, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

        effective_crop_height = crop_height or min(
            height, max(900, round(width * 1.8))
        )
        step = effective_crop_height - overlap
        if step <= 0:
            raise SystemExit("overlap must be smaller than crop height")
        entries = []
        top = 0
        index = 1
        while top < height:
            bottom = min(height, top + effective_crop_height)
            crop_path = crops / f"{index:02d}.jpg"
            save_jpeg(image.crop((0, top, width, bottom)), crop_path, 92)
            entries.append({"path": str(crop_path), "top": top, "bottom": bottom})
            if bottom == height:
                break
            top += step
            index += 1

    return {
        "source": str(path),
        "width": width,
        "height": height,
        "measurement_confidence": (
            "low" if width < 360 else "medium" if width < 720 else "high"
        ),
        "overview_upscaled": overview_width > width,
        "overview": str(overview_path),
        "silhouette": str(silhouette_path),
        "grayscale": str(grayscale_path),
        "measurement_grid": str(grid_path),
        "palette_image": str(palette_path),
        "palette": palette,
        "row_profile": str(profile_path),
        "crop_height": effective_crop_height,
        "crops": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("images", nargs="+", type=Path)
    parser.add_argument("--output", "--out", required=True, type=Path)
    parser.add_argument(
        "--crop-height",
        type=int,
        default=0,
        help="Detail-crop height. Defaults to an image-width-derived value.",
    )
    parser.add_argument("--overlap", type=int, default=220)
    parser.add_argument("--overview-width", type=int, default=720)
    args = parser.parse_args()

    paths = [path.expanduser().resolve() for path in args.images]
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        raise SystemExit("Missing image(s): " + ", ".join(missing))
    root = args.output.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    manifest = {
        "style_id": digest(paths),
        "crop_height": args.crop_height or "auto",
        "overlap": args.overlap,
        "images": [
            process(path, root, args.crop_height, args.overlap, args.overview_width)
            for path in paths
        ],
    }
    (root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(root / "manifest.json")


if __name__ == "__main__":
    main()
