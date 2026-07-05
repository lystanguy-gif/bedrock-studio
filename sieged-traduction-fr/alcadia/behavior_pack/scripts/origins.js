import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { addBalance } from "./util.js";

// ===================== identité du joueur =====================
const DP_PRENOM = "origin:prenom";   // utilisé aussi par le marchand
const DP_SEXE = "origin:sexe";
const DP_GABARIT = "origin:gabarit"; // "frele" | "standard" | "imposant" | "colosse"
const DP_NATION = "origin:nation";   // id de civilisation
const DP_DONE = "origin:done";

// ===================== registre des peuples ===================
const WDP_NATIONS = "nations:state"; // { civId: { name, founderId, founderName, rp:{x,y,z,dim} } }

// ===================== gabarits ===============================
const GABARITS = [
  { id: "frele", label: "Frêle, vif et rapide, aucun bonus de combat" },
  { id: "standard", label: "Standard, le gabarit de référence" },
  { id: "imposant", label: "Imposant, plus de vie et de dégâts, lourdeur passagère" },
  { id: "colosse", label: "Colosse, très résistant et puissant, fortes lourdeurs" },
];
const GAB_NAME = { frele: "Frêle", standard: "Standard", imposant: "Imposant", colosse: "Colosse" };

// ===================== civilisations AoE2 DE (juin 2026) ======
const CIVS = [
  ["armeniens", "Arméniens"], ["azteques", "Aztèques"], ["bengalis", "Bengalis"],
  ["berberes", "Berbères"], ["bohemiens", "Bohémiens"], ["bretons", "Bretons"],
  ["bulgares", "Bulgares"], ["bourguignons", "Bourguignons"], ["birmans", "Birmans"],
  ["byzantins", "Byzantins"], ["celtes", "Celtes"], ["chinois", "Chinois"],
  ["coumans", "Coumans"], ["dravidiens", "Dravidiens"], ["ethiopiens", "Éthiopiens"],
  ["francs", "Francs"], ["georgiens", "Géorgiens"], ["goths", "Goths"],
  ["gurjaras", "Gurjaras"], ["hindoustanis", "Hindoustanis"], ["huns", "Huns"],
  ["incas", "Incas"], ["italiens", "Italiens"], ["japonais", "Japonais"],
  ["jurchens", "Jurchens"], ["khitans", "Khitans"], ["khmers", "Khmers"],
  ["coreens", "Coréens"], ["lituaniens", "Lituaniens"], ["magyars", "Magyars"],
  ["malais", "Malais"], ["maliens", "Maliens"], ["mapuches", "Mapuches"],
  ["mayas", "Mayas"], ["mongols", "Mongols"], ["muiscas", "Muiscas"],
  ["perses", "Perses"], ["polonais", "Polonais"], ["portugais", "Portugais"],
  ["romains", "Romains"], ["sarrasins", "Sarrasins"], ["shu", "Shu"],
  ["siciliens", "Siciliens"], ["slaves", "Slaves"], ["espagnols", "Espagnols"],
  ["tatars", "Tatars"], ["teutons", "Teutons"], ["tupis", "Tupis"],
  ["turcs", "Turcs"], ["vietnamiens", "Vietnamiens"], ["vikings", "Vikings"],
  ["wei", "Wei"], ["wu", "Wu"],
];
function civName(id) { for (const c of CIVS) if (c[0] === id) return c[1]; return id; }

// ===================== stockage des peuples ===================
function loadNations() {
  try { const raw = world.getDynamicProperty(WDP_NATIONS); if (typeof raw === "string") { const o = JSON.parse(raw); if (o && typeof o === "object") return o; } } catch (e) {}
  return {};
}
function saveNations(o) { try { world.setDynamicProperty(WDP_NATIONS, JSON.stringify(o)); } catch (e) {} }
function foundedIds() { return Object.keys(loadNations()); }
function availableCivs() { const taken = foundedIds(); return CIVS.filter((c) => taken.indexOf(c[0]) < 0); }

