import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import {
  MANAGED_TAG, COIN_ID, DP_ANCHOR,
  play, container, countItem, removeItem, parseCoords, coordStr, addBalance,
  getProps, saveProps, makePropId,
} from "./util.js";
import { openVoiceEditor } from "./voices.js";

const DP_ESTATE_PROP = "estate:prop";   // sur un vendeur, l'id du bien qu'il vend
const DP_AGENCY_TIER = "estate:tier";   // sur une agence, sa gamme
const SELLER_TAG = "estate_seller";
const WDP_TIERS = "estate:tiers";
const TIER_NAME = { bas: "bas de gamme", moyen: "milieu de gamme", haut: "haut de gamme" };

// ----- gammes selon le prix -----
function getTiers() { try { const o = JSON.parse(world.getDynamicProperty(WDP_TIERS) ?? "{}"); return { mid: Number.isFinite(o.mid) ? o.mid : 100, high: Number.isFinite(o.high) ? o.high : 500 }; } catch (e) { return { mid: 100, high: 500 }; } }
function saveTiers(mid, high) { try { world.setDynamicProperty(WDP_TIERS, JSON.stringify({ mid, high })); } catch (e) {} }
function tierOf(price) { const t = getTiers(); if (price < t.mid) return "bas"; if (price < t.high) return "moyen"; return "haut"; }
function reclassify() {
  const props = getProps(); let ch = false;
  for (const id in props) { if (props[id].price !== undefined) { const nt = tierOf(props[id].price); if (props[id].tier !== nt) { props[id].tier = nt; ch = true; } } }
  if (ch) saveProps(props);
}

