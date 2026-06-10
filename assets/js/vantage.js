/* ============================================================
   VANTAGE / OVERSIGHT  —  rendering engine (shared by all pages)

   Each page sets on <body>:  data-page="roster|player|oversight"
                              data-player="<slug>"   (player pages)
                              data-base="../"         (pages in /players/)

   Data source of truth: data/<slug>/<season>/current.md
   Each current.md contains ONE ```json fenced block (the full record).
   The design never changes on update — only the markdown changes.
   ============================================================ */
const BASE = document.body.dataset.base || "";
const PAGE = document.body.dataset.page || "roster";

/* ---- roster config: order = character-select grid order ---- */
const ROSTER = [
  { slug:"cunderthock",        name:"CunderThock",        ubi:"Cunders",          accent:"#ffc800" },
  { slug:"matticus_hq",        name:"Matticus HQ",        ubi:"LOAF_OF_EDIBLES",  accent:"#9a5cd4" },
  { slug:"rogue_amputee",      name:"Rogue_Amputee",      ubi:"Rogue_Amputee",    accent:"#4da8ff" },
  { slug:"grandmaster_sandman",name:"Grandmaster Sandman",ubi:"LOAF_OF_RAMEN",    accent:"#2bb87a" },
];
const SEASONS = ["Y11S2","Y11S1"];           // newest first — Y11S2 is default
const DEFAULT_SEASON = SEASONS[0];
const SEASON_OPS = {
  Y11S1: "Operation Silent Hunt",
  Y11S2: "Operation System Override",
};
const RECRUITS = ["blue","green","orange","red","yellow"];
const ICON_ALIAS = { solidsnake:"snake" };

/* ---- helpers ---- */
const byId = id => document.getElementById(id);
const fmt  = n => (n===null||n===undefined||n==="") ? "—" : Number(n).toLocaleString();
const esc  = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function slugify(name){
  return String(name).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/ø/g,"o").replace(/[^a-z0-9]/g,"");
}
function iconSrc(name){
  let s = slugify(name); s = ICON_ALIAS[s] || s;
  return `${BASE}assets/icons/${s}.svg`;
}
function recruitSrc(){ return `${BASE}assets/icons/recruit_${RECRUITS[Math.floor(Math.random()*RECRUITS.length)]}.svg`; }
/* operator icon img; on missing file -> random Recruit fallback */
function opIconImg(name){
  return `<img src="${iconSrc(name)}" alt="${esc(name)}" loading="lazy" onerror="this.onerror=null;this.src='${recruitSrc()}'">`;
}
function commentIconImg(c){
  if(c.type==="map") return `<img src="${BASE}assets/icons/location_blue.svg" alt="map">`;
  return `<img src="${iconSrc(c.subject)}" alt="${esc(c.subject)}" onerror="this.onerror=null;this.src='${recruitSrc()}'">`;
}

/* ---- comment waves: 6 per refresh (1 map + 5 operators); latest on page, past in modal ---- */
const COMMENT_WAVE_SIZE = 6;
function splitCommentWaves(comments){
  if(!comments||!comments.length) return [];
  const waves=[];
  for(let i=0;i<comments.length;i+=COMMENT_WAVE_SIZE) waves.push(comments.slice(i,i+COMMENT_WAVE_SIZE));
  return waves;
}
function waveLabel(n,wave){
  const dates=[...new Set(wave.map(c=>c.date).filter(Boolean))];
  if(!dates.length) return `Wave ${n}`;
  if(dates.length===1) return `Wave ${n} · ${dates[0]}`;
  return `Wave ${n} · ${dates[dates.length-1]} – ${dates[0]}`;
}
function renderCommentsClog(comments,{dimOld=false}={}){
  return comments.map(c=>`<div class="comment ${c.type==="map"?"map":""} ${dimOld&&c.old?"old":""}">
      <span class="cicon">${commentIconImg(c)}</span>
      <div class="cbody"><div class="ctop"><span class="ctype ${c.type==="map"?"map":""}">${c.type}</span>
      <span class="csubj">${esc(c.subject)}</span><span class="cdate">${esc(c.date||"")}</span></div>
      <div class="ctext">${esc(c.text)}</div></div></div>`).join("");
}
function commentLogPanel(comments,{title,note,dimOld=false}={}){
  const waves=splitCommentWaves(comments);
  if(!waves.length) return "";
  const current=waves[waves.length-1];
  const past=waves.slice(0,-1);
  const pastStore=past.length?`<div class="past-comments-store" hidden aria-hidden="true">${past.map((w,i)=>`<div class="comment-wave-block">
      <div class="wave-hdr">${esc(waveLabel(i+1,w))}</div>
      <div class="clog">${renderCommentsClog(w,{dimOld})}</div></div>`).join("")}</div>`:"";
  const foot=past.length?`<div class="clog-foot"><button type="button" class="past-comments-btn" aria-haspopup="dialog">
      Past comments <span class="n">— ${past.length} earlier wave${past.length>1?"s":""}</span></button></div>`:"";
  return `<div class="panel comment-log-panel">${pastStore}
    <div class="sect-hdr">${title}${note?` <span class="n">${note}</span>`:""}</div>
    <div class="clog">${renderCommentsClog(current,{dimOld})}</div>${foot}</div>`;
}
function ensureCommentModal(){
  let m=byId("comment-modal");
  if(m) return m;
  m=document.createElement("div");
  m.id="comment-modal";
  m.className="comment-modal";
  m.hidden=true;
  m.innerHTML=`<div class="comment-modal-backdrop" data-close-modal></div>
    <div class="comment-modal-panel" role="dialog" aria-modal="true" aria-labelledby="comment-modal-title">
      <div class="comment-modal-hdr"><span id="comment-modal-title">// PAST COMMENTS</span>
        <button type="button" class="comment-modal-close" data-close-modal aria-label="Close">×</button></div>
      <div class="comment-modal-body" id="comment-modal-body"></div>
    </div>`;
  document.body.appendChild(m);
  m.querySelectorAll("[data-close-modal]").forEach(el=>el.onclick=closeCommentModal);
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!m.hidden) closeCommentModal(); });
  return m;
}
function openCommentModal(html){
  const m=ensureCommentModal();
  byId("comment-modal-body").innerHTML=html;
  m.hidden=false;
  document.body.classList.add("modal-open");
}
function closeCommentModal(){
  const m=byId("comment-modal");
  if(!m||m.hidden) return;
  m.hidden=true;
  document.body.classList.remove("modal-open");
  byId("comment-modal-body").innerHTML="";
}
function wirePastComments(root="#view"){
  ensureCommentModal();
  document.querySelectorAll(`${root} .past-comments-btn`).forEach(btn=>{
    btn.onclick=()=>{
      const store=btn.closest(".comment-log-panel")?.querySelector(".past-comments-store");
      if(!store) return;
      openCommentModal(store.innerHTML);
    };
  });
}
function wrColor(p){ p=parseFloat(p); if(isNaN(p))return"var(--white)"; if(p>=55)return"var(--green)"; if(p>=45)return"var(--gold)"; return"var(--red)"; }
function seasonOp(s){ return SEASON_OPS[s] || ""; }
function setBrandTag(text){ const el=document.querySelector(".cmdbar .tag"); if(el) el.textContent=text; }