// ===================== fiche + reset ==========================
export function describeCharacter(player) {
  let pr, sx, gb, na;
  try { pr = player.getDynamicProperty(DP_PRENOM); sx = player.getDynamicProperty(DP_SEXE); gb = player.getDynamicProperty(DP_GABARIT); na = player.getDynamicProperty(DP_NATION); } catch (e) {}
  const nat = na ? civName(na) : "aucune";
  const st = loadNations()[na];
  const role = (st && st.founderId === player.id) ? " (fondateur)" : "";
  return "§ePersonnage\n§7Prénom §f" + (pr || "non défini") + "\n§7Sexe §f" + (sx || "non défini") + "\n§7Gabarit §f" + (GAB_NAME[gb] || "non défini") + "\n§7Civilisation §f" + nat + role;
}
export function isCharacterCreated(player) {
  try { return player.getDynamicProperty(DP_DONE) === true; } catch (e) { return false; }
}
export function resetCharacter(player) {
  try {
    player.setDynamicProperty(DP_PRENOM, undefined);
    player.setDynamicProperty(DP_SEXE, undefined);
    player.setDynamicProperty(DP_GABARIT, undefined);
    player.setDynamicProperty(DP_NATION, undefined);
    player.setDynamicProperty(DP_DONE, undefined);
  } catch (e) {}
}

// ===================== création ===============================
function startCreation(player) {
  const f = new ModalFormData().title("Création de ton personnage")
    .textField("Ton prénom", "20 caractères maximum", { defaultValue: "" })
    .dropdown("Sexe", ["Homme", "Femme", "Autre"], { defaultValueIndex: 0 })
    .dropdown("Gabarit", GABARITS.map((g) => g.label), { defaultValueIndex: 1 });
  f.show(player).then((res) => {
    if (res.canceled) { reprompt(player); return; }
    const prenom = String(res.formValues[0] || "").trim().slice(0, 20);
    if (!prenom) { player.sendMessage("§cIl faut un prénom."); reprompt(player); return; }
    const sexe = ["Homme", "Femme", "Autre"][res.formValues[1] | 0];
    const gab = GABARITS[res.formValues[2] | 0].id;
    try { player.setDynamicProperty(DP_PRENOM, prenom); player.setDynamicProperty(DP_SEXE, sexe); player.setDynamicProperty(DP_GABARIT, gab); } catch (e) {}
    chooseNation(player);
  });
}

function chooseNation(player) {
  const founded = foundedIds().length;
  new ActionFormData().title("Ton peuple")
    .body("Tu peux fonder une civilisation encore libre et en devenir le chef, ou rejoindre une civilisation déjà fondée par un autre joueur.\n\n§7Civilisations déjà fondées, " + founded + ".")
    .button("Fonder une civilisation")
    .button("Rejoindre une civilisation")
    .show(player).then((res) => {
      if (res.canceled) { reprompt(player); return; }
      if (res.selection === 0) foundNation(player);
      else joinNation(player);
    });
}

function foundNation(player) {
  const avail = availableCivs();
  if (!avail.length) { player.sendMessage("§eToutes les civilisations sont déjà prises. Rejoins-en une."); chooseNation(player); return; }
  const f = new ModalFormData().title("Fonder une civilisation")
    .dropdown("Choisis la civilisation que tu vas fonder", avail.map((c) => c[1]), { defaultValueIndex: 0 });
  f.show(player).then((res) => {
    if (res.canceled) { chooseNation(player); return; }
    const civ = avail[res.formValues[0] | 0];
    if (!civ) { chooseNation(player); return; }
    const nations = loadNations();
    if (nations[civ[0]]) { player.sendMessage("§cCette civilisation vient d'être prise. Choisis-en une autre."); foundNation(player); return; }
    nations[civ[0]] = { name: civ[1], founderId: player.id, founderName: player.name, rp: null };
    saveNations(nations);
    try { player.setDynamicProperty(DP_NATION, civ[0]); } catch (e) {}
    finalize(player, true, civ[1]);
    player.sendMessage("§aTu as fondé les " + civ[1] + " et tu en es le chef.\n§7Place toi à ta future capitale et ouvre Mon peuple dans la montre pour définir le point de ralliement de tes membres.");
  });
}

function joinNation(player) {
  const nations = loadNations();
  const ids = Object.keys(nations);
  if (!ids.length) { player.sendMessage("§eAucune civilisation n'a encore été fondée. Fonde la première."); chooseNation(player); return; }
  const labels = ids.map((id) => nations[id].name + " §7(chef " + nations[id].founderName + ")");
  const f = new ModalFormData().title("Rejoindre une civilisation")
    .dropdown("Civilisations existantes", labels, { defaultValueIndex: 0 });
  f.show(player).then((res) => {
    if (res.canceled) { chooseNation(player); return; }
    const id = ids[res.formValues[0] | 0];
    if (!id || !nations[id]) { chooseNation(player); return; }
    try { player.setDynamicProperty(DP_NATION, id); } catch (e) {}
    finalize(player, false, nations[id].name);
    player.sendMessage("§aTu as rejoint les " + nations[id].name + ". Tu peux te rendre à ton point de ralliement quand tu veux depuis Mon peuple dans la montre.");
  });
}

