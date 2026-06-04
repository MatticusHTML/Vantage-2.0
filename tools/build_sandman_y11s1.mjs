import { readFileSync, writeFileSync } from "fs";

const parsed = JSON.parse(readFileSync("tools/sandman_parsed.json", "utf8"));
const matches = parsed.matches.map((m) => {
  if (m.date === "Mar 14" && m.map === "Consulate" && m.rp === 0) {
    return { ...m, rp: 1890, drp: 58 };
  }
  return m;
});

const real = matches.filter((m) => m.result !== "RB");
const w = real.filter((m) => m.result === "W").length;
const l = real.filter((m) => m.result === "L").length;
let k = 0,
  d = 0,
  hsW = 0;
for (const m of real) {
  k += m.k;
  d += m.d;
  hsW += m.hs * m.k;
}
const netRp = matches.reduce((s, m) => s + (m.drp || 0), 0) + 58;

const record = {
  name: "Grandmaster Sandman",
  meta: {
    rank: "Gold III",
    rp: 2752,
    peakRp: 2876,
    nextRank: "Platinum",
    rpToNext: 448,
    matches: real.length,
    w,
    l,
    winRate: Math.round((100 * w) / (w + l) * 10) / 10,
    kd: Math.round((k / d) * 100) / 100,
    avgHs: Math.round((hsW / k) * 10) / 10,
    netRp,
  },
  matches,
  operators: parsed.operators,
  badges: parsed.badges,
  debrief:
    "<p>168 ranked matches — Gold III at 2,752 RP, season peak 2,876. You touched Gold II and backed off, but <b>88–80</b> and a <b>1.32</b> K/D say the ceiling is real.</p>" +
    "<p><b>Kaid and Thorn are elite</b> — 60.9% and 59.1% on defenders with 1.71 and 2.14 K/D. Sledge at 187 rounds is volume; 43.3% says trim the hammer time.</p>" +
    "<p><b>Maestro, Mute, Aruni, Fenrir</b> all sit north of 69% on smaller samples — your flex pool is deep when you pick with intent.</p>",
  comments: [
    {
      type: "map",
      subject: "Border",
      date: "Jun 3",
      text: "Border keeps paying out — May 30 4:1 with a 3K, Apr 8 4:0 with a 1v3 clutch 4K. Site takes and refrag discipline; this map is a legitimate perma-ban for opponents, not you.",
    },
    {
      type: "operator",
      subject: "Kaid",
      date: "Jun 3",
      text: "110 rounds, 60.9%, 1.71 K/D — your best defender by impact. One ace on the board. When Sledge isn't converting, this is the anchor pick.",
    },
    {
      type: "operator",
      subject: "Thorn",
      date: "Jun 3",
      text: "66 rounds, 59.1%, 2.14 K/D — that's fragger numbers on a trap operator. 24 assists say you're setting and finishing. Keep this in the rotation.",
    },
    {
      type: "operator",
      subject: "Sledge",
      date: "Jun 3",
      text: "187 rounds at 43.3% — most-played operator and below water on win rate. 1.30 K/D keeps it respectable, but the volume is costing you RP. Narrow the hammer map pool.",
    },
    {
      type: "operator",
      subject: "Ram",
      date: "Jun 3",
      text: "95 rounds, 36.8%, 0.82 K/D — second-most played and bleeding. The breaching gadget isn't closing rounds. Bench until you've got a map-specific plan.",
    },
    {
      type: "operator",
      subject: "Maestro",
      date: "Jun 3",
      text: "24 rounds, 70.8%, 2.00 K/D, one ace — small sample but the evil eye economy is printing. Flex pick when Kaid and Thorn aren't the answer.",
    },
    {
      type: "operator",
      subject: "Sledge",
      date: "Mar 30",
      old: true,
      text: "Flagged Sledge under 47% last report. It got worse. Told you.",
    },
  ],
  season: "Y11S1",
  seasonLabel: "Operation Silent Hunt",
  updated: "Jun 3, 2026 · 5:02 PM PT",
};

const md = `# VANTAGE RECORD — Grandmaster Sandman
**Season:** Y11S1 · Operation Silent Hunt  
**Updated:** Jun 3, 2026 · 5:02 PM PT

> Source of truth for the website. Edit via Cursor. The fenced \`json\` block below is what the site reads.

\`\`\`json
${JSON.stringify(record, null, 2)}
\`\`\`
`;

writeFileSync("data/grandmaster_sandman/Y11S1/current.md", md);
console.log(
  `Wrote Sandman Y11S1 — ${real.length} matches, ${record.operators.length} ops, WR ${record.meta.winRate}%, K/D ${record.meta.kd}`,
);
