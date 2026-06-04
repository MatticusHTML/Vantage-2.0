#!/usr/bin/env node
/** Parse Ubisoft-style match history paste into VANTAGE match JSON rows. */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const SIDE = {
  Tachanka: "DEF", Mozzie: "DEF", Sentry: "DEF", Bandit: "DEF",
  "Solid Snake": "DEF", Caveira: "DEF", Thunderbird: "DEF", Solis: "DEF",
  Fenrir: "DEF", Smoke: "DEF", Echo: "DEF", Valkyrie: "DEF", Jäger: "DEF",
  Goyo: "DEF", Clash: "DEF", Maestro: "DEF", Mute: "DEF", Sens: "DEF",
  Kaid: "DEF", Thorn: "DEF", Azami: "DEF", Mira: "DEF", Aruni: "DEF",
  Frost: "DEF", Pulse: "DEF", Alibi: "DEF", Tubarão: "DEF", Melusi: "DEF",
  Ela: "DEF", Lesion: "DEF", Kapkan: "DEF", Rook: "DEF", Castle: "DEF",
  Echo: "DEF", Valkyrie: "DEF", Smoke: "DEF", Doc: "DEF", Clash: "DEF",
  Caveira: "DEF", Vigil: "DEF", Sentry: "DEF", Azami: "DEF", Solis: "DEF",
  Thunderbird: "DEF", Oryx: "DEF", Denari: "DEF",
  Twitch: "ATK", Jackal: "ATK", Striker: "ATK", Amaru: "ATK", Capitão: "ATK", Zero: "ATK",
  Montagne: "ATK", Nøkk: "ATK", Grim: "ATK", Blitz: "ATK", Finka: "ATK",
  Brava: "ATK", Ying: "ATK", Deimos: "ATK", Maverick: "ATK", Dokkaebi: "ATK",
  Ace: "ATK", Gridlock: "ATK", Thermite: "ATK", Thatcher: "ATK", Blackbeard: "ATK",
  Nomad: "ATK", Lion: "ATK", Fuze: "ATK", Ram: "ATK", Hibana: "ATK", Sledge: "ATK",
  Flores: "ATK", Ash: "ATK", Iana: "ATK", Buck: "ATK", Osa: "ATK", Kali: "ATK",
  Rauora: "ATK", IQ: "ATK", Zofia: "ATK", Glaz: "ATK",
  Skopós: "DEF", Sens: "DEF",
};

const OP_ALIASES = {
  "Solid Snake": "Solid Snake",
  Nøkk: "Nokk",
  Capitão: "Capitao",
  Jäger: "Jager",
  Tubarão: "Tubarao",
  Skopós: "Skopos",
};

const KNOWN_BADGES = [
  "1v5 Clutch", "1v4 Clutch", "1v3 Clutch", "1v2 Clutch", "1v1 Clutch",
  "1v3 Lost", "1v2 Lost", "1v1 Lost",
  "Ace", "4K", "3K", "2K", "Victim", "TK",
];

function parseBadges(text) {
  if (!text || text.trim() === "" || text.trim() === "Ranked") return [];
  let t = text.trim();
  t = t.replace(/(x\d+)(1v)/gi, "$1 $2");
  t = t.replace(/(2K|3K|4K)(1v)/gi, "$1 $2");
  t = t.replace(/(Lost|Clutch)(1v)/gi, "$1 $2");
  t = t.replace(/(Clutch)(Ace)/gi, "$1 $2");
  t = t.replace(/(TK)(2K|3K|4K|1v|Ace|Victim)/gi, "$1 $2");
  const parts = t.split(/\s+/);
  const badges = [];
  let i = 0;
  while (i < parts.length) {
    const p = parts[i];
    const mx = p.match(/^(2K|3K|4K)x(\d+)$/i);
    if (mx) {
      for (let n = 0; n < parseInt(mx[2], 10); n++) badges.push(mx[1].toUpperCase());
      i++;
      continue;
    }
    for (const suffix of ["x2", "x3", "x4"]) {
      if (p.toLowerCase().endsWith(suffix) && ["2K", "3K", "4K"].includes(p.slice(0, -2))) {
        const base = p.slice(0, -2);
        const count = parseInt(suffix.slice(1), 10);
        for (let n = 0; n < count; n++) badges.push(base);
        i++;
        continue;
      }
    }
    let matched = false;
    for (const b of KNOWN_BADGES) {
      if (p.toLowerCase() === b.toLowerCase()) {
        badges.push(b);
        matched = true;
        break;
      }
    }
    if (!matched && ["2K", "3K", "4K", "TK"].includes(p.toUpperCase())) {
      badges.push(p.toUpperCase());
    } else if (!matched && /^1v\d/i.test(p) && i + 1 < parts.length && ["Clutch", "Lost"].includes(parts[i + 1])) {
      badges.push(`${p} ${parts[i + 1]}`);
      i += 2;
      continue;
    }
    i++;
  }
  return badges.filter((b) => KNOWN_BADGES.includes(b) || b.startsWith("1v"));
}

