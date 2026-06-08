#!/usr/bin/env node
/** Fix operator side (ATK/DEF) in all data JSON blocks against canonical roster. */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const CANONICAL = {
  Ace: "ATK", Amaru: "ATK", Ash: "ATK", Blackbeard: "ATK", Blitz: "ATK", Brava: "ATK",
  Buck: "ATK", Capitao: "ATK", Deimos: "ATK", Dokkaebi: "ATK", Flores: "ATK", Finka: "ATK",
  Fuze: "ATK", Glaz: "ATK", Gridlock: "ATK", Grim: "ATK", Hibana: "ATK", Iana: "ATK",
  IQ: "ATK", Jackal: "ATK", Kali: "ATK", Lion: "ATK", Maverick: "ATK", Montagne: "ATK",
  Nokk: "ATK", Nomad: "ATK", Osa: "ATK", Ram: "ATK", Rauora: "ATK", Sledge: "ATK",
  Striker: "ATK", Thatcher: "ATK", Thermite: "ATK", Twitch: "ATK", Ying: "ATK", Zero: "ATK",
  Zofia: "ATK", Sens: "ATK", "Solid Snake": "ATK",
  Alibi: "DEF", Aruni: "DEF", Azami: "DEF", Bandit: "DEF", Castle: "DEF", Caveira: "DEF",
  Clash: "DEF", Denari: "DEF", Doc: "DEF", Echo: "DEF", Ela: "DEF", Fenrir: "DEF",
  Frost: "DEF", Goyo: "DEF", Jager: "DEF", Kaid: "DEF", Kapkan: "DEF", Lesion: "DEF",
  Maestro: "DEF", Melusi: "DEF", Mira: "DEF", Mozzie: "DEF", Mute: "DEF", Oryx: "DEF",
  Pulse: "DEF", Rook: "DEF", Sentry: "DEF", Skopos: "DEF", Smoke: "DEF",
  Solis: "DEF", Tachanka: "DEF", Thorn: "DEF", Thunderbird: "DEF",
  Tubarao: "DEF", Valkyrie: "DEF", Vigil: "DEF", Warden: "DEF",
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

const dataRoot = join(process.cwd(), "data");
const files = walk(dataRoot);
let totalFixes = 0;

for (const file of files) {
  let text = readFileSync(file, "utf8");
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (!m) continue;
  let j;
  try { j = JSON.parse(m[1]); } catch { continue; }
  if (!Array.isArray(j.operators) || !j.operators.length) continue;

  const fixes = [];
  for (const op of j.operators) {
    const want = CANONICAL[op.name];
    if (!want) {
      console.warn("UNKNOWN OP:", op.name, "in", file);
      continue;
    }
    if (op.side !== want) {
      fixes.push(`${op.name}: ${op.side} → ${want}`);
      op.side = want;
    }
  }
  if (!fixes.length) continue;

  const newJson = JSON.stringify(j, null, 2);
  text = text.replace(m[0], "```json\n" + newJson + "\n```");
  writeFileSync(file, text, "utf8");
  console.log(file);
  fixes.forEach(f => console.log("  ", f));
  totalFixes += fixes.length;
}

console.log(`\nDone. ${totalFixes} operator side(s) corrected.`);
