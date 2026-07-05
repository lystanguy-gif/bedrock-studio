import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { COIN_ID, giveList, container, countItem, removeItem, shortId, parseItemList, addBalance } from "./util.js";
import { openVoiceEditor } from "./voices.js";

const WDP_CAREERS = "npc:careers";
const DP_OCAR = "npc:career";   // filiere rattachee a un officier (sur l'entite)
const DP_PCAR = "npc:pcar";     // filiere du joueur
const DP_PLVL = "npc:plvl";     // index de grade du joueur
const DP_PPAID = "npc:ppaid";   // horodatage du dernier salaire
const RANK_PREFIX = "rank_";
const SALARY_TICKS = 100;

function getCareers() { try { return JSON.parse(world.getDynamicProperty(WDP_CAREERS) ?? "{}"); } catch (e) { return {}; } }
function saveCareers(o) { try { world.setDynamicProperty(WDP_CAREERS, JSON.stringify(o)); } catch (e) {} }
function sanitize(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""); }

function setGrade(pl, carId, idx) {
  for (const t of pl.getTags()) { if (t.startsWith(RANK_PREFIX)) pl.removeTag(t); }
  pl.addTag(RANK_PREFIX + carId + "_" + idx);
  pl.setDynamicProperty(DP_PCAR, carId);
  pl.setDynamicProperty(DP_PLVL, idx);
  pl.setDynamicProperty(DP_PPAID, Date.now());
}
function clearGrade(pl) {
  for (const t of pl.getTags()) { if (t.startsWith(RANK_PREFIX)) pl.removeTag(t); }
  pl.setDynamicProperty(DP_PCAR, undefined);
  pl.setDynamicProperty(DP_PLVL, undefined);
  pl.setDynamicProperty(DP_PPAID, undefined);
}

// ----- salaire automatique -----
function paySalaries() {
  const careers = getCareers();
  for (const pl of world.getPlayers()) {
    const carId = pl.getDynamicProperty(DP_PCAR); if (!carId) continue;
    const car = careers[carId]; if (!car) continue;
    const lvl = pl.getDynamicProperty(DP_PLVL) ?? 0;
    const g = car.grades[lvl]; if (!g) continue;
    const salary = g.salary | 0, mins = g.intervalMin;
    if (salary <= 0 || !mins || mins <= 0) continue;
    const period = mins * 60000, now = Date.now();
    let paid = pl.getDynamicProperty(DP_PPAID);
    if (typeof paid !== "number") { pl.setDynamicProperty(DP_PPAID, now); continue; }
    const elapsed = now - paid;
    if (elapsed >= period) {
      const k = Math.floor(elapsed / period);
      addBalance(pl, salary * k);
      pl.setDynamicProperty(DP_PPAID, paid + k * period);
      try { pl.onScreenDisplay.setActionBar("§eSalaire +" + (salary * k) + " pièces sur ton compte"); } catch (e) {}
    }
  }
}