/* ---- ambient FX / seasonal themes ---- */
function initFxLayers(){
  if(document.querySelector(".fx-root")){
    if(!document.querySelector(".fx-skulls")){
      const root=document.querySelector(".fx-root");
      const skulls=document.createElement("div");
      skulls.className="fx fx-skulls";
      skulls.setAttribute("aria-hidden","true");
      const hud=root.querySelector(".fx-hud");
      if(hud) root.insertBefore(skulls,hud);
      else root.appendChild(skulls);
    }
    return;
  }
  const root=document.createElement("div");
  root.className="fx-root";
  root.setAttribute("aria-hidden","true");
  root.innerHTML=[
    '<div class="fx fx-base"></div>',
    '<div class="fx fx-grid"></div>',
    '<div class="fx fx-sweep"></div>',
    '<div class="fx fx-smoke"></div>',
    '<div class="fx fx-scan"></div>',
    '<div class="fx fx-vignette"></div>',
    '<div class="fx fx-noise"></div>',
    '<div class="fx fx-glitch"></div>',
    '<div class="fx fx-skulls"></div>',
    '<div class="fx fx-hud"></div>',
  ].join("");
  document.body.prepend(root);
}
function clearThemeClasses(){
  document.body.classList.remove("theme-y11s1","theme-y11s2");
}

/* Y11S2 · Dokkaebi background intercepts (pool: data/doka/Y11S2/pool.json) */
const DOKA_AMBIENT_FALLBACK = ["[TRACE DETECTED]","0xDEAD","[ghost process]","// SYSTEM_OVERRIDE","packet sniffing..."];
let dokaPool = null;
let dokaPoolPromise = null;
let dokaSpawnerOn = false;
let dokaGlitchHandler = null;
let dokaBootTimer = null;
let dokaPlayerSlug = null;

async function loadDokaPool(){
  if(dokaPool && dokaPool.season === "Y11S2") return dokaPool;
  if(dokaPoolPromise) return dokaPoolPromise;
  dokaPoolPromise = fetch(`${BASE}data/doka/Y11S2/pool.json`, {cache:"no-store"})
    .then(r => r.ok ? r.json() : null)
    .then(j => { dokaPool = j; return j; })
    .catch(() => null);
  return dokaPoolPromise;
}

function stopDokaSpawner(){
  dokaSpawnerOn = false;
  dokaPlayerSlug = null;
  if(dokaBootTimer){ clearTimeout(dokaBootTimer); dokaBootTimer = null; }
  const glitch = document.querySelector(".fx-glitch");
  if(glitch && dokaGlitchHandler) glitch.removeEventListener("animationiteration", dokaGlitchHandler);
  dokaGlitchHandler = null;
  document.querySelectorAll(".fx-doka-intercept").forEach(el => el.remove());
}

function stopDokaEffects(){
  stopDokaSpawner();
  removeDokaIntro();
}

function dokaSpawnPos(){
  const r = Math.random();
  if(r < 0.45) return { left: 1 + Math.random() * 11, top: 10 + Math.random() * 78 };
  if(r < 0.90) return { left: 88 + Math.random() * 10, top: 10 + Math.random() * 78 };
  if(r < 0.95) return { left: 14 + Math.random() * 72, top: 2 + Math.random() * 4 };
  return { left: 14 + Math.random() * 72, top: 94 + Math.random() * 4 };
}

