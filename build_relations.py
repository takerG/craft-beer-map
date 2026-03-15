# -*- coding: utf-8 -*-
import json
import re
from collections import defaultdict

json_path = r"D:\\work\\craft-beer-map\\data.json"

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

styles = data.get("styles", [])

# Build name index
name_index = defaultdict(set)
for s in styles:
    code = s.get("code") or s.get("id")
    if not code:
        continue
    zh = (s.get("name_zh") or "").strip()
    en = (s.get("name_en") or "").strip()
    if len(zh) >= 2:
        name_index[zh].add(code)
    if len(en) >= 4:
        name_index[en.lower()].add(code)

# Sort names by length to prefer longest match
zh_names = sorted([n for n in name_index.keys() if re.search(r"[\u4e00-\u9fff]", n)], key=len, reverse=True)
en_names = sorted([n for n in name_index.keys() if not re.search(r"[\u4e00-\u9fff]", n)], key=len, reverse=True)

# Keyword heuristics
from_keywords = ["源自", "起源于", "起源於", "演变自", "演變自", "衍生自", "发展自", "發展自", "改编自", "改編自", "受", "启发", "啟發", "基于", "基於", "由"]
to_keywords = ["演变为", "演變為", "发展为", "發展為", "演化为", "演化為", "成为", "成為", "变成", "變成", "转变为", "轉變為"]
compare_keywords = ["相比", "比较", "對比", "对比", "类似", "相似", "如同", "像"]

sentence_split = re.compile(r"[。；;\n]")

# Match helpers

def find_codes_in_text(text):
    hits = set()
    lower = text.lower()
    # English names: word boundary match
    for name in en_names:
        if len(name) < 4:
            continue
        # Avoid very short tokens that are too generic
        if name in ["ipa", "ale", "lager", "stout", "porter"]:
            continue
        pattern = r"\b" + re.escape(name) + r"\b"
        if re.search(pattern, lower):
            hits.update(name_index[name])
    # Chinese names: substring match
    for name in zh_names:
        if len(name) < 2:
            continue
        if name in text:
            hits.update(name_index[name])
    return hits

relations = []
seen = set()

for s in styles:
    code = s.get("code") or s.get("id")
    if not code:
        continue
    details = s.get("details") or {}
    text = " ".join([
        details.get("history", ""),
        details.get("comparison", ""),
        details.get("comments", "")
    ])
    if not text.strip():
        continue
    sentences = [seg for seg in sentence_split.split(text) if seg.strip()]
    for seg in sentences:
        codes = find_codes_in_text(seg)
        if not codes:
            continue
        for target in codes:
            if target == code:
                continue
            rel_type = None
            if any(k in seg for k in to_keywords):
                rel_type = "influenced"
                source, target_code = code, target
            elif any(k in seg for k in from_keywords):
                rel_type = "influenced_by"
                source, target_code = code, target
            elif any(k in seg for k in compare_keywords):
                rel_type = "compared_to"
                source, target_code = code, target
            else:
                rel_type = "related"
                source, target_code = code, target

            key = (source, target_code, rel_type)
            if key in seen:
                continue
            seen.add(key)
            relations.append({
                "source": source,
                "target": target_code,
                "type": rel_type
            })

# Add a small curated external set (can grow later)
curated = [
    {"source": "13C", "target": "16A", "type": "influenced"},  # English Porter -> Sweet Stout
    {"source": "13C", "target": "15B", "type": "influenced"},  # English Porter -> Irish Stout
    {"source": "11A", "target": "12C", "type": "influenced"},  # Bitter/Pale Ale -> English IPA (approx)
    {"source": "11A", "target": "18B", "type": "influenced"},  # English Pale Ale -> American Pale Ale
    {"source": "11A", "target": "21A", "type": "influenced"}   # English Pale Ale -> American IPA
]
for rel in curated:
    key = (rel["source"], rel["target"], rel["type"])
    if key not in seen:
        relations.append(rel)
        seen.add(key)

# Attach relations
data["relations"] = relations

data["relations_meta"] = {
    "method": "heuristic_from_bjcp_text",
    "count": len(relations)
}

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("relations", len(relations))
