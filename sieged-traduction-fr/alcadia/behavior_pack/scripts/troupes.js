// ===== Troupes de siège : boutique d'œufs + recrutement à l'émeraude =====
// Tout est fait ici, dans ROYAUME SIEGE FR — l'add-on Sieged n'est pas modifié.
//
// Règles :
//   - Réservé aux joueurs qui ONT un royaume : le roi (celui qui a posé le
//     drapeau de château) y accède d'office.
//   - Le roi peut AUTORISER des membres de son royaume à acheter aussi
//     (bouton « Autorisations » de la boutique) et retirer ce droit à tout
//     moment. Les recrues d'un membre autorisé rejoignent la caserne du
//     royaume du roi.
//   - Personne d'autre ne peut acheter ni profiter du recrutement garanti.
//
// Parcours joueur :
//   1. Menu d'Alcadia → « ⚔ Troupes de siège » : acheter des œufs contre des
//      émeraudes.
//   2. Poser l'œuf où l'on veut : l'unité apparaît sauvage.
//   3. Émeraude en main + interagir sur l'unité : recrutée (1 émeraude,
//      réussite garantie) + caserne du drapeau du royaume s'il est à moins
//      de 48 blocs.
//
// Détails techniques :
// - Sieged donne 33 % de réussite par émeraude (tameable vanilla) et
//   n'inscrit pas l'unité en caserne. Ce script force la réussite juste
//   après l'interaction et pose les propriétés que Sieged utilise
//   (sieged:tamed, sieged:owner, sieged:castle_id, sieged:castle_owner).
// - Chevalier et Garde-bannière sont déjà recrutés à 1 émeraude garantie par
//   les scripts de Sieged : on ne les traite pas ici (pas de double dépense).
// - Aucune boucle ni runInterval : uniquement des événements d'interaction.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { container, countItem, removeItem } from "./util.js";

const EMERALD = "minecraft:emerald";

// Catalogue : œufs d'apparition des unités alliées de Sieged.
const CATALOG = [
  { egg: "minecraft:villager_spawn_egg",  name: "Villageois",     cost: 6,  desc: "Population du royaume : compte pour monter de niveau, se marchande, paie l'impôt.", direct: true },
  { egg: "sieged:warder_spawn_egg",       name: "Gardien",        cost: 8,  desc: "Fantassin à l'épée, solide et polyvalent." },
  { egg: "sieged:sentinel_spawn_egg",     name: "Sentinelle",     cost: 8,  desc: "Archer de garnison, tient les remparts." },
  { egg: "sieged:chevalier_spawn_egg",    name: "Chevalier",      cost: 12, desc: "Cavalerie lourde, charge dévastatrice." },
  { egg: "sieged:templar_spawn_egg",      name: "Templier",       cost: 14, desc: "Élite en armure lourde." },
  { egg: "sieged:banner_guard_spawn_egg", name: "Garde-bannière", cost: 24, desc: "Commandant : suivre, tenir, formations, pluie de flèches." },
];

// ── Qui a le droit ? ─────────────────────────────────────────────────────────
// Le roi : tag « sieged_rank_king » posé par Sieged quand il utilise son
// drapeau ; en secours, un drapeau chargé à son nom (tag « sieged:owner.<nom> »)
// à moins de 96 blocs.
export function isKingdomChief(player) {
  try { if (player.hasTag("sieged_rank_king")) return true; } catch (e) {}
  try {
    const flags = player.dimension.getEntities({ type: "sieged:castle_flag", location: player.location, maxDistance: 96 });
    for (const flag of flags)
      for (const t of flag.getTags())
        if (t === "sieged:owner." + player.name) return true;
  } catch (e) {}
  return false;
}

// Autorisations accordées par les rois, stockées sur le monde :
// { "<nomDuRoi>": ["membre1", "membre2", ...], ... }
const DP_AUTH = "troupes:auth";
function getAuthMap() {
  try {
    const raw = world.getDynamicProperty(DP_AUTH);
    if (typeof raw === "string") { const o = JSON.parse(raw); if (o && typeof o === "object" && !Array.isArray(o)) return o; }
  } catch (e) {}
  return {};
}
function saveAuthMap(o) { try { world.setDynamicProperty(DP_AUTH, JSON.stringify(o)); } catch (e) {} }

