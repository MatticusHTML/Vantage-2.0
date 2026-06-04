import { readFileSync, writeFileSync } from "fs";

const parsed = JSON.parse(readFileSync("tools/rogue_parsed.json", "utf8"));
const matches = parsed.matches.map((m) => {
  if (m.date === "Mar 14" && m.map === "Consulate" && m.rp === 0) {
    return { ...m, rp: 1844, drp: 44 };
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
const netRp = matches.reduce((s, m) => s + (m.drp || 0), 0) + 44;

const record = {
  name: "Rogue_Amputee",
  meta: {
    rank: "Silver IV",
    rp: 2141,
    peakRp: 2395,
    nextRank: "Gold",
    rpToNext: 459,
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
    "<p>175 ranked matches — Silver IV at 2,141 RP, season peak 2,395. You touched Gold territory and gave it back; <b>83–92</b> is a grind that never quite tipped.</p>" +
    "<p><b>Kaid and Thorn print on defense</b> — 61.5% and 63.9% on real sample sizes. That's where the Ws live. Brava at 45% over 122 rounds is the leak on attack.</p>" +
    "<p><b>0.91 K/D at 47.4% WR</b> — you're dying slightly more than you kill and still queuing. Fix the survival piece or the record stays flat.</p>",
  comments: [
    {
      type: "map",
      subject: "Coastline",
      date: "Jun 3",
      text: "Coastline gave you the May 27 bounce — 5:4 with a 1v1 clutch and a 3K. Rooftop control and late-round patience; that's the template when the stack isn't clicking elsewhere.",
    },
    {
      type: "operator",
      subject: "Kaid",
      date: "Jun 3",
      text: "130 rounds, 61.5%, 1.27 K/D — your most-played defender and the numbers back it. Electroclaw setups are earning wins. This is the anchor; stop wandering off it.",
    },
    {
      type: "operator",
      subject: "Thorn",
      date: "Jun 3",
      text: "63.9% on 97 rounds with 43 assists — you're winning on utility and refrags, not raw fragging. One team kill on the board; watch the razorbloom placement.",
    },
    {
      type: "operator",
      subject: "Mute",
      date: "Jun 3",
      text: "123 rounds at 57.7% — quiet workhorse pick. 40.7% HS and 32 assists say you're playing the role right. Pair with Kaid and call it a core.",
    },
    {
      type: "operator",
      subject: "Brava",
      date: "Jun 3",
      text: "122 rounds, 45.1%, 0.91 K/D — second-most played and bleeding win rate. The Kludge drone isn't converting; either fix the prep or bench her for Grim.",
    },
    {
      type: "operator",
      subject: "Maestro",
      date: "Jun 3",
      text: "39 rounds, 64.1% — small sample but the evil eye value is real. When you need a third defender that isn't Kaid, this is the flex.",
    },
    {
      type: "operator",
      subject: "Grim",
      date: "Mar 12",
      old: true,
      text: "Two reports ago I said Grim might be your real primary. The K/D agrees now.",
    },
  ],
  season: "Y11S1",
  seasonLabel: "Operation Silent Hunt",
  updated: "Jun 3, 2026 · 4:15 PM PT",
};

const md = `# VANTAGE RECORD — Rogue_Amputee
**Season:** Y11S1 · Operation Silent Hunt  
**Updated:** Jun 3, 2026 · 4:15 PM PT

> Source of truth for the website. Edit via Cursor. The fenced \`json\` block below is what the site reads.

\`\`\`json
${JSON.stringify(record, null, 2)}
\`\`\`
`;

writeFileSync("data/rogue_amputee/Y11S1/current.md", md);
console.log(
  `Wrote Rogue Y11S1 — ${real.length} matches, ${parsed.operators.length} ops, WR ${record.meta.winRate}%, K/D ${record.meta.kd}`,
);