// =====================================================================
//  VENDEUR DE MAISON (posté devant une porte, vend une maison précise)
// =====================================================================
export function openSellerEditor(player, entity, onChangeRole) {
  const propId = entity.getDynamicProperty(DP_ESTATE_PROP);
  const props = getProps();
  const pr = propId ? props[propId] : null;
  const body = pr
    ? ("Maison de ce vendeur\n§f" + pr.name + "\n§7Prix " + pr.price + " pièces, gamme " + TIER_NAME[pr.tier] + "\n§7État " + (pr.onMarket ? "en vente" : ("vendue à " + pr.ownerName)))
    : "Ce vendeur n'a pas encore de maison. Définis-la, place le PNJ devant la porte.";
  new ActionFormData().title("Éditeur · Vendeur de maison").body(body)
    .button(pr ? "Modifier la maison" : "Définir la maison")
    .button("Déplacer le PNJ vers moi")
    .button("Voix du PNJ")
    .button("§9Changer de métier")
    .button("§cSupprimer ce PNJ")
    .show(player).then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) editSellerHouse(player, entity, onChangeRole);
      else if (res.selection === 1) moveSellerHere(player, entity, onChangeRole);
      else if (res.selection === 2) openVoiceEditor(player, entity, () => openSellerEditor(player, entity, onChangeRole));
      else if (res.selection === 3) { if (onChangeRole) onChangeRole(); }
      else if (res.selection === 4) { try { entity.remove(); } catch (e) {} }
    });
}
function editSellerHouse(player, entity, onChangeRole) {
  const propId = entity.getDynamicProperty(DP_ESTATE_PROP);
  const props = getProps();
  const pr = propId ? props[propId] : null;
  const f = new ModalFormData().title("Maison à vendre");
  f.textField("Nom de la maison", "Chaumière du port", { defaultValue: pr ? pr.name : "" });
  f.textField("Coin 1 (x y z)", "100 64 -200", { defaultValue: pr && pr.c1 ? coordStr(pr.c1) : "" });
  f.textField("Coin 2 (x y z)", "108 70 -208", { defaultValue: pr && pr.c2 ? coordStr(pr.c2) : "" });
  f.slider("Prix de vente en pièces", 0, 2000, { valueStep: 1, defaultValue: pr ? Math.min(2000, pr.price | 0) : 100 });
  f.show(player).then((res) => {
    if (res.canceled) { openSellerEditor(player, entity, onChangeRole); return; }
    const v = res.formValues;
    const name = String(v[0] || "").trim();
    const a = parseCoords(v[1], pr ? pr.c1 : null);
    const b = parseCoords(v[2], pr ? pr.c2 : null);
    const price = v[3] | 0;
    if (!name || !a || !b) { player.sendMessage("§cNom ou coins invalides, mets trois nombres par coin."); openSellerEditor(player, entity, onChangeRole); return; }
    const props2 = getProps();
    let id = propId;
    if (!id || !props2[id]) id = makePropId(name);
    const loc = entity.location;
    const prev = props2[id] || {};
    props2[id] = Object.assign({}, prev, {
      name, c1: a, c2: b, price, tier: tierOf(price),
      dim: entity.dimension.id,
      onMarket: prev.ownerId ? false : true,
      ownerId: prev.ownerId || "", ownerName: prev.ownerName || "",
      locked: prev.locked || false, guests: prev.guests || [],
      evict: { x: loc.x, y: loc.y, z: loc.z },
      sellerType: entity.typeId, sellerLoc: { x: loc.x, y: loc.y, z: loc.z }, sellerDim: entity.dimension.id,
    });
    saveProps(props2);
    try { entity.setDynamicProperty(DP_ESTATE_PROP, id); } catch (e) {}
    try { entity.addTag(SELLER_TAG); } catch (e) {}
    try { entity.nameTag = "Vendeur · " + name; } catch (e) {}
    player.sendMessage("§aMaison '" + name + "' en vente à " + price + " pièces, gamme " + TIER_NAME[tierOf(price)] + ". Visible aussi à l'agence " + TIER_NAME[tierOf(price)] + ".");
    openSellerEditor(player, entity, onChangeRole);
  });
}
function moveSellerHere(player, entity, onChangeRole) {
  const loc = player.location;
  try { entity.teleport({ x: loc.x, y: loc.y, z: loc.z }); } catch (e) {}
  try { entity.setDynamicProperty(DP_ANCHOR, JSON.stringify({ x: loc.x, y: loc.y, z: loc.z })); } catch (e) {}
  const propId = entity.getDynamicProperty(DP_ESTATE_PROP);
  if (propId) {
    const props = getProps();
    if (props[propId]) {
      props[propId].sellerLoc = { x: loc.x, y: loc.y, z: loc.z };
      props[propId].sellerDim = entity.dimension.id;
      props[propId].evict = { x: loc.x, y: loc.y, z: loc.z };
      saveProps(props);
    }
  }
  player.sendMessage("§aVendeur déplacé ici, c'est cette position qui lui est attitrée.");
  openSellerEditor(player, entity, onChangeRole);
}
export function openSellerMenu(player, entity) {
  const propId = entity.getDynamicProperty(DP_ESTATE_PROP);
  const props = getProps();
  const pr = propId ? props[propId] : null;
  if (!pr) { player.sendMessage("§7Ce vendeur n'a pas encore de maison à proposer."); return; }
  if (!pr.onMarket) { player.sendMessage("§7Cette maison est déjà vendue."); return; }
  showBuyHouse(player, propId, null);
}

// ----- achat d'une maison (vendeur ou agence) -----
function showBuyHouse(player, propId, after) {
  const props = getProps();
  const pr = props[propId];
  if (!pr || !pr.onMarket) { player.sendMessage("§7Cette maison n'est plus disponible."); return; }
  new ActionFormData().title("Acheter, " + pr.name)
    .body("§7Prix " + pr.price + " pièces, à avoir en main.\n§7Gamme " + TIER_NAME[pr.tier] + ".\n§7Zone " + coordStr(pr.c1) + " → " + coordStr(pr.c2) + ".")
    .button("Acheter").button("Retour")
    .show(player).then((res) => {
      if (res.canceled || res.selection === 1) { if (after) after(); return; }
      buyHouse(player, propId, after);
    });
}
function buyHouse(player, propId, after) {
  const props = getProps();
  const pr = props[propId];
  if (!pr || !pr.onMarket) { player.sendMessage("§7Cette maison vient d'être prise."); return; }
  const cont = container(player);
  if (!cont || countItem(cont, COIN_ID) < pr.price) { player.sendMessage("§cIl te faut " + pr.price + " pièces en main. Retire-en via ton menu."); play(player, "note.bass"); return; }
  removeItem(cont, COIN_ID, pr.price);
  pr.onMarket = false; pr.ownerId = player.id; pr.ownerName = player.name; pr.locked = false; pr.guests = [];
  saveProps(props);
  try { player.addTag("prop_" + propId); } catch (e) {}
  player.sendMessage("§6Félicitations, la maison " + pr.name + " est à toi. Gère-la dans ton menu, Ma maison.");
  play(player, "random.levelup");
  removeSellerEntity(propId);
  if (after) after();
}

