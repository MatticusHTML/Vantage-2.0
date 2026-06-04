import { readFileSync, writeFileSync } from "fs";

const parsed = JSON.parse(readFileSync("tools/matticus_parsed.json", "utf8"));
const matches = parsed.matches.map((m) => {
  if (m.date === "Mar 14" && m.map === "Consulate" && m.rp === 0) {
    return { ...m, rp: 1750, drp: 89 };
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
const netRp = matches.reduce((s, m) => s + (m.drp || 0), 0) + 89;

const renameOp = (op) => {
  if (op.name === "Skopós") return { ...op, name: "Skopos" };
  return op;
};

const record = {
  name: "Matticus HQ",
  meta: {
    rank: "Silver II",
    rp: 2422,
    peakRp: 2505,
    nextRank: "Gold",
    rpToNext: 178,
    matches: real.length,
    w,
    l,
    winRate: Math.round((100 * w) / (w + l) * 10) / 10,
    kd: Math.round((k / d) * 100) / 100,
    avgHs: Math.round((hsW / k) * 10) / 10,
    netRp,
  },
  matches,
  operators: parsed.operators.map(renameOp),
  badges: parsed.badges,
  debrief:
    "<p>88 ranked matches — Silver II at 2,422 RP, touched Gold at 2,505 and slid back. <b>38–50</b> and a <b>0.99</b> K/D — you're trading even on kills and losing on rounds.</p>" +
    "<p><b>Aruni is the account</b> — 69.0% over 58 rounds with a 1.97 K/D and an ace. When you anchor her, the stack wins. Castle and Snake at 39–41% are the tax.</p>" +
    "<p><b>178 RP to Gold.</b> Stop auditioning defenders mid-session — ride the picks that print.</p>",
  comments: [
    {
      type: "map",
      subject: "Consulate",
      date: "Jun 3",
      text: "Consulate is split for you — May 31 4:2 with a 3K, May 15 3:5 blowup. When site prep is clean you convert; when you force solo entries, the 1v3 losses stack. Pick a game plan and stick to it.",
    },
    {
      type: "operator",
      subject: "Aruni",
      date: "Jun 3",
      text: "58 rounds, 69.0%, 1.97 K/D, one ace — your best operator by a mile. The Surya gate is earning wins. Main her on defense until the data says otherwise.",
    },
    {
      type: "operator",
      subject: "Castle",
      date: "Jun 3",
      text: "51 rounds at 39.2% — most-played defender after Snake and still underwater. 0.83 K/D says you're dying on the rotate, not the barricades. Tighten the hold timing or cut the volume.",
    },
    {
      type: "operator",
      subject: "Solid Snake",
      date: "Jun 3",
      text: "56 rounds, 41.1%, 0.93 K/D — second-most played, second-worst win rate in your core. The stealth kit isn't closing rounds. Flex pick only.",
    },
    {
      type: "operator",
      subject: "Tubarao",
      date: "Jun 3",
      text: "22 rounds, 63.6%, 2.40 K/D, one ace — small sample but the numbers pop. When Aruni is banned or taken, this is your next anchor.",
    },
    {
      type: "operator",
      subject: "Skopos",
      date: "Jun 3",
      text: "44 rounds, 47.7% — middle of the pack on a pick you keep running. Not bleeding like Castle, not printing like Aruni. Fine as filler, not a main.",
    },
    {
      type: "operator",
      subject: "Aruni",
      date: "Mar 30",
      old: true,
      text: "72.5% last report. Still telling you to stop benching her. Still right.",
    },
    {
      type: "operator",
      subject: "Castle",
      date: "Mar 16",
      old: true,
      text: "Flagged Castle at 39% two reports back. Barely moved. Still watching this one.",
    },
  ],
  season: "Y11S1",
  seasonLabel: "Operation Silent Hunt",
  updated: "Jun 3, 2026 · 5:45 PM PT",
};

const md = `# VANTAGE RECORD — Matticus HQ
**Season:** Y11S1 · Operation Silent Hunt  
**Updated:** Jun 3, 2026 · 5:45 PM PT

> Source of truth for the website. Edit via Cursor. The fenced \`json\` block below is what the site reads.

\`\`\`json
${JSON.stringify(record, null, 2)}
\`\`\`
`;

writeFileSync("data/matticus_hq/Y11S1/current.md", md);
console.log(
  `Wrote Matticus Y11S1 — ${real.length} matches, ${record.operators.length} ops, WR ${record.meta.winRate}%, K/D ${record.meta.kd}`,
);