function parseMatches(text) {
  const lines = text.split(/\r?\n/).map((ln) => ln.replace(/\r$/, ""));
  const matches = [];
  let currentDate = null;
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i].trim();
    if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/.test(ln)) {
      currentDate = ln;
      i++;
      continue;
    }
    if (!currentDate) {
      i++;
      continue;
    }
    if (ln === "Ranked" && i > 0 && lines[i - 1].includes("Rollback")) {
      i++;
      continue;
    }
    if (ln.includes("RP Rollback") || (i + 1 < lines.length && lines[i + 1].trim() === "RP Rollback")) {
      let rp = null;
      let drp = 0;
      let j = i;
      while (j < Math.min(i + 8, lines.length)) {
        if (lines[j].trim().startsWith("RP")) {
          let k2 = j + 1;
          while (k2 < lines.length && lines[k2].trim() === "RP") k2++;
          if (k2 < lines.length) {
            const m = lines[k2].trim().match(/^([\d,]+)\s*([+-][\d,]+)?$/);
            if (m) {
              rp = parseInt(m[1].replace(/,/g, ""), 10);
              drp = m[2] ? parseInt(m[2].replace(/,/g, ""), 10) : 0;
              break;
            }
          }
        }
        j++;
      }
      if (rp !== null) {
        matches.push({
          date: currentDate, map: "RP Rollback", result: "RB",
          score: "—", rp, drp, k: 0, d: 0, a: 0, hs: 0.0, badges: [],
        });
      }
      i = j + 1;
      continue;
    }
    const m = ln.match(/^(\d+(?:mo|d|w)\s+ago)(.+)$/i);
    if (!m) {
      i++;
      continue;
    }
    const mapName = m[2].trim();
    if (mapName.toLowerCase() === "ranked") {
      i++;
      continue;
    }
    let score = null;
    let result = null;
    let rp = null;
    let drp = 0;
    let k = null;
    let d = null;
    let a = null;
    let hs = null;
    let badgeLine = "";
    let j = i + 1;
    while (j < Math.min(i + 20, lines.length)) {
      const s = lines[j].trim();
      if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/.test(s)) break;
      if (/^\d+(?:mo|d|w)\s+ago/i.test(s)) break;
      if (s === "Score" && j + 1 < lines.length) {
        const sm = lines[j + 1].trim().match(/(\d+)\s*:\s*(\d+)/);
        if (sm) {
          const a1 = parseInt(sm[1], 10);
          const a2 = parseInt(sm[2], 10);
          score = `${a1}:${a2}`;
          result = a1 > a2 ? "W" : "L";
        }
        j += 2;
        continue;
      }
      if (s.startsWith("RP") && s !== "RP Rollback") {
        let k2 = j + 1;
        while (k2 < lines.length && lines[k2].trim() === "RP") k2++;
        if (k2 < lines.length) {
          const rm = lines[k2].trim().match(/^([\d,]+)\s*([+-][\d,]+)?$/);
          if (rm) {
            rp = parseInt(rm[1].replace(/,/g, ""), 10);
            drp = rm[2] ? parseInt(rm[2].replace(/,/g, ""), 10) : 0;
          }
        }
        j = k2 + 1;
        continue;
      }
      if (s === "K/D/A" && j + 1 < lines.length) {
        const km = lines[j + 1].trim().match(/(\d+)\s+(\d+)\s+(\d+)/);
        if (km) {
          k = parseInt(km[1], 10);
          d = parseInt(km[2], 10);
          a = parseInt(km[3], 10);
        }
        j += 2;
        continue;
      }
      if (s.startsWith("HS") && j + 1 < lines.length) {
        const hm = lines[j + 1].match(/([\d.]+)/);
        if (hm) hs = parseFloat(hm[1]);
        j += 2;
        continue;
      }
      if (s && s !== "Ranked" && !s.startsWith("K/D") && !/^[\d.]+$/.test(s)) {
        if (!["Score", "RP", "K/D", "HS"].some((x) => s.includes(x)) && !s.includes("ago")) {
          if (/(2K|3K|4K|Ace|Clutch|Lost|Victim|TK|1v)/i.test(s)) badgeLine = s;
        }
      }
      j++;
    }
    if (score && rp !== null) {
      matches.push({
        date: currentDate, map: mapName, result, score,
        rp, drp, k: k ?? 0, d: d ?? 0, a: a ?? 0,
        hs: hs ?? 0.0, badges: parseBadges(badgeLine),
      });
    } else if (score && k !== null) {
      // Mar 14 Consulate-style row missing RP line
      matches.push({
        date: currentDate, map: mapName, result, score,
        rp: 0, drp: 0, k, d: d ?? 0, a: a ?? 0,
        hs: hs ?? 0.0, badges: parseBadges(badgeLine),
      });
    }
    i++;
  }
  return matches;
}

