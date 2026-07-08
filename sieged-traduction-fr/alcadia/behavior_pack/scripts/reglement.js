// ===== Règlement du serveur : règles, avertissements, bannissements, prison =====
// - Règlement lisible par tous (menu d'Alcadia → ⚖ Règlement).
// - Règle automatisée : interdiction d'attaquer un royaume dont le roi est
//   hors-ligne (sans représentant en ligne). Avertissement + compte à rebours ;
//   si l'attaquant reste, bannissement temporaire automatique.
// - Sanctions admin : avertissements à niveaux (léger 1 pt, sérieux 2 pts,
//   grave 3 pts), bannissement temporaire (expulsion du jeu), prison RP
//   (téléportation en cellule pour une durée, puis sortie devant la porte).
// - Le roi peut nommer des représentants : s'ils sont en ligne, son royaume
//   est attaquable même en son absence.
//
// Coût : uniquement des événements + UNE vérification légère toutes les 5 s
// (joueurs en ligne seulement : prison, bans, compte à rebours). Aucun scan
// d'entités en continu.
import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { isKingdomChief } from "./troupes.js";

// ── Stockage monde ───────────────────────────────────────────────────────────
const DP_CFG   = "rules:cfg";    // { countdown, banHours, warnLimit, radius }
const DP_WARNS = "rules:warns";  // { name: [{ t, pts, reason }] }
const DP_BANS  = "rules:bans";   // { name: { until, reason } }
const DP_REPS  = "rules:reps";   // { kingName: [names] }
const DP_PRISON = "rules:prison"; // { cell:{x,y,z,dim}, exit:{x,y,z,dim} }
const DP_JAIL  = "rules:jail";   // sur le joueur : { until, reason }

function loadObj(dp) {
  try { const raw = world.getDynamicProperty(dp); if (typeof raw === "string") { const o = JSON.parse(raw); if (o && typeof o === "object" && !Array.isArray(o)) return o; } } catch (e) {}
  return {};
}
function saveObj(dp, o) { try { world.setDynamicProperty(dp, JSON.stringify(o)); } catch (e) {} }

const DEFAULT_CFG = { countdown: 60, banHours: 24, warnLimit: 4, radius: 48 };
export function getCfg() { return Object.assign({}, DEFAULT_CFG, loadObj(DP_CFG)); }
function saveCfg(c) { saveObj(DP_CFG, c); }

function onlineByName(name) { try { return world.getAllPlayers().find((p) => p.name === name) || null; } catch (e) { return null; } }
function fmtDur(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 120) return s + " s";
  const m = Math.ceil(s / 60);
  if (m < 120) return m + " min";
  return Math.ceil(m / 60) + " h";
}

