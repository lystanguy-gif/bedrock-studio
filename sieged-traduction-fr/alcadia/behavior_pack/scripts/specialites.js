// ===== Spécialités : le savoir-faire du personnage =====
// Troisième pilier du personnage après le gabarit (le corps) et la
// civilisation (le peuple). Une seule spécialité par joueur :
//   ⚒ Forgeron      — -15 % chez les marchands PNJ, matériel qui s'use moins
//                     vite, parfois un lingot direct en minant du fer
//   ⚔ Maître d'épée — tous les 5 coups d'épée, un coup puissant (dégâts bonus)
//   🏹 Maître archer — toutes les 10 flèches tirées, 2 flèches récupérées
//   🌾 Agriculteur   — récoltes mûres : 30 % de chance de récolte double
//   ⛏ Mineur        — minerais : 20 % de chance de minerai bonus
//   🪓 Bûcheron      — bûches : 25 % de chance de bûche bonus
//
// Choisie à la création du personnage ; changement possible ensuite pour
// 32 émeraudes (gratuit pour l'admin via Gérer un joueur).
// Coût : événements (coups, blocs cassés, flèches) + UNE petite vérification
// toutes les 30 s pour l'entretien du matériel du forgeron. Aucun scan lourd.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { container, countItem, removeItem, giveCustom } from "./util.js";

const DP_SPEC = "spec:id";
const EMERALD = "minecraft:emerald";
const CHANGE_COST = 32;

// Réglages des bonus (petits mais réguliers, pour ne pas casser l'économie).
const SWORD_EVERY = 5;      // un coup puissant tous les N coups d'épée
const SWORD_BONUS = 3;      // dégâts bonus (1,5 cœur)
const ARROW_EVERY = 10;     // récupération toutes les N flèches
const ARROW_BACK  = 2;      // flèches rendues
const FARM_CHANCE = 0.30;
const MINE_CHANCE = 0.20;
const WOOD_CHANCE = 0.25;
const SMITH_INGOT_CHANCE = 0.20;
const MERCHANT_DISCOUNT = 0.85; // -15 %

export const SPECS = [
  { id: "forgeron",    nom: "⚒ Forgeron",      desc: "-15 % chez les marchands PNJ, matériel qui s'use moins vite, parfois un lingot direct en minant du fer." },
  { id: "epee",        nom: "⚔ Maître d'épée", desc: "Tous les " + SWORD_EVERY + " coups d'épée, un coup puissant qui fait des dégâts bonus." },
  { id: "archer",      nom: "🏹 Maître archer", desc: "Toutes les " + ARROW_EVERY + " flèches tirées, tu en récupères " + ARROW_BACK + "." },
  { id: "agriculteur", nom: "🌾 Agriculteur",   desc: "Cultures mûres : " + Math.round(FARM_CHANCE * 100) + " % de chance de récolte double." },
  { id: "mineur",      nom: "⛏ Mineur",        desc: "Minerais : " + Math.round(MINE_CHANCE * 100) + " % de chance de minerai bonus." },
  { id: "bucheron",    nom: "🪓 Bûcheron",      desc: "Bûches : " + Math.round(WOOD_CHANCE * 100) + " % de chance de bûche bonus." },
];

export function getSpec(player) {
  try { const s = player.getDynamicProperty(DP_SPEC); if (typeof s === "string" && s) return s; } catch (e) {}
  return null;
}
function setSpec(player, id) { try { player.setDynamicProperty(DP_SPEC, id || undefined); } catch (e) {} }
export function specLabel(player) {
  const s = getSpec(player);
  const d = SPECS.find((x) => x.id === s);
  return d ? d.nom : "aucune";
}
export function clearSpec(player) { setSpec(player, null); }

// Prix marchand après remise de spécialité (utilisé par merchant.js).
export function specTradeCost(player, baseCount) {
  if (getSpec(player) === "forgeron") return Math.max(1, Math.ceil(baseCount * MERCHANT_DISCOUNT));
  return baseCount;
}

// ── Choix à la création du personnage ────────────────────────────────────────
export function chooseSpecCreation(player, onDone) {
  const form = new ActionFormData().title("Ta spécialité")
    .body("Choisis le savoir-faire de ton personnage. Tu pourras en changer plus tard pour " + CHANGE_COST + " émeraudes (menu Ma spécialité).");
  for (const s of SPECS) form.button(s.nom + "\n§7" + s.desc);
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined || res.selection >= SPECS.length) {
      // On repose la question : la spécialité fait partie du personnage.
      system.runTimeout(() => chooseSpecCreation(player, onDone), 20);
      return;
    }
    const s = SPECS[res.selection];
    setSpec(player, s.id);
    player.sendMessage("§aTu es maintenant §f" + s.nom + "§a. " + s.desc);
    if (onDone) onDone();
  });
}

