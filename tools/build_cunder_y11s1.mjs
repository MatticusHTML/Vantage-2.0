import { readFileSync, writeFileSync } from "fs";

const parsed = JSON.parse(readFileSync("tools/cunder_parsed.json", "utf8"));
const matches = parsed.matches.map((m) => {
  if (m.date === "Mar 14" && m.map === "Consulate" && m.rp === 0) {
    return { ...m, rp: 2063, drp: 26 };
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
const netRp = matches.reduce((s, m) => s + (m.drp || 0), 0) + 26;

const record = {
  name: "CunderThock",
  meta: {
    rank: "Gold III",
    rp: 2739,
    peakRp: 2748,
    nextRank: "Platinum",
    rpToNext: 461,
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
    "<p>266 ranked matches — Gold III at 2,739 RP, peak 2,748. One RP bar from a real climb; <b>132–134</b> is coin-flip territory, not a slump.</p>" +
    "<p><b>Zero is the story now</b> — 675 rounds, nearly half your season. The 44% win rate and 0.97 K/D say the pick is volume, not value. Tachanka at 57% over 514 rounds is still the anchor.</p>" +
    "<p><b>Mozzie stays elite</b> — 60.7% and 1.61 K/D on 145 rounds. When you stop defaulting Zero and play the picks that print, the WR follows.</p>" +
    "<p><b>Two-loss rule still applies.</b> Your worst RP nights come from chaining queues after back-to-back Ls. Walk at two.</p>",
  comments: [
    {
      type: "map",
      subject: "Consulate",
      date: "Jun 3",
      text: "Consulate keeps showing up in your W column when you stop ego-challenging site. 4:1 and 4:2 wins this week — slow clears, trade the refrag, don't die first for the plant.",
    },
    {
      type: "operator",
      subject: "Zero",
      date: "Jun 3",
      text: "675 rounds at 44% and a 0.97 K/D — that is not a main, that is a habit. Four team kills on the season too. Trim the volume or fix the cam timing; Tachanka and Mozzie are right there.",
    },
    {
      type: "operator",
      subject: "Tachanka",
      date: "Jun 3",
      text: "514 rounds, 57% win rate, 1.05 K/D — the Lord is still your most reliable defender by sample size. When Zero is bleeding RP, this is the reset pick.",
    },
    {
      type: "operator",
      subject: "Mozzie",
      date: "Jun 3",
      text: "60.7% and 1.61 K/D on 145 rounds — quietly your best defender when you actually commit. One ace on the board. Stop treating him as a flex and run the drone economy.",
    },
    {
      type: "operator",
      subject: "Striker",
      date: "Jun 3",
      text: "17 rounds, 2.00 K/D, 50% HS — small sample but the numbers pop. Worth a look on attack when you need a fragger who doesn't need 600 rounds to prove it.",
    },
    {
      type: "operator",
      subject: "Twitch",
      date: "Jun 3",
      text: "43 rounds, 32.6% win rate — the F2 tax is real this season. 65.6% HS means the aim is there; the round impact isn't. Save her for maps you can isolate vertical.",
    },
    {
      type: "operator",
      subject: "Mozzie",
      date: "May 18",
      old: true,
      text: "Told you weeks ago Mozzie was trending up. Receipts.",
    },
  ],
  season: "Y11S1",
  seasonLabel: "Operation Silent Hunt",
  updated: "Jun 3, 2026 · 3:28 PM PT",
};

const md = `# VANTAGE RECORD — CunderThock
**Season:** Y11S1 · Operation Silent Hunt  
**Updated:** Jun 3, 2026 · 3:28 PM PT

> Source of truth for the website. Edit via Cursor. The fenced \`json\` block below is what the site reads.

\`\`\`json
${JSON.stringify(record, null, 2)}
\`\`\`
`;

writeFileSync("data/cunderthock/Y11S1/current.md", md);
console.log(
  `Wrote current.md — ${real.length} matches, ${parsed.operators.length} ops, WR ${record.meta.winRate}%, K/D ${record.meta.kd}`,
);
