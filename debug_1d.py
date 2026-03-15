# -*- coding: utf-8 -*-
import re
import sys
sys.path.insert(0, r"D:\\work\\craft-beer-map\\vendor")
from PyPDF2 import PdfReader

pdf_path = r"D:\\work\\craft-beer-map\\bjcp_2021_zh.pdf"
reader = PdfReader(pdf_path)

raw_lines = []
for page in reader.pages:
    text = page.extract_text() or ""
    raw_lines.extend(text.splitlines())

stitched = []
buf = ""
for line in raw_lines:
    line = re.sub(r"\s+", "", line)
    if not line:
        continue
    if buf:
        buf += line
    else:
        buf = line
    if ")" in buf:
        stitched.append(buf)
        buf = ""
if buf:
    stitched.append(buf)

expanded = []
for line in stitched:
    line = line.replace("（", "(").replace("）", ")")
    line = re.sub(r"\)(\d{1,2}[A-Z])", r")\n\1", line)
    line = re.sub(r"\)(\d{1,2})", r")\n\1", line)
    for part in line.split("\n"):
        part = part.strip()
        if part:
            expanded.append(part)

hits = [l for l in expanded if l.startswith("1D") or "1D" in l]

with open(r"D:\\work\\craft-beer-map\\debug_1d.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(hits))

print('hits', len(hits))