function teleportToRally(player, nation) {
  try {
    if (!nation || !nation.rp) return;
    const d = world.getDimension(nation.rp.dim || "minecraft:overworld");
    player.teleport({ x: nation.rp.x + 0.5, y: nation.rp.y, z: nation.rp.z + 0.5 }, { dimension: d });
  } catch (e) {}
}

function finalize(player, isFounder, natName) {
  try { player.setDynamicProperty(DP_DONE, true); } catch (e) {}
  try { addBalance(player, 100); } catch (e) {}
  try { player.runCommand("give @s bread 8"); } catch (e) {}
  try { player.runCommand("give @s torch 8"); } catch (e) {}
  player.sendMessage("§7Tu reçois 100 pièces sur ton compte et un petit équipement de départ.");
  system.runTimeout(() => spawnForNation(player), 10);
}

// Envoie le joueur au point ou dans la zone de spawn de son peuple, si l'admin l'a défini
function spawnForNation(player) {
  try {
    const na = player.getDynamicProperty(DP_NATION);
    if (!na) return;
    const nation = loadNations()[na];
    if (!nation || !nation.spawn || !nation.spawn.a) return;
    const a = nation.spawn.a, b = nation.spawn.b;
    let x, y, z, dim;
    if (b) {
      const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
      const minZ = Math.min(a.z, b.z), maxZ = Math.max(a.z, b.z);
      x = minX + Math.floor(Math.random() * (maxX - minX + 1)) + 0.5;
      z = minZ + Math.floor(Math.random() * (maxZ - minZ + 1)) + 0.5;
      y = Math.max(a.y, b.y);
      dim = a.dim || "minecraft:overworld";
    } else { x = a.x + 0.5; y = a.y; z = a.z + 0.5; dim = a.dim || "minecraft:overworld"; }
    const d = world.getDimension(dim);
    player.teleport({ x, y, z }, { dimension: d });
  } catch (e) {}
}

// Menu admin : régler le spawn de chaque peuple en validant les coins à sa position
export function openNationSpawnsAdmin(player) {
  const nations = loadNations();
  const ids = Object.keys(nations);
  const form = new ActionFormData().title("Spawns des peuples")
    .body(ids.length ? "Choisis un peuple pour régler l'endroit où ses joueurs apparaissent." : "Aucun peuple fondé pour l'instant.");
  for (const id of ids) {
    const sp = nations[id].spawn;
    const tag = sp && sp.a ? (sp.b ? " §a(zone)" : " §a(point)") : " §7(non défini)";
    form.button(nations[id].name + tag);
  }
  form.button("Fermer");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= ids.length) return;
    openOneNationSpawn(player, ids[res.selection]);
  });
}

function openOneNationSpawn(player, id) {
  const n = loadNations()[id];
  if (!n) return;
  const sp = n.spawn || {};
  let desc;
  if (sp.a && sp.b) desc = "Zone définie.\nCoin 1, " + sp.a.x + " " + sp.a.y + " " + sp.a.z + "\nCoin 2, " + sp.b.x + " " + sp.b.y + " " + sp.b.z + "\nLes joueurs apparaissent au hasard dans cette zone.";
  else if (sp.a) desc = "Point unique défini, " + sp.a.x + " " + sp.a.y + " " + sp.a.z + ".";
  else desc = "Aucun spawn défini. Place toi à l'endroit voulu et valide le coin 1, puis reviens pour le coin 2 si tu veux une zone.";
  new ActionFormData().title("Spawn, " + n.name).body(desc)
    .button("Valider le coin 1 ici")
    .button("Valider le coin 2 ici (crée une zone)")
    .button("§ePoint unique ici")
    .button("§cEffacer le spawn")
    .button("Retour")
    .show(player).then((r) => {
      if (r.canceled || r.selection === 4) return;
      const cur = loadNations(); const nn = cur[id]; if (!nn) return;
      if (!nn.spawn) nn.spawn = {};
      const l = player.location;
      const pos = { x: Math.floor(l.x), y: Math.floor(l.y), z: Math.floor(l.z), dim: player.dimension.id };
      if (r.selection === 0) { nn.spawn.a = pos; saveNations(cur); player.sendMessage("§aCoin 1 défini ici. Ferme, déplace toi, rouvre et valide le coin 2, ou laisse en point unique."); }
      else if (r.selection === 1) { if (!nn.spawn.a) { player.sendMessage("§cDéfinis d'abord le coin 1."); } else { nn.spawn.b = pos; saveNations(cur); player.sendMessage("§aCoin 2 défini, la zone de spawn est créée."); } }
      else if (r.selection === 2) { nn.spawn.a = pos; nn.spawn.b = null; saveNations(cur); player.sendMessage("§aPoint de spawn unique défini ici."); }
      else if (r.selection === 3) { nn.spawn = {}; saveNations(cur); player.sendMessage("§7Spawn du peuple effacé."); }
      openOneNationSpawn(player, id);
    });
}

