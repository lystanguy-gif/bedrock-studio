// ===== Troupes de siège : boutique d'œufs + recrutement à l'émeraude =====
// Tout est fait ici, dans ROYAUME SIEGE FR — l'add-on Sieged n'est pas modifié.
//
// Parcours joueur :
//   1. Menu d'Alcadia → « ⚔ Troupes de siège » : acheter des œufs contre des émeraudes.
//   2. Poser l'œuf où l'on veut : l'unité apparaît sauvage.
//   3. Émeraude en main + interagir sur l'unité : elle est recrutée (1 émeraude,
//      réussite garantie) et rejoint la caserne du drapeau du joueur s'il y en a
//      un à moins de 48 blocs.
//
// Détails techniques :
// - Sieged donne 33 % de chance de réussite par émeraude (composant tameable
//   vanilla) et n'inscrit pas l'unité dans sa caserne. Ce script force la
//   réussite juste après l'interaction et pose les propriétés que Sieged
//   utilise (sieged:tamed, sieged:owner, sieged:castle_id, sieged:castle_owner).
// - Chevalier et Garde-bannière sont déjà recrutés à 1 émeraude garantie par
//   les scripts de Sieged : on ne les traite pas ici (pas de double dépense).
// - Aucune boucle ni runInterval : uniquement des événements d'interaction.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { container, countItem, removeItem } from "./util.js";

const EMERALD = "minecraft:emerald";

// ── Réservé aux chefs de royaume ─────────────────────────────────────────────
// Sieged pose le tag « sieged_rank_king » sur le roi quand il utilise son
// drapeau. En secours (tag pas encore posé), on accepte aussi un joueur dont
// un drapeau chargé à proximité porte son nom (tag « sieged:owner.<nom> »).
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

const NOT_CHIEF_MSG = "§cSeul un §echef de royaume§c peut lever une armée. Fonde ton royaume (pose ton drapeau de château), puis reviens.";

// Catalogue : œufs d'apparition des unités alliées de Sieged.
const CATALOG = [
  { egg: "sieged:warder_spawn_egg",       name: "Gardien",        cost: 8,  desc: "Fantassin à l'épée, solide et polyvalent." },
  { egg: "sieged:sentinel_spawn_egg",     name: "Sentinelle",     cost: 8,  desc: "Archer de garnison, tient les remparts." },
  { egg: "sieged:chevalier_spawn_egg",    name: "Chevalier",      cost: 12, desc: "Cavalerie lourde, charge dévastatrice." },
  { egg: "sieged:templar_spawn_egg",      name: "Templier",       cost: 14, desc: "Élite en armure lourde." },
  { egg: "sieged:banner_guard_spawn_egg", name: "Garde-bannière", cost: 24, desc: "Commandant : suivre, tenir, formations, pluie de flèches." },
];

export function openTroupesShop(player) {
  if (!isKingdomChief(player)) {
    new ActionFormData()
      .title("§2⚔ Troupes de siège")
      .body("§cRéservé aux chefs de royaume.\n\n§7Cette boutique permet de lever une armée : seul le §eroi§7 d'un royaume (celui qui a posé le §fdrapeau de château§7) peut y acheter des troupes.\n\n§8Astuce : si tu es bien roi, ouvre d'abord le menu de ton drapeau (le tag de rang se met à jour), ou tiens-toi près de ton drapeau.")
      .button("Fermer")
      .show(player);
    return;
  }
  const cont = container(player);
  const have = cont ? countItem(cont, EMERALD) : 0;
  const form = new ActionFormData()
    .title("§2⚔ Troupes de siège")
    .body(
      "§7Achète des §fœufs de troupes§7, pose-les où tu veux, puis §eémeraude en main + interagir§7 sur l'unité pour la recruter §8(1 émeraude, réussite garantie)§7.\n" +
      "§7Si ton §fdrapeau de royaume§7 est à moins de 48 blocs, la recrue rejoint aussi ta §fcaserne§7.\n\n" +
      "§6Tes émeraudes : §e" + have
    );
  for (const u of CATALOG) {
    const ok = have >= u.cost;
    form.button(
      (ok ? "§8" : "§c") + "Œuf : §r" + (ok ? "§2" : "§c") + u.name + "  §8—§e " + u.cost + " ém\n§7" + u.desc
    );
  }
  form.button("Fermer");
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined || res.selection >= CATALOG.length) return;
    buyEgg(player, CATALOG[res.selection]);
  });
}

function buyEgg(player, u) {
  if (!isKingdomChief(player)) { player.sendMessage(NOT_CHIEF_MSG); return; }
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
  player.sendMessage("§aŒuf de §2" + u.name + "§a acheté pour §e" + u.cost + "§a émeraudes. Pose-le, puis recrute l'unité avec §eune émeraude en main§a.");
  try { player.playSound("random.orb"); } catch (e) {}
  // On rouvre la boutique pour enchaîner les achats.
  system.runTimeout(() => { try { openTroupesShop(player); } catch (e) {} }, 8);
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

  // La réussite garantie est un privilège de chef de royaume ; les autres
  // joueurs gardent la chance vanilla de Sieged (33 % par émeraude).
  if (!isKingdomChief(player)) {
    player.onScreenDisplay.setActionBar("§7Recrutement fiable réservé aux §echefs de royaume§7 — tentative normale (1 chance sur 3).");
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
      const enrolled = enrollAtNearbyFlag(player, target);
      player.onScreenDisplay.setActionBar(
        enrolled
          ? "§a" + name + " recruté ! Il rejoint la caserne de ton royaume."
          : "§a" + name + " recruté ! §7(Aucun drapeau à toi à moins de 48 blocs : pas d'inscription en caserne.)"
      );
      try { player.playSound("random.levelup", { pitch: 1.2 }); } catch (e) {}
    } catch (e) {}
  });
});

// Inscrit l'unité dans la caserne du drapeau du joueur le plus proche (48 blocs).
// Reproduit ce que fait Sieged quand il recrute au drapeau : sieged:castle_id
// + sieged:castle_owner, lus par la caserne et l'appel aux armes.
function enrollAtNearbyFlag(player, unit) {
  try {
    const flags = unit.dimension.getEntities({ type: "sieged:castle_flag", location: unit.location, maxDistance: 48 });
    for (const flag of flags) {
      let owner = null;
      try { for (const t of flag.getTags()) if (t.startsWith("sieged:owner.")) { owner = t.slice("sieged:owner.".length); break; } } catch (e) {}
      if (!owner || owner !== player.name) continue;
      const castleId = flag.getDynamicProperty("sieged:castle_id");
      if (!castleId) continue;
      unit.setDynamicProperty("sieged:castle_id", castleId);
      unit.setDynamicProperty("sieged:castle_owner", owner);
      return true;
    }
  } catch (e) {}
  return false;
}
