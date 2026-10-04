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

**Current roster status:** Mynameisblang is **MIA**, as reported by Matticus on Oct 3, 2026. His `ROSTER` config uses `status: "MIA"`; the engine overlays the stamp on his home portrait and dossier banner and includes the status in chat context. Keep his card, dossier, and historical squad statistics available. The closing Y11S2 record also stores `rosterStatus: "MIA"`. No departure date or reason was supplied.

---

## Per-player update

1. Paste **match history** (additive), **operator overview**, and/or **map overview** (overviews fully replace the supplied current-season array).
2. Ask: *"VANTAGE, update [name]."*
3. Cursor edits `data/<slug>/Y11S2/current.md` — one fenced JSON block only.
4. Each refresh adds **1 map + 5 operator** comments (newest wave on page, older in modal).

**Map overview:** Store the complete season-filtered overview as `mapOverview` in the same JSON block, with numeric `matches`, `winPct`, `w`, `l`, `kd`, `atkWinPct`, `defWinPct`, `hs`, and `esr`, plus the map `name`. Match win rate and attack/defense round win rates are different metrics. Check map counts, W/L, K/D, and HS% against the full match log; retain the supplied side splits and ESR without inventing missing values. The overview supports map coaching and chat context. If it arrives after close-out, revise the report and closing archive together, preserve the comment history, and keep the season closed without adding another comment wave.

**Source uncertainty:** Keep evidence and discrepancies in `dataNotes`. A confirmed entry omitted from source W/L can use `result: "U"` and contribute to numeric `meta.unclassified`. When a checksum confirms aggregate outcomes but cannot identify their rows, mark candidates `result: "?"` with a shared `resultGroup` id; `resultGroups` records their RP/score anchors and the confirmed outcome counts. Include the group's outcomes once in aggregate W/L, rather than guessing an identity or treating every candidate as another unclassified outcome. Document any derived RP change separately in `rpInferences` with its before/after evidence; distinguish it from explicitly reported deltas when checking day headers. Chat receives these notes and groups along with the season report.

---

## OVERSIGHT update

Run when **all seven** dossiers are current for the session:

1. Refresh `data/oversight/Y11S2/current.md` — squad comment wave (1 map + 5 operators, cross-roster).
2. Refresh `data/doka/Y11S2/pool.json` — teasing lines for all seven players + global/gossip.

Command board, radar, badge board, and operator matrix recompute from player JSON automatically.

**Final Y11S2 OVERSIGHT close-out (Oct 3, 2026):** The team JSON stores `seasonClosed: true`, a 40-sentence `seasonReport`, and `seasonSummary` calculated across the seven main accounts, retaining MIA Mynameisblang's historical contribution. Its 1,048 entries are player match records, not unique squad games. All 72 old squad comments remain; close-out adds no wave. The full closing snapshot and supporting Markdown/JSON analysis are in `data/oversight/archive/`, dated `10_03_2026`.

**Related accounts:** LceW4ll0wCome remains Rogue_Amputee's alt. SnSoldier's closed data is saved separately, and `additionalAccounts` makes it available to OVERSIGHT chat and the final report with `status: "UNCONFIRMED"`. His roster role, parent if any, and Discord display name are still awaiting the owner's answer; no squad slot or parent was assigned. Main-account totals exclude both related accounts. Chat receives their full operator/map context, the team summary, source notes, and `togetherEvidence` without merging them into the seven players.

**Shared-session analysis:** `togetherEvidence` is probable co-play inferred from at least three identical consecutive date/map/score/outcome rows, stored newest-first. It is not a verified lobby list, exact queue chronology, duo win rate, or five-stack record. Capture match IDs or timestamps and party membership before claiming those metrics.

**Map comparison correctness:** Prefer complete supplied `mapOverview` counts and use all entries as the win-rate denominator, including outcomes outside W/L (`U`). The match-log fallback applies an unresolved `resultGroups` aggregate once without assigning an unknown outcome to a specific row. The static squad column excludes alts; individual alt columns and chart chips remain available.

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
