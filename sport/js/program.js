/* ============================================================
   program.js — plan d'entraînement 13/07 → 01/09/2026
   4 séances par semaine + 1 facultative, 3 phases progressives.
   ============================================================ */
"use strict";

const PLAN_START = "2026-07-13";           // lundi de la semaine 1
const RENTREE = "2026-09-01";              // objectif rentrée
const NB_WEEKS = 7;

/* ---- helpers dates ---- */
const isoDate = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
const todayISO = () => isoDate(new Date());
const frDate = (iso, opt) => {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", opt || { weekday: "short", day: "numeric", month: "short" });
  } catch (e) { return iso; }
};
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

/* ---- phase d'une semaine : 0 reprise · 1 construction · 2 intensification ---- */
const phaseOf = (w) => (w === 1 ? 0 : w <= 4 ? 1 : 2);
const PHASE_LABEL = ["Reprise en douceur", "Construction", "Intensification"];

/* ---- modèles de séances ----
   t = objectifs par phase : [séries, répé min, répé max]
   p2 = exercice qui remplace celui-ci en phase 2 (progression)   */
const SESSION_TPL = [
  {
    key: "HA", day: 0, icon: "🏋️", color: "#ff6a3d", title: "Haut du corps A",
    focus: "Pectoraux · dos · bras · tronc", duration: "35–45 min",
    warmup: "2 min de marche rapide sur place, 10 cercles de bras dans chaque sens, 10 pompes inclinées faciles, 10 rotations de buste.",
    exos: [
      { name: "Pompes classiques", t: [[2, 8, 12], [3, 8, 14], [3, 10, 16]] },
      { name: "Tirage avec sac à dos", t: [[2, 10, 15], [3, 10, 15], [3, 12, 18]] },
      { name: "Curl biceps (bouteilles ou sac)", t: [[2, 10, 15], [3, 10, 15], [3, 12, 18]] },
      { name: "Extension triceps au-dessus de la tête", t: [[2, 10, 12], [3, 10, 15], [3, 12, 15]] },
      { name: "Dead bug", t: [[2, 6, 10], [3, 8, 12], [3, 10, 14]] },
    ],
  },
  {
    key: "JA", day: 1, icon: "🦵", color: "#2fe1c0", title: "Jambes A",
    focus: "Cuisses · fessiers · mollets · obliques", duration: "30–40 min",
    warmup: "2 min de marche rapide, 15 squats à vide lents, 10 balancements de jambe par côté, 10 montées de genoux.",
    exos: [
      { name: "Squats", t: [[2, 15, 20], [3, 15, 25], [3, 12, 20]], p2: "Squats avec sac à dos" },
      { name: "Fentes arrière", t: [[2, 8, 12], [3, 8, 12], [3, 10, 14]] },
      { name: "Pont fessier", t: [[2, 15, 20], [3, 15, 25], [3, 8, 12]], p2: "Pont fessier une jambe" },
      { name: "Mollets debout", t: [[2, 20, 30], [3, 20, 30], [3, 25, 35]] },
      { name: "Gainage latéral (genoux)", t: [[2, 20, 30], [3, 20, 40], [3, 30, 45]] },
    ],
  },
  {
    key: "HB", day: 3, icon: "💪", color: "#5aa8ff", title: "Haut du corps B",
    focus: "Épaules · dos · pectoraux · gainage", duration: "35–45 min",
    warmup: "2 min de marche rapide, 10 cercles de bras, 15 élévations latérales à vide, 10 pompes inclinées faciles.",
    exos: [
      { name: "Développé au-dessus de la tête", t: [[2, 8, 12], [3, 8, 12], [3, 10, 15]] },
      { name: "Tirage à un bras avec sac", t: [[2, 10, 15], [3, 10, 15], [3, 12, 18]] },
      { name: "Pompes mains serrées", t: [[2, 6, 10], [3, 6, 12], [3, 8, 14]] },
      { name: "Élévations latérales", t: [[2, 12, 15], [3, 12, 18], [3, 15, 20]] },
      { name: "Bird-dog", t: [[2, 8, 10], [3, 8, 12], [3, 10, 12]] },
      { name: "Gainage (planche)", t: [[2, 25, 40], [3, 30, 45], [3, 40, 60]] },
    ],
  },
  {
    key: "JB", day: 5, icon: "🧘", color: "#9d8cff", title: "Jambes B + posture",
    focus: "Jambes · dos profond · posture", duration: "35–45 min",
    warmup: "2 min de marche rapide, 12 squats lents, 8 bird-dogs faciles, 10 rotations de hanches.",
    exos: [
      { name: "Squats avec sac à dos", t: [[2, 10, 15], [3, 10, 18], [3, 12, 20]] },
      { name: "Soulevé de terre roumain (sac)", t: [[2, 10, 12], [3, 10, 15], [3, 12, 15]] },
      { name: "Pont fessier une jambe", t: [[2, 8, 10], [3, 8, 12], [3, 10, 14]] },
      { name: "Superman (extensions dos)", t: [[2, 8, 12], [3, 10, 14], [3, 12, 15]] },
      { name: "Chaise contre le mur", t: [[2, 30, 45], [3, 30, 50], [3, 40, 60]] },
      { name: "Gainage (planche)", t: [[2, 20, 40], [3, 30, 45], [3, 40, 60]] },
    ],
  },
  {
    key: "ES", day: 6, icon: "✨", color: "#fbbf24", title: "Séance esthétique", optional: true,
    focus: "Épaules · bras · abdos — facultative", duration: "20–30 min",
    warmup: "1 min de marche rapide, 10 cercles de bras, 10 élévations à vide.",
    exos: [
      { name: "Élévations latérales", t: [[2, 12, 18], [2, 12, 18], [3, 12, 20]] },
      { name: "Curl biceps (bouteilles ou sac)", t: [[2, 10, 15], [2, 10, 15], [3, 10, 15]] },
      { name: "Extension triceps au-dessus de la tête", t: [[2, 10, 15], [2, 10, 15], [3, 10, 15]] },
      { name: "Maintien bras en croix", t: [[2, 20, 40], [2, 25, 45], [2, 30, 60]] },
      { name: "Gainage (planche)", t: [[2, 25, 45], [2, 30, 45], [2, 35, 60]] },
    ],
  },
];