// ----- menu joueur : s'engager / promotion / demission -----
export function openOfficerMenu(player, officer) {
  const carId = officer.getDynamicProperty(DP_OCAR);
  if (!carId) { player.sendMessage("§cCet officier n'est rattaché à aucune filière."); return; }
  const careers = getCareers();
  const car = careers[carId];
  if (!car || !car.grades.length) { player.sendMessage("§cCette filière n'existe plus ou n'a aucun grade."); return; }
  const myCar = player.getDynamicProperty(DP_PCAR);
  const myLvl = player.getDynamicProperty(DP_PLVL) ?? 0;
  const form = new ActionFormData().title(car.name);

  if (myCar && myCar !== carId) {
    const other = careers[myCar];
    const oname = other ? other.name : myCar;
    form.body("Tu sers déjà dans la filière « " + oname + " ».\nDémissionne d'abord pour rejoindre celle-ci.")
      .button("Quitter « " + oname + " »").button("Fermer")
      .show(player).then((r) => { if (!r.canceled && r.selection === 0) { clearGrade(player); player.sendMessage("§eTu as quitté la filière « " + oname + " »."); } });
    return;
  }
  if (!myCar) {
    const g0 = car.grades[0];
    form.body("Filière : " + car.name + "\nGrade de départ : " + g0.name + "\nSalaire : " + g0.salary + " pièces toutes les " + g0.intervalMin + " min.")
      .button("M'engager comme " + g0.name).button("Fermer")
      .show(player).then((r) => {
        if (r.canceled || r.selection === 1) return;
        setGrade(player, carId, 0); giveList(player, g0.kit);
        player.sendMessage("§aTu rejoins « " + car.name + " » au grade " + g0.name + ".");
      });
    return;
  }
  const g = car.grades[myLvl];
  const next = car.grades[myLvl + 1];
  let body = "Grade actuel : " + g.name + "\nSalaire : " + g.salary + " pièces / " + g.intervalMin + " min.";
  const actions = [];
  if (next) {
    body += "\n\nProchain grade : " + next.name + "\nConditions : " + next.reqCount + " × " + shortId(next.reqId);
    form.button("Demander une promotion"); actions.push("promote");
  } else { body += "\n\nTu es au grade le plus élevé."; }
  form.body(body);
  form.button("Démissionner"); actions.push("resign");
  form.button("Fermer"); actions.push("close");
  form.show(player).then((r) => {
    if (r.canceled) return;
    const act = actions[r.selection];
    if (act === "promote") {
      const have = countItem(container(player), next.reqId);
      if (next.reqId && have < next.reqCount) { player.sendMessage("§cIl te manque " + (next.reqCount - have) + " × " + shortId(next.reqId) + " pour être promu."); return; }
      if (next.reqId) removeItem(container(player), next.reqId, next.reqCount);
      setGrade(player, carId, myLvl + 1); giveList(player, next.kit);
      player.sendMessage("§6Promotion ! Tu es désormais " + next.name + ".");
    } else if (act === "resign") {
      clearGrade(player); player.sendMessage("§eTu as démissionné de « " + car.name + " ».");
    }
  });
}

