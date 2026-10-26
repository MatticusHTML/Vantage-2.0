"""Y11S3 pull checks. Usage: python s3_pull.py <slug> <matches.txt> <ops.txt> <maps.txt>
Parses the three saved tool-result files, runs the AGENTS.md checks, prints a full review and
writes <scratchpad>/<slug>_s3_parsed.json (utf-8) for the record builder."""
import sys, json, re, glob, os
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from parse_matches import parse, expand
REPO = r"C:/Users/Matthew/Desktop/Cursor & Github/Vantage-2.0"
NEW_DEF = {"Noor"}            # Y11S3 operators not in the Y11S2 data (side per launch coverage)
dec = json.JSONDecoder()

def load(path):
    a = json.load(open(path, encoding="utf-8"))
    x = a[0]["text"]
    while isinstance(x, str):
        x, _ = dec.raw_decode(x.lstrip())
    return x

def num(s): return float(s.replace("%", "").replace(",", ""))

def side_map():
    side = {}
    for f in glob.glob(REPO + "/data/*/Y11S[12]/current.md"):
        if "oversight" in f: continue
        d = json.loads(re.findall(r"```json\s*(.*?)```", open(f, encoding="utf-8").read(), re.S)[-1])
        for o in d.get("operators", []): side.setdefault(o["name"], set()).add(o["side"])
    return side

def result(r):
    a, b = map(int, r["score"].split(":")); return "W" if a > b else "L"

def main(slug, mpath, opath, gpath):
    m = load(mpath); days, rows, anom = parse(m["lines"])
    print("matches url:", m["url"]); print("days", len(days), "rows", len(rows), "anomalies", anom)
    byd = {}
    for r in rows: byd.setdefault(r["date"], []).append(r)
    bad = 0
    for d in days:
        rs = byd.get(d["date"], []); c = Counter(result(r) for r in rs)
        ok = len(rs) == d["n"] and c["W"] == d["w"] and c["L"] == d["l"]
        drp = sum(int(r["drp"]) for r in rs if r["drp"])
        hdr = d["drp"]
        if not ok or (hdr.lstrip("+-").isdigit() and int(hdr) != drp): bad += 1; print("DAY MISMATCH", d, len(rs), dict(c), drp)
    print("day checksum failures:", bad, "of", len(days))
    chain = list(reversed(rows)); br = 0
    for p, c in zip(chain, chain[1:]):
        if p["rp"] and c["rp"] and c["drp"] and p["rp"] + int(c["drp"]) != c["rp"]:
            br += 1; print("RP chain break", p["date"], p["rp"], "->", c["date"], c["rp"], c["drp"])
    print("rp chain breaks:", br)
    norp = [r for r in rows if not r["rp"]]; nod = [r for r in rows if r["rp"] and not r["drp"]]
    print("rows with no RP:", len(norp), "| rows with RP but no delta:", len(nod))
    K = sum(r["k"] for r in rows); D = sum(r["d"] for r in rows)
    w = sum(1 for r in rows if result(r) == "W")
    print(f"W-L {w}-{len(rows)-w} | K/D {K/D:.2f} ({K}/{D}) | HS kill-wtd {sum(r['hs']*r['k'] for r in rows)/K:.1f} | sum drp {sum(int(r['drp']) for r in rows if r['drp'])} | peak {max(r['rp'] or 0 for r in rows)}")
    # operators
    o = load(opath); L = o["lines"]; i = L.index("TKs") + 1; ops = []
    while i + 12 <= len(L) and re.fullmatch(r"[\d,]+", L[i + 1]):
        r = L[i:i + 12]
        ops.append(dict(name=r[0], rounds=int(num(r[1])), winPct=num(r[2]), kd=num(r[3]), hs=num(r[4]), w=int(num(r[5])), l=int(num(r[6])),
                        k=int(num(r[7])), d=int(num(r[8])), a=int(num(r[9])), aces=int(num(r[10])), tks=int(num(r[11])))); i += 12
    sm = side_map()
    for x in ops:
        s = sm.get(x["name"]); x["side"] = (sorted(s)[0] if s and len(s) == 1 else ("DEF" if x["name"] in NEW_DEF else "?"))
    print("ops url:", o["url"], "| Y11S3 filter on page:", o["hasS"])
    print("operators", len(ops), "| rounds", sum(x["rounds"] for x in ops), "| kills", sum(x["k"] for x in ops), "deaths", sum(x["d"] for x in ops), "| unknown side:", [x["name"] for x in ops if x["side"] == "?"], "| new vs S2:", [x["name"] for x in ops if x["name"] not in sm])
    # maps
    g = load(gpath); L = g["lines"]; i = L.index("ESR") + 1; mp = []
    while i + 10 <= len(L) and re.fullmatch(r"\d+", L[i + 1]):
        r = L[i:i + 10]
        mp.append(dict(name=r[0], matches=int(r[1]), winPct=num(r[2]), w=int(r[3]), l=int(r[4]), kd=num(r[5]), atkWinPct=num(r[6]), defWinPct=num(r[7]), hs=num(r[8]), esr=num(r[9]))); i += 10
    print("maps url:", g["url"], "| Y11S3 filter on page:", g["hasS"])
    print("maps", len(mp), "| matches", sum(x["matches"] for x in mp), "W", sum(x["w"] for x in mp), "L", sum(x["l"] for x in mp))
    json.dump(dict(days=days, rows=rows, ops=ops, maps=mp), open(os.path.join(HERE, slug + "_s3_parsed.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("\n--- MATCHES (newest first)")
    for r in rows: print(r["date"], r["map"], r["score"], result(r), "+".join(r["badges"]), r["rp"], r["drp"], f"{r['k']}/{r['d']}/{r['a']}", r["hs"])
    print("\n--- OPERATORS")
    for x in ops: print(x["side"], x["name"], x["rounds"], x["winPct"], x["kd"], x["hs"], f"{x['w']}-{x['l']}", f"{x['k']}/{x['d']}/{x['a']}", "aces", x["aces"], "tks", x["tks"])
    print("\n--- MAPS")
    for x in mp: print(x["name"], x["matches"], f"{x['w']}-{x['l']}", x["winPct"], x["kd"], "atk", x["atkWinPct"], "def", x["defWinPct"], "hs", x["hs"])
    print("\n--- BADGES", Counter(b for r in rows for b in expand(r["badges"])).most_common())

if __name__ == "__main__":
    main(*sys.argv[1:5])
