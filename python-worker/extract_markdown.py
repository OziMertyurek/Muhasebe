import argparse
import sys
from pathlib import Path

from markitdown import MarkItDown


def main() -> int:
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
        converter = MarkItDown()
        result = converter.convert(str(file_path))
        text = getattr(result, "text_content", None) or ""
        sys.stdout.write(text)
        return 0
    except Exception as exc:
        print(f"MarkItDown dönüştürme hatası: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
