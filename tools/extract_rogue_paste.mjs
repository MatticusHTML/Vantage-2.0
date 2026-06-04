import { readFileSync, writeFileSync } from "fs";

const path =
  "C:/Users/Matthew/.cursor/projects/c-Users-Matthew-Desktop-Cursor-Github-Vantage-2-0/agent-transcripts/1eb5e3d1-a7b9-42fe-b2d0-ee49f7c0b49f/1eb5e3d1-a7b9-42fe-b2d0-ee49f7c0b49f.jsonl";

for (const line of readFileSync(path, "utf8").split("\n")) {
  if (!line.includes("Operator\nKaid") && !line.includes("Operator\\nKaid")) continue;
  if (!line.includes("Jun 1")) continue;
  const o = JSON.parse(line);
  const parts = o.message?.content ?? o.content ?? [];
  for (const part of parts) {
    const t = typeof part === "string" ? part : part.text ?? "";
    if (!t.includes("Jun 1") || !t.includes("Operator")) continue;
    const start = t.indexOf("Jun 1");
    let end = t.indexOf("----------");
    if (end < 0) end = t.indexOf("Now here is the operators");
    const paste = t.slice(start, end).trim() + "\n\n----------\n\n" + t.slice(t.indexOf("Operators Overview")).split("Dismiss")[0].split("</user_query>")[0].trim();
    // cleaner: split at operators section
    const opStart = t.indexOf("Operators Overview");
    const matchPart = t.slice(start, opStart).replace(/\n\n----------\n\n$/, "").trim();
    const opPart = t.slice(opStart);
    const full = matchPart + "\n\n------------\n\n" + opPart.replace(/^[\s\S]*?Operators Overview\s*\n/i, "Operators Overview\n");
    writeFileSync("tools/rogue_y11s1_paste.txt", full);
    console.log(`Wrote ${full.length} chars, matches lines ~${matchPart.split("\n").length}, ops included`);
    process.exit(0);
  }
}
console.error("Paste not found");
process.exit(1);
