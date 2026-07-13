#!/usr/bin/env python3
"""Normalize PPTX, DOCX, PDF, and Markdown sources into a common source/ tree.

The importer intentionally uses the Python standard library for Office Open XML
and Markdown. PDF text/image extraction delegates to Poppler when available and
falls back to pypdf for text-only extraction.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import mimetypes
import posixpath
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable
from xml.etree import ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
}
RID = f"{{{NS['r']}}}id"
REMBED = f"{{{NS['r']}}}embed"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".tif", ".tiff", ".emf", ".wmf"}
SUPPORTED_EXTENSIONS = {".pptx": "pptx", ".docx": "docx", ".pdf": "pdf", ".md": "markdown", ".markdown": "markdown", ".mdown": "markdown"}


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def rel_target(base_part: str, target: str) -> str:
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(base_part), target))


def read_xml(archive: zipfile.ZipFile, part: str) -> ET.Element | None:
    try:
        return ET.fromstring(archive.read(part))
    except KeyError:
        return None
    except ET.ParseError as exc:
        raise ValueError(f"Invalid XML part {part}: {exc}") from exc


def relationships(archive: zipfile.ZipFile, source_part: str) -> dict[str, dict[str, Any]]:
    directory, filename = posixpath.split(source_part)
    rel_part = posixpath.join(directory, "_rels", f"{filename}.rels")
    root = read_xml(archive, rel_part)
    result: dict[str, dict[str, Any]] = {}
    if root is None:
        return result
    for rel in root:
        rid = rel.attrib.get("Id")
        target = rel.attrib.get("Target")
        if not rid or not target:
            continue
        result[rid] = {
            "type": rel.attrib.get("Type", ""),
            "target": rel_target(source_part, target),
            "external": rel.attrib.get("TargetMode") == "External",
        }
    return result


def image_dimensions(data: bytes, extension: str) -> tuple[int | None, int | None]:
    extension = extension.lower()
    try:
        if extension == ".png" and data[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", data[16:24])
        if extension in {".jpg", ".jpeg"} and data[:2] == b"\xff\xd8":
            index = 2
            while index + 9 < len(data):
                if data[index] != 0xFF:
                    index += 1
                    continue
                marker = data[index + 1]
                index += 2
                if marker in {0xD8, 0xD9}:
                    continue
                length = struct.unpack(">H", data[index:index + 2])[0]
                if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
                    height, width = struct.unpack(">HH", data[index + 3:index + 7])
                    return width, height
                index += length
        if extension == ".gif" and data[:6] in {b"GIF87a", b"GIF89a"}:
            return struct.unpack("<HH", data[6:10])
        if extension == ".webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            if data[12:16] == b"VP8X" and len(data) >= 30:
                return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
        if extension == ".svg":
            text = data[:65536].decode("utf-8", errors="ignore")
            view_box = re.search(r"viewBox\s*=\s*['\"]\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)", text, re.I)
            if view_box:
                return round(float(view_box.group(1))), round(float(view_box.group(2)))
            width = re.search(r"\bwidth\s*=\s*['\"]([\d.]+)", text, re.I)
            height = re.search(r"\bheight\s*=\s*['\"]([\d.]+)", text, re.I)
            if width and height:
                return round(float(width.group(1))), round(float(height.group(1)))
    except (ValueError, struct.error, IndexError):
        return None, None
    return None, None


def text_markdown(title: str, blocks: Iterable[str], source_index: int) -> str:
    body = "\n\n".join(block.strip() for block in blocks if block and block.strip())
    heading = title.strip() or f"Source page {source_index}"
    return f"# {heading}\n\n<!-- source-index: {source_index} -->\n\n{body}\n"


@dataclass
class ImportContext:
    source: Path
    output: Path
    source_type: str
    preserve_layout: bool
    allow_omit: bool
    warnings: list[dict[str, Any]] = field(default_factory=list)
    pages: list[dict[str, Any]] = field(default_factory=list)
    global_images: list[dict[str, Any]] = field(default_factory=list)
    global_tables: list[dict[str, Any]] = field(default_factory=list)
    global_charts: list[dict[str, Any]] = field(default_factory=list)

    def warn(self, code: str, message: str, page: str | None = None) -> None:
        item: dict[str, Any] = {"code": code, "message": message}
        if page:
            item["page"] = page
        self.warnings.append(item)

    def page_base(self, index: int) -> str:
        return f"page-{index:03d}"

    def write_page_text(self, index: int, title: str, blocks: Iterable[str]) -> str:
        rel = f"text/{self.page_base(index)}.md"
        target = self.output / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text_markdown(title, blocks, index), encoding="utf-8")
        return rel

    def write_notes(self, index: int, notes: str) -> str | None:
        if not notes.strip():
            return None
        rel = f"notes/{self.page_base(index)}.md"
        target = self.output / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(f"# Speaker notes — {self.page_base(index)}\n\n{notes.strip()}\n", encoding="utf-8")
        return rel

    def preservation(self) -> dict[str, bool]:
        return {
            "verbatim": False,
            "layout": self.preserve_layout,
            "allowMerge": not self.preserve_layout,
            "allowCondense": not self.preserve_layout,
            "allowOmit": self.allow_omit and not self.preserve_layout,
        }


def copy_zip_asset(ctx: ImportContext, archive: zipfile.ZipFile, part: str, page_index: int, ordinal: int, role: str = "image") -> dict[str, Any] | None:
    try:
        data = archive.read(part)
    except KeyError:
        ctx.warn("asset.missing-part", f"Referenced package part not found: {part}", ctx.page_base(page_index))
        return None
    ext = Path(part).suffix.lower() or ".bin"
    filename = f"{ctx.page_base(page_index)}-image-{ordinal:02d}{ext}"
    rel = f"images/{filename}"
    target = ctx.output / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    width, height = image_dimensions(data, ext)
    item = {
        "id": f"{ctx.page_base(page_index)}-image-{ordinal:02d}",
        "path": rel,
        "originalPart": part,
        "mediaType": mimetypes.guess_type(filename)[0] or "application/octet-stream",
        "width": width,
        "height": height,
        "role": role,
        "preservePixelFaithful": role in {"screenshot", "logo"},
        "allowCrop": role not in {"screenshot", "logo"},
    }
    ctx.global_images.append({"page": ctx.page_base(page_index), **item})
    return item


def extract_pptx(ctx: ImportContext) -> None:
    with zipfile.ZipFile(ctx.source) as archive:
        presentation = read_xml(archive, "ppt/presentation.xml")
        if presentation is None:
            raise ValueError("ppt/presentation.xml is missing")
        rels = relationships(archive, "ppt/presentation.xml")
        slide_parts: list[str] = []
        slide_list = presentation.find("p:sldIdLst", NS)
        if slide_list is not None:
            for slide_id in slide_list:
                rel = rels.get(slide_id.attrib.get(RID, ""))
                if rel and not rel["external"]:
                    slide_parts.append(rel["target"])
        if not slide_parts:
            slide_parts = sorted(name for name in archive.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", name))

        for page_index, slide_part in enumerate(slide_parts, 1):
            root = read_xml(archive, slide_part)
            if root is None:
                continue
            slide_rels = relationships(archive, slide_part)
            paragraphs: list[str] = []
            elements: list[dict[str, Any]] = []
            images: list[dict[str, Any]] = []
            tables: list[dict[str, Any]] = []
            charts: list[dict[str, Any]] = []

            for paragraph in root.findall(".//a:p", NS):
                text = "".join(node.text or "" for node in paragraph.findall(".//a:t", NS)).strip()
                if text:
                    paragraphs.append(text)

            for shape in root.findall(".//p:sp", NS):
                name_node = shape.find("p:nvSpPr/p:cNvPr", NS)
                name = name_node.attrib.get("name", "shape") if name_node is not None else "shape"
                xfrm = shape.find("p:spPr/a:xfrm", NS)
                geometry = None
                if xfrm is not None:
                    off, ext = xfrm.find("a:off", NS), xfrm.find("a:ext", NS)
                    if off is not None and ext is not None:
                        geometry = {"x": int(off.attrib.get("x", 0)), "y": int(off.attrib.get("y", 0)), "width": int(ext.attrib.get("cx", 0)), "height": int(ext.attrib.get("cy", 0)), "unit": "EMU"}
                shape_text = " ".join("".join(n.text or "" for n in p.findall(".//a:t", NS)).strip() for p in shape.findall(".//a:p", NS)).strip()
                elements.append({"kind": "text", "name": name, "text": shape_text, "geometry": geometry})

            image_ordinal = 0
            seen_parts: set[str] = set()
            for blip in root.findall(".//a:blip", NS):
                rid = blip.attrib.get(REMBED)
                rel = slide_rels.get(rid or "")
                if not rel or rel["external"] or rel["target"] in seen_parts:
                    continue
                if Path(rel["target"]).suffix.lower() not in IMAGE_EXTENSIONS:
                    continue
                seen_parts.add(rel["target"])
                image_ordinal += 1
                item = copy_zip_asset(ctx, archive, rel["target"], page_index, image_ordinal)
                if item:
                    images.append(item)

            for table_index, table in enumerate(root.findall(".//a:tbl", NS), 1):
                rows: list[list[str]] = []
                for row in table.findall("a:tr", NS):
                    rows.append([" ".join(n.text or "" for n in cell.findall(".//a:t", NS)).strip() for cell in row.findall("a:tc", NS)])
                rel_path = f"tables/{ctx.page_base(page_index)}-table-{table_index:02d}.json"
                write_json(ctx.output / rel_path, {"page": ctx.page_base(page_index), "rows": rows})
                item = {"id": f"{ctx.page_base(page_index)}-table-{table_index:02d}", "path": rel_path, "rows": len(rows), "columns": max((len(row) for row in rows), default=0)}
                tables.append(item)
                ctx.global_tables.append({"page": ctx.page_base(page_index), **item})

            chart_ordinal = 0
            for rel in slide_rels.values():
                if rel["external"] or not rel["type"].endswith("/chart"):
                    continue
                chart_ordinal += 1
                chart_root = read_xml(archive, rel["target"])
                series: list[dict[str, Any]] = []
                if chart_root is not None:
                    for series_node in chart_root.findall(".//c:ser", NS):
                        categories = [n.text or "" for n in series_node.findall(".//c:cat//c:v", NS)]
                        values = [n.text or "" for n in series_node.findall(".//c:val//c:v", NS)]
                        name = " ".join(n.text or "" for n in series_node.findall(".//c:tx//c:v", NS)).strip()
                        series.append({"name": name, "categories": categories, "values": values})
                rel_path = f"charts/{ctx.page_base(page_index)}-chart-{chart_ordinal:02d}.json"
                write_json(ctx.output / rel_path, {"page": ctx.page_base(page_index), "sourcePart": rel["target"], "series": series})
                item = {"id": f"{ctx.page_base(page_index)}-chart-{chart_ordinal:02d}", "path": rel_path, "series": len(series), "sourcePart": rel["target"]}
                charts.append(item)
                ctx.global_charts.append({"page": ctx.page_base(page_index), **item})

            notes = ""
            for rel in slide_rels.values():
                if not rel["external"] and rel["type"].endswith("/notesSlide"):
                    notes_root = read_xml(archive, rel["target"])
                    if notes_root is not None:
                        notes = "\n".join("".join(n.text or "" for n in p.findall(".//a:t", NS)).strip() for p in notes_root.findall(".//a:p", NS)).strip()
                    break

            title = paragraphs[0] if paragraphs else f"Slide {page_index}"
            text_path = ctx.write_page_text(page_index, title, paragraphs[1:] if len(paragraphs) > 1 else paragraphs)
            notes_path = ctx.write_notes(page_index, notes)
            ctx.pages.append({
                "id": ctx.page_base(page_index),
                "sourceIndex": page_index,
                "title": title,
                "textPath": text_path,
                "notesPath": notes_path,
                "images": images,
                "tables": tables,
                "charts": charts,
                "elements": elements if ctx.preserve_layout else [],
                "preservation": ctx.preservation(),
                "provenance": [{"sourceFile": ctx.source.name, "sourcePage": page_index}],
            })


def docx_paragraph_text(node: ET.Element) -> str:
    pieces: list[str] = []
    for child in node.iter():
        if child.tag == f"{{{NS['w']}}}t":
            pieces.append(child.text or "")
        elif child.tag == f"{{{NS['w']}}}tab":
            pieces.append("\t")
        elif child.tag in {f"{{{NS['w']}}}br", f"{{{NS['w']}}}cr"}:
            pieces.append("\n")
    return "".join(pieces).strip()


def docx_style(node: ET.Element) -> str:
    style = node.find("w:pPr/w:pStyle", NS)
    return style.attrib.get(f"{{{NS['w']}}}val", "") if style is not None else ""


def extract_docx(ctx: ImportContext) -> None:
    with zipfile.ZipFile(ctx.source) as archive:
        document = read_xml(archive, "word/document.xml")
        if document is None:
            raise ValueError("word/document.xml is missing")
        rels = relationships(archive, "word/document.xml")
        body = document.find("w:body", NS)
        if body is None:
            return
        sections: list[dict[str, Any]] = []
        current = {"title": "", "blocks": [], "imageParts": [], "tables": []}

        def flush() -> None:
            nonlocal current
            if current["title"] or current["blocks"] or current["imageParts"] or current["tables"]:
                sections.append(current)
            current = {"title": "", "blocks": [], "imageParts": [], "tables": []}

        for child in body:
            if child.tag == f"{{{NS['w']}}}p":
                text = docx_paragraph_text(child)
                style = docx_style(child).lower()
                is_heading = style.startswith("heading") or style in {"title", "subtitle"}
                if is_heading and current["title"]:
                    flush()
                if is_heading and text:
                    current["title"] = text
                elif text:
                    current["blocks"].append(text)
                for blip in child.findall(".//a:blip", NS):
                    rid = blip.attrib.get(REMBED)
                    rel = rels.get(rid or "")
                    if rel and not rel["external"]:
                        current["imageParts"].append(rel["target"])
            elif child.tag == f"{{{NS['w']}}}tbl":
                rows: list[list[str]] = []
                for row in child.findall("w:tr", NS):
                    rows.append([" ".join(docx_paragraph_text(p) for p in cell.findall(".//w:p", NS)).strip() for cell in row.findall("w:tc", NS)])
                current["tables"].append(rows)
        flush()
        if not sections:
            sections = [{"title": ctx.source.stem, "blocks": [], "imageParts": [], "tables": []}]

        for page_index, section in enumerate(sections, 1):
            title = section["title"] or (section["blocks"][0] if section["blocks"] else f"Section {page_index}")
            blocks = section["blocks"] if section["title"] else section["blocks"][1:]
            text_path = ctx.write_page_text(page_index, title, blocks)
            images: list[dict[str, Any]] = []
            seen: set[str] = set()
            for part in section["imageParts"]:
                if part in seen:
                    continue
                seen.add(part)
                item = copy_zip_asset(ctx, archive, part, page_index, len(images) + 1)
                if item:
                    images.append(item)
            tables: list[dict[str, Any]] = []
            for table_index, rows in enumerate(section["tables"], 1):
                rel_path = f"tables/{ctx.page_base(page_index)}-table-{table_index:02d}.json"
                write_json(ctx.output / rel_path, {"page": ctx.page_base(page_index), "rows": rows})
                item = {"id": f"{ctx.page_base(page_index)}-table-{table_index:02d}", "path": rel_path, "rows": len(rows), "columns": max((len(row) for row in rows), default=0)}
                tables.append(item)
                ctx.global_tables.append({"page": ctx.page_base(page_index), **item})
            ctx.pages.append({
                "id": ctx.page_base(page_index),
                "sourceIndex": page_index,
                "title": title,
                "textPath": text_path,
                "notesPath": None,
                "images": images,
                "tables": tables,
                "charts": [],
                "elements": [],
                "preservation": ctx.preservation(),
                "provenance": [{"sourceFile": ctx.source.name, "sourceSection": page_index}],
            })
        if "word/footnotes.xml" in archive.namelist():
            ctx.warn("docx.footnotes-present", "The DOCX contains footnotes; they are not yet associated with individual sections.")


def markdown_sections(text: str) -> list[dict[str, Any]]:
    text = text.replace("\r\n", "\n")
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end >= 0:
            text = text[end + 5:]
    sections: list[dict[str, Any]] = []
    current = {"title": "", "lines": []}
    in_fence = False
    fence = ""
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith(("```", "~~~")):
            marker = stripped[:3]
            if not in_fence:
                in_fence, fence = True, marker
            elif marker == fence:
                in_fence = False
        heading = re.match(r"^(#{1,2})\s+(.+?)\s*$", line) if not in_fence else None
        if heading:
            if current["title"] or any(value.strip() for value in current["lines"]):
                sections.append(current)
            current = {"title": heading.group(2).strip(), "lines": []}
        else:
            current["lines"].append(line)
    if current["title"] or any(value.strip() for value in current["lines"]):
        sections.append(current)
    return sections or [{"title": "", "lines": text.splitlines()}]


def markdown_table(lines: list[str], start: int) -> tuple[list[list[str]] | None, int]:
    if start + 1 >= len(lines) or "|" not in lines[start]:
        return None, start
    delimiter = lines[start + 1].strip()
    if not re.match(r"^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$", delimiter):
        return None, start
    rows: list[list[str]] = []
    index = start
    while index < len(lines) and "|" in lines[index] and lines[index].strip():
        if index != start + 1:
            rows.append([cell.strip() for cell in lines[index].strip().strip("|").split("|")])
        index += 1
    return rows, index - 1


def extract_markdown(ctx: ImportContext) -> None:
    text = ctx.source.read_text(encoding="utf-8", errors="replace")
    sections = markdown_sections(text)
    image_pattern = re.compile(r"!\[([^\]]*)\]\(([^\s)]+)(?:\s+[\"'][^\"']*[\"'])?\)")
    for page_index, section in enumerate(sections, 1):
        title = section["title"] or (ctx.source.stem if page_index == 1 else f"Section {page_index}")
        lines: list[str] = section["lines"]
        images: list[dict[str, Any]] = []
        tables: list[dict[str, Any]] = []
        cleaned_lines: list[str] = []
        index = 0
        while index < len(lines):
            table, end = markdown_table(lines, index)
            if table:
                table_index = len(tables) + 1
                rel_path = f"tables/{ctx.page_base(page_index)}-table-{table_index:02d}.json"
                write_json(ctx.output / rel_path, {"page": ctx.page_base(page_index), "rows": table})
                item = {"id": f"{ctx.page_base(page_index)}-table-{table_index:02d}", "path": rel_path, "rows": len(table), "columns": max((len(row) for row in table), default=0)}
                tables.append(item)
                ctx.global_tables.append({"page": ctx.page_base(page_index), **item})
                cleaned_lines.append(f"[Table extracted to {rel_path}]")
                index = end + 1
                continue
            line = lines[index]
            for match in image_pattern.finditer(line):
                alt, source_value = match.group(1), match.group(2).strip("<>")
                if re.match(r"^[a-z]+://", source_value, re.I):
                    item = {"id": f"{ctx.page_base(page_index)}-image-{len(images)+1:02d}", "path": source_value, "originalPart": source_value, "mediaType": None, "width": None, "height": None, "role": "image", "alt": alt, "external": True, "preservePixelFaithful": False, "allowCrop": True}
                    ctx.warn("markdown.remote-image", f"Remote image was recorded but not downloaded: {source_value}", ctx.page_base(page_index))
                else:
                    source_path = (ctx.source.parent / source_value).resolve()
                    if not source_path.exists() or not source_path.is_file():
                        ctx.warn("markdown.image-missing", f"Local Markdown image not found: {source_value}", ctx.page_base(page_index))
                        continue
                    ext = source_path.suffix.lower() or ".bin"
                    filename = f"{ctx.page_base(page_index)}-image-{len(images)+1:02d}{ext}"
                    rel = f"images/{filename}"
                    target = ctx.output / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_path, target)
                    width, height = image_dimensions(target.read_bytes(), ext)
                    item = {"id": f"{ctx.page_base(page_index)}-image-{len(images)+1:02d}", "path": rel, "originalPart": source_value, "mediaType": mimetypes.guess_type(filename)[0] or "application/octet-stream", "width": width, "height": height, "role": "image", "alt": alt, "external": False, "preservePixelFaithful": False, "allowCrop": True}
                    ctx.global_images.append({"page": ctx.page_base(page_index), **item})
                images.append(item)
            cleaned_lines.append(line)
            index += 1
        text_path = ctx.write_page_text(page_index, title, cleaned_lines)
        ctx.pages.append({
            "id": ctx.page_base(page_index),
            "sourceIndex": page_index,
            "title": title,
            "textPath": text_path,
            "notesPath": None,
            "images": images,
            "tables": tables,
            "charts": [],
            "elements": [],
            "preservation": ctx.preservation(),
            "provenance": [{"sourceFile": ctx.source.name, "sourceSection": page_index}],
        })


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def run_command(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)


def pdf_page_count(source: Path) -> int | None:
    if not command_exists("pdfinfo"):
        return None
    result = run_command(["pdfinfo", str(source)])
    match = re.search(r"^Pages:\s+(\d+)", result.stdout, re.M)
    return int(match.group(1)) if match else None


def parse_pdfimages_list(output: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for line in output.splitlines():
        parts = line.split()
        if len(parts) < 8 or not parts[0].isdigit() or not parts[1].isdigit():
            continue
        try:
            items.append({"page": int(parts[0]), "num": int(parts[1]), "type": parts[2], "width": int(parts[3]), "height": int(parts[4])})
        except ValueError:
            continue
    return items


def extract_pdf(ctx: ImportContext) -> None:
    page_texts: list[str] = []
    page_count = pdf_page_count(ctx.source)
    if command_exists("pdftotext"):
        with tempfile.TemporaryDirectory(prefix="ppt-pdf-") as temp_dir:
            output = Path(temp_dir) / "content.txt"
            result = run_command(["pdftotext", "-layout", "-enc", "UTF-8", str(ctx.source), str(output)])
            if result.returncode != 0:
                raise RuntimeError(f"pdftotext failed: {result.stderr.strip()}")
            raw = output.read_text(encoding="utf-8", errors="replace")
            page_texts = raw.split("\f")
            if page_texts and not page_texts[-1].strip():
                page_texts.pop()
    else:
        try:
            from pypdf import PdfReader  # type: ignore
        except Exception as exc:
            raise RuntimeError("PDF extraction requires Poppler (`pdftotext`) or the optional `pypdf` package. OCR is not used automatically.") from exc
        reader = PdfReader(str(ctx.source))
        page_texts = [(page.extract_text() or "") for page in reader.pages]
        page_count = len(page_texts)
        ctx.warn("pdf.text-only-fallback", "Used pypdf text-only fallback; embedded images were not extracted.")

    if page_count is None:
        page_count = len(page_texts)
    while len(page_texts) < page_count:
        page_texts.append("")

    page_images: dict[int, list[dict[str, Any]]] = {index: [] for index in range(1, page_count + 1)}
    if command_exists("pdfimages"):
        with tempfile.TemporaryDirectory(prefix="ppt-pdf-images-") as temp_dir:
            temp = Path(temp_dir)
            listing = run_command(["pdfimages", "-list", str(ctx.source)])
            metadata = parse_pdfimages_list(listing.stdout)
            extract = run_command(["pdfimages", "-png", str(ctx.source), str(temp / "asset")])
            if extract.returncode == 0:
                files = sorted(temp.glob("asset-*"))
                for ordinal, file in enumerate(files):
                    meta = metadata[ordinal] if ordinal < len(metadata) else {"page": 1, "width": None, "height": None}
                    page_index = max(1, min(page_count, int(meta.get("page", 1))))
                    filename = f"{ctx.page_base(page_index)}-image-{len(page_images[page_index])+1:02d}{file.suffix.lower()}"
                    rel = f"images/{filename}"
                    target = ctx.output / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(file, target)
                    width, height = image_dimensions(target.read_bytes(), target.suffix)
                    item = {"id": Path(filename).stem, "path": rel, "originalPart": f"pdf-image-{ordinal+1}", "mediaType": mimetypes.guess_type(filename)[0] or "application/octet-stream", "width": width or meta.get("width"), "height": height or meta.get("height"), "role": "image", "preservePixelFaithful": True, "allowCrop": False}
                    page_images[page_index].append(item)
                    ctx.global_images.append({"page": ctx.page_base(page_index), **item})
            elif listing.returncode != 0:
                ctx.warn("pdf.image-extraction-failed", extract.stderr.strip() or listing.stderr.strip())
    else:
        ctx.warn("pdfimages.unavailable", "`pdfimages` is unavailable; PDF images were not extracted.")

    for page_index in range(1, page_count + 1):
        raw = page_texts[page_index - 1] if page_index - 1 < len(page_texts) else ""
        nonempty = [line.strip() for line in raw.splitlines() if line.strip()]
        title = nonempty[0][:160] if nonempty else f"PDF page {page_index}"
        text_path = ctx.write_page_text(page_index, title, nonempty[1:] if len(nonempty) > 1 else nonempty)
        ctx.pages.append({
            "id": ctx.page_base(page_index),
            "sourceIndex": page_index,
            "title": title,
            "textPath": text_path,
            "notesPath": None,
            "images": page_images.get(page_index, []),
            "tables": [],
            "charts": [],
            "elements": [],
            "preservation": ctx.preservation(),
            "provenance": [{"sourceFile": ctx.source.name, "sourcePage": page_index}],
        })
    ctx.warn("pdf.layout-flattened", "PDF content is flattened. Text reading order and image-to-caption association require manual review.")


def build_manifest(ctx: ImportContext) -> dict[str, Any]:
    return {
        "$schema": "https://raw.githubusercontent.com/yaney01/skill/main/ppt/schemas/source.schema.json",
        "manifestVersion": 1,
        "source": {
            "fileName": ctx.source.name,
            "type": ctx.source_type,
            "sha256": sha256_file(ctx.source),
            "sizeBytes": ctx.source.stat().st_size,
            "importedAt": utc_now(),
            "importer": "ppt/scripts/ingest-source.py",
            "preserveLayout": ctx.preserve_layout,
        },
        "pageCount": len(ctx.pages),
        "pages": ctx.pages,
        "assets": {"images": ctx.global_images, "tables": ctx.global_tables, "charts": ctx.global_charts},
        "warnings": ctx.warnings,
    }


def write_readme(ctx: ImportContext) -> None:
    content = f"""# Standardized source import

