/* ============================================================
   session.js — déroulé d'une séance : saisie série par série,
   fiches d'exercices, remplacements, douleurs (schéma du corps),
   récapitulatif, validation et compte-rendu du coach.
   ============================================================ */
"use strict";

/* registres d'actions (délégation d'événements, complétés par app.js) */
const ACTIONS = {};
const INPUTS = {};

/* ---------- log de séance : création / accès ---------- */
function blankSetRow() { return { v: "", ok: null }; }
function ensureLog(session) {
  if (!S.logs[session.id]) {
    S.logs[session.id] = {
      state: "todo", startedAt: null, validatedAt: null, durationMin: null, mode: null,
      pre: { energy: "", sleep: "", fatigue: "", work: "", heat: false },
      notes: "", ex: {},
    };
  }
  const log = S.logs[session.id];
  session.exos.forEach((e) => {
    if (!log.ex[e.slot]) log.ex[e.slot] = { state: "todo", sets: [], extra: [], load: "", feel: "", rir: "", clean: null, note: "" };
    const t = effectiveTarget(session, e.slot);
    const el = log.ex[e.slot];
    while (el.sets.length < t.sets) el.sets.push(blankSetRow());
  });
  return log;
}

const EX_STATES = {
  todo: ["Non commencé", "b-mut"], doing: ["En cours", "b-info"], done: ["Terminé", "b-ok"],
  partial: ["Partiel", "b-warn"], fail: ["Échoué", "b-bad"], impossible: ["Impossible", "b-bad"],
  replaced: ["Remplacé", "b-coach"], pain: ["Arrêt douleur", "b-bad"], fatigue: ["Arrêt fatigue", "b-warn"],
};
const SESS_STATES = {
  todo: ["À faire", "b-mut"], doing: ["En cours", "b-info"], done: ["Validée", "b-ok"],
  partial: ["Partielle", "b-warn"], interrupted: ["Interrompue", "b-bad"], moved: ["Reportée", "b-info"],
  canceled: ["Annulée", "b-mut"], rest: ["Repos choisi", "b-info"],
};

function exStateAuto(session, slot) {
  const r = exResult(session, slot);
  if (!r) return "todo";
  const el = r.el;
  if (["impossible", "replaced", "pain", "fatigue"].includes(el.state)) return el.state;
  if (r.filled === 0) return "todo";
  if (r.allOk) return "done";
  if (r.okSets > 0) return "partial";
  if (r.koSets > 0) return "fail";
  return "doing";
}

/* ---------- rendu de la vue séance ---------- */
function renderSession(id) {
  const s = sessionById(id);
  if (!s) return `<div class="empty">Séance introuvable.</div>`;
  const log = ensureLog(s);
  const date = (S.sched[s.id] && S.sched[s.id].date) || s.plannedDate;
  const rec = recoveryState();
  const started = !!log.startedAt;
  const readOnly = ["done", "partial", "interrupted"].includes(log.state) && !UI.editValidated;

  let h = `<div class="back-row">
    <button class="iconbtn" data-act="go" data-view="program">←</button>
    <h2>${s.icon} ${s.title}</h2>
    <span class="badge ${SESS_STATES[log.state][1]}">${SESS_STATES[log.state][0]}</span>
  </div>
  <div class="row wrap" style="margin-bottom:12px">
    <span class="chip">📅 ${frDate(date)}</span><span class="chip">⏱ ${s.duration}</span>
    <span class="chip">S${s.week} · ${PHASE_LABEL[s.phase]}</span>${s.optional ? '<span class="chip">Facultative</span>' : ""}
  </div>`;

  if (readOnly) {
    h += `<div class="card" style="border-color:rgba(52,211,153,.4)">
      <div class="row between"><strong>Séance déjà validée</strong>
      <button class="btn sm" data-act="edit-validated" data-id="${s.id}">Modifier quand même</button></div>
      <p class="sub" style="margin-top:6px">Le compte-rendu du coach est disponible ci-dessous.</p>
      <div class="btnrow" style="margin-top:10px">
        <button class="btn coachbtn" data-act="show-report" data-id="${s.id}">Voir le compte-rendu</button>
      </div></div>`;
  }

  if (!started && !readOnly) {
    h += `<div class="card">
      <h2>Avant de commencer</h2>
      <p class="sub" style="margin-bottom:12px">30 secondes de bilan : cela me permet d'adapter la séance d'aujourd'hui et les suivantes.</p>
      ${segField("Énergie", "pre-energy", s.id, log.pre.energy, [["haute", "Haute", "g"], ["normale", "Normale", "b"], ["basse", "Basse", "o"]])}
      ${segField("Sommeil", "pre-sleep", s.id, log.pre.sleep, [["bon", "Bon", "g"], ["moyen", "Moyen", "o"], ["mauvais", "Mauvais", "r"]])}
      ${segField("Fatigue", "pre-fatigue", s.id, log.pre.fatigue, [["basse", "Basse", "g"], ["moyenne", "Moyenne", "o"], ["haute", "Haute", "r"]])}
      ${segField("Journée de travail", "pre-work", s.id, log.pre.work, [["repos", "Repos", "g"], ["normale", "Normale", "b"], ["physique", "Physique", "o"]])}
      <div class="seg" style="margin-bottom:12px"><button class="${log.pre.heat ? "on o" : ""}" data-act="pre-heat" data-id="${s.id}">🌡 Grosse chaleur aujourd'hui</button></div>
      ${rec.label === "Basse" ? `<div class="coach-card" style="margin-bottom:12px"><strong style="color:var(--warn)">Coach :</strong> <span class="sub">${rec.advice} Tu peux aussi <button style="color:var(--info);text-decoration:underline" data-act="sess-menu" data-id="${s.id}">déplacer ou alléger la séance</button>.</span></div>` : ""}
      <button class="btn primary" data-act="start-session" data-id="${s.id}">🚀 Commencer la séance</button>
    </div>
    <div class="card"><h2>🔥 Échauffement (3-4 min)</h2><p class="sub">${s.warmup}</p></div>`;
  }

  if (started && !readOnly) {
    h += `<div class="card" style="padding:12px 16px"><div class="row between">
      <span class="small muted">🔥 Échauffement fait ? ${s.warmup.split(",")[0].toLowerCase()}…</span>
      <button class="btn sm ghost" data-act="open-warmup" data-id="${s.id}">Détails</button></div></div>`;
  }

  if (started || readOnly) {
    session_exoCards(s, log, readOnly).forEach((c) => (h += c));
    h += `<label class="field" style="margin-top:6px">Notes libres sur la séance
      <textarea data-in="sess-note" data-id="${s.id}" placeholder="Exemples : « plus difficile que la dernière fois », « douleur au poignet sur la fin », « trop facile »…" ${readOnly ? "disabled" : ""}>${esc(log.notes)}</textarea></label>`;
    if (!readOnly) {
      h += `<div class="btnrow" style="margin:14px 0 6px">
        <button class="btn danger" data-act="pain-sheet" data-id="${s.id}">🩹 Signaler une douleur</button>
      </div>
      <button class="btn primary" style="margin-top:8px" data-act="recap" data-id="${s.id}">✅ Terminer et analyser la séance</button>`;
    }
  }
  return h;
}

