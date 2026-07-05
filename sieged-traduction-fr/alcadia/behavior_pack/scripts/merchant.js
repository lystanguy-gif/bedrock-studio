import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import {
  LIMIT_MAX, TALK, MANAGED_TAG, COIN_ID,
  play, shortId, tradeLabel, clampLimit, clampQty, isLimited, limitReached,
  parseItemList, stringifyItemList, container, countItem, removeItem, giveCustom,
  getMap, setMap, parseCoords, coordStr, insideBox, playerPrenom, later, addBalance,
  getProps, saveProps, makePropId, isCreative,
} from "./util.js";
import { openVoiceEditor } from "./voices.js";

// ----- stockage propre au role marchand -----
const DP_CONFIG = "npc:mcfg";
const DP_QDONE  = "npc:qdone";
const DP_TBUYS  = "npc:tbuys";
const DP_TPUSE  = "npc:tpuse";
const DP_PRENOM = "npc:prenom";
const PLY_PC1 = "npc:propc1";
const PLY_PC2 = "npc:propc2";

// ----- config -----
function defaultConfig() {
  return {
    name: "PNJ",
    modules: { dialogue: true, trade: false, quest: false, teleport: false, property: false },
    greetByName: false,
    askPrenom: false,
    dialogue: "Bonjour, {nom}.",
    trades: [],
    quest: { title: "", description: "", reqId: "", reqCount: 1, rewards: [], limit: 1, done: "Merci !", requirePrenom: false },
    teleport: { set: false, x: 0, y: 0, z: 0, costId: "", costCount: 1, label: "", limit: LIMIT_MAX },
    property: { id: "", name: "", c1: null, c2: null, costId: "", costCount: 1, sold: false, ownerId: "", ownerName: "" },
  };
}
export function getCfg(entity) {
  const raw = entity.getDynamicProperty(DP_CONFIG);
  let cfg;
  if (typeof raw === "string") { try { cfg = JSON.parse(raw); } catch (e) {} }
  if (!cfg) cfg = defaultConfig();
  if (!cfg.modules) cfg.modules = { dialogue: true, trade: false, quest: false };
  if (cfg.greetByName === undefined) cfg.greetByName = false;
  if (typeof cfg.name !== "string") cfg.name = "PNJ";
  if (typeof cfg.dialogue !== "string") cfg.dialogue = "Bonjour, {nom}.";
  if (!Array.isArray(cfg.trades)) cfg.trades = [];
  for (const t of cfg.trades) {
    if (t.limit === undefined) t.limit = LIMIT_MAX;
    if (t.label === undefined) t.label = "";
    if (t.sellName === undefined) t.sellName = "";
  }
  let q = cfg.quest;
  if (!q || typeof q !== "object") q = cfg.quest = {};
  if (!Array.isArray(q.rewards)) q.rewards = [];
  if (q.limit === undefined) q.limit = 1;
  if (q.reqCount === undefined) q.reqCount = 1;
  if (typeof q.title !== "string") q.title = "";
  if (typeof q.description !== "string") q.description = "";
  if (typeof q.done !== "string") q.done = "Merci !";
  if (q.requirePrenom === undefined) q.requirePrenom = false;
  if (cfg.modules.teleport === undefined) cfg.modules.teleport = false;
  if (cfg.modules.property === undefined) cfg.modules.property = false;
  if (cfg.askPrenom === undefined) cfg.askPrenom = false;
  if (!cfg.teleport || typeof cfg.teleport !== "object") cfg.teleport = { set: false, x: 0, y: 0, z: 0, costId: "", costCount: 1, label: "", limit: LIMIT_MAX };
  if (cfg.teleport.set === undefined) cfg.teleport.set = false;
  if (cfg.teleport.limit === undefined) cfg.teleport.limit = LIMIT_MAX;
  if (cfg.teleport.costCount === undefined) cfg.teleport.costCount = 1;
  if (!cfg.property || typeof cfg.property !== "object") cfg.property = { id: "", name: "", c1: null, c2: null, costId: "", costCount: 1, sold: false, ownerId: "", ownerName: "" };
  if (cfg.property.costCount === undefined) cfg.property.costCount = 1;
  return cfg;
}
function setCfg(entity, cfg) { try { entity.setDynamicProperty(DP_CONFIG, JSON.stringify(cfg)); } catch (e) {} }

export function ensureMerchant(entity) {
  if (typeof entity.getDynamicProperty(DP_CONFIG) !== "string") setCfg(entity, defaultConfig());
  try { entity.nameTag = getCfg(entity).name; } catch (e) {}
}

