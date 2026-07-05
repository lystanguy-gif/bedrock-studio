import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { MANAGED_TAG, DP_ROLE, DP_ANCHOR, PACIFY, isCreative, play, later, shortId } from "./util.js";
import { openMerchantEditor, openMerchantMenu, ensureMerchant } from "./merchant.js";
import { openInnEditor, openInnMenu } from "./inn.js";
import { openOfficerEditor, openOfficerMenu } from "./grades.js";
import { openSellerEditor, openSellerMenu, openAgencyEditor, openAgencyMenu } from "./estate.js";
import { playVoice } from "./voices.js";

// ===== pacification =====
const GUARD_EFFECTS = ["resistance", "fire_resistance", "slowness", "weakness"];
function applyGuard(entity) {
  if (!PACIFY) return;
  for (const e of GUARD_EFFECTS) { try { entity.runCommand(`effect @s ${e} 1000000 255 true`); } catch (err) {} }
}
function clearGuard(entity) { for (const e of GUARD_EFFECTS) { try { entity.runCommand(`effect @s ${e} 0`); } catch (err) {} } }

const PROJ_SET = new Set([
  "minecraft:arrow", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:potion",
  "minecraft:small_fireball", "minecraft:fireball", "minecraft:dragon_fireball",
  "minecraft:wither_skull", "minecraft:wither_skull_dangerous", "minecraft:shulker_bullet",
  "minecraft:llama_spit", "minecraft:thrown_trident",
]);
function isHostileProjectile(id) {
  if (!id) return false;
  if (PROJ_SET.has(id)) return true;
  return id.includes("potion") || id.endsWith("arrow") || id.endsWith("fireball");
}

// ===== ancrage =====
function setAnchor(entity) { try { const l = entity.location; entity.setDynamicProperty(DP_ANCHOR, JSON.stringify({ x: l.x, y: l.y, z: l.z })); } catch (e) {} }
function getAnchor(entity) { try { const a = JSON.parse(entity.getDynamicProperty(DP_ANCHOR)); if (a && typeof a.x === "number") return a; } catch (e) {} return undefined; }

function claim(entity) {
  try { if (entity.typeId === "minecraft:player") return; } catch (e) { return; }
  try { entity.addTag(MANAGED_TAG); } catch (e) {}
  setAnchor(entity);
  applyGuard(entity);
}
function unmanage(entity) {
  try { entity.removeTag(MANAGED_TAG); } catch (e) {}
  try { entity.setDynamicProperty(DP_ROLE, undefined); } catch (e) {}
  try { entity.setDynamicProperty(DP_ANCHOR, undefined); } catch (e) {}
  clearGuard(entity);
}

// ===== choix du metier =====
function chooseRole(player, entity) {
  const back = () => later(() => chooseRole(player, entity));
  new ActionFormData().title("Métier du PNJ")
    .body("Quel sera le rôle de ce personnage ?")
    .button("Marchand personnalisable\n§7dialogue, ventes, quêtes, téléport, propriété")
    .button("Aubergiste\n§7loue des chambres aux joueurs")
    .button("Officier\n§7recrute et promeut dans une filière")
    .button("Vendeur de maison\n§7vend une maison précise, devant sa porte")
    .button("Agence immobilière\n§7vend les maisons d'une gamme, rachète")
    .show(player).then((res) => {
      if (res.canceled) return;
      const sel = res.selection;
      if (sel === 0) { entity.setDynamicProperty(DP_ROLE, "merchant"); ensureMerchant(entity); later(() => openMerchantEditor(player, entity, back)); }
      else if (sel === 1) { entity.setDynamicProperty(DP_ROLE, "innkeeper"); try { entity.nameTag = "Aubergiste"; } catch (e) {} later(() => openInnEditor(player, entity, back)); }
      else if (sel === 2) { entity.setDynamicProperty(DP_ROLE, "officer"); try { entity.nameTag = "Officier"; } catch (e) {} later(() => openOfficerEditor(player, entity, back)); }
      else if (sel === 3) { entity.setDynamicProperty(DP_ROLE, "estate_seller"); try { entity.nameTag = "Vendeur de maison"; } catch (e) {} later(() => openSellerEditor(player, entity, back)); }
      else if (sel === 4) { entity.setDynamicProperty(DP_ROLE, "estate_agency"); try { entity.nameTag = "Agence immobilière"; } catch (e) {} later(() => openAgencyEditor(player, entity, back)); }
    });
}
function openEditorForRole(player, entity) {
  const role = entity.getDynamicProperty(DP_ROLE);
  const back = () => later(() => chooseRole(player, entity));
  if (role === "merchant") openMerchantEditor(player, entity, back);
  else if (role === "innkeeper") openInnEditor(player, entity, back);
  else if (role === "officer") openOfficerEditor(player, entity, back);
  else if (role === "estate_seller") openSellerEditor(player, entity, back);
  else if (role === "estate_agency") openAgencyEditor(player, entity, back);
  else chooseRole(player, entity);
}
function openMenuForRole(player, entity) {
  const role = entity.getDynamicProperty(DP_ROLE);
  playVoice(entity, player);
  if (role === "merchant") openMerchantMenu(player, entity);
  else if (role === "innkeeper") openInnMenu(player, entity);
  else if (role === "officer") openOfficerMenu(player, entity);
  else if (role === "estate_seller") openSellerMenu(player, entity);
  else if (role === "estate_agency") openAgencyMenu(player, entity);
  else if (isCreative(player)) player.sendMessage("§7Ce PNJ n'a pas encore de métier. Utilise le bâton de configuration sur lui pour le configurer.");
}
function confirmConvert(player, entity) {
  let tid = "cette créature"; try { tid = shortId(entity.typeId); } catch (e) {}
  new ActionFormData().title("Nouveau PNJ").body("Transformer §f" + tid + "§r en PNJ ?")
    .button("§2Oui, en faire un PNJ").button("Annuler")
    .show(player).then((res) => {
      if (res.canceled || res.selection === 1) return;
      claim(entity);
      later(() => chooseRole(player, entity));
    });
}