function reprompt(player) {
  system.runTimeout(() => { try { if (player.getDynamicProperty(DP_DONE) !== true) startCreation(player); } catch (e) {} }, 40);
}

// ===================== menu Mon peuple ========================
export function openMyNation(player) {
  let na; try { na = player.getDynamicProperty(DP_NATION); } catch (e) {}
  const nations = loadNations();
  const nation = na ? nations[na] : null;
  if (!nation) {
    try { player.setDynamicProperty(DP_NATION, undefined); } catch (e) {}
    player.sendMessage("§7Tu n'appartiens à aucune civilisation. Choisis-en une.");
    chooseNation(player);
    return;
  }
  const isFounder = nation.founderId === player.id;
  const members = world.getAllPlayers().filter((p) => { try { return p.getDynamicProperty(DP_NATION) === na; } catch (e) { return false; } });
  const form = new ActionFormData().title(nation.name)
    .body("Chef " + nation.founderName + "\n§7Membres en ligne, " + members.length + (isFounder ? "\n§7Tu es le chef de cette civilisation." : ""));
  const acts = [];
  form.button("Voir les membres en ligne"); acts.push("members");
  form.button("Me téléporter au point de ralliement"); acts.push("rally");
  if (isFounder) { form.button("Définir le point de ralliement ici"); acts.push("setrally"); }
  form.button(isFounder ? "§cDissoudre ma civilisation" : "§cQuitter la civilisation"); acts.push("leave");
  form.button("Fermer"); acts.push("close");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= acts.length) return;
    const a = acts[res.selection];
    if (a === "members") {
      const list = members.map((p) => "§f" + p.name).join("\n") || "§7Personne en ligne.";
      new ActionFormData().title("Membres, " + nation.name).body(list).button("Retour").show(player).then(() => openMyNation(player));
    } else if (a === "rally") {
      teleportToRally(player, nation); player.sendMessage("§aTéléporté au ralliement.");
    } else if (a === "setrally" && isFounder) {
      const loc = player.location; const all = loadNations();
      if (all[na]) { all[na].rp = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z), dim: player.dimension.id }; saveNations(all); player.sendMessage("§aPoint de ralliement défini ici. Les nouveaux membres arriveront à cet endroit."); }
    } else if (a === "leave") {
      confirmLeaveNation(player, na, nation, isFounder);
    }
  });
}

// ===================== quitter ou dissoudre sa civilisation ===
function confirmLeaveNation(player, na, nation, isFounder) {
  const body = isFounder
    ? "Tu es le chef des " + nation.name + ".\nSi tu pars, la civilisation est §cdissoute§r : elle redevient disponible à la fondation, et ses membres devront en choisir une autre.\n\nContinuer ?"
    : "Quitter les " + nation.name + " ?\nTu pourras ensuite fonder une civilisation libre ou en rejoindre une autre.";
  new ActionFormData().title("Quitter la civilisation").body(body)
    .button(isFounder ? "§cOui, dissoudre et partir" : "§cOui, quitter")
    .button("Annuler")
    .show(player).then((res) => {
      if (res.canceled || res.selection === 1) { openMyNation(player); return; }
      if (isFounder) {
        const all = loadNations();
        delete all[na];
        saveNations(all);
        try { world.sendMessage("§7La civilisation des §f" + nation.name + "§7 a été dissoute par son chef."); } catch (e) {}
      }
      try { player.setDynamicProperty(DP_NATION, undefined); } catch (e) {}
      player.sendMessage(isFounder ? "§eTu as dissous les " + nation.name + "." : "§eTu as quitté les " + nation.name + ".");
      chooseNation(player);
    });
}