// Renvoie le nom du roi pour lequel ce joueur peut acheter, ou null.
// Le roi achète pour lui-même ; un membre autorisé achète pour son roi.
function shopKingdomOf(player) {
  if (isKingdomChief(player)) return player.name;
  const auth = getAuthMap();
  for (const king in auth) {
    if (Array.isArray(auth[king]) && auth[king].includes(player.name)) return king;
  }
  return null;
}

// ── Boutique ─────────────────────────────────────────────────────────────────
export function openTroupesShop(player) {
  const kingName = shopKingdomOf(player);
  if (!kingName) {
    new ActionFormData()
      .title("§2⚔ Troupes de siège")
      .body(
        "§cRéservé aux royaumes.\n\n" +
        "§7Seul le §eroi§7 (celui qui a posé le §fdrapeau de château§7) peut lever une armée ici — ou un membre que le roi a §eautorisé§7 depuis ce menu.\n\n" +
        "§8Si tu es roi et que ce message s'affiche : ouvre une fois le menu de ton drapeau (ton rang se met à jour), ou tiens-toi près de ton drapeau.\n" +
        "§8Si tu es membre d'un royaume : demande à ton roi de t'ajouter dans ⚔ Troupes de siège → Autorisations."
      )
      .button("Fermer")
      .show(player);
    return;
  }
  const isChief = kingName === player.name;
  const cont = container(player);
  const have = cont ? countItem(cont, EMERALD) : 0;
  const form = new ActionFormData()
    .title("§2⚔ Troupes de siège")
    .body(
      (isChief ? "§7Tu lèves l'armée de §eton royaume§7." : "§7Tu lèves l'armée du royaume de §e" + kingName + "§7.") + "\n" +
      "§7Achète des §fœufs de troupes§7, pose-les, puis §eémeraude en main + interagir§7 sur l'unité pour la recruter §8(1 émeraude, réussite garantie)§7.\n" +
      "§7Si le §fdrapeau du royaume§7 est à moins de 48 blocs, la recrue rejoint aussi la §fcaserne§7.\n\n" +
      "§6Tes émeraudes : §e" + have
    );
  for (const u of CATALOG) {
    const ok = have >= u.cost;
    form.button(
      (ok ? "§8" : "§c") + "Œuf : §r" + (ok ? "§2" : "§c") + u.name + "  §8—§e " + u.cost + " ém\n§7" + u.desc
    );
  }
  const btnAuth = isChief ? CATALOG.length : -1;
  if (isChief) form.button("§6🛡 Autorisations\n§7Choisir qui peut acheter pour ton royaume");
  form.button("Fermer");
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    if (res.selection < CATALOG.length) { buyEgg(player, CATALOG[res.selection]); return; }
    if (res.selection === btnAuth) openAuthMenu(player);
  });
}

function buyEgg(player, u) {
  if (!shopKingdomOf(player)) { player.sendMessage("§cSeuls le roi d'un royaume et ses membres autorisés peuvent lever une armée."); return; }
  const cont = container(player);
  const have = cont ? countItem(cont, EMERALD) : 0;
  if (have < u.cost) {
    player.sendMessage("§cIl te faut §e" + u.cost + "§c émeraudes pour un œuf de " + u.name + " (tu en as " + have + ").");
    return;
  }
  let stack = null;
  try { stack = new ItemStack(u.egg, 1); } catch (e) {}
  if (!stack) { player.sendMessage("§cŒuf introuvable (" + u.egg + "). L'add-on Sieged est-il bien actif sur ce monde ?"); return; }
  if (!removeItem(cont, EMERALD, u.cost)) { player.sendMessage("§cPaiement impossible."); return; }
  const leftover = cont.addItem(stack);
  if (leftover) { try { player.dimension.spawnItem(leftover, player.location); } catch (e) {} }
  player.sendMessage(u.direct
    ? "§aŒuf de §2" + u.name + "§a acheté pour §e" + u.cost + "§a émeraudes. Pose-le dans ton territoire : il rejoint ta population directement."
    : "§aŒuf de §2" + u.name + "§a acheté pour §e" + u.cost + "§a émeraudes. Pose-le, puis recrute l'unité avec §eune émeraude en main§a.");
  try { player.playSound("random.orb"); } catch (e) {}
  // On rouvre la boutique pour enchaîner les achats.
  system.runTimeout(() => { try { openTroupesShop(player); } catch (e) {} }, 8);
}

