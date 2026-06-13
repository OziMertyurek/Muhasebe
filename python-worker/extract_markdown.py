import argparse
import sys
from pathlib import Path

from markdownify import markdownify as markdownify_html
from markitdown import MarkItDown

HTML_EXTENSIONS = {".html", ".htm"}


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(
        description="Convert a local invoice file to Markdown text with MarkItDown."
    )
    parser.add_argument("file_path", help="Path to the file that will be converted.")
    args = parser.parse_args()

    file_path = Path(args.file_path).expanduser().resolve()

    if not file_path.exists() or not file_path.is_file():
        print("Dosya bulunamadı veya okunabilir bir dosya değil.", file=sys.stderr)
        return 1

    try:
        if file_path.suffix.lower() in HTML_EXTENSIONS:
            text = convert_html_file(file_path)
            if text.strip():
                sys.stdout.write(text)
                return 0

        converter = MarkItDown()
        result = converter.convert(str(file_path))
        text = getattr(result, "text_content", None) or ""
        sys.stdout.write(text)
        return 0
    except Exception as exc:
        print(f"MarkItDown dönüştürme hatası: {exc}", file=sys.stderr)
        return 1


def convert_html_file(file_path: Path) -> str:
    try:
        html = file_path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        html = file_path.read_text(encoding="cp1254")

    return markdownify_html(html, heading_style="ATX")


if __name__ == "__main__":
    raise SystemExit(main())