function parseOperators(text) {
  const ops = [];
  const blocks = text.split(/Operator\s*\n/);
  for (const block of blocks.slice(1)) {
    const lines = block.trim().split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (lines.length < 11) continue;
    const name = lines[0];
    const nums = [];
    for (const ln of lines.slice(1)) {
      if (/^[\d.]+%?$/.test(ln) || /^[\d,]+$/.test(ln)) nums.push(ln.replace(/,/g, ""));
    }
    if (nums.length < 10) continue;
    const display = OP_ALIASES[name] ?? name;
    ops.push({
      name: display,
      side: SIDE[name] ?? SIDE[display] ?? "DEF",
      rounds: parseInt(parseFloat(nums[0]), 10),
      winPct: parseFloat(nums[1].replace("%", "")),
      kd: parseFloat(nums[2]),
      hs: parseFloat(nums[3].replace("%", "")),
      w: parseInt(nums[4], 10),
      l: parseInt(nums[5], 10),
      k: parseInt(nums[6], 10),
      d: parseInt(nums[7], 10),
      a: parseInt(nums[8], 10),
      aces: parseInt(nums[9], 10),
      tks: nums[10] ? parseInt(nums[10], 10) : 0,
    });
  }
  return ops.sort((a, b) => b.rounds - a.rounds);
}

function tallyBadges(matches) {
  const counts = {};
  for (const m of matches) {
    if (m.result === "RB") continue;
    for (const b of m.badges ?? []) counts[b] = (counts[b] ?? 0) + 1;
  }
  const order = [
    "2K", "3K", "4K", "Ace", "1v1 Clutch", "1v2 Clutch", "1v3 Clutch", "1v4 Clutch", "1v5 Clutch",
    "Victim", "1v1 Lost", "1v2 Lost", "1v3 Lost", "TK",
  ];
  return order.filter((n) => counts[n]).map((n) => ({ name: n, count: counts[n] }));
}

const path = resolve(process.argv[2] ?? "tools/cunder_y11s1_paste.txt");
const raw = readFileSync(path, "utf8");
const [matchPart, opPart = ""] = raw.includes("------------") ? raw.split("------------") : [raw, ""];
const matches = parseMatches(matchPart);
const operators = opPart.trim() ? parseOperators(opPart) : [];
const out = { match_count: matches.length, operator_count: operators.length, matches, operators, badges: tallyBadges(matches) };
const outPath = process.argv[3] ?? "tools/cunder_parsed.json";
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Parsed ${out.match_count} matches, ${out.operator_count} operators → ${outPath}`);
