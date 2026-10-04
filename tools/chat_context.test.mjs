import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import test from "node:test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browserSource = readFileSync(resolve(ROOT, "assets/js/vantage.js"), "utf8");
const workerSource = readFileSync(resolve(ROOT, "workers/vantage-chat.js"), "utf8");
const worker = (await import("data:text/javascript;base64," + Buffer.from(workerSource).toString("base64"))).default;
const origin = "https://matticushtml.github.io";
const env = { ALLOWED_ORIGINS: origin, OPENROUTER_API_KEY: "test-only-placeholder" };
const plain = value => JSON.parse(JSON.stringify(value));

function record(slug, season = "Y11S2") {
  const text = readFileSync(resolve(ROOT, "data", slug, season, "current.md"), "utf8");
  return JSON.parse(text.match(/```json\s*([\s\S]*?)```/)[1]);
}

function browser(overrides = new Map()) {
  const context = createContext({
    document: { body: { dataset: { page: "oversight", base: "" } } },
    fetch: async url => {
      const file = resolve(ROOT, url);
      return {
        ok: overrides.has(url) || existsSync(file),
        status: overrides.has(url) || existsSync(file) ? 200 : 404,
        text: async () => overrides.has(url)
          ? "```json\n" + JSON.stringify(overrides.get(url)) + "\n```"
          : readFileSync(file, "utf8"),
      };
    },
  });
  const boot = browserSource.indexOf("/* ---- boot ---- */");
  assert.ok(boot > 0);
  runInContext(browserSource.slice(0, boot), context);
  return context;
}

function decodeRows(columns, rows) {
  return plain(rows.map(row => Object.fromEntries(columns.map((key, i) => [key, row[i]]))));
}