/* ---- construction du plan complet ---- */
function buildPlan() {
  const weeks = [];
  for (let w = 1; w <= NB_WEEKS; w++) {
    const start = addDays(PLAN_START, (w - 1) * 7);
    const phase = phaseOf(w);
    const sessions = SESSION_TPL.map((tpl) => ({
      id: `w${w}-${tpl.key}`,
      week: w, phase,
      key: tpl.key, icon: tpl.icon, color: tpl.color,
      title: tpl.title, focus: tpl.focus, duration: tpl.duration,
      warmup: tpl.warmup, optional: !!tpl.optional,
      plannedDate: addDays(start, tpl.day),
      exos: tpl.exos.map((e, i) => {
        const name = phase === 2 && e.p2 ? e.p2 : e.name;
        const [sets, min, max] = e.t[phase];
        return { slot: `e${i}`, name, sets, min, max, unit: exUnit(name) };
      }),
    }));
    weeks.push({ n: w, phase, start, end: addDays(start, 6), sessions });
  }
  return weeks;
}

const PLAN = buildPlan();
const ALL_SESSIONS = PLAN.flatMap((w) => w.sessions);
const sessionById = (id) => ALL_SESSIONS.find((s) => s.id === id) || null;
const weekOfDate = (iso) => PLAN.find((w) => iso >= w.start && iso <= w.end) || null;
const currentWeek = () => {
  const t = todayISO();
  if (t < PLAN[0].start) return PLAN[0];
  return weekOfDate(t) || PLAN[PLAN.length - 1];
};
/* séances de même type (clé) postérieures à une séance donnée */
const laterSessionsOfKind = (id) => {
  const s = sessionById(id);
  if (!s) return [];
  return ALL_SESSIONS.filter((x) => x.key === s.key && x.week > s.week);
};
