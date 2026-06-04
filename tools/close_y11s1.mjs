#!/usr/bin/env node
/** Close Y11S1 — fix Rauora, archive, seasonReport, seasonClosed */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CLOSE_DATE = "Jun 3, 2026 · 6:00 PM PT";
const ARCHIVE_STAMP = "06_03_2026";

function parseMd(path) {
  const md = readFileSync(path, "utf8");
  const json = JSON.parse(md.match(/```json\s*([\s\S]*?)```/)[1]);
  return { md, json, path };
}

function writePlayerMd(path, name, json) {
  const header = readFileSync(path, "utf8").split("```json")[0];
  const season = json.seasonLabel ? `Y11S1 · ${json.seasonLabel}` : "Y11S1 · Operation Silent Hunt";
  const body = `# VANTAGE RECORD — ${name}
**Season:** ${season}  
**Updated:** ${CLOSE_DATE}

> Source of truth for the website. Edit via Cursor. The fenced \`json\` block below is what the site reads.

\`\`\`json
${JSON.stringify(json, null, 2)}
\`\`\`
`;
  writeFileSync(path, body);
}

function archive(slug, fileName, json) {
  const dir = join("data", slug, "archive");
  mkdirSync(dir, { recursive: true });
  const snap = { ...json, archived: CLOSE_DATE };
  writeFileSync(
    join(dir, fileName),
    `# Archive snapshot — ${CLOSE_DATE}\n\n\`\`\`json\n${JSON.stringify(snap, null, 2)}\n\`\`\`\n`,
  );
}

function fixRauora(ops) {
  const out = [];
  for (const op of ops) {
    if (op.name === "Ram" && op.rounds === 95 && op.winPct === 36.8) {
      out.push({ ...op, name: "Rauora" });
      continue;
    }
    if (op.name === "Ram" && op.rounds === 6 && op.winPct === 66.7) {
      out.push({ ...op, name: "Rauora" });
      continue;
    }
    out.push(op);
  }
  return out.sort((a, b) => b.rounds - a.rounds);
}

function patchSandmanComments(comments) {
  return comments.map((c) => {
    if (c.subject === "Ram" && c.date === "Jun 3") {
      return {
        ...c,
        subject: "Rauora",
        text: "95 rounds, 36.8%, 0.82 K/D — second-most played and bleeding. The breaching path isn't closing rounds. Bench until you've got a map-specific plan.",
      };
    }
    return c;
  });
}