// ----- compteurs -----
function questCount(entity, pid) { return getMap(entity, DP_QDONE)[pid] || 0; }
function bumpQuest(entity, pid) { const m = getMap(entity, DP_QDONE); m[pid] = (m[pid] || 0) + 1; setMap(entity, DP_QDONE, m); return m[pid]; }
function tradeCount(entity, index, pid) { return getMap(entity, DP_TBUYS)[index + "|" + pid] || 0; }
function bumpTrade(entity, index, pid) { const m = getMap(entity, DP_TBUYS); const k = index + "|" + pid; m[k] = (m[k] || 0) + 1; setMap(entity, DP_TBUYS, m); return m[k]; }
function hasBoughtHere(entity, pid) { const m = getMap(entity, DP_TBUYS); for (const k in m) { if (k.endsWith("|" + pid) && m[k] > 0) return true; } return false; }
function tpUseCount(entity, pid) { return getMap(entity, DP_TPUSE)[pid] || 0; }
function bumpTp(entity, pid) { const m = getMap(entity, DP_TPUSE); m[pid] = (m[pid] || 0) + 1; setMap(entity, DP_TPUSE, m); return m[pid]; }

// ----- prenom -----
function prenomChoice(entity, pid) { return getMap(entity, DP_PRENOM)[pid]; }
function setPrenomChoice(entity, pid, v) { const m = getMap(entity, DP_PRENOM); if (v === undefined) delete m[pid]; else m[pid] = v; setMap(entity, DP_PRENOM, m); }
function consentActive(cfg) { return !!(cfg.askPrenom || (cfg.quest && cfg.quest.requirePrenom)); }
function displayName(entity, player) {
  if (prenomChoice(entity, player.id) === "yes") { const p = playerPrenom(player); if (p) return p; }
  return player.name;
}
// nom utilise pour saluer le joueur, prenom si donne, sinon "voyageur"
function greetName(entity, player) {
  if (prenomChoice(entity, player.id) === "yes") { const p = playerPrenom(player); return p || player.name; }
  return "voyageur";
}
// remplace {nom} (et synonymes) dans un texte par le nom de salut
function fillName(text, entity, player) {
  const n = greetName(entity, player);
  return String(text || "").replace(/\{(nom|prenom|prénom|name)\}/gi, n);
}
// blocage de transaction si la demande de prenom est active et que le joueur a refuse
function prenomBlocks(player, entity, cfg) {
  if (!cfg.askPrenom) return false;
  if (!playerPrenom(player)) return false;          // pas de prenom a donner, on ne punit pas
  if (prenomChoice(entity, player.id) === "yes") return false;
  player.sendMessage("§eCe marchand ne fait affaire qu'avec ceux qui lui donnent leur prenom. Reparle-lui et accepte de le partager.");
  setPrenomChoice(entity, player.id, undefined);     // la prochaine ouverture redemandera
  play(player, "note.bass");
  return true;
}

// ----- registre des biens : centralise dans util.js (getProps, saveProps, makePropId) -----

// ----- disponibilite des modules -----
function availableTrades(entity, cfg, player) {
  const out = [];
  cfg.trades.forEach((t, i) => { if (!limitReached(t.limit, tradeCount(entity, i, player.id))) out.push({ t, i }); });
  return out;
}
function questAvailable(entity, cfg) { const q = cfg.quest; return !!(cfg.modules.quest && q.reqId && q.rewards && q.rewards.length > 0); }
function teleportAvailable(entity, cfg, player) { const tp = cfg.teleport; return !!(cfg.modules.teleport && tp && tp.set && !limitReached(tp.limit, tpUseCount(entity, player.id))); }
function propertyAvailable(entity, cfg) { const pr = cfg.property; return !!(cfg.modules.property && pr && pr.c1 && pr.c2 && !pr.sold); }
function activeModules(entity, cfg, player) {
  const a = [];
  if (cfg.modules.dialogue) a.push("dialogue");
  if (cfg.modules.trade && availableTrades(entity, cfg, player).length > 0) a.push("trade");
  if (questAvailable(entity, cfg)) a.push("quest");
  if (teleportAvailable(entity, cfg, player)) a.push("teleport");
  if (propertyAvailable(entity, cfg)) a.push("property");
  return a;
}
function actionLabel(a, cfg) {
  if (a === "dialogue") return "Parler";
  if (a === "trade") return "Marchander";
  if (a === "quest") return (cfg.quest.title && cfg.quest.title.trim()) ? cfg.quest.title : "Quête";
  if (a === "teleport") return (cfg.teleport.label && cfg.teleport.label.trim()) ? cfg.teleport.label : "Voyager";
  if (a === "property") return (cfg.property.name && cfg.property.name.trim()) ? ("Acheter : " + cfg.property.name) : "Acheter la propriété";
  return "...";
}

