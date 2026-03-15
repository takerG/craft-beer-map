# -*- coding: utf-8 -*-
import json
import re
import sys
sys.path.insert(0, r"D:\\work\\craft-beer-map\\vendor")
from PyPDF2 import PdfReader

pdf_path = r"D:\\work\\craft-beer-map\\bjcp_2021_zh_trad.pdf"
reader = PdfReader(pdf_path)

page_indices = [3, 4]  # TOC pages
raw_lines = []
for i in page_indices:
    if i < len(reader.pages):
        text = reader.pages[i].extract_text() or ""
        raw_lines.extend(text.splitlines())

lines = []
for line in raw_lines:
    line = line.replace("（", "(").replace("）", ")")
    line = re.sub(r"\s+", " ", line).strip()
    if not line:
        continue
    line = re.sub(r"(\D)(\d{1,2}[A-Z])\.", r"\1\n\2.", line)
    line = re.sub(r"(\D)(\d{1,2})\.", r"\1\n\2.", line)
    for part in line.split("\n"):
        part = part.strip()
        if not part:
            continue
        part = re.sub(r"\s+\d+$", "", part).strip()
        if part:
            lines.append(part)

category_pattern = re.compile(r"^(\d{1,2})\.\s*(.+?)\s*\((.+?)\)")
style_pattern = re.compile(r"^(\d{1,2}[A-Z])\.\s*(.+?)\s*\((.+?)\)")
variant_pattern = re.compile(r"^([A-Za-z\u4e00-\u9fff].+?)\s*\((.+?)\)")

categories = []
styles = []
current_style_code = None
current_category = None

for line in lines:
    m_cat = category_pattern.match(line)
    if m_cat:
        cat_num = int(m_cat.group(1))
        if 1 <= cat_num <= 34:
            current_category = m_cat.group(1)
            if not any(c["id"] == current_category for c in categories):
                categories.append({
                    "id": current_category,
                    "name_zh": m_cat.group(2).strip(),
                    "name_en": m_cat.group(3).strip()
                })
            current_style_code = None
        continue

    m_style = style_pattern.match(line)
    if m_style:
        code = m_style.group(1)
        if not any(s["id"] == code for s in styles):
            styles.append({
                "id": code,
                "code": code,
                "name_zh": m_style.group(2).strip(),
                "name_en": m_style.group(3).strip(),
                "category": current_category,
                "type": "style"
            })
        current_style_code = code
        continue

    if current_style_code and variant_pattern.match(line):
        m_var = variant_pattern.match(line)
        name_zh = m_var.group(1).strip()
        name_en = m_var.group(2).strip()
        if len(name_en) < 40:
            var_id = f"{current_style_code}-{re.sub(r'[^a-z0-9]+', '-', name_en.lower()).strip('-')}"
            if not any(s["id"] == var_id for s in styles):
                styles.append({
                    "id": var_id,
                    "code": current_style_code,
                    "name_zh": name_zh,
                    "name_en": name_en,
                    "category": current_category,
                    "type": "variant",
                    "variant_of": current_style_code
                })

result = {
    "source": {
        "name": "BJCP 2021 Beer Style Guidelines (Traditional Chinese)",
        "url": "https://www.bjcp.org/beer-styles/"
    },
    "categories": categories,
    "styles": styles
}

out_path = r"D:\\work\\craft-beer-map\\bjcp_2021_zh_trad.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("categories", len(categories), "styles", len(styles))