// ── Le règlement (texte) ─────────────────────────────────────────────────────
const RULES = [
  { titre: "§e1. Respect et fair-play", texte: "§7Aucune insulte, harcèlement ou provocation hors-RP entre joueurs.\n\n§7Triche interdite : x-ray, exploitation de bugs, duplication d'objets.\n\n§7Les décisions des administrateurs sont définitives." },
  { titre: "§e2. Jeu de rôle", texte: "§7Chacun incarne son personnage : un prénom, un peuple, une histoire.\n\n§7Les conflits se règlent §edans le jeu§7 (diplomatie, guerre déclarée, tribunal du roi), pas dans le tchat hors-RP.\n\n§7Le vol et la trahison font partie du RP §8— mais dans les limites des règles 4 et 5." },
  { titre: "§c3. Guerres : déclaration obligatoire", texte: "§7Aucune attaque de royaume sans §eguerre déclarée§7 : utilise le §fParchemin sur un perroquet§7 (corbeau messager) et attends la réponse.\n\n§7Une fois la guerre déclarée, sièges, batailles et pillages du royaume ennemi sont autorisés.\n\n§7La paix se négocie au parchemin ou au §fDrapeau de reddition§7." },
  { titre: "§c4. Attaque hors-ligne interdite (règle automatisée)", texte: "§7Il est §cinterdit§7 d'attaquer le château, le drapeau ou les troupes d'un royaume dont le §eroi est hors-ligne§7 et qui n'a §eaucun représentant en ligne§7.\n\n§6Automatique : §7si tu attaques quand même, un avertissement s'affiche avec un §ccompte à rebours§7. Quitte le §eterritoire du royaume§7 (le rayon dépend de son niveau : Colonie 20 → Royaume 96 blocs) avant la fin : simple avertissement. Reste dedans : §cbannissement temporaire immédiat§7.\n\n§7Un roi peut nommer des §ereprésentants§7 dans ce menu : s'ils sont en ligne, le royaume est défendable donc attaquable." },
  { titre: "§c5. Pillage et destructions", texte: "§7Le pillage n'est autorisé §equ'en guerre déclarée§7, et uniquement sur le royaume ennemi.\n\n§cInterdit en toutes circonstances§7 : destruction massive gratuite, incendies volontaires hors siège, pièges au spawn, vol dans les coffres d'un royaume en paix.\n\n§7Les dégâts de siège font partie du jeu ; la destruction pour nuire, non." },
  { titre: "§e6. Territoires et constructions", texte: "§7Respecte les frontières des royaumes (rayon autour du drapeau).\n\n§7Ne construis pas collé au territoire d'autrui sans accord de son roi.\n\n§7Les constructions doivent rester dans l'esprit médiéval du serveur." },
  { titre: "§67. Sanctions", texte: "§7Les avertissements ont des niveaux : §fléger§7 (1 pt), §6sérieux§7 (2 pts), §cgrave§7 (3 pts).\n\n§7Au-delà du seuil de points, bannissement temporaire automatique.\n\n§7Selon la faute, un admin peut aussi t'envoyer en §8prison RP§7 (cellule pour une durée donnée) ou te bannir directement.\n\n§7Les points s'effacent sur décision d'un admin." },
  { titre: "§d8. Représentants d'un royaume", texte: "§7Chaque roi peut nommer des §ereprésentants§7 (bouton 👑 de ce menu, visible par le roi).\n\n§7Quand le roi est hors-ligne mais qu'un représentant est en ligne, le royaume compte comme §edéfendu§7 : les attaques (en guerre déclarée) sont autorisées.\n\n§7Choisis des joueurs de confiance : ils portent la défense du royaume en ton absence." },
];

export function openReglement(player, isAdminFn) {
  const admin = typeof isAdminFn === "function" ? isAdminFn(player) : false;
  const form = new ActionFormData().title("§f⚖ Règlement du serveur")
    .body("§7Les règles du royaume. La règle 4 est §eautomatisée§7 : le jeu la fait respecter tout seul.");
  for (const r of RULES) form.button(r.titre);
  const extra = [];
  if (isKingdomChief(player)) { form.button("§d👑 Mes représentants\n§7Qui défend mon royaume en mon absence"); extra.push("reps"); }
  if (admin) { form.button("§9⚙ Administration du règlement\n§7Prison, durées, avertissements, bans"); extra.push("admin"); }
  form.button("Fermer");
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    if (res.selection < RULES.length) {
      const r = RULES[res.selection];
      new ActionFormData().title(r.titre).body(r.texte).button("Retour").button("Fermer")
        .show(player).then((r2) => { if (!r2.canceled && r2.selection === 0) openReglement(player, isAdminFn); });
      return;
    }
    const a = extra[res.selection - RULES.length];
    if (a === "reps") openRepsMenu(player, isAdminFn);
    else if (a === "admin") openRulesAdmin(player, isAdminFn);
  });
}

