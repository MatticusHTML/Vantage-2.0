#!/usr/bin/env python3
"""Parse Ubisoft-style match history paste into VANTAGE match JSON rows."""
import re, json, sys
from pathlib import Path

SIDE = {
    "Tachanka":"DEF","Mozzie":"DEF","Sentry":"DEF","Bandit":"DEF","Denari":"DEF",
    "Solid Snake":"DEF","Caveira":"DEF","Thunderbird":"DEF","Solis":"DEF",
    "Fenrir":"DEF","Smoke":"DEF","Echo":"DEF","Valkyrie":"DEF","Jäger":"DEF",
    "Goyo":"DEF","Clash":"DEF","Maestro":"DEF","Mute":"DEF","Sens":"DEF",
    "Twitch":"ATK","Jackal":"ATK","Striker":"ATK","Amaru":"ATK","Capitão":"ATK",
    "Montagne":"ATK","Nøkk":"ATK","Grim":"ATK","Blitz":"ATK","Finka":"ATK",
    "Brava":"ATK","Ying":"ATK","Deimos":"ATK","Zero":"ATK",
}

OP_ALIASES = {"Solid Snake":"Solid Snake","Nøkk":"Nokk","Capitão":"Capitao","Jäger":"Jager"}

KNOWN_BADGES = [
    "1v5 Clutch","1v4 Clutch","1v3 Clutch","1v2 Clutch","1v1 Clutch",
    "1v3 Lost","1v2 Lost","1v1 Lost",
    "Ace","4K","3K","2K","Victim","TK",
]

def parse_badges(text):
    if not text or text.strip() in ("", "Ranked"):
        return []
    t = text.strip()
    badges = []
    # split merged tokens like "2K x31v3 Lost" -> insert space before 1v
    t = re.sub(r"(x\d+)(1v)", r"\1 \2", t, flags=re.I)
    t = re.sub(r"(2K|3K|4K)(1v)", r"\1 \2", t, flags=re.I)
    t = re.sub(r"(Lost|Clutch)(1v)", r"\1 \2", t, flags=re.I)
    t = re.sub(r"(Clutch)(Ace)", r"\1 \2", t, flags=re.I)
    t = re.sub(r"(TK)(2K|3K|4K|1v|Ace|Victim)", r"\1 \2", t, flags=re.I)
    parts = re.split(r"\s+", t)
    i = 0
    while i < len(parts):
        p = parts[i]
        if re.match(r"^(2K|3K|4K)x(\d+)$", p, re.I):
            m = re.match(r"^(2K|3K|4K)x(\d+)$", p, re.I)
            badges.extend([m.group(1).upper().replace("k","K")] * int(m.group(2)))
            i += 1
            continue
        if p.lower().endswith("x2") and p[:-2] in ("2K","3K","4K"):
            badges.extend([p[:-2], p[:-2]])
            i += 1
            continue
        if p.lower().endswith("x3") and p[:-2] in ("2K","3K","4K"):
            badges.extend([p[:-2]] * 3)
            i += 1
            continue
        if p.lower().endswith("x4") and p[:-2] in ("2K","3K","4K"):
            badges.extend([p[:-2]] * 4)
            i += 1
            continue
        matched = False
        for b in KNOWN_BADGES:
            if p.lower() == b.lower() or p == b:
                badges.append(b)
                matched = True
                break
        if not matched and p.upper() in ("2K","3K","4K","TK","ACE"):
            badges.append("Ace" if p.upper()=="ACE" else p.upper() if p!="ACE" else "Ace")
        elif not matched and re.match(r"^1v\d", p, re.I):
            # partial clutch/lost - combine with next?
            if i + 1 < len(parts) and parts[i+1] in ("Clutch","Lost"):
                badges.append(f"{p} {parts[i+1]}")
                i += 2
                continue
        i += 1
    # normalize Ace
    out = []
    for b in badges:
        if b.upper() == "ACE": out.append("Ace")
        elif b in KNOWN_BADGES or b.startswith("1v"): out.append(b)
    return out

