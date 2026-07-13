/* ============================================================
   app.js — état global, navigation, tableaux de bord,
   programme, suivi (poids/douleurs), coach, réglages,
   sauvegarde automatique, export / import.
   ============================================================ */
"use strict";

const STORE_KEY = "coach-tanguy-v1";
const APP_VERSION = 2;

/* ---------- état ---------- */
const DEFAULT_STATE = () => ({
  v: APP_VERSION,
  profile: { name: "Tanguy", height: 180, startWeight: 66, targetWeight: 72, startDate: PLAN_START, targetDate: RENTREE },
  settings: {
    difficulty: "normal", equipment: ["sac", "bouteilles", "chaise", "mur"],
    liked: [], disliked: [], maxDuration: 45, hour: "18:30",
    weighFreq: "2-3 fois par semaine", painThreshold: 5, reminders: true,
  },
  logs: {}, sched: {}, subs: {}, adapt: {}, pains: [], weights: [], reports: {}, checkins: {},
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT_STATE();
    const parsed = JSON.parse(raw);
    const base = DEFAULT_STATE();
    const out = Object.assign(base, parsed);
    out.profile = Object.assign(DEFAULT_STATE().profile, parsed.profile || {});
    out.settings = Object.assign(DEFAULT_STATE().settings, parsed.settings || {});
    ["logs", "sched", "subs", "adapt", "reports", "checkins"].forEach((k) => { if (!out[k]) out[k] = {}; });
    ["pains", "weights"].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    return out;
  } catch (e) {
    console.error("État illisible, on repart de zéro", e);
    return DEFAULT_STATE();
  }
}

let S = loadState();
const UI = { view: "home", param: null, week: null, openExo: null, pain: null, chartEx: "", editValidated: false, wform: {}, sessMenu: null };

let saveTimer = null;
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast("⚠️ Sauvegarde impossible (stockage plein ?)"); }
}
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 350); }

/* ---------- utilitaires UI ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2400);
}
function openSheet(html, keepScroll) {
  const root = document.getElementById("sheet-root");
  const prev = root.querySelector(".sheet");
  const scrollPos = keepScroll && prev ? prev.scrollTop : 0;
  const noanim = prev ? " noanim" : "";
  root.innerHTML = `<div class="sheet-wrap"><div class="sheet-bg${noanim}" data-act="close-sheet"></div><div class="sheet${noanim}"><div class="sheet-grab"></div>${html}</div></div>`;
  if (scrollPos) root.querySelector(".sheet").scrollTop = scrollPos;
}
function closeSheet() { document.getElementById("sheet-root").innerHTML = ""; }
function go(view, param) {
  UI.view = view; UI.param = param || null; UI.openExo = null; UI.editValidated = false;
  closeSheet(); render();
  window.scrollTo({ top: 0 });
}

/* ---------- statut effectif d'une séance ---------- */
function sessionDate(s) { return (S.sched[s.id] && S.sched[s.id].date) || s.plannedDate; }
function sessionStatus(s) {
  const log = S.logs[s.id];
  const sch = S.sched[s.id] || {};
  if (log && ["done", "partial", "interrupted"].includes(log.state)) return log.state;
  if (sch.status === "canceled") return "canceled";
  if (sch.status === "rest") return "rest";
  if (log && log.state === "doing" && log.startedAt) return "doing";
  if (sch.date && sch.date !== s.plannedDate) return "moved";
  if (sessionDate(s) < todayISO()) return "missed";
  return "todo";
}
const STATUS_BADGE = {
  done: ["Validée", "b-ok"], partial: ["Partielle", "b-warn"], interrupted: ["Interrompue", "b-bad"],
  doing: ["En cours", "b-info"], moved: ["Reportée", "b-info"], canceled: ["Annulée", "b-mut"],
  rest: ["Repos choisi", "b-info"], missed: ["À rattraper", "b-warn"], todo: ["Prévue", "b-mut"],
};

function nextPlannedSession() {
  const t = todayISO();
  const cands = ALL_SESSIONS
    .filter((s) => !["done", "partial", "interrupted", "canceled", "rest"].includes(sessionStatus(s)))
    .map((s) => ({ s, d: sessionDate(s) }))
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.s.optional === b.s.optional ? 0 : a.s.optional ? 1 : -1));
  const today = cands.find((x) => x.d === t && !x.s.optional) || cands.find((x) => x.d === t);
  if (today) return today.s;
  const fut = cands.find((x) => x.d > t) || cands[0];
  return fut ? fut.s : null;
}
function doneSessionsCount() {
  return ALL_SESSIONS.filter((s) => ["done", "partial"].includes(sessionStatus(s))).length;
}

/* ---------- rendu principal ---------- */
function render() {
  const main = document.getElementById("main");
  let html = "";
  if (UI.view === "home") html = renderHome();
  else if (UI.view === "program") html = renderProgram();
  else if (UI.view === "session") html = renderSession(UI.param);
  else if (UI.view === "track") html = renderTrack();
  else if (UI.view === "coach") html = renderCoach();
  else if (UI.view === "settings") html = renderSettings();
  main.innerHTML = html;
  document.querySelectorAll(".tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === (UI.view === "session" ? "program" : UI.view));
  });
}

