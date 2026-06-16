/* ============================================================
   VANTAGE / OVERSIGHT  —  rendering engine (shared by all pages)

   Each page sets on <body>:  data-page="roster|player|oversight|soundtracks"
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
  { slug:"slackandlack",       name:"slackandlack",       ubi:"slackandlack",     accent:"#d63d4f" },
  { slug:"mjester1337",        name:"MJester1337",        ubi:"MJester1337",      accent:"#9e6b42" },
  { slug:"mynameisblang",      name:"Mynameisblang",      ubi:"Mynameisblang",    accent:"#ff6b9d" },
];
const PLAYER_BANNERS={
  cunderthock:{
    Y11S2:{src:"assets/images/cunderthock-think-banner.png",alt:"Think Cunder — CunderThock dossier header"},
  },
  grandmaster_sandman:{
    Y11S2:{src:"assets/images/grandmaster_sandman-y11s2-banner.png",alt:"Grandmaster Sandman — Y11S2 dossier header"},
  },
  rogue_amputee:{
    Y11S2:{src:"assets/images/rogue_amputee-y11s2-banner.png",alt:"Rogue_Amputee — Y11S2 dossier header"},
  },
  mynameisblang:{
    Y11S2:{src:"assets/images/mynameisblang-y11s2-banner.png",alt:"Mynameisblang — Y11S2 dossier header"},
  },
  mjester1337:{
    Y11S2:{src:"assets/images/mjester1337-y11s2-banner.png",alt:"MJester1337 — Y11S2 dossier header"},
  },
  slackandlack:{
    Y11S2:{src:"assets/images/slackandlack-y11s2-banner.png",alt:"slackandlack — Y11S2 dossier header"},
  },
};
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

/* ---- performance mode (full FX default · lite strips animations) ---- */
const PERF_LITE_KEY="vantage-perf-lite";
function isPerfLite(){ return localStorage.getItem(PERF_LITE_KEY)==="1"; }
function freezeBannerVideo(lite){
  const v=document.querySelector(".roster-banner-vid");
  if(!v) return;
  if(lite){
    v.pause();
    try{ v.currentTime=0; }catch(e){}
  }else v.play().catch(()=>{});
}
function applyPerfMode(lite){
  document.body.classList.toggle("perf-lite",lite);
  const btn=byId("perf-btn");
  if(btn){
    btn.classList.toggle("on",!lite);
    btn.setAttribute("aria-pressed",String(!lite));
    const tip=lite?"Visual effects off — click to enable":"Visual effects on — click for low performance";
    btn.title=tip;
    btn.setAttribute("aria-label",tip);
  }
  freezeBannerVideo(lite);
  if(lite){ stopDokaSpawner(); removeDokaIntro(); }
  else if(PAGE==="player"&&(document.body.dataset.season==="Y11S2"||document.body.classList.contains("theme-y11s2"))){
    startDokaSpawner(document.body.dataset.player);
  }
}
function initPerfMode(){
  const cmdbar=document.querySelector(".cmdbar");
  if(!cmdbar||byId("perf-btn")) return;
  let actions=cmdbar.querySelector(".cmdbar-actions");
  if(!actions){
    actions=document.createElement("div");
    actions.className="cmdbar-actions";
    const seasons=cmdbar.querySelector(".seasons");
    if(seasons) actions.appendChild(seasons);
    cmdbar.appendChild(actions);
  }
  const btn=document.createElement("button");
  btn.type="button";
  btn.id="perf-btn";
  btn.className="perf-btn";
  btn.innerHTML='<svg class="perf-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor"/></svg>';
  btn.onclick=()=>{
    const lite=!isPerfLite();
    localStorage.setItem(PERF_LITE_KEY,lite?"1":"0");
    applyPerfMode(lite);
  };
  actions.insertBefore(btn,actions.firstChild);
  applyPerfMode(isPerfLite());
}

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
  if(isPerfLite()) return;
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