// ── Représentants (roi) ──────────────────────────────────────────────────────
function openRepsMenu(player, isAdminFn) {
  const reps = loadObj(DP_REPS);
  const mine = Array.isArray(reps[player.name]) ? reps[player.name] : [];
  const online = world.getAllPlayers().map((p) => p.name).filter((n) => n !== player.name && !mine.includes(n));
  const form = new ActionFormData().title("§d👑 Mes représentants")
    .body("§7Quand tu es hors-ligne, ton royaume n'est attaquable §eque si un de tes représentants est en ligne§7.\n\n§6Représentants : §f" + (mine.length ? mine.join("§7, §f") : "§7aucun"));
  for (const n of mine) form.button("§cRetirer : §f" + n);
  for (const n of online) form.button("§aNommer : §f" + n);
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    const sel = res.selection;
    if (sel < mine.length) {
      const name = mine[sel];
      const map = loadObj(DP_REPS);
      map[player.name] = (map[player.name] || []).filter((x) => x !== name);
      if (!map[player.name].length) delete map[player.name];
      saveObj(DP_REPS, map);
      player.sendMessage("§e" + name + "§c n'est plus représentant de ton royaume.");
      const t = onlineByName(name); if (t) t.sendMessage("§cTu n'es plus représentant du royaume de §e" + player.name + "§c.");
      system.run(() => openRepsMenu(player, isAdminFn));
    } else if (sel < mine.length + online.length) {
      const name = online[sel - mine.length];
      const map = loadObj(DP_REPS);
      if (!Array.isArray(map[player.name])) map[player.name] = [];
      map[player.name].push(name);
      saveObj(DP_REPS, map);
      player.sendMessage("§e" + name + "§a est maintenant représentant de ton royaume.");
      const t = onlineByName(name); if (t) t.sendMessage("§aLe roi §e" + player.name + "§a t'a nommé §dreprésentant§a : sa présence compte sur toi quand il est absent.");
      system.run(() => openRepsMenu(player, isAdminFn));
    } else {
      openReglement(player, isAdminFn);
    }
  });
}

// ── Avertissements ───────────────────────────────────────────────────────────
export function warnPoints(name) {
  const w = loadObj(DP_WARNS)[name];
  return Array.isArray(w) ? w.reduce((s, e) => s + (e.pts || 1), 0) : 0;
}
export function addWarning(name, pts, reason) {
  const all = loadObj(DP_WARNS);
  if (!Array.isArray(all[name])) all[name] = [];
  all[name].push({ t: Date.now(), pts, reason });
  saveObj(DP_WARNS, all);
  const total = warnPoints(name);
  const cfg = getCfg();
  const p = onlineByName(name);
  if (p) p.sendMessage("§c⚠ Avertissement (" + pts + " pt" + (pts > 1 ? "s" : "") + ") : §f" + reason + "\n§7Total : §c" + total + "§7/§c" + cfg.warnLimit + "§7 points avant bannissement temporaire.");
  if (total >= cfg.warnLimit) {
    banPlayer(name, cfg.banHours, "Seuil d'avertissements atteint (" + total + " pts)");
    // remise à zéro après le ban automatique
    const cur = loadObj(DP_WARNS); delete cur[name]; saveObj(DP_WARNS, cur);
    return { banned: true, total };
  }
  return { banned: false, total };
}
function clearWarnings(name) { const all = loadObj(DP_WARNS); delete all[name]; saveObj(DP_WARNS, all); }

// ── Bannissement temporaire (expulsion) ──────────────────────────────────────
export function banPlayer(name, hours, reason) {
  const bans = loadObj(DP_BANS);
  bans[name] = { until: Date.now() + hours * 3600 * 1000, reason: reason || "Infraction au règlement" };
  saveObj(DP_BANS, bans);
  try { world.sendMessage("§c⛔ §e" + name + "§c est banni " + hours + " h : §f" + (reason || "infraction au règlement") + "§c."); } catch (e) {}
  enforceBan(onlineByName(name));
}
export function unbanPlayer(name) { const bans = loadObj(DP_BANS); delete bans[name]; saveObj(DP_BANS, bans); }
function banInfo(name) {
  const b = loadObj(DP_BANS)[name];
  if (b && typeof b.until === "number") {
    if (Date.now() < b.until) return b;
    unbanPlayer(name); // expiré
  }
  return null;
}
function enforceBan(p) {
  if (!p) return;
  const b = banInfo(p.name);
  if (!b) return;
  const msg = "Banni " + fmtDur(b.until - Date.now()) + " restant — " + (b.reason || "règlement");
  let kicked = false;
  try { p.dimension.runCommand('kick "' + p.name + '" ' + msg); kicked = true; } catch (e) {}
  if (!kicked) {
    // Secours (si /kick indisponible) : on l'envoie en cellule le temps du ban.
    const prison = loadObj(DP_PRISON);
    if (prison.cell) {
      try { p.setDynamicProperty(DP_JAIL, JSON.stringify({ until: b.until, reason: b.reason || "bannissement" })); } catch (e) {}
      tpTo(p, prison.cell);
    }
    try { p.sendMessage("§c⛔ Tu es banni (" + fmtDur(b.until - Date.now()) + " restant) : §f" + (b.reason || "règlement")); } catch (e) {}
  }
}