/* ============================ ACCUEIL ============================ */
function renderHome() {
  const t = todayISO();
  const wk = currentWeek();
  const next = nextPlannedSession();
  const nextDate = next ? sessionDate(next) : null;
  const rec = recoveryState();
  const tr = weightTrend();
  const tip = dailyCoachTip(next && nextDate === t ? next : null);
  const daysLeft = Math.max(0, daysBetween(t, RENTREE));
  const total = ALL_SESSIONS.filter((s) => !s.optional).length;
  const done = doneSessionsCount();
  const wkSessions = wk.sessions.filter((s) => !s.optional);
  const wkDone = wkSessions.filter((s) => ["done", "partial"].includes(sessionStatus(s))).length;
  const ci = S.checkins[t] || {};
  const watch = zoneWatchList(S);
  const toneColor = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)", info: "var(--info)" };

  let h = `<header class="hero">
    <div class="eyebrow">Coach Tanguy · objectif rentrée</div>
    <h1>${next && nextDate === t ? "Jour d'entraînement 💥" : "Salut Tanguy 👋"}</h1>
    <p class="sub">Semaine <strong>${wk.n}/${NB_WEEKS}</strong> · ${PHASE_LABEL[wk.phase]} · <strong class="num">J-${daysLeft}</strong> avant la rentrée.</p>
    <div style="margin-top:14px"><div class="row between xs muted" style="margin-bottom:5px"><span>Programme global</span><span class="num">${done}/${total} séances</span></div>
    <div class="pbar"><i style="width:${Math.round((done / total) * 100)}%"></i></div></div>
  </header>`;

  /* séance du jour / prochaine séance */
  if (next) {
    const isToday = nextDate === t;
    const st = sessionStatus(next);
    h += `<div class="sess today"><button class="sess-body" data-act="go-session" data-id="${next.id}">
      <span class="sess-ico" style="background:${next.color}22;color:${next.color}">${next.icon}</span>
      <span class="grow"><span class="xs" style="color:${next.color};font-weight:800;text-transform:uppercase;letter-spacing:.06em">${isToday ? "Séance du jour" : "Prochaine séance · " + frDate(nextDate)}</span>
        <h3>${next.title}</h3><span class="meta">${next.focus} · ${next.duration}</span></span>
      <span class="badge ${STATUS_BADGE[st][1]}">${STATUS_BADGE[st][0]}</span></button>
      <div style="padding:0 15px 14px" class="btnrow">
        <button class="btn primary" data-act="go-session" data-id="${next.id}">${S.logs[next.id] && S.logs[next.id].startedAt ? "Reprendre" : "Commencer"} →</button>
        <button class="btn" data-act="sess-menu" data-id="${next.id}">Déplacer / options</button>
      </div></div>`;
  } else {
    h += `<div class="card center"><h2>🎉 Programme terminé</h2><p class="sub">Toutes les séances sont passées. Exporte ton bilan et prépare le programme suivant !</p></div>`;
  }

  /* check-in du jour */
  h += `<div class="card"><h2>📋 Mon état aujourd'hui</h2>
    <div class="seg" style="margin-bottom:8px">${[["basse", "Fatigue basse", "g"], ["moyenne", "Fatigue moyenne", "o"], ["haute", "Fatigue haute", "r"]].map(([v, l, c]) =>
      `<button class="${ci.fatigue === v ? "on " + c : ""}" data-act="ci" data-k="fatigue" data-v="${v}">${l}</button>`).join("")}</div>
    <div class="seg" style="margin-bottom:8px">${[["bon", "Bien dormi", "g"], ["moyen", "Sommeil moyen", "o"], ["mauvais", "Mal dormi", "r"]].map(([v, l, c]) =>
      `<button class="${ci.sleep === v ? "on " + c : ""}" data-act="ci" data-k="sleep" data-v="${v}">${l}</button>`).join("")}</div>
    <div class="seg">${[["repos", "Repos", "g"], ["normale", "Boulot normal", "b"], ["physique", "Boulot physique", "o"]].map(([v, l, c]) =>
      `<button class="${ci.work === v ? "on " + c : ""}" data-act="ci" data-k="work" data-v="${v}">${l}</button>`).join("")}
      <button class="${ci.heat ? "on o" : ""}" data-act="ci" data-k="heat" data-v="1">🌡 Chaleur</button></div></div>`;

  /* tuiles */
  h += `<div class="tiles">
    <div class="tile"><span class="lbl">Récupération</span><span class="val" style="color:${rec.color}">${rec.label}</span><span class="delta muted num">${rec.score}/100</span></div>
    <div class="tile"><span class="lbl">Dernier poids</span><span class="val num">${tr.last ? firstNum(tr.last.kg).toLocaleString("fr-FR") + "<small> kg</small>" : "—"}</span>
      <span class="delta num" style="color:${tr.weeklyDelta > 0 ? "var(--ok)" : tr.weeklyDelta < 0 ? "var(--warn)" : "var(--muted)"}">${tr.weeklyDelta != null ? (tr.weeklyDelta >= 0 ? "+" : "") + tr.weeklyDelta + " kg/sem" : "à peser"}</span></div>
    <div class="tile"><span class="lbl">Cette semaine</span><span class="val num">${wkDone}<small>/${wkSessions.length}</small></span>
      <div style="margin-top:7px">${weekBars(wkDone, wkSessions.length, "#2fe1c0")}</div></div>
    <div class="tile"><span class="lbl">Prochain objectif</span><span class="val" style="font-size:.92rem;line-height:1.3">${next ? esc(nextGoalText(next)) : "Bilan final"}</span></div>
  </div>`;

  /* douleur à surveiller */
  const zones = Object.keys(watch);
  if (zones.length) {
    h += `<div class="card" style="border-color:rgba(251,191,36,.4)"><div class="row between">
      <span>⚠️ <strong>À surveiller :</strong> ${zones.map((z) => ZONE_LABEL[z] || z).join(", ")}</span>
      <button class="btn sm" data-act="go" data-view="track">Suivi</button></div></div>`;
  }

  /* conseil du coach */
  h += `<div class="coach-card"><div class="coach-line"><span class="ic" style="background:var(--coach-bg)">🤖</span>
    <div><strong style="color:${toneColor[tip.tone] || "var(--coach)"}">Conseil du coach</strong>
    <p class="sub" style="margin-top:4px">${tip.txt}</p></div></div>
    <div class="btnrow" style="margin-top:8px">
      <button class="btn sm" data-act="go" data-view="coach">Analyse complète</button>
      <button class="btn sm" data-act="weigh-sheet">⚖️ Me peser</button>
    </div></div>`;
  return h;
}
function nextGoalText(next) {
  const e0 = next.exos[0];
  const t = effectiveTarget(next, e0.slot);
  return `${t.name} ${t.sets}×${t.min}-${t.max}`;
}