// ----- menu joueur -----
export function openMerchantMenu(player, entity) {
  const cfg = getCfg(entity);
  if (consentActive(cfg) && prenomChoice(entity, player.id) === undefined) {
    askPrenomForm(player, entity, cfg);
    return;
  }
  showMenu(player, entity, cfg);
}
function askPrenomForm(player, entity, cfg) {
  new ActionFormData().title(cfg.name)
    .body("Ce personnage aimerait connaître ton prénom. Veux-tu le lui donner ?")
    .button("Oui, donner mon prénom").button("Non, rester anonyme")
    .show(player).then((res) => {
      if (!res.canceled) setPrenomChoice(entity, player.id, res.selection === 0 ? "yes" : "no");
      showMenu(player, entity, cfg);
    });
}
function showMenu(player, entity, cfg) {
  play(player, TALK, entity.location);
  const active = activeModules(entity, cfg, player);
  if (active.length === 0) { new ActionFormData().title(cfg.name).body("...").button("Fermer").show(player); return; }
  if (active.length === 1) { route(player, entity, cfg, active[0]); return; }
  const form = new ActionFormData().title(cfg.name).body("Que veux-tu faire ?");
  for (const a of active) form.button(actionLabel(a, cfg));
  form.show(player).then((res) => { if (!res.canceled) route(player, entity, cfg, active[res.selection]); });
}
function route(player, entity, cfg, which) {
  if (which === "dialogue") showDialogue(player, entity, cfg);
  else if (which === "trade") showTrade(player, entity, cfg);
  else if (which === "quest") showQuest(player, entity, cfg);
  else if (which === "teleport") showTeleport(player, entity, cfg);
  else if (which === "property") showProperty(player, entity, cfg);
}
function showDialogue(player, entity, cfg) {
  play(player, TALK, entity.location);
  new ActionFormData().title(cfg.name).body(fillName(cfg.dialogue || "...", entity, player)).button("Au revoir").show(player);
}
function showTrade(player, entity, cfg) {
  const list = availableTrades(entity, cfg, player);
  let body = "Choisis un échange.";
  if (cfg.greetByName && prenomChoice(entity, player.id) === "yes") {
    body = "Ravi de te voir, " + (playerPrenom(player) || player.name) + ". " + body;
  }
  const form = new ActionFormData().title(cfg.name + " - Marchandage").body(body);
  for (const entry of list) form.button(tradeLabel(entry.t));
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= list.length) return;
    doTrade(player, entity, cfg, list[res.selection].t, list[res.selection].i);
  });
}
function doTrade(player, entity, cfg, t, index) {
  if (prenomBlocks(player, entity, cfg)) return;
  const cont = container(player);
  if (!cont) return;
  if (limitReached(t.limit, tradeCount(entity, index, player.id))) { player.sendMessage("§eTu as atteint la limite de cet échange."); play(player, "note.bass"); return; }
  if (countItem(cont, t.costId) < t.costCount) {
    let msg = `§cIl te faut ${t.costCount}x ${shortId(t.costId)}.`;
    if (t.costId === COIN_ID) msg += " Retire des pièces via ton menu.";
    player.sendMessage(msg); play(player, "note.bass"); return;
  }
  if (t.sellId !== COIN_ID) {
    try { new ItemStack(t.sellId, t.sellCount); } catch (e) { player.sendMessage("§cCet échange est mal configuré (item vendu invalide)."); return; }
  }
  removeItem(cont, t.costId, t.costCount);
  if (t.sellId === COIN_ID) { addBalance(player, t.sellCount); player.sendMessage("§a+" + t.sellCount + " pièces créditées sur ton compte."); }
  else giveCustom(player, t.sellId, t.sellCount, t.sellName);
  const n = bumpTrade(entity, index, player.id);
  play(player, "random.orb");
  if (isLimited(t.limit) && t.limit - n <= 0) player.sendMessage("§aÉchange effectué. C'était la dernière fois pour toi.");
  else player.sendMessage("§aÉchange effectué !");
}
function showQuest(player, entity, cfg) {
  const q = cfg.quest;
  const cur = questCount(entity, player.id);
  const maxed = limitReached(q.limit, cur);
  const rewardsStr = q.rewards.map((r) => `${r.count}x ${(r.name && String(r.name).trim()) ? r.name : shortId(r.id)}`).join(", ");
  const body = `${fillName(q.description, entity, player)}\n\n§7Demandé : ${q.reqCount}x ${shortId(q.reqId)}\n§7Récompense : ${rewardsStr}`;
  const form = new ActionFormData().title(q.title || "Quête");
  if (maxed) { form.body(body + "\n\n§eTu as déjà accompli cette quête.").button("Fermer"); form.show(player).then(() => {}); return; }
  form.body(body).button("Rendre la quête").button("Plus tard");
  form.show(player).then((res) => { if (!(res.canceled || res.selection === 1)) turnIn(player, entity, cfg); });
}
function turnIn(player, entity, cfg) {
  const q = cfg.quest;
  const cont = container(player);
  if (!cont) return;
  if (limitReached(q.limit, questCount(entity, player.id))) { player.sendMessage("§eTu as déjà accompli cette quête."); return; }
  if (prenomBlocks(player, entity, cfg)) return;
  if (q.requirePrenom && prenomChoice(entity, player.id) !== "yes") {
    player.sendMessage("§eCette quête exige que tu donnes ton prénom au personnage. Reparle-lui et accepte de le partager.");
    setPrenomChoice(entity, player.id, undefined); play(player, "note.bass"); return;
  }
  if (countItem(cont, q.reqId) < q.reqCount) { player.sendMessage(`§cIl te faut ${q.reqCount}x ${shortId(q.reqId)}.`); play(player, "note.bass"); return; }
  for (const r of q.rewards) { try { new ItemStack(r.id, r.count); } catch (e) { player.sendMessage("§cQuête mal configurée (récompense invalide : " + r.id + ")."); return; } }
  removeItem(cont, q.reqId, q.reqCount);
  for (const r of q.rewards) giveCustom(player, r.id, r.count, r.name);
  bumpQuest(entity, player.id);
  player.sendMessage("§a" + fillName(q.done || "Merci !", entity, player));
  play(player, "random.levelup");
}
function showTeleport(player, entity, cfg) {
  const tp = cfg.teleport;
  if (limitReached(tp.limit, tpUseCount(entity, player.id))) { player.sendMessage("§eTu as déjà utilisé ce voyage."); play(player, "note.bass"); return; }
  const cost = (tp.costId && String(tp.costId).trim()) ? (tp.costCount + "x " + shortId(tp.costId)) : "gratuit";
  new ActionFormData().title(cfg.name).body("Destination : " + coordStr(tp) + "\n§7Prix : " + cost)
    .button("Me téléporter").button("Retour")
    .show(player).then((res) => { if (!(res.canceled || res.selection === 1)) doTeleport(player, entity, cfg); });
}
function doTeleport(player, entity, cfg) {
  const tp = cfg.teleport;
  if (limitReached(tp.limit, tpUseCount(entity, player.id))) { player.sendMessage("§eTu as déjà utilisé ce voyage."); return; }
  if (prenomBlocks(player, entity, cfg)) return;
  const cont = container(player);
  if (tp.costId && String(tp.costId).trim()) {
    if (!cont || countItem(cont, tp.costId) < tp.costCount) { player.sendMessage("§cIl te faut " + tp.costCount + "x " + shortId(tp.costId) + "."); play(player, "note.bass"); return; }
    removeItem(cont, tp.costId, tp.costCount);
  }
  try { player.teleport({ x: tp.x + 0.5, y: tp.y, z: tp.z + 0.5 }); } catch (e) {}
  bumpTp(entity, player.id);
  play(player, "mob.endermen.portal");
  player.sendMessage("§aBon voyage !");
}
function showProperty(player, entity, cfg) {
  const pr = cfg.property;
  if (pr.sold) { player.sendMessage("§eCette propriété est déjà vendue."); return; }
  const cost = (pr.costId && String(pr.costId).trim()) ? (pr.costCount + "x " + shortId(pr.costId)) : "gratuit";
  const body = (pr.name ? ("§f" + pr.name + "\n") : "") + "§7Prix : " + cost + "\n§7Zone : " + coordStr(pr.c1) + " → " + coordStr(pr.c2);
  new ActionFormData().title("Acquérir une propriété").body(body)
    .button("Acheter").button("Retour")
    .show(player).then((res) => { if (!(res.canceled || res.selection === 1)) buyProperty(player, entity, cfg); });
}
function buyProperty(player, entity, cfg) {
  const pr = cfg.property;
  if (pr.sold) { player.sendMessage("§eDéjà vendue."); return; }
  if (prenomBlocks(player, entity, cfg)) return;
  const cont = container(player);
  if (pr.costId && String(pr.costId).trim()) {
    if (!cont || countItem(cont, pr.costId) < pr.costCount) { player.sendMessage("§cIl te faut " + pr.costCount + "x " + shortId(pr.costId) + " pour acheter."); play(player, "note.bass"); return; }
    removeItem(cont, pr.costId, pr.costCount);
  }
  let id = pr.id; if (!id) id = makePropId(pr.name);
  const owner = displayName(entity, player);
  let evict;
  try { const el = entity.location; evict = { x: el.x, y: el.y, z: el.z }; } catch (e) {}
  const props = getProps();
  props[id] = { name: pr.name || "Propriété", c1: pr.c1, c2: pr.c2, dim: player.dimension.id, ownerId: player.id, ownerName: owner, locked: false, guests: [], evict };
  saveProps(props);
  try { player.addTag("prop_" + id); } catch (e) {}
  player.sendMessage("§6Félicitations, " + owner + " ! Cette propriété est désormais à toi.");
  play(player, "random.levelup");
  try { entity.remove(); } catch (e) {}
}

