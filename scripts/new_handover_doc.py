#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HANDOVER_DIR = ROOT / "handover_docs"
TEMPLATE_MD = HANDOVER_DIR / ".templates" / "handover_markdown_template.md"


def slugify(text: str) -> str:
    # Keep alnum, underscore. Replace spaces and hyphens with underscore.
    text = text.strip().replace(" ", "_").replace("-", "_")
    text = re.sub(r"[^A-Za-z0-9_]+", "", text)
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a new handover markdown document from template.")
    parser.add_argument("--project", required=True, help="Project name (e.g., Centra)")
    parser.add_argument("--topic", required=True, help="Topic (e.g., DBSetup)")
    parser.add_argument("--title", help="Human-readable title (defaults to '<Project> <Topic>')")
    parser.add_argument("--category", choices=["setup", "operations", "troubleshooting", "handover"], default="handover")
    parser.add_argument("--tags", default="", help="Comma-separated tags (e.g., setup,urgent)")
    parser.add_argument("--author", default=os.environ.get("GIT_AUTHOR_NAME") or os.environ.get("GIT_COMMITTER_NAME") or "Unknown")
    parser.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"))
    args = parser.parse_args()

    HANDOVER_DIR.mkdir(parents=True, exist_ok=True)
    (HANDOVER_DIR / ".templates").mkdir(parents=True, exist_ok=True)

    if not TEMPLATE_MD.exists():
        print(f"Template not found: {TEMPLATE_MD}")
        return 2

    project = slugify(args.project)
    topic = slugify(args.topic)
    date = args.date
    title = args.title or f"{args.project} {args.topic}"
    tags_csv = ",".join([t.strip() for t in args.tags.split(",") if t.strip()])
    tags_hashtags = " ".join([f"#{t}" for t in tags_csv.split(",") if t])

    filename = f"{date}_{project}_{topic}.md"
    out_path = HANDOVER_DIR / filename
    if out_path.exists():
        print(f"Already exists: {out_path}")
        return 1

    tpl = TEMPLATE_MD.read_text(encoding="utf-8")
    body = (
        tpl.replace("{{TITLE}}", title)
        .replace("{{AUTHOR}}", args.author)
        .replace("{{DATE}}", date)
        .replace("{{PROJECT}}", args.project)
        .replace("{{CATEGORY}}", args.category)
        .replace("{{TAGS}}", tags_csv)
        .replace("{{TAG_HASHTAGS}}", tags_hashtags)
    )

    out_path.write_text(body, encoding="utf-8")
    print(f"Created: {out_path}")
    print("Tip: python scripts/update_handover_index.py  # to refresh README index")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