// ── Autorisations (réservé au roi) ───────────────────────────────────────────
// Le roi choisit parmi les MEMBRES DE SON ROYAUME (liste sieged:members du
// drapeau). Le drapeau doit être chargé (roi à moins de 96 blocs) pour lire la
// liste ; sinon on propose les joueurs en ligne en dépannage.
function myFlagMembers(player) {
  try {
    const flags = player.dimension.getEntities({ type: "sieged:castle_flag", location: player.location, maxDistance: 96 });
    for (const flag of flags) {
      let mine = false;
      try { for (const t of flag.getTags()) if (t === "sieged:owner." + player.name) { mine = true; break; } } catch (e) {}
      if (!mine) continue;
      const raw = flag.getDynamicProperty("sieged:members");
      if (typeof raw === "string") { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr.map((m) => m && m.name).filter(Boolean); }
      return [];
    }
  } catch (e) {}
  return null; // drapeau non chargé / introuvable
}

function openAuthMenu(player) {
  if (!isKingdomChief(player)) { player.sendMessage("§cSeul le roi gère les autorisations."); return; }
  const auth = getAuthMap();
  const granted = Array.isArray(auth[player.name]) ? auth[player.name] : [];

  // Candidats : membres du royaume (drapeau proche), sinon joueurs en ligne.
  let members = myFlagMembers(player);
  let fallback = false;
  if (members === null) {
    fallback = true;
    members = world.getAllPlayers().map((p) => p.name).filter((n) => n !== player.name);
  }
  const candidates = members.filter((n) => n !== player.name && !granted.includes(n));

  const form = new ActionFormData()
    .title("§6🛡 Autorisations d'achat")
    .body(
      "§7Les joueurs autorisés peuvent acheter des troupes §epour ton royaume§7 et profiter du recrutement garanti.\n" +
      (fallback ? "§8(Drapeau trop loin : liste des joueurs en ligne. Rapproche-toi de ton drapeau pour voir les membres du royaume.)\n" : "§8(Liste des membres de ton royaume.)\n") +
      "\n§6Autorisés : §f" + (granted.length ? granted.join("§7, §f") : "§7personne")
    );
  for (const n of granted) form.button("§cRetirer : §f" + n);
  for (const n of candidates) form.button("§aAutoriser : §f" + n);
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    const sel = res.selection;
    if (sel < granted.length) {
      const name = granted[sel];
      const map = getAuthMap();
      map[player.name] = (map[player.name] || []).filter((x) => x !== name);
      if (!map[player.name].length) delete map[player.name];
      saveAuthMap(map);
      player.sendMessage("§e" + name + "§c ne peut plus acheter de troupes pour ton royaume.");
      notify(name, "§cLe roi §e" + player.name + "§c t'a retiré le droit d'acheter des troupes de siège.");
      system.run(() => openAuthMenu(player));
    } else if (sel < granted.length + candidates.length) {
      const name = candidates[sel - granted.length];
      const map = getAuthMap();
      if (!Array.isArray(map[player.name])) map[player.name] = [];
      if (!map[player.name].includes(name)) map[player.name].push(name);
      saveAuthMap(map);
      player.sendMessage("§e" + name + "§a peut maintenant acheter des troupes pour ton royaume.");
      notify(name, "§aLe roi §e" + player.name + "§a t'autorise à acheter des §2⚔ Troupes de siège§a (menu d'Alcadia).");
      system.run(() => openAuthMenu(player));
    } else {
      openTroupesShop(player);
    }
  });
}