// =====================================================================
//  AGENCE IMMOBILIERE (sédentaire, par gamme, vend et rachète)
// =====================================================================
export function openAgencyEditor(player, entity, onChangeRole) {
  const tier = entity.getDynamicProperty(DP_AGENCY_TIER) || "moyen";
  const t = getTiers();
  new ActionFormData().title("Éditeur · Agence immobilière")
    .body("Gamme de l'agence, " + TIER_NAME[tier] + ".\n§7Seuils, bas en dessous de " + t.mid + ", haut à partir de " + t.high + ".")
    .button("Choisir la gamme de l'agence")
    .button("Régler les seuils de prix")
    .button("Voix du PNJ")
    .button("§9Changer de métier")
    .button("§cSupprimer ce PNJ")
    .show(player).then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) chooseTier(player, entity, onChangeRole);
      else if (res.selection === 1) editThresholds(player, entity, onChangeRole);
      else if (res.selection === 2) openVoiceEditor(player, entity, () => openAgencyEditor(player, entity, onChangeRole));
      else if (res.selection === 3) { if (onChangeRole) onChangeRole(); }
      else if (res.selection === 4) { try { entity.remove(); } catch (e) {} }
    });
}
function chooseTier(player, entity, onChangeRole) {
  new ActionFormData().title("Gamme de l'agence").body("Quelles maisons cette agence propose-t-elle ?")
    .button("Bas de gamme").button("Milieu de gamme").button("Haut de gamme").button("Retour")
    .show(player).then((res) => {
      if (res.canceled || res.selection === 3) { openAgencyEditor(player, entity, onChangeRole); return; }
      const tier = res.selection === 0 ? "bas" : res.selection === 1 ? "moyen" : "haut";
      try { entity.setDynamicProperty(DP_AGENCY_TIER, tier); entity.nameTag = "Agence " + TIER_NAME[tier]; } catch (e) {}
      player.sendMessage("§aAgence réglée sur " + TIER_NAME[tier] + ".");
      openAgencyEditor(player, entity, onChangeRole);
    });
}
function editThresholds(player, entity, onChangeRole) {
  const t = getTiers();
  const f = new ModalFormData().title("Seuils de gamme");
  f.textField("Prix maxi du bas de gamme", String(t.mid), { defaultValue: String(t.mid) });
  f.textField("Prix mini du haut de gamme", String(t.high), { defaultValue: String(t.high) });
  f.show(player).then((res) => {
    if (res.canceled) { openAgencyEditor(player, entity, onChangeRole); return; }
    const mid = parseInt(String(res.formValues[0] || "").trim(), 10);
    const high = parseInt(String(res.formValues[1] || "").trim(), 10);
    if (!Number.isFinite(mid) || !Number.isFinite(high) || mid < 0 || high <= mid) { player.sendMessage("§cSeuils invalides, le haut doit dépasser le bas."); openAgencyEditor(player, entity, onChangeRole); return; }
    saveTiers(mid, high); reclassify();
    player.sendMessage("§aSeuils réglés. Bas sous " + mid + ", haut à partir de " + high + ".");
    openAgencyEditor(player, entity, onChangeRole);
  });
}
export function openAgencyMenu(player, entity) {
  const tier = entity.getDynamicProperty(DP_AGENCY_TIER) || "moyen";
  const props = getProps();
  const forSale = Object.keys(props).filter((id) => props[id].onMarket && props[id].tier === tier);
  const mine = Object.keys(props).filter((id) => props[id].ownerId === player.id);
  const form = new ActionFormData().title("Agence " + TIER_NAME[tier])
    .body(forSale.length ? "Maisons à vendre dans cette gamme. Touche pour acheter." : "Aucune maison à vendre dans cette gamme pour l'instant.");
  const actions = [];
  for (const id of forSale) { form.button(props[id].name + "\n§7" + props[id].price + " pièces"); actions.push({ type: "buy", id }); }
  if (mine.length) { form.button("§eVendre une de mes maisons"); actions.push({ type: "sell" }); }
  form.button("Fermer"); actions.push({ type: "close" });
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= actions.length) return;
    const a = actions[res.selection];
    if (a.type === "buy") showBuyHouse(player, a.id, () => openAgencyMenu(player, entity));
    else if (a.type === "sell") sellBackMenu(player, entity);
  });
}
function sellBackMenu(player, entity) {
  const props = getProps();
  const mine = Object.keys(props).filter((id) => props[id].ownerId === player.id);
  if (!mine.length) { player.sendMessage("§7Tu n'as aucune maison à vendre."); return; }
  const form = new ActionFormData().title("Vendre une maison").body("Tu récupères le prix sur ton compte, et la maison repart en vente.");
  for (const id of mine) form.button(props[id].name + "\n§7te rapporte " + props[id].price + " pièces");
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= mine.length) { openAgencyMenu(player, entity); return; }
    sellBack(player, mine[res.selection]);
    openAgencyMenu(player, entity);
  });
}
function sellBack(player, propId) {
  const props = getProps();
  const pr = props[propId];
  if (!pr || pr.ownerId !== player.id) { player.sendMessage("§7Cette maison n'est pas à toi."); return; }
  const gain = pr.price | 0;
  pr.onMarket = true; pr.ownerId = ""; pr.ownerName = ""; pr.locked = false; pr.guests = [];
  saveProps(props);
  try { player.removeTag("prop_" + propId); } catch (e) {}
  addBalance(player, gain);
  player.sendMessage("§aTu as vendu " + pr.name + " pour " + gain + " pièces, créditées sur ton compte. Elle est de nouveau en vente.");
  play(player, "random.orb");
  spawnSellerFor(propId);
}