// ── Prison RP ────────────────────────────────────────────────────────────────
function tpTo(p, pos) {
  try { p.teleport({ x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { dimension: world.getDimension(pos.dim || "minecraft:overworld") }); } catch (e) {}
}
export function jailPlayer(target, minutes, reason) {
  const prison = loadObj(DP_PRISON);
  if (!prison.cell) return false;
  try { target.setDynamicProperty(DP_JAIL, JSON.stringify({ until: Date.now() + minutes * 60000, reason: reason || "sanction" })); } catch (e) { return false; }
  tpTo(target, prison.cell);
  try { target.sendMessage("§8🔒 Tu es en prison pour §f" + minutes + " min§8 : §f" + (reason || "sanction") + "§8. Tu seras libéré automatiquement."); } catch (e) {}
  return true;
}
export function freePlayer(target) {
  let had = false;
  try { had = typeof target.getDynamicProperty(DP_JAIL) === "string"; target.setDynamicProperty(DP_JAIL, undefined); } catch (e) {}
  const prison = loadObj(DP_PRISON);
  if (had && prison.exit) tpTo(target, prison.exit);
  if (had) try { target.sendMessage("§a🔓 Tu es libéré. Respecte le règlement."); } catch (e) {}
  return had;
}
function jailInfo(p) {
  try { const raw = p.getDynamicProperty(DP_JAIL); if (typeof raw === "string") { const o = JSON.parse(raw); if (o && typeof o.until === "number") return o; } } catch (e) {}
  return null;
}

// ── Règle 4 automatisée : attaque d'un royaume sans défenseur ────────────────
// Détection : un joueur frappe le drapeau de château, ou une unité inscrite à
// une caserne (sieged:castle_owner), d'un roi hors-ligne sans représentant en
// ligne. → avertissement + compte à rebours ; s'il est encore dans la zone à
// la fin, bannissement temporaire automatique.
const violations = new Map(); // playerId -> { king, until, loc, dimId, radius }

// Rayons de territoire de Sieged selon le niveau du royaume (tag sieged:tier.N
// sur le drapeau) : Colonie, Village, Ville, Cité, Royaume.
const TIER_RADIUS = [20, 24, 40, 64, 96];
const TERR_MARGIN = 8; // petite marge au-delà du territoire

// Admins/opérateurs : jamais sanctionnés par la règle automatique.
function isOperator(p) {
  try { const l = p.playerPermissionLevel; if (typeof l === "number" && l >= 2) return true; if (l !== undefined && String(l).toLowerCase().includes("operator")) return true; } catch (e) {}
  try { const c = p.commandPermissionLevel; if (typeof c === "number" && c >= 1) return true; } catch (e) {}
  return false;
}

// Centre et rayon du territoire du royaume attaqué : le drapeau du roi le plus
// proche de l'entité frappée, avec le rayon de son niveau. Secours : position
// de l'entité frappée + rayon de la config si le drapeau n'est pas chargé.
function territoryOf(king, ent, cfg) {
  try {
    const flags = ent.dimension.getEntities({ type: "sieged:castle_flag", location: ent.location, maxDistance: 160 });
    for (const flag of flags) {
      let mine = false, tier = 0;
      for (const t of flag.getTags()) {
        if (t === "sieged:owner." + king) mine = true;
        else if (t.startsWith("sieged:tier.")) { const n = parseInt(t.slice("sieged:tier.".length)); if (!isNaN(n)) tier = n; }
      }
      if (!mine) continue;
      const l = flag.location;
      return { loc: { x: l.x, y: l.y, z: l.z }, radius: (TIER_RADIUS[tier] ?? TIER_RADIUS[0]) + TERR_MARGIN };
    }
  } catch (e) {}
  const l = ent.location;
  return { loc: { x: l.x, y: l.y, z: l.z }, radius: cfg.radius };
}

function kingdomOfEntity(ent) {
  try {
    const tid = ent.typeId;
    if (tid === "sieged:castle_flag") {
      for (const t of ent.getTags()) if (t.startsWith("sieged:owner.")) return t.slice("sieged:owner.".length);
      return null;
    }
    if (tid.startsWith("sieged:")) {
      const o = ent.getDynamicProperty("sieged:castle_owner");
      if (typeof o === "string" && o) return o;
    }
  } catch (e) {}
  return null;
}

function kingdomDefended(king) {
  if (onlineByName(king)) return true;
  const reps = loadObj(DP_REPS)[king];
  if (Array.isArray(reps)) for (const n of reps) if (onlineByName(n)) return true;
  return false;
}

world.afterEvents.entityHurt.subscribe((ev) => {
  let atk;
  try {
    atk = ev.damageSource && ev.damageSource.damagingEntity;
    if (!atk || atk.typeId !== "minecraft:player") return;
  } catch (e) { return; }
  const king = kingdomOfEntity(ev.hurtEntity);
  if (!king || king === atk.name) return;
  if (kingdomDefended(king)) return;
  // le roi absent : l'attaquant est-il de ce royaume (roi = king) ? Les
  // représentants du roi ont le droit d'être là, pas d'attaquer non plus —
  // mais on ne punit pas le roi lui-même ni un admin en créatif.
  try { if (String(atk.getGameMode()).toLowerCase() === "creative") return; } catch (e) {}
  if (isOperator(atk)) return;

  const cfg = getCfg();
  const cur = violations.get(atk.id);
  if (cur && Date.now() < cur.until) return; // compte à rebours déjà en cours
  const terr = territoryOf(king, ev.hurtEntity, cfg);
  let dimId;
  try { dimId = ev.hurtEntity.dimension.id; } catch (e) { dimId = atk.dimension.id; }
  violations.set(atk.id, { king, until: Date.now() + cfg.countdown * 1000, loc: terr.loc, radius: terr.radius, dimId, name: atk.name });
  try {
    atk.onScreenDisplay.setTitle("§c⚠ INTERDIT", { fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 10, subtitle: "§fLe roi " + king + " est hors-ligne" });
  } catch (e) {}
  try {
    atk.sendMessage("§c⚠ Règle 4 : le royaume de §e" + king + "§c n'a aucun défenseur en ligne. Il est §cinterdit§c de l'attaquer.\n§eQuitte son territoire (" + Math.round(terr.radius) + " blocs autour du drapeau) avant " + cfg.countdown + " secondes§c : sinon, bannissement temporaire automatique. Si tu pars, seul un avertissement sera enregistré.");
    atk.playSound("note.bass", { pitch: 0.6 });
  } catch (e) {}
});

// Vérification légère toutes les 5 s : comptes à rebours, prison, bans.
system.runInterval(() => {
  const now = Date.now();
  // 1. comptes à rebours de la règle 4
  for (const [id, v] of violations) {
    if (now < v.until) continue;
    violations.delete(id);
    let p = null;
    try { p = world.getEntity(id); } catch (e) {}
    if (!p || p.typeId !== "minecraft:player") {
      // parti / déconnecté avant la fin : avertissement simple
      addWarning(v.name, 2, "Attaque du royaume de " + v.king + " sans défenseur en ligne (a quitté à temps ou s'est déconnecté)");
      continue;
    }
    const cfg = getCfg();
    const zone = v.radius || cfg.radius;
    let dist = Infinity;
    try { if (p.dimension.id === v.dimId) { const l = p.location; dist = Math.sqrt((l.x - v.loc.x) ** 2 + (l.y - v.loc.y) ** 2 + (l.z - v.loc.z) ** 2); } } catch (e) {}
    if (dist <= zone) {
      addWarning(p.name, 3, "Est resté malgré l'avertissement : attaque du royaume de " + v.king + " sans défenseur");
      banPlayer(p.name, cfg.banHours, "Attaque d'un royaume sans défenseur en ligne (règle 4)");
    } else {
      const r = addWarning(p.name, 2, "Attaque du royaume de " + v.king + " sans défenseur en ligne (a quitté la zone à temps)");
      if (!r.banned) try { p.sendMessage("§6Tu as quitté la zone à temps : avertissement enregistré (§c" + r.total + "§6 pts)."); } catch (e) {}
    }
  }
  // 2. prison + bans (joueurs en ligne uniquement)
  const prison = loadObj(DP_PRISON);
  for (const p of world.getAllPlayers()) {
    const j = jailInfo(p);
    if (j) {
      if (now >= j.until) { freePlayer(p); continue; }
      if (prison.cell) {
        let far = true;
        try { if (p.dimension.id === (prison.cell.dim || "minecraft:overworld")) { const l = p.location; far = Math.sqrt((l.x - prison.cell.x) ** 2 + (l.y - prison.cell.y) ** 2 + (l.z - prison.cell.z) ** 2) > 24; } } catch (e) {}
        if (far) { tpTo(p, prison.cell); try { p.onScreenDisplay.setActionBar("§8🔒 Reste dans ta cellule (" + fmtDur(j.until - now) + " restant)."); } catch (e) {} }
      }
      continue;
    }
    if (banInfo(p.name)) enforceBan(p);
  }
}, 100);

// À la connexion : bans à appliquer immédiatement.
world.afterEvents.playerSpawn.subscribe((ev) => {
  if (!ev.initialSpawn || !ev.player) return;
  const p = ev.player;
  system.runTimeout(() => {
    try {
      if (banInfo(p.name)) { enforceBan(p); return; }
      const j = jailInfo(p);
      if (j && Date.now() >= j.until) freePlayer(p);
    } catch (e) {}
  }, 20);
});

// ── Administration du règlement ──────────────────────────────────────────────
function openRulesAdmin(player, isAdminFn) {
  const cfg = getCfg();
  const prison = loadObj(DP_PRISON);
  const bans = loadObj(DP_BANS);
  const activeBans = Object.keys(bans).filter((n) => bans[n] && Date.now() < bans[n].until);
  new ActionFormData().title("§9⚙ Administration du règlement")
    .body(
      "§7Compte à rebours règle 4 : §f" + cfg.countdown + " s\n" +
      "§7Zone interdite : §fterritoire réel du royaume§7 (20→96 blocs selon son niveau)\n" +
      "§7Rayon de secours (drapeau introuvable) : §f" + cfg.radius + " blocs\n" +
      "§7Durée du ban auto : §f" + cfg.banHours + " h\n" +
      "§7Seuil d'avertissements : §f" + cfg.warnLimit + " pts\n" +
      "§7Cellule : §f" + (prison.cell ? Math.floor(prison.cell.x) + " " + Math.floor(prison.cell.y) + " " + Math.floor(prison.cell.z) : "§cnon définie") + "\n" +
      "§7Sortie de prison : §f" + (prison.exit ? Math.floor(prison.exit.x) + " " + Math.floor(prison.exit.y) + " " + Math.floor(prison.exit.z) : "§cnon définie") + "\n" +
      "§7Bans en cours : §f" + activeBans.length
    )
    .button("§8🔒 Définir la cellule ICI")
    .button("§a🚪 Définir la sortie ICI")
    .button("§e⏱ Régler les durées et seuils")
    .button("§c⛔ Bans en cours (lever un ban)")
    .button("Retour")
    .show(player).then((res) => {
      if (res.canceled || res.selection === undefined || res.selection === 4) { if (res.selection === 4) openReglement(player, isAdminFn); return; }
      if (res.selection === 0 || res.selection === 1) {
        const cur = loadObj(DP_PRISON);
        const l = player.location;
        const pos = { x: Math.floor(l.x), y: Math.floor(l.y), z: Math.floor(l.z), dim: player.dimension.id };
        if (res.selection === 0) { cur.cell = pos; player.sendMessage("§aCellule définie ici."); }
        else { cur.exit = pos; player.sendMessage("§aSortie de prison définie ici."); }
        saveObj(DP_PRISON, cur);
        system.run(() => openRulesAdmin(player, isAdminFn));
      } else if (res.selection === 2) {
        const f = new ModalFormData().title("Durées et seuils")
          .textField("Compte à rebours de la règle 4 (secondes)", String(cfg.countdown), { defaultValue: String(cfg.countdown) })
          .textField("Rayon de secours en blocs (utilisé seulement si le drapeau est introuvable)", String(cfg.radius), { defaultValue: String(cfg.radius) })
          .textField("Durée du bannissement automatique (heures)", String(cfg.banHours), { defaultValue: String(cfg.banHours) })
          .textField("Seuil d'avertissements avant ban (points)", String(cfg.warnLimit), { defaultValue: String(cfg.warnLimit) });
        f.show(player).then((r) => {
          if (r.canceled) { openRulesAdmin(player, isAdminFn); return; }
          const nums = r.formValues.map((v) => parseInt(String(v || "").trim(), 10));
          const nc = getCfg();
          if (Number.isFinite(nums[0]) && nums[0] >= 10) nc.countdown = nums[0];
          if (Number.isFinite(nums[1]) && nums[1] >= 8) nc.radius = nums[1];
          if (Number.isFinite(nums[2]) && nums[2] >= 1) nc.banHours = nums[2];
          if (Number.isFinite(nums[3]) && nums[3] >= 1) nc.warnLimit = nums[3];
          saveCfg(nc);
          player.sendMessage("§aRéglages du règlement enregistrés.");
          openRulesAdmin(player, isAdminFn);
        });
      } else if (res.selection === 3) {
        if (!activeBans.length) { player.sendMessage("§7Aucun ban en cours."); openRulesAdmin(player, isAdminFn); return; }
        const form = new ActionFormData().title("§c⛔ Bans en cours").body("Touche un joueur pour lever son ban.");
        for (const n of activeBans) form.button(n + "\n§7" + fmtDur(bans[n].until - Date.now()) + " restant — " + (bans[n].reason || ""));
        form.button("Retour");
        form.show(player).then((r) => {
          if (r.canceled || r.selection === undefined || r.selection >= activeBans.length) { openRulesAdmin(player, isAdminFn); return; }
          unbanPlayer(activeBans[r.selection]);
          player.sendMessage("§aBan de " + activeBans[r.selection] + " levé.");
          openRulesAdmin(player, isAdminFn);
        });
      }
    });
}

// ── Menu Sanctions pour « Gérer un joueur » ──────────────────────────────────
export function openSanctions(viewer, target, backFn) {
  const pts = warnPoints(target.name);
  const cfg = getCfg();
  const j = jailInfo(target);
  const b = banInfo(target.name);
  new ActionFormData().title("§c⚔ Sanctions — " + target.name)
    .body(
      "§7Avertissements : §c" + pts + "§7/§c" + cfg.warnLimit + "§7 pts\n" +
      (j ? "§8🔒 En prison : " + fmtDur(j.until - Date.now()) + " restant\n" : "") +
      (b ? "§c⛔ Banni : " + fmtDur(b.until - Date.now()) + " restant\n" : "")
    )
    .button("§e⚠ Avertissement léger (1 pt)")
    .button("§6⚠ Avertissement sérieux (2 pts)")
    .button("§c⚠ Avertissement grave (3 pts)")
    .button("§7Effacer ses avertissements")
    .button("§8🔒 Envoyer en prison")
    .button("§a🔓 Libérer de prison")
    .button("§c⛔ Bannir temporairement")
    .button("§aLever son ban")
    .button("Retour")
    .show(viewer).then((res) => {
      if (res.canceled || res.selection === undefined || res.selection === 8) { if (res.selection === 8 && backFn) backFn(); return; }
      const sel = res.selection;
      if (sel <= 2) {
        const pts2 = sel + 1;
        const f = new ModalFormData().title("Avertissement — " + target.name)
          .textField("Motif (visible par le joueur)", "ex : pillage hors guerre", { defaultValue: "" });
        f.show(viewer).then((r) => {
          if (r.canceled) { openSanctions(viewer, target, backFn); return; }
          const reason = String(r.formValues[0] || "").trim() || "infraction au règlement";
          const out = addWarning(target.name, pts2, reason);
          viewer.sendMessage("§aAvertissement (" + pts2 + " pt" + (pts2 > 1 ? "s" : "") + ") enregistré pour " + target.name + " — total " + out.total + " pts" + (out.banned ? " §c(ban automatique déclenché)" : "") + ".");
          openSanctions(viewer, target, backFn);
        });
      } else if (sel === 3) {
        clearWarnings(target.name);
        viewer.sendMessage("§aAvertissements de " + target.name + " effacés.");
        openSanctions(viewer, target, backFn);
      } else if (sel === 4) {
        const prison = loadObj(DP_PRISON);
        if (!prison.cell) { viewer.sendMessage("§cDéfinis d'abord la cellule : ⚖ Règlement → ⚙ Administration → Définir la cellule ICI."); openSanctions(viewer, target, backFn); return; }
        const f = new ModalFormData().title("Prison — " + target.name)
          .textField("Durée en minutes", "30", { defaultValue: "30" })
          .textField("Motif", "ex : pillage hors guerre", { defaultValue: "" });
        f.show(viewer).then((r) => {
          if (r.canceled) { openSanctions(viewer, target, backFn); return; }
          const mins = parseInt(String(r.formValues[0] || "").trim(), 10);
          if (!Number.isFinite(mins) || mins < 1) { viewer.sendMessage("§cDurée invalide."); openSanctions(viewer, target, backFn); return; }
          const reason = String(r.formValues[1] || "").trim() || "sanction";
          if (jailPlayer(target, mins, reason)) viewer.sendMessage("§a" + target.name + " envoyé en cellule pour " + mins + " min.");
          else viewer.sendMessage("§cImpossible (cellule non définie ?).");
          openSanctions(viewer, target, backFn);
        });
      } else if (sel === 5) {
        viewer.sendMessage(freePlayer(target) ? "§a" + target.name + " libéré." : "§7" + target.name + " n'était pas en prison.");
        openSanctions(viewer, target, backFn);
      } else if (sel === 6) {
        const f = new ModalFormData().title("Bannir — " + target.name)
          .textField("Durée en heures", String(cfg.banHours), { defaultValue: String(cfg.banHours) })
          .textField("Motif", "ex : récidive de pillage", { defaultValue: "" });
        f.show(viewer).then((r) => {
          if (r.canceled) { openSanctions(viewer, target, backFn); return; }
          const hours = parseInt(String(r.formValues[0] || "").trim(), 10);
          if (!Number.isFinite(hours) || hours < 1) { viewer.sendMessage("§cDurée invalide."); openSanctions(viewer, target, backFn); return; }
          banPlayer(target.name, hours, String(r.formValues[1] || "").trim() || "décision administrateur");
          viewer.sendMessage("§a" + target.name + " banni " + hours + " h.");
          if (backFn) backFn();
        });
      } else if (sel === 7) {
        unbanPlayer(target.name);
        viewer.sendMessage("§aBan de " + target.name + " levé (s'il en avait un).");
        openSanctions(viewer, target, backFn);
      }
    });
}