const REPORTS = {
  cunderthock: `<p><b>Operation Silent Hunt — final grade: Gold III, 2,739 RP.</b> 266 ranked matches. 132 wins, 134 losses. A coin flip with a pulse — 49.6% win rate and a 1.07 K/D across the heaviest volume on the squad.</p>
<p>You played more ranked than anyone in the stack and landed in Gold anyway. That is either dedication or addiction; the data does not distinguish. Peak 2,748 RP — Platinum was 461 points away and never quite arrived.</p>
<p><b>Zero defined your season at 675 rounds and 44.0%.</b> That is not a main, that is a habit. Tachanka at 514 rounds and 57.0% was the Lord holding the line while you fed RP into cam timing. Mozzie at 60.7% and 1.61 K/D over 145 rounds was the receipt we kept writing — the best defender on the account, chronically under-picked relative to Tachanka and Zero volume.</p>
<p>Four RP rollbacks logged. Badge ledger says you clutch (17 one-v-one clutches, ten three-v-three clutches) and you die first (43 Victim tags). Both can be true. The squad's two-loss rule was written for your worst nights.</p>
<p>Silent Hunt closes with Gold on the card and a 266-match paper trail. Trim the Zero volume, ride Mozzie and Tachanka, and Y11S2 is a Platinum conversation. Walk at two losses. The Lord abides.</p>`,

  rogue_amputee: `<p><b>Operation Silent Hunt — final grade: Silver IV, 2,141 RP.</b> 175 matches. 83–92. 47.4% win rate, 0.91 K/D. You touched 2,395 peak and gave back a chunk of the climb — the season had altitude, not a landing.</p>
<p>Defense carried the account. <b>Kaid at 130 rounds, 61.5%, 1.27 K/D</b> — your real anchor. Mute at 57.7% over 123 rounds was quiet excellence. Thorn at 63.9% on 97 rounds printed refrags and utility wins. That is a three-operator defensive core hiding in plain sight.</p>
<p>Attack leaked. <b>Brava at 122 rounds and 45.1%</b> — second-most played, below water. Grim at 47.6% was fine but not a rescue act. The Kludge drone economy never became a primary win condition.</p>
<p>Two rollbacks. Headshot rate 41.3% — you aim fine; round impact on attack is where seasons stall. When you queued Kaid-Thorn-Mute chains, the stack felt you. When you defaulted Brava out of habit, the stack felt it too.</p>
<p>Silent Hunt closes Silver with a clear blueprint: anchor defense, fix attack selection, stop donating RP on Brava volume. Gold is 459 RP away on paper. The picks that print are already on the board.</p>`,

  grandmaster_sandman: `<p><b>Operation Silent Hunt — final grade: Gold III, 2,752 RP.</b> 168 matches. 88–80. 52.4% win rate, 1.32 K/D — the best combined record on the squad. Peak 2,876 hit Gold II before the slide. You were the stack's ceiling this season.</p>
<p><b>Defense was elite when you committed.</b> Kaid 60.9% over 110 rounds, 1.71 K/D. Thorn 59.1%, 2.14 K/D — fragger numbers on a trap operator. Maestro, Mute, Aruni, Fenrir all popped on smaller samples north of 69%. The flex pool is deep.</p>
<p><b>Sledge at 187 rounds and 43.3% was the tax.</b> Most-played operator, below-water win rate. Rauora at 95 rounds and 36.8% was the same story on attack — volume without conversion. When the hammer and the ram showed up without a map plan, RP leaked.</p>
<p>Border and Consulate paid repeatedly — clutches, aces, four-kill rounds on the ledger. Two rollbacks. 42.5% headshot rate with a 1.32 K/D says you win trades more than you lose them; session discipline on loss streaks is the remaining variable.</p>
<p>Silent Hunt closes with Gold on the card and the squad's best win rate. Cut Sledge and Rauora volume to map-specific plans, keep Kaid-Thorn anchored, and Platinum is the next milestone. You already proved the ceiling — now hold it.</p>`,

  matticus_hq: `<p><b>Operation Silent Hunt — final grade: Silver II, 2,422 RP.</b> 88 matches — lightest volume on the squad. 38–50. 43.2% win rate, 0.99 K/D. Peak 2,505 touched Gold and retreated. You traded kills even and lost rounds — classic Silver trap.</p>
<p><b>Aruni is the season.</b> 58 rounds, 69.0%, 1.97 K/D, one ace. When you anchored the Surya gate, the stack won. Castle at 51 rounds and 39.2% and Solid Snake at 56 rounds and 41.1% were the opposite — high volume, low return. You experimented while Aruni waited on the bench.</p>
<p>Tubarão at 63.6% and 2.40 K/D on 22 rounds was the hidden ace — small sample, loud numbers. Skopos at 47.7% was filler, not a main. The engine room is defense; the account still ran too many rounds on picks that do not close.</p>
<p>Two rollbacks. Mar 24 Ace with a one-v-four clutch on Chalet belongs on the highlight reel. The Apr–May stretch of Consulate and Clubhouse variance tells the rest — brilliant when prepped, punished when ego-challenging.</p>
<p>Silent Hunt closes 178 RP from Gold. Stop auditioning defenders mid-session. Main Aruni, flex Tubarão, cut Castle and Snake volume. Four clean wins worth of RP — the path was obvious all season; Y11S2 is execution, not discovery.</p>`,

  oversight: `<p><b>OVERSIGHT — Operation Silent Hunt · squad final.</b> 697 ranked matches combined. 341 wins, 356 losses. 48.9% squad win rate — a coin flip with Gold sprinkled on top. Two defenders hit Gold III; two attackers of the stack still live in Silver. Silent Hunt was a grind, not a blowout.</p>
<p><b>Grandmaster Sandman</b> owned the win-rate crown at 52.4% and 1.32 K/D across 168 games, peaking Gold II. <b>CunderThock</b> played 266 matches — more than anyone — and closed Gold III at 49.6%, a volume season that almost broke even. <b>Rogue_Amputee</b> put in 175 games with defense-first Kaid-Thorn-Mute chains but attack leaks kept Silver IV sticky at 47.4%. <b>Matticus HQ</b> ran the fewest games (88) at 43.2% — Aruni at 69% was the squad's most dominant single-operator stat; Castle and Snake dragged the account.</p>
<p>Defensive identity split the roster. Sandman's Thorn (2.14 K/D) and Kaid (1.71), Rogue's Kaid (61.5%) and Thorn (63.9%), Cunder's Mozzie (60.7%, 1.61 K/D) and Tachanka (57.0%) — the anchors are identified. Attack was the squad tax: Cunder's Zero volume, Sandman's Sledge and Rauora, Rogue's Brava, Matticus's Castle experiments.</p>
<p>Consulate and Border paid across multiple accounts. Clubhouse clustered wins for anyone who respected site prep. Oregon and Coastline remained variance maps — coin flips with clutch receipts attached.</p>
<p>Four rollbacks total across the stack — logged, excluded from W/L, noted. Badge culture: clutches and multi-kills everywhere; Victim tags on everyone who entry-frags without trade support.</p>
<p>Silent Hunt closes with two Gold cards, two Silver cards, and a squad that knows exactly which operators print. Y11S2 opens on System Override — same four-stack, cleaner picks, walk at two losses. The high ground is reserved for those who earn it. This squad earned the lesson; now earn the rank.</p>`,
};