// ----- editeur createur -----
export function openMerchantEditor(player, entity, onChangeRole) {
  const cfg = getCfg(entity);
  const m = cfg.modules;
  const tag = (b) => (b ? "§a✔" : "§c✘");
  new ActionFormData()
    .title("Éditeur · Marchand")
    .body(`Nom : ${cfg.name}\nType : ${entity.typeId}\nDialogue ${tag(m.dialogue)}§r  Marchandage ${tag(m.trade)}§r  Quête ${tag(m.quest)}`)
    .button("Nom du PNJ")
    .button("Modules actifs")
    .button("Dialogue")
    .button("Marchandage")
    .button("Quête")
    .button("Téléportation")
    .button("Vente de propriété")
    .button("Déplacer vers moi")
    .button("Voix du PNJ")
    .button("§9Changer de métier")
    .button("§cSupprimer ce PNJ")
    .show(player).then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0: editName(player, entity, cfg); break;
        case 1: editModules(player, entity, cfg); break;
        case 2: editDialogue(player, entity, cfg); break;
        case 3: editTrades(player, entity, cfg); break;
        case 4: editQuest(player, entity, cfg); break;
        case 5: editTeleport(player, entity, cfg); break;
        case 6: editProperty(player, entity, cfg); break;
        case 7: moveHere(player, entity); break;
        case 8: openVoiceEditor(player, entity, () => reopen(player, entity)); break;
        case 9: if (onChangeRole) onChangeRole(); break;
        case 10: confirmDelete(player, entity); break;
      }
    });
}
function reopen(player, entity) { openMerchantEditor(player, entity); }
function editName(player, entity, cfg) {
  const f = new ModalFormData().title("Nom du PNJ");
  f.textField("Nom affiché", "PNJ", { defaultValue: cfg.name });
  f.show(player).then((res) => {
    if (!res.canceled) { cfg.name = res.formValues[0] || cfg.name; setCfg(entity, cfg); try { entity.nameTag = cfg.name; } catch (e) {} }
    reopen(player, entity);
  });
}
function editModules(player, entity, cfg) {
  const f = new ModalFormData().title("Modules actifs");
  f.toggle("Dialogue", { defaultValue: cfg.modules.dialogue });
  f.toggle("Marchandage", { defaultValue: cfg.modules.trade });
  f.toggle("Quête", { defaultValue: cfg.modules.quest });
  f.toggle("Téléportation", { defaultValue: !!cfg.modules.teleport });
  f.toggle("Vente de propriété", { defaultValue: !!cfg.modules.property });
  f.toggle("Saluer par le prénom dans le marchandage", { defaultValue: !!cfg.greetByName });
  f.toggle("Demander son prénom (nécessaire pour le {nom} du dialogue)", { defaultValue: !!cfg.askPrenom });
  f.show(player).then((res) => {
    if (!res.canceled) {
      const v = res.formValues;
      cfg.modules.dialogue = v[0]; cfg.modules.trade = v[1]; cfg.modules.quest = v[2];
      cfg.modules.teleport = v[3]; cfg.modules.property = v[4];
      cfg.greetByName = v[5]; cfg.askPrenom = v[6];
      setCfg(entity, cfg);
    }
    reopen(player, entity);
  });
}
function editDialogue(player, entity, cfg) {
  const f = new ModalFormData().title("Dialogue");
  f.textField("Texte du dialogue. Écris {nom} là où le PNJ doit dire le prénom du joueur", "Bonjour {nom}, que puis-je pour toi ?", { defaultValue: cfg.dialogue });
  f.show(player).then((res) => { if (!res.canceled) { cfg.dialogue = res.formValues[0]; setCfg(entity, cfg); } reopen(player, entity); });
}
function editTrades(player, entity, cfg) {
  const form = new ActionFormData().title("Marchandage").body(cfg.trades.length ? "Échanges configurés :" : "Aucun échange pour l'instant.");
  for (const t of cfg.trades) {
    const lim = isLimited(t.limit) ? ` §7[${t.limit}x par joueur]` : " §7[illimité]";
    form.button(tradeLabel(t) + lim);
  }
  form.button("§2+ Ajouter un échange").button("Retour");
  form.show(player).then((res) => {
    if (res.canceled) return;
    const n = cfg.trades.length;
    if (res.selection < n) editOneTrade(player, entity, cfg, res.selection);
    else if (res.selection === n) editOneTrade(player, entity, cfg, -1);
    else reopen(player, entity);
  });
}
function editOneTrade(player, entity, cfg, index) {
  const isNew = index < 0;
  const t = isNew ? { costId: "minecraft:emerald", costCount: 1, sellId: "minecraft:diamond", sellCount: 1, sellName: "", label: "", limit: LIMIT_MAX } : cfg.trades[index];
  const f = new ModalFormData().title(isNew ? "Nouvel échange" : "Modifier l'échange");
  f.textField("Item demandé (identifiant)", "minecraft:emerald", { defaultValue: t.costId });
  f.slider("Quantité demandée", 1, 64, { valueStep: 1, defaultValue: clampQty(t.costCount) });
  f.textField("Item donné (identifiant)", "minecraft:diamond", { defaultValue: t.sellId });
  f.slider("Quantité donnée", 1, 64, { valueStep: 1, defaultValue: clampQty(t.sellCount) });
  f.textField("Nom personnalisé de l'objet donné (vide = défaut)", "Épée d'entraînement", { defaultValue: t.sellName || "" });
  f.textField("Texte du bouton (vide = automatique)", "3 pièces pour une épée", { defaultValue: t.label || "" });
  f.slider("Fois par joueur (10 = illimité)", 1, 10, { valueStep: 1, defaultValue: clampLimit(t.limit) });
  if (!isNew) f.toggle("Supprimer cet échange", { defaultValue: false });
  f.show(player).then((res) => {
    if (res.canceled) { editTrades(player, entity, cfg); return; }
    const v = res.formValues;
    if (!isNew && v[7] === true) { cfg.trades.splice(index, 1); }
    else {
      const nt = { costId: String(v[0] || "").trim(), costCount: v[1], sellId: String(v[2] || "").trim(), sellCount: v[3], sellName: String(v[4] || "").trim(), label: String(v[5] || "").trim(), limit: v[6] };
      if (isNew) cfg.trades.push(nt); else cfg.trades[index] = nt;
    }
    setCfg(entity, cfg);
    editTrades(player, entity, cfg);
  });
}
function editQuest(player, entity, cfg) {
  const q = cfg.quest;
  const f = new ModalFormData().title("Quête");
  f.textField("Titre", "La cueillette", { defaultValue: q.title });
  f.textField("Description", "Apporte-moi...", { defaultValue: q.description });
  f.textField("Item demandé (identifiant)", "minecraft:wheat", { defaultValue: q.reqId });
  f.slider("Quantité demandée", 1, 64, { valueStep: 1, defaultValue: clampQty(q.reqCount) });
  f.textField("Récompenses, id quantité nom optionnel, séparés par des virgules", "minecraft:wooden_sword 1 Épée, minecraft:bread 3", { defaultValue: stringifyItemList(q.rewards) });
  f.slider("Fois par joueur (10 = illimité)", 1, 10, { valueStep: 1, defaultValue: clampLimit(q.limit) });
  f.textField("Message de fin", "Merci !", { defaultValue: q.done });
  f.toggle("Exiger le prénom du joueur pour cette quête", { defaultValue: !!q.requirePrenom });
  f.show(player).then((res) => {
    if (!res.canceled) {
      const v = res.formValues;
      cfg.quest = { title: String(v[0] || "").trim(), description: String(v[1] || "").trim(), reqId: String(v[2] || "").trim(), reqCount: v[3], rewards: parseItemList(v[4]), limit: v[5], done: String(v[6] || "Merci !"), requirePrenom: !!v[7] };
      setCfg(entity, cfg);
    }
    reopen(player, entity);
  });
}
function editTeleport(player, entity, cfg) {
  const tp = cfg.teleport;
  const f = new ModalFormData().title("Téléportation");
  f.textField("Destination (x y z)", "100 64 -200", { defaultValue: tp.set ? coordStr(tp) : "" });
  f.textField("Item demandé pour payer (vide = gratuit)", "oct_drag:golden_coin", { defaultValue: tp.costId || "" });
  f.slider("Quantité demandée", 1, 64, { valueStep: 1, defaultValue: clampQty(tp.costCount) });
  f.textField("Texte du bouton (vide = automatique)", "Voyager à la capitale", { defaultValue: tp.label || "" });
  f.slider("Fois par joueur (10 = illimité)", 1, 10, { valueStep: 1, defaultValue: clampLimit(tp.limit) });
  f.show(player).then((res) => {
    if (!res.canceled) {
      const v = res.formValues;
      const c = parseCoords(v[0], null);
      cfg.teleport = { set: !!c, x: c ? Math.floor(c.x) : tp.x, y: c ? Math.floor(c.y) : tp.y, z: c ? Math.floor(c.z) : tp.z, costId: String(v[1] || "").trim(), costCount: v[2], label: String(v[3] || "").trim(), limit: v[4] };
      setCfg(entity, cfg);
      if (!c) player.sendMessage("§eCoordonnée non lue, entre trois nombres séparés par des espaces.");
    }
    reopen(player, entity);
  });
}
function editProperty(player, entity, cfg) {
  const pr = cfg.property;
  let storedC1, storedC2;
  try { storedC1 = player.getDynamicProperty(PLY_PC1); } catch (e) {}
  try { storedC2 = player.getDynamicProperty(PLY_PC2); } catch (e) {}
  const c1def = pr.c1 ? coordStr(pr.c1) : coordStr(parseCoords(storedC1, null));
  const c2def = pr.c2 ? coordStr(pr.c2) : coordStr(parseCoords(storedC2, null));
  const f = new ModalFormData().title("Vente de propriété");
  f.textField("Nom de la propriété", "Maison du forgeron", { defaultValue: pr.name || "" });
  f.textField("Coin 1 (x y z)", "100 64 -200", { defaultValue: c1def });
  f.textField("Coin 2 (x y z)", "108 70 -208", { defaultValue: c2def });
  f.textField("Item demandé pour acheter (vide = gratuit)", "oct_drag:golden_coin", { defaultValue: pr.costId || "" });
  f.slider("Quantité demandée", 1, 64, { valueStep: 1, defaultValue: clampQty(pr.costCount) });
  f.show(player).then((res) => {
    if (!res.canceled) {
      const v = res.formValues;
      const a = parseCoords(v[1], pr.c1);
      const b = parseCoords(v[2], pr.c2);
      cfg.property = { id: pr.id || "", name: String(v[0] || "").trim(), c1: a, c2: b, costId: String(v[3] || "").trim(), costCount: v[4], sold: false, ownerId: "", ownerName: "" };
      setCfg(entity, cfg);
      if (!a || !b) player.sendMessage("§eUn des coins n'a pas été lu, entre trois nombres par coin.");
    }
    reopen(player, entity);
  });
}
function moveHere(player, entity) {
  const loc = player.location;
  try { entity.teleport({ x: loc.x, y: loc.y, z: loc.z }); } catch (e) {}
  try { entity.setDynamicProperty("npc:anchor", JSON.stringify({ x: loc.x, y: loc.y, z: loc.z })); } catch (e) {}
  player.sendMessage("§aPNJ déplacé et ancré à ta position.");
  reopen(player, entity);
}
function confirmDelete(player, entity) {
  new ActionFormData().title("Supprimer le PNJ").body("Action définitive. Confirmer ?")
    .button("§cOui, supprimer").button("Annuler")
    .show(player).then((res) => {
      if (res.canceled || res.selection === 1) { reopen(player, entity); return; }
      try { entity.remove(); } catch (e) {}
    });
}

