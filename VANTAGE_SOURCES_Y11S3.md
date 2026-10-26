# VANTAGE — Y11S3 data sources (r6.tracker.network)

Season: **Y11S3 — Operation Split Fire** · tracker `season=43`
Supplied by the owner. These are the match-history pages VANTAGE pulls from for Y11S3 updates (matches, plus the `/operators` and `/maps` tabs of the same profile with the same query string).

| Display name | slug | Ubisoft | Match history |
|---|---|---|---|
| CunderThock | `cunderthock` | CunderThock | https://r6.tracker.network/r6siege/profile/ubi/CunderThock/matches?playlist=ranked&season=43&gamemode=pvp_ranked |
| Rogue_Amputee | `rogue_amputee` | Rogue_Amputee | https://r6.tracker.network/r6siege/profile/ubi/Rogue_Amputee/matches?playlist=ranked&season=43&gamemode=pvp_ranked |
| Grandmaster Sandman | `grandmaster_sandman` | Loaf_Of_Ramen | https://r6.tracker.network/r6siege/profile/ubi/Loaf_Of_Ramen/matches?playlist=ranked&season=43&gamemode=pvp_ranked |
| Matticus HQ | `matticus_hq` | Loaf_Of_Edibles | https://r6.tracker.network/r6siege/profile/ubi/Loaf_Of_Edibles/matches?playlist=ranked&season=43&gamemode=pvp_ranked |
| slackandlack | `slackandlack` | slackandlack | https://r6.tracker.network/r6siege/profile/ubi/slackandlack/matches?playlist=ranked&season=43 |
| MJester1337 | `mjester1337` | MJester1337 | https://r6.tracker.network/r6siege/profile/ubi/MJester1337/matches?playlist=ranked&season=43 |

**No Y11S3 link supplied yet for:** Mynameisblang (MIA), LceW4ll0wCome (Rogue_Amputee alt), SnSoldier. Ask the owner before pulling those.

## How the pull works (tested Oct 26, 2026 on Y11S2 pages)
- Open the page in the built-in browser, wait ~5s, click **Load More** in short loops (each browser JS call must finish in under ~40s) until "End of Results".
- Return the page text from `document.querySelector('main').innerText` padded past ~90K characters so the tool result is saved to disk, then parse it with Python. No retyping.
- Same URL with `/operators?...` and `/maps?...` gives the operator and map tables. Confirm the page header shows the season filter before trusting an operator replace.
- Still follow AGENTS.md: de-dup (date + rp + score), day W/L checksum, RP-rollback rows, 1 map + 5 operator comments per refresh. Abandoned games and rows with no RP on the tracker get flagged for the owner, not guessed.