// ===== interaction unique =====
// outil de configuration : un bâton nommé, au lieu de l'accroupissement
function isConfigTool(item) {
  try { return !!item && item.typeId === "minecraft:stick" && String(item.nameTag || "").includes("Configuration PNJ"); } catch (e) { return false; }
}

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  const player = ev.player;
  const target = ev.target;
  if (!player || !target) return;
  let tid; try { tid = target.typeId; } catch (e) { return; }
  if (tid === "minecraft:player") return;
  // Compatibilité Sieged : on ne touche jamais aux entités du mod Sieged
  // (unités, machines, PNJ de quête) — leurs menus restent gérés par Sieged.
  if (tid.startsWith("sieged:")) return;
  // Les perroquets servent aux déclarations de guerre de Sieged : pas de conversion.
  if (tid === "minecraft:parrot") { let m = false; try { m = target.hasTag(MANAGED_TAG); } catch (e) {} if (!m) return; }
  let managed = false; try { managed = target.hasTag(MANAGED_TAG); } catch (e) {}
  const creative = isCreative(player);
  const tool = isConfigTool(ev.itemStack);
  if (managed) {
    ev.cancel = true;
    if (creative && tool) later(() => openEditorForRole(player, target));
    else later(() => openMenuForRole(player, target));
  } else if (creative && tool) {
    ev.cancel = true;
    later(() => confirmConvert(player, target));
  }
});

// ===== pacification : coups au corps a corps =====
world.afterEvents.entityHurt.subscribe((ev) => {
  if (!PACIFY) return;
  const attacker = ev.damageSource && ev.damageSource.damagingEntity;
  const victim = ev.hurtEntity;
  if (!attacker || !victim) return;
  let amTagged = false; try { amTagged = attacker.hasTag(MANAGED_TAG); } catch (e) { return; }
  if (!amTagged) return;
  try { if (victim.hasTag(MANAGED_TAG)) return; } catch (e) {}
  const dmg = ev.damage || 0;
  if (dmg <= 0) return;
  try {
    const hp = victim.getComponent("minecraft:health");
    if (hp) { const cur = hp.currentValue; const max = (typeof hp.effectiveMax === "number") ? hp.effectiveMax : cur + dmg; hp.setCurrentValue(Math.min(max, cur + dmg)); }
  } catch (e) {}
});

// ===== pacification : projectiles (potions de sorciere, fleches de pillard...) =====
world.afterEvents.entitySpawn.subscribe((ev) => {
  if (!PACIFY) return;
  const e = ev.entity; if (!e) return;
  let id; try { id = e.typeId; } catch (err) { return; }
  if (!isHostileProjectile(id)) return;
  let loc, dim; try { loc = e.location; dim = e.dimension; } catch (err) { return; }
  let near; try { near = dim.getEntities({ location: loc, maxDistance: 3, tags: [MANAGED_TAG] }); } catch (err) { near = []; }
  if (near && near.length) { try { e.remove(); } catch (err) {} }
});

// ===== ancrage + maintien de la pacification =====
system.runInterval(() => {
  for (const dimId of ["overworld", "nether", "the_end"]) {
    let ents;
    try { ents = world.getDimension(dimId).getEntities({ tags: [MANAGED_TAG] }); } catch (e) { continue; }
    for (const ent of ents) {
      try {
        if (ent.typeId === "minecraft:player") {
          try { ent.removeTag(MANAGED_TAG); } catch (e) {}
          try { ent.setDynamicProperty(DP_ANCHOR, undefined); } catch (e) {}
          try { clearGuard(ent); } catch (e) {}
          continue;
        }
        applyGuard(ent);
        const anc = getAnchor(ent);
        if (anc) {
          const l = ent.location;
          const dx = l.x - anc.x, dy = l.y - anc.y, dz = l.z - anc.z;
          if (dx * dx + dy * dy + dz * dz > 9) ent.teleport({ x: anc.x, y: anc.y, z: anc.z });
        }
      } catch (e) {}
    }
  }
}, 40);

// ===== commandes optionnelles =====
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  const src = ev.sourceEntity;
  const reply = (m) => { try { if (src) src.sendMessage(m); else world.sendMessage(m); } catch (e) { world.sendMessage(m); } };
  if (ev.id === "npc:help") {
    reply("§e=== PNJ royaumes ===\n§7En créatif, prends le bâton de configuration dans la montre, puis utilise-le sur n'importe quelle créature pour la transformer en PNJ et choisir son métier.\n§7Un clic normal sur un PNJ ouvre son menu de joueur.\n§f/scriptevent npc:reset §7vise un PNJ et le redevient une créature normale.");
    return;
  }
  if (ev.id === "npc:reset") {
    if (!src) { reply("§cCommande à lancer par un joueur."); return; }
    let hits; try { hits = src.getEntitiesFromViewDirection({ maxDistance: 8 }); } catch (e) { hits = []; }
    const ent = hits.map((h) => h.entity).find((en) => { try { return en.hasTag(MANAGED_TAG); } catch (e) { return false; } });
    if (!ent) { reply("§cVise un PNJ géré, à 8 blocs au plus."); return; }
    unmanage(ent);
    reply("§aCe PNJ est redevenu une créature normale.");
    return;
  }
}, { namespaces: ["npc"] });