// ----- marquage des coins de propriete a la position du joueur -----
export function markPropCorner(player, which) {
  const l = player.location;
  const s = Math.floor(l.x) + " " + Math.floor(l.y) + " " + Math.floor(l.z);
  try { player.setDynamicProperty(which === 1 ? PLY_PC1 : PLY_PC2, s); } catch (e) {}
  player.sendMessage("§a" + (which === 1 ? "Coin 1" : "Coin 2") + " de propriété enregistré : §f" + s);
}

// ----- acces a une propriete -----
function hasHouseAccess(pr, player) {
  if (pr.ownerId === player.id) return true;
  return Array.isArray(pr.guests) && pr.guests.includes(player.id);
}

// ----- barre d'action + barriere des proprietes verrouillees -----
system.runInterval(() => {
  const props = getProps();
  const ids = Object.keys(props);
  if (!ids.length) return;
  for (const p of world.getPlayers()) {
    let loc, dim;
    try { loc = p.location; dim = p.dimension.id; } catch (e) { continue; }
    if (isCreative(p)) continue;
    for (const id of ids) {
      const pr = props[id];
      if (pr.dim && pr.dim !== dim) continue;
      if (!insideBox(loc, pr.c1, pr.c2)) continue;
      if (pr.locked && !hasHouseAccess(pr, p)) {
        if (pr.evict) { try { p.teleport({ x: pr.evict.x, y: pr.evict.y, z: pr.evict.z }); p.sendMessage("§cCette propriété est verrouillée."); } catch (e) {} }
        break;
      }
      try { p.onScreenDisplay.setActionBar(pr.ownerId === p.id ? "§6Ta propriété" : ("§6Propriété de " + pr.ownerName)); } catch (e) {}
      break;
    }
  }
}, 15);

