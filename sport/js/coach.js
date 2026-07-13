/* ============================================================
   coach.js — le moteur du coach : analyse des séances,
   adaptation automatique, récupération, douleurs, nutrition.
   Fonctionne entièrement hors-ligne, à partir des données réelles.
   ============================================================ */
"use strict";

/* ---------- petits utilitaires ---------- */
const firstNum = (v) => {
  const m = String(v == null ? "" : v).replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const round1 = (n) => Math.round(n * 10) / 10;

const FEELS = [
  ["tres-facile", "Très facile", "g"], ["facile", "Facile", "g"], ["correct", "Correct", "b"],
  ["difficile", "Difficile", "o"], ["tres-difficile", "Très difficile", "o"], ["impossible", "Impossible", "r"],
  ["douleur", "Douleur", "r"], ["fatigue", "Fatigue anormale", "o"], ["essoufflement", "Essoufflé", "o"],
  ["incompris", "Mal compris", "b"],
];
const feelLabel = (id) => (FEELS.find((f) => f[0] === id) || [null, ""])[1];

const PAIN_NATURES = [
  "Étirement", "Tiraillement", "Pincement", "Brûlure musculaire", "Chaleur", "Douleur vive",
  "Douleur sourde", "Douleur articulaire", "Crampe", "Engourdissement", "Fourmillements",
  "Perte de force", "Blocage", "Gêne respiratoire", "Mouvement impossible", "Fatigue musculaire",
];
const PAIN_TIMINGS = [
  "Avant l'exercice", "Position de départ", "Pendant la descente", "Pendant la montée",
  "Après quelques répétitions", "Fin de série", "Juste après l'exercice", "Quelques heures après", "Le lendemain",
];
/* natures inquiétantes → drapeau rouge si combinées à zone sensible ou intensité forte */
const PAIN_SERIOUS = ["Douleur vive", "Douleur articulaire", "Engourdissement", "Fourmillements", "Perte de force", "Blocage", "Gêne respiratoire", "Mouvement impossible"];
const SPINE_ZONES = ["cou", "hautdos", "milieudos", "basdos"];

function painRedFlag(p) {
  const i = p.intensity || 0;
  if (i >= 7) return true;
  if (["Engourdissement", "Fourmillements", "Perte de force", "Gêne respiratoire"].includes(p.nature)) return true;
  if (SPINE_ZONES.includes(p.zone) && i >= 5) return true;
  if (p.radiating) return true;
  return false;
}
function painTriage(p) {
  if (painRedFlag(p))
    return { level: "rouge", advice: "Arrête l'exercice concerné. Douleur importante, perte de force, engourdissement ou douleur dans la colonne / qui descend dans un membre : ne force pas et consulte un professionnel de santé (médecin ou kiné) si cela persiste." };
  if ((p.intensity || 0) >= 4 || PAIN_SERIOUS.includes(p.nature))
    return { level: "orange", advice: "Stoppe l'exercice qui déclenche la douleur aujourd'hui. On le remplace, on surveille, et on ne recharge pas cette zone tant que la douleur ne redescend pas sous 2/10." };
  if (["Brûlure musculaire", "Fatigue musculaire", "Chaleur", "Étirement"].includes(p.nature) && (p.intensity || 0) <= 3)
    return { level: "vert", advice: "Cela ressemble à une fatigue musculaire normale (ou des courbatures). Tu peux continuer en gardant une technique propre." };
  return { level: "orange", advice: "Gêne modérée : réduis l'amplitude ou la charge sur cet exercice, et note son évolution. Si elle revient à chaque séance, on retirera l'exercice temporairement." };
}
/* zone récemment douloureuse ? (pour éviter de re-proposer) */
function recentPains(S, days) {
  const lim = addDays(todayISO(), -(days || 5));
  return (S.pains || []).filter((p) => p.date >= lim);
}
function zoneWatchList(S) {
  const map = {};
  recentPains(S, 7).forEach((p) => { if ((p.intensity || 0) >= 3) map[p.zone] = Math.max(map[p.zone] || 0, p.intensity); });
  return map;
}

/* ---------- objectifs effectifs (base + adaptations du coach + réglages) ---------- */
function effectiveTarget(session, slot) {
  const base = session.exos.find((e) => e.slot === slot);
  if (!base) return null;
  const sub = (S.subs[session.id] || {})[slot];
  let name = sub || base.name;
  let sets = base.sets, min = base.min, max = base.max;
  const ad = (S.adapt[session.key] || {})[base.name];
  if (ad) {
    if (ad.swap && !sub) name = ad.swap;
    sets = Math.max(1, Math.min(5, sets + (ad.dSets || 0)));
    min = Math.max(1, min + (ad.dReps || 0));
    max = Math.max(min, max + (ad.dReps || 0));
  }
  const diff = S.settings.difficulty;
  if (diff === "leger") { min = Math.max(1, Math.round(min * 0.8)); max = Math.max(min, Math.round(max * 0.8)); }
  if (diff === "intense") { min = Math.round(min * 1.1); max = Math.round(max * 1.15); }
  if (S.sched[session.id] && S.sched[session.id].light) sets = Math.max(1, sets - 1);
  return { name, sets, min, max, unit: exUnit(name), base: base.name, adapted: !!ad, swapped: name !== base.name };
}

/* ---------- résultats d'un exercice ---------- */
function exResult(session, slot) {
  const log = S.logs[session.id];
  const t = effectiveTarget(session, slot);
  const el = log && log.ex[slot];
  if (!el || !t) return null;
  const setVals = el.sets.map((s) => firstNum(s.v));
  const okSets = el.sets.filter((s) => s.ok === true).length;
  const koSets = el.sets.filter((s) => s.ok === false).length;
  const filled = el.sets.filter((s) => s.ok !== null || String(s.v).trim() !== "").length;
  const extraVals = (el.extra || []).map((s) => firstNum(s.v)).filter((n) => n != null);
  const reps = setVals.filter((n) => n != null);
  const totalReps = reps.reduce((a, b) => a + b, 0) + extraVals.reduce((a, b) => a + b, 0);
  const maxRep = reps.length ? Math.max(...reps) : null;
  return {
    target: t, el, filled, okSets, koSets,
    plannedSets: t.sets, extraSets: extraVals.length, extraReps: extraVals,
    reps, totalReps, maxRep,
    allOk: okSets >= t.sets && koSets === 0,
    overTarget: reps.some((r) => r > t.max),
    underTarget: reps.length > 0 && reps.every((r) => r < t.min),
    feel: el.feel || "", clean: el.clean, state: el.state, load: el.load,
  };
}

/* progression vs dernière séance validée du même type */
function prevSessionLog(session) {
  const cands = ALL_SESSIONS.filter((x) => x.key === session.key && x.id !== session.id)
    .map((x) => ({ s: x, log: S.logs[x.id] }))
    .filter((x) => x.log && ["done", "partial"].includes(x.log.state) && x.log.validatedAt)
    .sort((a, b) => (a.log.validatedAt < b.log.validatedAt ? 1 : -1));
  const cur = S.logs[session.id];
  return cands.find((x) => !cur || !cur.validatedAt || x.log.validatedAt < cur.validatedAt) || null;
}

function sessionStats(session) {
  const log = S.logs[session.id];
  if (!log) return null;
  const rows = session.exos.map((e) => exResult(session, e.slot)).filter(Boolean);
  const doneEx = rows.filter((r) => ["done", "partial"].includes(r.state) || r.okSets > 0).length;
  const okSets = rows.reduce((a, r) => a + r.okSets, 0);
  const koSets = rows.reduce((a, r) => a + r.koSets, 0);
  const plannedSets = rows.reduce((a, r) => a + r.plannedSets, 0);
  const extraSets = rows.reduce((a, r) => a + r.extraSets, 0);
  const totalReps = rows.reduce((a, r) => a + r.totalReps, 0);
  const pains = (S.pains || []).filter((p) => p.sessionId === session.id);
  return { rows, doneEx, totalEx: rows.length, okSets, koSets, plannedSets, extraSets, totalReps, pains, log };
}

/* ---------- conseil immédiat après un exercice (pendant la séance) ---------- */
function immediateAdvice(feel, exName, res) {
  const info = exInfo(exName) || {};
  const isT = isTimeUnit(exName);
  const u = isT ? "secondes" : "répétitions";
  switch (feel) {
    case "tres-facile":
      return { tone: "ok", txt: `Trop facile ? Parfait signe de progrès. Dès la prochaine série : ajoute 1–2 ${u}, ralentis la descente (3 s), ou ajoute une série. ${info.harder ? "Variante plus dure : " + info.harder : ""}` };
    case "facile":
      return { tone: "ok", txt: `Bien géré. Ajoute 1 ${isT ? "à 5 secondes" : "répétition"} sur la prochaine série, en gardant la technique parfaite.` };
    case "correct":
      return { tone: "info", txt: "Zone de travail idéale : continue exactement comme ça, même niveau sur la prochaine série." };
    case "difficile":
      return { tone: "warn", txt: "Difficile mais réalisé : c'est là qu'on progresse. Conserve ce niveau, prends 15–30 s de repos en plus avant la prochaine série, et n'augmente rien aujourd'hui." };
    case "tres-difficile":
      return { tone: "warn", txt: `Très difficile : réduis de 2 ${u} sur la prochaine série ou prends 30 s de repos en plus. Si la technique se dégrade, passe sur la variante plus facile : ${info.easier || "amplitude réduite"}.` };
    case "impossible":
      return { tone: "bad", txt: "OK, on ne force pas. Marque l'exercice comme impossible : je te propose immédiatement des remplacements plus adaptés via le bouton « Remplacer »." };
    case "douleur":
      return { tone: "bad", txt: "Stop sur cet exercice. Déclare la douleur (bouton « Douleur ») en précisant la zone, le type et l'intensité : j'adapte la suite et je te propose un remplacement seulement si c'est raisonnable." };
    case "fatigue":
      return { tone: "warn", txt: "Fatigue anormale : allège la fin de séance (retire les exercices secondaires), bois de l'eau, et note ta journée de travail dans le bilan. Mieux vaut une séance courte que pas de séance." };
    case "essoufflement":
      return { tone: "warn", txt: "Essoufflement important : allonge les repos à 2 minutes et ralentis le rythme. Si cela reste inhabituel et marqué, arrête la séance." };
    case "incompris":
      return { tone: "info", txt: `Ouvre la fiche (bouton « Fiche ») : schéma, étapes détaillées et erreurs fréquentes. Variante plus simple : ${info.easier || "amplitude réduite"}. Tu peux aussi remplacer l'exercice.` };
    default:
      return null;
  }
}

/* ---------- choix d'un remplacement intelligent ---------- */
function pickReplacements(exName, sessionId) {
  const info = exInfo(exName);
  const watch = zoneWatchList(S);
  const eq = S.settings.equipment || [];
  const needsEq = (n) => /sac|bouteille/i.test(n) ? (eq.includes("sac") || eq.includes("bouteilles")) : /chaise/i.test(n) ? eq.includes("chaise") : /mur/i.test(n) ? eq.includes("mur") : true;
  const painBlocked = (n) => {
    const i = exInfo(n);
    if (!i) return false;
    if ((watch.poignets >= 4 || watch.mains >= 4) && /pompes|dips|pike/i.test(n)) return true;
    if ((watch.basdos >= 4 || watch.milieudos >= 4) && /soulevé|tirage avec sac|superman/i.test(n.toLowerCase())) return true;
    if (watch.epaules >= 4 && i.cat === "Épaules") return true;
    if (watch.genoux >= 4 && /squat|fente|chaise/i.test(n)) return true;
    return false;
  };
  let cands = (info && info.replacements ? info.replacements.slice() : []);
  // complète avec la même catégorie
  if (info) exByCat(info.cat).forEach((n) => { if (n !== exName && !cands.includes(n)) cands.push(n); });
  const disliked = S.settings.disliked || [];
  const scored = cands.filter((n) => EXOS[n]).map((n) => ({
    n,
    score: (needsEq(n) ? 0 : -5) + (painBlocked(n) ? -6 : 0) + (disliked.includes(n) ? -3 : 0) +
      ((S.settings.liked || []).includes(n) ? 2 : 0) + ((info.replacements || []).includes(n) ? 3 : 0),
  })).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((x) => x.n);
}

/* ---------- analyse complète d'une séance (le compte-rendu du coach) ---------- */
function analyzeSession(session) {
  const st = sessionStats(session);
  if (!st) return null;
  const { rows, log } = st;
  const prev = prevSessionLog(session);
  const positives = [], improvements = [], adaptations = [];
  const isT = (n) => isTimeUnit(n);

  /* — comparaison avec la séance précédente du même type — */
  let progressTxt = null;
  if (prev) {
    const prevStat = sessionStats(prev.s);
    if (prevStat && prevStat.totalReps > 0 && st.totalReps > 0) {
      const d = st.totalReps - prevStat.totalReps;
      progressTxt = d > 0 ? `+${d} répétitions au total par rapport au ${frDate(prev.log.validatedAt.slice(0, 10))}` :
        d === 0 ? "volume identique à la dernière fois" : `${d} répétitions vs la dernière fois (journée plus dure, ça arrive)`;
      if (d > 0) positives.push(`Progression réelle : ${progressTxt}.`);
    }
  }

  /* — par exercice — */
  rows.forEach((r) => {
    const name = r.target.name;
    const u = isT(name) ? "s" : " rép.";
    const painHere = st.pains.find((p) => p.exName === name);
    const kind = session.key;

    if (r.state === "replaced") positives.push(`${name} : bonne décision de remplacer plutôt que de forcer.`);
    if (r.extraSets > 0) positives.push(`${name} : ${r.extraSets} série${r.extraSets > 1 ? "s" : ""} supplémentaire${r.extraSets > 1 ? "s" : ""} (${r.extraReps.join(", ")}${u}) — belle énergie.`);
    if (r.overTarget) positives.push(`${name} : tu as dépassé la fourchette haute (${r.maxRep}${u} pour ${r.target.max} visé).`);
    if (r.clean === true && r.okSets > 0) positives.push(`${name} : technique propre annoncée — c'est ce qui construit.`);

    if (painHere) {
      const tri = painTriage(painHere);
      improvements.push(`${name} : douleur ${painHere.intensity}/10 (${(painHere.nature || "").toLowerCase()}, ${ZONE_LABEL[painHere.zone] || painHere.zone}).`);
      const threshold = firstNum(S.settings.painThreshold) != null ? firstNum(S.settings.painThreshold) : 5;
      if (tri.level === "rouge") {
        adaptations.push({ ex: r.target.base, kind, action: "retirer", detail: `${name} est retiré des prochaines séances tant que la douleur n'est pas redescendue. ${tri.advice}`, apply: { swap: pickReplacements(name, session.id)[0] || null, note: "retiré : douleur" } });
      } else if (tri.level === "orange" && (painHere.intensity || 0) >= threshold) {
        const rep = pickReplacements(name, session.id)[0];
        adaptations.push({ ex: r.target.base, kind, action: "remplacer", detail: `${name} → ${rep || "variante plus douce"} la semaine prochaine, le temps que la zone se calme.`, apply: { swap: rep || null, note: "remplacé : douleur à surveiller" } });
      } else if (tri.level === "orange") {
        adaptations.push({ ex: r.target.base, kind, action: "surveiller", detail: `${name} : gêne ${painHere.intensity}/10 sous ton seuil d'alerte (${threshold}/10) — on garde l'exercice, amplitude/charge réduites si besoin, et on retire l'exercice si ça revient à la prochaine séance.`, apply: { note: "zone à surveiller (" + (ZONE_LABEL[painHere.zone] || painHere.zone) + ")" } });
      } else {
        adaptations.push({ ex: r.target.base, kind, action: "surveiller", detail: `${name} : fatigue musculaire normale, on garde l'exercice et on surveille la zone.`, apply: { note: "zone à surveiller" } });
      }
      return;
    }
    if (r.state === "impossible" || r.feel === "impossible") {
      const reps = pickReplacements(name, session.id);
      improvements.push(`${name} : impossible aujourd'hui — aucun souci, on ajuste.`);
      adaptations.push({ ex: r.target.base, kind, action: "remplacer", detail: `${name} → ${reps[0] || "variante plus facile"} (autres options : ${reps.slice(1).join(", ") || "voir fiche"}).`, apply: { swap: reps[0] || null, note: "remplacé : trop difficile" } });
      return;
    }
    if (r.filled === 0) {
      if (log.state !== "partial") improvements.push(`${name} : non renseigné.`);
      return;
    }
    if (r.allOk && ["tres-facile", "facile"].includes(r.feel)) {
      const d = isT(name) ? 5 : 2;
      adaptations.push({ ex: r.target.base, kind, action: "augmenter", detail: `${name} : toutes les séries validées et ressenti facile → +${d}${u} sur la fourchette${r.feel === "tres-facile" && r.target.sets < 4 ? " et bientôt une série de plus" : ""}.`, apply: { dReps: d, dSets: r.feel === "tres-facile" && r.target.sets < 4 ? 1 : 0, note: "progression : trop facile" } });
    } else if (r.allOk && (r.overTarget || r.extraSets > 0)) {
      const d = isT(name) ? 5 : 1;
      adaptations.push({ ex: r.target.base, kind, action: "augmenter", detail: `${name} : objectifs dépassés → fourchette relevée de ${d}${u}.`, apply: { dReps: d, note: "progression : objectifs dépassés" } });
    } else if (r.allOk) {
      adaptations.push({ ex: r.target.base, kind, action: "conserver", detail: `${name} : validé proprement → on consolide au même niveau, l'augmentation viendra quand ce sera « facile ».`, apply: {} });
    } else if (r.okSets > 0 && r.okSets >= Math.ceil(r.plannedSets / 2)) {
      improvements.push(`${name} : ${r.okSets}/${r.plannedSets} séries validées — la dernière série était de trop, c'est normal.`);
      adaptations.push({ ex: r.target.base, kind, action: "conserver", detail: `${name} : objectifs conservés, repos entre séries allongé de 15–30 s la prochaine fois.`, apply: {} });
    } else {
      const d = isT(name) ? -5 : -2;
      improvements.push(`${name} : séance compliquée (${r.okSets}/${r.plannedSets} séries).`);
      adaptations.push({ ex: r.target.base, kind, action: "réduire", detail: `${name} : fourchette abaissée de ${Math.abs(d)}${u} pour reconstruire sur du solide. ${exInfo(name) && exInfo(name).easier ? "Option plus simple : " + exInfo(name).easier : ""}`, apply: { dReps: d, note: "allégé après une séance difficile" } });
    }
    if (r.clean === false) {
      improvements.push(`${name} : technique dégradée en fin de série — réduis d'une ou deux répétitions plutôt que de tricher.`);
    }
  });

  /* — fatigue / récupération / prochaine séance — */
  const pre = log.pre || {};
  let restAdvice = null;
  const hardDay = pre.work === "physique" || pre.fatigue === "haute" || pre.sleep === "mauvais";
  if (hardDay) {
    improvements.push("Journée chargée (travail/sommeil/fatigue) : la performance du jour est à relire avec indulgence.");
    restAdvice = "Prochaine séance : garde au moins un jour de repos complet avant, hydrate-toi bien, et si la fatigue persiste je te proposerai une version allégée.";
  }
  if (st.pains.some((p) => painRedFlag(p))) {
    restAdvice = "Douleur importante signalée : repos sur la zone concernée, pas de séance qui la sollicite avant amélioration nette. Consulte si cela persiste ou s'aggrave.";
  }
  if (!positives.length) positives.push("Tu t'es entraîné malgré tout — la régularité est LE facteur n°1 de ta transformation d'ici septembre.");

  /* — résumé chiffré — */
  const dura = log.durationMin ? `${log.durationMin} min` : "—";
  const loadTxt = rows.map((r) => r.load).filter(Boolean).join(" · ") || "poids du corps / charges maison";

  /* — mini compte-rendu physique — */
  const medical = {
    etat: `Avant séance — énergie : ${pre.energy || "?"} · sommeil : ${pre.sleep || "?"} · fatigue : ${pre.fatigue || "?"} · journée : ${pre.work || "?"}`,
    perf: `${st.okSets}/${st.plannedSets} séries validées, ${st.totalReps} répétitions/secondes au total${st.extraSets ? `, ${st.extraSets} série(s) bonus` : ""}.`,
    douleurs: st.pains.length ? st.pains.map((p) => `${ZONE_LABEL[p.zone] || p.zone} (${(p.nature || "?").toLowerCase()}, ${p.intensity}/10, ${(p.timing || "?").toLowerCase()}${p.exName ? ", sur " + p.exName : ""}${p.stopsAtRest ? ", disparaît à l'arrêt" : p.stopsAtRest === false ? ", persiste au repos" : ""})`).join(" ; ") : "aucune douleur signalée.",
    reco: st.pains.some(painRedFlag)
      ? "Douleur à drapeau rouge : stop sur la zone, avis médical/kiné recommandé si persistance au-delà de quelques jours."
      : st.pains.length ? "Surveiller la zone signalée ; glace/repos si besoin ; réévaluation à la prochaine séance."
        : "Récupération classique : hydratation, un vrai repas dans les 2 h, sommeil correct.",
    redFlag: st.pains.some(painRedFlag),
  };

  return {
    at: new Date().toISOString(), sessionId: session.id,
    summary: { duration: dura, doneEx: st.doneEx, totalEx: st.totalEx, okSets: st.okSets, plannedSets: st.plannedSets, extraSets: st.extraSets, totalReps: st.totalReps, load: loadTxt, pains: st.pains.length, progress: progressTxt },
    positives, improvements, adaptations, restAdvice, medical,
  };
}

/* applique les adaptations d'un rapport sur les séances futures du même type */
function applyAdaptations(report) {
  report.adaptations.forEach((a) => {
    if (!a.apply) return;
    if (!S.adapt[a.kind]) S.adapt[a.kind] = {};
    const cur = S.adapt[a.kind][a.ex] || { dReps: 0, dSets: 0, swap: null, note: "" };
    if (a.apply.dReps) cur.dReps = Math.max(-8, Math.min(12, cur.dReps + a.apply.dReps));
    if (a.apply.dSets) cur.dSets = Math.max(-1, Math.min(2, cur.dSets + a.apply.dSets));
    if (a.apply.swap !== undefined && a.apply.swap) cur.swap = a.apply.swap;
    if (a.apply.note) cur.note = a.apply.note;
    cur.at = todayISO();
    S.adapt[a.kind][a.ex] = cur;
  });
}

/* ---------- récupération du jour ---------- */
function recoveryState() {
  const t = todayISO();
  const ci = S.checkins[t] || S.checkins[addDays(t, -1)] || null;
  let score = 72;
  if (ci) {
    if (ci.fatigue === "haute") score -= 28; else if (ci.fatigue === "moyenne") score -= 12;
    if (ci.sleep === "mauvais") score -= 18; else if (ci.sleep === "moyen") score -= 8; else if (ci.sleep === "bon") score += 8;
    if (ci.energy === "haute") score += 12; else if (ci.energy === "basse") score -= 12;
    if (ci.work === "physique") score -= 12;
    if (ci.heat) score -= 6;
  }
  const pains = recentPains(S, 3).filter((p) => (p.intensity || 0) >= 4);
  score -= pains.length * 10;
  // séances dures récentes ?
  const y = addDays(t, -1);
  const hardYesterday = ALL_SESSIONS.some((s) => {
    const log = S.logs[s.id];
    return log && log.validatedAt && log.validatedAt.slice(0, 10) === y && ["done", "partial"].includes(log.state);
  });
  if (hardYesterday) score -= 8;
  score = Math.max(5, Math.min(98, score));
  const label = score >= 70 ? "Bonne" : score >= 45 ? "Moyenne" : "Basse";
  const color = score >= 70 ? "var(--ok)" : score >= 45 ? "var(--warn)" : "var(--bad)";
  let advice;
  if (score >= 70) advice = "Feu vert : séance complète possible, c'est le moment de viser le haut des fourchettes.";
  else if (score >= 45) advice = "Séance normale possible, mais reste sur le bas des fourchettes et allonge les repos.";
  else advice = "Récupération basse : séance allégée conseillée (exercices principaux uniquement) ou déplace la séance à demain — ce n'est pas un échec, c'est du pilotage.";
  return { score, label, color, advice, checkin: ci, pains };
}

/* ---------- poids & mensurations ---------- */
function weightSeries() {
  return (S.weights || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
}
function weekAvgWeight(endISO, days) {
  const from = addDays(endISO, -(days || 7) + 1);
  const w = weightSeries().filter((x) => x.date >= from && x.date <= endISO && firstNum(x.kg) != null);
  return w.length ? avg(w.map((x) => firstNum(x.kg))) : null;
}
function weightTrend() {
  const t = todayISO();
  const cur = weekAvgWeight(t, 7), prev = weekAvgWeight(addDays(t, -7), 7);
  const ws = weightSeries();
  const last = ws.length ? ws[ws.length - 1] : null;
  const first = ws.length ? ws[0] : null;
  const waistPts = ws.filter((x) => firstNum(x.waist) != null);
  let waistDelta = null;
  if (waistPts.length >= 2) {
    const wl = firstNum(waistPts[waistPts.length - 1].waist), w0 = firstNum(waistPts[Math.max(0, waistPts.length - 4)].waist);
    waistDelta = round1(wl - w0);
  }
  return {
    last, first, cur, prev,
    weeklyDelta: cur != null && prev != null ? round1(cur - prev) : null,
    totalDelta: last && first && last !== first ? round1(firstNum(last.kg) - firstNum(first.kg)) : null,
    waistDelta,
    count: ws.length,
  };
}

/* performance hebdo (volume total des séances validées) */
function weeklyVolume(weekN) {
  const wk = PLAN.find((w) => w.n === weekN);
  if (!wk) return 0;
  return wk.sessions.reduce((a, s) => {
    const log = S.logs[s.id];
    if (!log || !["done", "partial"].includes(log.state)) return a;
    const st = sessionStats(s);
    return a + (st ? st.totalReps : 0);
  }, 0);
}

/* ---------- conseils alimentaires ---------- */
function nutritionAdvice() {
  const tr = weightTrend();
  const rec = recoveryState();
  const wkN = currentWeek().n;
  const volNow = weeklyVolume(wkN), volPrev = weeklyVolume(wkN - 1);
  const status = [], tips = [];

  if (tr.count < 2) {
    status.push({ tone: "info", txt: "Pèse-toi 2 à 3 fois cette semaine (le matin, après être allé aux toilettes, avant de manger) : je pourrai calibrer les conseils sur ta vraie tendance, pas sur une seule pesée." });
  } else if (tr.weeklyDelta != null) {
    if (tr.weeklyDelta > 0.4) {
      status.push({ tone: "warn", txt: `Le poids monte vite (+${tr.weeklyDelta} kg en moyenne sur 7 jours). Pour du muscle sans ventre : on ralentit un peu.` });
      tips.push("Retire le grignotage sucré et les boissons sucrées cette semaine.");
      tips.push("Garde les protéines hautes, réduis un peu les féculents des repas SANS entraînement.");
    } else if (tr.weeklyDelta >= 0.1) {
      status.push({ tone: "ok", txt: `Prise de ${tr.weeklyDelta} kg/semaine en moyenne : c'est exactement la vitesse d'une prise de muscle propre. On ne change rien.` });
    } else if (tr.weeklyDelta > -0.2) {
      status.push({ tone: "info", txt: "Poids stable. Si les performances montent, parfait (recomposition). Si elles stagnent aussi, il faut manger un peu plus." });
      if (volPrev && volNow <= volPrev) tips.push("Performances stables + poids stable → ajoute UNE collation par jour : lait + flocons d'avoine + banane, ou yaourt grec + miel.");
    } else {
      status.push({ tone: "warn", txt: `Tu perds du poids (${tr.weeklyDelta} kg/sem) alors que l'objectif est de construire : il faut manger davantage, surtout les jours de bateau.` });
      tips.push("Ajoute 2 œufs au petit-déjeuner ET une vraie portion de riz/pâtes après l'entraînement.");
      tips.push("Après une grosse journée sur le bateau : un repas complet en plus (tu brûles beaucoup sans t'en rendre compte).");
    }
  }
  if (tr.waistDelta != null && tr.waistDelta >= 2) {
    status.push({ tone: "warn", txt: `Tour de taille +${tr.waistDelta} cm sur les dernières mesures : on limite. Moins de sucres liquides, on garde les protéines, et on surveille 2 semaines.` });
  } else if (tr.waistDelta != null && tr.waistDelta <= -1) {
    status.push({ tone: "ok", txt: `Tour de taille en baisse (${tr.waistDelta} cm) : le ventre fond pendant que tu construis — trajectoire idéale.` });
  }
  // socle permanent, adapté au profil (66 kg, morphologie fine, objectif muscle propre)
  tips.push("Protéines : vise ~2 g/kg, soit ≈ 130 g/jour — répartis sur 3–4 prises (œufs, poulet, thon, yaourt grec, fromage blanc, lentilles).");
  tips.push("Autour des séances : une portion de glucides avant (banane, pain) et un repas complet après (riz/pâtes + protéine).");
  if (rec.checkin && rec.checkin.heat) tips.push("Chaleur sur le lac : 2–3 L d'eau dans la journée, sans attendre la soif.");
  else tips.push("Hydratation : 1,5–2,5 L d'eau par jour, plus les jours de chaleur au bateau.");
  if (rec.checkin && rec.checkin.work === "physique") tips.push("Journée physique à La Carline : mange PLUS ces jours-là (collation en plus), sinon le corps n'a rien pour construire.");
  if (rec.label === "Basse") tips.push("Récupération basse : le sommeil et un vrai dîner (protéine + féculents + légumes) feront plus que n'importe quel complément.");
  tips.push("Pas de gros gainer ni d'explosion de calories : on construit du muscle, pas du ventre.");
  return { status, tips: tips.slice(0, 6), trend: tr };
}

/* ---------- historique de répétitions par exercice (graphique) ---------- */
function repsHistory(exName) {
  const pts = [];
  ALL_SESSIONS.forEach((s) => {
    const log = S.logs[s.id];
    if (!log || !log.validatedAt || !["done", "partial"].includes(log.state)) return;
    s.exos.forEach((e) => {
      const t = effectiveTarget(s, e.slot);
      if (!t || t.name !== exName) return;
      const r = exResult(s, e.slot);
      if (r && r.maxRep != null) pts.push({ x: log.validatedAt.slice(0, 10), y: r.maxRep });
    });
  });
  return pts.sort((a, b) => (a.x < b.x ? -1 : 1));
}
function trackedExercises() {
  const names = new Set();
  ALL_SESSIONS.forEach((s) => {
    const log = S.logs[s.id];
    if (!log || !log.validatedAt) return;
    s.exos.forEach((e) => { const t = effectiveTarget(s, e.slot); if (t) names.add(t.name); });
  });
  return [...names];
}

/* ---------- conseil du jour (accueil) ---------- */
function dailyCoachTip(next) {
  const rec = recoveryState();
  const watch = zoneWatchList(S);
  const zones = Object.keys(watch);
  if (zones.length && Math.max(...Object.values(watch)) >= 5)
    return { tone: "bad", txt: `Douleur récente (${zones.map((z) => ZONE_LABEL[z] || z).join(", ")}) : aujourd'hui, on évite tout ce qui la réveille. Les remplacements sont prêts dans la séance.` };
  if (rec.label === "Basse") return { tone: "warn", txt: rec.advice };
  if (next && next.optional) return { tone: "info", txt: "Séance facultative aujourd'hui : uniquement si tu en as envie et que la forme est là. Sinon, repos mérité." };
  if (rec.label === "Bonne") return { tone: "ok", txt: "Bonne récupération : vise le haut des fourchettes aujourd'hui, et note tout — c'est comme ça que je te fais progresser." };
  return { tone: "info", txt: rec.advice };
}