def parse_matches(text):
    lines = [ln.rstrip() for ln in text.splitlines()]
    matches = []
    current_date = None
    i = 0
    while i < len(lines):
        ln = lines[i].strip()
        # day header: "Jun 1" style
        if re.match(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$", ln):
            current_date = ln
            i += 1
            continue
        if not current_date:
            i += 1
            continue
        # rollback
        if ln == "Ranked" and i > 0 and "Rollback" in lines[i-1]:
            i += 1
            continue
        if "RP Rollback" in ln or (i+1 < len(lines) and lines[i+1].strip() == "RP Rollback"):
            # find RP line
            rp = drp = None
            j = i
            while j < min(i + 8, len(lines)):
                if lines[j].strip().startswith("RP") and j+1 < len(lines):
                    m = re.search(r"([\d,]+)\s*([+-][\d,]+)?", lines[j+1])
                    if m:
                        rp = int(m.group(1).replace(",",""))
                        drp = int(m.group(2).replace(",","")) if m.group(2) else 0
                        break
                j += 1
            if rp is not None:
                matches.append({
                    "date": current_date, "map": "RP Rollback", "result": "RB",
                    "score": "—", "rp": rp, "drp": drp,
                    "k": 0, "d": 0, "a": 0, "hs": 0.0, "badges": []
                })
            i = j + 1
            continue
        # map line
        m = re.match(r"^(\d+(?:mo|d|w)\s+ago)(.+)$", ln, re.I)
        if not m:
            i += 1
            continue
        map_name = m.group(2).strip()
        if map_name.lower() == "ranked":
            i += 1
            continue
        # scan forward for score, badges, rp, kda, hs
        score = result = None
        rp = drp = None
        k = d = a = hs = None
        badge_line = ""
        j = i + 1
        while j < min(i + 20, len(lines)):
            s = lines[j].strip()
            if re.match(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d", s):
                break
            if re.match(r"^\d+(?:mo|d|w)\s+ago", s, re.I):
                break
            if s == "Score" and j + 1 < len(lines):
                sm = re.match(r"(\d+)\s*:\s*(\d+)", lines[j+1].strip())
                if sm:
                    a1, a2 = int(sm.group(1)), int(sm.group(2))
                    score = f"{a1}:{a2}"
                    # ubisoft: first number is your team's rounds in score display
                    result = "W" if a1 > a2 else "L"
                j += 2
                continue
            if s.startswith("RP") and s != "RP Rollback":
                k2 = j + 1
                while k2 < len(lines) and lines[k2].strip() == "RP":
                    k2 += 1
                if k2 < len(lines):
                    rm = re.match(r"^([\d,]+)\s*([+-][\d,]+)?$", lines[k2].strip())
                    if rm:
                        rp = int(rm.group(1).replace(",",""))
                        drp = int(rm.group(2).replace(",","")) if rm.group(2) else 0
                j = k2 + 1
                continue
            if s == "K/D/A" and j + 1 < len(lines):
                km = re.match(r"(\d+)\s+(\d+)\s+(\d+)", lines[j+1].strip())
                if km:
                    k, d, a = int(km.group(1)), int(km.group(2)), int(km.group(3))
                j += 2
                continue
            if s.startswith("HS") and j + 1 < len(lines):
                hm = re.search(r"([\d.]+)", lines[j+1])
                if hm:
                    hs = float(hm.group(1))
                j += 2
                continue
            if s in ("Ranked", "Score", "K/D", "RP") or s.startswith("RP"):
                j += 1
                continue
            # badge candidate line (between score and RP often)
            if s and s not in ("Ranked",) and not s.startswith("K/D") and not re.match(r"^[\d.]+$", s):
                if not any(x in s for x in ["Score", "RP", "K/D", "HS"]) and "ago" not in s:
                    if re.search(r"(2K|3K|4K|Ace|Clutch|Lost|Victim|TK|1v)", s, re.I):
                        badge_line = s
            j += 1
        if score and rp is not None:
            matches.append({
                "date": current_date, "map": map_name, "result": result, "score": score,
                "rp": rp, "drp": drp if drp is not None else 0,
                "k": k or 0, "d": d or 0, "a": a or 0,
                "hs": hs if hs is not None else 0.0,
                "badges": parse_badges(badge_line)
            })
        i += 1
    return matches

def parse_operators(text):
    ops = []
    blocks = re.split(r"Operator\s*\n", text)
    for block in blocks[1:]:
        lines = [x.strip() for x in block.strip().splitlines() if x.strip()]
        if len(lines) < 11:
            continue
        name = lines[0]
        nums = []
        for ln in lines[1:]:
            if re.match(r"^[\d.]+%?$", ln) or re.match(r"^[\d,]+$", ln):
                nums.append(ln.replace(",",""))
        if len(nums) < 10:
            continue
        rounds = int(float(nums[0]))
        win_pct = float(nums[1].replace("%",""))
        kd = float(nums[2])
        hs = float(nums[3].replace("%",""))
        w, l = int(nums[4]), int(nums[5])
        k, d, a = int(nums[6]), int(nums[7]), int(nums[8])
        aces = int(nums[9])
        tks = int(nums[10]) if len(nums) > 10 else 0
        display = OP_ALIASES.get(name, name)
        ops.append({
            "name": display, "side": SIDE.get(name, SIDE.get(display, "DEF")),
            "rounds": rounds, "winPct": win_pct, "kd": kd, "hs": hs,
            "w": w, "l": l, "k": k, "d": d, "a": a, "aces": aces, "tks": tks
        })
    return sorted(ops, key=lambda x: -x["rounds"])

def tally_badges(matches):
    counts = {}
    for m in matches:
        if m.get("result") == "RB":
            continue
        for b in m.get("badges", []):
            counts[b] = counts.get(b, 0) + 1
    order = ["2K","3K","4K","Ace","1v1 Clutch","1v2 Clutch","1v3 Clutch","1v4 Clutch","1v5 Clutch","Victim","1v1 Lost","1v2 Lost","1v3 Lost","TK"]
    return [{"name": n, "count": counts[n]} for n in order if counts.get(n)]

if __name__ == "__main__":
    path = Path(sys.argv[1])
    raw = path.read_text(encoding="utf-8")
    if "------------" in raw:
        match_part, op_part = raw.split("------------", 1)
    else:
        match_part, op_part = raw, ""
    matches = parse_matches(match_part)
    operators = parse_operators(op_part) if op_part.strip() else []
    print(json.dumps({"match_count": len(matches), "operator_count": len(operators), "matches": matches, "operators": operators, "badges": tally_badges(matches)}, indent=2))