// ----- gestion de sa maison par le proprietaire (menu de tchat) -----
export function openMyHouses(player) {
  const props = getProps();
  const mine = Object.keys(props).filter((id) => props[id].ownerId === player.id);
  if (!mine.length) { player.sendMessage("§7Tu ne possèdes aucune propriété pour l'instant."); play(player, "note.bass"); return; }
  const form = new ActionFormData().title("Ma maison").body("Tes propriétés. Touche-en une pour la gérer.");
  for (const id of mine) form.button(props[id].name + "\n§7" + (props[id].locked ? "verrouillée" : "ouverte"));
  form.button("Fermer");
  form.show(player).then((res) => { if (!res.canceled && res.selection < mine.length) openHouseManage(player, mine[res.selection]); });
}
function openHouseManage(player, id) {
  const props = getProps();
  const pr = props[id];
  if (!pr || pr.ownerId !== player.id) { player.sendMessage("§7Cette propriété ne t'appartient pas."); return; }
  const guests = Array.isArray(pr.guests) ? pr.guests.length : 0;
  new ActionFormData().title(pr.name)
    .body("État, " + (pr.locked ? "verrouillée" : "ouverte") + ".\nInvités, " + guests + ".\nZone, " + coordStr(pr.c1) + " → " + coordStr(pr.c2) + ".")
    .button(pr.locked ? "Déverrouiller" : "Verrouiller")
    .button("Inviter un joueur")
    .button("Retirer un invité")
    .button("Retour")
    .show(player).then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) {
        const p2 = getProps();
        if (p2[id]) { p2[id].locked = !p2[id].locked; saveProps(p2); player.sendMessage(p2[id].locked ? "§aMaison verrouillée. Les intrus seront renvoyés." : "§eMaison déverrouillée, tout le monde peut entrer."); }
        openHouseManage(player, id);
      } else if (res.selection === 1) inviteHouse(player, id);
      else if (res.selection === 2) removeHouseGuest(player, id);
    });
}
function inviteHouse(player, id) {
  const others = world.getAllPlayers().filter((p) => p.id !== player.id);
  if (!others.length) { player.sendMessage("§7Personne d'autre en ligne."); openHouseManage(player, id); return; }
  const form = new ActionFormData().title("Inviter").body("Qui peut entrer chez toi ?");
  for (const p of others) form.button(p.name);
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= others.length) { openHouseManage(player, id); return; }
    const guest = others[res.selection];
    const props = getProps();
    const pr = props[id];
    if (!pr || pr.ownerId !== player.id) return;
    if (!Array.isArray(pr.guests)) pr.guests = [];
    if (!pr.guests.includes(guest.id)) pr.guests.push(guest.id);
    saveProps(props);
    player.sendMessage("§a" + guest.name + " peut entrer chez toi.");
    try { guest.sendMessage("§e" + player.name + " t'autorise à entrer dans sa propriété " + pr.name + "."); } catch (e) {}
    openHouseManage(player, id);
  });
}
function removeHouseGuest(player, id) {
  const props = getProps();
  const pr = props[id];
  if (!pr || pr.ownerId !== player.id || !Array.isArray(pr.guests) || !pr.guests.length) { player.sendMessage("§7Aucun invité."); openHouseManage(player, id); return; }
  const online = world.getAllPlayers();
  const ids = [...pr.guests];
  const form = new ActionFormData().title("Retirer un invité").body("Qui retirer ?");
  for (const gid of ids) { const p = online.find((x) => x.id === gid); form.button(p ? p.name : "Joueur hors ligne"); }
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= ids.length) { openHouseManage(player, id); return; }
    const p2 = getProps();
    if (p2[id] && Array.isArray(p2[id].guests)) { p2[id].guests = p2[id].guests.filter((g) => g !== ids[res.selection]); saveProps(p2); }
    player.sendMessage("§aInvité retiré.");
    openHouseManage(player, id);
  });
}