// ── Menu « Ma spécialité » ───────────────────────────────────────────────────
export function openMySpec(player) {
  const cur = SPECS.find((x) => x.id === getSpec(player));
  const cont = container(player);
  const have = cont ? countItem(cont, EMERALD) : 0;
  const free = !cur; // anciens joueurs créés avant cette mise à jour : premier choix gratuit
  const form = new ActionFormData().title("Ma spécialité")
    .body(cur
      ? "§6Spécialité : §f" + cur.nom + "\n§7" + cur.desc + "\n\n§7Changer coûte §e" + CHANGE_COST + " émeraudes§7 (tu en as " + have + ")."
      : "§7Tu n'as pas encore de spécialité. Le premier choix est §agratuit§7 !");
  form.button(free ? "§aChoisir ma spécialité" : "§eChanger de spécialité §7(" + CHANGE_COST + " ém)");
  form.button("Fermer");
  form.show(player).then((res) => {
    if (res.canceled || res.selection !== 0) return;
    if (!free) {
      if (have < CHANGE_COST) { player.sendMessage("§cIl te faut " + CHANGE_COST + " émeraudes pour changer de spécialité (tu en as " + have + ")."); return; }
    }
    const f = new ActionFormData().title(free ? "Choisir ma spécialité" : "Changer de spécialité")
      .body(free ? "Choisis ton savoir-faire." : "§7Le changement coûte §e" + CHANGE_COST + " émeraudes§7, débitées à la validation.");
    for (const s of SPECS) f.button(s.nom + "\n§7" + s.desc);
    f.button("Annuler");
    f.show(player).then((r) => {
      if (r.canceled || r.selection === undefined || r.selection >= SPECS.length) return;
      const s = SPECS[r.selection];
      if (!free) {
        const c2 = container(player);
        if (!c2 || countItem(c2, EMERALD) < CHANGE_COST || !removeItem(c2, EMERALD, CHANGE_COST)) { player.sendMessage("§cPaiement impossible."); return; }
      }
      setSpec(player, s.id);
      player.sendMessage("§aTu es maintenant §f" + s.nom + "§a. " + s.desc);
      try { player.playSound("random.levelup", { pitch: 1.1 }); } catch (e) {}
    });
  });
}

// ── Menu admin : changer la spécialité d'un joueur (gratuit) ─────────────────
export function openSpecAdmin(viewer, target, backFn) {
  const form = new ActionFormData().title("Spécialité de " + target.name)
    .body("§7Actuelle : §f" + specLabel(target) + "\n\n§7Choisis la nouvelle spécialité (gratuit, admin).");
  for (const s of SPECS) form.button(s.nom);
  form.button("§cAucune (retirer)");
  form.button("Retour");
  form.show(viewer).then((res) => {
    if (res.canceled || res.selection === undefined || res.selection > SPECS.length) { if (backFn) backFn(); return; }
    if (res.selection === SPECS.length) {
      clearSpec(target);
      viewer.sendMessage("§aSpécialité de " + target.name + " retirée.");
      try { target.sendMessage("§eUn administrateur a retiré ta spécialité."); } catch (e) {}
    } else {
      const s = SPECS[res.selection];
      setSpec(target, s.id);
      viewer.sendMessage("§aSpécialité de " + target.name + " : " + s.nom + ".");
      try { target.sendMessage("§eUn administrateur a changé ta spécialité : §f" + s.nom + "§e. " + s.desc); } catch (e) {}
    }
    if (backFn) backFn();
  });
}

// ═════════════════════════ Les bonus en jeu ═════════════════════════

// ── ⚔ Maître d'épée : coup puissant tous les N coups ─────────────────────────
const swordHits = new Map(); // playerId -> compteur
world.afterEvents.entityHurt.subscribe((ev) => {
  let atk;
  try {
    atk = ev.damageSource && ev.damageSource.damagingEntity;
    if (!atk || atk.typeId !== "minecraft:player") return;
  } catch (e) { return; }
  if (getSpec(atk) !== "epee") return;
  let held;
  try { held = atk.getComponent("minecraft:equippable")?.getEquipment("Mainhand"); } catch (e) { return; }
  if (!held || !held.typeId.includes("sword")) return;
  const n = (swordHits.get(atk.id) || 0) + 1;
  if (n < SWORD_EVERY) { swordHits.set(atk.id, n); return; }
  swordHits.set(atk.id, 0);
  try {
    const cible = ev.hurtEntity;
    if (cible && cible.isValid) cible.applyDamage(SWORD_BONUS, { damagingEntity: atk });
    atk.onScreenDisplay.setActionBar("§6⚔ Coup puissant ! §7(+" + SWORD_BONUS + " dégâts)");
    atk.playSound("random.anvil_land", { volume: 0.3, pitch: 1.4 });
  } catch (e) {}
});