// ----- editeur createur -----
export function openOfficerEditor(player, officer, onChangeRole) {
  const careers = getCareers();
  const carId = officer.getDynamicProperty(DP_OCAR);
  const car = carId ? careers[carId] : undefined;
  const form = new ActionFormData().title("Éditeur · Officier")
    .body(car ? ("Filière rattachée : " + car.name + "\n" + car.grades.length + " grade(s).") : "Cet officier n'est rattaché à aucune filière.");
  const actions = [];
  if (car) { form.button("Gérer les grades de « " + car.name + " »"); actions.push("grades"); }
  form.button("Créer une filière"); actions.push("new");
  form.button("Rattacher une filière existante"); actions.push("pick");
  form.button("Voix du PNJ"); actions.push("voice");
  form.button("§9Changer de métier"); actions.push("role");
  form.button("Fermer"); actions.push("close");
  form.show(player).then((r) => {
    if (r.canceled || r.selection >= actions.length) return;
    const a = actions[r.selection];
    if (a === "grades") manageGrades(player, officer, carId, onChangeRole);
    else if (a === "new") createCareer(player, officer, onChangeRole);
    else if (a === "pick") pickCareer(player, officer, onChangeRole);
    else if (a === "voice") openVoiceEditor(player, officer, () => openOfficerEditor(player, officer, onChangeRole));
    else if (a === "role") { if (onChangeRole) onChangeRole(); }
  });
}
function createCareer(player, officer, onChangeRole) {
  const f = new ModalFormData().title("Nouvelle filière");
  f.textField("Nom de la filière", "Garde de la cité", { defaultValue: "" });
  f.show(player).then((res) => {
    if (res.canceled) { openOfficerEditor(player, officer, onChangeRole); return; }
    const name = String(res.formValues[0] || "").trim();
    const id = sanitize(name);
    if (!name || !id) { player.sendMessage("§cNom invalide."); openOfficerEditor(player, officer, onChangeRole); return; }
    const careers = getCareers();
    careers[id] = careers[id] || { name, grades: [] };
    careers[id].name = name;
    saveCareers(careers);
    officer.setDynamicProperty(DP_OCAR, id);
    player.sendMessage("§aFilière « " + name + " » créée et rattachée à cet officier. Ajoute-lui des grades.");
    manageGrades(player, officer, id, onChangeRole);
  });
}
function pickCareer(player, officer, onChangeRole) {
  const careers = getCareers();
  const ids = Object.keys(careers);
  if (!ids.length) { player.sendMessage("§7Aucune filière n'existe encore. Crée-en une."); openOfficerEditor(player, officer, onChangeRole); return; }
  const form = new ActionFormData().title("Rattacher une filière").body("Quelle filière sert cet officier ?");
  for (const id of ids) form.button(careers[id].name + "\n§7" + careers[id].grades.length + " grade(s)");
  form.button("Retour");
  form.show(player).then((r) => {
    if (r.canceled || r.selection >= ids.length) { openOfficerEditor(player, officer, onChangeRole); return; }
    const id = ids[r.selection];
    officer.setDynamicProperty(DP_OCAR, id);
    player.sendMessage("§aOfficier rattaché à « " + careers[id].name + " ».");
    openOfficerEditor(player, officer, onChangeRole);
  });
}
function manageGrades(player, officer, carId, onChangeRole) {
  const careers = getCareers();
  const car = careers[carId];
  if (!car) { openOfficerEditor(player, officer, onChangeRole); return; }
  const form = new ActionFormData().title("Grades · " + car.name).body(car.grades.length ? "Du plus bas au plus haut. Touche un grade pour le modifier." : "Aucun grade. Le premier grade est l'engagement, sans coût de promotion.");
  const actions = [];
  car.grades.forEach((g, i) => {
    let s = i + ". " + g.name + "\n§7" + g.salary + " pièces/" + g.intervalMin + "min";
    if (g.reqId) s += ", promo " + g.reqCount + "× " + shortId(g.reqId);
    if (g.kit && g.kit.length) s += ", kit " + g.kit.length;
    form.button(s); actions.push({ type: "edit", i });
  });
  form.button("§2+ Ajouter un grade"); actions.push({ type: "add" });
  form.button("Retour"); actions.push({ type: "back" });
  form.show(player).then((r) => {
    if (r.canceled || r.selection >= actions.length) return;
    const a = actions[r.selection];
    if (a.type === "edit") editGrade(player, officer, carId, a.i, onChangeRole);
    else if (a.type === "add") editGrade(player, officer, carId, -1, onChangeRole);
    else openOfficerEditor(player, officer, onChangeRole);
  });
}
function editGrade(player, officer, carId, index, onChangeRole) {
  const careers = getCareers();
  const car = careers[carId];
  if (!car) { openOfficerEditor(player, officer, onChangeRole); return; }
  const isNew = index < 0;
  const isFirst = isNew ? car.grades.length === 0 : index === 0;
  const g = isNew ? { name: "", salary: 0, intervalMin: 5, reqId: "", reqCount: 1, kit: [] } : car.grades[index];
  const f = new ModalFormData().title(isNew ? "Nouveau grade" : "Grade · " + g.name);
  f.textField("Nom du grade", "Recrue", { defaultValue: g.name });
  f.slider("Salaire en pièces", 0, 512, { valueStep: 1, defaultValue: g.salary | 0 });
  f.slider("Intervalle de salaire en minutes (0 = aucun salaire)", 0, 120, { valueStep: 1, defaultValue: g.intervalMin | 0 });
  if (!isFirst) {
    f.textField("Item demandé pour cette promotion (vide = aucun)", "oct_drag:golden_coin", { defaultValue: g.reqId || "" });
    f.slider("Quantité demandée", 1, 64, { valueStep: 1, defaultValue: Math.max(1, g.reqCount | 0) });
  }
  f.textField("Kit donné en atteignant ce grade (id quantité nom, séparés par des virgules)", "knights:tunic 1, oct_drag:beef_stew 2", { defaultValue: (g.kit || []).map((it) => it.name ? `${it.id} ${it.count} ${it.name}` : `${it.id} ${it.count}`).join(", ") });
  if (!isNew) f.toggle("Supprimer le dernier grade (celui-ci s'il est le dernier)", { defaultValue: false });
  f.show(player).then((res) => {
    if (res.canceled) { manageGrades(player, officer, carId, onChangeRole); return; }
    const v = res.formValues;
    const careers2 = getCareers();
    const car2 = careers2[carId];
    if (!car2) { openOfficerEditor(player, officer, onChangeRole); return; }
    // suppression (uniquement le dernier grade, pour ne pas decaler les index des joueurs)
    const delIdx = isFirst ? 4 : 6;
    if (!isNew && v[delIdx] === true) {
      if (index === car2.grades.length - 1) { const removed = car2.grades.pop(); saveCareers(careers2); player.sendMessage("§eGrade « " + removed.name + " » retiré."); }
      else { player.sendMessage("§cTu ne peux retirer que le dernier grade de la liste."); }
      manageGrades(player, officer, carId, onChangeRole); return;
    }
    const name = String(v[0] || "").trim();
    if (!name) { player.sendMessage("§cNom de grade vide."); manageGrades(player, officer, carId, onChangeRole); return; }
    const salary = v[1] | 0;
    const interval = v[2] | 0;
    let reqId = "", reqCount = 0, kitStr = "";
    if (isFirst) { kitStr = v[3]; }
    else { reqId = String(v[3] || "").trim(); reqCount = Math.max(0, v[4] | 0); kitStr = v[5]; }
    const grade = { name, salary, intervalMin: interval, reqId, reqCount, kit: parseItemList(kitStr) };
    if (isNew) car2.grades.push(grade); else car2.grades[index] = grade;
    saveCareers(careers2);
    player.sendMessage(isNew ? ("§aGrade « " + name + " » ajouté (index " + (car2.grades.length - 1) + ").") : "§aGrade mis à jour.");
    manageGrades(player, officer, carId, onChangeRole);
  });
}