// ----- moderation : biens d'un joueur cible -----
export function propertiesCountOf(ownerId) {
  const props = getProps();
  return Object.keys(props).filter((id) => props[id].ownerId === ownerId).length;
}
export function openPlayerHousesAdmin(viewer, targetId, targetName) {
  const props = getProps();
  const ids = Object.keys(props).filter((id) => props[id].ownerId === targetId);
  if (!ids.length) { viewer.sendMessage("§7" + targetName + " ne possède aucun bien."); return; }
  const form = new ActionFormData().title("Biens de " + targetName).body("Touche un bien pour le supprimer.");
  for (const id of ids) form.button(props[id].name + "\n§7" + (props[id].locked ? "verrouillée" : "ouverte"));
  form.button("§cTout supprimer");
  form.button("Retour");
  form.show(viewer).then((res) => {
    if (res.canceled) return;
    if (res.selection < ids.length) {
      const id = ids[res.selection];
      const p2 = getProps(); delete p2[id]; saveProps(p2);
      viewer.sendMessage("§aBien supprimé.");
      openPlayerHousesAdmin(viewer, targetId, targetName);
    } else if (res.selection === ids.length) {
      const p2 = getProps();
      for (const id of ids) delete p2[id];
      saveProps(p2);
      viewer.sendMessage("§aTous les biens de " + targetName + " ont été supprimés.");
    }
  });
}

