#!/usr/bin/env python3
"""Sanity check Y11S2 bulk update."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUGS = [
    "matticus_hq", "cunderthock", "rogue_amputee", "grandmaster_sandman",
    "slackandlack", "mjester1337", "mynameisblang", "lcew4ll0wcome",
]

def fp(m):
    if m.get("result") == "RB":
        return (m["date"], m["rp"], "RB")
    return (m["date"], m["rp"], m["score"])

errors = []
for slug in SLUGS:
    path = ROOT / "data" / slug / "Y11S2" / "current.md"
    text = path.read_text(encoding="utf-8")
    data = json.loads(re.search(r"```json\s*([\s\S]*?)```", text).group(1))
    m = data["matches"]
    meta = data["meta"]
    fps = [fp(x) for x in m]
    if len(fps) != len(set(fps)):
        errors.append(f"{slug}: duplicate fingerprints")
    if m[0]["rp"] != meta["rp"]:
        errors.append(f"{slug}: newest rp {m[0]['rp']} != meta {meta['rp']}")
    real = [x for x in m if x["result"] != "RB"]
    w = sum(1 for x in real if x["result"] == "W")
    l = sum(1 for x in real if x["result"] == "L")
    if meta["matches"] != len(real):
        errors.append(f"{slug}: meta.matches {meta['matches']} != real {len(real)}")
    if meta["w"] != w or meta["l"] != l:
        errors.append(f"{slug}: W/L mismatch meta {meta['w']}-{meta['l']} vs {w}-{l}")
    if len(data["comments"]) < 6:
        errors.append(f"{slug}: comments count {len(data['comments'])}")
    print(f"OK {slug}: {meta['rank']} {meta['rp']} {meta['w']}-{meta['l']} ({meta['matches']}g) newest={m[0]['date']} {m[0]['map']}")

if errors:
    print("\nERRORS:")
    for e in errors:
        print(" -", e)
    exit(1)
print("\nAll sanity checks passed.")
