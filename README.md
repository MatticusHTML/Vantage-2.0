# VANTAGE // OVERSIGHT

A tactical surveillance-style website that tracks a seven-person Rainbow Six Siege squad across ranked seasons. Per-player dossiers, a squad **OVERSIGHT** comparison page, and a coaching analyst voice (**VANTAGE**) — all driven by simple markdown data files you edit in Cursor.

**The design lives in two files. The data lives in markdown. You only ever edit the markdown.**

---

## Quick start

1. **Preview locally:** open this folder in Cursor → right-click `index.html` → **Open with Live Server / Live Preview** (or VS Code's "Go Live").
   ⚠️ **Do not double-click `index.html`.** Browsers block local file reads (`file://`), so the data won't load. It must be *served* — Live Preview does that. Published GitHub Pages does too.
2. **Publish:** commit + push, then enable GitHub Pages (see below).

---

## Structure

```
Vantage-2.0/
├─ index.html            ← character-select roster (the landing page)
├─ oversight.html        ← squad comparison (command board + radar + team comments)
├─ players/
│  ├─ matticus_hq.html        each player page is a thin shell —
│  ├─ cunderthock.html        no data inside, just loads the engine
│  ├─ rogue_amputee.html
│  ├─ grandmaster_sandman.html
│  ├─ slackandlack.html
│  ├─ mjester1337.html
│  └─ mynameisblang.html
├─ assets/
│  ├─ css/vantage.css     ← the entire look (edit once, every page updates)
│  ├─ js/vantage.js       ← the engine (reads markdown, renders pages)
│  ├─ cards/              ← the 8 character-select images (7 players + OVERSIGHT)
│  └─ icons/              ← 77 operators + 5 Recruit + location marker (SVG)
├─ data/                  ← ★ THE PART YOU EDIT ★
│  ├─ <player>/<season>/current.md     one record per player per season
│  ├─ <player>/archive/                dated snapshots (site ignores these)
│  └─ oversight/<season>/current.md    squad-level comments
├─ AGENTS.md              ← VANTAGE's rules — Cursor reads this automatically
└─ README.md
```

---

## How an update works

You never hand-edit HTML. You talk to **VANTAGE in Cursor** and it edits the data file.

1. Drop your match-history and/or operator-overview screenshots into the chat.
2. Ask, e.g., *"VANTAGE, update CunderThock."*
3. Cursor (following `AGENTS.md`) edits the ` ```json ` block inside `data/cunderthock/Y11S1/current.md` — appends new matches, refreshes stats, adds the comment set.
4. Save → the Live Preview updates instantly. Commit + push → GitHub Pages updates.

**The two input rules to remember:**
- **Match screenshots are additive** — new matches get appended, history is kept.
- **Operator-overview screenshots are a full replacement** — make sure the overview is filtered to the *current season* before handing it over.

Everything else — de-dup safety, comment cadence (1 map + 5 operators), rank thresholds, archive naming — is written into `AGENTS.md` so VANTAGE handles it.

---

## Adding a new season

Each player already has an empty `Y11S2/current.md` waiting. When the season opens, ask VANTAGE to *"start Y11S2"* — it populates that file and the season selector picks it up automatically. (Y11S2 is expected to be Ranked 3.0; confirm the new RP thresholds first.)

---

## Publishing to GitHub Pages

1. Push this repo to GitHub (it's already cloned via GitHub Desktop — just commit + push).
2. The repo must be **Public** for free Pages.
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.**
4. Wait ~1 minute. Your site is live at `https://<your-username>.github.io/Vantage-2.0/`.

Every future `git push` redeploys automatically.

---

*VANTAGE Training Division · OVERSIGHT Protocol · the high ground is reserved for those who earn it.*