/* ============================ PROGRAMME ============================ */
function renderProgram() {
  const cw = currentWeek();
  if (UI.week == null) UI.week = cw.n;
  const wk = PLAN.find((w) => w.n === UI.week) || cw;
  const total = ALL_SESSIONS.filter((s) => !s.optional).length;
  const done = doneSessionsCount();
  const missed = ALL_SESSIONS.filter((s) => sessionStatus(s) === "missed" && !s.optional);

  let h = `<div class="section-head"><h2>📅 Programme</h2><span class="xs muted num">${frDate(PLAN_START, { day: "numeric", month: "short" })} → ${frDate(RENTREE, { day: "numeric", month: "short" })} · ${Math.max(0, daysBetween(todayISO(), RENTREE))} j restants</span></div>
  <div class="card" style="padding:13px 15px"><div class="row between xs muted" style="margin-bottom:6px"><span>Progression globale</span><span class="num">${Math.round((done / total) * 100)} %</span></div>
  <div class="pbar"><i style="width:${Math.round((done / total) * 100)}%"></i></div></div>`;

  if (missed.length) {
    h += `<div class="card" style="border-color:rgba(251,191,36,.45)"><strong>⏰ ${missed.length} séance${missed.length > 1 ? "s" : ""} à rattraper.</strong>
      <p class="sub" style="margin:6px 0 10px">Pas un échec : le travail au bateau passe d'abord. Reporte-les, allège-les ou remplace-les par du repos.</p>
      <div class="btnrow">${missed.slice(0, 3).map((s) => `<button class="btn sm" data-act="sess-menu" data-id="${s.id}">${s.icon} S${s.week} ${s.title}</button>`).join("")}</div></div>`;
  }

  h += `<div class="row" style="overflow:auto;padding-bottom:6px;margin-bottom:8px">${PLAN.map((w) =>
    `<button class="chip" style="${w.n === wk.n ? "border-color:var(--hot);color:var(--text);background:rgba(255,106,61,.13)" : ""};flex:none" data-act="pick-week" data-w="${w.n}">S${w.n}${w.n === cw.n ? " · en cours" : ""}</button>`).join("")}</div>`;

  const wkDone = wk.sessions.filter((s) => !s.optional && ["done", "partial"].includes(sessionStatus(s))).length;
  h += `<div class="wk-head ${wk.n === cw.n ? "cur" : ""}"><span class="num-badge num">S${wk.n}</span>
    <span class="grow"><strong>${frDate(wk.start, { day: "numeric", month: "short" })} → ${frDate(wk.end, { day: "numeric", month: "short" })}</strong>
    <br><span class="xs muted">${PHASE_LABEL[wk.phase]} · ${wkDone}/${wk.sessions.filter((s) => !s.optional).length} séances faites</span></span>
    ${ringSVG(wkDone / 4, 44, "#2fe1c0")}</div>`;

  wk.sessions.forEach((s) => {
    const st = sessionStatus(s);
    const stats = S.logs[s.id] ? sessionStats(s) : null;
    h += `<div class="sess ${sessionDate(s) === todayISO() ? "today" : ""}">
      <button class="sess-body" data-act="go-session" data-id="${s.id}">
        <span class="sess-ico" style="background:${s.color}22;color:${s.color}">${s.icon}</span>
        <span class="grow"><h3>${s.title}${s.optional ? ' <span class="xs faint">(facultative)</span>' : ""}</h3>
          <span class="meta">📅 ${frDate(sessionDate(s))} · ${s.exos.length} exercices · ${s.duration}</span>
          ${stats && stats.okSets ? `<span class="meta num"> · ${stats.okSets}/${stats.plannedSets} séries ✓</span>` : ""}</span>
        <span class="badge ${STATUS_BADGE[st][1]}">${STATUS_BADGE[st][0]}</span></button>
      <div style="padding:0 15px 12px" class="btnrow">
        <button class="btn sm" data-act="go-session" data-id="${s.id}">${["done", "partial", "interrupted"].includes(st) ? "Consulter" : st === "doing" ? "Reprendre" : "Ouvrir"}</button>
        <button class="btn sm ghost" data-act="sess-menu" data-id="${s.id}">⋯ Options</button>
      </div></div>`;
  });

  h += `<div class="card"><h2>😴 Jours de repos</h2><p class="sub">Mercredi et vendredi sont tes jours de repos par défaut : ils font partie du programme — c'est là que le muscle se construit. Le dimanche est facultatif.</p></div>`;
  return h;
}

