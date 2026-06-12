# VANTAGE Workflow Reference

Quick reference for updating the seven-player squad site. Full rules live in `AGENTS.md`.

---

## Roster (Y11S2)

| Display name | slug | Accent |
|---|---|---|
| CunderThock | `cunderthock` | Gold `#ffc800` |
| Matticus HQ | `matticus_hq` | Purple `#9a5cd4` |
| Rogue_Amputee | `rogue_amputee` | Blue `#4da8ff` |
| Grandmaster Sandman | `grandmaster_sandman` | Green `#2bb87a` |
| slackandlack | `slackandlack` | Red `#ff5c66` |
| MJester1337 | `mjester1337` | Orange `#f0a500` |
| Mynameisblang | `mynameisblang` | Pink `#ff6b9d` |

**Home grid:** 2 columns × 4 rows — seven player tiles + square OVERSIGHT tile (bottom-right).

---

## Per-player update

1. Paste **match history** (additive) and/or **operator overview** (full replace for current season).
2. Ask: *"VANTAGE, update [name]."*
3. Cursor edits `data/<slug>/Y11S2/current.md` — one fenced JSON block only.
4. Each refresh adds **1 map + 5 operator** comments (newest wave on page, older in modal).

---

## OVERSIGHT update

Run when **all seven** dossiers are current for the session:

1. Refresh `data/oversight/Y11S2/current.md` — squad comment wave (1 map + 5 operators, cross-roster).
2. Refresh `data/doka/Y11S2/pool.json` — teasing lines for all seven players + global/gossip.

Command board, radar, badge board, and operator matrix recompute from player JSON automatically.

---

## New player onboarding checklist

- [ ] `ROSTER` entry in `assets/js/vantage.js`
- [ ] `players/<slug>.html` shell
- [ ] `data/<slug>/Y11S2/current.md` (empty shell until first paste)
- [ ] `assets/cards/<slug>.png` card art
- [ ] Doka pool key under `players`
- [ ] First match paste + operator overview + comment wave

---

## Publish

Commit + push via GitHub Desktop. GitHub Pages redeploys from `main` / root.

**Owner workflow:** validation happens on the **live published site** after push — not local preview.

*VANTAGE Training Division · OVERSIGHT Protocol*
