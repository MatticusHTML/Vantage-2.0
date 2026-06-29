#!/usr/bin/env python3
"""Y11S2 squad bulk update — Jun 25–28 ingest. Data + meta + operators + badges."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPDATED = "Jun 28, 2026 · evening PT"

SIDE = {
    "Nomad": "ATK", "Jackal": "ATK", "Dokkaebi": "ATK", "Lion": "ATK", "Gridlock": "ATK",
    "Ace": "ATK", "Brava": "ATK", "Fuze": "ATK", "Ying": "ATK", "Hibana": "ATK",
    "Ram": "ATK", "Thatcher": "ATK", "Blackbeard": "ATK", "Thermite": "ATK", "Sledge": "ATK",
    "Iana": "ATK", "Sens": "ATK", "Deimos": "ATK", "Finka": "ATK", "Glaz": "ATK",
    "Flores": "ATK", "IQ": "ATK", "Kali": "ATK", "Amaru": "ATK", "Blitz": "ATK",
    "Osa": "ATK", "Grim": "ATK", "Ash": "ATK", "Zofia": "ATK", "Capitão": "ATK",
    "Mute": "DEF", "Kaid": "DEF", "Thorn": "DEF", "Smoke": "DEF", "Kapkan": "DEF",
    "Alibi": "DEF", "Valkyrie": "DEF", "Pulse": "DEF", "Goyo": "DEF", "Lesion": "DEF",
    "Clash": "DEF", "Solis": "DEF", "Jäger": "DEF", "Echo": "DEF", "Montagne": "DEF",
    "Rook": "DEF", "Caveira": "DEF", "Azami": "DEF", "Mozzie": "DEF", "Melusi": "DEF",
    "Fenrir": "DEF", "Aruni": "DEF", "Denari": "DEF", "Bandit": "DEF", "Twitch": "DEF",
    "Sentry": "DEF", "Thunderbird": "DEF", "Striker": "DEF", "Doc": "DEF", "Castle": "DEF",
    "Warden": "DEF", "Maestro": "DEF", "Tubarão": "DEF", "Frost": "DEF", "Rauora": "DEF",
    "Tachanka": "DEF", "Zero": "ATK", "Solid Snake": "ATK", "Skopós": "DEF",
}


def op_side(name):
    return SIDE.get(name, "ATK")


def fingerprint(m):
    if m.get("result") == "RB" or m.get("map") == "RP Rollback":
        return (m["date"], m["rp"], "RP Rollback")
    return (m["date"], m["rp"], m["score"])


def parse_op(rows):
    out = []
    for r in rows:
        name = r[0]
        if "Skop" in name:
            name = "Skopós"
        out.append({
            "name": name, "side": op_side(name),
            "rounds": r[1], "winPct": r[2], "kd": r[3], "hs": r[4],
            "w": r[5], "l": r[6], "k": r[7], "d": r[8], "a": r[9],
            "aces": r[10], "tks": r[11],
        })
    return out


def rebuild_badges(matches):
    c = Counter()
    for m in matches:
        for b in m.get("badges", []):
            c[b] += 1
    return [{"name": k, "count": v} for k, v in sorted(c.items(), key=lambda x: (-x[1], x[0]))]


def compute_meta(matches, rank, rp, peak_rp, next_rank, rp_to_next):
    real = [m for m in matches if m.get("result") != "RB"]
    w = sum(1 for m in real if m["result"] == "W")
    l = sum(1 for m in real if m["result"] == "L")
    k = sum(m["k"] for m in real)
    d = sum(m["d"] for m in real)
    hs_w = sum(m["hs"] * m["k"] for m in real)
    net = sum(m.get("drp", 0) for m in matches)
    max_rp = max((m["rp"] for m in matches), default=rp)
    return {
        "rank": rank, "rp": rp,
        "peakRp": max(peak_rp, max_rp, rp),
        "nextRank": next_rank, "rpToNext": rp_to_next,
        "matches": len(real), "w": w, "l": l,
        "winRate": round(100 * w / (w + l), 1) if w + l else 0,
        "kd": round(k / d, 2) if d else k,
        "avgHs": round(hs_w / k, 1) if k else 0,
        "netRp": net,
    }


def merge_matches(existing, new_rows):
    fps = {fingerprint(m) for m in existing}
    prepend = []
    for m in new_rows:
        if fingerprint(m) not in fps:
            prepend.append(m)
            fps.add(fingerprint(m))
    return prepend + existing


def read_json_md(path):
    text = path.read_text(encoding="utf-8")
    m = re.search(r"```json\s*([\s\S]*?)```", text)
    return json.loads(m.group(1)), text.split("```json")[0]


def write_json_md(path, header, data):
    body = json.dumps(data, indent=4, ensure_ascii=False)
    path.write_text(f"{header}```json\n{body}\n```\n", encoding="utf-8")


# --- NEW MATCHES (newest first) ---

MATTICUS_NEW = [
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "2:4", "rp": 2149, "drp": -26, "k": 6, "d": 4, "a": 2, "hs": 66.7, "badges": ["4K", "1v3 Lost"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "1:4", "rp": 2175, "drp": -25, "k": 0, "d": 4, "a": 2, "hs": 0.0, "badges": []},
    {"date": "Jun 26", "map": "Consulate", "result": "L", "score": "2:4", "rp": 2200, "drp": -2, "k": 5, "d": 6, "a": 1, "hs": 60.0, "badges": ["Victim", "2K"]},
    {"date": "Jun 26", "map": "Lair", "result": "W", "score": "4:1", "rp": 2202, "drp": 23, "k": 4, "d": 5, "a": 3, "hs": 75.0, "badges": ["Victim"]},
    {"date": "Jun 26", "map": "Oregon", "result": "W", "score": "4:0", "rp": 2179, "drp": 25, "k": 3, "d": 1, "a": 1, "hs": 66.7, "badges": ["2K"]},
    {"date": "Jun 25", "map": "Clubhouse", "result": "W", "score": "4:2", "rp": 2154, "drp": 24, "k": 2, "d": 5, "a": 2, "hs": 0.0, "badges": []},
    {"date": "Jun 25", "map": "Outback", "result": "L", "score": "2:4", "rp": 2130, "drp": -26, "k": 5, "d": 5, "a": 1, "hs": 40.0, "badges": ["3K", "1v1 Lost"]},
    {"date": "Jun 25", "map": "Bank", "result": "L", "score": "2:4", "rp": 2156, "drp": -25, "k": 5, "d": 4, "a": 0, "hs": 20.0, "badges": []},
]

CUNDER_NEW = [
    {"date": "Jun 28", "map": "Chalet", "result": "W", "score": "4:0", "rp": 2568, "drp": 25, "k": 6, "d": 1, "a": 1, "hs": 50.0, "badges": ["4K", "2K"]},
    {"date": "Jun 28", "map": "Consulate", "result": "W", "score": "4:2", "rp": 2543, "drp": 23, "k": 5, "d": 4, "a": 0, "hs": 40.0, "badges": ["2K", "1v3 Lost"]},
    {"date": "Jun 28", "map": "Oregon", "result": "L", "score": "4:5", "rp": 2520, "drp": -25, "k": 5, "d": 7, "a": 1, "hs": 0.0, "badges": ["1v1 Clutch", "3K"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "2:4", "rp": 2545, "drp": -28, "k": 2, "d": 6, "a": 1, "hs": 50.0, "badges": ["Victim"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "1:4", "rp": 2573, "drp": -27, "k": 2, "d": 4, "a": 1, "hs": 100.0, "badges": ["2K", "1v3 Lost", "1v3 Lost"]},
    {"date": "Jun 26", "map": "Consulate", "result": "L", "score": "2:4", "rp": 2600, "drp": -11, "k": 2, "d": 6, "a": 1, "hs": 50.0, "badges": ["1v1 Lost", "Victim"]},
    {"date": "Jun 26", "map": "Lair", "result": "W", "score": "4:1", "rp": 2611, "drp": 21, "k": 5, "d": 3, "a": 2, "hs": 60.0, "badges": ["3K"]},
    {"date": "Jun 26", "map": "Oregon", "result": "W", "score": "4:0", "rp": 2590, "drp": 23, "k": 2, "d": 2, "a": 0, "hs": 0.0, "badges": ["2K"]},
    {"date": "Jun 24", "map": "Consulate", "result": "W", "score": "4:2", "rp": 2567, "drp": 21, "k": 2, "d": 5, "a": 3, "hs": 100.0, "badges": []},
    {"date": "Jun 24", "map": "Oregon", "result": "W", "score": "5:3", "rp": 2546, "drp": 23, "k": 8, "d": 5, "a": 0, "hs": 50.0, "badges": ["3K", "2K", "2K", "1v3 Lost"]},
    {"date": "Jun 24", "map": "Emerald Plains", "result": "L", "score": "3:5", "rp": 2523, "drp": -25, "k": 8, "d": 5, "a": 0, "hs": 37.5, "badges": ["3K", "2K"]},
]

ROGUE_NEW = [
    {"date": "Jun 28", "map": "Consulate", "result": "W", "score": "4:2", "rp": 1856, "drp": 27, "k": 1, "d": 3, "a": 2, "hs": 0.0, "badges": []},
    {"date": "Jun 28", "map": "Oregon", "result": "L", "score": "4:5", "rp": 1829, "drp": -22, "k": 4, "d": 7, "a": 2, "hs": 50.0, "badges": ["3K", "1v3 Lost"]},
    {"date": "Jun 28", "map": "Consulate", "result": "L", "score": "1:4", "rp": 1851, "drp": -24, "k": 2, "d": 4, "a": 0, "hs": 100.0, "badges": []},
    {"date": "Jun 28", "map": "Bank", "result": "L", "score": "3:5", "rp": 1875, "drp": -24, "k": 5, "d": 5, "a": 2, "hs": 40.0, "badges": []},
    {"date": "Jun 27", "map": "Chalet", "result": "W", "score": "4:1", "rp": 1899, "drp": 23, "k": 3, "d": 2, "a": 2, "hs": 33.3, "badges": ["1v1 Clutch", "1v3 Lost"]},
    {"date": "Jun 27", "map": "Chalet", "result": "L", "score": "2:4", "rp": 1876, "drp": -24, "k": 6, "d": 3, "a": 0, "hs": 16.7, "badges": ["1v3 Clutch", "3K"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "2:4", "rp": 1900, "drp": -6, "k": 3, "d": 4, "a": 3, "hs": 0.0, "badges": ["3K"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "1:4", "rp": 1906, "drp": -24, "k": 1, "d": 5, "a": 0, "hs": 0.0, "badges": ["Victim"]},
    {"date": "Jun 26", "map": "Consulate", "result": "L", "score": "2:4", "rp": 1930, "drp": -21, "k": 6, "d": 5, "a": 0, "hs": 16.7, "badges": ["3K", "2K"]},
    {"date": "Jun 26", "map": "Lair", "result": "W", "score": "4:1", "rp": 1951, "drp": 25, "k": 5, "d": 2, "a": 0, "hs": 40.0, "badges": ["1v3 Clutch", "3K"]},
    {"date": "Jun 25", "map": "Clubhouse", "result": "W", "score": "4:2", "rp": 1926, "drp": 25, "k": 7, "d": 3, "a": 2, "hs": 14.3, "badges": ["2K"]},
    {"date": "Jun 25", "map": "Outback", "result": "L", "score": "2:4", "rp": 1901, "drp": -25, "k": 2, "d": 6, "a": 1, "hs": 0.0, "badges": ["Victim"]},
    {"date": "Jun 25", "map": "Bank", "result": "L", "score": "2:4", "rp": 1926, "drp": -24, "k": 3, "d": 5, "a": 1, "hs": 0.0, "badges": []},
    {"date": "Jun 25", "map": "Chalet", "result": "W", "score": "4:0", "rp": 1950, "drp": 25, "k": 1, "d": 1, "a": 1, "hs": 100.0, "badges": []},
    {"date": "Jun 25", "map": "Nighthaven Labs", "result": "W", "score": "4:0", "rp": 1925, "drp": 25, "k": 3, "d": 0, "a": 1, "hs": 66.7, "badges": ["2K"]},
    {"date": "Jun 24", "map": "Consulate", "result": "W", "score": "4:2", "rp": 1900, "drp": 45, "k": 3, "d": 3, "a": 1, "hs": 33.3, "badges": ["1v1 Clutch", "2K"]},
    {"date": "Jun 24", "map": "Oregon", "result": "W", "score": "5:3", "rp": 1855, "drp": 25, "k": 4, "d": 8, "a": 2, "hs": 50.0, "badges": ["1v2 Lost", "Victim"]},
    {"date": "Jun 24", "map": "Emerald Plains", "result": "L", "score": "3:5", "rp": 1830, "drp": -25, "k": 4, "d": 7, "a": 5, "hs": 25.0, "badges": ["1v3 Lost"]},
]

SANDMAN_NEW = [
    {"date": "Jun 28", "map": "Chalet", "result": "W", "score": "4:0", "rp": 2548, "drp": 25, "k": 0, "d": 2, "a": 2, "hs": 0.0, "badges": []},
    {"date": "Jun 28", "map": "Consulate", "result": "W", "score": "4:2", "rp": 2523, "drp": 23, "k": 12, "d": 2, "a": 0, "hs": 41.7, "badges": ["4K", "1v1 Clutch"]},
    {"date": "Jun 28", "map": "Oregon", "result": "L", "score": "4:5", "rp": 2500, "drp": -15, "k": 8, "d": 8, "a": 1, "hs": 50.0, "badges": ["Ace", "1v2 Clutch"]},
    {"date": "Jun 28", "map": "Oregon", "result": "L", "score": "1:4", "rp": 2515, "drp": -26, "k": 4, "d": 4, "a": 1, "hs": 75.0, "badges": ["2K", "2K"]},
    {"date": "Jun 28", "map": "Consulate", "result": "W", "score": "4:1", "rp": 2541, "drp": 23, "k": 6, "d": 2, "a": 1, "hs": 50.0, "badges": ["1v1 Clutch", "2K", "2K", "2K"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "2:4", "rp": 2518, "drp": -28, "k": 5, "d": 4, "a": 1, "hs": 60.0, "badges": ["2K", "2K"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "1:4", "rp": 2546, "drp": -27, "k": 1, "d": 4, "a": 1, "hs": 0.0, "badges": []},
    {"date": "Jun 26", "map": "Consulate", "result": "L", "score": "2:4", "rp": 2573, "drp": -24, "k": 2, "d": 5, "a": 4, "hs": 0.0, "badges": ["1v3 Clutch", "1v3 Lost"]},
    {"date": "Jun 26", "map": "Lair", "result": "W", "score": "4:1", "rp": 2597, "drp": 21, "k": 2, "d": 3, "a": 1, "hs": 50.0, "badges": []},
    {"date": "Jun 26", "map": "Oregon", "result": "W", "score": "4:0", "rp": 2576, "drp": 23, "k": 6, "d": 2, "a": 0, "hs": 16.7, "badges": ["3K", "2K"]},
    {"date": "Jun 24", "map": "Consulate", "result": "W", "score": "4:2", "rp": 2553, "drp": 21, "k": 8, "d": 5, "a": 1, "hs": 25.0, "badges": ["2K", "2K", "2K"]},
    {"date": "Jun 24", "map": "Oregon", "result": "W", "score": "5:3", "rp": 2532, "drp": 23, "k": 6, "d": 7, "a": 3, "hs": 50.0, "badges": ["2K"]},
    {"date": "Jun 24", "map": "Emerald Plains", "result": "L", "score": "3:5", "rp": 2509, "drp": -25, "k": 4, "d": 8, "a": 1, "hs": 50.0, "badges": ["Victim", "2K"]},
]

SLACK_NEW = [
    {"date": "Jun 28", "map": "Chalet", "result": "W", "score": "4:0", "rp": 2327, "drp": 26, "k": 5, "d": 2, "a": 1, "hs": 80.0, "badges": ["2K"]},
    {"date": "Jun 28", "map": "Consulate", "result": "W", "score": "4:2", "rp": 2301, "drp": 25, "k": 5, "d": 5, "a": 2, "hs": 60.0, "badges": ["4K"]},
    {"date": "Jun 28", "map": "Oregon", "result": "L", "score": "4:5", "rp": 2276, "drp": -24, "k": 6, "d": 8, "a": 3, "hs": 50.0, "badges": ["4K"]},
    {"date": "Jun 28", "map": "Consulate", "result": "L", "score": "1:4", "rp": 2300, "drp": -17, "k": 0, "d": 4, "a": 1, "hs": 0.0, "badges": []},
    {"date": "Jun 28", "map": "Bank", "result": "L", "score": "3:5", "rp": 2317, "drp": -26, "k": 4, "d": 7, "a": 3, "hs": 75.0, "badges": ["2K"]},
    {"date": "Jun 27", "map": "Chalet", "result": "W", "score": "4:1", "rp": 2343, "drp": 21, "k": 4, "d": 3, "a": 4, "hs": 75.0, "badges": ["2K"]},
    {"date": "Jun 27", "map": "Chalet", "result": "L", "score": "2:4", "rp": 2322, "drp": -27, "k": 5, "d": 5, "a": 3, "hs": 60.0, "badges": ["2K"]},
]

MJESTER_NEW = [
    {"date": "Jun 28", "map": "Chalet", "result": "W", "score": "4:0", "rp": 1813, "drp": 29, "k": 2, "d": 2, "a": 0, "hs": 0.0, "badges": ["2K"]},
    {"date": "Jun 28", "map": "Consulate", "result": "W", "score": "4:2", "rp": 1784, "drp": 27, "k": 2, "d": 4, "a": 1, "hs": 0.0, "badges": ["1v1 Lost", "TK"]},
    {"date": "Jun 28", "map": "Oregon", "result": "L", "score": "4:5", "rp": 1757, "drp": -21, "k": 5, "d": 7, "a": 0, "hs": 60.0, "badges": ["2K"]},
    {"date": "Jun 28", "map": "Oregon", "result": "L", "score": "1:4", "rp": 1778, "drp": -22, "k": 1, "d": 5, "a": 0, "hs": 100.0, "badges": ["Victim", "1v3 Lost"]},
    {"date": "Jun 28", "map": "Consulate", "result": "W", "score": "4:1", "rp": 1800, "drp": 27, "k": 3, "d": 4, "a": 2, "hs": 33.3, "badges": ["2K"]},
    {"date": "Jun 28", "map": "Calypso Casino", "result": "L", "score": "3:5", "rp": 1773, "drp": -25, "k": 8, "d": 7, "a": 3, "hs": 25.0, "badges": ["3K", "3K", "1v2 Lost"]},
    {"date": "Jun 28", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 1798, "drp": 25, "k": 4, "d": 3, "a": 3, "hs": 50.0, "badges": ["1v2 Lost", "2K"]},
    {"date": "Jun 28", "map": "Border", "result": "W", "score": "4:1", "rp": 1773, "drp": 26, "k": 7, "d": 1, "a": 1, "hs": 28.6, "badges": ["4K"]},
    {"date": "Jun 27", "map": "Clubhouse", "result": "W", "score": "5:4", "rp": 1747, "drp": 24, "k": 7, "d": 6, "a": 3, "hs": 42.9, "badges": ["2K", "1v3 Lost"]},
    {"date": "Jun 27", "map": "Lair", "result": "L", "score": "1:4", "rp": 1723, "drp": -25, "k": 5, "d": 5, "a": 3, "hs": 60.0, "badges": ["3K", "Victim"]},
    {"date": "Jun 27", "map": "Bank", "result": "W", "score": "4:1", "rp": 1748, "drp": 24, "k": 7, "d": 3, "a": 1, "hs": 42.9, "badges": ["TK", "2K", "2K", "2K"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "0:4", "rp": 1724, "drp": -27, "k": 2, "d": 4, "a": 1, "hs": 50.0, "badges": ["Victim"]},
    {"date": "Jun 27", "map": "Kafe Dostoyevsky", "result": "W", "score": "4:1", "rp": 1751, "drp": 22, "k": 7, "d": 1, "a": 2, "hs": 0.0, "badges": ["3K", "TK"]},
    {"date": "Jun 27", "map": "Calypso Casino", "result": "L", "score": "2:4", "rp": 1729, "drp": -24, "k": 1, "d": 5, "a": 1, "hs": 0.0, "badges": []},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "2:4", "rp": 1753, "drp": -24, "k": 3, "d": 5, "a": 0, "hs": 0.0, "badges": ["2K"]},
    {"date": "Jun 27", "map": "Oregon", "result": "L", "score": "1:4", "rp": 1777, "drp": -23, "k": 7, "d": 4, "a": 0, "hs": 28.6, "badges": ["Ace", "2K"]},
    {"date": "Jun 26", "map": "Consulate", "result": "L", "score": "2:4", "rp": 1800, "drp": -13, "k": 1, "d": 6, "a": 0, "hs": 0.0, "badges": ["Victim"]},
    {"date": "Jun 26", "map": "Lair", "result": "W", "score": "4:1", "rp": 1813, "drp": 25, "k": 5, "d": 4, "a": 2, "hs": 20.0, "badges": ["3K", "2K"]},
    {"date": "Jun 26", "map": "Oregon", "result": "W", "score": "4:0", "rp": 1788, "drp": 27, "k": 1, "d": 1, "a": 0, "hs": 0.0, "badges": []},
    {"date": "Jun 25", "map": "Bank", "result": "L", "score": "2:4", "rp": 1761, "drp": -23, "k": 3, "d": 5, "a": 0, "hs": 33.3, "badges": ["3K"]},
    {"date": "Jun 25", "map": "Chalet", "result": "W", "score": "4:0", "rp": 1784, "drp": 25, "k": 8, "d": 2, "a": 1, "hs": 62.5, "badges": ["3K", "3K"]},
    {"date": "Jun 25", "map": "Nighthaven Labs", "result": "W", "score": "4:0", "rp": 1759, "drp": 26, "k": 5, "d": 0, "a": 1, "hs": 60.0, "badges": ["2K"]},
    {"date": "Jun 24", "map": "Consulate", "result": "W", "score": "4:2", "rp": 1733, "drp": 35, "k": 2, "d": 3, "a": 2, "hs": 0.0, "badges": []},
    {"date": "Jun 24", "map": "Oregon", "result": "W", "score": "5:3", "rp": 1698, "drp": 23, "k": 3, "d": 5, "a": 0, "hs": 100.0, "badges": ["TK", "2K"]},
    {"date": "Jun 24", "map": "Emerald Plains", "result": "L", "score": "3:5", "rp": 1675, "drp": -25, "k": 2, "d": 6, "a": 3, "hs": 0.0, "badges": []},
]

LCEW_NEW = [
    {"date": "Jun 24", "map": "Oregon", "result": "L", "score": "1:4", "rp": 2156, "drp": -26, "k": 6, "d": 4, "a": 1, "hs": 16.7, "badges": ["2K", "2K", "1v3 Lost", "1v3 Lost"]},
]

MATTICUS_OPS = parse_op([
    ("Skopós", 34, 64.7, 0.57, 46.2, 22, 12, 13, 23, 9, 0, 0),
    ("Finka", 16, 56.2, 1.67, 66.7, 9, 7, 15, 9, 4, 0, 0),
    ("Alibi", 15, 66.7, 1.00, 53.8, 10, 5, 13, 13, 3, 0, 0),
    ("Sens", 12, 41.7, 1.00, 50.0, 5, 7, 8, 8, 5, 0, 0),
    ("Deimos", 8, 62.5, 1.67, 0.0, 5, 3, 5, 3, 2, 0, 0),
    ("Flores", 5, 40.0, 1.00, 33.3, 2, 3, 3, 3, 0, 0, 0),
    ("Iana", 4, 50.0, 1.33, 50.0, 2, 2, 4, 3, 1, 0, 0),
    ("Ram", 4, 0.0, 0.25, 100.0, 0, 4, 1, 4, 0, 0, 0),
    ("Striker", 3, 33.3, 0.00, 0.0, 1, 2, 0, 3, 2, 0, 0),
    ("Pulse", 3, 33.3, 0.33, 0.0, 1, 2, 1, 3, 3, 0, 0),
    ("Kali", 3, 33.3, 0.00, 0.0, 1, 2, 0, 3, 0, 0, 0),
    ("Lesion", 2, 50.0, 1.00, 100.0, 1, 1, 2, 2, 1, 0, 0),
    ("Goyo", 2, 50.0, 0.50, 0.0, 1, 1, 1, 2, 1, 0, 0),
    ("Thunderbird", 2, 50.0, 2.00, 0.0, 1, 1, 2, 1, 0, 0, 0),
    ("Thermite", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 3, 0, 0),
    ("Montagne", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Glaz", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Jäger", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 1, 0, 0),
    ("Solis", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Frost", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
    ("Blackbeard", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Fuze", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Osa", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Kapkan", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Clash", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("IQ", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Lion", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Valkyrie", 1, 0.0, 1.00, 0.0, 0, 1, 1, 0, 0, 0, 0),
    ("Echo", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 0, 0, 0),
    ("Sentry", 1, 100.0, 1.00, 0.0, 1, 0, 1, 1, 1, 0, 0),
    ("Gridlock", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 1, 0, 0),
    ("Blitz", 1, 100.0, 1.00, 100.0, 1, 0, 1, 1, 0, 0, 0),
    ("Castle", 1, 100.0, 2.00, 100.0, 1, 0, 2, 0, 0, 0, 0),
    ("Vigil", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 1, 0, 0),
])

CUNDER_OPS = parse_op([
    ("Tachanka", 136, 62.5, 0.94, 21.3, 85, 51, 89, 95, 42, 0, 0),
    ("Zero", 122, 43.4, 0.82, 52.0, 53, 69, 75, 91, 23, 0, 0),
    ("Bandit", 12, 66.7, 0.45, 40.0, 8, 4, 5, 11, 5, 0, 0),
    ("Solid Snake", 11, 9.1, 0.56, 80.0, 1, 10, 5, 9, 0, 0, 0),
    ("Twitch", 9, 66.7, 3.50, 50.0, 6, 3, 14, 4, 1, 0, 0),
    ("Jackal", 7, 42.9, 2.75, 63.6, 3, 4, 11, 4, 0, 0, 0),
    ("Thunderbird", 6, 66.7, 1.50, 0.0, 4, 2, 3, 2, 0, 0, 0),
    ("Sentry", 4, 50.0, 1.00, 66.7, 2, 2, 3, 3, 1, 0, 0),
    ("Striker", 4, 50.0, 1.25, 20.0, 2, 2, 5, 4, 0, 0, 0),
    ("Brava", 2, 50.0, 0.00, 0.0, 1, 1, 0, 1, 0, 0, 0),
    ("Echo", 2, 50.0, 2.00, 100.0, 1, 1, 2, 1, 0, 0, 0),
    ("Kapkan", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 0, 0, 0),
    ("Mozzie", 2, 100.0, 1.00, 0.0, 2, 0, 1, 1, 1, 0, 0),
    ("Nøkk", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 0, 0, 0),
    ("Amaru", 1, 100.0, 4.00, 25.0, 1, 0, 4, 0, 0, 0, 0),
    ("Capitão", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
])

ROGUE_OPS = parse_op([
    ("Mute", 69, 47.8, 0.77, 32.5, 33, 36, 40, 52, 17, 0, 0),
    ("Nomad", 61, 52.5, 1.10, 46.5, 32, 29, 43, 39, 16, 0, 0),
    ("Kaid", 37, 62.2, 1.04, 26.9, 23, 14, 26, 25, 12, 0, 0),
    ("Dokkaebi", 26, 46.2, 1.06, 16.7, 12, 14, 18, 17, 12, 0, 0),
    ("Gridlock", 19, 26.3, 0.59, 30.0, 5, 14, 10, 17, 6, 0, 0),
    ("Thorn", 16, 50.0, 1.40, 35.7, 8, 8, 14, 10, 7, 0, 0),
    ("Jackal", 13, 53.8, 2.14, 60.0, 7, 6, 15, 7, 1, 0, 0),
    ("Ace", 10, 40.0, 0.71, 40.0, 4, 6, 5, 7, 1, 0, 0),
    ("Maverick", 9, 55.6, 1.75, 42.9, 5, 4, 7, 4, 1, 0, 0),
    ("Kapkan", 8, 75.0, 3.00, 22.2, 6, 2, 9, 3, 4, 0, 0),
    ("Tachanka", 8, 75.0, 1.00, 0.0, 6, 2, 3, 3, 3, 0, 0),
    ("Lion", 6, 50.0, 1.00, 66.7, 3, 3, 3, 3, 1, 0, 1),
    ("Valkyrie", 6, 33.3, 0.40, 50.0, 2, 4, 2, 5, 1, 0, 0),
    ("Denari", 6, 33.3, 0.17, 100.0, 2, 4, 1, 6, 2, 0, 0),
    ("Alibi", 6, 50.0, 1.33, 25.0, 3, 3, 4, 3, 0, 0, 0),
    ("Ying", 4, 50.0, 0.75, 33.3, 2, 2, 3, 4, 1, 0, 0),
    ("Smoke", 4, 100.0, 1.00, 0.0, 4, 0, 3, 3, 1, 0, 0),
    ("Fuze", 4, 0.0, 0.75, 66.7, 0, 4, 3, 4, 0, 0, 0),
    ("Brava", 4, 25.0, 1.67, 60.0, 1, 3, 5, 3, 2, 0, 0),
    ("Azami", 3, 66.7, 0.50, 0.0, 2, 1, 1, 2, 3, 0, 0),
    ("Thatcher", 3, 100.0, 6.00, 33.3, 3, 0, 6, 0, 0, 0, 0),
    ("Mozzie", 3, 66.7, 1.00, 100.0, 2, 1, 1, 1, 0, 0, 0),
    ("Ram", 2, 50.0, 2.00, 50.0, 1, 1, 2, 1, 0, 0, 0),
    ("Jäger", 2, 50.0, 0.00, 0.0, 1, 1, 0, 2, 0, 0, 0),
    ("Buck", 2, 50.0, 0.00, 0.0, 1, 1, 0, 2, 2, 0, 0),
    ("Caveira", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 1, 0, 0),
    ("Thermite", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 0, 0, 0),
    ("Hibana", 2, 50.0, 1.00, 50.0, 1, 1, 2, 2, 1, 0, 0),
    ("Pulse", 2, 50.0, 1.50, 0.0, 1, 1, 3, 2, 0, 0, 0),
    ("Fenrir", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Melusi", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Aruni", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Zero", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Rook", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Lesion", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Blackbeard", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 1, 0, 0),
    ("Capitão", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Rauora", 1, 100.0, 1.00, 0.0, 1, 0, 1, 1, 0, 0, 0),
    ("Sledge", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
])

SANDMAN_OPS = parse_op([
    ("Sledge", 76, 51.3, 1.28, 38.5, 39, 37, 78, 61, 23, 0, 0),
    ("Kaid", 33, 66.7, 1.14, 29.2, 22, 11, 24, 21, 7, 0, 0),
    ("Frost", 31, 71.0, 1.20, 12.5, 22, 9, 24, 20, 12, 0, 0),
    ("Thorn", 26, 50.0, 1.45, 27.6, 13, 13, 29, 20, 12, 1, 0),
    ("Aruni", 22, 54.5, 1.06, 52.6, 12, 10, 19, 18, 8, 0, 0),
    ("Blitz", 22, 36.4, 0.55, 27.3, 8, 14, 11, 20, 3, 0, 0),
    ("Fuze", 16, 43.8, 1.27, 35.7, 7, 9, 14, 11, 1, 0, 0),
    ("Kali", 14, 50.0, 1.20, 41.7, 7, 7, 12, 10, 2, 0, 0),
    ("Denari", 13, 92.3, 2.40, 41.7, 12, 1, 12, 5, 7, 0, 0),
    ("Rauora", 13, 23.1, 0.38, 0.0, 3, 10, 5, 13, 3, 0, 0),
    ("Mute", 10, 50.0, 0.67, 33.3, 5, 5, 6, 9, 1, 0, 0),
    ("Fenrir", 9, 44.4, 1.60, 75.0, 4, 5, 8, 5, 1, 0, 0),
    ("Pulse", 9, 77.8, 2.20, 9.1, 7, 2, 11, 5, 3, 0, 0),
    ("Melusi", 8, 50.0, 1.60, 75.0, 4, 4, 8, 5, 1, 0, 0),
    ("Amaru", 8, 37.5, 0.62, 100.0, 3, 5, 5, 8, 3, 0, 0),
    ("Dokkaebi", 7, 57.1, 1.20, 0.0, 4, 3, 6, 5, 2, 0, 0),
    ("Brava", 7, 14.3, 1.20, 33.3, 1, 6, 6, 5, 0, 0, 0),
    ("Tubarão", 6, 83.3, 3.33, 20.0, 5, 1, 10, 3, 2, 0, 1),
    ("Valkyrie", 4, 50.0, 3.50, 42.9, 2, 2, 7, 2, 0, 0, 0),
    ("Maestro", 4, 50.0, 1.00, 50.0, 2, 2, 2, 2, 1, 0, 0),
    ("Kapkan", 4, 25.0, 0.25, 100.0, 1, 3, 1, 4, 0, 0, 0),
    ("Bandit", 3, 33.3, 2.50, 0.0, 1, 2, 5, 2, 0, 0, 0),
    ("Azami", 3, 66.7, 0.50, 0.0, 2, 1, 1, 2, 1, 0, 0),
    ("Ying", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 0, 0, 0),
    ("Osa", 2, 50.0, 1.00, 50.0, 1, 1, 2, 2, 1, 0, 0),
    ("Thermite", 2, 100.0, 1.00, 100.0, 2, 0, 1, 1, 0, 0, 0),
    ("Jackal", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
    ("Gridlock", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Grim", 1, 0.0, 2.00, 50.0, 0, 1, 2, 1, 0, 0, 0),
    ("IQ", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 0, 0, 0),
    ("Thunderbird", 1, 100.0, 1.00, 0.0, 1, 0, 1, 1, 0, 0, 0),
    ("Montagne", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Doc", 1, 100.0, 2.00, 50.0, 1, 0, 2, 0, 1, 0, 0),
    ("Blackbeard", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
])

SLACK_OPS = parse_op([
    ("Osa", 49, 44.9, 1.42, 61.1, 22, 27, 54, 38, 9, 1, 0),
    ("Doc", 48, 58.3, 1.12, 62.2, 28, 20, 45, 40, 11, 0, 1),
    ("Aruni", 40, 70.0, 1.74, 42.6, 28, 12, 54, 31, 13, 2, 0),
    ("Thermite", 24, 41.7, 1.05, 45.0, 10, 14, 20, 19, 7, 0, 0),
    ("Smoke", 16, 50.0, 1.00, 53.8, 8, 8, 13, 13, 4, 0, 0),
    ("Hibana", 13, 46.2, 1.50, 50.0, 6, 7, 12, 8, 4, 0, 0),
    ("Ace", 12, 50.0, 1.00, 70.0, 6, 6, 10, 10, 2, 0, 0),
    ("Kaid", 10, 60.0, 0.71, 40.0, 6, 4, 5, 7, 2, 0, 0),
    ("Brava", 9, 44.4, 0.86, 0.0, 4, 5, 6, 7, 3, 0, 0),
    ("Bandit", 9, 55.6, 2.20, 36.4, 5, 4, 11, 5, 1, 0, 0),
    ("Blitz", 8, 25.0, 0.57, 100.0, 2, 6, 4, 7, 1, 0, 1),
    ("Warden", 8, 62.5, 1.20, 66.7, 5, 3, 6, 5, 3, 0, 0),
    ("Blackbeard", 8, 62.5, 0.80, 25.0, 5, 3, 4, 5, 1, 0, 0),
    ("Rauora", 7, 57.1, 0.60, 66.7, 4, 3, 3, 5, 1, 0, 0),
    ("Thorn", 5, 60.0, 2.00, 33.3, 3, 2, 6, 3, 0, 0, 0),
    ("Caveira", 5, 100.0, 1.67, 0.0, 5, 0, 5, 3, 1, 0, 0),
    ("Jackal", 4, 0.0, 0.25, 100.0, 0, 4, 1, 4, 2, 0, 0),
    ("Iana", 4, 25.0, 1.25, 60.0, 1, 3, 5, 4, 1, 0, 0),
    ("Tubarão", 3, 0.0, 0.33, 0.0, 0, 3, 1, 3, 0, 0, 0),
    ("Mute", 2, 50.0, 0.50, 100.0, 1, 1, 1, 2, 1, 0, 0),
    ("Zero", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 0, 0, 1),
    ("Thunderbird", 2, 100.0, 2.00, 0.0, 2, 0, 2, 0, 1, 0, 0),
    ("Dokkaebi", 2, 50.0, 1.00, 0.0, 1, 1, 1, 1, 0, 0, 0),
    ("Jäger", 2, 100.0, 1.50, 33.3, 2, 0, 3, 2, 0, 0, 0),
    ("Montagne", 2, 100.0, 0.00, 0.0, 2, 0, 0, 1, 0, 0, 0),
    ("Kapkan", 2, 100.0, 1.50, 33.3, 2, 0, 3, 2, 0, 0, 0),
    ("Solid Snake", 2, 50.0, 0.00, 0.0, 1, 1, 0, 2, 0, 0, 0),
    ("Maestro", 2, 50.0, 2.00, 50.0, 1, 1, 2, 1, 1, 0, 0),
    ("Echo", 1, 100.0, 3.00, 33.3, 1, 0, 3, 1, 0, 0, 0),
    ("Deimos", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Grim", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
    ("Ying", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Rook", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
    ("Azami", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
    ("Castle", 1, 100.0, 1.00, 0.0, 1, 0, 1, 1, 1, 0, 0),
    ("Kali", 1, 100.0, 1.00, 100.0, 1, 0, 1, 1, 0, 0, 0),
    ("Clash", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Lesion", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 1, 0, 0),
    ("Zofia", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Valkyrie", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Ram", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Fenrir", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
])

MJESTER_OPS = parse_op([
    ("Thorn", 188, 61.7, 1.32, 34.8, 116, 72, 155, 117, 73, 1, 0),
    ("Denari", 112, 53.6, 0.57, 66.7, 60, 52, 51, 90, 36, 0, 1),
    ("Dokkaebi", 68, 45.6, 0.88, 39.5, 31, 37, 38, 43, 24, 0, 0),
    ("Montagne", 62, 48.4, 0.34, 21.4, 30, 32, 14, 41, 3, 0, 0),
    ("Lion", 43, 53.5, 0.81, 48.0, 23, 20, 25, 31, 8, 0, 2),
    ("Zero", 41, 41.5, 0.83, 25.0, 17, 24, 24, 29, 3, 0, 0),
    ("Gridlock", 40, 52.5, 0.79, 27.3, 21, 19, 22, 28, 8, 0, 2),
    ("Fuze", 30, 43.3, 1.05, 27.3, 13, 17, 22, 21, 9, 0, 1),
    ("Kaid", 29, 62.1, 0.80, 12.5, 18, 11, 16, 20, 4, 0, 0),
    ("Thatcher", 18, 66.7, 1.33, 41.7, 12, 6, 12, 9, 4, 0, 0),
    ("Osa", 17, 41.2, 0.21, 33.3, 7, 10, 3, 14, 5, 0, 0),
    ("Azami", 16, 31.2, 0.62, 62.5, 5, 11, 8, 13, 1, 0, 0),
    ("Smoke", 15, 40.0, 0.75, 11.1, 6, 9, 9, 12, 5, 0, 0),
    ("Ying", 14, 35.7, 0.90, 55.6, 5, 9, 9, 10, 3, 0, 0),
    ("Fenrir", 14, 57.1, 1.22, 27.3, 8, 6, 11, 9, 2, 0, 0),
    ("Kapkan", 13, 53.8, 1.44, 46.2, 7, 6, 13, 9, 2, 0, 0),
    ("Ram", 10, 50.0, 0.71, 40.0, 5, 5, 5, 7, 2, 0, 0),
    ("Capitão", 8, 62.5, 0.12, 0.0, 5, 3, 1, 8, 2, 0, 0),
    ("Rauora", 8, 37.5, 0.33, 50.0, 3, 5, 2, 6, 1, 0, 0),
    ("Sledge", 7, 57.1, 2.00, 37.5, 4, 3, 8, 4, 0, 0, 0),
    ("Amaru", 7, 100.0, 1.00, 0.0, 7, 0, 6, 6, 2, 0, 0),
    ("Maestro", 7, 85.7, 1.00, 100.0, 6, 1, 2, 2, 7, 0, 0),
    ("Brava", 7, 42.9, 0.25, 0.0, 3, 4, 1, 4, 0, 0, 0),
    ("Castle", 6, 50.0, 2.00, 33.3, 3, 3, 6, 3, 1, 0, 0),
    ("Frost", 5, 80.0, 1.33, 50.0, 4, 1, 4, 3, 4, 0, 0),
    ("Maverick", 4, 50.0, 0.33, 0.0, 2, 2, 1, 3, 1, 0, 0),
    ("Mute", 4, 25.0, 2.00, 16.7, 1, 3, 6, 3, 0, 0, 0),
    ("Caveira", 4, 50.0, 0.33, 0.0, 2, 2, 1, 3, 0, 0, 0),
    ("Thermite", 3, 33.3, 0.50, 0.0, 1, 2, 1, 2, 0, 0, 0),
    ("Tachanka", 3, 66.7, 0.00, 0.0, 2, 1, 0, 2, 1, 0, 0),
    ("Lesion", 2, 50.0, 0.00, 0.0, 1, 1, 0, 1, 4, 0, 0),
    ("Grim", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 0, 0, 0),
    ("Flores", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 0, 0, 0),
    ("Aruni", 2, 50.0, 0.00, 0.0, 1, 1, 0, 2, 0, 0, 0),
    ("Bandit", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Mozzie", 1, 100.0, 3.00, 33.3, 1, 0, 3, 0, 0, 0, 0),
    ("Jäger", 1, 100.0, 1.00, 0.0, 1, 0, 1, 0, 1, 0, 0),
    ("Ela", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 1, 0, 0),
    ("Solis", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Nomad", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Wamai", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 1, 0, 0),
    ("Alibi", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
    ("Deimos", 1, 0.0, 0.00, 0.0, 0, 1, 0, 0, 0, 0, 0),
    ("Ace", 1, 0.0, 2.00, 50.0, 0, 1, 2, 0, 0, 0, 0),
    ("Finka", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("IQ", 1, 0.0, 0.00, 0.0, 0, 1, 0, 0, 0, 0, 0),
    ("Buck", 1, 100.0, 2.00, 0.0, 1, 0, 2, 0, 0, 0, 0),
    ("Melusi", 1, 100.0, 1.00, 0.0, 1, 0, 1, 0, 0, 0, 0),
    ("Thunderbird", 1, 100.0, 3.00, 33.3, 1, 0, 3, 0, 0, 0, 0),
])

LCEW_OPS = parse_op([
    ("Jackal", 30, 36.7, 1.05, 54.5, 11, 19, 22, 21, 7, 0, 0),
    ("Nomad", 26, 34.6, 0.95, 16.7, 9, 17, 18, 19, 4, 0, 0),
    ("Kaid", 18, 77.8, 3.50, 33.3, 14, 4, 21, 6, 7, 0, 0),
    ("Valkyrie", 16, 68.8, 1.86, 46.2, 11, 5, 13, 7, 5, 0, 0),
    ("Mute", 16, 43.8, 0.73, 12.5, 7, 9, 8, 11, 5, 0, 0),
    ("Kapkan", 10, 70.0, 1.60, 25.0, 7, 3, 8, 5, 8, 0, 0),
    ("Thorn", 9, 55.6, 0.71, 60.0, 5, 4, 5, 7, 3, 0, 0),
    ("Ace", 6, 33.3, 1.25, 40.0, 2, 4, 5, 4, 2, 0, 0),
    ("Gridlock", 4, 0.0, 0.75, 33.3, 0, 4, 3, 4, 2, 0, 0),
    ("Sledge", 3, 33.3, 1.00, 66.7, 1, 2, 3, 3, 0, 0, 0),
    ("Aruni", 3, 0.0, 1.67, 20.0, 0, 3, 5, 3, 0, 0, 0),
    ("Thatcher", 3, 66.7, 1.00, 0.0, 2, 1, 1, 1, 0, 0, 0),
    ("Thermite", 3, 33.3, 0.50, 0.0, 1, 2, 1, 2, 0, 0, 0),
    ("Thunderbird", 2, 50.0, 5.00, 60.0, 1, 1, 5, 1, 0, 0, 0),
    ("Dokkaebi", 2, 50.0, 2.00, 0.0, 1, 1, 2, 1, 1, 0, 0),
    ("Mozzie", 2, 50.0, 0.00, 0.0, 1, 1, 0, 1, 1, 0, 0),
    ("Bandit", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Fuze", 1, 0.0, 2.00, 50.0, 0, 1, 2, 1, 0, 0, 0),
    ("Echo", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
    ("Azami", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Pulse", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
    ("Twitch", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Finka", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Lion", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Melusi", 1, 100.0, 1.00, 0.0, 1, 0, 1, 0, 0, 0, 0),
    ("Zero", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Maestro", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
])

PLAYERS = [
    ("matticus_hq", "Matticus HQ", MATTICUS_NEW, MATTICUS_OPS, "Silver IV", 2149, 2202, "Silver III", 51),
    ("cunderthock", "CunderThock", CUNDER_NEW, CUNDER_OPS, "Gold V", 2568, 2626, "Gold IV", 52),
    ("rogue_amputee", "Rogue_Amputee", ROGUE_NEW, ROGUE_OPS, "Bronze II", 1856, 1951, "Bronze I", 44),
    ("grandmaster_sandman", "Grandmaster Sandman", SANDMAN_NEW, SANDMAN_OPS, "Gold V", 2548, 2677, "Gold IV", 52),
    ("slackandlack", "slackandlack", SLACK_NEW, SLACK_OPS, "Silver II", 2327, 2377, "Silver I", 73),
    ("mjester1337", "MJester1337", MJESTER_NEW, MJESTER_OPS, "Bronze II", 1813, 1813, "Bronze I", 87),
    ("lcew4ll0wcome", "LceW4ll0wCome", LCEW_NEW, LCEW_OPS, "Silver IV", 2156, 2191, "Silver III", 44),
]


def apply_player(slug, name, new_matches, operators, rank, rp, peak, next_rank, rp_to_next):
    path = ROOT / "data" / slug / "Y11S2" / "current.md"
    data, header = read_json_md(path)
    merged = merge_matches(data["matches"], new_matches)
    added = len(merged) - len(data["matches"])
    data["matches"] = merged
    data["operators"] = operators
    data["badges"] = rebuild_badges(data["matches"])
    data["meta"] = compute_meta(data["matches"], rank, rp, peak, next_rank, rp_to_next)
    data["updated"] = UPDATED
    header = re.sub(r"\*\*Updated:\*\*.*", f"**Updated:** {UPDATED}", header)
    write_json_md(path, header, data)
    print(f"{slug}: +{added} matches, meta {data['meta']['rank']} {data['meta']['rp']} {data['meta']['w']}-{data['meta']['l']} ({data['meta']['matches']}g)")


if __name__ == "__main__":
    for p in PLAYERS:
        apply_player(*p)
