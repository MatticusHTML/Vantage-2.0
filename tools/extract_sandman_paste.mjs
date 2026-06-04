import { readFileSync, writeFileSync } from "fs";

const path =
  "C:/Users/Matthew/.cursor/projects/c-Users-Matthew-Desktop-Cursor-Github-Vantage-2-0/agent-transcripts/1eb5e3d1-a7b9-42fe-b2d0-ee49f7c0b49f/1eb5e3d1-a7b9-42fe-b2d0-ee49f7c0b49f.jsonl";

for (const line of readFileSync(path, "utf8").split("\n")) {
  if (!line.includes("Operator") || !line.includes("Sledge")) continue;
  if (!line.includes("May 31")) continue;
  if (!line.includes("Grandmaster") && !line.includes("sandman") && !line.includes("Time for operator")) continue;
  const o = JSON.parse(line);
  const parts = o.message?.content ?? o.content ?? [];
  for (const part of parts) {
    const t = typeof part === "string" ? part : part.text ?? "";
    if (!t.includes("May 31") || !t.includes("Operators Overview")) continue;
    const start = t.indexOf("May 31");
    const opStart = t.indexOf("Operators Overview");
    const matchPart = t.slice(start, t.indexOf("-------", start)).trim();
    const opPart = t.slice(opStart);
    const full = matchPart + "\n\n------------\n\n" + opPart.replace(/^[\s\S]*?Operators Overview\s*\n/i, "Operators Overview\n");
    writeFileSync("tools/sandman_y11s1_paste.txt", full);
    console.log(`Wrote ${full.length} chars`);
    process.exit(0);
  }
}
console.error("Paste not found");
process.exit(1);