async function send(messages) {
  const originalFetch = globalThis.fetch;
  let upstream = null;
  globalThis.fetch = async (_url, init) => {
    upstream = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: "mock reply" } }] }));
  };
  try {
    const request = new Request("https://worker.test", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const response = await worker.fetch(request, env);
    return { status: response.status, body: await response.json(), upstream };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function longHistory() {
  const history = [];
  for (let i = 1; i <= 30; i++) {
    history.push({ role: "user", content: "Question " + i });
    history.push({ role: "assistant", content: "Reply " + i });
  }
  history.push({ role: "user", content: "Current question" });
  return history;
}

test("compact dossier context preserves all operator, map-overview, and recent-match values for all eight accounts", async () => {
  const ctx = browser();
  const roster = runInContext("[...ROSTER, ...ALT_ACCOUNTS]", ctx);
  for (const cfg of roster) {
    const data = await ctx.buildPlayerChatContext(cfg.slug, "Y11S2");
    const source = record(cfg.slug);
    assert.deepEqual(plain(data.focusPlayer.meta), source.meta);
    assert.deepEqual(plain(data.focusPlayer.badges), source.badges);
    assert.deepEqual(decodeRows(data.operatorColumns, data.focusPlayer.operators), source.operators);
    assert.deepEqual(decodeRows(data.mapColumns, data.focusPlayer.mapOverview), source.mapOverview || []);
    assert.deepEqual(decodeRows(data.matchColumns, data.focusPlayer.recentMatches), source.matches.slice(0, 12));
    assert.deepEqual(plain(data.focusPlayer.dataNotes), source.dataNotes || []);
    assert.deepEqual(plain(data.focusPlayer.resultGroups), source.resultGroups || []);
    assert.deepEqual(plain(data.focusPlayer.rpInferences), source.rpInferences || []);
  }
});

test("unresolved results and inferred RP evidence reach the dossier model intact", async () => {
  // Keep the observed close-out ambiguity as a fixture if the owner later resolves it.
  const source = {
    ...record("mjester1337"),
    dataNotes:["Aug 1 Casino has two losses and one unclassified outcome; the omitted row's identity is unknown."],
    resultGroups:[{id:"aug1_calypso_casino",date:"Aug 1",map:"Calypso Casino",candidates:[{rp:2230,score:"2:3"},{rp:2220,score:"2:3"},{rp:2270,score:"1:4"}],outcomes:{L:2,U:1}}],
    rpInferences:[{date:"Aug 29",map:"Border",rp:2259,drp:-25,fromRp:2284,source:"Derived from adjacent RP-after readings; delta absent from paste."}],
  };
  const ctx = browser(new Map([["data/mjester1337/Y11S2/current.md",source]]));
  const data = await ctx.buildPlayerChatContext("mjester1337", "Y11S2");
  const prompt = ctx.buildPlayerChatSystemPrompt(data, {name:"MJester1337"});
  const result = await send([{role:"system",content:prompt},{role:"user",content:"Explain the uncertain results and RP trail"}]);
  assert.equal(result.status, 200);
  const forwarded = JSON.parse(result.upstream.messages[0].content.split("DOSSIER DATA:\n")[1]);
  assert.deepEqual(forwarded.focusPlayer.dataNotes, source.dataNotes);
  assert.deepEqual(forwarded.focusPlayer.resultGroups, source.resultGroups);
  assert.deepEqual(forwarded.focusPlayer.rpInferences, source.rpInferences);
  assert.deepEqual(forwarded.focusPlayer.resultGroups[0].outcomes, {L:2,U:1});
  assert.deepEqual(forwarded.focusPlayer.resultGroups[0].candidates.map(row=>row.rp), [2230,2220,2270]);
  assert.equal(forwarded.focusPlayer.rpInferences[0].drp, -25);
  assert.match(prompt, /never guess which candidate had which outcome/);
  assert.match(prompt, /derived RP changes, not explicitly reported deltas/);
});

test("the complete current squad JSON reaches the model intact", async () => {
  const ctx = browser();
  const data = await ctx.buildOversightChatContext("Y11S2");
  const prompt = ctx.buildOversightChatSystemPrompt(data);
  const result = await send([{ role: "system", content: prompt }, { role: "user", content: "Compare everyone" }]);
  assert.equal(result.status, 200);
  assert.equal(result.upstream.messages[0].content, prompt);
  const forwarded = JSON.parse(result.upstream.messages[0].content.split("SQUAD DATA:\n")[1]);
  assert.equal(forwarded.players.length, 7);
  assert.deepEqual(forwarded.seasonSummary, record("oversight").seasonSummary || null);
  assert.deepEqual(forwarded.togetherEvidence, record("oversight").togetherEvidence || []);
  for (const account of forwarded.relatedAccounts) {
    const source = record(account.slug);
    assert.deepEqual(account.meta, source.meta);
    assert.deepEqual(decodeRows(forwarded.operatorColumns, account.operators), source.operators);
    assert.deepEqual(decodeRows(forwarded.mapColumns, account.mapOverview), source.mapOverview || []);
    assert.equal(account.seasonReport, source.seasonReport);
  }
  assert.equal(forwarded.relatedAccounts.find(p => p.slug === "lcew4ll0wcome").parentSlug, "rogue_amputee");
  if (record("oversight").additionalAccounts?.some(p => p.slug === "snsoldier")) {
    const soldier = forwarded.relatedAccounts.find(p => p.slug === "snsoldier");
    assert.equal(soldier.accountType, "roster role unconfirmed");
    assert.equal(soldier.parentSlug, undefined);
  }
  assert.deepEqual(forwarded, plain(data));
  for (const player of forwarded.players) {
    assert.deepEqual(decodeRows(forwarded.mapColumns, player.mapOverview), record(player.slug).mapOverview || []);
  }
});

test("map comparison preserves full entry denominators and unresolved group outcomes", () => {
  const ctx = browser();
  const roster = runInContext("[...ROSTER, ...ALT_ACCOUNTS]", ctx);
  const data = roster.map(cfg => ({ cfg, rec: record(cfg.slug) }));
  const comparison = plain(ctx.buildMapComparisonData(data));
  for (const player of comparison.players) {
    for (const overview of record(player.slug).mapOverview || []) {
      const stat = player.stats[comparison.maps.indexOf(overview.name)];
      assert.equal(stat.matches, overview.matches);
      assert.equal(stat.w, overview.w);
      assert.equal(stat.l, overview.l);
      assert.equal(stat.unclassified, overview.matches - overview.w - overview.l);
      assert.equal(stat.winPct, overview.w / overview.matches * 100);
    }
  }
  const jester = record("mjester1337");
  delete jester.mapOverview;
  const fallback = plain(ctx.buildMapComparisonData([{ cfg: { slug: "mjester1337", name: "MJester1337" }, rec: jester }]));
  const casino = fallback.players[0].stats[fallback.maps.indexOf("Calypso Casino")];
  assert.equal(casino.matches, 65);
  assert.equal(casino.w, 31);
  assert.equal(casino.l, 33);
  assert.equal(casino.unclassified, 1);
  assert.equal(casino.winPct, 31 / 65 * 100);
});

test("the squad map column excludes alts and displays unclassified entries", () => {
  const ctx = browser();
  const cfg = runInContext("[ROSTER[0], ALT_ACCOUNTS[0]]", ctx);
  const html = ctx.mapHeatmap([
    { cfg: cfg[0], rec: { mapOverview: [{ name: "Fixture map", matches: 4, w: 2, l: 1 }] } },
    { cfg: cfg[1], rec: { mapOverview: [{ name: "Fixture map", matches: 6, w: 6, l: 0 }] } },
  ]);
  assert.match(html, /2-1 \+ 1 U/);
  assert.match(html, /<td><span class="map-chip [^"]+">50%<\/span><\/td><\/tr>/);
  assert.match(html, /squad excludes alts/);
});

test("a system context longer than the old 32,000-character cap stays valid and complete", async () => {
  const content = JSON.stringify({ stats: "x".repeat(60000), lastPlayer: "Mynameisblang" });
  const result = await send([{ role: "system", content }, { role: "user", content: "Read the final player" }]);
  assert.equal(result.status, 200);
  assert.equal(result.upstream.messages[0].content, content);
  assert.equal(JSON.parse(result.upstream.messages[0].content).lastPlayer, "Mynameisblang");
});

test("browser requests retain the system prompt and complete recent turns in long conversations", () => {
  const ctx = browser();
  const history = longHistory();
  const messages = plain(ctx.buildChatMessages("Current season stats", history));
  assert.equal(messages.length, 24);
  assert.deepEqual(messages[0], { role: "system", content: "Current season stats" });
  assert.equal(messages[1].role, "user");
  assert.equal(messages.at(-1).content, "Current question");
  assert.equal(history.length, 61);
});

test("the Worker preserves the system prompt even for an old client's unbounded conversation", async () => {
  const result = await send([{ role: "system", content: "Current season stats" }, ...longHistory()]);
  assert.equal(result.status, 200);
  assert.equal(result.upstream.messages.length, 24);
  assert.equal(result.upstream.messages[0].content, "Current season stats");
  assert.equal(result.upstream.messages[1].role, "user");
  assert.equal(result.upstream.messages.at(-1).content, "Current question");
});

test("invalid entries do not displace valid conversation context", async () => {
  const result = await send([
    { role: "system", content: "Current season stats" },
    { role: "user", content: "Valid question" },
    ...Array.from({ length: 30 }, () => ({ role: "unknown", content: "ignored" })),
  ]);
  assert.equal(result.status, 200);
  assert.equal(result.upstream.messages.length, 2);
});

test("oversized system context is rejected instead of silently corrupting JSON", async () => {
  const result = await send([
    { role: "system", content: "x".repeat(160001) },
    { role: "user", content: "Compare everyone" },
  ]);
  assert.equal(result.status, 400);
  assert.match(result.body.error, /System context exceeds/);
  assert.equal(result.upstream, null);
});

test("individual close-outs and the team review are included without stale live comments", async () => {
  const player = record("matticus_hq");
  player.seasonClosed = true;
  player.seasonReport = "<p>Final player review with verified stats.</p>";
  const squad = record("oversight");
  squad.seasonClosed = true;
  squad.seasonReport = "<p>Final squad review with verified stats.</p>";
  const ctx = browser(new Map([
    ["data/matticus_hq/Y11S2/current.md", player],
    ["data/oversight/Y11S2/current.md", squad],
  ]));
  const dossier = await ctx.buildPlayerChatContext("matticus_hq", "Y11S2");
  assert.equal(dossier.focusPlayer.seasonReport, player.seasonReport);
  assert.equal(dossier.focusPlayer.latestComments, undefined);
  const data = await ctx.buildOversightChatContext("Y11S2");
  assert.equal(data.players.find(p => p.slug === "matticus_hq").seasonReport, player.seasonReport);
  assert.equal(data.players.find(p => p.slug === "cunderthock").seasonClosed, !!record("cunderthock").seasonClosed);
  assert.equal(data.seasonReport, squad.seasonReport);
  assert.equal(data.latestSquadComments, null);
});

test("77 operators, 17 map overviews, and 40-sentence reviews for all seven players fit intact", async () => {
  const ctx = browser();
  const roster = runInContext("ROSTER", ctx);
  const overrides = new Map();
  for (const cfg of roster) {
    const data = record(cfg.slug);
    data.operators = Array.from({ length: 77 }, (_, i) => ({
      ...data.operators[i % data.operators.length], name: "Fixture operator " + i,
    }));
    data.mapOverview = record("rogue_amputee").mapOverview;
    data.seasonClosed = true;
    data.seasonReport = "<p>" + Array.from({ length: 40 }, () =>
      "This synthetic review sentence describes a verified season result and a concrete coaching adjustment for the next season."
    ).join(" ") + "</p>";
    overrides.set("data/" + cfg.slug + "/Y11S2/current.md", data);
  }
  const grown = browser(overrides);
  const data = await grown.buildOversightChatContext("Y11S2");
  const prompt = grown.buildOversightChatSystemPrompt(data);
  const result = await send([{ role: "system", content: prompt }, { role: "user", content: "Review the squad" }]);
  assert.equal(result.status, 200);
  assert.equal(result.upstream.messages[0].content, prompt);
  for (const player of JSON.parse(prompt.split("SQUAD DATA:\n")[1]).players) {
    assert.equal(player.operators.length, 77);
    assert.equal(player.mapOverview.length, 17);
    assert.ok(player.seasonReport.includes("concrete coaching adjustment"));
  }
});