function segField(label, act, id, current, opts) {
  return `<label class="field">${label}<div class="seg">${opts.map(([v, l, c]) =>
    `<button class="${current === v ? "on " + c : ""}" data-act="${act}" data-id="${id}" data-v="${v}">${l}</button>`).join("")}</div></label>`;
}

function session_exoCards(s, log, readOnly) {
  return s.exos.map((e, i) => {
    const t = effectiveTarget(s, e.slot);
    const el = log.ex[e.slot];
    const st = exStateAuto(s, e.slot);
    const open = UI.openExo === e.slot;
    const info = exInfo(t.name) || {};
    const unitL = t.unit === "reps" ? "répétitions" : t.unit;
    const dis = readOnly ? "disabled" : "";
    let c = `<div class="exo st-${st}" id="exo-${e.slot}">
      <button class="exo-head" data-act="toggle-exo" data-slot="${e.slot}">
        <span class="exo-n">${i + 1}</span>
        <span class="grow"><h3>${esc(t.name)}</h3>
          ${t.swapped ? `<span class="xs" style="color:var(--coach)">remplace ${esc(e.name)}</span><br>` : ""}
          <span class="exo-target">${t.sets} × ${t.min}–${t.max} ${unitL}${t.adapted ? " · ajusté par le coach" : ""}</span></span>
        <span class="badge ${EX_STATES[st][1]}">${EX_STATES[st][0]}</span>
      </button>`;
    if (open) {
      c += `<div style="padding:0 14px 6px"><p class="sub">🎯 ${esc(info.goal || "")}</p>
        <div class="muscle-tags">${(info.muscles || []).map((m) => `<span class="chip">${m}</span>`).join("")}
        <span class="chip">⏸ repos ${info.rest || 60} s</span></div></div>
        <div class="exo-tools">
          <button class="btn sm" data-act="fiche" data-ex="${esc(t.name)}" data-id="${s.id}" data-slot="${e.slot}">📖 Fiche</button>
          <button class="btn sm" data-act="fiche" data-ex="${esc(t.name)}" data-id="${s.id}" data-slot="${e.slot}" data-help="1">🤔 Je ne comprends pas</button>
          ${!readOnly ? `<button class="btn sm" data-act="replace-sheet" data-id="${s.id}" data-slot="${e.slot}">🔄 Remplacer</button>` : ""}
        </div>
        <div class="sets-grid">`;
      el.sets.forEach((set, si) => {
        const cls = set.ok === true ? "ok" : set.ok === false ? "ko" : "";
        c += `<div class="set-box ${cls}"><span class="t">Série ${si + 1} · objectif ${t.min}–${t.max}</span>
          <input type="text" inputmode="text" value="${esc(set.v)}" placeholder="${t.unit === "reps" ? "ex : 12 ou « trop dur »" : "ex : 30 s"}"
            data-in="set-v" data-id="${s.id}" data-slot="${e.slot}" data-si="${si}" ${dis}>
          <div class="set-flags">
            <button class="v ${set.ok === true ? "on" : ""}" data-act="set-ok" data-id="${s.id}" data-slot="${e.slot}" data-si="${si}" ${dis}>✓ validée</button>
            <button class="x ${set.ok === false ? "on" : ""}" data-act="set-ko" data-id="${s.id}" data-slot="${e.slot}" data-si="${si}" ${dis}>✗ arrêtée</button>
          </div></div>`;
      });
      (el.extra || []).forEach((set, si) => {
        c += `<div class="set-box" style="border-color:rgba(157,140,255,.5)"><span class="t" style="color:var(--coach)">Série bonus ${si + 1}</span>
          <input type="text" value="${esc(set.v)}" placeholder="${t.unit === "reps" ? "répétitions" : "secondes"}"
            data-in="extra-v" data-id="${s.id}" data-slot="${e.slot}" data-si="${si}" ${dis}>
          ${!readOnly ? `<button class="btn sm ghost" data-act="extra-del" data-id="${s.id}" data-slot="${e.slot}" data-si="${si}">Retirer</button>` : ""}</div>`;
      });
      c += `</div>`;
      if (!readOnly) c += `<div class="exo-tools"><button class="btn sm" data-act="extra-add" data-id="${s.id}" data-slot="${e.slot}">＋ Ajouter une série</button>
        <button class="btn sm" data-act="ex-impossible" data-id="${s.id}" data-slot="${e.slot}">🚫 Impossible aujourd'hui</button></div>`;
      c += `<div class="feel-row">
        <label class="field">Charge utilisée (facultatif)
          <input type="text" value="${esc(el.load)}" placeholder="ex : sac 6 kg, 2 bouteilles 1,5 L" data-in="ex-load" data-id="${s.id}" data-slot="${e.slot}" ${dis}></label>
        <label class="field">« Combien j'aurais pu en faire de plus ? » (facultatif)
          <input type="text" value="${esc(el.rir)}" inputmode="numeric" placeholder="ex : 2 ou 3" data-in="ex-rir" data-id="${s.id}" data-slot="${e.slot}" ${dis}></label>
        <label class="field">Technique propre ?
          <div class="seg">
            <button class="${el.clean === true ? "on g" : ""}" data-act="ex-clean" data-id="${s.id}" data-slot="${e.slot}" data-v="1" ${dis}>Oui</button>
            <button class="${el.clean === false ? "on o" : ""}" data-act="ex-clean" data-id="${s.id}" data-slot="${e.slot}" data-v="0" ${dis}>Se dégradait</button>
          </div></label>
        <label class="field">Comment c'était ?
          <div class="seg">${FEELS.map(([v, l, col]) =>
            `<button class="${el.feel === v ? "on " + col : ""}" data-act="ex-feel" data-id="${s.id}" data-slot="${e.slot}" data-v="${v}" ${dis}>${l}</button>`).join("")}</div></label>`;
      if (el.feel) {
        const adv = immediateAdvice(el.feel, t.name, exResult(s, e.slot));
        if (adv) c += `<div class="coach-card" style="margin:4px 0 10px"><div class="coach-line"><span class="ic" style="background:var(--coach-bg)">🤖</span>
          <span class="small" style="line-height:1.5">${adv.txt}</span></div></div>`;
      }
      c += `<label class="field">Note libre sur l'exercice
        <input type="text" value="${esc(el.note)}" placeholder="ex : 12/10/8, douleur poignet, technique moyenne…" data-in="ex-note" data-id="${s.id}" data-slot="${e.slot}" ${dis}></label></div>`;
    }
    c += `</div>`;
    return c;
  });
}

