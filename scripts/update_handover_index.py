#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).resolve().parent.parent
HANDOVER_DIR = ROOT / "handover_docs"
README_PATH = HANDOVER_DIR / "README.md"
START_MARK = "<!-- AUTO-GENERATED: DO NOT EDIT BELOW -->"
END_MARK = "<!-- AUTO-GENERATED: END -->"


@dataclass
class DocMeta:
    path: Path
    title: str
    date: Optional[datetime]
    tags: List[str] = field(default_factory=list)
    project: Optional[str] = None
    category: Optional[str] = None

    @property
    def rel_link(self) -> str:
        # README is inside handover_docs, so use relative path from it
        return f"./{self.path.name}"

    @property
    def date_str(self) -> str:
        return self.date.strftime("%Y-%m-%d") if self.date else ""


def parse_front_matter(text: str) -> Dict[str, str]:
    front: Dict[str, str] = {}
    if not text.startswith("---\n"):
        return front
    try:
        end = text.index("\n---\n", 4)
    except ValueError:
        return front
    block = text[4:end]
    for line in block.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.strip().lower()
        val = val.strip()
        # Normalize list-like values [a, b]
        if key == "tags":
            val = val.strip()
            if val.startswith("[") and val.endswith("]"):
                inside = val[1:-1]
                items = [x.strip() for x in inside.split(",") if x.strip()]
                front[key] = ",".join(items)
            else:
                front[key] = val
        else:
            front[key] = val
    return front


HEADING_RE = re.compile(r"^#\s+(.*)")
DATE_IN_NAME = re.compile(r"^(\d{4}-\d{2}-\d{2})_")
HASHTAG_RE = re.compile(r"(?<!\w)#([A-Za-z0-9_-]{2,})")


def extract_meta_md(path: Path) -> DocMeta:
    text = path.read_text(encoding="utf-8", errors="ignore")
    fm = parse_front_matter(text)

    # Title
    title = fm.get("title")
    if not title:
        for line in text.splitlines()[:100]:
            m = HEADING_RE.match(line)
            if m:
                title = m.group(1).strip()
                break
    if not title:
        title = path.stem

    # Date
    date_str = fm.get("date")
    date_obj: Optional[datetime] = None
    if date_str:
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M"):
            try:
                date_obj = datetime.strptime(date_str, fmt)
                break
            except Exception:
                pass
    if not date_obj:
        m = DATE_IN_NAME.match(path.name)
        if m:
            try:
                date_obj = datetime.strptime(m.group(1), "%Y-%m-%d")
            except Exception:
                date_obj = None

    # Tags from front matter and hashtags in first 200 lines
    tags: List[str] = []
    if fm.get("tags"):
        tags += [t.strip().lower() for t in fm["tags"].split(",") if t.strip()]
    head = "\n".join(text.splitlines()[:200])
    for m in HASHTAG_RE.finditer(head):
        tag = m.group(1).lower()
        # Heuristic: skip heading markers like '# Title'
        # If the match is at start of line and the next char is space, it's likely a heading, not a tag.
        start = m.start()
        line_start = head.rfind("\n", 0, start) + 1
        if start == line_start and head[start:start+2] == "# ":
            continue
        tags.append(tag)
    # Dedupe while preserving order
    seen = set()
    tags_unique: List[str] = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            tags_unique.append(t)

    category = fm.get("category")
    project = fm.get("project")

    return DocMeta(path=path, title=title, date=date_obj, tags=tags_unique, project=project, category=category)


def load_docs() -> List[DocMeta]:
    if not HANDOVER_DIR.exists():
        return []
    docs: List[DocMeta] = []
    for p in HANDOVER_DIR.glob("*.md"):
        if p.name == "README.md":
            continue
        docs.append(extract_meta_md(p))
    # Sort: date desc, then title
    def sort_key(d: DocMeta):
        # None dates go last
        ts = d.date.timestamp() if d.date else 0
        return (-ts, d.title.lower())

    docs.sort(key=sort_key)
    return docs


def build_index_section(docs: List[DocMeta]) -> str:
    lines: List[str] = []
    if not docs:
        lines.append("現在登録されているドキュメントはありません。")
        return "\n" + "\n".join(lines) + "\n"

    lines.append("### 一覧")
    for d in docs:
        tags = ", ".join(d.tags) if d.tags else "-"
        date = d.date_str or ""
        lines.append(f"- {date} — [{d.title}]({d.rel_link}) — tags: {tags}")

    # Tag index
    tagmap: Dict[str, List[DocMeta]] = {}
    for d in docs:
        for t in d.tags:
            tagmap.setdefault(t, []).append(d)
    if tagmap:
        lines.append("")
        lines.append("### タグ別インデックス")
        for tag in sorted(tagmap.keys()):
            lines.append(f"- #{tag}")
            for d in tagmap[tag]:
                date = d.date_str or ""
                lines.append(f"  - {date} — [{d.title}]({d.rel_link})")

    return "\n" + "\n".join(lines) + "\n"


def replace_autogen(readme_text: str, new_section: str) -> str:
    if START_MARK in readme_text and END_MARK in readme_text:
        pre, rest = readme_text.split(START_MARK, 1)
        _, post = rest.split(END_MARK, 1)
        return pre + START_MARK + new_section + END_MARK + post
    else:
        # Append at the end if markers missing
        return readme_text.rstrip() + "\n\n" + START_MARK + new_section + END_MARK + "\n"


def main() -> int:
    if not HANDOVER_DIR.exists():
        print(f"Not found: {HANDOVER_DIR}", file=sys.stderr)
        return 1
    docs = load_docs()
    new_section = build_index_section(docs)
    if not README_PATH.exists():
        print(f"Not found: {README_PATH}", file=sys.stderr)
        return 2
    readme_text = README_PATH.read_text(encoding="utf-8")
    updated = replace_autogen(readme_text, new_section)
    if updated != readme_text:
        README_PATH.write_text(updated, encoding="utf-8")
        print(f"Updated index with {len(docs)} documents.")
    else:
        print("Index unchanged.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