/* Y11S2 · Dokkaebi hack intro (first ~2.5s on roster load) — disabled until re-enabled */
const DOKA_INTRO_ENABLED = false;
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
if(DOKA_INTRO_ENABLED) preloadDokaIntroSfx();

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
  if(isPerfLite()) return;
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
  if(DOKA_INTRO_ENABLED) showDokaIntro();
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
function applySoundtracksTheme(){
  initFxLayers();
  stopDokaEffects();
  removeDokaIntro();
  delete document.body.dataset.season;
  document.body.dataset.fx="menu";
  clearThemeClasses();
  setBrandTag("Rainbow Six Siege · Full Library");
}
function wireRosterFoot(){
  if(PAGE!=="roster") return;
  const foot=document.querySelector(".wrap > .foot");
  if(!foot||foot.querySelector(".foot-soundtracks")) return;
  const a=document.createElement("a");
  a.className="foot-soundtracks";
  a.href=`${BASE}soundtracks.html`;
  a.textContent="// Soundtracks";
  const tag=document.createElement("span");
  tag.className="foot-tag";
  tag.textContent=foot.textContent.trim();
  foot.textContent="";
  foot.append(a,tag);
}
function oversightTag(s){ return `Team Review · Squad Comparison · ${seasonOp(s)}`; }
function playerTag(slug,s){ const p=ROSTER.find(r=>r.slug===slug); return `${p?p.name:"Operator"} · ${seasonOp(s)}`; }
function playerBannerHtml(slug,season){
  const entry=PLAYER_BANNERS[slug]?.[season];
  if(!entry) return "";
  const src=typeof entry==="string"?entry:entry.src;
  const name=ROSTER.find(r=>r.slug===slug)?.name||"Operator";
  const alt=(typeof entry==="object"&&entry.alt)?entry.alt:`${name} dossier header`;
  return `<div class="player-banner" role="img" aria-label="${esc(alt)}">
    <img src="${BASE}${src}" alt="${esc(alt)}" loading="eager">
  </div>`;
}
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
    <a class="pcard" href="players/${p.slug}.html" data-slug="${p.slug}" style="--pcard-accent:${p.accent}">
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
      <span class="ocard-shimmer" aria-hidden="true"></span>
      <span class="ocard-sparkles" aria-hidden="true"></span>
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
  wireRosterFoot();
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
  const banner=playerBannerHtml(slug,PLAYER_SEASON);
  view.innerHTML=rec.meta?banner+playerBody(rec):banner+emptySeason(PLAYER_SEASON);
  wireOpTableControls();
  wirePastComments();
}
const OP_STANDINGS_SORT=[
  ["rounds","RDS"],["winpct","WIN%"],["kd","K/D"],["hs","HS%"],
  ["w","W"],["l","L"],["k","K"],["d","D"],["a","A"],["ace","ACE"],["tk","TK"],
];
const OP_MATRIX_SORT=[["rounds","RDS"],["winpct","WIN%"],["kd","K/D"]];
function buildOpSortBar(keys,defaultKey="rounds"){
  const btns=keys.map(([k,lbl])=>
    `<button type="button" class="op-sbtn${k===defaultKey?" on":""}" data-sort="${k}" data-label="${lbl}">${lbl}</button>`
  ).join("");
  return `<div class="op-sort" role="group" aria-label="Sort operators"><span class="op-sort-lbl">Sort</span>${btns}</div>`;
}
function buildOpFilter(){
  return `<div class="op-filter" role="group" aria-label="Filter operators by side">
      <button type="button" class="op-fbtn on" data-f="all">All</button>
      <button type="button" class="op-fbtn" data-f="ATK">Attack only</button>
      <button type="button" class="op-fbtn" data-f="DEF">Defense only</button>
    </div>`;
}
function buildOpToolbar(sortKeys,compact){
  return `<div class="op-toolbar${compact?" op-toolbar-compact":""}">${buildOpSortBar(sortKeys)}${buildOpFilter()}</div>`;
}
function sortOpTbody(tbody, key, dir){
  const mult=dir==="asc"?1:-1;
  Array.from(tbody.querySelectorAll("tr")).sort((a,b)=>{
    const av=parseFloat(a.dataset[key])||0, bv=parseFloat(b.dataset[key])||0;
    return (av-bv)*mult;
  }).forEach(tr=>tbody.appendChild(tr));
}
function wireOpTableControls(root="#view"){
  document.querySelectorAll(`${root} .op-standings, ${root} .ov-op-matrix`).forEach(panel=>{
    const tbody=panel.querySelector("tbody");
    if(!tbody) return;
    const filter=panel.querySelector(".op-filter");
    let sortKey="rounds", sortDir="desc";
    function applyFilter(){
      const f=filter?.querySelector(".op-fbtn.on")?.dataset.f||"all";
      tbody.querySelectorAll("tr").forEach(tr=>{
        tr.style.display=(f==="all"||tr.dataset.side===f)?"":"none";
      });
    }
    function updateSortUI(){
      panel.querySelectorAll(".op-sbtn").forEach(btn=>{
        const on=btn.dataset.sort===sortKey;
        btn.classList.toggle("on",on);
        const lbl=btn.dataset.label||btn.textContent.replace(/[▲▼]/g,"").trim();
        btn.dataset.label=lbl;
        btn.textContent=on?`${lbl} ${sortDir==="desc"?"▼":"▲"}`:lbl;
        btn.title=on?(sortDir==="desc"?"High first — click for low first":"Low first — click for high first"):`Sort by ${lbl}`;
      });
    }
    function applySort(){
      sortOpTbody(tbody,sortKey,sortDir);
      applyFilter();
      updateSortUI();
    }
    panel.querySelectorAll(".op-sbtn").forEach(btn=>{
      btn.onclick=()=>{
        const k=btn.dataset.sort;
        if(k===sortKey) sortDir=sortDir==="desc"?"asc":"desc";
        else{ sortKey=k; sortDir="desc"; }
        applySort();
      };
    });
    filter?.querySelectorAll(".op-fbtn").forEach(btn=>{
      btn.onclick=()=>{
        filter.querySelectorAll(".op-fbtn").forEach(b=>b.classList.remove("on"));
        btn.classList.add("on");
        applyFilter();
      };
    });
    applySort();
  });
}
function opMatrixAgg(cells){
  let rounds=0, wWin=0, wKd=0;
  Object.values(cells).forEach(op=>{
    rounds+=op.rounds;
    wWin+=op.winPct*op.rounds;
    wKd+=(typeof op.kd==="number"?op.kd:parseFloat(op.kd)||0)*op.rounds;
  });
  return { rounds, winpct:rounds?wWin/rounds:0, kd:rounds?wKd/rounds:0 };
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

  const ops = (rec.operators||[]).map(o=>`<tr data-side="${esc(o.side)}" data-rounds="${o.rounds}" data-winpct="${o.winPct}" data-kd="${o.kd}" data-hs="${o.hs}" data-w="${o.w}" data-l="${o.l}" data-k="${o.k}" data-d="${o.d}" data-a="${o.a}" data-ace="${o.aces||0}" data-tk="${o.tks||0}">
    <td class="l"><div class="opcell"><span class="opicon">${opIconImg(o.name)}</span><span class="opname">${esc(o.name)}<span class="side">${o.side}</span></span></div></td>
    <td>${o.rounds}</td><td style="color:${wrColor(o.winPct)};font-weight:700">${o.winPct}%</td>
    <td>${o.kd}</td><td>${o.hs}%</td><td>${o.w}</td><td>${o.l}</td><td>${o.k}</td><td>${o.d}</td><td>${o.a}</td>
    <td>${o.aces||0}</td><td>${o.tks||0}</td></tr>`).join("");
  const operators=`<div class="panel op-standings"><div class="sect-hdr">// OPERATOR STANDINGS <span class="n">— full roster, all maps</span></div>
    ${buildOpToolbar(OP_STANDINGS_SORT)}
    <div class="scroll"><table><thead><tr><th class="l">Operator</th><th>RDS</th><th>WIN%</th><th>K/D</th><th>HS%</th><th>W</th><th>L</th><th>K</th><th>D</th><th>A</th><th>ACE</th><th>TK</th></tr></thead>
    <tbody>${ops}</tbody></table></div>
    <div class="legend">WIN% — <span class="g">green &ge;55%</span> · <span class="y">gold &ge;45%</span> · <span class="r">red &lt;45%</span> · Sort <span class="g">▼</span> high first · <span class="r">▲</span> low first</div></div>`;

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
  destroyOvCharts();
  view.innerHTML = board(data) + radar(data) + squadComments(squad)
    + badgeBoard(data) + mapHeatmap(data) + operatorMatrix(data);
  wireOpTableControls();
  wireOvChartPanels();
  wireOpMatrixPanels();
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

function buildBadgeComparisonData(data){
  const badges=BADGE_ORDER.filter(b=>data.some(d=>badgeCount(d.rec,b)>0));
  const players=data.map(d=>({
    slug:d.cfg.slug,
    name:d.cfg.name,
    accent:d.cfg.accent,
    counts:badges.map(b=>badgeCount(d.rec,b)),
  }));
  return {badges,players};
}
function buildMapComparisonData(data){
  const mapsObj={};
  data.forEach(d=>{
    (d.rec.matches||[]).forEach(m=>{
      if(!m.map||m.result==="RB"||m.map==="RP Rollback") return;
      if(!mapsObj[m.map]) mapsObj[m.map]={};
      if(!mapsObj[m.map][d.cfg.slug]) mapsObj[m.map][d.cfg.slug]={w:0,l:0};
      if(m.result==="W") mapsObj[m.map][d.cfg.slug].w++;
      else if(m.result==="L") mapsObj[m.map][d.cfg.slug].l++;
    });
  });
  const mapTotal=m=>data.reduce((s,d)=>{const x=mapsObj[m]?.[d.cfg.slug];return s+(x?x.w+x.l:0)},0);
  const maps=Object.keys(mapsObj).sort((a,b)=>mapTotal(b)-mapTotal(a));
  const players=data.map(d=>({
    slug:d.cfg.slug,
    name:d.cfg.name,
    accent:d.cfg.accent,
    stats:maps.map(map=>{
      const x=mapsObj[map]?.[d.cfg.slug];
      if(x&&x.w+x.l>0){
        const g=x.w+x.l;
        return {w:x.w,l:x.l,winPct:x.w/g*100};
      }
      return null;
    }),
  }));
  return {maps,players};
}

function ovComparisonPanel(id,title,note,statHtml,visualHtml,chartData){
  return `<div class="panel ov-chart-panel" data-ov-panel="${id}">
    <div class="sect-hdr-row">
      <div class="sect-hdr">// ${title} <span class="n">— ${note}</span></div>
      <div class="ov-mode-toggle" role="group" aria-label="View mode">
        <button type="button" class="ov-mode-btn on" data-mode="stat">Stat</button>
        <button type="button" class="ov-mode-btn" data-mode="visual">Visual</button>
      </div>
    </div>
    <div class="ov-stat-view">${statHtml}</div>
    <div class="ov-visual-view" hidden>${visualHtml}</div>
    <script type="application/json" class="ov-chart-data">${JSON.stringify(chartData)}</script>
  </div>`;
}
function buildOvFilterBar(groups){
  const bulk=`<div class="ov-filter-bulk">
    <button type="button" class="ov-filter-all">Select all</button>
    <button type="button" class="ov-filter-none">Remove all</button>
  </div>`;
  const bars=groups.map(g=>`<div class="ov-filter-bar" data-filter-group="${g.key}">
    <span class="ov-filter-lbl">${esc(g.label)}</span>
    ${g.items.map(it=>`<button type="button" class="ov-filter-chip" data-filter-key="${g.key}" data-filter-id="${esc(it.id)}" style="--chip-accent:${it.accent||"var(--gold)"}">${esc(it.label)}</button>`).join("")}
  </div>`).join("");
  return bulk+bars;
}
function buildOvVisualShell(filterHtml){
  return `<div class="ov-chart-filters">${filterHtml}</div>
    <div class="ov-chart-wrap">
      <canvas class="ov-chart-canvas" aria-label="Comparison chart"></canvas>
      <div class="ov-chart-empty">No series selected — use Select all or pick filters above.</div>
    </div>`;
}

const OV_CHARTS=new Map();
function destroyOvCharts(){
  OV_CHARTS.forEach(ch=>ch.destroy());
  OV_CHARTS.clear();
}
function hexToRgba(hex,a){
  const h=String(hex||"#888").replace("#","");
  if(h.length<6) return `rgba(136,136,136,${a})`;
  const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}
function ovChartAnimOff(){
  return document.body.classList.contains("perf-lite")
    ||window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function ovChartBaseOptions(kind){
  const anim=ovChartAnimOff()?false:{duration:400};
  return {
    responsive:true,
    maintainAspectRatio:false,
    animation:anim,
    plugins:{
      legend:{
        labels:{
          color:"#c8cad4",
          font:{family:"'JetBrains Mono',monospace",size:11},
          boxWidth:12,
          padding:14,
        },
      },
      tooltip:{
        backgroundColor:"rgba(13,15,26,.94)",
        borderColor:"rgba(255,200,0,.35)",
        borderWidth:1,
        titleFont:{family:"'JetBrains Mono',monospace",size:11},
        bodyFont:{family:"'Saira Condensed',sans-serif",size:13,weight:"600"},
        padding:10,
      },
    },
    scales:{
      x:{
        offset:true,
        ticks:{
          color(ctx){
            if(kind!=="badge") return "#888894";
            const lbl=ctx.tick?.label;
            return lbl&&NEG_BADGES.has(lbl)?"#ff5c66":"#888894";
          },
          font:{family:"'JetBrains Mono',monospace",size:10},
          maxRotation:45,
          minRotation:0,
          padding:6,
        },
        grid:{color:"rgba(255,255,255,.1)",offset:true,drawTicks:true},
      },
      y:{
        beginAtZero:true,
        max:kind==="map"?100:undefined,
        ticks:{
          color:"#888894",
          font:{family:"'JetBrains Mono',monospace",size:10},
          callback:kind==="map"?v=>v+"%":undefined,
        },
        grid:{color:"rgba(255,255,255,.08)"},
      },
    },
    datasets:{
      bar:{
        categoryPercentage:0.58,
        barPercentage:0.78,
        maxBarThickness:28,
      },
    },
  };
}
function getOvPanelFilters(panel){
  const out={player:new Set(),map:new Set(),operator:new Set(),side:new Set()};
  panel.querySelectorAll(".ov-filter-chip").forEach(chip=>{
    const key=chip.dataset.filterKey, id=chip.dataset.filterId;
    if(!chip.classList.contains("off")&&key&&id&&out[key]) out[key].add(id);
  });
  return out;
}
function renderOvComparisonChart(panel,kind,rawData,filters){
  const canvas=panel.querySelector(".ov-chart-canvas");
  const emptyEl=panel.querySelector(".ov-chart-empty");
  if(!canvas||typeof Chart==="undefined") return;
  const key=panel.dataset.ovPanel;
  OV_CHARTS.get(key)?.destroy();
  const selPlayers=rawData.players.filter(p=>filters.player.has(p.slug));
  const empty=!selPlayers.length||(kind==="map"&&!filters.map.size);
  if(emptyEl) emptyEl.classList.toggle("is-visible",empty);
  if(canvas) canvas.classList.toggle("is-hidden",empty);
  if(empty){ OV_CHARTS.delete(key); return; }
  let labels, datasets;
  if(kind==="badge"){
    labels=rawData.badges;
    datasets=selPlayers.map(p=>({
      label:p.name,
      data:p.counts,
      backgroundColor:hexToRgba(p.accent,.82),
      borderColor:p.accent,
      borderWidth:1,
      borderRadius:2,
    }));
  } else {
    labels=rawData.maps.filter(m=>filters.map.has(m));
    datasets=selPlayers.map(p=>{
      const idxMap=Object.fromEntries(rawData.maps.map((m,i)=>[m,i]));
      return {
        label:p.name,
        data:labels.map(map=>{
          const st=p.stats[idxMap[map]];
          return st?st.winPct:null;
        }),
        backgroundColor:hexToRgba(p.accent,.82),
        borderColor:p.accent,
        borderWidth:1,
        borderRadius:2,
        meta:labels.map(map=>{
          const st=p.stats[idxMap[map]];
          return st||null;
        }),
      };
    });
  }
  const opts=ovChartBaseOptions(kind);
  if(kind==="map"){
    opts.plugins.tooltip.callbacks={
      label(ctx){
        const meta=ctx.dataset.meta?.[ctx.dataIndex];
        const pct=ctx.parsed.y;
        if(meta&&pct!=null) return `${ctx.dataset.label}: ${pct.toFixed(0)}% · ${meta.w}-${meta.l}`;
        return `${ctx.dataset.label}: —`;
      },
    };
  } else {
    opts.plugins.tooltip.callbacks={
      label(ctx){
        const v=ctx.parsed.y;
        return `${ctx.dataset.label}: ${v}${v===1?" badge":v?" badges":""}`;
      },
    };
  }
  const chart=new Chart(canvas,{
    type:"bar",
    data:{labels,datasets},
    options:opts,
  });
  OV_CHARTS.set(key,chart);
}
function refreshOvPanelChart(panel){
  const kind=panel.dataset.ovPanel;
  const raw=panel.querySelector(".ov-chart-data");
  if(!raw) return;
  let data;
  try{ data=JSON.parse(raw.textContent); }catch(e){ return; }
  renderOvComparisonChart(panel,kind,data,getOvPanelFilters(panel));
}
function setOvPanelMode(panel,mode){
  const stat=panel.querySelector(".ov-stat-view");
  const visual=panel.querySelector(".ov-visual-view");
  panel.querySelectorAll(".ov-mode-btn").forEach(btn=>{
    btn.classList.toggle("on",btn.dataset.mode===mode);
  });
  if(stat) stat.hidden=mode!=="stat";
  if(visual) visual.hidden=mode!=="visual";
  if(mode==="visual") refreshOvPanelChart(panel);
  else{
    const k=panel.dataset.ovPanel;
    OV_CHARTS.get(k)?.destroy();
    OV_CHARTS.delete(k);
  }
}
function wireOvChartPanels(root="#view"){
  if(typeof Chart==="undefined") return;
  document.querySelectorAll(`${root} .ov-chart-panel`).forEach(panel=>{
    panel.querySelectorAll(".ov-mode-btn").forEach(btn=>{
      btn.onclick=()=>setOvPanelMode(panel,btn.dataset.mode);
    });
    panel.querySelectorAll(".ov-filter-chip").forEach(chip=>{
      chip.onclick=()=>{
        chip.classList.toggle("off");
        if(!panel.querySelector(".ov-visual-view")?.hidden) refreshOvPanelChart(panel);
      };
    });
    panel.querySelector(".ov-filter-all")?.addEventListener("click",()=>{
      panel.querySelectorAll(".ov-filter-chip").forEach(c=>c.classList.remove("off"));
      if(!panel.querySelector(".ov-visual-view")?.hidden) refreshOvPanelChart(panel);
    });
    panel.querySelector(".ov-filter-none")?.addEventListener("click",()=>{
      panel.querySelectorAll(".ov-filter-chip").forEach(c=>c.classList.add("off"));
      if(!panel.querySelector(".ov-visual-view")?.hidden) refreshOvPanelChart(panel);
    });
  });
}

function badgeBoard(data){
  const cmp=buildBadgeComparisonData(data);
  if(!cmp.badges.length) return "";
  const head=`<tr><th class="l">Badge</th>`+data.map(d=>`<th><div class="colcall" style="color:${d.cfg.accent}">${esc(d.cfg.name)}</div></th>`).join("")+`</tr>`;
  const body=cmp.badges.map(b=>{
    const neg=NEG_BADGES.has(b);
    const vals=data.map(d=>badgeCount(d.rec,b));
    const mx=Math.max(...vals);
    return `<tr><th class="l${neg?" badge-neg":""}">${esc(b)}</th>`+vals.map(v=>{
      const lead=v===mx&&v>0;
      return `<td class="${lead?(neg?"neg-lead":"lead"):""}">${v||"—"}</td>`;
    }).join("")+`</tr>`;
  }).join("");
  const statHtml=`<div class="scroll"><table class="board"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  const filterHtml=buildOvFilterBar([{
    key:"player",
    label:"Players",
    items:cmp.players.map(p=>({id:p.slug,label:p.name,accent:p.accent})),
  }]);
  const visualHtml=buildOvVisualShell(filterHtml);
  return ovComparisonPanel("badge","BADGE COMPARISON","gold = squad high · red = high on losses / TK",
    statHtml,visualHtml,cmp);
}

function buildOperatorMatrixData(data){
  const ops={};
  data.forEach(d=>{
    (d.rec.operators||[]).forEach(op=>{
      if(!op.rounds) return;
      if(!ops[op.name]) ops[op.name]={name:op.name,side:op.side,cells:{}};
      ops[op.name].cells[d.cfg.slug]={
        rounds:op.rounds,
        winPct:op.winPct,
        kd:typeof op.kd==="number"?op.kd:parseFloat(op.kd)||0,
      };
    });
  });
  const players=data.map(d=>({slug:d.cfg.slug,name:d.cfg.name,accent:d.cfg.accent}));
  const operators=Object.values(ops).map(o=>({
    name:o.name,
    side:o.side,
    agg:opMatrixAgg(o.cells),
    cells:o.cells,
  })).sort((a,b)=>b.agg.rounds-a.agg.rounds);
  return {operators,players};
}
function filterOpMatrixOperators(operators,filters){
  return operators.filter(op=>{
    if(filters.operator.size&&!filters.operator.has(op.name)) return false;
    if(filters.side.size&&!filters.side.has(op.side)) return false;
    return true;
  });
}
function buildOpMatrixFilterBar(cmp){
  return buildOvFilterBar([
    {
      key:"player",
      label:"Players",
      items:cmp.players.map(p=>({id:p.slug,label:p.name,accent:p.accent})),
    },
    {
      key:"operator",
      label:"Operators",
      items:cmp.operators.map(o=>({id:o.name,label:o.name,accent:"#888894"})),
    },
    {
      key:"side",
      label:"Side",
      items:[{id:"ATK",label:"ATK",accent:"#4da8ff"},{id:"DEF",label:"DEF",accent:"#2bb87a"}],
    },
  ]);
}
function buildOpMatrixChartShell(canvasClass,height){
  const h=height||420;
  return `<div class="ov-chart-wrap ov-op-chart-wrap" style="height:${h}px">
    <canvas class="ov-chart-canvas ${canvasClass}" aria-label="Operator matrix chart"></canvas>
    <div class="ov-chart-empty">No series selected — use Select all or pick filters above.</div>
  </div>`;
}
function getOpMatrixMetric(panel){
  return panel.querySelector(".ov-op-metric-select")?.value||"winpct";
}
function renderOpMatrixBubbleChart(panel,rawData,filters){
  const canvas=panel.querySelector(".ov-op-bubble-canvas");
  const wrap=panel.querySelector(".ov-op-bubble-view .ov-chart-wrap");
  const emptyEl=wrap?.querySelector(".ov-chart-empty");
  if(!canvas||typeof Chart==="undefined") return;
  const key="operator-bubble";
  OV_CHARTS.get(key)?.destroy();
  const selPlayers=rawData.players.filter(p=>filters.player.has(p.slug));
  const selOps=filterOpMatrixOperators(rawData.operators,filters);
  const empty=!selPlayers.length||!selOps.length;
  if(emptyEl) emptyEl.classList.toggle("is-visible",empty);
  canvas.classList.toggle("is-hidden",empty);
  if(empty){ OV_CHARTS.delete(key); return; }
  const datasets=selPlayers.map(p=>{
    const points=[];
    selOps.forEach(op=>{
      const cell=op.cells[p.slug];
      if(!cell) return;
      points.push({
        x:cell.rounds,
        y:cell.winPct,
        r:Math.max(5,Math.min(22,cell.kd*7)),
        operator:op.name,
        kd:cell.kd,
        rounds:cell.rounds,
      });
    });
    return {
      label:p.name,
      data:points,
      backgroundColor:hexToRgba(p.accent,.55),
      borderColor:p.accent,
      borderWidth:1,
    };
  }).filter(ds=>ds.data.length);
  if(!datasets.length){
    if(emptyEl) emptyEl.classList.toggle("is-visible",true);
    canvas.classList.toggle("is-hidden",true);
    OV_CHARTS.delete(key);
    return;
  }
  const anim=ovChartAnimOff()?false:{duration:400};
  const chart=new Chart(canvas,{
    type:"bubble",
    data:{datasets},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:anim,
      plugins:{
        legend:{
          labels:{color:"#c8cad4",font:{family:"'JetBrains Mono',monospace",size:11},boxWidth:12,padding:14},
        },
        tooltip:{
          backgroundColor:"rgba(13,15,26,.94)",
          borderColor:"rgba(255,200,0,.35)",
          borderWidth:1,
          callbacks:{
            title(items){ return items[0]?.raw?.operator||""; },
            label(ctx){
              const r=ctx.raw;
              return [
                ctx.dataset.label,
                `Win %: ${r.y.toFixed(0)}%`,
                `Rounds: ${r.rounds}`,
                `K/D: ${r.kd.toFixed(2)}`,
              ];
            },
          },
        },
      },
      scales:{
        x:{
          title:{display:true,text:"Rounds",color:"#888894",font:{family:"'JetBrains Mono',monospace",size:10}},
          beginAtZero:true,
          ticks:{color:"#888894",font:{family:"'JetBrains Mono',monospace",size:10}},
          grid:{color:"rgba(255,255,255,.08)"},
        },
        y:{
          title:{display:true,text:"Win %",color:"#888894",font:{family:"'JetBrains Mono',monospace",size:10}},
          beginAtZero:true,
          max:100,
          ticks:{color:"#888894",font:{family:"'JetBrains Mono',monospace",size:10},callback:v=>v+"%"},
          grid:{color:"rgba(255,255,255,.08)"},
        },
      },
    },
  });
  OV_CHARTS.set(key,chart);
}
function renderOpMatrixBarChart(panel,rawData,filters){
  const canvas=panel.querySelector(".ov-op-bar-canvas");
  const wrap=panel.querySelector(".ov-op-bar-view .ov-chart-wrap");
  const emptyEl=wrap?.querySelector(".ov-chart-empty");
  if(!canvas||typeof Chart==="undefined") return;
  const key="operator-bar";
  OV_CHARTS.get(key)?.destroy();
  const metric=getOpMatrixMetric(panel);
  const selPlayers=rawData.players.filter(p=>filters.player.has(p.slug));
  const selOps=filterOpMatrixOperators(rawData.operators,filters);
  const empty=!selPlayers.length||!selOps.length;
  if(wrap) wrap.style.height=Math.max(360,selOps.length*34)+"px";
  if(emptyEl) emptyEl.classList.toggle("is-visible",empty);
  canvas.classList.toggle("is-hidden",empty);
  if(empty){ OV_CHARTS.delete(key); return; }
  const labels=selOps.map(o=>o.name);
  const metricVal=cell=>{
    if(!cell) return null;
    if(metric==="rounds") return cell.rounds;
    if(metric==="kd") return cell.kd;
    return cell.winPct;
  };
  const datasets=selPlayers.map(p=>({
    label:p.name,
    data:selOps.map(op=>metricVal(op.cells[p.slug])),
    backgroundColor:hexToRgba(p.accent,.82),
    borderColor:p.accent,
    borderWidth:1,
    borderRadius:2,
    meta:selOps.map(op=>op.cells[p.slug]||null),
  }));
  const anim=ovChartAnimOff()?false:{duration:400};
  const xTitle=metric==="rounds"?"Rounds":metric==="kd"?"K/D":"Win %";
  const chart=new Chart(canvas,{
    type:"bar",
    data:{labels,datasets},
    options:{
      indexAxis:"y",
      responsive:true,
      maintainAspectRatio:false,
      animation:anim,
      plugins:{
        legend:{
          labels:{color:"#c8cad4",font:{family:"'JetBrains Mono',monospace",size:11},boxWidth:12,padding:14},
        },
        tooltip:{
          backgroundColor:"rgba(13,15,26,.94)",
          borderColor:"rgba(255,200,0,.35)",
          borderWidth:1,
          callbacks:{
            label(ctx){
              const meta=ctx.dataset.meta?.[ctx.dataIndex];
              const v=ctx.parsed.x;
              if(v==null||!meta) return `${ctx.dataset.label}: —`;
              if(metric==="winpct") return `${ctx.dataset.label}: ${v.toFixed(0)}% · ${meta.rounds} rds · K/D ${meta.kd.toFixed(2)}`;
              if(metric==="kd") return `${ctx.dataset.label}: K/D ${v.toFixed(2)} · ${meta.winPct.toFixed(0)}% · ${meta.rounds} rds`;
              return `${ctx.dataset.label}: ${v} rds · ${meta.winPct.toFixed(0)}% · K/D ${meta.kd.toFixed(2)}`;
            },
          },
        },
      },
      scales:{
        x:{
          beginAtZero:true,
          max:metric==="winpct"?100:undefined,
          title:{display:true,text:xTitle,color:"#888894",font:{family:"'JetBrains Mono',monospace",size:10}},
          ticks:{
            color:"#888894",
            font:{family:"'JetBrains Mono',monospace",size:10},
            callback:metric==="winpct"?v=>v+"%":undefined,
          },
          grid:{color:"rgba(255,255,255,.1)"},
        },
        y:{
          offset:true,
          ticks:{color:"#888894",font:{family:"'JetBrains Mono',monospace",size:10},autoSkip:false},
          grid:{color:"rgba(255,255,255,.06)",offset:true},
        },
      },
      datasets:{bar:{categoryPercentage:.62,barPercentage:.78,maxBarThickness:22}},
    },
  });
  OV_CHARTS.set(key,chart);
}
function refreshOpMatrixChart(panel){
  const raw=panel.querySelector(".ov-chart-data");
  if(!raw) return;
  let data;
  try{ data=JSON.parse(raw.textContent); }catch(e){ return; }
  const filters=getOvPanelFilters(panel);
  const mode=panel.querySelector(".ov-view-select")?.value||"data";
  if(mode==="bubble") renderOpMatrixBubbleChart(panel,data,filters);
  else if(mode==="bar") renderOpMatrixBarChart(panel,data,filters);
}
function setOpMatrixView(panel,mode){
  const dataView=panel.querySelector(".ov-op-data-view");
  const bubbleView=panel.querySelector(".ov-op-bubble-view");
  const barView=panel.querySelector(".ov-op-bar-view");
  const visualControls=panel.querySelector(".ov-op-visual-controls");
  const metricRow=panel.querySelector(".ov-op-metric-row");
  if(dataView) dataView.hidden=mode!=="data";
  if(bubbleView) bubbleView.hidden=mode!=="bubble";
  if(barView) barView.hidden=mode!=="bar";
  if(visualControls) visualControls.hidden=mode==="data";
  if(metricRow) metricRow.hidden=mode!=="bar";
  OV_CHARTS.get("operator-bubble")?.destroy();
  OV_CHARTS.delete("operator-bubble");
  OV_CHARTS.get("operator-bar")?.destroy();
  OV_CHARTS.delete("operator-bar");
  if(mode==="bubble"||mode==="bar") refreshOpMatrixChart(panel);
}
function wireOpMatrixPanels(root="#view"){
  if(typeof Chart==="undefined") return;
  document.querySelectorAll(`${root} .ov-op-matrix-panel`).forEach(panel=>{
    panel.querySelector(".ov-view-select")?.addEventListener("change",e=>{
      setOpMatrixView(panel,e.target.value);
    });
    panel.querySelector(".ov-op-metric-select")?.addEventListener("change",()=>{
      if(panel.querySelector(".ov-view-select")?.value==="bar") refreshOpMatrixChart(panel);
    });
    panel.querySelectorAll(".ov-filter-chip").forEach(chip=>{
      chip.onclick=()=>{
        chip.classList.toggle("off");
        const mode=panel.querySelector(".ov-view-select")?.value;
        if(mode==="bubble"||mode==="bar") refreshOpMatrixChart(panel);
      };
    });
    panel.querySelector(".ov-filter-all")?.addEventListener("click",()=>{
      panel.querySelectorAll(".ov-filter-chip").forEach(c=>c.classList.remove("off"));
      const mode=panel.querySelector(".ov-view-select")?.value;
      if(mode==="bubble"||mode==="bar") refreshOpMatrixChart(panel);
    });
    panel.querySelector(".ov-filter-none")?.addEventListener("click",()=>{
      panel.querySelectorAll(".ov-filter-chip").forEach(c=>c.classList.add("off"));
      const mode=panel.querySelector(".ov-view-select")?.value;
      if(mode==="bubble"||mode==="bar") refreshOpMatrixChart(panel);
    });
  });
}

function operatorMatrix(data){
  const cmp=buildOperatorMatrixData(data);
  if(!cmp.operators.length) return "";
  const pcolStyle=a=>`style="--pcol-accent:${a}"`;
  const head1=`<tr><th rowspan="2" class="l">Operator</th><th rowspan="2">Side</th>`
    +data.map(d=>`<th colspan="3" class="pcol-hdr" ${pcolStyle(d.cfg.accent)}><div class="colcall" style="color:${d.cfg.accent}">${esc(d.cfg.name)}</div></th>`).join("")+`</tr>`;
  const head2=`<tr>`+data.map(d=>`<th class="pcol-th pcol-rds" ${pcolStyle(d.cfg.accent)}>Rds</th><th class="pcol-th" ${pcolStyle(d.cfg.accent)}>Win%</th><th class="pcol-th" ${pcolStyle(d.cfg.accent)}>K/D</th>`).join("")+`</tr>`;
  const body=cmp.operators.map(o=>{
    const tag=o.side==="ATK"?'<span class="side-tag atk">ATK</span>':'<span class="side-tag def">DEF</span>';
    let row=`<tr data-side="${esc(o.side)}" data-rounds="${o.agg.rounds}" data-winpct="${o.agg.winpct}" data-kd="${o.agg.kd}"><td class="l"><div class="opcell"><span class="opicon">${opIconImg(o.name)}</span><span class="opname">${esc(o.name)}</span></div></td><td>${tag}</td>`;
    data.forEach(d=>{
      const op=o.cells[d.cfg.slug];
      const ps=pcolStyle(d.cfg.accent);
      if(op) row+=`<td class="pcol pcol-rds" ${ps}>${op.rounds}</td><td class="pcol" style="--pcol-accent:${d.cfg.accent};color:${wrColor(op.winPct)}">${op.winPct}%</td><td class="pcol" ${ps}>${op.kd.toFixed(2)}</td>`;
      else row+=`<td class="pcol pcol-rds dim-cell" ${ps}>—</td><td class="pcol dim-cell" ${ps}>—</td><td class="pcol dim-cell" ${ps}>—</td>`;
    });
    return row+`</tr>`;
  }).join("");
  const dataHtml=`<div class="ov-op-data-view">
    ${buildOpToolbar(OP_MATRIX_SORT,true)}
    <div class="scroll"><table class="board ov-matrix"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table></div>
    <div class="legend">Sort by squad-weighted RDS / WIN% / K/D · <span class="g">▼</span> high first · <span class="r">▲</span> low first</div>
  </div>`;
  const filterHtml=buildOpMatrixFilterBar(cmp);
  const visualControls=`<div class="ov-op-visual-controls" hidden>
    <div class="ov-op-metric-row">
      <label class="ov-op-metric-lbl">Metric</label>
      <select class="ov-op-metric-select" aria-label="Bar chart metric">
        <option value="winpct" selected>Win %</option>
        <option value="kd">K/D</option>
        <option value="rounds">Rounds</option>
      </select>
    </div>
    <div class="ov-chart-filters">${filterHtml}</div>
  </div>`;
  const bubbleHtml=`<div class="ov-op-bubble-view" hidden>
    <p class="ov-op-chart-note">X = rounds · Y = win % · bubble size = K/D · one dot per player × operator</p>
    ${buildOpMatrixChartShell("ov-op-bubble-canvas",420)}
  </div>`;
  const barHtml=`<div class="ov-op-bar-view" hidden>
    <p class="ov-op-chart-note">Horizontal grouped bars · change metric above · sorted by squad RDS</p>
    ${buildOpMatrixChartShell("ov-op-bar-canvas",480)}
  </div>`;
  return `<div class="panel ov-op-matrix ov-op-matrix-panel" data-ov-panel="operator">
    <div class="sect-hdr-row">
      <div class="sect-hdr">// OPERATOR MATRIX <span class="n">— all season operators · squad-weighted sort</span></div>
      <select class="ov-view-select" aria-label="Operator matrix view">
        <option value="data" selected>Data</option>
        <option value="bubble">Bubble Chart</option>
        <option value="bar">Horizontal grouped bar</option>
      </select>
    </div>
    ${visualControls}
    ${dataHtml}
    ${bubbleHtml}
    ${barHtml}
    <script type="application/json" class="ov-chart-data">${JSON.stringify(cmp)}</script>
  </div>`;
}

function mapHeatmap(data){
  const cmp=buildMapComparisonData(data);
  if(!cmp.maps.length) return "";
  const slugIdx=Object.fromEntries(data.map((d,i)=>[d.cfg.slug,i]));
  const head1=`<tr><th rowspan="2" class="l">Map</th>`
    +data.map(d=>`<th colspan="2"><div class="colcall" style="color:${d.cfg.accent}">${esc(d.cfg.name)}</div></th>`).join("")
    +`<th rowspan="2">Squad</th></tr>`;
  const head2=`<tr>`+data.map(()=>`<th>W-L</th><th>Win%</th>`).join("")+`</tr>`;
  const body=cmp.maps.map((map,mapIdx)=>{
    let sw=0,sl=0,row=`<tr><th class="l">${esc(map)}</th>`;
    data.forEach(d=>{
      const p=cmp.players[slugIdx[d.cfg.slug]];
      const st=p?.stats[mapIdx];
      if(st){
        row+=`<td>${st.w}-${st.l}</td><td>${mapChip(st.winPct)}</td>`;
        sw+=st.w; sl+=st.l;
      } else row+=`<td class="dim-cell">—</td><td class="dim-cell">—</td>`;
    });
    const sg=sw+sl;
    row+=`<td>${sg?mapChip(sw/sg*100):"—"}</td></tr>`;
    return row;
  }).join("");
  const statHtml=`<div class="scroll"><table class="board ov-matrix"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table></div>`;
  const filterHtml=buildOvFilterBar([
    {
      key:"player",
      label:"Players",
      items:cmp.players.map(p=>({id:p.slug,label:p.name,accent:p.accent})),
    },
    {
      key:"map",
      label:"Maps",
      items:cmp.maps.map(m=>({id:m,label:m,accent:"#888894"})),
    },
  ]);
  const visualHtml=buildOvVisualShell(filterHtml);
  return ovComparisonPanel("map","MAP PERFORMANCE","from match log · green ≥55% · gold ≥45% · red &lt;45%",
    statHtml,visualHtml,cmp);
}

/* ---- background music / jukebox ---- */
const BGM_KEY="vantage-bgm-vol";
const BGM_MUTE_KEY="vantage-bgm-muted";
const BGM_TIME_KEY="vantage-bgm-time";
const BGM_PLAYING_KEY="vantage-bgm-playing";
const BGM_TRACK_KEY="vantage-bgm-track";
const BGM_DEFAULT_VOL=25;
const BGM_ALBUMS_PER_PAGE=4;
const BGM_FALLBACK=[];

function fmtAudioTime(s){
  if(!isFinite(s)||s<0) return "0:00";
  const m=Math.floor(s/60), sec=Math.floor(s%60);
  return m+":"+String(sec).padStart(2,"0");
}
function audioSrc(file){ return `${BASE}assets/audio/${file.split("/").map(encodeURIComponent).join("/")}`; }

async function initBgm(){
  if(document.getElementById("vantage-bgm")) return;
  const isPage=PAGE==="soundtracks";
  const mount=isPage?byId("bgm-view"):document.body;
  if(isPage&&!mount) return;

  let playlist={albums:[],tracks:BGM_FALLBACK,defaultTrack:null};
  try{
    const r=await fetch(`${BASE}data/music/playlist.json`,{cache:"no-store"});
    if(r.ok) playlist=await r.json();
  }catch(e){}

  const tracks=(playlist.tracks||[]).filter(t=>t.album!=="y11s1"&&t.album!=="inv2018"&&t.file!=="vibe-shard.mp3");
  if(!tracks.length) return;

  const albums=(playlist.albums||[]).filter(a=>a.id!=="y11s1");
  const dropInner=`
      <div class="bgm-hero">
        <div class="bgm-cover" id="bgm-cover"><span class="bgm-cover-ph" aria-hidden="true">&#9835;</span></div>
        <div class="bgm-meta">
          <div class="bgm-title" id="bgm-title">—</div>
          <div class="bgm-album" id="bgm-album">Pick an album</div>
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
        <div class="bgm-browse-hdr-row">
          <div class="bgm-browse-hdr" id="bgm-browse-hdr">// SOUNDTRACKS</div>
          <div class="bgm-pages" id="bgm-pages" role="group" aria-label="Soundtrack pages"></div>
        </div>
        <div class="bgm-albums" id="bgm-albums"></div>
        <div class="bgm-tracks-panel" id="bgm-tracks-panel">
          <div class="bgm-tracks-hdr" id="bgm-tracks-hdr">Pick an album</div>
          <ul class="bgm-list" id="bgm-tracks-list"></ul>
        </div>
      </div>
    <audio id="vantage-bgm" preload="metadata"></audio>`;

  const wrap=document.createElement("div");
  wrap.className=isPage?"bgm-ctl bgm-ctl--page":"bgm-ctl";
  if(isPage){
    wrap.innerHTML=`<div class="panel bgm-page-panel">
      <div class="sect-hdr">// SOUNDTRACKS <span class="n">— full library · stats-free zone</span></div>
      <div class="bgm-drop" id="bgm-drop">${dropInner}</div></div>`;
  }else{
    wrap.innerHTML=`<button type="button" class="bgm-btn" id="bgm-btn" aria-label="Music player" aria-expanded="false" title="Music">&#9835;</button>
      <div class="bgm-drop" id="bgm-drop" hidden>
      <div class="bgm-drop-hdr">// COMMS AUDIO</div>${dropInner}</div>`;
  }
  mount.appendChild(wrap);

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
  const pagesEl=byId("bgm-pages");

  let deactivated=localStorage.getItem(BGM_MUTE_KEY)==="1";
  let vol=parseInt(localStorage.getItem(BGM_KEY),10);
  if(isNaN(vol)) vol=BGM_DEFAULT_VOL;
  let autoplayMuted=false;
  let positionRestored=false;
  let seekDragging=false;
  let trackIdx=-1;
  let shuffleOn=false;
  let browseAlbumId=null;
  let albumPage=0;
  const albumPageCount=Math.max(1,Math.ceil(albums.length/BGM_ALBUMS_PER_PAGE));

  function albumPageFor(albumId){
    const idx=albums.findIndex(a=>a.id===albumId);
    return idx<0?0:Math.floor(idx/BGM_ALBUMS_PER_PAGE);
  }
  function setAlbumPage(page){
    albumPage=Math.max(0,Math.min(albumPageCount-1,page));
    albumsEl.querySelectorAll(".bgm-album-btn").forEach(el=>{
      el.hidden=parseInt(el.dataset.page,10)!==albumPage;
    });
    pagesEl.querySelectorAll(".bgm-page-btn").forEach(el=>{
      el.classList.toggle("on",parseInt(el.dataset.page,10)===albumPage);
    });
  }

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
  function albumTracks(albumId){
    const list=tracks.map((t,i)=>({t,i})).filter(x=>x.t.album===albumId);
    list.sort((a,b)=>{
      const af=a.t.favorite?1:0,bf=b.t.favorite?1:0;
      if(af!==bf) return bf-af;
      return a.i-b.i;
    });
    return list;
  }
  function albumMeta(albumId){ return albums.find(a=>a.id===albumId)||null; }

  function setBrowseAlbum(albumId){
    browseAlbumId=albumId;
    if(albumId) setAlbumPage(albumPageFor(albumId));
    const album=albumMeta(albumId);
    albumsEl.querySelectorAll(".bgm-album-btn").forEach(el=>{
      el.classList.toggle("on",el.dataset.album===albumId);
    });
    tracksHdr.textContent=album?album.label:"Pick an album";
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
      b.className="bgm-list-item"+(t.favorite?" bgm-list-item--favorite":"");
      b.dataset.idx=String(i);
      if(t.favorite||t.tag){
        b.innerHTML=`<span class="bgm-list-item-text">${esc(t.title)}</span><span class="bgm-fav-tag">${esc(t.tag||"Matt's Favorite")}</span>`;
      }else b.textContent=t.title;
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

  albums.forEach((a,i)=>{
    const count=a.count??albumTracks(a.id).length;
    const countLbl=count===0?"Coming soon":`${count} track${count===1?"":"s"}`;
    const b=document.createElement("button");
    b.type="button";
    b.className="bgm-album-btn"+(count===0?" bgm-album-placeholder":"")+(a.manualOnly?" bgm-album-manual":"");
    b.dataset.album=a.id;
    b.dataset.page=String(Math.floor(i/BGM_ALBUMS_PER_PAGE));
    b.innerHTML=`<div class="bgm-album-thumb">${a.cover?`<img src="${audioSrc(a.cover)}" alt="" loading="lazy">`:`<span class="bgm-album-ph" aria-hidden="true">&#9835;</span>`}</div>
      <div class="bgm-album-name">${esc(a.label)}</div><div class="bgm-album-count">${countLbl}</div>`;
    b.onclick=e=>{ e.stopPropagation(); setBrowseAlbum(a.id); };
    albumsEl.appendChild(b);
  });

  for(let p=0;p<albumPageCount;p++){
    const pb=document.createElement("button");
    pb.type="button";
    pb.className="bgm-page-btn"+(p===0?" on":"");
    pb.dataset.page=String(p);
    pb.textContent=`Page ${p+1}`;
    pb.onclick=e=>{ e.stopPropagation(); setAlbumPage(p); };
    pagesEl.appendChild(pb);
  }
  setAlbumPage(0);

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
    if(btn){
      btn.classList.toggle("deactivated",deactivated);
      btn.classList.toggle("playing",!audio.paused&&!deactivated&&!autoplayMuted&&trackIdx>=0);
      btn.classList.toggle("needs-tap",autoplayMuted&&!deactivated);
    }
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
  if(savedId==="3aa63d76") savedId="f740538b";
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

  if(btn){
    btn.onclick=e=>{
      e.stopPropagation();
      const open=!drop.hidden;
      drop.hidden=open;
      btn.setAttribute("aria-expanded",String(!open));
      if(open&&autoplayMuted&&!deactivated) unlockFromGesture();
    };
  }
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
  if(!isPage&&btn){
    document.addEventListener("click",e=>{
      if(!wrap.contains(e.target)){
        drop.hidden=true;
        btn.setAttribute("aria-expanded","false");
      }
    });
  }

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
initPerfMode();
if(PAGE==="roster"){
  applyMenuTheme();
  initBgm().catch(()=>{});
  renderRoster();
}else if(PAGE==="soundtracks"){
  applySoundtracksTheme();
  initBgm().catch(()=>{});
}else if(PAGE==="player"){
  initFxLayers();
  initBgm().catch(()=>{});
  renderPlayer();
}else{
  initFxLayers();
  initBgm().catch(()=>{});
  if(PAGE==="oversight") renderOversight();
}