/* ---------- fiche d'exercice (feuille) ---------- */
function sheetFiche(exName, sessionId, slot, helpMode) {
  const info = exInfo(exName);
  if (!info) return;
  const reps = sessionId ? pickReplacements(exName, sessionId) : (info.replacements || []).slice(0, 3);
  let h = `<div class="sheet-head"><h2>${esc(exName)}</h2><button class="sheet-x" data-act="close-sheet">✕</button></div>
    <div class="muscle-tags">${info.muscles.map((m) => `<span class="chip">💪 ${m}</span>`).join("")}</div>
    <p class="sub" style="margin-top:10px">🎯 ${info.goal}</p>
    ${exIllustration(info)}
    ${helpMode ? `<div class="coach-card"><strong style="color:var(--coach)">Pas de panique.</strong>
      <p class="sub" style="margin-top:6px">Relis les étapes ci-dessous une par une, fais 2–3 répétitions très lentes pour sentir le mouvement.
      Version plus simple : <strong>${esc(info.easier)}</strong>. Et si ça ne passe toujours pas, remplace-le — les options sont en bas de cette fiche.</p></div>` : ""}
    <div class="report-sec"><h4 style="color:var(--cool)">Comment faire</h4><ol class="list num">${info.steps.map((s) => `<li>${s}</li>`).join("")}</ol></div>
    <div class="report-sec"><h4 style="color:var(--info)">Positions clés</h4><ul class="list">
      <li><span><strong>Mains :</strong> ${info.hands}</span></li><li><span><strong>Pieds :</strong> ${info.feet}</span></li>
      <li><span><strong>Dos :</strong> ${info.back}</span></li><li><span><strong>Respiration :</strong> ${info.breath}</span></li>
      <li><span><strong>Vitesse :</strong> ${info.tempo}</span></li><li><span><strong>Repos conseillé :</strong> ${info.rest} s entre les séries</span></li></ul></div>
    <div class="report-sec"><h4 style="color:var(--bad)">Erreurs fréquentes</h4><ul class="list err">${info.errors.map((s) => `<li>${s}</li>`).join("")}</ul></div>
    <div class="report-sec"><h4 style="color:var(--warn)">Sécurité</h4><ul class="list saf">${info.safety.map((s) => `<li>${s}</li>`).join("")}</ul></div>
    <div class="report-sec"><h4 style="color:var(--ok)">Variantes</h4><ul class="list">
      <li><span><strong>Plus facile :</strong> ${info.easier}</span></li><li><span><strong>Plus difficile :</strong> ${info.harder}</span></li></ul></div>`;
  if (reps.length && sessionId && slot) {
    h += `<div class="report-sec"><h4 style="color:var(--coach)">Exercices de remplacement</h4><div class="btnrow" style="margin-top:6px">${reps.map((r) =>
      `<button class="btn sm" data-act="apply-swap" data-id="${sessionId}" data-slot="${slot}" data-ex="${esc(r)}">${esc(r)}</button>`).join("")}</div></div>`;
  } else if (reps.length) {
    h += `<div class="report-sec"><h4 style="color:var(--coach)">Exercices de remplacement</h4><p class="sub">${reps.map(esc).join(" · ")}</p></div>`;
  }
  openSheet(h);
}