Source: `{ctx.source.name}`  
Type: `{ctx.source_type}`  
Pages/sections: `{len(ctx.pages)}`

This directory is an intermediate production artifact. `manifest.json` records original order, text, assets, notes, tables, charts, preservation constraints, and provenance. Review warnings before generating `deck.json`.

## Next step

```bash
node scripts/validate-source.mjs {ctx.output / 'manifest.json'} --strict
```

Do not use this directory as the final presentation output.
"""
    (ctx.output / "README.md").write_text(content, encoding="utf-8")
    write_json(ctx.output / "citations.json", {"sourceFile": ctx.source.name, "citations": []})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize PPTX, DOCX, PDF, or Markdown into a source manifest.")
    parser.add_argument("source", help="Input source file")
    parser.add_argument("--output", required=True, help="Output source directory")
    parser.add_argument("--format", choices=["auto", "pptx", "docx", "pdf", "markdown"], default="auto")
    parser.add_argument("--preserve-layout", action="store_true", help="Record source geometry when available and disallow automatic merge/condense/omit")
    parser.add_argument("--allow-omit", action="store_true", help="Allow downstream planning to omit non-required material")
    parser.add_argument("--force", action="store_true", help="Replace an existing output directory")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    if not source.exists() or not source.is_file():
        print(f"Source file not found: {source}", file=sys.stderr)
        return 2
    source_type = args.format if args.format != "auto" else SUPPORTED_EXTENSIONS.get(source.suffix.lower())
    if not source_type:
        print(f"Unsupported source type: {source.suffix or '(none)'}. Supported: PPTX, DOCX, PDF, Markdown.", file=sys.stderr)
        return 2
    if output.exists():
        if not args.force:
            print(f"Output directory already exists: {output}. Use --force to replace it.", file=sys.stderr)
            return 2
        shutil.rmtree(output)
    output.mkdir(parents=True)
    ctx = ImportContext(source=source, output=output, source_type=source_type, preserve_layout=args.preserve_layout, allow_omit=args.allow_omit)
    try:
        {"pptx": extract_pptx, "docx": extract_docx, "pdf": extract_pdf, "markdown": extract_markdown}[source_type](ctx)
        write_json(output / "manifest.json", build_manifest(ctx))
        write_readme(ctx)
    except (ValueError, RuntimeError, zipfile.BadZipFile, OSError) as exc:
        shutil.rmtree(output, ignore_errors=True)
        print(f"Source ingestion failed: {exc}", file=sys.stderr)
        return 1
    print("Source ingestion complete")
    print(f"Type: {source_type}")
    print(f"Pages/sections: {len(ctx.pages)}")
    print(f"Images: {len(ctx.global_images)}")
    print(f"Tables: {len(ctx.global_tables)}")
    print(f"Charts: {len(ctx.global_charts)}")
    print(f"Warnings: {len(ctx.warnings)}")
    print(f"Manifest: {output / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