// =====================================================================
//  apparition / disparition du vendeur devant la porte
// =====================================================================
function sellerNear(pr, propId) {
  if (!pr.sellerLoc) return null;
  const dimId = pr.sellerDim || "overworld";
  let dim; try { dim = world.getDimension(dimId); } catch (e) { return null; }
  let near; try { near = dim.getEntities({ location: pr.sellerLoc, maxDistance: 4, tags: [SELLER_TAG] }); } catch (e) { near = []; }
  for (const e of near) { try { if (e.getDynamicProperty(DP_ESTATE_PROP) === propId) return e; } catch (err) {} }
  return null;
}
function removeSellerEntity(propId) {
  const props = getProps();
  const pr = props[propId];
  if (!pr) return;
  const e = sellerNear(pr, propId);
  if (e) { try { e.remove(); } catch (err) {} }
}
function spawnSellerFor(propId) {
  const props = getProps();
  const pr = props[propId];
  if (!pr || !pr.onMarket || !pr.sellerType || !pr.sellerLoc) return;
  if (sellerNear(pr, propId)) return;
  const dimId = pr.sellerDim || "overworld";
  let dim; try { dim = world.getDimension(dimId); } catch (e) { return; }
  let ent; try { ent = dim.spawnEntity(pr.sellerType, pr.sellerLoc); } catch (e) { return; }
  try {
    ent.addTag(MANAGED_TAG); ent.addTag(SELLER_TAG);
    ent.setDynamicProperty("npc:role", "estate_seller");
    ent.setDynamicProperty(DP_ESTATE_PROP, propId);
    ent.setDynamicProperty(DP_ANCHOR, JSON.stringify(pr.sellerLoc));
    ent.nameTag = "Vendeur · " + pr.name;
  } catch (e) {}
}

// un vendeur doit être présent devant chaque maison en vente
system.runInterval(() => {
  const props = getProps();
  for (const id in props) {
    const pr = props[id];
    if (pr && pr.onMarket && pr.sellerType && pr.sellerLoc) {
      try { if (!sellerNear(pr, id)) spawnSellerFor(id); } catch (e) {}
    }
  }
}, 100);
