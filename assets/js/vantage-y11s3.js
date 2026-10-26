/* ============================================================
   VANTAGE · Y11S3 — Operation Split Fire (dossier module)
   Loaded by vantage.js only when a dossier opens on Y11S3.
   It decorates the engine's own render with new Y11S3 panels and never
   runs for Y11S1 / Y11S2. Uses engine globals: esc, fmt, opIconImg,
   getPlayerCfg, loadRecord, isPerfLite.
   ============================================================ */
(function(){
  const TIERS = ["Copper","Bronze","Silver","Gold","Platinum","Emerald","Diamond","Champion","Legend"];
  const STRIKE_KEY = "vantage-y11s3-strike";
  const PREV_SEASON = "Y11S2";

  const num = v => (typeof v==="number" ? v : parseFloat(v)) || 0;

  /* ---- attack / defense roll-up from the operators array ---- */
  function sideAgg(ops, side){
    const rows = (ops||[]).filter(o=>o.side===side);
    const rounds = rows.reduce((s,o)=>s+num(o.rounds),0);
    if(!rounds) return null;
    const k = rows.reduce((s,o)=>s+num(o.k),0);
    const d = rows.reduce((s,o)=>s+num(o.d),0);
    const win = rows.reduce((s,o)=>s+num(o.winPct)*num(o.rounds),0)/rounds;
    const hs  = k ? rows.reduce((s,o)=>s+num(o.hs)*num(o.k),0)/k : 0;
    const top = rows.slice().sort((a,b)=>num(b.rounds)-num(a.rounds)).slice(0,3);
    return { rounds, k, d, win, hs, kd: d ? k/d : k, top };
  }
  function sidePanel(cls, label, a){
    if(!a) return `<div class="sf-side ${cls}"><div class="sf-side-h">${label}</div><div class="sf-none">No ${label.toLowerCase()} rounds logged yet.</div></div>`;
    const tops = a.top.map(o=>`<div class="sf-top">${opIconImg(o.name)}<span>${esc(o.name)}</span><span class="rd">${fmt(o.rounds)} rds</span></div>`).join("");
    return `<div class="sf-side ${cls}">
      <div class="sf-side-h">${label}</div>
      <div class="sf-big">${a.win.toFixed(1)}<small>%</small></div>
      <div class="sf-biglbl">round win rate</div>
      <div class="sf-mini">
        <div><div class="k">Rounds</div><div class="v">${fmt(a.rounds)}</div></div>
        <div><div class="k">K/D</div><div class="v">${a.kd.toFixed(2)}</div></div>
        <div><div class="k">HS%</div><div class="v">${a.hs.toFixed(1)}%</div></div>
      </div>
      <div class="sf-tops">${tops}</div>
    </div>`;
  }
  function splitHtml(rec){
    if(!(rec.operators||[]).length) return "";
    return `<div class="panel sf-split"><div class="sect-hdr">// SPLIT FIRE — ATTACK | DEFENSE <span class="n">— season rounds by side</span></div>
      <div class="sf-split-grid">
        ${sidePanel("sf-atk","Attack",sideAgg(rec.operators,"ATK"))}
        <div class="sf-seam" aria-hidden="true"></div>
        ${sidePanel("sf-def","Defense",sideAgg(rec.operators,"DEF"))}
      </div></div>`;
  }

  /* ---- rank ladder (tier names only — no RP thresholds, those are not confirmed) ---- */
  function ladderHtml(rec){
    const tier = String((rec.meta&&rec.meta.rank)||"").trim().split(/\s+/)[0];
    const at = TIERS.findIndex(t=>t.toLowerCase()===tier.toLowerCase());
    const cells = TIERS.map((t,i)=>{
      const cls = ["sf-tier", at>=0&&i<=at?"on":"", i===at?"now":"", t==="Legend"?"legend":""].filter(Boolean).join(" ");
      return `<div class="${cls}">${t}${t==="Legend"?'<span class="sf-newtag">NEW IN Y11S3</span>':""}</div>`;
    }).join("");
    return `<div class="panel sf-ladder"><div class="sect-hdr">// RANK LADDER <span class="n">— Legend division joins the top of the board</span></div>
      <div class="sf-ladder-row">${cells}</div></div>`;
  }

  /* ---- Y11S3 vs Y11S2 final ---- */
  function delta(cur, prev, o){
    o = o||{};
    const dec = o.dec==null?2:o.dec, neutral = !!o.neutral;
    const d = cur - prev;
    const eps = Math.pow(10,-dec)/2;
    if(Math.abs(d) < eps) return `<span class="sf-d eq">— even</span>`;
    const up = d>0, good = neutral ? null : up;
    const cls = neutral ? "eq" : (good?"up":"dn");
    return `<span class="sf-d ${cls}">${up?"▲":"▼"} ${Math.abs(d).toFixed(dec)}${o.suffix||""}</span>`;
  }
  function vsHtml(cur, prev){
    const a = prev.meta, b = cur.meta;
    const row = (lbl, pv, cv, d)=>`<tr><td class="l">${lbl}</td><td>${pv}</td><td>${cv}</td><td>${d}</td></tr>`;
    return `<div class="panel sf-vs"><div class="sect-hdr">// SEASON OVER SEASON <span class="n">— Y11S3 live vs Y11S2 final</span></div>
      <div class="scroll"><table><thead><tr><th class="l">Metric</th><th>Y11S2 final</th><th>Y11S3 now</th><th>Change</th></tr></thead><tbody>
        ${row("Rank", esc(a.rank||"—"), esc(b.rank||"—"), "")}
        ${row("RP", fmt(a.rp), fmt(b.rp), delta(num(b.rp),num(a.rp),{dec:0}))}
        ${row("Win rate", num(a.winRate).toFixed(1)+"%", num(b.winRate).toFixed(1)+"%", delta(num(b.winRate),num(a.winRate),{dec:1,suffix:" pts"}))}
        ${row("K/D", num(a.kd).toFixed(2), num(b.kd).toFixed(2), delta(num(b.kd),num(a.kd),{dec:2}))}
        ${row("Avg HS%", num(a.avgHs).toFixed(1)+"%", num(b.avgHs).toFixed(1)+"%", delta(num(b.avgHs),num(a.avgHs),{dec:1,suffix:" pts"}))}
        ${row("Matches", fmt(a.matches), fmt(b.matches), delta(num(b.matches),num(a.matches),{dec:0,neutral:true}))}
      </tbody></table></div>
      <div class="sf-vs-note">Y11S2 is the closed record. Season-long totals sit beside a season that is still being played, so early-season swings are normal.</div></div>`;
  }

  /* ---- hero strip ---- */
  function heroHtml(ctx){
    const cfg = getPlayerCfg(ctx.slug) || {};
    const accent = cfg.accent || "#ffc800";
    const rec = ctx.rec;
    return `<section class="sf-hero" style="--sf-accent:${accent}" aria-label="Operation Split Fire">
      <div class="sf-hero-l">
        <div class="sf-kick"><span class="sf-pill">Y11S3</span><span>Ranked 3.0</span></div>
        <div class="sf-title"><span class="sf-w1">Split</span> <span class="sf-w2">Fire</span></div>
        <div class="sf-who"><b>${esc(rec.name||cfg.name||"Operator")}</b> · season dossier</div>
      </div>
      <div class="sf-hero-r">
        <div class="sf-chip sf-new">New defender · <b>Noor</b></div>
        <div class="sf-chip">New division · <b>Legend</b></div>
        <div class="sf-chip">Updated · <b>${esc(rec.updated||"—")}</b></div>
      </div>
    </section>`;
  }

  /* ---- lance strike intro: the seam splits open once per browser session ---- */
  function maybeStrike(){
    const force = /[?&]strike=1\b/.test(location.search);
    let seen = false;
    try{ seen = sessionStorage.getItem(STRIKE_KEY)==="1"; }catch(e){}
    const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    const lite = typeof isPerfLite==="function" && isPerfLite();
    if(!force && (seen || reduce || lite)) return;
    try{ sessionStorage.setItem(STRIKE_KEY,"1"); }catch(e){}
    document.querySelectorAll(".sf-strike").forEach(n=>n.remove());
    const el = document.createElement("div");
    el.className = "sf-strike";
    el.setAttribute("aria-hidden","true");
    el.innerHTML = '<div class="sf-half sf-half-l"></div><div class="sf-half sf-half-r"></div>'
      + '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path class="sf-lance" pathLength="1" d="M56 0 L44 100"/></svg>'
      + '<div class="sf-tag">Split Fire</div>';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 2100);
  }

  /* the engine card hard-codes "+" in front of Net RP; show a negative season honestly (minus sign, red) */
  function fixNetRp(view, rec){
    const m = rec.meta;
    if(!m || !(num(m.netRp) < 0)) return;
    view.querySelectorAll(".cards .card").forEach(c=>{
      const k = c.querySelector(".k"), v = c.querySelector(".v");
      if(k && v && /net rp/i.test(k.textContent)){
        v.textContent = "−" + fmt(Math.abs(num(m.netRp)));
        v.classList.remove("green");
        v.style.color = "var(--red)";
      }
    });
  }

  /* ---- entry point, called by vantage.js after the dossier renders ---- */
  async function decorate(ctx){
    const view = ctx && ctx.view;
    if(!view) return;
    view.querySelectorAll(".sf-hero,.sf-ladder,.sf-split,.sf-vs,.sf-vs-slot").forEach(n=>n.remove());
    view.insertAdjacentHTML("afterbegin", heroHtml(ctx));
    const rec = ctx.rec;
    if(!rec.meta){
      const es = view.querySelector(".empty .es");
      if(es) es.innerHTML = "Operation Split Fire is live. No Y11S3 matches are logged yet — the board fills in on the first VANTAGE update.<br>Rank ladder, attack | defense split and the Y11S2 comparison appear here once matches land.";
      const eh = view.querySelector(".empty .eh");
      if(eh) eh.innerHTML = "&#9650; Season Open — Split Fire";
    }else{
      fixNetRp(view, rec);
      const first = view.querySelector(".panel");
      if(first){
        first.insertAdjacentHTML("afterend", ladderHtml(rec) + splitHtml(rec) + '<div class="sf-vs-slot"></div>');
        if(rec.meta.matches){
          try{
            const prev = await loadRecord(ctx.slug, PREV_SEASON);
            const slot = view.querySelector(".sf-vs-slot");
            if(slot && prev && prev.meta) slot.outerHTML = vsHtml(rec, prev);
            else if(slot) slot.remove();
          }catch(e){ const s=view.querySelector(".sf-vs-slot"); if(s) s.remove(); }
        }else{
          const s=view.querySelector(".sf-vs-slot"); if(s) s.remove();
        }
      }
    }
    maybeStrike();
  }

  window.VantageY11S3 = { decorate };
})();
