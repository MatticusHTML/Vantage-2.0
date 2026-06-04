import { readFileSync, writeFileSync } from "fs";

const path =
  "C:/Users/Matthew/.cursor/projects/c-Users-Matthew-Desktop-Cursor-Github-Vantage-2-0/agent-transcripts/1eb5e3d1-a7b9-42fe-b2d0-ee49f7c0b49f/1eb5e3d1-a7b9-42fe-b2d0-ee49f7c0b49f.jsonl";

for (const line of readFileSync(path, "utf8").split("\n")) {
  if (!line.includes("all the matches for cunder")) continue;
  const o = JSON.parse(line);
  const parts = o.message?.content ?? o.content ?? [];
  for (const part of parts) {
    const t = typeof part === "string" ? part : part.text ?? "";
    if (!t.includes("Jun 1") || !t.includes("Operators Overview")) continue;
    const start = t.indexOf("Jun 1");
    let end = t.indexOf("Ill also include a screenshot");
    if (end < 0) end = t.indexOf("Lets get to work");
    const paste = t.slice(start, end).trim();
    writeFileSync("tools/cunder_y11s1_paste.txt", paste);
    console.log(`Wrote ${paste.length} chars, ${paste.split("\n").length} lines`);
    process.exit(0);
  }
}
console.error("Paste not found");
process.exit(1);