// ── 🏹 Maître archer : flèches récupérées ────────────────────────────────────
const arrowShots = new Map(); // playerId -> compteur
function onProjectile(source, projectile) {
  try {
    if (!source || source.typeId !== "minecraft:player") return;
    if (!projectile || projectile.typeId !== "minecraft:arrow") return;
  } catch (e) { return; }
  if (getSpec(source) !== "archer") return;
  const n = (arrowShots.get(source.id) || 0) + 1;
  if (n < ARROW_EVERY) { arrowShots.set(source.id, n); return; }
  arrowShots.set(source.id, 0);
  try {
    giveCustom(source, "minecraft:arrow", ARROW_BACK);
    source.onScreenDisplay.setActionBar("§a🏹 +" + ARROW_BACK + " flèches récupérées");
    source.playSound("random.orb", { volume: 0.4, pitch: 1.3 });
  } catch (e) {}
}
world.afterEvents.projectileHitEntity.subscribe((ev) => onProjectile(ev.source, ev.projectile));
world.afterEvents.projectileHitBlock.subscribe((ev) => onProjectile(ev.source, ev.projectile));

// ── Blocs cassés : Agriculteur, Mineur, Bûcheron, Forgeron ───────────────────
const CROPS = {
  "minecraft:wheat":    "minecraft:wheat",
  "minecraft:carrots":  "minecraft:carrot",
  "minecraft:potatoes": "minecraft:potato",
  "minecraft:beetroot": "minecraft:beetroot",
};
const ORES = {
  "minecraft:coal_ore": "minecraft:coal",              "minecraft:deepslate_coal_ore": "minecraft:coal",
  "minecraft:iron_ore": "minecraft:raw_iron",          "minecraft:deepslate_iron_ore": "minecraft:raw_iron",
  "minecraft:copper_ore": "minecraft:raw_copper",      "minecraft:deepslate_copper_ore": "minecraft:raw_copper",
  "minecraft:gold_ore": "minecraft:raw_gold",          "minecraft:deepslate_gold_ore": "minecraft:raw_gold",
  "minecraft:redstone_ore": "minecraft:redstone",      "minecraft:deepslate_redstone_ore": "minecraft:redstone",
  "minecraft:lapis_ore": "minecraft:lapis_lazuli",     "minecraft:deepslate_lapis_ore": "minecraft:lapis_lazuli",
  "minecraft:diamond_ore": "minecraft:diamond",        "minecraft:deepslate_diamond_ore": "minecraft:diamond",
  "minecraft:emerald_ore": "minecraft:emerald",        "minecraft:deepslate_emerald_ore": "minecraft:emerald",
  "minecraft:nether_quartz_ore": "minecraft:quartz",
};

function dropAt(dimension, location, itemId, count, player, msg) {
  try {
    dimension.spawnItem(new ItemStack(itemId, count), { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 });
    if (player && msg) player.onScreenDisplay.setActionBar(msg);
  } catch (e) {}
}

world.afterEvents.playerBreakBlock.subscribe((ev) => {
  const player = ev.player;
  if (!player) return;
  const spec = getSpec(player);
  if (!spec || spec === "epee" || spec === "archer") return;
  let typeId, growth;
  try { typeId = ev.brokenBlockPermutation.type.id; } catch (e) { return; }

  if (spec === "agriculteur") {
    const cropItem = CROPS[typeId];
    if (!cropItem) return;
    try { growth = ev.brokenBlockPermutation.getState("growth"); } catch (e) { growth = undefined; }
    if (growth !== undefined && growth < 7) return; // seulement les cultures mûres
    if (Math.random() < FARM_CHANCE) dropAt(ev.dimension, ev.block.location, cropItem, 1 + (Math.random() < 0.5 ? 1 : 0), player, "§a🌾 Récolte double !");
  } else if (spec === "mineur") {
    const oreItem = ORES[typeId];
    if (!oreItem) return;
    if (Math.random() < MINE_CHANCE) dropAt(ev.dimension, ev.block.location, oreItem, 1, player, "§a⛏ Minerai bonus !");
  } else if (spec === "bucheron") {
    if (!typeId.endsWith("_log")) return;
    if (Math.random() < WOOD_CHANCE) dropAt(ev.dimension, ev.block.location, typeId, 1, player, "§a🪓 Bûche bonus !");
  } else if (spec === "forgeron") {
    if (typeId !== "minecraft:iron_ore" && typeId !== "minecraft:deepslate_iron_ore") return;
    if (Math.random() < SMITH_INGOT_CHANCE) dropAt(ev.dimension, ev.block.location, "minecraft:iron_ingot", 1, player, "§6⚒ Lingot forgé sur place !");
  }
});

// ── ⚒ Forgeron : le matériel s'use moins vite ───────────────────────────────
// Toutes les 30 s, l'objet tenu en main récupère un peu de durabilité.
system.runInterval(() => {
  for (const p of world.getAllPlayers()) {
    if (getSpec(p) !== "forgeron") continue;
    try {
      const eq = p.getComponent("minecraft:equippable");
      const held = eq?.getEquipment("Mainhand");
      if (!held) continue;
      const dur = held.getComponent("minecraft:durability");
      if (!dur || dur.damage <= 0) continue;
      dur.damage = Math.max(0, dur.damage - 2);
      eq.setEquipment("Mainhand", held);
    } catch (e) {}
  }
}, 600);