/* menu d'options d'une séance : déplacer / alléger / remplacer / repos */
function sheetSessMenu(id) {
  const s = sessionById(id);
  const st = sessionStatus(s);
  const sch = S.sched[id] || {};
  const light = !!sch.light;
  openSheet(`<div class="sheet-head"><h2>${s.icon} ${s.title} — options</h2><button class="sheet-x" data-act="close-sheet">✕</button></div>
    <p class="sub">Prévue le ${frDate(sessionDate(s))} · statut : ${STATUS_BADGE[st][0]}.</p>
    <label class="field" style="margin-top:12px">📆 Déplacer à une autre date
      <input type="date" value="${sessionDate(s)}" min="${PLAN_START}" data-in="move-date" data-id="${id}"></label>
    <div id="move-warn"></div>
    <div style="display:grid;gap:8px;margin-top:6px">
      <button class="btn" data-act="sess-move" data-id="${id}">Confirmer le report</button>
      <button class="btn ${light ? "cool" : ""}" data-act="sess-light" data-id="${id}">${light ? "✓ Séance allégée (annuler)" : "🪶 Alléger la séance (une série de moins partout)"}</button>
      <button class="btn" data-act="sess-rest" data-id="${id}">😴 Remplacer par du repos / récupération active</button>
      <button class="btn danger" data-act="sess-cancel" data-id="${id}">✕ Annuler cette séance</button>
      ${sch.date || sch.status ? `<button class="btn ghost" data-act="sess-restore" data-id="${id}">↩︎ Rétablir la séance d'origine</button>` : ""}
    </div>
    <p class="xs faint" style="margin-top:12px">Conseil coach : évite deux grosses séances deux jours de suite si la récupération est moyenne — je te préviens si le jour choisi est déjà chargé.</p>`);
  UI.sessMenu = { id, date: sessionDate(s) };
}

/* ============================ SUIVI ============================ */
function renderTrack() {
  const tr = weightTrend();
  const ws = weightSeries();
  const wf = UI.wform;
  const tracked = trackedExercises();
  if (!UI.chartEx || !tracked.includes(UI.chartEx)) UI.chartEx = tracked[0] || "";
  const watch = zoneWatchList(S);

  /* séries pour graphiques */
  const wPts = ws.filter((x) => firstNum(x.kg) != null).map((x) => ({ x: x.date, y: firstNum(x.kg) }));
  const avgPts = wPts.map((p) => ({ x: p.x, y: round1(weekAvgWeight(p.x, 7)) }));
  const waistPts = ws.filter((x) => firstNum(x.waist) != null).map((x) => ({ x: x.date, y: firstNum(x.waist) }));
  const painPts = (S.pains || []).map((p) => ({ x: p.date, y: p.intensity || 0 }));
  const fatiguePts = Object.entries(S.checkins).filter(([d, c]) => c.fatigue)
    .map(([d, c]) => ({ x: d, y: c.fatigue === "haute" ? 3 : c.fatigue === "moyenne" ? 2 : 1 })).sort((a, b) => (a.x < b.x ? -1 : 1));

  let h = `<div class="section-head"><h2>📈 Suivi</h2></div>
  <div class="tiles">
    <div class="tile"><span class="lbl">Poids actuel</span><span class="val num">${tr.last ? firstNum(tr.last.kg).toLocaleString("fr-FR") + "<small> kg</small>" : "—"}</span>
      <span class="delta muted">départ ${S.profile.startWeight} kg</span></div>
    <div class="tile"><span class="lbl">Évolution totale</span><span class="val num" style="color:${tr.totalDelta > 0 ? "var(--ok)" : "var(--muted)"}">${tr.totalDelta != null ? (tr.totalDelta >= 0 ? "+" : "") + tr.totalDelta + "<small> kg</small>" : "—"}</span></div>
    <div class="tile"><span class="lbl">Moyenne 7 jours</span><span class="val num">${tr.cur != null ? round1(tr.cur).toLocaleString("fr-FR") + "<small> kg</small>" : "—"}</span>
      <span class="delta num" style="color:${tr.weeklyDelta > 0.4 ? "var(--warn)" : "var(--muted)"}">${tr.weeklyDelta != null ? "vitesse " + (tr.weeklyDelta >= 0 ? "+" : "") + tr.weeklyDelta + " kg/sem" : ""}</span></div>
    <div class="tile"><span class="lbl">Tour de taille</span><span class="val num">${waistPts.length ? waistPts[waistPts.length - 1].y + "<small> cm</small>" : "—"}</span>
      <span class="delta num" style="color:${tr.waistDelta >= 2 ? "var(--warn)" : "var(--muted)"}">${tr.waistDelta != null ? (tr.waistDelta >= 0 ? "+" : "") + tr.waistDelta + " cm récemment" : ""}</span></div>
  </div>

  <div class="card"><h2>⚖️ Nouvelle pesée / mesures</h2>
    <p class="sub" style="margin-bottom:12px">Conditions comparables : le matin, après être allé aux toilettes, avant de manger. Une pesée isolée ne veut rien dire — c'est la moyenne qui compte.</p>
    <div class="tiles">
      <label class="field">Poids (kg) *<input type="text" inputmode="decimal" placeholder="66,4" value="${esc(wf.kg || "")}" data-in="wf" data-k="kg"></label>
      <label class="field">Date<input type="date" value="${wf.date || todayISO()}" data-in="wf" data-k="date"></label>
    </div>
    <details class="fold" ${wf.waist || wf.chest ? "open" : ""}><summary>Mensurations & détails (recommandé 1×/semaine)</summary><div class="fold-body">
      <div class="tiles">
        <label class="field">Tour de taille (cm)<input type="text" inputmode="decimal" placeholder="au nombril" value="${esc(wf.waist || "")}" data-in="wf" data-k="waist"></label>
        <label class="field">Tour de poitrine (cm)<input type="text" inputmode="decimal" value="${esc(wf.chest || "")}" data-in="wf" data-k="chest"></label>
        <label class="field">Tour de bras (cm)<input type="text" inputmode="decimal" placeholder="bras contracté" value="${esc(wf.arm || "")}" data-in="wf" data-k="arm"></label>
        <label class="field">Tour de cuisse (cm)<input type="text" inputmode="decimal" value="${esc(wf.thigh || "")}" data-in="wf" data-k="thigh"></label>
      </div>
      <label class="field">Conditions<select data-in="wf" data-k="cond">
        ${["Matin, après toilettes, à jeun", "Matin", "Journée", "Soir"].map((c) => `<option ${wf.cond === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label class="field">Ressenti physique / gonflement / appétit
        <input type="text" placeholder="ex : je me sens plus dense, appétit fort, un peu gonflé" value="${esc(wf.feel || "")}" data-in="wf" data-k="feel"></label>
    </div></details>
    <button class="btn cool" style="margin-top:12px" data-act="weigh-save">Enregistrer la pesée</button></div>`;

  if (wPts.length) {
    h += `<div class="card"><h2>Poids</h2>${svgLineChart({ series: [{ label: "Pesées", color: "#2fe1c0", pts: wPts }, { label: "Moyenne 7 j", color: "#5aa8ff", pts: avgPts, dash: true }], unit: "kg" })}</div>`;
  }
  if (waistPts.length) h += `<div class="card"><h2>Tour de taille</h2>${svgLineChart({ series: [{ label: "Taille", color: "#fbbf24", pts: waistPts }], unit: "cm" })}</div>`;

  if (tracked.length) {
    const pts = repsHistory(UI.chartEx);
    h += `<div class="card"><h2>Progression par exercice</h2>
      <label class="field"><select data-in="chart-ex">${tracked.map((n) => `<option ${UI.chartEx === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      ${svgLineChart({ series: [{ label: "Meilleure série", color: "#ff6a3d", pts }], unit: isTimeUnit(UI.chartEx) ? "s" : "rép." })}</div>`;
  }
  if (painPts.length || fatiguePts.length) {
    h += `<div class="card"><h2>Douleur & fatigue</h2>${svgLineChart({
      series: [
        { label: "Douleur (0-10)", color: "#ff5470", pts: painPts },
        { label: "Fatigue (1-3)", color: "#fbbf24", pts: fatiguePts, dash: true },
      ], yMin: 0, yMax: 10,
    })}</div>`;
  }

  /* corps — zones à surveiller */
  h += `<div class="card"><h2>🩹 Zones du corps</h2>
    <p class="sub" style="margin-bottom:8px">${Object.keys(watch).length ? "En jaune : zones signalées ces 7 derniers jours." : "Aucune zone douloureuse récente. 💚"}</p>
    <div class="bodymap">${bodySVG("front", [], Object.keys(watch))}${bodySVG("back", [], Object.keys(watch))}</div>
    <button class="btn danger sm" style="margin-top:12px" data-act="pain-sheet">Signaler une douleur (hors séance)</button></div>`;

  /* historiques */
  if (S.pains.length) {
    h += `<div class="card"><h2>Historique des douleurs</h2>${S.pains.slice(-8).reverse().map((p) =>
      `<div class="row between" style="border-top:1px solid var(--line);padding:9px 0">
        <span class="small"><strong style="color:${p.intensity >= 5 ? "var(--bad)" : "var(--warn)"}">${p.intensity}/10</strong>
        ${ZONE_LABEL[p.zone] || p.zone}${p.side ? " (" + p.side + ")" : ""} · ${(p.nature || "").toLowerCase()}<br>
        <span class="xs muted">${frDate(p.date)}${p.exName ? " · " + esc(p.exName) : ""}${p.note ? " · " + esc(p.note) : ""}</span></span>
        <button class="iconbtn" data-act="pain-del" data-pid="${p.id}">🗑</button></div>`).join("")}</div>`;
  }
  if (ws.length) {
    h += `<div class="card"><h2>Historique des pesées</h2>${ws.slice(-8).reverse().map((w, i) =>
      `<div class="row between" style="border-top:1px solid var(--line);padding:9px 0">
        <span class="small num"><strong>${esc(w.kg)} kg</strong>${w.waist ? " · taille " + esc(w.waist) + " cm" : ""}<br>
        <span class="xs muted">${frDate(w.date)}${w.cond ? " · " + esc(w.cond) : ""}${w.feel ? " · " + esc(w.feel) : ""}</span></span>
        <button class="iconbtn" data-act="weigh-del" data-wid="${esc(w.id)}">🗑</button></div>`).join("")}</div>`;
  }
  return h;
}

/* ============================ COACH ============================ */
function renderCoach() {
  const rec = recoveryState();
  const nut = nutritionAdvice();
  const reports = Object.values(S.reports).sort((a, b) => (a.at < b.at ? 1 : -1));
  const toneBg = { ok: "b-ok", warn: "b-warn", info: "b-info", bad: "b-bad" };

  let h = `<div class="section-head"><h2>🤖 Coach</h2></div>
  <div class="coach-card"><div class="coach-line"><span class="ic" style="background:var(--coach-bg)">⚡️</span>
    <div><strong>Récupération : <span style="color:${rec.color}">${rec.label} (${rec.score}/100)</span></strong>
    <p class="sub" style="margin-top:4px">${rec.advice}</p></div></div>
    ${rec.pains.length ? `<p class="xs" style="color:var(--warn);margin-top:6px">Douleurs récentes prises en compte : ${rec.pains.map((p) => ZONE_LABEL[p.zone] || p.zone).join(", ")}.</p>` : ""}
  </div>

  <div class="card"><h2>🍽 Conseils alimentaires du moment</h2>
    ${nut.status.map((s) => `<div class="coach-line" style="margin-top:8px"><span class="badge ${toneBg[s.tone]}" style="flex:none;height:fit-content">${s.tone === "ok" ? "OK" : s.tone === "warn" ? "Attention" : "Info"}</span><span class="small" style="line-height:1.5">${s.txt}</span></div>`).join("")}
    <hr class="sep"><ul class="list">${nut.tips.map((t) => `<li>${t}</li>`).join("")}</ul>
    <p class="xs faint" style="margin-top:10px">Basé sur tes pesées, ton tour de taille, tes performances et tes journées de travail — pas de gros gainer, pas d'excès : muscle propre.</p></div>`;

  /* adaptations actives */
  const adaptRows = [];
  Object.entries(S.adapt).forEach(([kind, m]) => Object.entries(m).forEach(([ex, a]) => {
    const parts = [];
    if (a.swap) parts.push(`remplacé par ${a.swap}`);
    if (a.dReps) parts.push(`${a.dReps > 0 ? "+" : ""}${a.dReps} répétitions`);
    if (a.dSets) parts.push(`${a.dSets > 0 ? "+" : ""}${a.dSets} série`);
    if (parts.length || a.note) adaptRows.push({ kind, ex, txt: parts.join(", ") || a.note, note: a.note });
  }));
  h += `<div class="card"><h2>🎛 Adaptations actives du programme</h2>
    ${adaptRows.length ? `<ul class="list">${adaptRows.map((r) => `<li><strong>${esc(r.ex)}</strong>&nbsp;(${r.kind}) : ${esc(r.txt)}${r.note && r.txt !== r.note ? ` <span class="xs muted">— ${esc(r.note)}</span>` : ""}</li>`).join("")}</ul>
      <button class="btn sm ghost" style="margin-top:10px;color:var(--warn)" data-act="reset-adapt">Réinitialiser toutes les adaptations</button>`
      : `<p class="sub">Aucune pour l'instant : elles apparaîtront automatiquement après tes premières séances validées, avec l'explication de chaque changement.</p>`}</div>`;

  /* comptes-rendus */
  h += `<div class="card"><h2>📑 Comptes-rendus de séance</h2>`;
  if (reports.length) {
    reports.slice(0, 10).forEach((r) => {
      const s = sessionById(r.sessionId);
      if (!s) return;
      h += `<button class="sess-body" style="border-top:1px solid var(--line);padding:11px 2px" data-act="show-report" data-id="${r.sessionId}">
        <span class="sess-ico" style="background:${s.color}22;color:${s.color};width:38px;height:38px">${s.icon}</span>
        <span class="grow"><h3 style="font-size:.9rem">${s.title} · S${s.week}</h3>
        <span class="meta num">${frDate(r.at.slice(0, 10))} · ${r.summary.okSets}/${r.summary.plannedSets} séries · ${r.summary.pains ? "🩹 " + r.summary.pains : "sans douleur"}</span></span>
        <span class="muted">→</span></button>`;
    });
  } else h += `<p class="sub">Valide ta première séance pour recevoir ton premier compte-rendu personnalisé.</p>`;
  h += `</div>
  <div class="card"><h2>📤 Bilan complet</h2>
    <p class="sub" style="margin-bottom:10px">Génère un bilan texte à copier dans ChatGPT (ou à montrer à un coach / kiné), ou exporte toutes les données.</p>
    <div class="btnrow">
      <button class="btn coachbtn" data-act="export-txt">Bilan texte</button>
      <button class="btn" data-act="export-json">Export JSON</button>
      <button class="btn" data-act="print">PDF / Imprimer</button>
    </div></div>`;
  return h;
}

/* ============================ RÉGLAGES ============================ */
function renderSettings() {
  const st = S.settings, pr = S.profile;
  const EQUIP = [["sac", "Sac à dos"], ["bouteilles", "Bouteilles d'eau"], ["chaise", "Chaise"], ["mur", "Mur"], ["table", "Table basse / muret"], ["marche", "Marche / support surélevé"]];
  let h = `<div class="section-head"><h2>⚙️ Réglages</h2></div>
  <div class="card"><h2>Profil</h2>
    <div class="tiles">
      <label class="field">Prénom<input type="text" value="${esc(pr.name)}" data-in="prof" data-k="name"></label>
      <label class="field">Taille (cm)<input type="text" inputmode="numeric" value="${esc(pr.height)}" data-in="prof" data-k="height"></label>
      <label class="field">Poids de départ (kg)<input type="text" inputmode="decimal" value="${esc(pr.startWeight)}" data-in="prof" data-k="startWeight"></label>
      <label class="field">Poids cible (kg)<input type="text" inputmode="decimal" value="${esc(pr.targetWeight)}" data-in="prof" data-k="targetWeight"></label>
    </div>
    <p class="xs muted">Programme du ${frDate(pr.startDate)} à la rentrée du ${frDate(pr.targetDate)} · objectif : plus musclé, ventre stable.</p></div>

  <div class="card"><h2>Entraînement</h2>
    <label class="field">Niveau de difficulté global<div class="seg">
      ${[["leger", "Plus léger", "g"], ["normal", "Normal", "b"], ["intense", "Plus intense", "o"]].map(([v, l, c]) =>
        `<button class="${st.difficulty === v ? "on " + c : ""}" data-act="set-diff" data-v="${v}">${l}</button>`).join("")}</div></label>
    <label class="field">Heure préférée<input type="time" value="${esc(st.hour)}" data-in="sett" data-k="hour"></label>
    <label class="field">Durée max d'une séance (min)<input type="text" inputmode="numeric" value="${esc(st.maxDuration)}" data-in="sett" data-k="maxDuration"></label>
    <label class="field">Fréquence de pesée<select data-in="sett" data-k="weighFreq">
      ${["Tous les jours", "2-3 fois par semaine", "1 fois par semaine"].map((c) => `<option ${st.weighFreq === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
    <label class="field">Seuil de douleur qui bloque un exercice (0-10)<input type="text" inputmode="numeric" value="${esc(st.painThreshold)}" data-in="sett" data-k="painThreshold"></label>
    <label class="field">Matériel disponible<div class="seg">${EQUIP.map(([v, l]) =>
      `<button class="${st.equipment.includes(v) ? "on g" : ""}" data-act="toggle-equip" data-v="${v}">${l}</button>`).join("")}</div></label>
  </div>

  <div class="card"><h2>Mes exercices</h2>
    <p class="sub" style="margin-bottom:8px">Marque tes préférences : le coach en tient compte pour les remplacements. Tu peux aussi remplacer un exercice directement depuis chaque séance (bouton « Remplacer »).</p>
    <details class="fold"><summary>❤️ Exercices préférés (${st.liked.length})</summary><div class="fold-body"><div class="btnrow">
      ${Object.keys(EXOS).map((n) => `<button class="btn sm ${st.liked.includes(n) ? "cool" : ""}" data-act="toggle-like" data-v="${esc(n)}">${esc(n)}</button>`).join("")}</div></div></details>
    <details class="fold"><summary>🚫 Exercices détestés (${st.disliked.length})</summary><div class="fold-body"><div class="btnrow">
      ${Object.keys(EXOS).map((n) => `<button class="btn sm ${st.disliked.includes(n) ? "danger" : ""}" data-act="toggle-dislike" data-v="${esc(n)}">${esc(n)}</button>`).join("")}</div></div></details>
  </div>

  <div class="card"><h2>Rappels</h2>
    <p class="sub">Le site ne peut pas envoyer de notifications sans installation. Astuce iPhone : partage → « Sur l'écran d'accueil » pour un accès en 1 touche, et mets une alarme quotidienne à ${esc(st.hour)} nommée « Séance ». Toutes tes données restent sur ton téléphone.</p></div>

  <div class="card"><h2>💾 Données</h2>
    <div class="btnrow" style="margin-bottom:8px">
      <button class="btn" data-act="export-json">Exporter (JSON)</button>
      <button class="btn" data-act="export-txt">Bilan texte</button>
    </div>
    <div class="btnrow">
      <button class="btn" data-act="import">Importer une sauvegarde</button>
      <button class="btn" data-act="print">PDF / Imprimer</button>
    </div>
    <p class="xs muted" style="margin:10px 0 8px">Sauvegarde automatique à chaque modification, dans ce navigateur. Exporte régulièrement le JSON par sécurité (et pour l'envoyer à ChatGPT).</p>
    <button class="btn danger" data-act="reset-all">🗑 Tout réinitialiser</button></div>
  <p class="center xs faint" style="margin:16px 0">Coach Tanguy · v${APP_VERSION} · fait pour l'été ${new Date(PLAN_START).getFullYear()} à Savines-le-Lac ⛵️</p>`;
  return h;
}

/* ============================ EXPORTS ============================ */
function download(filename, content, type) {
  const blob = new Blob([content], { type: type || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
}
function exportJSON() {
  const payload = { app: "coach-tanguy", version: APP_VERSION, exportedAt: new Date().toISOString(), state: S };
  download(`coach-tanguy-sauvegarde-${todayISO()}.json`, JSON.stringify(payload, null, 1), "application/json");
  toast("Sauvegarde JSON téléchargée ✅");
}
function buildBilanText() {
  const L = [];
  const tr = weightTrend();
  L.push("=== BILAN SPORTIF DE TANGUY — généré le " + frDate(todayISO(), { day: "numeric", month: "long", year: "numeric" }) + " ===");
  L.push("");
  L.push("(Ce bilan est produit par mon application de suivi. Analyse mes séances, ma progression, mes douleurs et mon poids, puis conseille-moi pour la suite : adaptation des exercices, alimentation, récupération.)");
  L.push("");
  L.push("PROFIL : homme, " + S.profile.height + " cm, poids de départ " + S.profile.startWeight + " kg, morphologie fine, reprise après longue pause, dos/paravertébraux à ménager. Travail parfois physique sur un bateau à Savines-le-Lac (chaleur, fatigue variable). Objectif : nettement plus musclé à la rentrée (" + frDate(RENTREE) + "), prise de muscle propre sans prise de ventre. Matériel : " + (S.settings.equipment.join(", ") || "aucun") + ".");
  L.push("");
  const done = doneSessionsCount(), total = ALL_SESSIONS.filter((s) => !s.optional).length;
  L.push("AVANCEMENT : semaine " + currentWeek().n + "/" + NB_WEEKS + " · " + done + "/" + total + " séances principales faites.");
  if (tr.last) L.push("POIDS : actuel " + tr.last.kg + " kg (moyenne 7 j : " + (tr.cur ? round1(tr.cur) : "?") + " kg, vitesse " + (tr.weeklyDelta != null ? tr.weeklyDelta + " kg/sem" : "inconnue") + ", évolution totale " + (tr.totalDelta != null ? tr.totalDelta + " kg" : "—") + (tr.waistDelta != null ? ", tour de taille " + (tr.waistDelta >= 0 ? "+" : "") + tr.waistDelta + " cm récemment" : "") + ").");
  L.push("");
  L.push("--- SÉANCES ---");
  ALL_SESSIONS.forEach((s) => {
    const log = S.logs[s.id];
    const stt = sessionStatus(s);
    if (!log && stt === "todo") return;
    L.push("");
    L.push(`[S${s.week}] ${s.title} — prévue ${s.plannedDate}${sessionDate(s) !== s.plannedDate ? ", déplacée au " + sessionDate(s) : ""} — statut : ${STATUS_BADGE[stt][0]}${S.sched[s.id] && S.sched[s.id].light ? " (allégée)" : ""}`);
    if (!log) return;
    if (log.pre && (log.pre.energy || log.pre.fatigue)) L.push(`  Avant : énergie ${log.pre.energy || "?"}, sommeil ${log.pre.sleep || "?"}, fatigue ${log.pre.fatigue || "?"}, journée ${log.pre.work || "?"}${log.pre.heat ? ", chaleur" : ""}. Durée : ${log.durationMin ? log.durationMin + " min" : "?"}`);
    s.exos.forEach((e) => {
      const t = effectiveTarget(s, e.slot);
      const r = exResult(s, e.slot);
      if (!r || (r.filled === 0 && !r.el.note && r.el.state === "todo")) return;
      const sets = r.el.sets.map((x, i) => `${x.v || "—"}${x.ok === true ? "✓" : x.ok === false ? "✗" : ""}`).join(" / ");
      const extra = (r.el.extra || []).map((x) => x.v).filter(Boolean).join(" / ");
      L.push(`  • ${t.name}${t.swapped ? " (remplace " + e.name + ")" : ""} — objectif ${t.sets}×${t.min}-${t.max} ${t.unit} — séries : ${sets}${extra ? " + bonus : " + extra : ""}${r.el.load ? " — charge : " + r.el.load : ""}${r.el.feel ? " — ressenti : " + feelLabel(r.el.feel) : ""}${r.el.clean === false ? " — technique dégradée" : ""}${r.el.rir ? " — en réserve : " + r.el.rir : ""}${r.el.note ? " — note : " + r.el.note : ""} [${EX_STATES[exStateAuto(s, e.slot)][0]}]`);
    });
    if (log.notes) L.push("  Notes : " + log.notes);
    const rep = S.reports[s.id];
    if (rep) L.push("  Coach : " + rep.adaptations.map((a) => a.action + " — " + a.detail).join(" | "));
  });
  if (S.pains.length) {
    L.push(""); L.push("--- DOULEURS ---");
    S.pains.forEach((p) => L.push(`  ${p.date} : ${ZONE_LABEL[p.zone] || p.zone}${p.side ? " (" + p.side + ")" : ""} — ${p.nature || "?"} — ${p.intensity}/10 — ${p.timing || "?"}${p.exName ? " — sur " + p.exName : ""}${p.serie ? " (" + p.serie + ")" : ""}${p.stopsAtRest ? " — disparaît à l'arrêt" : ""}${p.persistsRest ? " — persiste au repos" : ""}${p.increases ? " — augmente à chaque série" : ""}${p.radiating ? " — irradie dans un membre" : ""}${p.note ? " — " + p.note : ""}`));
  }
  if (S.weights.length) {
    L.push(""); L.push("--- PESÉES ---");
    weightSeries().forEach((w) => L.push(`  ${w.date} : ${w.kg} kg${w.waist ? ", taille " + w.waist + " cm" : ""}${w.chest ? ", poitrine " + w.chest : ""}${w.arm ? ", bras " + w.arm : ""}${w.thigh ? ", cuisse " + w.thigh : ""}${w.cond ? " (" + w.cond + ")" : ""}${w.feel ? " — " + w.feel : ""}`));
  }
  const adaptRows = [];
  Object.entries(S.adapt).forEach(([k, m]) => Object.entries(m).forEach(([ex, a]) => adaptRows.push(`  ${ex} (${k}) : ${a.swap ? "→ " + a.swap + " " : ""}${a.dReps ? (a.dReps > 0 ? "+" : "") + a.dReps + " rép " : ""}${a.dSets ? (a.dSets > 0 ? "+" : "") + a.dSets + " série " : ""}(${a.note || "ajustement"})`)));
  if (adaptRows.length) { L.push(""); L.push("--- ADAPTATIONS ACTIVES DU PROGRAMME ---"); adaptRows.forEach((r) => L.push(r)); }
  L.push("");
  L.push("=== FIN DU BILAN ===");
  return L.join("\n");
}
function sheetBilan() {
  const txt = buildBilanText();
  openSheet(`<div class="sheet-head"><h2>📤 Bilan à envoyer à ChatGPT</h2><button class="sheet-x" data-act="close-sheet">✕</button></div>
    <p class="sub">Copie ce texte dans ChatGPT (ou télécharge-le), il contient tout ton suivi.</p>
    <textarea id="bilan-txt" readonly style="min-height:44vh;margin-top:10px">${esc(txt)}</textarea>
    <div class="btnrow" style="margin-top:10px">
      <button class="btn cool" data-act="copy-bilan">Copier</button>
      <button class="btn" data-act="dl-bilan">Télécharger .txt</button>
    </div>`);
}

/* ============================ ACTIONS GLOBALES ============================ */
Object.assign(ACTIONS, {
  "go": (d) => go(d.view),
  "go-session": (d) => go("session", d.id),
  "close-sheet": () => closeSheet(),
  "pick-week": (d) => { UI.week = +d.w; render(); },
  "ci": (d) => {
    const t = todayISO();
    if (!S.checkins[t]) S.checkins[t] = {};
    const c = S.checkins[t];
    if (d.k === "heat") c.heat = !c.heat;
    else c[d.k] = c[d.k] === d.v ? "" : d.v;
    save(); render();
  },
  "sess-menu": (d) => sheetSessMenu(d.id),
  "sess-move": (d) => {
    const id = d.id;
    const date = (UI.sessMenu && UI.sessMenu.date) || sessionDate(sessionById(id));
    if (!S.sched[id]) S.sched[id] = {};
    S.sched[id].date = date;
    delete S.sched[id].status;
    const busy = ALL_SESSIONS.some((x) => x.id !== id && !x.optional && Math.abs(daysBetween(sessionDate(x), date)) === 0 && !["done", "partial", "canceled", "rest"].includes(sessionStatus(x)));
    const adjacent = ALL_SESSIONS.some((x) => x.id !== id && !x.optional && Math.abs(daysBetween(sessionDate(x), date)) === 1 && !["canceled", "rest"].includes(sessionStatus(x)));
    save(); closeSheet(); render();
    toast(busy ? "⚠️ Ce jour a déjà une séance — pense à en déplacer une" : adjacent ? "Reporté ✓ (séance la veille ou le lendemain : écoute ta récupération)" : "Séance reportée au " + frDate(date));
  },
  "sess-light": (d) => { if (!S.sched[d.id]) S.sched[d.id] = {}; S.sched[d.id].light = !S.sched[d.id].light; save(); closeSheet(); render(); toast(S.sched[d.id].light ? "Séance allégée : une série de moins par exercice 🪶" : "Séance normale rétablie"); },
  "sess-rest": (d) => { if (!S.sched[d.id]) S.sched[d.id] = {}; S.sched[d.id].status = "rest"; save(); closeSheet(); render(); toast("Repos noté — marche, étirements doux, hydratation 😴"); },
  "sess-cancel": (d) => { if (!S.sched[d.id]) S.sched[d.id] = {}; S.sched[d.id].status = "canceled"; save(); closeSheet(); render(); toast("Séance annulée"); },
  "sess-restore": (d) => { delete S.sched[d.id]; save(); closeSheet(); render(); toast("Séance d'origine rétablie"); },
  "weigh-sheet": () => go("track"),
  "weigh-save": () => {
    const wf = UI.wform;
    if (firstNum(wf.kg) == null) { toast("Indique au moins le poids 🙂"); return; }
    S.weights.push({
      id: "w" + Date.now(), date: wf.date || todayISO(), time: new Date().toTimeString().slice(0, 5),
      kg: String(wf.kg).trim(), waist: wf.waist || "", chest: wf.chest || "", arm: wf.arm || "", thigh: wf.thigh || "",
      cond: wf.cond || "Matin, après toilettes, à jeun", feel: wf.feel || "",
    });
    UI.wform = {};
    save(); render(); toast("Pesée enregistrée ⚖️");
  },
  "weigh-del": (d) => { S.weights = S.weights.filter((w) => w.id !== d.wid); save(); render(); },
  "pain-del": (d) => { S.pains = S.pains.filter((p) => p.id !== d.pid); save(); render(); },
  "set-diff": (d) => { S.settings.difficulty = d.v; save(); render(); toast("Difficulté : " + d.v); },
  "toggle-equip": (d) => {
    const eq = S.settings.equipment;
    const i = eq.indexOf(d.v);
    if (i >= 0) eq.splice(i, 1); else eq.push(d.v);
    save(); render();
  },
  "toggle-like": (d) => {
    const L = S.settings.liked, i = L.indexOf(d.v);
    if (i >= 0) L.splice(i, 1); else { L.push(d.v); const D = S.settings.disliked, j = D.indexOf(d.v); if (j >= 0) D.splice(j, 1); }
    save(); render();
  },
  "toggle-dislike": (d) => {
    const D = S.settings.disliked, i = D.indexOf(d.v);
    if (i >= 0) D.splice(i, 1); else { D.push(d.v); const L = S.settings.liked, j = L.indexOf(d.v); if (j >= 0) L.splice(j, 1); }
    save(); render();
  },
  "reset-adapt": () => { S.adapt = {}; save(); render(); toast("Adaptations réinitialisées"); },
  "export-json": () => exportJSON(),
  "export-txt": () => sheetBilan(),
  "copy-bilan": () => {
    const ta = document.getElementById("bilan-txt");
    ta.select(); ta.setSelectionRange(0, 999999);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { }
    if (!ok && navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => toast("Bilan copié 📋")).catch(() => toast("Sélectionne et copie manuellement"));
    else toast(ok ? "Bilan copié 📋" : "Sélectionne et copie manuellement");
  },
  "dl-bilan": () => { download(`bilan-tanguy-${todayISO()}.txt`, buildBilanText(), "text/plain;charset=utf-8"); toast("Bilan téléchargé"); },
  "print": () => window.print(),
  "import": () => document.getElementById("import-file").click(),
  "reset-all": () => {
    openSheet(`<div class="sheet-head"><h2>Tout réinitialiser ?</h2><button class="sheet-x" data-act="close-sheet">✕</button></div>
      <p class="sub">Toutes les séances, pesées et douleurs seront effacées. Pense à exporter le JSON avant !</p>
      <div class="btnrow" style="margin-top:14px">
        <button class="btn" data-act="export-json">D'abord exporter</button>
        <button class="btn danger" data-act="reset-confirm">Oui, tout effacer</button>
      </div>`);
  },
  "reset-confirm": () => { S = DEFAULT_STATE(); save(); closeSheet(); go("home"); toast("Application réinitialisée"); },
});

Object.assign(INPUTS, {
  "wf": (d, v) => { UI.wform[d.k] = v; },
  "chart-ex": (d, v) => { UI.chartEx = v; render(); },
  "move-date": (d, v) => { if (UI.sessMenu) UI.sessMenu.date = v; },
  "prof": (d, v) => { S.profile[d.k] = v; saveSoon(); },
  "sett": (d, v) => { S.settings[d.k] = v; saveSoon(); },
});

/* ============================ ÉVÉNEMENTS ============================ */
document.addEventListener("click", (e) => {
  const zone = e.target.closest && e.target.closest(".zone");
  if (zone && UI.pain && document.querySelector(".sheet-wrap")) {
    UI.pain.zone = zone.dataset.zone;
    UI.pain.view = zone.dataset.view;
    renderPainSheet();
    return;
  }
  const el = e.target.closest && e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (ACTIONS[act]) { e.preventDefault(); ACTIONS[act](el.dataset, el); }
});
document.addEventListener("input", (e) => {
  const el = e.target.closest && e.target.closest("[data-in]");
  if (!el) return;
  const fn = INPUTS[el.dataset.in];
  if (fn && el.tagName !== "SELECT") fn(el.dataset, el.value, el);
});
document.addEventListener("change", (e) => {
  const el = e.target.closest && e.target.closest("[data-in]");
  if (!el) return;
  const fn = INPUTS[el.dataset.in];
  if (fn) fn(el.dataset, el.value, el);
});
document.getElementById("tabbar").addEventListener("click", (e) => {
  const b = e.target.closest(".tab");
  if (b) go(b.dataset.tab);
});
document.getElementById("import-file").addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const st = data && data.app === "coach-tanguy" && data.state ? data.state : data;
      if (!st || typeof st !== "object" || (!st.logs && !st.weights && !st.profile)) throw new Error("format");
      localStorage.setItem(STORE_KEY, JSON.stringify(st));
      S = loadState();
      go("home");
      toast("Sauvegarde importée ✅");
    } catch (err) { toast("⚠️ Fichier illisible : est-ce bien un export de l'app ?"); }
  };
  reader.readAsText(f);
  e.target.value = "";
});
window.addEventListener("error", (e) => { console.error(e.error || e.message); });

/* démarrage */
render();
