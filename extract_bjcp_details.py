# -*- coding: utf-8 -*-
import json
import re
import sys
sys.path.insert(0, r"D:\\work\\craft-beer-map\\vendor")
from PyPDF2 import PdfReader

pdf_path = r"D:\\work\\craft-beer-map\\bjcp_2021_zh.pdf"
reader = PdfReader(pdf_path)

texts = []
for page in reader.pages:
    texts.append(page.extract_text() or "")

text = "\n".join(texts)
text = text.replace("（", "(").replace("）", ")")
text = text.replace("：", ":")

compact = re.sub(r"\s+", "", text)

# limit match length to avoid spanning across paragraphs
style_re = re.compile(r"(\d{1,2}[A-Z])[、.．]([^()]{1,30})\(([^)]{1,60})\)")

occurrences = []
for m in style_re.finditer(compact):
    occurrences.append({
        "code": m.group(1),
        "name_zh": m.group(2),
        "name_en": m.group(3),
        "start": m.start(),
        "end": m.end()
    })

field_order = [
    "整体印象",
    "总体印象",
    "香气",
    "外观",
    "风味",
    "口感",
    "注释",
    "历史",
    "特色成分",
    "风格对比",
    "关键数据",
    "商业案例",
    "标签"
]

field_re = re.compile(r"(" + "|".join(field_order) + r"):")

selected = {}
for occ in occurrences:
    start = occ["end"]
    # require headings very soon after the heading (style sections start with overall impression)
    near = compact[start:start + 200]
    if not ("整体印象:" in near or "总体印象:" in near):
        continue
    window = compact[start:start + 6000]
    hits = field_re.findall(window)
    score = len(set(hits))
    if score == 0:
        continue
    prev = selected.get(occ["code"])
    if not prev or score > prev["score"]:
        occ["score"] = score
        selected[occ["code"]] = occ

chosen = list(selected.values())
chosen.sort(key=lambda x: x["start"])

field_labels = {
    "overall_impression": "整体印象",
    "overall_impression_alt": "总体印象",
    "aroma": "香气",
    "appearance": "外观",
    "flavor": "风味",
    "mouthfeel": "口感",
    "comments": "注释",
    "history": "历史",
    "ingredients": "特色成分",
    "comparison": "风格对比",
    "vital_statistics": "关键数据",
    "commercial_examples": "商业案例",
    "tags": "标签"
}

stop_markers = [
    "附录",
    "附錄",
    "附表",
    "备用分类",
    "替代分类",
    "其他分类"
]

camel = re.compile(r"(?<=[a-z])(?=[A-Z])")

def fix_en(name: str) -> str:
    if " " in name:
        return name
    return camel.sub(" ", name)

extracted = {}
for idx, s in enumerate(chosen):
    start = s["end"]
    end = chosen[idx + 1]["start"] if idx + 1 < len(chosen) else len(compact)
    section = compact[start:end]

    stop_pos = None
    for marker in stop_markers:
        pos = section.find(marker)
        if pos != -1:
            stop_pos = pos if stop_pos is None else min(stop_pos, pos)
    if stop_pos is not None:
        section = section[:stop_pos]

    parts = []
    last = 0
    for m in field_re.finditer(section):
        if m.start() > last:
            parts.append((None, section[last:m.start()]))
        parts.append((m.group(1), None))
        last = m.end()
    if last < len(section):
        parts.append((None, section[last:]))

    fields = {}
    current_key = None
    buffer = []
    for label, chunk in parts:
        if label is not None:
            if current_key and buffer:
                fields[current_key] = "".join(buffer)
            current_key = label
            buffer = []
        else:
            if chunk:
                buffer.append(chunk)
    if current_key and buffer:
        fields[current_key] = "".join(buffer)

    detail = {}
    for key, label in field_labels.items():
        if label in fields:
            detail[key] = fields[label]
    if "overall_impression" not in detail and "overall_impression_alt" in detail:
        detail["overall_impression"] = detail.pop("overall_impression_alt")
    elif "overall_impression_alt" in detail:
        detail.pop("overall_impression_alt")

    extracted[s["code"]] = {
        "code": s["code"],
        "name_zh": s["name_zh"],
        "name_en": fix_en(s["name_en"]),
        "details": detail
    }

json_path = r"D:\\work\\craft-beer-map\\data.json"
with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

styles_list = data.get("styles", [])
style_map = {s.get("code", s.get("id")): s for s in styles_list}

for code, item in extracted.items():
    if code in style_map:
        style_map[code]["name_zh"] = style_map[code].get("name_zh") or item["name_zh"]
        style_map[code]["name_en"] = style_map[code].get("name_en") or item["name_en"]
        if item.get("details"):
            style_map[code]["details"] = item["details"]
    else:
        styles_list.append({
            "id": code,
            "code": code,
            "name_zh": item["name_zh"],
            "name_en": item["name_en"],
            "category": None,
            "type": "style",
            "details": item.get("details", {})
        })

unique_styles = {}
for s in styles_list:
    key = s.get("code", s.get("id"))
    if key not in unique_styles:
        unique_styles[key] = s

data["styles"] = list(unique_styles.values())

data["source"] = {
    "name": "BJCP 2021 Beer Style Guidelines (Chinese)",
    "file": pdf_path
}

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(r"D:\\work\\craft-beer-map\\extraction_stats.txt", "w", encoding="utf-8") as f:
    f.write(f"styles_found: {len(extracted)}\n")
    f.write("with_details: " + str(sum(1 for v in extracted.values() if v.get('details'))))

print("styles_found", len(extracted))
