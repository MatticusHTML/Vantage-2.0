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
function wrColor(p){ p=parseFloat(p); if(isNaN(p))return"var(--white)"; if(p>=55)return"var(--green)"; if(p>=45)return"var(--gold)"; return"var(--red)"; }
function seasonOp(s){ return SEASON_OPS[s] || ""; }
function setBrandTag(text){ const el=document.querySelector(".cmdbar .tag"); if(el) el.textContent=text; }

/* ---- ambient FX / seasonal themes ---- */
function initFxLayers(){
  if(document.querySelector(".fx-root")) return;
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
    '<div class="fx fx-hud"></div>',
  ].join("");
  document.body.prepend(root);
}
function clearThemeClasses(){
  document.body.classList.remove("theme-y11s1","theme-y11s2");
}
function applyMenuTheme(){
  initFxLayers();
  delete document.body.dataset.season;
  document.body.dataset.fx="menu";
  clearThemeClasses();
}
function applyPlayerSeasonTheme(season){
  initFxLayers();
  delete document.body.dataset.fx;
  clearThemeClasses();
  const s=season||DEFAULT_SEASON;
  document.body.dataset.season=s;
  document.body.classList.add(s==="Y11S1"?"theme-y11s1":"theme-y11s2");
}
function applyOversightTheme(){
  initFxLayers();
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
  applyMenuTheme();
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
  return `<div class="panel"><div class="sect-hdr">// VANTAGE COMMENT LOG <span class="n">— map + 5 operators per refresh, retained</span></div>
    <div class="callback-note">Older entries kept so VANTAGE can track progression and call back to prior reads.</div>
    <div class="clog">${rec.comments.map(c=>`<div class="comment ${c.type==='map'?'map':''} ${c.old?'old':''}">
      <span class="cicon">${commentIconImg(c)}</span>
      <div class="cbody"><div class="ctop"><span class="ctype ${c.type==='map'?'map':''}">${c.type}</span>
      <span class="csubj">${esc(c.subject)}</span><span class="cdate">${esc(c.date||"")}</span></div>
      <div class="ctext">${esc(c.text)}</div></div></div>`).join("")}</div></div>`;
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
  return `<div class="panel"><div class="sect-hdr">// VANTAGE — TEAM DEBRIEF <span class="n">— map + 5 operators, squad-wide</span></div>
    <div class="clog">${squad.comments.map(c=>`<div class="comment ${c.type==='map'?'map':''}">
      <span class="cicon">${commentIconImg(c)}</span>
      <div class="cbody"><div class="ctop"><span class="ctype ${c.type==='map'?'map':''}">${c.type}</span>
      <span class="csubj">${esc(c.subject)}</span><span class="cdate">${esc(c.date||"")}</span></div>
      <div class="ctext">${esc(c.text)}</div></div></div>`).join("")}</div></div>`;
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

/* ---- background music ---- */
const BGM_KEY="vantage-bgm-vol";
const BGM_MUTE_KEY="vantage-bgm-muted";
const BGM_TIME_KEY="vantage-bgm-time";
const BGM_PLAYING_KEY="vantage-bgm-playing";
const BGM_DEFAULT_VOL=25;
function initBgm(){
  if(document.getElementById("vantage-bgm")) return;
  const wrap=document.createElement("div");
  wrap.className="bgm-ctl";
  wrap.innerHTML=`<button type="button" class="bgm-btn" id="bgm-btn" aria-label="Background music volume" aria-expanded="false" title="Volume">&#9835;</button>
    <div class="bgm-drop" id="bgm-drop" hidden>
      <div class="bgm-drop-hdr">// AMBIENT AUDIO</div>
      <button type="button" class="bgm-mute" id="bgm-mute">Mute</button>
      <label class="bgm-vol-lbl" for="bgm-vol">Volume</label>
      <input type="range" class="bgm-vol" id="bgm-vol" min="0" max="100" value="${BGM_DEFAULT_VOL}">
    </div>
    <audio id="vantage-bgm" loop preload="auto" autoplay src="${BASE}assets/audio/vibe-shard.mp3"></audio>`;
  document.body.appendChild(wrap);

  const audio=byId("vantage-bgm");
  const btn=byId("bgm-btn");
  const drop=byId("bgm-drop");
  const muteBtn=byId("bgm-mute");
  const slider=byId("bgm-vol");
  let muted=localStorage.getItem(BGM_MUTE_KEY)==="1";
  let vol=parseInt(localStorage.getItem(BGM_KEY),10);
  if(isNaN(vol)) vol=BGM_DEFAULT_VOL;
  let autoplayMuted=false;
  let positionRestored=false;

  function wasPlayingLastPage(){
    return sessionStorage.getItem(BGM_PLAYING_KEY)==="1";
  }
  function saveBgmState(){
    if(muted||audio.paused){
      sessionStorage.setItem(BGM_PLAYING_KEY,"0");
    }else{
      sessionStorage.setItem(BGM_PLAYING_KEY,"1");
      sessionStorage.setItem(BGM_TIME_KEY,String(audio.currentTime));
    }
  }
  function restoreBgmPosition(){
    if(positionRestored) return;
    const t=parseFloat(sessionStorage.getItem(BGM_TIME_KEY));
    if(!isNaN(t)&&t>0&&(!audio.duration||t<audio.duration-1)){
      audio.currentTime=t;
    }
    positionRestored=true;
  }

  function syncUi(){
    slider.value=vol;
    muteBtn.textContent=muted?"Unmute":"Mute";
    btn.classList.toggle("muted",muted);
    btn.classList.toggle("playing",!audio.paused&&!muted&&!autoplayMuted);
    btn.classList.toggle("needs-tap",autoplayMuted&&!muted);
  }
  function applyVol(){
    audio.volume=muted?0:Math.max(0,Math.min(1,vol/100));
    syncUi();
  }
  async function attemptAutoplay(){
    if(muted){ audio.pause(); saveBgmState(); syncUi(); return; }
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
  function unlockFromGesture(){
    if(muted) return;
    if(autoplayMuted){
      audio.muted=false;
      autoplayMuted=false;
      applyVol();
      audio.play().then(saveBgmState).catch(()=>{});
    }else if(audio.paused){
      attemptAutoplay();
    }
  }

  audio.addEventListener("loadedmetadata",restoreBgmPosition);
  audio.addEventListener("canplay",()=>{
    if(!muted&&(wasPlayingLastPage()||!audio.paused)) attemptAutoplay();
  });
  window.addEventListener("pagehide",saveBgmState);
  setInterval(()=>{ if(!audio.paused&&!muted) saveBgmState(); },2000);

  applyVol();
  if(!muted&&wasPlayingLastPage()) attemptAutoplay();
  else if(!muted) attemptAutoplay();
  document.addEventListener("pointerdown",unlockFromGesture,{passive:true});
  document.addEventListener("keydown",unlockFromGesture);

  btn.onclick=e=>{
    e.stopPropagation();
    const open=!drop.hidden;
    drop.hidden=open;
    btn.setAttribute("aria-expanded",String(!open));
    if(open&&autoplayMuted&&!muted) unlockFromGesture();
  };
  muteBtn.onclick=e=>{
    e.stopPropagation();
    if(muted){
      muted=false;
      if(vol===0) vol=BGM_DEFAULT_VOL;
      localStorage.setItem(BGM_MUTE_KEY,"0");
      applyVol();
      attemptAutoplay();
    }else{
      muted=true;
      localStorage.setItem(BGM_MUTE_KEY,"1");
      audio.pause();
      autoplayMuted=false;
      audio.muted=false;
      saveBgmState();
      applyVol();
    }
  };
  slider.oninput=()=>{
    vol=parseInt(slider.value,10);
    localStorage.setItem(BGM_KEY,String(vol));
    if(vol===0){
      muted=true;
      localStorage.setItem(BGM_MUTE_KEY,"1");
      audio.pause();
      autoplayMuted=false;
      audio.muted=false;
      saveBgmState();
    }else{
      muted=false;
      localStorage.setItem(BGM_MUTE_KEY,"0");
      applyVol();
      attemptAutoplay();
    }
    applyVol();
  };
  document.addEventListener("click",e=>{
    if(!wrap.contains(e.target)){ drop.hidden=true; btn.setAttribute("aria-expanded","false"); }
  });
}

/* ---- boot ---- */
initFxLayers();
initBgm();
if(PAGE==="roster")       { applyMenuTheme(); renderRoster(); }
else if(PAGE==="player")   renderPlayer();
else if(PAGE==="oversight") renderOversight();
