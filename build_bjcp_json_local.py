# -*- coding: utf-8 -*-
import json
import re
import sys
sys.path.insert(0, r"D:\\work\\craft-beer-map\\vendor")
from PyPDF2 import PdfReader

pdf_path = r"D:\\work\\craft-beer-map\\bjcp_2021_zh.pdf"
reader = PdfReader(pdf_path)

page_indices = list(range(1, 8))
texts = []
for i in page_indices:
    if i < len(reader.pages):
        texts.append(reader.pages[i].extract_text() or "")

text = "\n".join(texts)
text = text.replace("（", "(").replace("）", ")")
text = re.sub(r"\s+", "", text)

cat_re = re.compile(r"(\d{1,2})(?![A-Z])[、.．]([^()]+)\(([^)]+)\)")
style_re = re.compile(r"(\d{1,2}[A-Z])[、.．]([^()]+)\(([^)]+)\)")

cats = []
for m in cat_re.finditer(text):
    cat_num = int(m.group(1))
    if 1 <= cat_num <= 34:
        cats.append({
            "id": m.group(1),
            "name_zh": m.group(2),
            "name_en": m.group(3),
            "pos": m.start()
        })

styles = []
for m in style_re.finditer(text):
    styles.append({
        "code": m.group(1),
        "name_zh": m.group(2),
        "name_en": m.group(3),
        "pos": m.start()
    })

# de-duplicate categories by id, keep first occurrence
cat_map = {}
cat_list = []
for c in cats:
    if c["id"] in cat_map:
        continue
    cat_map[c["id"]] = c
    cat_list.append(c)

# assign category to styles based on nearest preceding category position
cat_list_sorted = sorted(cat_list, key=lambda x: x["pos"])

for s in styles:
    cat_id = None
    for c in cat_list_sorted:
        if c["pos"] <= s["pos"]:
            cat_id = c["id"]
        else:
            break
    s["category"] = cat_id

# de-duplicate styles by code
seen = {}
clean_styles = []
for s in styles:
    if s["code"] in seen:
        continue
    seen[s["code"]] = True
    clean_styles.append({
        "id": s["code"],
        "code": s["code"],
        "name_zh": s["name_zh"],
        "name_en": s["name_en"],
        "category": s["category"],
        "type": "style"
    })

camel = re.compile(r"(?<=[a-z])(?=[A-Z])")

def fix_en(name: str) -> str:
    if " " in name:
        return name
    name = camel.sub(" ", name)
    return name

for c in cat_list:
    c["name_en"] = fix_en(c["name_en"])
for s in clean_styles:
    s["name_en"] = fix_en(s["name_en"])

result = {
    "source": {
        "name": "BJCP 2021 Beer Style Guidelines (Chinese)",
        "file": pdf_path
    },
    "categories": [{"id": c["id"], "name_zh": c["name_zh"], "name_en": c["name_en"]} for c in cat_list],
    "styles": clean_styles
}

out_path = r"D:\\work\\craft-beer-map\\bjcp_2021_zh.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("categories", len(cat_list), "styles", len(clean_styles))