const players = [
  { slug: "cunderthock", name: "CunderThock", archive: "CunderThock-06_03_2026.md" },
  { slug: "rogue_amputee", name: "Rogue_Amputee", archive: "Rogue_Amputee-06_03_2026.md" },
  { slug: "grandmaster_sandman", name: "Grandmaster Sandman", archive: "Grandmaster_Sandman-06_03_2026.md" },
  { slug: "matticus_hq", name: "Matticus HQ", archive: "Matticus_HQ-06_03_2026.md" },
];

for (const p of players) {
  const path = `data/${p.slug}/Y11S1/current.md`;
  const { json } = parseMd(path);

  if (p.slug === "grandmaster_sandman") {
    json.operators = fixRauora(json.operators);
    json.comments = patchSandmanComments(json.comments);
  }
  if (p.slug === "matticus_hq") {
    json.operators = fixRauora(json.operators);
  }

  json.seasonClosed = true;
  json.seasonReport = REPORTS[p.slug];
  json.updated = CLOSE_DATE;

  archive(p.slug, p.archive, json);
  writePlayerMd(path, p.name, json);
  console.log("Closed", p.name);
}

// OVERSIGHT
const ovPath = "data/oversight/Y11S1/current.md";
const { json: ovJson } = parseMd(ovPath);
ovJson.seasonClosed = true;
ovJson.seasonReport = REPORTS.oversight;
ovJson.updated = CLOSE_DATE;
archive("oversight", "OVERSIGHT-06_03_2026.md", ovJson);

writeFileSync(
  ovPath,
  `# OVERSIGHT — Squad Team Debrief
**Season:** Y11S1 · Operation Silent Hunt  
**Updated:** ${CLOSE_DATE}

\`\`\`json
${JSON.stringify(ovJson, null, 2)}
\`\`\`
`,
);
console.log("Closed OVERSIGHT");
console.log("Done — Y11S1 season closed.");