function notify(playerName, msg) {
  try { const p = world.getAllPlayers().find((x) => x.name === playerName); if (p) p.sendMessage(msg); } catch (e) {}
}

// ── Recrutement à l'émeraude, réussite garantie ─────────────────────────────
// Gardien, Sentinelle et Templier seulement : Chevalier et Garde-bannière ont
// déjà leur propre recrutement garanti dans les scripts de Sieged.
const RECRUIT_TYPES = new Set(["sieged:warder", "sieged:sentinel", "sieged:templar"]);
const RECRUIT_NAMES = { "sieged:warder": "Gardien", "sieged:sentinel": "Sentinelle", "sieged:templar": "Templier" };

world.afterEvents.playerInteractWithEntity.subscribe((ev) => {
  const player = ev.player;
  const target = ev.target;
  if (!player || !target) return;
  let tid; try { tid = target.typeId; } catch (e) { return; }
  if (!RECRUIT_TYPES.has(tid)) return;

  // Déjà recruté par quelqu'un ?
  try { if (target.getDynamicProperty("sieged:tamed") === true) return; } catch (e) { return; }

  // Le joueur doit tenir une émeraude (le moteur vient d'en consommer une
  // pour la tentative vanilla — on garantit juste que cette tentative réussit).
  let held = ev.itemStack;
  if (!held) { try { held = player.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch (e) {} }
  if (!held || held.typeId !== EMERALD) return;

  // La réussite garantie est un privilège du royaume : roi ou membre autorisé.
  // Les autres joueurs gardent la chance vanilla de Sieged (33 % par émeraude).
  const kingName = shopKingdomOf(player);
  if (!kingName) {
    player.onScreenDisplay.setActionBar("§7Recrutement fiable réservé aux §eroyaumes§7 — tentative normale (1 chance sur 3).");
    return;
  }

  system.run(() => {
    try {
      if (!target.isValid) return;
      if (target.getDynamicProperty("sieged:tamed") === true) return;
      // Force la réussite si la tentative vanilla (33 %) a échoué.
      try {
        const tameable = target.getComponent("minecraft:tameable");
        if (tameable) tameable.tame(player);
        else target.triggerEvent("minecraft:on_tame");
      } catch (e) {}
      // Propriétés utilisées par les scripts de Sieged (caserne, Registre, commandement).
      target.setDynamicProperty("sieged:tamed", true);
      target.setDynamicProperty("sieged:owner", player.id);

      const name = RECRUIT_NAMES[tid] || "Unité";
      const enrolled = enrollAtNearbyFlag(kingName, target);
      player.onScreenDisplay.setActionBar(
        enrolled
          ? "§a" + name + " recruté ! Il rejoint la caserne du royaume."
          : "§a" + name + " recruté ! §7(Drapeau du royaume à plus de 48 blocs : pas d'inscription en caserne.)"
      );
      try { player.playSound("random.levelup", { pitch: 1.2 }); } catch (e) {}
    } catch (e) {}
  });
});

// Inscrit l'unité dans la caserne du drapeau du royaume (roi = kingName) le
// plus proche (48 blocs). Reproduit ce que fait Sieged quand il recrute au
// drapeau : sieged:castle_id + sieged:castle_owner, lus par la caserne et
// l'appel aux armes.
function enrollAtNearbyFlag(kingName, unit) {
  try {
    const flags = unit.dimension.getEntities({ type: "sieged:castle_flag", location: unit.location, maxDistance: 48 });
    for (const flag of flags) {
      let owner = null;
      try { for (const t of flag.getTags()) if (t.startsWith("sieged:owner.")) { owner = t.slice("sieged:owner.".length); break; } } catch (e) {}
      if (!owner || owner !== kingName) continue;
      const castleId = flag.getDynamicProperty("sieged:castle_id");
      if (!castleId) continue;
      unit.setDynamicProperty("sieged:castle_id", castleId);
      unit.setDynamicProperty("sieged:castle_owner", owner);
      return true;
    }
  } catch (e) {}
  return false;
}