// ===================== menu admin Civilisations ===============
export function openCivAdmin(player) {
  const nations = loadNations();
  const ids = Object.keys(nations);
  const form = new ActionFormData().title("Civilisations")
    .body(ids.length ? ("Fondées, " + ids.length + " sur " + CIVS.length + ". Touche une civilisation pour la gérer.") : "Aucune civilisation fondée pour l'instant.");
  for (const id of ids) form.button(nations[id].name + "\n§7chef " + nations[id].founderName);
  form.button("Fermer");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= ids.length) return;
    const id = ids[res.selection];
    const n = nations[id];
    new ActionFormData().title(n.name).body("Chef " + n.founderName + "\n§7Libérer rend la civilisation à nouveau disponible. Les membres actuels gardent leur appartenance jusqu'à ce qu'ils en changent.")
      .button("§cLibérer cette civilisation").button("Retour")
      .show(player).then((r2) => {
        if (r2.canceled || r2.selection !== 0) { openCivAdmin(player); return; }
        const cur = loadNations(); delete cur[id]; saveNations(cur);
        player.sendMessage("§aCivilisation " + n.name + " libérée, elle peut de nouveau être fondée.");
        openCivAdmin(player);
      });
  });
}

// ===================== effets de gabarit ======================
function eff(player, name, secs, amp) { try { player.runCommand(`effect @s ${name} ${secs} ${amp} true`); } catch (e) {} }

// rafraîchit les effets permanents toutes les 5 s
system.runInterval(() => {
  for (const p of world.getAllPlayers()) {
    let g; try { if (p.getDynamicProperty(DP_DONE) !== true) continue; g = p.getDynamicProperty(DP_GABARIT); } catch (e) { continue; }
    if (g === "frele") { eff(p, "speed", 6, 0); eff(p, "jump_boost", 6, 0); }
    else if (g === "imposant") { eff(p, "health_boost", 6, 0); eff(p, "strength", 6, 0); }
    else if (g === "colosse") { eff(p, "health_boost", 6, 1); eff(p, "strength", 6, 0); eff(p, "resistance", 6, 0); }
  }
}, 100);

// lourdeur passagère, cadence par horloge globale
let gabTick = 0;
system.runInterval(() => {
  gabTick++;
  for (const p of world.getAllPlayers()) {
    let g; try { if (p.getDynamicProperty(DP_DONE) !== true) continue; g = p.getDynamicProperty(DP_GABARIT); } catch (e) { continue; }
    if (g === "imposant" && gabTick % 30 === 0) eff(p, "slowness", 2, 0);
    else if (g === "colosse" && gabTick % 30 === 0) eff(p, "slowness", 3, 1);
  }
}, 20);

// ===================== connexion ==============================
world.afterEvents.playerSpawn.subscribe((ev) => {
  const p = ev.player;
  if (ev.initialSpawn) {
    try { if (p.getDynamicProperty(DP_DONE) !== true) system.runTimeout(() => startCreation(p), 30); } catch (e) {}
    return;
  }
  try { if (p.getDynamicProperty(DP_DONE) === true) system.runTimeout(() => spawnForNation(p), 10); } catch (e) {}
});

// ===================== commandes ==============================
const CMD = "origin";
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (!ev.id.startsWith(CMD + ":")) return;
  const sub = ev.id.slice(CMD.length + 1);
  const src = ev.sourceEntity;
  const reply = (m) => { try { if (src) src.sendMessage(m); else world.sendMessage(m); } catch (e) {} };
  if (sub === "help") reply("§e=== Peuples d'Alcadia ===\n§7Chaque joueur fonde ou rejoint une civilisation à la première connexion.\n§f/scriptevent origin:open §7rouvre le choix.\n§f/scriptevent origin:reset §7efface ton personnage.");
  else if (sub === "open") { if (src && src.typeId === "minecraft:player") { try { src.setDynamicProperty(DP_DONE, undefined); } catch (e) {} startCreation(src); } }
  else if (sub === "reset") { if (src && src.typeId === "minecraft:player") { resetCharacter(src); reply("§aPersonnage effacé. Reconnecte toi ou fais /scriptevent origin:open."); } }
});