/* ---------- remplacement d'exercice ---------- */
function sheetReplace(sessionId, slot) {
  const s = sessionById(sessionId);
  const t = effectiveTarget(s, slot);
  const base = s.exos.find((e) => e.slot === slot);
  const smart = pickReplacements(t.name, sessionId);
  let h = `<div class="sheet-head"><h2>Remplacer ${esc(t.name)}</h2><button class="sheet-x" data-act="close-sheet">✕</button></div>
    <p class="sub">Je te conseille ces remplacements (choisis selon ton matériel, tes douleurs récentes et tes préférences) :</p>
    <div style="display:grid;gap:8px;margin:12px 0">`;
  smart.forEach((r, i) => {
    const inf = exInfo(r);
    h += `<button class="btn" style="justify-content:flex-start;text-align:left" data-act="apply-swap" data-id="${sessionId}" data-slot="${slot}" data-ex="${esc(r)}">
      <span>${i === 0 ? "⭐" : "🔄"}</span><span><strong>${esc(r)}</strong><br><span class="xs muted">${inf ? inf.muscles.slice(0, 3).join(" · ") : ""}</span></span></button>`;
  });
  h += `</div><details class="fold"><summary>Choisir dans toute la bibliothèque</summary><div class="fold-body">`;
  EX_CATS.forEach((cat) => {
    const names = exByCat(cat).filter((n) => n !== t.name);
    if (!names.length) return;
    h += `<div class="xs faint" style="margin:10px 0 6px;text-transform:uppercase;letter-spacing:.06em">${cat}</div>
      <div class="btnrow">${names.map((n) => `<button class="btn sm" data-act="apply-swap" data-id="${sessionId}" data-slot="${slot}" data-ex="${esc(n)}">${esc(n)}</button>`).join("")}</div>`;
  });
  h += `</div></details>`;
  if (t.swapped) h += `<button class="btn ghost" style="margin-top:12px;color:var(--coach)" data-act="reset-swap" data-id="${sessionId}" data-slot="${slot}">↩︎ Revenir à ${esc(base.name)}</button>`;
  openSheet(h);
}