// ----- administration des proprietes (ops et creatif) -----
export function openPropertyAdmin(player) {
  const props = getProps();
  const ids = Object.keys(props);
  if (!ids.length) { player.sendMessage("§7Aucune propriété enregistrée dans le monde."); return; }
  const form = new ActionFormData().title("Propriétés du monde").body(ids.length + " propriété(s).");
  for (const id of ids) form.button(props[id].name + "\n§7" + props[id].ownerName + (props[id].locked ? ", verrouillée" : ", ouverte"));
  form.button("Retour");
  form.show(player).then((res) => { if (!res.canceled && res.selection < ids.length) adminOneProperty(player, ids[res.selection]); });
}
function adminOneProperty(player, id) {
  const props = getProps();
  const pr = props[id];
  if (!pr) { openPropertyAdmin(player); return; }
  new ActionFormData().title(pr.name).body("Propriétaire, " + pr.ownerName + ".\nÉtat, " + (pr.locked ? "verrouillée" : "ouverte") + ".\nZone, " + coordStr(pr.c1) + " → " + coordStr(pr.c2) + ".")
    .button("Me téléporter à la zone")
    .button(pr.locked ? "Déverrouiller" : "Verrouiller")
    .button("§cSupprimer cette propriété")
    .button("Retour")
    .show(player).then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) { try { player.teleport({ x: pr.c1.x + 0.5, y: pr.c1.y, z: pr.c1.z + 0.5 }); } catch (e) {} }
      else if (res.selection === 1) { const p2 = getProps(); if (p2[id]) { p2[id].locked = !p2[id].locked; saveProps(p2); } adminOneProperty(player, id); }
      else if (res.selection === 2) { const p2 = getProps(); delete p2[id]; saveProps(p2); player.sendMessage("§aPropriété supprimée."); openPropertyAdmin(player); }
      else openPropertyAdmin(player);
    });
}
