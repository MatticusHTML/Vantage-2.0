#!/usr/bin/env python3
"""Y11S2 squad bulk update — Jun 20–23 ingest. Data + meta + operators + badges."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPDATED = "Jun 24, 2026 · morning PT"

DEF_OPS = {
    "Skopós", "Alibi", "Pulse", "Goyo", "Valkyrie", "Lesion", "Clash", "Solis", "Jäger",
    "Echo", "Montagne", "Mute", "Nomad", "Kaid", "Thorn", "Jackal", "Gridlock", "Kapkan",
    "Lion", "Alibi", "Smoke", "Denari", "Fuze", "Valkyrie", "Ying", "Hibana", "Buck",
    "Maverick", "Caveira", "Azami", "Mozzie", "Ram", "Pulse", "Rook", "Capitão", "Aruni",
    "Melusi", "Thermite", "Thatcher", "Blackbeard", "Fenrir", "Tachanka", "Zero", "Solid Snake",
    "Bandit", "Twitch", "Sentry", "Thunderbird", "Striker", "Brava", "Mozzie", "Kapkan",
    "Frost", "Aruni", "Melusi", "Denari", "Rauora", "Fenrir", "Tubarão", "Doc", "Castle",
    "Warden", "Caveira", "Thunderbird", "Lesion", "Maestro", "Grim", "Wamai", "Ela",
    "Oryx", "Nøkk", "Vigil", "Mira", "Deimos", "Striker", "Solis", "Bandit",
}

ATK_OPS = {
    "Finka", "Sens", "Deimos", "Ram", "Iana", "Thermite", "Glaz", "Flores", "IQ",
    "Blackbeard", "Lion", "Kali", "Ace", "Sledge", "Dokkaebi", "Hibana", "Brava", "Amaru",
    "Blitz", "Fuze", "Kali", "Ying", "Osa", "Grim", "Ash", "Zofia", "Capitão", "Gridlock",
    "Nomad", "Jackal", "Thatcher", "Buck", "Maverick", "Zero", "Tachanka",
}

# Known sides from R6 — override ambiguous
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
    "Oryx": "DEF", "Nøkk": "DEF", "Vigil": "DEF", "Mira": "DEF", "Wamai": "DEF", "Ela": "DEF",
    "Tachanka": "DEF", "Zero": "ATK", "Solid Snake": "ATK", "Skopós": "DEF",
}


def op_side(name):
    n = name.replace("SkopÃ³s", "Skopós")
    return SIDE.get(n, "DEF" if n in DEF_OPS else "ATK")


def fingerprint(m):
    if m.get("result") == "RB" or m.get("map") == "RP Rollback":
        return (m["date"], m["rp"], "RP Rollback")
    return (m["date"], m["rp"], m["score"])


def parse_op(rows):
    """rows: list of tuples (name, rounds, winpct, kd, hs, w, l, k, d, a, aces, tks)"""
    out = []
    for r in rows:
        name = r[0]
        if name == "Skopós" or "Skop" in name:
            name = "Skopós"
        out.append({
            "name": name,
            "side": op_side(name),
            "rounds": r[1],
            "winPct": r[2],
            "kd": r[3],
            "hs": r[4],
            "w": r[5],
            "l": r[6],
            "k": r[7],
            "d": r[8],
            "a": r[9],
            "aces": r[10],
            "tks": r[11],
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
        "rank": rank,
        "rp": rp,
        "peakRp": max(peak_rp, max_rp),
        "nextRank": next_rank,
        "rpToNext": rp_to_next,
        "matches": len(real),
        "w": w,
        "l": l,
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
    return json.loads(m.group(1)), text.split("```json")[0], text.split("```")[-1]


def write_json_md(path, header, data, footer=""):
    body = json.dumps(data, indent=4, ensure_ascii=False)
    path.write_text(f"{header}```json\n{body}\n```\n{footer}", encoding="utf-8")


# --- NEW MATCHES (newest first within each batch) ---

ROGUE_NEW = [
    {"date": "Jun 22", "map": "Chalet", "result": "L", "score": "0:4", "rp": 1855, "drp": -23, "k": 2, "d": 4, "a": 1, "hs": 100.0, "badges": ["Victim", "2K"]},
    {"date": "Jun 21", "map": "Oregon", "result": "L", "score": "4:5", "rp": 1878, "drp": -22, "k": 3, "d": 7, "a": 3, "hs": 66.7, "badges": ["1v2 Lost", "2K"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "L", "score": "3:5", "rp": 1900, "drp": -7, "k": 7, "d": 5, "a": 2, "hs": 28.6, "badges": ["4K", "1v3 Lost"]},
    {"date": "Jun 21", "map": "Coastline", "result": "W", "score": "5:3", "rp": 1907, "drp": 28, "k": 3, "d": 5, "a": 2, "hs": 33.3, "badges": ["1v1 Clutch", "2K"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 1879, "drp": 27, "k": 3, "d": 3, "a": 0, "hs": 33.3, "badges": ["2K"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 1852, "drp": 27, "k": 2, "d": 2, "a": 1, "hs": 0.0, "badges": []},
]

LCEW_NEW = [
    {"date": "Jun 21", "map": "Outback", "result": "W", "score": "5:4", "rp": 2182, "drp": 27, "k": 6, "d": 6, "a": 2, "hs": 50.0, "badges": ["1v3 Clutch", "2K", "2K"]},
    {"date": "Jun 21", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 2155, "drp": 25, "k": 5, "d": 1, "a": 1, "hs": 60.0, "badges": ["2K"]},
    {"date": "Jun 21", "map": "Outback", "result": "L", "score": "0:4", "rp": 2130, "drp": -24, "k": 3, "d": 4, "a": 0, "hs": 0.0, "badges": ["Victim", "2K"]},
    {"date": "Jun 20", "map": "Fortress", "result": "W", "score": "5:4", "rp": 2154, "drp": 26, "k": 4, "d": 6, "a": 7, "hs": 50.0, "badges": ["1v1 Clutch", "2K", "2K"]},
    {"date": "Jun 20", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 2128, "drp": 28, "k": 1, "d": 0, "a": 1, "hs": 0.0, "badges": []},
    {"date": "Jun 20", "map": "Consulate", "result": "L", "score": "2:4", "rp": 2100, "drp": -22, "k": 7, "d": 3, "a": 0, "hs": 14.3, "badges": ["1v2 Lost", "2K", "2K"]},
    {"date": "Jun 20", "map": "Calypso Casino", "result": "W", "score": "4:1", "rp": 2122, "drp": 23, "k": 6, "d": 1, "a": 1, "hs": 50.0, "badges": ["4K", "2K"]},
    {"date": "Jun 20", "map": "Emerald Plains", "result": "W", "score": "4:2", "rp": 2099, "drp": 24, "k": 6, "d": 2, "a": 1, "hs": 33.3, "badges": ["1v2 Lost", "2K", "2K"]},
    {"date": "Jun 20", "map": "Border", "result": "W", "score": "4:0", "rp": 2075, "drp": 24, "k": 0, "d": 1, "a": 1, "hs": 0.0, "badges": []},
    {"date": "Jun 20", "map": "Bank", "result": "L", "score": "1:4", "rp": 2051, "drp": -26, "k": 3, "d": 5, "a": 0, "hs": 33.3, "badges": ["Victim", "2K"]},
]

MATTICUS_NEW = [
    {"date": "Jun 21", "map": "Clubhouse", "result": "W", "score": "2:0", "rp": 2181, "drp": 25, "k": 0, "d": 2, "a": 2, "hs": 0.0, "badges": ["Victim"]},
    {"date": "Jun 21", "map": "Outback", "result": "L", "score": "0:4", "rp": 2156, "drp": -24, "k": 1, "d": 4, "a": 1, "hs": 100.0, "badges": ["Victim"]},
    {"date": "Jun 20", "map": "Fortress", "result": "W", "score": "5:4", "rp": 2180, "drp": 26, "k": 7, "d": 5, "a": 3, "hs": 57.1, "badges": ["1v1 Lost", "2K", "2K", "2K"]},
    {"date": "Jun 20", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 2154, "drp": 28, "k": 1, "d": 0, "a": 1, "hs": 0.0, "badges": []},
]

CUNDER_NEW = [
    {"date": "Jun 23", "map": "Bank", "result": "W", "score": "5:3", "rp": 2548, "drp": 27, "k": 5, "d": 6, "a": 2, "hs": 80.0, "badges": ["1v2 Lost", "2K"]},
    {"date": "Jun 22", "map": "Chalet", "result": "L", "score": "0:4", "rp": 2521, "drp": -26, "k": 4, "d": 4, "a": 0, "hs": 25.0, "badges": ["4K", "1v1 Lost"]},
    {"date": "Jun 21", "map": "Consulate", "result": "W", "score": "4:1", "rp": 2547, "drp": 27, "k": 3, "d": 2, "a": 0, "hs": 0.0, "badges": []},
    {"date": "Jun 21", "map": "Oregon", "result": "L", "score": "4:5", "rp": 2520, "drp": -25, "k": 4, "d": 6, "a": 3, "hs": 50.0, "badges": ["1v3 Lost"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "L", "score": "3:5", "rp": 2545, "drp": -26, "k": 1, "d": 7, "a": 2, "hs": 0.0, "badges": ["1v2 Lost", "1v3 Lost"]},
    {"date": "Jun 21", "map": "Coastline", "result": "W", "score": "5:3", "rp": 2571, "drp": 25, "k": 3, "d": 5, "a": 2, "hs": 0.0, "badges": []},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 2546, "drp": 23, "k": 5, "d": 5, "a": 2, "hs": 0.0, "badges": ["3K", "1v3 Lost"]},
    {"date": "Jun 21", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 2523, "drp": 23, "k": 3, "d": 3, "a": 3, "hs": 66.7, "badges": ["2K"]},
    {"date": "Jun 21", "map": "Outback", "result": "L", "score": "0:4", "rp": 2500, "drp": -21, "k": 1, "d": 4, "a": 0, "hs": 0.0, "badges": ["1v1 Lost", "Victim"]},
    {"date": "Jun 20", "map": "Fortress", "result": "W", "score": "5:4", "rp": 2521, "drp": 24, "k": 4, "d": 7, "a": 2, "hs": 75.0, "badges": ["2K"]},
]

SANDMAN_NEW = [
    {"date": "Jun 20", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 2534, "drp": 26, "k": 4, "d": 1, "a": 1, "hs": 50.0, "badges": ["2K"]},
    {"date": "Jun 20", "map": "Consulate", "result": "L", "score": "2:4", "rp": 2508, "drp": -26, "k": 2, "d": 4, "a": 3, "hs": 0.0, "badges": ["TK"]},
    {"date": "Jun 20", "map": "Calypso Casino", "result": "W", "score": "4:1", "rp": 2534, "drp": 21, "k": 5, "d": 2, "a": 2, "hs": 0.0, "badges": ["4K"]},
    {"date": "Jun 20", "map": "Emerald Plains", "result": "W", "score": "4:2", "rp": 2513, "drp": 22, "k": 4, "d": 4, "a": 1, "hs": 0.0, "badges": []},
    {"date": "Jun 20", "map": "Border", "result": "W", "score": "4:0", "rp": 2491, "drp": 22, "k": 2, "d": 1, "a": 1, "hs": 0.0, "badges": []},
    {"date": "Jun 20", "map": "Bank", "result": "L", "score": "1:4", "rp": 2469, "drp": -28, "k": 3, "d": 4, "a": 0, "hs": 66.7, "badges": ["2K", "1v3 Lost"]},
]

SLACK_NEW = [
    {"date": "Jun 22", "map": "Outback", "result": "L", "score": "1:4", "rp": 2349, "drp": -26, "k": 0, "d": 5, "a": 0, "hs": 0.0, "badges": ["Victim"]},
    {"date": "Jun 22", "map": "Chalet", "result": "L", "score": "0:4", "rp": 2375, "drp": -25, "k": 1, "d": 4, "a": 0, "hs": 100.0, "badges": ["Victim"]},
    {"date": "Jun 21", "map": "Oregon", "result": "L", "score": "4:5", "rp": 2400, "drp": -15, "k": 10, "d": 6, "a": 4, "hs": 20.0, "badges": ["4K", "1v1 Clutch"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "L", "score": "3:5", "rp": 2415, "drp": -25, "k": 7, "d": 5, "a": 0, "hs": 42.9, "badges": ["3K", "2K"]},
    {"date": "Jun 21", "map": "Coastline", "result": "W", "score": "5:3", "rp": 2440, "drp": 25, "k": 14, "d": 7, "a": 1, "hs": 35.7, "badges": ["4K", "1v1 Clutch"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 2415, "drp": 24, "k": 6, "d": 5, "a": 3, "hs": 83.3, "badges": ["2K"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 2391, "drp": 24, "k": 8, "d": 2, "a": 2, "hs": 37.5, "badges": ["3K", "2K", "2K"]},
    {"date": "Jun 21", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 2367, "drp": 24, "k": 9, "d": 2, "a": 1, "hs": 55.6, "badges": ["3K", "2K", "2K", "2K"]},
    {"date": "Jun 21", "map": "Outback", "result": "L", "score": "0:4", "rp": 2343, "drp": -25, "k": 2, "d": 4, "a": 1, "hs": 50.0, "badges": ["Victim"]},
    {"date": "Jun 20", "map": "Fortress", "result": "W", "score": "5:4", "rp": 2368, "drp": 25, "k": 13, "d": 9, "a": 1, "hs": 38.5, "badges": ["3K", "Victim"]},
    {"date": "Jun 20", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 2343, "drp": 27, "k": 9, "d": 2, "a": 3, "hs": 33.3, "badges": ["3K", "2K", "2K", "2K"]},
    {"date": "Jun 20", "map": "Consulate", "result": "L", "score": "2:4", "rp": 2316, "drp": -25, "k": 3, "d": 6, "a": 0, "hs": 100.0, "badges": ["3K", "TK"]},
    {"date": "Jun 20", "map": "Calypso Casino", "result": "W", "score": "4:1", "rp": 2341, "drp": 22, "k": 7, "d": 3, "a": 1, "hs": 57.1, "badges": ["Ace"]},
    {"date": "Jun 20", "map": "Emerald Plains", "result": "W", "score": "4:2", "rp": 2319, "drp": 23, "k": 7, "d": 6, "a": 1, "hs": 100.0, "badges": ["Victim", "2K", "2K"]},
    {"date": "Jun 20", "map": "Border", "result": "W", "score": "4:0", "rp": 2296, "drp": 23, "k": 9, "d": 2, "a": 1, "hs": 33.3, "badges": ["3K", "2K", "2K"]},
    {"date": "Jun 20", "map": "Bank", "result": "L", "score": "1:4", "rp": 2273, "drp": -27, "k": 5, "d": 4, "a": 1, "hs": 20.0, "badges": ["Ace"]},
]

MJESTER_NEW = [
    {"date": "Jun 23", "map": "Calypso Casino", "result": "L", "score": "4:5", "rp": 1700, "drp": -24, "k": 4, "d": 9, "a": 6, "hs": 25.0, "badges": ["Victim", "2K", "2K"]},
    {"date": "Jun 23", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 1724, "drp": 24, "k": 8, "d": 2, "a": 2, "hs": 12.5, "badges": ["3K", "3K"]},
    {"date": "Jun 23", "map": "Outback", "result": "L", "score": "0:4", "rp": 1700, "drp": -1, "k": 0, "d": 4, "a": 1, "hs": 0.0, "badges": ["Victim"]},
    {"date": "Jun 22", "map": "Coastline", "result": "W", "score": "4:2", "rp": 1701, "drp": 25, "k": 4, "d": 4, "a": 3, "hs": 25.0, "badges": ["2K", "2K"]},
    {"date": "Jun 22", "map": "Calypso Casino", "result": "L", "score": "1:4", "rp": 1676, "drp": -24, "k": 7, "d": 4, "a": 2, "hs": 14.3, "badges": ["3K", "3K"]},
    {"date": "Jun 22", "map": "Emerald Plains", "result": "L", "score": "1:4", "rp": 1700, "drp": -13, "k": 9, "d": 4, "a": 2, "hs": 33.3, "badges": ["3K", "2K", "2K"]},
    {"date": "Jun 21", "map": "Coastline", "result": "W", "score": "5:3", "rp": 1713, "drp": 29, "k": 2, "d": 6, "a": 3, "hs": 50.0, "badges": ["1v3 Lost"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 1684, "drp": 28, "k": 2, "d": 3, "a": 0, "hs": 50.0, "badges": ["1v3 Lost"]},
    {"date": "Jun 21", "map": "Calypso Casino", "result": "W", "score": "4:2", "rp": 1656, "drp": 28, "k": 3, "d": 4, "a": 2, "hs": 33.3, "badges": ["3K", "1v3 Lost"]},
    {"date": "Jun 21", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 1628, "drp": 28, "k": 3, "d": 0, "a": 1, "hs": 66.7, "badges": []},
    {"date": "Jun 21", "map": "Outback", "result": "L", "score": "0:4", "rp": 1600, "drp": -18, "k": 3, "d": 4, "a": 0, "hs": 33.3, "badges": ["TK", "Victim"]},
    {"date": "Jun 20", "map": "Fortress", "result": "W", "score": "5:4", "rp": 1618, "drp": 29, "k": 7, "d": 7, "a": 3, "hs": 28.6, "badges": ["3K", "1v1 Lost"]},
    {"date": "Jun 20", "map": "Clubhouse", "result": "W", "score": "4:0", "rp": 1589, "drp": 31, "k": 4, "d": 1, "a": 0, "hs": 25.0, "badges": ["2K"]},
    {"date": "Jun 20", "map": "Consulate", "result": "L", "score": "2:4", "rp": 1558, "drp": -22, "k": 3, "d": 6, "a": 3, "hs": 100.0, "badges": ["Victim", "2K"]},
    {"date": "Jun 20", "map": "Calypso Casino", "result": "W", "score": "4:1", "rp": 1580, "drp": 26, "k": 1, "d": 2, "a": 2, "hs": 100.0, "badges": ["1v3 Lost"]},
    {"date": "Jun 20", "map": "Emerald Plains", "result": "W", "score": "4:2", "rp": 1554, "drp": 27, "k": 4, "d": 3, "a": 1, "hs": 50.0, "badges": ["2K"]},
    {"date": "Jun 20", "map": "Border", "result": "W", "score": "4:0", "rp": 1527, "drp": 27, "k": 1, "d": 1, "a": 2, "hs": 100.0, "badges": []},
    {"date": "Jun 20", "map": "Bank", "result": "L", "score": "1:4", "rp": 1500, "drp": -14, "k": 2, "d": 4, "a": 4, "hs": 0.0, "badges": ["2K"]},
    {"date": "Jun 20", "map": "Calypso Casino", "result": "W", "score": "5:3", "rp": 1514, "drp": 25, "k": 6, "d": 4, "a": 0, "hs": 66.7, "badges": ["3K"]},
]

BLANG_NEW = [
    {"date": "Jun 23", "map": "Bank", "result": "W", "score": "5:3", "rp": 3048, "drp": 24, "k": 5, "d": 8, "a": 3, "hs": 60.0, "badges": ["Victim", "2K", "2K"]},
    {"date": "Jun 23", "map": "Chalet", "result": "L", "score": "2:4", "rp": 3024, "drp": -25, "k": 0, "d": 6, "a": 1, "hs": 0.0, "badges": ["Victim"]},
    {"date": "Jun 23", "map": "Kafe Dostoyevsky", "result": "W", "score": "4:1", "rp": 3049, "drp": 24, "k": 5, "d": 3, "a": 2, "hs": 80.0, "badges": ["1v2 Clutch", "3K"]},
    {"date": "Jun 23", "map": "Oregon", "result": "L", "score": "4:5", "rp": 3025, "drp": -23, "k": 6, "d": 8, "a": 1, "hs": 66.7, "badges": ["2K"]},
    {"date": "Jun 22", "map": "Oregon", "result": "W", "score": "5:3", "rp": 3048, "drp": 24, "k": 8, "d": 6, "a": 1, "hs": 75.0, "badges": ["2K", "2K", "2K"]},
    {"date": "Jun 21", "map": "Consulate", "result": "W", "score": "4:1", "rp": 3024, "drp": 24, "k": 5, "d": 1, "a": 1, "hs": 80.0, "badges": ["2K"]},
    {"date": "Jun 21", "map": "Oregon", "result": "L", "score": "4:5", "rp": 3000, "drp": -1, "k": 11, "d": 7, "a": 1, "hs": 72.7, "badges": ["4K", "3K"]},
    {"date": "Jun 21", "map": "RP Rollback", "result": "RB", "score": "—", "rp": 3001, "drp": 1, "k": 0, "d": 0, "a": 0, "hs": 0, "badges": []},
]

# Operator data tuples from paste
ROGUE_OPS = parse_op([
    ("Mute", 56, 44.6, 0.77, 33.3, 25, 31, 33, 43, 14, 0, 0),
    ("Nomad", 36, 50.0, 1.22, 50.0, 18, 18, 28, 23, 10, 0, 0),
    ("Dokkaebi", 26, 46.2, 1.06, 16.7, 12, 14, 18, 17, 12, 0, 0),
    ("Kaid", 19, 63.2, 1.00, 38.5, 12, 7, 13, 13, 5, 0, 0),
    ("Thorn", 13, 53.8, 0.89, 37.5, 7, 6, 8, 9, 7, 0, 0),
    ("Jackal", 11, 63.6, 3.00, 60.0, 7, 4, 15, 5, 1, 0, 0),
    ("Gridlock", 9, 22.2, 0.75, 16.7, 2, 7, 6, 8, 3, 0, 0),
    ("Ace", 7, 42.9, 1.25, 40.0, 3, 4, 5, 4, 1, 0, 0),
    ("Kapkan", 7, 71.4, 2.33, 28.6, 5, 2, 7, 3, 4, 0, 0),
    ("Lion", 6, 50.0, 1.00, 66.7, 3, 3, 3, 3, 1, 0, 1),
    ("Alibi", 6, 50.0, 1.33, 25.0, 3, 3, 4, 3, 0, 0, 0),
    ("Smoke", 4, 100.0, 1.00, 0.0, 4, 0, 3, 3, 1, 0, 0),
    ("Denari", 4, 25.0, 0.25, 100.0, 1, 3, 1, 4, 2, 0, 0),
    ("Fuze", 3, 0.0, 0.67, 100.0, 0, 3, 2, 3, 0, 0, 0),
    ("Valkyrie", 3, 33.3, 0.67, 50.0, 1, 2, 2, 3, 1, 0, 0),
    ("Brava", 3, 33.3, 2.50, 60.0, 1, 2, 5, 2, 1, 0, 0),
    ("Ying", 3, 66.7, 1.00, 33.3, 2, 1, 3, 3, 1, 0, 0),
    ("Hibana", 2, 50.0, 1.00, 50.0, 1, 1, 2, 2, 1, 0, 0),
    ("Buck", 2, 50.0, 0.00, 0.0, 1, 1, 0, 2, 2, 0, 0),
    ("Maverick", 2, 100.0, 1.00, 0.0, 2, 0, 1, 1, 0, 0, 0),
    ("Caveira", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 1, 0, 0),
    ("Azami", 2, 100.0, 1.00, 0.0, 2, 0, 1, 1, 2, 0, 0),
    ("Mozzie", 2, 50.0, 1.00, 100.0, 1, 1, 1, 1, 0, 0, 0),
    ("Ram", 2, 50.0, 2.00, 50.0, 1, 1, 2, 1, 0, 0, 0),
    ("Pulse", 2, 50.0, 1.50, 0.0, 1, 1, 3, 2, 0, 0, 0),
    ("Rook", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Capitão", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Aruni", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Melusi", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Thermite", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Thatcher", 1, 100.0, 2.00, 50.0, 1, 0, 2, 0, 0, 0, 0),
    ("Blackbeard", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 1, 0, 0),
    ("Fenrir", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
])

LCEW_OPS = parse_op([
    ("Jackal", 30, 36.7, 1.05, 54.5, 11, 19, 22, 21, 7, 0, 0),
    ("Nomad", 24, 33.3, 0.78, 14.3, 8, 16, 14, 18, 3, 0, 0),
    ("Kaid", 17, 82.4, 4.00, 35.0, 14, 3, 20, 5, 7, 0, 0),
    ("Mute", 16, 43.8, 0.73, 12.5, 7, 9, 8, 11, 5, 0, 0),
    ("Valkyrie", 16, 68.8, 1.86, 46.2, 11, 5, 13, 7, 5, 0, 0),
    ("Kapkan", 10, 70.0, 1.60, 25.0, 7, 3, 8, 5, 8, 0, 0),
    ("Thorn", 8, 62.5, 0.83, 60.0, 5, 3, 5, 6, 3, 0, 0),
    ("Ace", 6, 33.3, 1.25, 40.0, 2, 4, 5, 4, 2, 0, 0),
    ("Gridlock", 4, 0.0, 0.75, 33.3, 0, 4, 3, 4, 2, 0, 0),
    ("Thermite", 3, 33.3, 0.50, 0.0, 1, 2, 1, 2, 0, 0, 0),
    ("Sledge", 3, 33.3, 1.00, 66.7, 1, 2, 3, 3, 0, 0, 0),
    ("Aruni", 3, 0.0, 1.67, 20.0, 0, 3, 5, 3, 0, 0, 0),
    ("Thatcher", 3, 66.7, 1.00, 0.0, 2, 1, 1, 1, 0, 0, 0),
    ("Dokkaebi", 2, 50.0, 2.00, 0.0, 1, 1, 2, 1, 1, 0, 0),
    ("Mozzie", 2, 50.0, 0.00, 0.0, 1, 1, 0, 1, 1, 0, 0),
    ("Thunderbird", 2, 50.0, 5.00, 60.0, 1, 1, 5, 1, 0, 0, 0),
    ("Lion", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Echo", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
    ("Melusi", 1, 100.0, 1.00, 0.0, 1, 0, 1, 0, 0, 0, 0),
    ("Azami", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Maestro", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
    ("Fuze", 1, 0.0, 2.00, 50.0, 0, 1, 2, 1, 0, 0, 0),
    ("Twitch", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Finka", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Bandit", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Zero", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
])

MATTICUS_OPS = parse_op([
    ("Skopós", 23, 69.6, 0.56, 44.4, 16, 7, 9, 16, 5, 0, 0),
    ("Finka", 12, 66.7, 1.50, 66.7, 8, 4, 9, 6, 3, 0, 0),
    ("Alibi", 12, 75.0, 1.00, 60.0, 9, 3, 10, 10, 2, 0, 0),
    ("Sens", 9, 55.6, 1.20, 50.0, 5, 4, 6, 5, 5, 0, 0),
    ("Deimos", 7, 57.1, 1.33, 0.0, 4, 3, 4, 3, 2, 0, 0),
    ("Ram", 3, 0.0, 0.33, 100.0, 0, 3, 1, 3, 0, 0, 0),
    ("Iana", 3, 66.7, 2.00, 50.0, 2, 1, 4, 2, 1, 0, 0),
    ("Pulse", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 2, 0, 0),
    ("Thermite", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 3, 0, 0),
    ("Goyo", 2, 50.0, 0.50, 0.0, 1, 1, 1, 2, 1, 0, 0),
    ("Striker", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 1, 0, 0),
    ("Valkyrie", 1, 0.0, 1.00, 0.0, 0, 1, 1, 0, 0, 0, 0),
    ("Lesion", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Glaz", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Clash", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Flores", 1, 0.0, 0.00, 0.0, 0, 1, 0, 0, 0, 0, 0),
    ("Solis", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("IQ", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Blackbeard", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Montagne", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Jäger", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 1, 0, 0),
    ("Lion", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Echo", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 0, 0, 0),
    ("Kali", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
])

CUNDER_OPS = parse_op([
    ("Tachanka", 111, 63.1, 0.93, 21.1, 70, 41, 71, 76, 37, 0, 0),
    ("Zero", 95, 45.3, 0.85, 53.3, 43, 52, 60, 71, 21, 0, 0),
    ("Solid Snake", 11, 9.1, 0.56, 80.0, 1, 10, 5, 9, 0, 0, 0),
    ("Jackal", 7, 42.9, 2.75, 63.6, 3, 4, 11, 4, 0, 0, 0),
    ("Bandit", 7, 42.9, 0.67, 25.0, 3, 4, 4, 6, 2, 0, 0),
    ("Twitch", 6, 66.7, 5.00, 30.0, 4, 2, 10, 2, 1, 0, 0),
    ("Sentry", 4, 50.0, 1.00, 66.7, 2, 2, 3, 3, 1, 0, 0),
    ("Thunderbird", 4, 50.0, 1.00, 0.0, 2, 2, 2, 2, 0, 0, 0),
    ("Striker", 4, 50.0, 1.25, 20.0, 2, 2, 5, 4, 0, 0, 0),
    ("Brava", 2, 50.0, 0.00, 0.0, 1, 1, 0, 1, 0, 0, 0),
    ("Mozzie", 2, 100.0, 1.00, 0.0, 2, 0, 1, 1, 1, 0, 0),
    ("Kapkan", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Capitão", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
])

SANDMAN_OPS = parse_op([
    ("Sledge", 61, 52.5, 1.29, 31.7, 32, 29, 63, 49, 19, 0, 0),
    ("Kaid", 28, 67.9, 1.22, 31.8, 19, 9, 22, 18, 7, 0, 0),
    ("Frost", 24, 70.8, 1.12, 16.7, 17, 7, 18, 16, 10, 0, 0),
    ("Thorn", 19, 47.4, 1.57, 22.7, 9, 10, 22, 14, 7, 0, 0),
    ("Aruni", 16, 50.0, 0.86, 58.3, 8, 8, 12, 14, 7, 0, 0),
    ("Blitz", 15, 40.0, 0.77, 20.0, 6, 9, 10, 13, 2, 0, 0),
    ("Fuze", 13, 30.8, 1.10, 36.4, 4, 9, 11, 10, 1, 0, 0),
    ("Kali", 13, 46.2, 1.20, 41.7, 6, 7, 12, 10, 2, 0, 0),
    ("Denari", 11, 100.0, 2.50, 40.0, 11, 0, 10, 4, 6, 0, 0),
    ("Rauora", 10, 30.0, 0.50, 0.0, 3, 7, 5, 10, 3, 0, 0),
    ("Fenrir", 8, 50.0, 2.00, 75.0, 4, 4, 8, 4, 1, 0, 0),
    ("Melusi", 8, 50.0, 1.60, 75.0, 4, 4, 8, 5, 1, 0, 0),
    ("Mute", 8, 50.0, 0.86, 33.3, 4, 4, 6, 7, 1, 0, 0),
    ("Dokkaebi", 7, 57.1, 1.20, 0.0, 4, 3, 6, 5, 2, 0, 0),
    ("Brava", 5, 20.0, 1.67, 20.0, 1, 4, 5, 3, 0, 0, 0),
    ("Amaru", 4, 25.0, 0.50, 100.0, 1, 3, 2, 4, 3, 0, 0),
    ("Pulse", 4, 75.0, 2.00, 0.0, 3, 1, 4, 2, 1, 0, 0),
    ("Tubarão", 4, 75.0, 2.00, 25.0, 3, 1, 4, 2, 2, 0, 1),
    ("Bandit", 3, 33.3, 2.50, 0.0, 1, 2, 5, 2, 0, 0, 0),
    ("Kapkan", 3, 33.3, 0.33, 100.0, 1, 2, 1, 3, 0, 0, 0),
    ("Valkyrie", 3, 66.7, 6.00, 50.0, 2, 1, 6, 1, 0, 0, 0),
    ("Azami", 3, 66.7, 0.50, 0.0, 2, 1, 1, 2, 1, 0, 0),
    ("Ying", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 0, 0, 0),
    ("Osa", 2, 50.0, 1.00, 50.0, 1, 1, 2, 2, 1, 0, 0),
    ("Maestro", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 0, 0, 0),
    ("Doc", 1, 100.0, 2.00, 50.0, 1, 0, 2, 0, 1, 0, 0),
    ("IQ", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 0, 0, 0),
    ("Thermite", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Montagne", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Grim", 1, 0.0, 2.00, 50.0, 0, 1, 2, 1, 0, 0, 0),
    ("Blackbeard", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Gridlock", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Thunderbird", 1, 100.0, 1.00, 0.0, 1, 0, 1, 1, 0, 0, 0),
    ("Jackal", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
])

SLACK_OPS = parse_op([
    ("Doc", 41, 58.5, 1.24, 59.5, 24, 17, 42, 34, 7, 0, 1),
    ("Osa", 36, 41.7, 1.33, 57.5, 15, 21, 40, 30, 7, 1, 0),
    ("Aruni", 34, 67.6, 1.92, 42.0, 23, 11, 50, 26, 7, 2, 0),
    ("Thermite", 22, 45.5, 1.18, 45.0, 10, 12, 20, 17, 7, 0, 0),
    ("Smoke", 14, 42.9, 1.09, 58.3, 6, 8, 12, 11, 2, 0, 0),
    ("Hibana", 13, 46.2, 1.50, 50.0, 6, 7, 12, 8, 4, 0, 0),
    ("Ace", 11, 54.5, 1.11, 70.0, 6, 5, 10, 9, 1, 0, 0),
    ("Kaid", 10, 60.0, 0.71, 40.0, 6, 4, 5, 7, 2, 0, 0),
    ("Brava", 9, 44.4, 0.86, 0.0, 4, 5, 6, 7, 3, 0, 0),
    ("Blitz", 8, 25.0, 0.57, 100.0, 2, 6, 4, 7, 1, 0, 1),
    ("Blackbeard", 8, 62.5, 0.80, 25.0, 5, 3, 4, 5, 1, 0, 0),
    ("Warden", 8, 62.5, 1.20, 66.7, 5, 3, 6, 5, 3, 0, 0),
    ("Bandit", 6, 66.7, 5.00, 30.0, 4, 2, 10, 2, 0, 0, 0),
    ("Caveira", 5, 100.0, 1.67, 0.0, 5, 0, 5, 3, 1, 0, 0),
    ("Jackal", 4, 0.0, 0.25, 100.0, 0, 4, 1, 4, 2, 0, 0),
    ("Rauora", 4, 100.0, 1.50, 66.7, 4, 0, 3, 2, 1, 0, 0),
    ("Thorn", 4, 50.0, 0.67, 0.0, 2, 2, 2, 3, 0, 0, 0),
    ("Iana", 4, 25.0, 1.25, 60.0, 1, 3, 5, 4, 1, 0, 0),
    ("Tubarão", 3, 0.0, 0.33, 0.0, 0, 3, 1, 3, 0, 0, 0),
    ("Dokkaebi", 2, 50.0, 1.00, 0.0, 1, 1, 1, 1, 0, 0, 0),
    ("Thunderbird", 2, 100.0, 2.00, 0.0, 2, 0, 2, 0, 1, 0, 0),
    ("Kapkan", 2, 100.0, 1.50, 33.3, 2, 0, 3, 2, 0, 0, 0),
    ("Montagne", 2, 100.0, 0.00, 0.0, 2, 0, 0, 1, 0, 0, 0),
    ("Mute", 2, 50.0, 0.50, 100.0, 1, 1, 1, 2, 1, 0, 0),
    ("Zero", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 0, 0, 1),
    ("Jäger", 2, 100.0, 1.50, 33.3, 2, 0, 3, 2, 0, 0, 0),
    ("Azami", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
    ("Lesion", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 1, 0, 0),
    ("Castle", 1, 100.0, 1.00, 0.0, 1, 0, 1, 1, 1, 0, 0),
    ("Deimos", 1, 100.0, 0.00, 0.0, 1, 0, 0, 0, 0, 0, 0),
    ("Kali", 1, 100.0, 1.00, 100.0, 1, 0, 1, 1, 0, 0, 0),
    ("Fenrir", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Ying", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Grim", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
    ("Zofia", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Valkyrie", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Clash", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Echo", 1, 100.0, 3.00, 33.3, 1, 0, 3, 1, 0, 0, 0),
    ("Rook", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
])

MJESTER_OPS = parse_op([
    ("Thorn", 153, 60.8, 1.21, 35.1, 93, 60, 114, 94, 63, 0, 0),
    ("Denari", 101, 51.5, 0.55, 68.9, 52, 49, 45, 82, 34, 0, 1),
    ("Dokkaebi", 68, 45.6, 0.88, 39.5, 31, 37, 38, 43, 24, 0, 0),
    ("Montagne", 43, 53.5, 0.48, 16.7, 23, 20, 12, 25, 1, 0, 0),
    ("Zero", 39, 43.6, 0.81, 22.7, 17, 22, 22, 27, 3, 0, 0),
    ("Gridlock", 32, 50.0, 0.60, 26.7, 16, 16, 15, 25, 7, 0, 1),
    ("Lion", 27, 55.6, 0.75, 40.0, 15, 12, 15, 20, 6, 0, 0),
    ("Kaid", 24, 54.2, 0.61, 0.0, 13, 11, 11, 18, 2, 0, 0),
    ("Fuze", 23, 43.5, 1.00, 31.2, 10, 13, 16, 16, 8, 0, 0),
    ("Osa", 16, 43.8, 0.23, 33.3, 7, 9, 3, 13, 5, 0, 0),
    ("Azami", 14, 28.6, 0.50, 83.3, 4, 10, 6, 12, 1, 0, 0),
    ("Thatcher", 13, 76.9, 1.80, 33.3, 10, 3, 9, 5, 0, 0, 0),
    ("Kapkan", 13, 53.8, 1.44, 46.2, 7, 6, 13, 9, 2, 0, 0),
    ("Ying", 12, 41.7, 1.00, 50.0, 5, 7, 8, 8, 3, 0, 0),
    ("Smoke", 10, 30.0, 0.75, 16.7, 3, 7, 6, 8, 1, 0, 0),
    ("Ram", 9, 55.6, 0.67, 50.0, 5, 4, 4, 6, 2, 0, 0),
    ("Rauora", 8, 37.5, 0.33, 50.0, 3, 5, 2, 6, 1, 0, 0),
    ("Maestro", 7, 85.7, 1.00, 100.0, 6, 1, 2, 2, 7, 0, 0),
    ("Brava", 7, 42.9, 0.25, 0.0, 3, 4, 1, 4, 0, 0, 0),
    ("Capitão", 7, 57.1, 0.14, 0.0, 4, 3, 1, 7, 2, 0, 0),
    ("Fenrir", 7, 57.1, 1.00, 40.0, 4, 3, 5, 5, 2, 0, 0),
    ("Frost", 5, 80.0, 1.33, 50.0, 4, 1, 4, 3, 4, 0, 0),
    ("Amaru", 5, 100.0, 1.25, 0.0, 5, 0, 5, 4, 1, 0, 0),
    ("Sledge", 4, 50.0, 2.00, 50.0, 2, 2, 6, 3, 0, 0, 0),
    ("Mute", 4, 25.0, 2.00, 16.7, 1, 3, 6, 3, 0, 0, 0),
    ("Maverick", 4, 50.0, 0.33, 0.0, 2, 2, 1, 3, 1, 0, 0),
    ("Tachanka", 3, 66.7, 0.00, 0.0, 2, 1, 0, 2, 1, 0, 0),
    ("Castle", 2, 50.0, 5.00, 20.0, 1, 1, 5, 1, 0, 0, 0),
    ("Flores", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 0, 0, 0),
    ("Lesion", 2, 50.0, 0.00, 0.0, 1, 1, 0, 1, 4, 0, 0),
    ("Aruni", 2, 50.0, 0.00, 0.0, 1, 1, 0, 2, 0, 0, 0),
    ("Grim", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 0, 0, 0),
    ("Bandit", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Wamai", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 1, 0, 0),
    ("IQ", 1, 0.0, 0.00, 0.0, 0, 1, 0, 0, 0, 0, 0),
    ("Ace", 1, 0.0, 2.00, 50.0, 0, 1, 2, 0, 0, 0, 0),
    ("Mozzie", 1, 100.0, 3.00, 33.3, 1, 0, 3, 0, 0, 0, 0),
    ("Thermite", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
    ("Solis", 1, 100.0, 0.00, 0.0, 1, 0, 0, 1, 0, 0, 0),
    ("Nomad", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Thunderbird", 1, 100.0, 3.00, 33.3, 1, 0, 3, 0, 0, 0, 0),
    ("Jäger", 1, 100.0, 1.00, 0.0, 1, 0, 1, 0, 1, 0, 0),
    ("Buck", 1, 100.0, 2.00, 0.0, 1, 0, 2, 0, 0, 0, 0),
    ("Ela", 1, 100.0, 1.00, 100.0, 1, 0, 1, 0, 1, 0, 0),
    ("Alibi", 1, 0.0, 1.00, 0.0, 0, 1, 1, 1, 0, 0, 0),
    ("Melusi", 1, 100.0, 1.00, 0.0, 1, 0, 1, 0, 0, 0, 0),
])

BLANG_OPS = parse_op([
    ("Finka", 114, 50.0, 0.98, 56.0, 57, 57, 84, 86, 26, 1, 0),
    ("Oryx", 94, 57.4, 1.04, 73.3, 54, 40, 75, 72, 23, 0, 0),
    ("Thunderbird", 93, 59.1, 1.26, 55.8, 55, 38, 77, 61, 30, 1, 1),
    ("Dokkaebi", 92, 42.4, 0.62, 46.7, 39, 53, 45, 72, 18, 0, 0),
    ("Ash", 57, 49.1, 0.70, 69.7, 28, 29, 33, 47, 13, 0, 0),
    ("Aruni", 36, 52.8, 1.20, 50.0, 19, 17, 30, 25, 8, 0, 0),
    ("Nøkk", 35, 51.4, 0.58, 72.2, 18, 17, 18, 31, 7, 0, 1),
    ("Mute", 29, 55.2, 0.65, 73.3, 16, 13, 15, 23, 8, 0, 0),
    ("Doc", 25, 72.0, 2.33, 64.3, 18, 7, 28, 12, 3, 0, 0),
    ("Thermite", 25, 48.0, 0.63, 33.3, 12, 13, 12, 19, 6, 0, 0),
    ("Valkyrie", 22, 45.5, 1.00, 62.5, 10, 12, 16, 16, 5, 0, 0),
    ("Azami", 20, 70.0, 1.44, 65.2, 14, 6, 23, 16, 5, 0, 0),
    ("Sentry", 18, 22.2, 0.41, 42.9, 4, 14, 7, 17, 5, 0, 0),
    ("Kaid", 17, 64.7, 0.85, 27.3, 11, 6, 11, 13, 3, 0, 0),
    ("Solid Snake", 17, 35.3, 0.50, 71.4, 6, 11, 7, 14, 4, 0, 0),
    ("Twitch", 17, 52.9, 0.86, 83.3, 9, 8, 12, 14, 6, 0, 0),
    ("Tubarão", 14, 42.9, 1.00, 33.3, 6, 8, 12, 12, 5, 0, 0),
    ("Sledge", 13, 61.5, 0.75, 44.4, 8, 5, 9, 12, 5, 0, 1),
    ("Ela", 13, 46.2, 0.67, 75.0, 6, 7, 8, 12, 2, 0, 0),
    ("Blackbeard", 11, 36.4, 0.30, 66.7, 4, 7, 3, 10, 0, 0, 1),
    ("Bandit", 11, 81.8, 0.83, 60.0, 9, 2, 5, 6, 1, 0, 0),
    ("Thorn", 11, 27.3, 0.67, 33.3, 3, 8, 6, 9, 3, 0, 0),
    ("Lesion", 11, 36.4, 1.14, 87.5, 4, 7, 8, 7, 1, 0, 0),
    ("Lion", 11, 45.5, 1.12, 66.7, 5, 6, 9, 8, 2, 0, 0),
    ("Castle", 9, 55.6, 0.29, 50.0, 5, 4, 2, 7, 2, 0, 0),
    ("Vigil", 9, 66.7, 0.89, 87.5, 6, 3, 8, 9, 4, 0, 0),
    ("Solis", 8, 62.5, 1.00, 50.0, 5, 3, 6, 6, 1, 0, 0),
    ("Blitz", 8, 25.0, 0.29, 0.0, 2, 6, 2, 7, 2, 0, 0),
    ("Ace", 7, 57.1, 2.00, 50.0, 4, 3, 6, 3, 1, 0, 1),
    ("Caveira", 7, 85.7, 1.50, 0.0, 6, 1, 6, 4, 2, 0, 0),
    ("Hibana", 6, 50.0, 0.33, 0.0, 3, 3, 2, 6, 1, 0, 0),
    ("Iana", 6, 50.0, 0.75, 33.3, 3, 3, 3, 4, 3, 0, 0),
    ("Thatcher", 6, 66.7, 1.50, 100.0, 4, 2, 6, 4, 1, 0, 0),
    ("Mira", 5, 20.0, 0.20, 100.0, 1, 4, 1, 5, 0, 0, 0),
    ("Nomad", 5, 20.0, 0.60, 66.7, 1, 4, 3, 5, 1, 0, 0),
    ("Deimos", 5, 40.0, 0.75, 66.7, 2, 3, 3, 4, 0, 0, 0),
    ("Brava", 4, 75.0, 0.50, 100.0, 3, 1, 1, 2, 0, 0, 0),
    ("Kali", 4, 25.0, 1.00, 0.0, 1, 3, 2, 2, 1, 0, 0),
    ("Smoke", 4, 25.0, 0.75, 66.7, 1, 3, 3, 4, 0, 0, 0),
    ("Warden", 4, 75.0, 1.67, 40.0, 3, 1, 5, 3, 0, 0, 0),
    ("Goyo", 3, 33.3, 0.00, 0.0, 1, 2, 0, 3, 1, 0, 0),
    ("Striker", 3, 66.7, 0.00, 0.0, 2, 1, 0, 3, 0, 0, 0),
    ("Jackal", 3, 66.7, 0.00, 0.0, 2, 1, 0, 3, 0, 0, 0),
    ("Melusi", 3, 66.7, 0.33, 100.0, 2, 1, 1, 3, 2, 0, 0),
    ("Maverick", 3, 0.0, 0.00, 0.0, 0, 3, 0, 3, 0, 0, 0),
    ("Osa", 2, 50.0, 1.00, 100.0, 1, 1, 1, 1, 0, 0, 0),
    ("Rauora", 2, 0.0, 0.00, 0.0, 0, 2, 0, 2, 0, 0, 0),
    ("Grim", 2, 100.0, 0.00, 0.0, 2, 0, 0, 1, 1, 0, 0),
    ("Capitão", 2, 0.0, 1.00, 100.0, 0, 2, 2, 2, 1, 0, 0),
    ("Echo", 2, 0.0, 0.50, 0.0, 0, 2, 1, 2, 0, 0, 0),
    ("Buck", 2, 0.0, 0.50, 100.0, 0, 2, 1, 2, 0, 0, 0),
    ("Zero", 2, 50.0, 0.50, 100.0, 1, 1, 1, 2, 1, 0, 0),
    ("Jäger", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
    ("Fenrir", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Pulse", 1, 100.0, 2.00, 100.0, 1, 0, 2, 0, 0, 0, 0),
    ("Flores", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Glaz", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 1, 0, 0),
    ("Frost", 1, 100.0, 1.00, 0.0, 1, 0, 1, 0, 0, 0, 0),
    ("Gridlock", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
    ("Ram", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Ying", 1, 0.0, 1.00, 100.0, 0, 1, 1, 1, 0, 0, 0),
    ("Maestro", 1, 100.0, 2.00, 50.0, 1, 0, 2, 0, 0, 0, 0),
    ("Fuze", 1, 0.0, 0.00, 0.0, 0, 1, 0, 1, 0, 0, 0),
])

PLAYERS = [
    ("rogue_amputee", "Rogue_Amputee", ROGUE_NEW, ROGUE_OPS, "Bronze II", 1855, 1887, "Bronze I", 45),
    ("lcew4ll0wcome", "LceW4ll0wCome", LCEW_NEW, LCEW_OPS, "Silver IV", 2182, 2191, "Silver III", 18),
    ("matticus_hq", "Matticus HQ", MATTICUS_NEW, MATTICUS_OPS, "Silver IV", 2181, 2128, "Silver III", 19),
    ("cunderthock", "CunderThock", CUNDER_NEW, CUNDER_OPS, "Gold V", 2548, 2626, "Gold IV", 52),
    ("grandmaster_sandman", "Grandmaster Sandman", SANDMAN_NEW, SANDMAN_OPS, "Gold V", 2534, 2677, "Gold IV", 66),
    ("slackandlack", "slackandlack", SLACK_NEW, SLACK_OPS, "Silver II", 2349, 2377, "Silver I", 51),
    ("mjester1337", "MJester1337", MJESTER_NEW, MJESTER_OPS, "Bronze III", 1700, 1491, "Bronze II", 100),
    ("mynameisblang", "Mynameisblang", BLANG_NEW, BLANG_OPS, "Platinum V", 3048, 3142, "Platinum IV", 52),
]


def apply_player(slug, name, new_matches, operators, rank, rp, peak, next_rank, rp_to_next):
    path = ROOT / "data" / slug / "Y11S2" / "current.md"
    data, header, _ = read_json_md(path)
    data["matches"] = merge_matches(data["matches"], new_matches)
    data["operators"] = operators
    data["badges"] = rebuild_badges(data["matches"])
    data["meta"] = compute_meta(data["matches"], rank, rp, peak, next_rank, rp_to_next)
    data["updated"] = UPDATED
    header = re.sub(r"\*\*Updated:\*\*.*", f"**Updated:** {UPDATED}", header)
    write_json_md(path, header, data)
    print(f"{slug}: {len(new_matches)} new rows attempted, meta matches={data['meta']['matches']}, rp={data['meta']['rp']}")


if __name__ == "__main__":
    for p in PLAYERS:
        apply_player(*p)
