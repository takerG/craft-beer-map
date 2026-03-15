import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_TEXT_PATH = ROOT / "artifacts" / "bjcp_2015_raw_text.txt"
OUTPUT_PATH = ROOT / "artifacts" / "bjcp_2015_parsed.json"

CATEGORY_HEADING_RE = re.compile(r"^(?P<code>\d{1,2})\.\s*[A-Z]")
HISTORICAL_STYLE_RE = re.compile(r"^(?P<name_en>[A-Za-z][^()（）]{1,120}?)[(（](?P<name_zh>[^()（）]+)[)）]\s*$")

FIELD_MAP = {
    "总体印象": "overall_impression",
    "香气": "aroma",
    "外观": "appearance",
    "味道": "flavor",
    "口感": "mouthfeel",
    "注释": "comments",
    "历史": "history",
    "典型原料": "ingredients",
    "风格对比": "comparison",
    "重要参数": "stats",
    "商业例子": "commercial_examples",
    "常见酒款": "commercial_examples",
    "标签": "tags",
}

FIELD_RE = re.compile(
    r"(总体印象|香气|外观|味道|口感|注释|历史|典型原料|风格对比|重要参数|商业例子|常见酒款|标签)\s*[：:]"
)


def load_lines() -> list[str]:
    text = RAW_TEXT_PATH.read_text(encoding="utf-8")
    merged: list[str] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("===== PAGE "):
            continue
        if line.startswith("BJCP"):
            continue

        if merged:
            prev = merged[-1]
            if re.match(r"^\d{1,2}[A-Z]\.", prev) and ")" not in prev and "）" not in prev:
                merged[-1] = f"{prev} {line}"
                continue

        merged.append(line)

    return merged


def clean_value(value: str) -> str:
    value = value.replace("", " ").replace("\u3000", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip(" ：: ")


def parse_style_heading(line: str):
    code_match = re.match(r"^(?P<code>\d{1,2}[A-Z])\.\s*(?P<body>.+)$", line)
    if not code_match:
        return None

    body = code_match.group("body").strip()
    heading_match = re.match(
        r"^(?P<prefix>.*?)[(（](?P<name_zh>[^()（）]+)[)）](?P<suffix>.*)$",
        body,
    )
    if not heading_match:
        return None

    zh = clean_value(heading_match.group("name_zh") or "")
    name_en = clean_value(f"{heading_match.group('prefix')} {heading_match.group('suffix')}")
    if not zh or not name_en:
        return None

    return {
        "code": code_match.group("code"),
        "name_en": name_en,
        "name_zh": zh,
    }


def extract_fields(block_lines: list[str]) -> dict[str, str]:
    block = "\n".join(block_lines)
    matches = list(FIELD_RE.finditer(block))
    details: dict[str, str] = {}

    for index, match in enumerate(matches):
        label = match.group(1)
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(block)
        value = clean_value(block[start:end])
        if value:
            details[FIELD_MAP[label]] = value

    return details


def next_block_end(lines: list[str], start: int) -> int:
    next_index = start
    while next_index < len(lines):
        next_line = lines[next_index]
        if parse_style_heading(next_line) or CATEGORY_HEADING_RE.match(next_line):
            break
        if HISTORICAL_STYLE_RE.match(next_line) and "总体印象" in "\n".join(lines[next_index + 1 : next_index + 12]):
            break
        next_index += 1
    return next_index


def main() -> None:
    lines = load_lines()
    styles = []
    current_category: str | None = None
    historical_index = 0

    index = 0
    while index < len(lines):
        line = lines[index]

        category_match = CATEGORY_HEADING_RE.match(line)
        if category_match and not parse_style_heading(line):
            current_category = category_match.group("code")

        style_heading = parse_style_heading(line)
        if style_heading:
            lookahead = "\n".join(lines[index + 1 : index + 12])
            if "总体印象" not in lookahead:
                index += 1
                continue

            next_index = next_block_end(lines, index + 1)
            category_fallback = re.match(r"^(\d{1,2})", style_heading["code"])
            styles.append(
                {
                    "id": style_heading["code"],
                    "code": style_heading["code"],
                    "category": current_category or (category_fallback.group(1) if category_fallback else ""),
                    "name_en": style_heading["name_en"],
                    "name_zh": style_heading["name_zh"],
                    "details": extract_fields(lines[index + 1 : next_index]),
                }
            )
            index = next_index
            continue

        historical_match = HISTORICAL_STYLE_RE.match(line)
        if historical_match and current_category == "27":
            lookahead = "\n".join(lines[index + 1 : index + 12])
            if "总体印象" in lookahead:
                historical_index += 1
                next_index = next_block_end(lines, index + 1)
                styles.append(
                    {
                        "id": f"27-{historical_index}",
                        "code": f"27-{historical_index}",
                        "category": "27",
                        "source_code": None,
                        "name_en": clean_value(historical_match.group("name_en")),
                        "name_zh": clean_value(historical_match.group("name_zh") or ""),
                        "details": extract_fields(lines[index + 1 : next_index]),
                    }
                )
                index = next_index
                continue

        index += 1

    output = {
        "style_count": len(styles),
        "styles": styles,
        "style_codes": [style["code"] for style in styles],
    }
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"styles={len(styles)}")
    print(f"output={OUTPUT_PATH}")


if __name__ == "__main__":
    main()
