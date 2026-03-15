import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor"
if str(VENDOR) not in sys.path:
    sys.path.insert(0, str(VENDOR))

from pypdf import PdfReader


def main() -> None:
    pdf_path = ROOT / "bjcp_2015_guidelines_cn.pdf"
    artifacts_dir = ROOT / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)
    output_path = artifacts_dir / "bjcp_2015_raw_text.txt"

    reader = PdfReader(str(pdf_path))
    chunks = []

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        chunks.append(f"===== PAGE {index} =====\n{text}\n")

    output_path.write_text("\n".join(chunks), encoding="utf-8")
    print(f"pages={len(reader.pages)}")
    print(f"output={output_path}")


if __name__ == "__main__":
    main()