/* ---------- douleur : schéma du corps ---------- */
function sheetPain(sessionId, presetEx) {
  UI.pain = { view: "front", zone: null, side: "", nature: "", timing: "", intensity: null, exName: presetEx || "", serie: "", stopsAtRest: null, persistsRest: null, increases: null, radiating: false, note: "", sessionId: sessionId || null };
  renderPainSheet();
}
function renderPainSheet() {
  const p = UI.pain;
  const s = p.sessionId ? sessionById(p.sessionId) : null;
  const exOptions = s ? s.exos.map((e) => effectiveTarget(s, e.slot).name) : Object.keys(EXOS);
  const scaleColor = (n) => (n <= 2 ? "#34d399" : n <= 4 ? "#fbbf24" : n <= 6 ? "#ff9a3d" : "#ff5470");
  const legend = p.intensity == null ? "Touche un chiffre : 0 aucune · 3-4 modérée · 7+ forte" :
    p.intensity <= 2 ? "Gêne très légère" : p.intensity <= 4 ? "Douleur modérée" : p.intensity <= 6 ? "Douleur importante" : p.intensity <= 8 ? "Douleur forte" : "Très forte / mouvement impossible";
  let h = `<div class="sheet-head"><h2>🩹 Signaler une douleur</h2><button class="sheet-x" data-act="close-sheet">✕</button></div>
    <p class="sub">Touche la zone concernée sur le schéma (vue de face et vue de dos).</p>
    <div class="bodymap" style="margin:12px 0">${bodySVG("front", p.view === "front" && p.zone ? [p.zone] : p.zone ? [p.zone] : [])}${bodySVG("back", p.zone ? [p.zone] : [])}</div>
    <div class="center" style="margin-bottom:12px">${p.zone ? `<span class="badge b-bad">Zone : ${ZONE_LABEL[p.zone] || p.zone}</span>` : `<span class="badge b-mut">Aucune zone sélectionnée</span>`}</div>
    <label class="field">Côté<div class="seg">
      ${[["gauche", "Gauche"], ["droite", "Droite"], ["deux", "Les deux"], ["centre", "Centre"]].map(([v, l]) =>
        `<button class="${p.side === v ? "on" : ""}" data-act="pain-side" data-v="${v}">${l}</button>`).join("")}</div></label>
    <label class="field">Nature de la douleur<div class="seg">
      ${PAIN_NATURES.map((n) => `<button class="${p.nature === n ? "on r" : ""}" data-act="pain-nature" data-v="${esc(n)}">${n}</button>`).join("")}</div></label>
    <label class="field">Moment d'apparition<div class="seg">
      ${PAIN_TIMINGS.map((n) => `<button class="${p.timing === n ? "on o" : ""}" data-act="pain-timing" data-v="${esc(n)}">${n}</button>`).join("")}</div></label>
    <label class="field">Intensité (0 → 10) — <span style="color:${p.intensity != null ? scaleColor(p.intensity) : "var(--faint)"}">${legend}</span>
      <div class="pain-scale">${Array.from({ length: 11 }, (_, i) =>
        `<button class="${p.intensity === i ? "on" : ""}" style="${p.intensity === i ? "background:" + scaleColor(i) : ""}" data-act="pain-int" data-v="${i}">${i}</button>`).join("")}</div></label>
    <label class="field">Exercice concerné
      <select data-in="pain-ex"><option value="">— Aucun / hors séance —</option>
      ${exOptions.map((n) => `<option ${p.exName === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="field">Série / répétition / charge (facultatif)
      <input type="text" value="${esc(p.serie)}" placeholder="ex : 2e série, 8e répétition, sac 6 kg" data-in="pain-serie"></label>
    <label class="field">Évolution<div class="seg">
      <button class="${p.stopsAtRest === true ? "on g" : ""}" data-act="pain-flag" data-f="stopsAtRest">Disparaît à l'arrêt</button>
      <button class="${p.persistsRest === true ? "on r" : ""}" data-act="pain-flag" data-f="persistsRest">Persiste au repos</button>
      <button class="${p.increases === true ? "on o" : ""}" data-act="pain-flag" data-f="increases">Augmente à chaque série</button>
      <button class="${p.radiating === true ? "on r" : ""}" data-act="pain-flag" data-f="radiating">Descend dans un bras / une jambe</button></div></label>
    <label class="field">Précisions (facultatif)
      <input type="text" value="${esc(p.note)}" placeholder="ex : comme un pincement en bas de la descente" data-in="pain-note"></label>
    <button class="btn danger" data-act="pain-save" ${p.zone && p.intensity != null ? "" : "disabled"}>Enregistrer la douleur</button>
    <p class="xs faint center" style="margin-top:10px">Ce suivi ne remplace pas un avis médical.</p>`;
  openSheet(h, true);
}
function savePain() {
  const p = UI.pain;
  const entry = {
    id: "p" + Date.now(), date: todayISO(), time: new Date().toTimeString().slice(0, 5),
    zone: p.zone, side: p.side, nature: p.nature, timing: p.timing, intensity: p.intensity,
    exName: p.exName, serie: p.serie, stopsAtRest: p.stopsAtRest, persistsRest: p.persistsRest,
    increases: p.increases, radiating: p.radiating, note: p.note, sessionId: p.sessionId,
  };
  S.pains.push(entry);
  save();
  const tri = painTriage(entry);
  closeSheet();
  const tone = tri.level === "rouge" ? "var(--bad)" : tri.level === "orange" ? "var(--warn)" : "var(--ok)";
  openSheet(`<div class="sheet-head"><h2>${tri.level === "rouge" ? "⚠️ Attention" : tri.level === "orange" ? "🟠 On adapte" : "✅ Rien d'inquiétant"}</h2>
    <button class="sheet-x" data-act="close-sheet">✕</button></div>
    <div class="card" style="border-color:${tone}"><p class="sub" style="color:var(--text)">${tri.advice}</p></div>
    ${entry.exName && tri.level !== "vert" && entry.sessionId ? `<p class="sub" style="margin:10px 0">Veux-tu remplacer <strong>${esc(entry.exName)}</strong> tout de suite ?</p>
      <div class="btnrow">${pickReplacements(entry.exName, entry.sessionId).map((r) => {
        const s2 = sessionById(entry.sessionId);
        const slot = s2 ? s2.exos.find((e) => effectiveTarget(s2, e.slot).name === entry.exName) : null;
        return slot ? `<button class="btn sm" data-act="apply-swap" data-id="${entry.sessionId}" data-slot="${slot.slot}" data-ex="${esc(r)}">${esc(r)}</button>` : "";
      }).join("")}</div>` : ""}
    <button class="btn" style="margin-top:14px" data-act="close-sheet">Continuer</button>`);
  render();
}

/* ---------- récapitulatif avant validation ---------- */
function sheetRecap(sessionId) {
  const s = sessionById(sessionId);
  const st = sessionStats(s);
  const log = st.log;
  const prev = prevSessionLog(s);
  let progress = "";
  if (prev) {
    const ps = sessionStats(prev.s);
    if (ps && ps.totalReps && st.totalReps) {
      const d = st.totalReps - ps.totalReps;
      progress = `<div class="tile"><span class="lbl">Vs dernière fois</span><span class="val num" style="color:${d >= 0 ? "var(--ok)" : "var(--warn)"}">${d >= 0 ? "+" : ""}${d}</span><span class="xs muted">répétitions au total</span></div>`;
    }
  }
  const durMin = log.startedAt ? Math.max(1, Math.round((Date.now() - new Date(log.startedAt).getTime()) / 60000)) : null;
  const rowsHtml = st.rows.map((r, i) => {
    const stt = exStateAuto(s, s.exos[i].slot);
    return `<li><span class="badge ${EX_STATES[stt][1]}" style="min-width:86px;text-align:center">${EX_STATES[stt][0]}</span>
      <span class="grow" style="margin-left:4px">${esc(r.target.name)}</span>
      <span class="num xs muted">${r.okSets}/${r.plannedSets}${r.extraSets ? " +" + r.extraSets : ""}</span></li>`;
  }).join("");
  openSheet(`<div class="sheet-head"><h2>Récapitulatif</h2><button class="sheet-x" data-act="close-sheet">✕</button></div>
    <div class="tiles" style="margin-bottom:10px">
      <div class="tile"><span class="lbl">Séries validées</span><span class="val num">${st.okSets}<small>/${st.plannedSets}</small></span></div>
      <div class="tile"><span class="lbl">Volume total</span><span class="val num">${st.totalReps}</span><span class="xs muted">répétitions / secondes</span></div>
      <div class="tile"><span class="lbl">Séries bonus</span><span class="val num">${st.extraSets}</span></div>
      <div class="tile"><span class="lbl">Douleurs</span><span class="val num" style="color:${st.pains.length ? "var(--bad)" : "var(--ok)"}">${st.pains.length}</span></div>
      ${durMin ? `<div class="tile"><span class="lbl">Durée</span><span class="val num">${durMin}<small> min</small></span></div>` : ""}
      ${progress}</div>
    <ul class="list" style="margin-bottom:14px">${rowsHtml}</ul>
    <div style="display:grid;gap:8px">
      <button class="btn primary" data-act="validate" data-id="${sessionId}" data-mode="done">✅ Valider définitivement</button>
      <button class="btn" data-act="validate" data-id="${sessionId}" data-mode="partial">🌓 Enregistrer comme séance partielle</button>
      <button class="btn" data-act="validate" data-id="${sessionId}" data-mode="interrupted">⏸ Séance interrompue (douleur / fatigue / temps)</button>
      <button class="btn ghost" data-act="close-sheet">↩︎ Revenir modifier un résultat</button>
    </div>`);
}

function doValidate(sessionId, mode) {
  const s = sessionById(sessionId);
  const log = S.logs[sessionId];
  log.state = mode;
  log.mode = mode;
  log.validatedAt = new Date().toISOString();
  if (log.startedAt) log.durationMin = Math.max(1, Math.round((Date.now() - new Date(log.startedAt).getTime()) / 60000));
  // états auto des exercices
  s.exos.forEach((e) => {
    const el = log.ex[e.slot];
    if (!["impossible", "replaced", "pain", "fatigue"].includes(el.state)) el.state = exStateAuto(s, e.slot);
  });
  const report = analyzeSession(s);
  S.reports[sessionId] = report;
  applyAdaptations(report);
  save();
  closeSheet();
  UI.editValidated = false;
  render();
  sheetReport(sessionId);
  toast(mode === "done" ? "Séance validée 💪" : mode === "partial" ? "Séance partielle enregistrée" : "Séance interrompue enregistrée");
}

/* ---------- compte-rendu du coach ---------- */
function sheetReport(sessionId) {
  const s = sessionById(sessionId);
  const r = S.reports[sessionId];
  if (!r) return;
  const next = nextPlannedSession();
  const sm = r.summary;
  let h = `<div class="sheet-head"><h2>🤖 Compte-rendu du coach</h2><button class="sheet-x" data-act="close-sheet">✕</button></div>
    <p class="sub">${s.icon} ${s.title} — ${frDate((r.at || "").slice(0, 10))}</p>
    <div class="tiles" style="margin:12px 0">
      <div class="tile"><span class="lbl">Durée</span><span class="val num">${sm.duration}</span></div>
      <div class="tile"><span class="lbl">Exercices</span><span class="val num">${sm.doneEx}<small>/${sm.totalEx}</small></span></div>
      <div class="tile"><span class="lbl">Séries validées</span><span class="val num">${sm.okSets}<small>/${sm.plannedSets}</small></span></div>
      <div class="tile"><span class="lbl">Volume</span><span class="val num">${sm.totalReps}</span></div></div>
    <p class="xs muted">Charges : ${esc(sm.load)}${sm.progress ? " · " + sm.progress : ""}</p>
    <div class="report-sec"><h4 style="color:var(--ok)">✅ Points positifs</h4><ul class="list">${r.positives.map((p) => `<li>${p}</li>`).join("")}</ul></div>
    ${r.improvements.length ? `<div class="report-sec"><h4 style="color:var(--warn)">🔧 À améliorer</h4><ul class="list err">${r.improvements.map((p) => `<li>${p}</li>`).join("")}</ul></div>` : ""}
    <div class="report-sec"><h4 style="color:var(--coach)">🎛 Adaptation du programme</h4><ul class="list">${r.adaptations.map((a) =>
      `<li><span class="badge ${a.action === "augmenter" ? "b-ok" : a.action === "réduire" || a.action === "remplacer" || a.action === "retirer" ? "b-warn" : "b-info"}" style="margin-right:4px">${a.action}</span> ${a.detail}</li>`).join("") || "<li>Programme conservé tel quel.</li>"}</ul>
      <p class="xs muted" style="margin-top:8px">Ces réglages sont déjà appliqués sur tes prochaines séances « ${s.title} ».</p></div>
    ${r.restAdvice ? `<div class="report-sec"><h4 style="color:var(--info)">😴 Récupération</h4><p class="sub">${r.restAdvice}</p></div>` : ""}
    <div class="report-sec"><h4 style="color:${r.medical.redFlag ? "var(--bad)" : "var(--info)"}">🩺 Mini compte-rendu physique</h4>
      <ul class="list ${r.medical.redFlag ? "err" : ""}">
        <li>${r.medical.etat}</li><li>${r.medical.perf}</li><li>Douleurs : ${r.medical.douleurs}</li><li>${r.medical.reco}</li></ul>
      <p class="xs faint" style="margin-top:8px">À montrer tel quel à un coach, kiné ou médecin si besoin. Ceci n'est pas un diagnostic.</p></div>
    ${next ? `<div class="coach-card"><strong>Prochaine séance :</strong> ${next.icon} ${next.title} — ${frDate((S.sched[next.id] && S.sched[next.id].date) || next.plannedDate)}
      <div class="xs muted" style="margin-top:4px">${next.focus}</div>
      <button class="btn sm coachbtn" style="margin-top:10px" data-act="open-session" data-id="${next.id}">Voir la séance adaptée</button></div>` : ""}
    <button class="btn" data-act="close-sheet" style="margin-top:6px">Fermer</button>`;
  openSheet(h);
}

/* ---------- actions & saisies de la séance ---------- */
Object.assign(ACTIONS, {
  "toggle-exo": (d) => { UI.openExo = UI.openExo === d.slot ? null : d.slot; render(); },
  "start-session": (d) => {
    const s = sessionById(d.id); const log = ensureLog(s);
    log.startedAt = new Date().toISOString(); log.state = "doing";
    UI.openExo = "e0"; save(); render(); toast("C'est parti ! 🔥");
  },
  "edit-validated": (d) => { UI.editValidated = true; const log = S.logs[d.id]; if (log) log.state = "doing"; save(); render(); },
  "open-warmup": (d) => { const s = sessionById(d.id); openSheet(`<div class="sheet-head"><h2>🔥 Échauffement</h2><button class="sheet-x" data-act="close-sheet">✕</button></div><p class="sub" style="line-height:1.7">${s.warmup}</p><button class="btn" style="margin-top:14px" data-act="close-sheet">C'est fait</button>`); },
  "pre-energy": (d) => { ensureLog(sessionById(d.id)).pre.energy = d.v; save(); render(); },
  "pre-sleep": (d) => { ensureLog(sessionById(d.id)).pre.sleep = d.v; save(); render(); },
  "pre-fatigue": (d) => { ensureLog(sessionById(d.id)).pre.fatigue = d.v; save(); render(); },
  "pre-work": (d) => { ensureLog(sessionById(d.id)).pre.work = d.v; save(); render(); },
  "pre-heat": (d) => { const p = ensureLog(sessionById(d.id)).pre; p.heat = !p.heat; save(); render(); },
  "set-ok": (d) => { const el = S.logs[d.id].ex[d.slot]; const set = el.sets[+d.si]; set.ok = set.ok === true ? null : true; if (el.state === "todo") el.state = "doing"; save(); render(); },
  "set-ko": (d) => { const el = S.logs[d.id].ex[d.slot]; const set = el.sets[+d.si]; set.ok = set.ok === false ? null : false; save(); render(); },
  "extra-add": (d) => { const el = S.logs[d.id].ex[d.slot]; el.extra = el.extra || []; el.extra.push({ v: "" }); save(); render(); },
  "extra-del": (d) => { S.logs[d.id].ex[d.slot].extra.splice(+d.si, 1); save(); render(); },
  "ex-clean": (d) => { const el = S.logs[d.id].ex[d.slot]; const v = d.v === "1"; el.clean = el.clean === v ? null : v; save(); render(); },
  "ex-feel": (d) => { const el = S.logs[d.id].ex[d.slot]; el.feel = el.feel === d.v ? "" : d.v; if (d.v === "impossible") el.state = "impossible"; if (d.v === "fatigue") el.state = "fatigue"; save(); render(); },
  "ex-impossible": (d) => { const el = S.logs[d.id].ex[d.slot]; el.state = el.state === "impossible" ? "doing" : "impossible"; save(); render(); if (el.state === "impossible") sheetReplace(d.id, d.slot); },
  "fiche": (d) => sheetFiche(d.ex, d.id, d.slot, !!d.help),
  "replace-sheet": (d) => sheetReplace(d.id, d.slot),
  "apply-swap": (d) => {
    if (!S.subs[d.id]) S.subs[d.id] = {};
    S.subs[d.id][d.slot] = d.ex;
    const s = sessionById(d.id); const log = ensureLog(s);
    const el = log.ex[d.slot];
    el.state = "doing"; el.feel = ""; el.sets.forEach((x) => { x.v = ""; x.ok = null; });
    const t = effectiveTarget(s, d.slot);
    while (el.sets.length < t.sets) el.sets.push(blankSetRow());
    save(); closeSheet(); render(); toast(`Exercice remplacé par « ${d.ex} »`);
  },
  "reset-swap": (d) => { if (S.subs[d.id]) delete S.subs[d.id][d.slot]; save(); closeSheet(); render(); toast("Exercice d'origine rétabli"); },
  "pain-sheet": (d) => sheetPain(d.id, d.ex || ""),
  "pain-side": (d) => { UI.pain.side = d.v; renderPainSheet(); },
  "pain-nature": (d) => { UI.pain.nature = d.v; renderPainSheet(); },
  "pain-timing": (d) => { UI.pain.timing = d.v; renderPainSheet(); },
  "pain-int": (d) => { UI.pain.intensity = +d.v; renderPainSheet(); },
  "pain-flag": (d) => { UI.pain[d.f] = UI.pain[d.f] === true ? null : true; renderPainSheet(); },
  "pain-save": () => savePain(),
  "recap": (d) => sheetRecap(d.id),
  "validate": (d) => doValidate(d.id, d.mode),
  "show-report": (d) => sheetReport(d.id),
  "open-session": (d) => { closeSheet(); go("session", d.id); },
});

Object.assign(INPUTS, {
  "set-v": (d, v) => { S.logs[d.id].ex[d.slot].sets[+d.si].v = v; saveSoon(); },
  "extra-v": (d, v) => { S.logs[d.id].ex[d.slot].extra[+d.si].v = v; saveSoon(); },
  "ex-load": (d, v) => { S.logs[d.id].ex[d.slot].load = v; saveSoon(); },
  "ex-rir": (d, v) => { S.logs[d.id].ex[d.slot].rir = v; saveSoon(); },
  "ex-note": (d, v) => { S.logs[d.id].ex[d.slot].note = v; saveSoon(); },
  "sess-note": (d, v) => { S.logs[d.id].notes = v; saveSoon(); },
  "pain-ex": (d, v) => { UI.pain.exName = v; },
  "pain-serie": (d, v) => { UI.pain.serie = v; },
  "pain-note": (d, v) => { UI.pain.note = v; },
});
