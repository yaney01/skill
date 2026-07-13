#!/usr/bin/env python3
from __future__ import annotations
import struct
import sys
import zlib
import zipfile
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
ROOT.mkdir(parents=True, exist_ok=True)


def png(width=1600, height=900, rgb=(36, 85, 255)):
    raw = b''.join(b'\x00' + bytes(rgb) * width for _ in range(height))
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

IMAGE = png()
(ROOT / 'sample.png').write_bytes(IMAGE)
(ROOT / 'sample.md').write_text('''---
title: Fixture
---
# 第一部分
正文一。

![示例图](sample.png)

| 指标 | 数值 |
|---|---|
| 速度 | 42% |

## 第二部分
正文二。
''', encoding='utf-8')

pptx_files = {
'[Content_Types].xml': '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/notesSlides/notesSlide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/><Override PartName="/ppt/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>''',
'_rels/.rels': '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>''',
'ppt/presentation.xml': '''<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>''',
'ppt/_rels/presentation.xml.rels': '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>''',
'ppt/slides/slide1.xml': '''<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="100" y="200"/><a:ext cx="300" cy="400"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>源文件导入</a:t></a:r></a:p><a:p><a:r><a:t>保留文本、图片与备注</a:t></a:r></a:p></p:txBody></p:sp><p:pic><p:nvPicPr><p:cNvPr id="3" name="Picture"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/></p:blipFill><p:spPr/></p:pic><p:graphicFrame><a:graphic><a:graphicData><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>指标</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>结果</a:t></a:r></a:p></a:txBody></a:tc></a:tr><a:tr><a:tc><a:txBody><a:p><a:r><a:t>页面</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>1</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>''',
'ppt/slides/_rels/slide1.xml.rels': '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>''',
'ppt/notesSlides/notesSlide1.xml': '''<?xml version="1.0" encoding="UTF-8"?><p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>这是演讲者备注。</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>''',
'ppt/charts/chart1.xml': '''<?xml version="1.0" encoding="UTF-8"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart><c:plotArea><c:barChart><c:ser><c:tx><c:v>系列一</c:v></c:tx><c:cat><c:strLit><c:pt><c:v>A</c:v></c:pt></c:strLit></c:cat><c:val><c:numLit><c:pt><c:v>10</c:v></c:pt></c:numLit></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>''',
'ppt/media/image1.png': IMAGE,
}
with zipfile.ZipFile(ROOT / 'sample.pptx', 'w', zipfile.ZIP_DEFLATED) as z:
    for name, content in pptx_files.items():
        z.writestr(name, content if isinstance(content, bytes) else content.encode('utf-8'))

docx_files = {
'[Content_Types].xml': '''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>''',
'_rels/.rels': '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>''',
'word/document.xml': '''<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>第一章</w:t></w:r></w:p><w:p><w:r><w:t>第一段正文。</w:t></w:r><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>项目</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>状态</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>导入</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>完成</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>第二章</w:t></w:r></w:p><w:p><w:r><w:t>第二段正文。</w:t></w:r></w:p></w:body></w:document>''',
'word/_rels/document.xml.rels': '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>''',
'word/media/image1.png': IMAGE,
}
with zipfile.ZipFile(ROOT / 'sample.docx', 'w', zipfile.ZIP_DEFLATED) as z:
    for name, content in docx_files.items():
        z.writestr(name, content if isinstance(content, bytes) else content.encode('utf-8'))

objects = []
def obj(value):
    objects.append(value.encode('latin-1'))
    return len(objects)
font = obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
stream_data = b'BT /F1 24 Tf 72 720 Td (Standardized PDF source) Tj ET'
content = obj(f'<< /Length {len(stream_data)} >>\nstream\n' + stream_data.decode('latin-1') + '\nendstream')
page = obj(f'<< /Type /Page /Parent 4 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font} 0 R >> >> /Contents {content} 0 R >>')
pages = obj(f'<< /Type /Pages /Kids [{page} 0 R] /Count 1 >>')
catalog = obj(f'<< /Type /Catalog /Pages {pages} 0 R >>')
output = bytearray(b'%PDF-1.4\n')
offsets = [0]
for index, value in enumerate(objects, 1):
    offsets.append(len(output))
    output.extend(f'{index} 0 obj\n'.encode())
    output.extend(value)
    output.extend(b'\nendobj\n')
xref = len(output)
output.extend(f'xref\n0 {len(objects)+1}\n'.encode())
output.extend(b'0000000000 65535 f \n')
for offset in offsets[1:]: output.extend(f'{offset:010d} 00000 n \n'.encode())
output.extend(f'trailer\n<< /Size {len(objects)+1} /Root {catalog} 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
(ROOT / 'sample.pdf').write_bytes(output)
print(ROOT)
