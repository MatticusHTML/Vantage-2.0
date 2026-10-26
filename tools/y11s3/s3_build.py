"""Y11S3 record builder. Usage:
  python s3_build.py <slug> <rank> <rp> <nextRank> <floor_of_next_rank> <updated-note>
Reads <slug>_s3_parsed.json and <slug>_s3_comments.json from this folder, builds the record,
cross-checks every derived number against the parsed data, and replaces the JSON block in
data/<slug>/Y11S3/current.md (header rewritten, file written utf-8 + CRLF)."""
import sys, json, re, os
from collections import Counter
from datetime import datetime, timedelta
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from parse_matches import expand
REPO = r"C:/Users/Matthew/Desktop/Cursor & Github/Vantage-2.0"

def result(r):
    a, b = map(int, r["score"].split(":")); return "W" if a > b else "L"

def main(slug, rank, rp, next_rank, next_floor, net_override=None):
    P = json.load(open(os.path.join(HERE, slug + "_s3_parsed.json"), encoding="utf-8"))
    comments = json.load(open(os.path.join(HERE, slug + "_s3_comments.json"), encoding="utf-8"))
    rp, next_floor = int(rp), int(next_floor)
    rows, ops, maps = P["rows"], P["ops"], P["maps"]
    assert all(o["side"] in ("ATK", "DEF") for o in ops), "unresolved operator side"
    matches = [{"date": r["date"], "map": r["map"], "result": result(r), "score": r["score"], "rp": r["rp"] or 0,
                "drp": int(r["drp"]) if r["drp"] else 0, "k": r["k"], "d": r["d"], "a": r["a"], "hs": r["hs"],
                "badges": expand(r["badges"])} for r in rows]
    w = sum(1 for m in matches if m["result"] == "W"); l = len(matches) - w
    K = sum(m["k"] for m in matches); D = sum(m["d"] for m in matches)
    meta = {"rank": rank, "rp": rp, "peakRp": max(m["rp"] for m in matches), "nextRank": next_rank, "rpToNext": next_floor - rp,
            "matches": len(matches), "w": w, "l": l, "winRate": round(w / len(matches) * 100, 1), "kd": round(K / D, 2),
            "avgHs": round(sum(m["hs"] * m["k"] for m in matches) / K, 1), "netRp": sum(m["drp"] for m in matches)}
    if net_override is not None:
        print(f"netRp override: {net_override} (sum of match deltas was {meta['netRp']})"); meta["netRp"] = int(net_override)
    # cross-checks
    dk, dd = sum(o["k"] for o in ops) - K, sum(o["d"] for o in ops) - D
    assert abs(dk) <= 2 and abs(dd) <= 2, "operator kills/deaths != match log"
    if dk or dd: print(f"WARNING: tracker operator table differs from match log by kills {dk:+d}, deaths {dd:+d} (stored as shown)")
    assert sum(x["matches"] for x in maps) == len(matches) and sum(x["w"] for x in maps) == w, "map totals != match log"
    assert [c["type"] for c in comments] == ["map"] + ["operator"] * 5, "need 1 map + 5 operator comments"
    badges = [{"name": n, "count": c} for n, c in sorted(Counter(b for m in matches for b in m["badges"]).items(), key=lambda x: (-x[1], x[0]))]
    opsout = [{k: o[k] for k in ["name", "side", "rounds", "winPct", "kd", "hs", "w", "l", "k", "d", "a", "aces", "tks"]} for o in ops]
    path = f"{REPO}/data/{slug}/Y11S3/current.md"
    old = open(path, encoding="utf-8").read()
    name = json.loads(re.findall(r"```json\s*(.*?)```", old, re.S)[-1])["name"]
    now = datetime.utcnow() - timedelta(hours=7)          # Pacific (PDT until Nov 1, 2026)
    stamp = now.strftime("%b %d, %Y · ") + now.strftime("%I:%M %p").lstrip("0") + " PT"
    stamp = stamp.replace(" 0", " ", 1) if stamp.startswith("Oct 0") or re.match(r"[A-Z][a-z]{2} 0", stamp) else stamp
    rec = {"name": name, "season": "Y11S3", "seasonLabel": "Operation Split Fire", "updated": stamp, "meta": meta,
           "matches": matches, "operators": opsout, "badges": badges, "debrief": None, "mapOverview": maps, "comments": comments}
    alt = " (alt)" if slug == "lcew4ll0wcome" else ""
    hdr = (f"# VANTAGE RECORD — {name}{alt}\n**Season:** Y11S3 · Operation Split Fire  \n**Updated:** {stamp}\n\n"
           "> Source of truth for the website. The fenced `json` block below is what the site reads.\n\n```json\n")
    open(path, "w", encoding="utf-8", newline="\r\n").write(hdr + json.dumps(rec, indent=4, ensure_ascii=False) + "\n```\n")
    print(stamp); print(meta)
    print(len(matches), "matches |", len(opsout), "ops |", len(badges), "badges |", len(maps), "maps |", len(comments), "comments")
    print("badges:", badges)

if __name__ == "__main__":
    main(*sys.argv[1:7])
