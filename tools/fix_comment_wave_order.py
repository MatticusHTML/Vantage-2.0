#!/usr/bin/env python3
"""Reorder comment waves oldest-first so vantage.js shows the latest wave on page."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WAVE = 6
UPDATED = "Jun 29, 2026 · morning PT"

SLUGS = [
    "matticus_hq", "cunderthock", "rogue_amputee", "grandmaster_sandman",
    "slackandlack", "mjester1337", "mynameisblang", "lcew4ll0wcome",
]


def parse_md_date(s):
    """'Jun 28' -> sortable (month, day). Assumes Y11S2 = Jun 2026."""
    if not s:
        return (0, 0)
    m = re.match(r"([A-Za-z]{3})\s+(\d{1,2})", s.strip())
    if not m:
        return (0, 0)
    months = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
        "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
    }
    return (months.get(m.group(1), 0), int(m.group(2)))


def wave_sort_key(wave):
    for c in wave:
        if c.get("type") == "map" and c.get("date"):
            return parse_md_date(c["date"])
    for c in wave:
        if c.get("date"):
            return parse_md_date(c["date"])
    return (99, 99)


def split_waves(comments):
    return [comments[i : i + WAVE] for i in range(0, len(comments), WAVE)]


def reorder_comments(comments):
    waves = split_waves(comments)
    if len(waves) <= 1:
        return comments, False
    sorted_waves = sorted(waves, key=wave_sort_key)
    if sorted_waves == waves:
        return comments, False
    return [c for w in sorted_waves for c in w], True


def fix_file(path, label):
    text = path.read_text(encoding="utf-8")
    m = re.search(r"```json\s*([\s\S]*?)```", text)
    data = json.loads(m.group(1))
    comments = data.get("comments", [])
    if not comments:
        print(f"  {label}: no comments")
        return
    new_comments, changed = reorder_comments(comments)
    if not changed:
        waves = split_waves(comments)
        latest = waves[-1][0] if waves else {}
        print(f"  {label}: already OK — live wave {latest.get('date')} {latest.get('subject')}")
        return
    data["comments"] = new_comments
    data["updated"] = UPDATED
    header = text.split("```json")[0]
    header = re.sub(r"\*\*Updated:\*\*.*", f"**Updated:** {UPDATED}", header)
    body = json.dumps(data, indent=4, ensure_ascii=False)
    path.write_text(f"{header}```json\n{body}\n```\n", encoding="utf-8")
    waves = split_waves(new_comments)
    live = waves[-1]
    print(f"  {label}: fixed — live wave now {live[0].get('date')} {live[0].get('subject')} ({len(waves)} waves total)")


def main():
    print("Fixing comment wave order (oldest first in JSON, latest renders on site)...\n")
    for slug in SLUGS:
        fix_file(ROOT / "data" / slug / "Y11S2" / "current.md", slug)
    fix_file(ROOT / "data" / "oversight" / "Y11S2" / "current.md", "oversight")
    print("\nDone.")


if __name__ == "__main__":
    main()
