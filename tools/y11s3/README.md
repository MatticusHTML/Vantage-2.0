# Y11S3 pull pipeline (VANTAGE use)

Used to update a player's `data/<slug>/Y11S3/current.md` from the tracker pages listed in `VANTAGE_SOURCES_Y11S3.md`.
Nothing here is read by the website.

1. In the built-in browser, open the player's `/matches`, `/operators`, `/maps` pages (`season=43`), click **Load More** until "End of Results", and return the page text (`main.innerText` split into lines, JSON-stringified and padded past ~90K characters) so the tool result is saved to disk.
2. `python s3_pull.py <slug> <matches.txt> <ops.txt> <maps.txt>` — parses, runs the checks (day W/L + RP deltas vs day headers, RP-chain gaps, K/D and HS vs match log, operator and map totals) and prints a full review. Writes `<slug>_s3_parsed.json` next to the scripts.
3. Write `<slug>_s3_comments.json` (1 map + 5 operator comments) next to the scripts.
4. `python s3_build.py <slug> "<rank>" <rp> "<nextRank>" <nextRankFloorRp>` — rebuilds the record and replaces the JSON block in the Y11S3 `current.md` (UTF-8, CRLF).

Paths inside the scripts are absolute to the owner's machine; `parse_matches.py` must sit beside the other two.
Pitfalls: shell `date` may report UTC (use Pacific time for `updated`); `sed -i` strips CRLF; read operator names as UTF-8 (Nøkk, Capitão).