// resume et retrait de grade pour la moderation
export function describeGrade(player) {
  const careers = getCareers();
  const carId = player.getDynamicProperty(DP_PCAR);
  if (!carId || !careers[carId]) return "";
  const car = careers[carId];
  const lvl = player.getDynamicProperty(DP_PLVL) ?? 0;
  const g = car.grades[lvl];
  return car.name + ", " + (g ? g.name : "grade inconnu");
}
export function resetGrade(player) { clearGrade(player); }

// grade consultable depuis le menu de tchat
export function openMyGrade(player) {
  const careers = getCareers();
  const carId = player.getDynamicProperty(DP_PCAR);
  if (!carId || !careers[carId]) { player.sendMessage("§7Tu ne sers dans aucune filière pour l'instant."); return; }
  const car = careers[carId];
  const lvl = player.getDynamicProperty(DP_PLVL) ?? 0;
  const g = car.grades[lvl];
  if (!g) { player.sendMessage("§7Ton grade n'existe plus."); return; }
  const next = car.grades[lvl + 1];
  let body = "Filière, " + car.name + ".\nGrade, " + g.name + ".\nSalaire, " + g.salary + " pièces toutes les " + g.intervalMin + " min.";
  if (next) body += "\n\nProchain grade, " + next.name + ". Conditions, " + next.reqCount + " × " + shortId(next.reqId) + ". Vois l'officier pour être promu.";
  else body += "\n\nTu es au grade le plus élevé.";
  new ActionFormData().title(car.name).body(body)
    .button("§cDémissionner").button("Fermer")
    .show(player).then((r) => { if (!r.canceled && r.selection === 0) { clearGrade(player); player.sendMessage("§eTu as démissionné de « " + car.name + " »."); } });
}

// ----- au respawn, on repart d'un horodatage propre -----
world.afterEvents.playerSpawn.subscribe((ev) => {
  const pl = ev.player;
  try { if (pl.getDynamicProperty(DP_PCAR)) pl.setDynamicProperty(DP_PPAID, Date.now()); } catch (e) {}
});

system.runInterval(() => { try { paySalaries(); } catch (e) {} }, SALARY_TICKS);