function pickAmbientLine(){
  const pool = dokaPool?.ambient?.length ? dokaPool.ambient : DOKA_AMBIENT_FALLBACK;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickDokaLine(){
  if(!dokaPool) return pickAmbientLine();
  if(Math.random() > 0.30) return pickAmbientLine();
  const slug = dokaPlayerSlug;
  const roll = Math.random();
  let lines;
  if(roll < 0.35 && slug && dokaPool.players?.[slug]?.length) lines = dokaPool.players[slug];
  else if(roll < 0.75 && dokaPool.gossip?.length) lines = dokaPool.gossip;
  else if(dokaPool.global?.length) lines = dokaPool.global;
  else lines = dokaPool.ambient || DOKA_AMBIENT_FALLBACK;
  return lines[Math.floor(Math.random() * lines.length)];
}

function spawnDokaIntercept(){
  if(!dokaSpawnerOn) return;
  const host = document.querySelector(".fx-skulls");
  if(!host) return;
  const text = pickDokaLine();
  const el = document.createElement("span");
  el.className = "fx-doka-intercept" + (text.length > 22 ? " fx-doka-quip" : "");
  const pos = dokaSpawnPos();
  el.style.left = pos.left + "%";
  el.style.top = pos.top + "%";
  el.textContent = text;
  const life = 5000 + Math.random() * 5000;
  el.style.animationDuration = life + "ms";
  host.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

function spawnDokaBurst(){
  if(!dokaSpawnerOn) return;
  const n = 2 + Math.floor(Math.random() * 3);
  for(let i = 0; i < n; i++){
    setTimeout(spawnDokaIntercept, i * (350 + Math.random() * 550));
  }
}

async function startDokaSpawner(playerSlug){
  stopDokaSpawner();
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  initFxLayers();
  await loadDokaPool();
  const glitch = document.querySelector(".fx-glitch");
  if(!glitch) return;
  dokaSpawnerOn = true;
  dokaPlayerSlug = playerSlug || null;
  dokaGlitchHandler = () => {
    setTimeout(spawnDokaBurst, 650 + Math.random() * 850);
  };
  glitch.addEventListener("animationiteration", dokaGlitchHandler);
  dokaBootTimer = setTimeout(() => { if(dokaSpawnerOn) spawnDokaBurst(); }, 4700);
}

/* Y11S2 · Dokkaebi hack intro (first ~2.5s on roster load) */
const DOKA_INTRO_SFX=`${BASE}assets/audio/DOKKAEBI_HACKING.mp3`;
const DOKA_INTRO_VOL=0.75;
let dokaIntroTimer=null;
let dokaIntroFadeTimer=null;
let dokaIntroAudio=null;

function preloadDokaIntroSfx(){
  if(PAGE!=="roster") return;
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if(dokaIntroAudio) return;
  dokaIntroAudio=new Audio(DOKA_INTRO_SFX);
  dokaIntroAudio.preload="auto";
  dokaIntroAudio.volume=DOKA_INTRO_VOL;
  dokaIntroAudio.load();
}
function stopDokaIntroSfx(){
  if(!dokaIntroAudio) return;
  dokaIntroAudio.pause();
  dokaIntroAudio.currentTime=0;
}
function playDokaIntroSfx(){
  preloadDokaIntroSfx();
  if(!dokaIntroAudio) return;
  const start=()=>{
    dokaIntroAudio.volume=DOKA_INTRO_VOL;
    dokaIntroAudio.currentTime=0;
    dokaIntroAudio.play().catch(()=>{});
  };
  if(dokaIntroAudio.readyState>=2) start();
  else dokaIntroAudio.addEventListener("canplay",start,{once:true});
}
preloadDokaIntroSfx();

function removeDokaIntro(){
  document.querySelector(".doka-intro")?.remove();
  document.body.classList.remove("doka-intro-active");
  if(dokaIntroTimer){ clearTimeout(dokaIntroTimer); dokaIntroTimer=null; }
  if(dokaIntroFadeTimer){ clearTimeout(dokaIntroFadeTimer); dokaIntroFadeTimer=null; }
  stopDokaIntroSfx();
}

function showDokaIntro(){
  removeDokaIntro();
  if(PAGE !== "roster") return;
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = document.createElement("div");
  el.className = "doka-intro";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = [
    '<div class="doka-intro-scan"></div>',
    '<div class="doka-intro-noise"></div>',
    '<div class="doka-intro-slice"></div>',
    '<div class="doka-intro-grid">',
      '<div class="doka-intro-left">',
        '<div class="doka-intro-line doka-intro-line-1">&gt; ACCESSING DATABASE...</div>',
        '<div class="doka-intro-line doka-intro-line-2">&gt; BYPASSING FIREWALL...</div>',
        '<div class="doka-intro-line doka-intro-line-3">&gt; DECRYPTING FILES...</div>',
        '<div class="doka-intro-line doka-intro-line-4">&gt; UPLOADING PAYLOAD...</div>',
        '<div class="doka-intro-line doka-intro-line-5">&gt; CONTROL ACQUIRED.</div>',
        '<div class="doka-intro-stamp">SYSTEM HACKED</div>',
      '</div>',
      '<div class="doka-intro-center">',
        '<div class="doka-intro-glyph" aria-hidden="true">☠</div>',
        '<div class="doka-intro-title"><span class="doka-intro-glitch" data-text="DOKKAEBI">DOKKAEBI</span></div>',
        '<div class="doka-intro-tag">I SEE EVERYTHING</div>',
      '</div>',
      '<div class="doka-intro-right">',
        '<div class="doka-intro-line doka-intro-line-1">&gt; USER: ADMIN</div>',
        '<div class="doka-intro-line doka-intro-line-2">&gt; STATUS: COMPROMISED</div>',
        '<div class="doka-intro-line doka-intro-line-3">&gt; PERMISSIONS: FULL</div>',
        '<div class="doka-intro-line doka-intro-line-4">&gt; TRACE: OFFLINE</div>',
        '<div class="doka-intro-stamp doka-intro-stamp-right">YOU HAVE BEEN OWNED</div>',
        '<div class="doka-intro-sign">— DOKKAEBI WAS HERE</div>',
      '</div>',
    '</div>',
  ].join("");
  document.body.appendChild(el);
  document.body.classList.add("doka-intro-active");
  requestAnimationFrame(()=>el.classList.add("doka-intro--on"));
  playDokaIntroSfx();
  dokaIntroTimer=setTimeout(()=>{
    el.classList.add("doka-intro--out");
    stopDokaIntroSfx();
    dokaIntroFadeTimer=setTimeout(removeDokaIntro,600);
  },2500);
}

function applyMenuTheme(){
  initFxLayers();
  stopDokaSpawner();
  removeDokaIntro();
  delete document.body.dataset.season;
  document.body.dataset.fx="menu";
  clearThemeClasses();
  showDokaIntro();
}
function applyPlayerSeasonTheme(season){
  initFxLayers();
  delete document.body.dataset.fx;
  clearThemeClasses();
  const s=season||DEFAULT_SEASON;
  document.body.dataset.season=s;
  document.body.classList.add(s==="Y11S1"?"theme-y11s1":"theme-y11s2");
  if(s==="Y11S2") startDokaSpawner(document.body.dataset.player);
  else stopDokaSpawner();
  removeDokaIntro();
}
function applyOversightTheme(){
  initFxLayers();
  stopDokaEffects();
  delete document.body.dataset.season;
  document.body.dataset.fx="oversight";
  clearThemeClasses();
}
function oversightTag(s){ return `Team Review · Squad Comparison · ${seasonOp(s)}`; }
function playerTag(slug,s){ const p=ROSTER.find(r=>r.slug===slug); return `${p?p.name:"Operator"} · ${seasonOp(s)}`; }
const MONTHS = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
function formatCardUpdated(s){
  if(!s) return "—";
  const m = String(s).match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/);
  if(!m) return "—";
  return `${String(MONTHS[m[1]]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}-${m[3]}`;
}

/* ---- data loading ---- */
function parseRecord(txt){
  const m = txt.match(/```json\s*([\s\S]*?)```/);
  if(!m) throw new Error("No data block found");
  return JSON.parse(m[1]);
}
async function loadRecord(slug, season){
  const res = await fetch(`${BASE}data/${slug}/${season}/current.md`, {cache:"no-store"});
  if(!res.ok) throw new Error("fetch "+res.status);
  return parseRecord(await res.text());
}
/* load the newest season that actually has matches; fall back to newest */
async function loadLatest(slug){
  let firstLoaded=null;
  for(const s of SEASONS){
    try{
      const rec = await loadRecord(slug,s);
      if(!firstLoaded) firstLoaded={season:s,rec};
      if(rec.meta && rec.matches && rec.matches.length) return {season:s,rec};
    }catch(e){}
  }
  if(firstLoaded) return firstLoaded;
  throw new Error("no data");
}
function fetchErr(host){
  host.innerHTML = `<div class="errbox"><b>// SIGNAL LOST</b>
    Can't read the data files directly from disk.
    <span>Browsers block <code>file://</code> reads. Preview through Cursor's <b>Live Preview / Go Live</b>,
    or view the published <b>GitHub Pages</b> URL — the data loads fine when the site is served.</span></div>`;
}

/* ============================================================
   PAGE: CHARACTER SELECT
   ============================================================ */
function renderRoster(){
  const grid = byId("roster");
  grid.innerHTML = ROSTER.map(p=>`
    <a class="pcard" href="players/${p.slug}.html" data-slug="${p.slug}">
      <span class="corner"></span>
      <span class="rankchip" id="rank-${p.slug}">—</span>
      <img src="assets/cards/${p.slug}.png" alt="${esc(p.name)}">
      <span class="meta">
        <span class="meta-left"><span class="call">${esc(p.name)}</span></span>
        <span class="meta-right">
          <span class="rp" id="rp-${p.slug}">—</span>
          <span class="lastupd" id="upd-${p.slug}">last updated —</span>
        </span>
      </span>
    </a>`).join("") + `
    <a class="ocard" href="oversight.html">
      <img src="assets/cards/oversight.png" alt="OVERSIGHT">
      <span class="olabel"><span class="t">Team Review</span><span class="s">OVERSIGHT · Squad Comparison</span></span>
    </a>`;
  // async: fill rank chips from each player's latest season
  ROSTER.forEach(async p=>{
    try{
      const {rec}=await loadLatest(p.slug);
      if(rec.meta){
        byId("rank-"+p.slug).textContent = rec.meta.rank || "—";
        byId("rp-"+p.slug).textContent   = rec.meta.rp ? fmt(rec.meta.rp)+" RP" : "—";
        byId("upd-"+p.slug).textContent   = "last updated "+formatCardUpdated(rec.updated);
      } else { byId("rank-"+p.slug).textContent = "UNRANKED"; }
    }catch(e){ byId("rank-"+p.slug).textContent="—"; }
  });
}

/* ============================================================
   PAGE: PLAYER DOSSIER
   ============================================================ */
let PLAYER_SEASON = null;
async function renderPlayer(){
  const slug = document.body.dataset.player;
  const view = byId("view");

  PLAYER_SEASON = PLAYER_SEASON || DEFAULT_SEASON;
  applyPlayerSeasonTheme(PLAYER_SEASON);
  buildSeasonBtns(slug, PLAYER_SEASON);
  setBrandTag(playerTag(slug, PLAYER_SEASON));

  let rec;
  try{ rec = await loadRecord(slug, PLAYER_SEASON); }
  catch(e){ fetchErr(view); return; }
  view.innerHTML = rec.meta ? playerBody(rec) : emptySeason(PLAYER_SEASON);
  wireOpSideFilter();
  wirePastComments();
}
function wireOpSideFilter(root="#view"){
  document.querySelectorAll(`${root} .op-filter`).forEach(filter=>{
    const panel=filter.closest(".panel");
    const tbody=panel?.querySelector("tbody");
    if(!tbody) return;
    const btns=filter.querySelectorAll(".op-fbtn");
    btns.forEach(btn=>btn.onclick=()=>{
      btns.forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      const f=btn.dataset.f;
      tbody.querySelectorAll("tr").forEach(tr=>{
        tr.style.display=(f==="all"||tr.dataset.side===f)?"":"none";
      });
    });
  });
}
function buildSeasonBtns(slug, active){
  const el = byId("seasons");
  el.innerHTML = `<span class="lbl">Season</span>` + SEASONS.map(s=>
    `<button class="season-btn ${s===active?'on':''}" data-s="${s}">${s}</button>`).join("");
  el.querySelectorAll(".season-btn").forEach(b=>b.onclick=()=>{ PLAYER_SEASON=b.dataset.s; renderPlayer(); });
}
function playerBody(rec){
  const m=rec.meta;
  const cards=`<div class="panel"><div class="phead">
      <img class="pic" src="${BASE}assets/cards/${document.body.dataset.player}.png" alt="">
      <div><div class="call" style="font-size:30px">${esc(rec.name||"")}</div>
      <div class="sub">${esc(rec.seasonLabel||"")} · ${esc(rec.season)} · updated ${esc(rec.updated||"—")}</div></div>
      <span class="rankpill" style="margin-left:auto">${esc(m.rank)}</span>
    </div>
    <div class="cards" style="margin-top:16px">
      <div class="card"><div class="k">Current RP</div><div class="v gold">${fmt(m.rp)}</div></div>
      <div class="card"><div class="k">Rank</div><div class="v">${esc(m.rank)}</div></div>
      <div class="card"><div class="k">Record</div><div class="v">${m.w}-${m.l}</div></div>
      <div class="card"><div class="k">Win Rate</div><div class="v" style="color:${wrColor(m.winRate)}">${m.winRate}%</div></div>
      <div class="card"><div class="k">K/D</div><div class="v">${m.kd}</div></div>
      <div class="card"><div class="k">Net RP</div><div class="v green">+${fmt(m.netRp)}</div></div>
    </div>
    <div class="milestone"><span class="bar"></span>${m.rpToNext} RP until ${esc(m.nextRank)} · season peak ${fmt(m.peakRp)} · avg HS% ${m.avgHs} · ${m.matches} matches</div>
  </div>`;

  const ops = (rec.operators||[]).slice().sort((a,b)=>b.rounds-a.rounds).map(o=>`<tr data-side="${esc(o.side)}">
    <td class="l"><div class="opcell"><span class="opicon">${opIconImg(o.name)}</span><span class="opname">${esc(o.name)}<span class="side">${o.side}</span></span></div></td>
    <td>${o.rounds}</td><td style="color:${wrColor(o.winPct)};font-weight:700">${o.winPct}%</td>
    <td>${o.kd}</td><td>${o.hs}%</td><td>${o.w}</td><td>${o.l}</td><td>${o.k}</td><td>${o.d}</td><td>${o.a}</td>
    <td>${o.aces||0}</td><td>${o.tks||0}</td></tr>`).join("");
  const operators=`<div class="panel op-standings"><div class="sect-hdr-row">
    <div class="sect-hdr">// OPERATOR STANDINGS <span class="n">— full roster, all maps</span></div>
    <div class="op-filter" role="group" aria-label="Filter operators by side">
      <button type="button" class="op-fbtn on" data-f="all">All</button>
      <button type="button" class="op-fbtn" data-f="ATK">Attack only</button>
      <button type="button" class="op-fbtn" data-f="DEF">Defense only</button>
    </div></div>
    <div class="scroll"><table><thead><tr><th class="l">Operator</th><th>RDS</th><th>WIN%</th><th>K/D</th><th>HS%</th><th>W</th><th>L</th><th>K</th><th>D</th><th>A</th><th>ACE</th><th>TK</th></tr></thead>
    <tbody>${ops}</tbody></table></div>
    <div class="legend">WIN% — <span class="g">green &ge;55%</span> · <span class="y">gold &ge;45%</span> · <span class="r">red &lt;45%</span></div></div>`;

  const rows=(rec.matches||[]).map(x=>{
    const rb=x.result==="RB", win=!rb&&x.result==="W", drp=(x.drp>=0?"+":"")+x.drp;
    const resCls=rb?"res-rb":win?"res-w":"res-l";
    const kda=rb?"—":`${x.k}/${x.d}/${x.a}`;
    const hs=rb?"—":`${x.hs}%`;
    return `<tr class="${rb?"rollback":win?"win":"loss"}"><td>${esc(x.date)}</td><td class="l">${esc(x.map)}</td>
      <td class="${resCls}">${x.result}</td><td>${esc(x.score)}</td><td>${fmt(x.rp)}</td>
      <td class="${x.drp>=0?'rp-pos':'rp-neg'}">${drp}</td><td>${kda}</td><td>${hs}</td>
      <td class="l">${rb?"":(x.badges||[]).join(", ")}</td></tr>`;}).join("");
  const matchlog=`<div class="panel"><div class="sect-hdr">// MATCH LOG <span class="n">— ${(rec.matches||[]).length} logged</span></div>
    <div class="scroll"><table><thead><tr><th class="l">Date</th><th class="l">Map</th><th>Res</th><th>Score</th><th>RP</th><th>&Delta;RP</th><th>K/D/A</th><th>HS%</th><th class="l">Badges</th></tr></thead>
    <tbody>${rows}</tbody></table></div></div>`;

  const badges=`<div class="panel"><div class="sect-hdr">// BADGE TALLY <span class="n">— cumulative</span></div>
    <div class="badges">${(rec.badges||[]).map(b=>`<div class="badge ${/victim/i.test(b.name)?'victim':''}"><span class="bn">${esc(b.name)}</span><span class="bc">${b.count}</span></div>`).join("")}</div></div>`;

  const debrief=rec.debrief?`<div class="panel"><div class="sect-hdr">// VANTAGE DEBRIEF</div><div class="debrief">${rec.debrief}</div></div>`:"";

  return cards+operators+matchlog+badges+debrief+playerVoice(rec);
}
function seasonReportBody(text){
  if(!text) return "";
  if(String(text).includes("<p>")) return `<div class="debrief season-report">${text}</div>`;
  return `<div class="debrief season-report">${String(text).split(/\n\n+/).filter(Boolean).map(p=>`<p>${esc(p.trim())}</p>`).join("")}</div>`;
}
function playerVoice(rec){
  if(rec.seasonClosed&&rec.seasonReport){
    return `<div class="panel"><div class="sect-hdr">// VANTAGE — END OF SEASON REPORT <span class="n">— ${esc(rec.season||"")} · final wrap</span></div>
      ${seasonReportBody(rec.seasonReport)}</div>`;
  }
  if(!rec.comments||!rec.comments.length) return "";
  return commentLogPanel(rec.comments,{
    title:"// VANTAGE COMMENT LOG",
    note:"— latest map + 5 operators",
    dimOld:true,
  });
}
function emptySeason(season){
  return `<div class="panel"><div class="empty"><div class="eh">&#9650; Season Open — Awaiting First Contact</div>
    <div class="es">No matches logged for ${esc(season)} yet. Drop screenshots into Cursor and VANTAGE populates the board.<br>
    Rank thresholds load once the season config is confirmed.</div></div></div>`;
}

/* ============================================================
   PAGE: OVERSIGHT
   ============================================================ */
let OV_SEASON=null;
async function renderOversight(){
  const view=byId("view");
  if(!OV_SEASON) OV_SEASON = DEFAULT_SEASON;
  applyOversightTheme();
  buildOvSeasonBtns(OV_SEASON);
  setBrandTag(oversightTag(OV_SEASON));

  let recs;
  try{ recs=await Promise.all(ROSTER.map(p=>loadRecord(p.slug,OV_SEASON))); }
  catch(e){ fetchErr(view); return; }
  const squad=await loadRecord("oversight",OV_SEASON).catch(()=>null);

  const data=ROSTER.map((p,i)=>({cfg:p,rec:recs[i]})).filter(d=>d.rec&&d.rec.meta);
  if(!data.length){ view.innerHTML=emptySeason(OV_SEASON); return; }
  view.innerHTML = board(data) + radar(data) + squadComments(squad)
    + badgeBoard(data) + mapHeatmap(data) + operatorMatrix(data);
  wireOpSideFilter();
  wirePastComments();
}
function buildOvSeasonBtns(active){
  const el=byId("seasons");
  el.innerHTML=`<span class="lbl">Season</span>`+SEASONS.map(s=>`<button class="season-btn ${s===active?'on':''}" data-s="${s}">${s}</button>`).join("");
  el.querySelectorAll(".season-btn").forEach(b=>b.onclick=()=>{ OV_SEASON=b.dataset.s; renderOversight(); });
}
function topOp(rec){ return (rec.operators||[]).slice().sort((a,b)=>b.winPct-a.winPct)[0]; }
function board(data){
  const head=`<tr><th></th>`+data.map(d=>`<th><img class="colpic" src="${BASE}assets/cards/${d.cfg.slug}.png" alt=""><div class="colcall" style="color:${d.cfg.accent}">${esc(d.cfg.name)}</div></th>`).join("")+`</tr>`;
  const rowDefs=[
    ["Rank",   d=>d.rec.meta.rank, null],
    ["RP",     d=>d.rec.meta.rp, "max"],
    ["Record", d=>`${d.rec.meta.w}-${d.rec.meta.l}`, null],
    ["Win %",  d=>d.rec.meta.winRate, "max"],
    ["K/D",    d=>d.rec.meta.kd, "max"],
    ["HS %",   d=>d.rec.meta.avgHs, "max"],
    ["Matches",d=>d.rec.meta.matches, "max"],
  ];
  const body=rowDefs.map(([label,get,cmp])=>{
    let leadVal=null;
    if(cmp==="max") leadVal=Math.max(...data.map(d=>parseFloat(get(d))));
    return `<tr><th>${label}</th>`+data.map(d=>{
      const v=get(d), isLead=cmp==="max"&&parseFloat(v)===leadVal;
      const disp=(label==="RP"||label==="Matches")?fmt(v):v+(label.includes("%")?"%":"");
      return `<td class="${isLead?'lead':''}">${disp}</td>`;
    }).join("")+`</tr>`;
  }).join("");
  const topRow=`<tr><th>Top Op</th>`+data.map(d=>{const o=topOp(d.rec);return o?`<td><div class="opcell" style="justify-content:center"><span class="opicon">${opIconImg(o.name)}</span><span class="opname" style="font-family:var(--mono);font-weight:500">${esc(o.name)}</span></div></td>`:`<td>—</td>`;}).join("")+`</tr>`;
  return `<div class="ov-hero"><img src="${BASE}assets/cards/oversight.png" alt="OVERSIGHT"><div class="cap"><div class="t">OVERSIGHT</div><div class="s">Squad Comparison · ${esc(OV_SEASON)}</div></div></div>
    <div class="panel"><div class="sect-hdr">// COMMAND BOARD <span class="n">— per-stat leader in gold</span></div>
    <div class="scroll"><table class="board"><thead>${head}</thead><tbody>${body}${topRow}</tbody></table></div></div>`;
}
function radar(data){
  const axes=[["RP",d=>d.rec.meta.rp],["Win%",d=>d.rec.meta.winRate],["K/D",d=>d.rec.meta.kd],["HS%",d=>d.rec.meta.avgHs],["Games",d=>d.rec.meta.matches]];
  const N=axes.length, cx=150, cy=150, R=110;
  // normalize each axis 0.25..1
  const norms=axes.map(([_,get])=>{const vals=data.map(d=>parseFloat(get(d)));const mn=Math.min(...vals),mx=Math.max(...vals);return v=>mx===mn?0.7:0.25+0.75*((v-mn)/(mx-mn));});
  const pt=(i,r)=>{const ang=-Math.PI/2 + i*2*Math.PI/N; return [cx+r*Math.cos(ang), cy+r*Math.sin(ang)];};
  let rings="";
  for(const f of [0.25,0.5,0.75,1]){ rings+=`<polygon points="${axes.map((_,i)=>pt(i,R*f).join(",")).join(" ")}" fill="none" stroke="var(--border)" stroke-width="1"/>`; }
  let spokes="",labels="";
  axes.forEach(([label],i)=>{const [x,y]=pt(i,R);spokes+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
    const [lx,ly]=pt(i,R+18);labels+=`<text x="${lx}" y="${ly}" fill="var(--dim)" font-size="9" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" letter-spacing="1">${label}</text>`;});
  const polys=data.map(d=>{const p=axes.map(([_,get],i)=>pt(i,R*norms[i](parseFloat(get(d)))).join(",")).join(" ");
    return `<polygon points="${p}" fill="${d.cfg.accent}22" stroke="${d.cfg.accent}" stroke-width="2"/>`;}).join("");
  const legend=data.map(d=>`<div class="row"><span class="sw" style="background:${d.cfg.accent}"></span>${esc(d.cfg.name)}</div>`).join("");
  return `<div class="panel"><div class="sect-hdr">// SQUAD SHAPE <span class="n">— normalized across the roster</span></div>
    <div class="radar-wrap"><svg viewBox="0 0 300 300" width="300" height="300">${rings}${spokes}${labels}${polys}</svg>
    <div class="radar-legend">${legend}<div class="radar-axes">Each axis scaled min&rarr;max within the squad</div></div></div></div>`;
}
function squadComments(squad){
  if(!squad) return "";
  if(squad.seasonClosed&&squad.seasonReport){
    return `<div class="panel"><div class="sect-hdr">// OVERSIGHT — END OF SEASON REPORT <span class="n">— ${esc(squad.season||"")} · squad final wrap</span></div>
      ${seasonReportBody(squad.seasonReport)}</div>`;
  }
  if(!squad.comments||!squad.comments.length) return "";
  return commentLogPanel(squad.comments,{
    title:"// VANTAGE — TEAM DEBRIEF",
    note:"— latest squad map + 5 operators",
  });
}

/* ---- OVERSIGHT extended comparisons (computed from player JSON) ---- */
const BADGE_ORDER=["2K","3K","4K","Ace","1v1 Clutch","1v2 Clutch","1v3 Clutch","1v4 Clutch","1v5 Clutch","Victim","1v1 Lost","1v2 Lost","1v3 Lost","TK"];
const NEG_BADGES=new Set(["Victim","1v1 Lost","1v2 Lost","1v3 Lost","TK"]);

function ovPanel(title,note,inner){
  return `<div class="panel"><div class="sect-hdr">// ${title} <span class="n">— ${note}</span></div>${inner}</div>`;
}
function badgeCount(rec,name){
  const b=(rec.badges||[]).find(x=>x.name===name);
  return b?b.count:0;
}
function mapChip(wr){
  const cls=wr>=55?"good":wr>=45?"mid":"bad";
  return `<span class="map-chip ${cls}">${wr.toFixed(0)}%</span>`;
}

function badgeBoard(data){
  const names=BADGE_ORDER.filter(b=>data.some(d=>badgeCount(d.rec,b)>0));
  if(!names.length) return "";
  const head=`<tr><th class="l">Badge</th>`+data.map(d=>`<th><div class="colcall" style="color:${d.cfg.accent}">${esc(d.cfg.name)}</div></th>`).join("")+`</tr>`;
  const body=names.map(b=>{
    const neg=NEG_BADGES.has(b);
    const vals=data.map(d=>badgeCount(d.rec,b));
    const mx=Math.max(...vals);
    return `<tr><th class="l${neg?" badge-neg":""}">${esc(b)}</th>`+vals.map(v=>{
      const lead=v===mx&&v>0;
      return `<td class="${lead?(neg?"neg-lead":"lead"):""}">${v||"—"}</td>`;
    }).join("")+`</tr>`;
  }).join("");
  return ovPanel("BADGE COMPARISON","gold = squad high · red = high on losses / TK",
    `<div class="scroll"><table class="board"><thead>${head}</thead><tbody>${body}</tbody></table></div>`);
}

function operatorMatrix(data){
  const ops={};
  data.forEach(d=>{
    (d.rec.operators||[]).forEach(op=>{
      if(!op.rounds) return;
      if(!ops[op.name]) ops[op.name]={side:op.side,cells:{}};
      ops[op.name].cells[d.cfg.slug]=op;
    });
  });
  const list=Object.keys(ops).sort((a,b)=>{
    const sum=n=>Object.values(ops[n].cells).reduce((s,o)=>s+o.rounds,0);
    return sum(b)-sum(a);
  });
  if(!list.length) return "";
  const head1=`<tr><th rowspan="2" class="l">Operator</th><th rowspan="2">Side</th>`
    +data.map(d=>`<th colspan="3"><div class="colcall" style="color:${d.cfg.accent}">${esc(d.cfg.name)}</div></th>`).join("")+`</tr>`;
  const head2=`<tr>`+data.map(()=>`<th>Rds</th><th>Win%</th><th>K/D</th>`).join("")+`</tr>`;
  const body=list.map(name=>{
    const o=ops[name];
    const tag=o.side==="ATK"?'<span class="side-tag atk">ATK</span>':'<span class="side-tag def">DEF</span>';
    let row=`<tr data-side="${esc(o.side)}"><td class="l"><div class="opcell"><span class="opicon">${opIconImg(name)}</span><span class="opname">${esc(name)}</span></div></td><td>${tag}</td>`;
    data.forEach(d=>{
      const op=o.cells[d.cfg.slug];
      if(op) row+=`<td>${op.rounds}</td><td style="color:${wrColor(op.winPct)}">${op.winPct}%</td><td>${op.kd.toFixed(2)}</td>`;
      else row+=`<td class="dim-cell">—</td><td class="dim-cell">—</td><td class="dim-cell">—</td>`;
    });
    return row+`</tr>`;
  }).join("");
  return `<div class="panel ov-op-matrix"><div class="sect-hdr-row">
    <div class="sect-hdr">// OPERATOR MATRIX <span class="n">— all season operators · rounds / win% / K/D</span></div>
    <div class="op-filter" role="group" aria-label="Filter operators by side">
      <button type="button" class="op-fbtn on" data-f="all">All</button>
      <button type="button" class="op-fbtn" data-f="ATK">Attack only</button>
      <button type="button" class="op-fbtn" data-f="DEF">Defense only</button>
    </div></div>
    <div class="scroll"><table class="board ov-matrix"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table></div></div>`;
}

function mapHeatmap(data){
  const maps={};
  data.forEach(d=>{
    (d.rec.matches||[]).forEach(m=>{
      if(!m.map||m.result==="RB"||m.map==="RP Rollback") return;
      if(!maps[m.map]) maps[m.map]={};
      if(!maps[m.map][d.cfg.slug]) maps[m.map][d.cfg.slug]={w:0,l:0};
      if(m.result==="W") maps[m.map][d.cfg.slug].w++;
      else if(m.result==="L") maps[m.map][d.cfg.slug].l++;
    });
  });
  const mapTotal=m=>data.reduce((s,d)=>{const x=maps[m]?.[d.cfg.slug];return s+(x?x.w+x.l:0)},0);
  const list=Object.keys(maps).sort((a,b)=>mapTotal(b)-mapTotal(a));
  if(!list.length) return "";
  const head1=`<tr><th rowspan="2" class="l">Map</th>`
    +data.map(d=>`<th colspan="2"><div class="colcall" style="color:${d.cfg.accent}">${esc(d.cfg.name)}</div></th>`).join("")
    +`<th rowspan="2">Squad</th></tr>`;
  const head2=`<tr>`+data.map(()=>`<th>W-L</th><th>Win%</th>`).join("")+`</tr>`;
  const body=list.map(map=>{
    let sw=0,sl=0,row=`<tr><th class="l">${esc(map)}</th>`;
    data.forEach(d=>{
      const x=maps[map][d.cfg.slug];
      if(x&&x.w+x.l>0){
        const g=x.w+x.l,wr=x.w/g*100;
        row+=`<td>${x.w}-${x.l}</td><td>${mapChip(wr)}</td>`;
        sw+=x.w; sl+=x.l;
      } else row+=`<td class="dim-cell">—</td><td class="dim-cell">—</td>`;
    });
    const sg=sw+sl;
    row+=`<td>${sg?mapChip(sw/sg*100):"—"}</td></tr>`;
    return row;
  }).join("");
  return ovPanel("MAP PERFORMANCE","from match log · green ≥55% · gold ≥45% · red &lt;45%",
    `<div class="scroll"><table class="board ov-matrix"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table></div>`);
}

/* ---- background music / jukebox ---- */
const BGM_KEY="vantage-bgm-vol";
const BGM_MUTE_KEY="vantage-bgm-muted";
const BGM_TIME_KEY="vantage-bgm-time";
const BGM_PLAYING_KEY="vantage-bgm-playing";
const BGM_TRACK_KEY="vantage-bgm-track";
const BGM_DEFAULT_VOL=25;
const BGM_FALLBACK=[];

function fmtAudioTime(s){
  if(!isFinite(s)||s<0) return "0:00";
  const m=Math.floor(s/60), sec=Math.floor(s%60);
  return m+":"+String(sec).padStart(2,"0");
}
function audioSrc(file){ return `${BASE}assets/audio/${file.split("/").map(encodeURIComponent).join("/")}`; }

async function initBgm(){
  if(document.getElementById("vantage-bgm")) return;
  let playlist={albums:[],tracks:BGM_FALLBACK,defaultTrack:null};
  try{
    const r=await fetch(`${BASE}data/music/playlist.json`,{cache:"no-store"});
    if(r.ok) playlist=await r.json();
  }catch(e){}

  const tracks=(playlist.tracks||[]).filter(t=>t.album!=="y11s1"&&t.album!=="inv2018"&&t.file!=="vibe-shard.mp3");
  if(!tracks.length) return;

  const albums=(playlist.albums||[]).filter(a=>a.id!=="y11s1");
  const wrap=document.createElement("div");
  wrap.className="bgm-ctl";
  wrap.innerHTML=`<button type="button" class="bgm-btn" id="bgm-btn" aria-label="Music player" aria-expanded="false" title="Music">&#9835;</button>
    <div class="bgm-drop" id="bgm-drop" hidden>
      <div class="bgm-drop-hdr">// COMMS AUDIO</div>
      <div class="bgm-hero">
        <div class="bgm-cover" id="bgm-cover"><span class="bgm-cover-ph" aria-hidden="true">&#9835;</span></div>
        <div class="bgm-meta">
          <div class="bgm-title" id="bgm-title">—</div>
          <div class="bgm-album" id="bgm-album">Pick a season</div>
        </div>
      </div>
      <div class="bgm-transport">
        <button type="button" class="bgm-tbtn bgm-play" id="bgm-play" aria-label="Play">&#9654;</button>
        <button type="button" class="bgm-tbtn bgm-skip" id="bgm-skip" aria-label="Skip to next track" title="Skip">Skip</button>
      </div>
      <div class="bgm-seek-row">
        <span class="bgm-time" id="bgm-cur">0:00</span>
        <input type="range" class="bgm-seek" id="bgm-seek" min="0" max="1000" value="0" aria-label="Seek">
        <span class="bgm-time end" id="bgm-dur">0:00</span>
      </div>
      <div class="bgm-vol-row">
        <span class="bgm-vol-lbl">Vol</span>
        <input type="range" class="bgm-vol" id="bgm-vol" min="0" max="100" value="${BGM_DEFAULT_VOL}">
        <button type="button" class="bgm-active" id="bgm-active">Deactivate</button>
      </div>
      <div class="bgm-browse">
        <div class="bgm-browse-hdr" id="bgm-browse-hdr">// SEASONS</div>
        <div class="bgm-albums" id="bgm-albums"></div>
        <div class="bgm-tracks-panel" id="bgm-tracks-panel">
          <div class="bgm-tracks-hdr" id="bgm-tracks-hdr">Pick a season</div>
          <ul class="bgm-list" id="bgm-tracks-list"></ul>
        </div>
      </div>
    </div>
    <audio id="vantage-bgm" preload="metadata"></audio>`;
  document.body.appendChild(wrap);

  const audio=byId("vantage-bgm");
  const btn=byId("bgm-btn");
  const drop=byId("bgm-drop");
  const activeBtn=byId("bgm-active");
  const volSlider=byId("bgm-vol");
  const seekSlider=byId("bgm-seek");
  const playBtn=byId("bgm-play");
  const titleEl=byId("bgm-title");
  const albumEl=byId("bgm-album");
  const coverEl=byId("bgm-cover");
  const curEl=byId("bgm-cur");
  const durEl=byId("bgm-dur");
  const albumsEl=byId("bgm-albums");
  const tracksPanel=byId("bgm-tracks-panel");
  const tracksList=byId("bgm-tracks-list");
  const tracksHdr=byId("bgm-tracks-hdr");
  const browseHdr=byId("bgm-browse-hdr");

  let deactivated=localStorage.getItem(BGM_MUTE_KEY)==="1";
  let vol=parseInt(localStorage.getItem(BGM_KEY),10);
  if(isNaN(vol)) vol=BGM_DEFAULT_VOL;
  let autoplayMuted=false;
  let positionRestored=false;
  let seekDragging=false;
  let trackIdx=-1;
  let shuffleOn=false;
  let browseAlbumId=null;

  function trackAt(i){ return i>=0&&i<tracks.length?tracks[i]:null; }
  function track(){ return trackAt(trackIdx)||{title:"—",albumLabel:"",cover:null}; }
  function wasPlayingLastPage(){ return sessionStorage.getItem(BGM_PLAYING_KEY)==="1"; }
  function isShuffleTrack(i){
    const t=trackAt(i);
    if(!t) return false;
    const a=albumMeta(t.album);
    return !a?.manualOnly;
  }
  function randomTrackIdx(exclude){
    const pool=tracks.map((_,i)=>i).filter(i=>i!==exclude&&isShuffleTrack(i));
    if(!pool.length) return exclude>=0?exclude:0;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function albumTracks(albumId){ return tracks.map((t,i)=>({t,i})).filter(x=>x.t.album===albumId); }
  function albumMeta(albumId){ return albums.find(a=>a.id===albumId)||null; }

  function setBrowseAlbum(albumId){
    browseAlbumId=albumId;
    const album=albumMeta(albumId);
    albumsEl.querySelectorAll(".bgm-album-btn").forEach(el=>{
      el.classList.toggle("on",el.dataset.album===albumId);
    });
    tracksHdr.textContent=album?album.label:"Pick a season";
    tracksList.innerHTML="";
    if(!albumId) return;
    const list=albumTracks(albumId);
    if(!list.length){
      const li=document.createElement("li");
      li.className="bgm-list-empty";
      li.textContent=album&&album.count===0?"Coming soon — tracks loading…":"No tracks in this album";
      tracksList.appendChild(li);
      return;
    }
    list.forEach(({t,i})=>{
      const li=document.createElement("li");
      const b=document.createElement("button");
      b.type="button";
      b.className="bgm-list-item";
      b.dataset.idx=String(i);
      b.textContent=t.title;
      b.classList.toggle("on",i===trackIdx);
      b.onclick=e=>{
        e.stopPropagation();
        shuffleOn=true;
        loadTrack(i,true,true);
      };
      li.appendChild(b);
      tracksList.appendChild(li);
    });
  }
  function syncBrowseToPlayingAlbum(){
    const t=trackAt(trackIdx);
    if(t?.album) setBrowseAlbum(t.album);
  }

  albums.forEach(a=>{
    const count=a.count??albumTracks(a.id).length;
    const countLbl=count===0?"Coming soon":`${count} track${count===1?"":"s"}`;
    const b=document.createElement("button");
    b.type="button";
    b.className="bgm-album-btn"+(count===0?" bgm-album-placeholder":"")+(a.manualOnly?" bgm-album-manual":"");
    b.dataset.album=a.id;
    b.innerHTML=`<div class="bgm-album-thumb">${a.cover?`<img src="${audioSrc(a.cover)}" alt="" loading="lazy">`:`<span class="bgm-album-ph" aria-hidden="true">&#9835;</span>`}</div>
      <div class="bgm-album-name">${esc(a.label)}</div><div class="bgm-album-count">${countLbl}</div>`;
    b.onclick=e=>{ e.stopPropagation(); setBrowseAlbum(a.id); };
    albumsEl.appendChild(b);
  });

  function saveBgmState(){
    if(trackIdx<0){ sessionStorage.setItem(BGM_PLAYING_KEY,"0"); return; }
    if(audio.currentTime>0||!audio.paused){
      sessionStorage.setItem(BGM_TIME_KEY,String(audio.currentTime));
    }
    if(deactivated||audio.paused) sessionStorage.setItem(BGM_PLAYING_KEY,"0");
    else sessionStorage.setItem(BGM_PLAYING_KEY,"1");
    localStorage.setItem(BGM_TRACK_KEY,track().id);
  }
  function restoreBgmPosition(){
    if(positionRestored||shuffleOn) return;
    const t=parseFloat(sessionStorage.getItem(BGM_TIME_KEY));
    if(!isNaN(t)&&t>0&&audio.duration&&t<audio.duration-0.5) audio.currentTime=t;
    else if(!isNaN(t)&&t>0&&!audio.duration) audio.currentTime=t;
    positionRestored=true;
  }
  let shownCoverSrc="";
  function updateCover(t){
    const src=t.cover?audioSrc(t.cover):"";
    if(src===shownCoverSrc) return;
    shownCoverSrc=src;
    if(src){
      const img=coverEl.querySelector("img");
      if(img) img.src=src;
      else coverEl.innerHTML=`<img src="${src}" alt="">`;
    }else{
      coverEl.innerHTML=`<span class="bgm-cover-ph" aria-hidden="true">&#9835;</span>`;
    }
  }
  function highlightTrackList(){
    tracksList.querySelectorAll(".bgm-list-item").forEach(el=>{
      el.classList.toggle("on",parseInt(el.dataset.idx,10)===trackIdx);
    });
  }
  function updateNowPlaying(){
    if(trackIdx<0) return;
    const t=track();
    if(titleEl.textContent!==t.title) titleEl.textContent=t.title;
    const album=t.albumLabel||"";
    if(albumEl.textContent!==album) albumEl.textContent=album;
    updateCover(t);
  }
  function highlightTrack(){
    highlightTrackList();
    updateNowPlaying();
  }
  function updateSeekUi(){
    const d=audio.duration;
    if(!seekDragging){
      if(d&&isFinite(d)) seekSlider.value=String(Math.round((audio.currentTime/d)*1000));
      else seekSlider.value="0";
    }
    curEl.textContent=fmtAudioTime(audio.currentTime);
    durEl.textContent=d&&isFinite(d)?fmtAudioTime(d):"0:00";
  }
  function syncUi(opts){
    const trackOnly=opts&&opts.trackOnly;
    volSlider.value=vol;
    activeBtn.textContent=deactivated?"Activate":"Deactivate";
    activeBtn.classList.toggle("is-off",deactivated);
    activeBtn.setAttribute("aria-label",deactivated?"Activate music":"Deactivate music");
    playBtn.innerHTML=audio.paused?"&#9654;":"&#9646;&#9646;";
    playBtn.setAttribute("aria-label",audio.paused?"Play":"Pause");
    btn.classList.toggle("deactivated",deactivated);
    btn.classList.toggle("playing",!audio.paused&&!deactivated&&!autoplayMuted&&trackIdx>=0);
    btn.classList.toggle("needs-tap",autoplayMuted&&!deactivated);
    if(trackOnly) highlightTrackList();
    else highlightTrack();
    updateSeekUi();
  }
  function applyVol(){
    audio.volume=deactivated?0:Math.max(0,Math.min(1,vol/100));
    syncUi({trackOnly:true});
  }
  async function attemptAutoplay(){
    if(trackIdx<0||deactivated){ audio.pause(); saveBgmState(); syncUi(); return; }
    restoreBgmPosition();
    audio.volume=vol/100;
    audio.muted=false;
    try{
      await audio.play();
      autoplayMuted=false;
      saveBgmState();
      syncUi();
      return;
    }catch(e){}
    audio.muted=true;
    try{
      await audio.play();
      autoplayMuted=true;
      saveBgmState();
      syncUi();
    }catch(e){ syncUi(); }
  }
  function unlockFromGesture(e){
    if(e&&wrap.contains(e.target)) return;
    if(deactivated||trackIdx<0) return;
    if(autoplayMuted){
      audio.muted=false;
      autoplayMuted=false;
      applyVol();
      audio.play().then(saveBgmState).catch(()=>{});
    }
  }
  function loadTrack(idx,play,fromStart){
    if(idx<0||idx>=tracks.length) return;
    trackIdx=idx;
    if(fromStart) positionRestored=true;
    else positionRestored=false;
    const t=track();
    if(fromStart&&play) syncBrowseToPlayingAlbum();
    audio.src=audioSrc(t.file);
    audio.load();
    if(fromStart) audio.currentTime=0;
    highlightTrack();
    const after=()=>{
      if(fromStart) audio.currentTime=0;
      if(play&&!deactivated) attemptAutoplay();
      else syncUi();
    };
    if(play&&!deactivated) audio.addEventListener("canplay",after,{once:true});
    else after();
    if(play||fromStart) saveBgmState();
  }
  function shuffleNext(){
    shuffleOn=true;
    loadTrack(randomTrackIdx(trackIdx),true,true);
  }

  let savedId=localStorage.getItem(BGM_TRACK_KEY);
  if(savedId==="8841ebd7") savedId="3aa63d76";
  if(savedId){
    const found=tracks.findIndex(t=>t.id===savedId);
    if(found>=0) trackIdx=found;
  }

  audio.addEventListener("loadedmetadata",()=>{ restoreBgmPosition(); updateSeekUi(); });
  audio.addEventListener("timeupdate",()=>{ if(!seekDragging) updateSeekUi(); });
  audio.addEventListener("play",syncUi);
  audio.addEventListener("pause",()=>{ saveBgmState(); syncUi(); });
  audio.addEventListener("ended",()=>{ if(deactivated) return; shuffleOn=true; shuffleNext(); });
  window.addEventListener("pagehide",saveBgmState);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="hidden") saveBgmState();
  });
  setInterval(()=>{ if(!audio.paused&&!deactivated) saveBgmState(); },2000);

  seekSlider.addEventListener("pointerdown",()=>{ seekDragging=true; });
  seekSlider.addEventListener("pointerup",()=>{ seekDragging=false; });
  seekSlider.oninput=()=>{
    if(audio.duration&&isFinite(audio.duration)){
      audio.currentTime=(parseInt(seekSlider.value,10)/1000)*audio.duration;
      updateSeekUi();
    }
  };

  playBtn.onclick=e=>{
    e.stopPropagation();
    if(trackIdx<0) return;
    if(deactivated){
      deactivated=false;
      localStorage.setItem(BGM_MUTE_KEY,"0");
      if(vol===0) vol=BGM_DEFAULT_VOL;
      applyVol();
    }
    if(audio.paused) attemptAutoplay();
    else{ audio.pause(); saveBgmState(); syncUi(); }
  };
  byId("bgm-skip").onclick=e=>{ e.stopPropagation(); if(trackIdx<0) return; shuffleNext(); };

  btn.onclick=e=>{
    e.stopPropagation();
    const open=!drop.hidden;
    drop.hidden=open;
    btn.setAttribute("aria-expanded",String(!open));
    if(open&&autoplayMuted&&!deactivated) unlockFromGesture();
  };
  activeBtn.onclick=e=>{
    e.stopPropagation();
    if(deactivated){
      deactivated=false;
      if(vol===0) vol=BGM_DEFAULT_VOL;
      localStorage.setItem(BGM_MUTE_KEY,"0");
      applyVol();
      if(trackIdx>=0) attemptAutoplay();
    }else{
      deactivated=true;
      localStorage.setItem(BGM_MUTE_KEY,"1");
      audio.pause();
      autoplayMuted=false;
      audio.muted=false;
      saveBgmState();
      applyVol();
    }
  };
  volSlider.oninput=()=>{
    vol=parseInt(volSlider.value,10);
    localStorage.setItem(BGM_KEY,String(vol));
    applyVol();
  };
  document.addEventListener("click",e=>{
    if(!wrap.contains(e.target)){
      drop.hidden=true;
      btn.setAttribute("aria-expanded","false");
    }
  });

  if(trackIdx>=0) syncBrowseToPlayingAlbum();
  else if(albums.length) setBrowseAlbum(albums[0].id);
  const resumePlay=trackIdx>=0&&!deactivated&&wasPlayingLastPage();
  if(trackIdx>=0){
    loadTrack(trackIdx,false);
    applyVol();
    if(resumePlay){
      audio.addEventListener("canplay",()=>{ attemptAutoplay(); },{once:true});
      attemptAutoplay();
    }
  }else{
    applyVol();
  }
  document.addEventListener("pointerdown",unlockFromGesture,{passive:true});
  document.addEventListener("keydown",unlockFromGesture);
}

/* ---- boot ---- */
if(PAGE==="roster"){
  applyMenuTheme();
  initBgm().catch(()=>{});
  renderRoster();
}else{
  initFxLayers();
  initBgm().catch(()=>{});
  if(PAGE==="player") renderPlayer();
  else if(PAGE==="oversight") renderOversight();
}
