// Moteur de trophées : à la fin d'un débat, le public vote, et le ou les
// gagnant(s) débloquent les trophées correspondant à leur performance.
// Ce fichier ne contient que de la logique pure (aucun accès réseau), pour
// être facilement testable.

// Les 12 catégories thématiques (servent aux trophées de thème et au Grand Chelem).
export const THEMES = [
  "Politique", "Économie", "Société", "Philosophie", "Religion", "Sciences",
  "Histoire", "Géopolitique", "Écologie", "Culture", "Sport", "Tech",
];

// Un débat n'est « validé » (et ne décerne de trophée) qu'au-delà de ce nombre
// de votants distincts — garde-fou minimal contre l'auto-attribution.
export const MIN_VOTERS = 3;

// Identifiant technique d'un thème (sans accent), pour reconstruire l'id du trophée.
function slugify(theme) {
  return (theme || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Évalue une VICTOIRE : met à jour les statistiques cumulées du gagnant et
// renvoie les trophées nouvellement débloqués (hors ceux déjà possédés).
//   prevStats : { wins, streak, themesWon: [] } (cumul AVANT ce débat)
//   ctx       : { audience, theme, format2v2, minutes, sharePct, voters }
//   earnedIds : identifiants des trophées déjà obtenus
export function evaluateWin(prevStats, ctx, earnedIds) {
  const earned = new Set(earnedIds || []);
  const out = [];
  const add = (id) => { if (id && !earned.has(id)) { earned.add(id); out.push(id); } };

  const ps = prevStats || {};
  const newWins = (ps.wins || 0) + 1;
  const newStreak = (ps.streak || 0) + 1;
  const themeOk = ctx.theme && THEMES.includes(ctx.theme);
  const themesWon = Array.from(new Set([...(ps.themesWon || []), ...(themeOk ? [ctx.theme] : [])]));
  const a = ctx.audience || 0;

  // Régie — paliers d'audience (bandes exclusives).
  if (a >= 5 && a <= 7) add("regie_bronze");
  if (a >= 8 && a <= 9) add("regie_argent");
  if (a >= 10 && a <= 11) add("regie_or");
  if (a >= 12 && a <= 13) add("regie_vermeil");
  if (a === 14) add("regie_pourpre");
  if (a >= 15) add("regie_laurier");

  // Thème — paliers initié (≥6) / confirmé (≥10) / maître (≥14).
  if (themeOk) {
    const slug = slugify(ctx.theme);
    if (a >= 6) add(slug + "_initie");
    if (a >= 10) add(slug + "_confirme");
    if (a >= 14) add(slug + "_maitre");
  }

  // Distinctions.
  if (newWins === 1) add("special_premier_contre");
  if (ctx.format2v2) add("special_duo");
  if (ctx.format2v2 && a >= 14) add("special_tenaille");
  if ((ctx.minutes || 0) >= 45) add("special_marathon");
  if ((ctx.sharePct || 0) >= 80) add("special_plebiscite");
  if ((ctx.sharePct || 0) >= 95 && (ctx.voters || 0) >= 8) add("special_unanimite");
  if (newStreak >= 3) add("special_serie");
  if (newStreak >= 10) add("special_dynastie");
  if (themesWon.length >= 12) add("special_grand_chelem");
  if (newWins >= 100) add("special_centurion");

  return { stats: { wins: newWins, streak: newStreak, themesWon }, earned: out };
}

// Évalue une DÉFAITE : la série de victoires consécutives est rompue.
export function applyLoss(prevStats) {
  const ps = prevStats || {};
  return { stats: { wins: ps.wins || 0, streak: 0, themesWon: ps.themesWon || [] } };
}

// Dépouille les votes (objet { auteur: indiceDeCamp }) et renvoie le résultat.
export function tally(votes, campsCount = 2) {
  const counts = new Array(campsCount).fill(0);
  let voters = 0;
  Object.values(votes || {}).forEach((c) => { if (c === 0 || c === 1) { counts[c]++; voters++; } });
  const max = Math.max(...counts);
  const leaders = counts.map((n, i) => ({ n, i })).filter((x) => x.n === max && max > 0);
  const winner = leaders.length === 1 ? leaders[0].i : null; // null = égalité (ou aucun vote)
  const sharePct = voters > 0 && winner !== null ? Math.round((counts[winner] / voters) * 100) : 0;
  return { counts, voters, winner, sharePct };
}
