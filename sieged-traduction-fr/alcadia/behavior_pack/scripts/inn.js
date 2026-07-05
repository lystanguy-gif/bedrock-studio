import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { COIN_ID, container, countItem, removeItem, insideBox, play, parseCoords, isCreative } from "./util.js";
import { openVoiceEditor } from "./voices.js";

const WDP_ROOMS = "npc:rooms";
const DURATIONS = [1, 2, 3, 4];

// ----- stockage -----
function loadRooms() {
  const raw = world.getDynamicProperty(WDP_ROOMS);
  if (typeof raw === "string") { try { const a = JSON.parse(raw); if (Array.isArray(a)) return a; } catch (e) {} }
  return [];
}
function saveRooms(rooms) { try { world.setDynamicProperty(WDP_ROOMS, JSON.stringify(rooms)); } catch (e) {} }
function roomsOfKeeper(rooms, keeperId) { return rooms.filter((r) => r.keeper === keeperId); }
function nameTaken(rooms, keeperId, name) { return roomsOfKeeper(rooms, keeperId).some((r) => r.name.toLowerCase() === String(name).toLowerCase()); }
function coordTxt(c) { return c ? (c.x + " " + c.y + " " + c.z) : ""; }
function floorC(c) { return c ? { x: Math.floor(c.x), y: Math.floor(c.y), z: Math.floor(c.z) } : null; }

function isActive(r) { return !!(r.renterId && r.expires && Date.now() < r.expires); }
function hasAccess(r, player) {
  if (!isActive(r)) return false;
  if (r.renterId === player.id) return true;
  return Array.isArray(r.guests) && r.guests.includes(player.id);
}
function myRoom(rooms, player) { return rooms.find((r) => isActive(r) && r.renterId === player.id); }
function fmtLeft(r) { return Math.max(0, Math.ceil((r.expires - Date.now()) / 60000)) + " min"; }

// ----- menu joueur : louer / gerer -----
export function openInnMenu(player, keeper) {
  const rooms = loadRooms();
  const here = roomsOfKeeper(rooms, keeper.id);
  const mine = myRoom(rooms, player);
  const free = here.filter((r) => !isActive(r));
  const form = new ActionFormData().title("Auberge")
    .body(mine ? ("Ta chambre, " + mine.name + ", reste " + fmtLeft(mine) + ".") : (here.length ? "Bienvenue. Choisis une chambre à louer." : "Cet aubergiste n'a aucune chambre pour l'instant."));
  const actions = [];
  if (mine) { form.button("Gérer ma chambre"); actions.push({ type: "manage", id: mine.id }); }
  for (const r of free) { form.button("Louer " + r.name + "\n§7" + r.pricePerUnit + " pièces / " + r.unitMinutes + " min"); actions.push({ type: "rent", id: r.id }); }
  form.button("Fermer");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= actions.length) return;
    const a = actions[res.selection];
    if (a.type === "manage") manageRoom(player, a.id);
    else rentRoom(player, a.id);
  });
}
function rentRoom(player, roomId) {
  const rooms = loadRooms();
  const r = rooms.find((x) => x.id === roomId);
  if (!r) return;
  if (myRoom(rooms, player)) { player.sendMessage("§eTu as déjà une chambre. Libère-la d'abord."); return; }
  if (isActive(r)) { player.sendMessage("§eCette chambre vient d'être prise."); return; }
  const form = new ActionFormData().title("Louer " + r.name).body("Pour combien de temps ?");
  for (const u of DURATIONS) form.button((r.unitMinutes * u) + " min\n§7" + (r.pricePerUnit * u) + " pièces");
  form.button("Annuler");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= DURATIONS.length) return;
    const u = DURATIONS[res.selection];
    const price = r.pricePerUnit * u;
    const minutes = r.unitMinutes * u;
    const cont = container(player);
    if (!cont) return;
    if (countItem(cont, COIN_ID) < price) { player.sendMessage("§cIl te manque de l'argent, cette location coûte " + price + " pièces. Retire-en via ton menu."); return; }
    const rooms2 = loadRooms();
    const r2 = rooms2.find((x) => x.id === roomId);
    if (!r2 || isActive(r2)) { player.sendMessage("§eCette chambre vient d'être prise."); return; }
    if (myRoom(rooms2, player)) { player.sendMessage("§eTu as déjà une chambre."); return; }
    removeItem(cont, COIN_ID, price);
    r2.renter = player.name; r2.renterId = player.id; r2.guests = []; r2.expires = Date.now() + minutes * 60000;
    saveRooms(rooms2);
    player.sendMessage("§aTu as loué " + r2.name + " pour " + minutes + " min. Bon séjour.");
    play(player, "random.orb");
  });
}
function manageRoom(player, roomId) {
  const rooms = loadRooms();
  const r = rooms.find((x) => x.id === roomId);
  if (!r || !isActive(r) || r.renterId !== player.id) { player.sendMessage("§7Tu n'as pas de chambre active."); return; }
  new ActionFormData().title("Ma chambre, " + r.name).body("Reste " + fmtLeft(r) + ". Invités, " + (r.guests ? r.guests.length : 0) + ".")
    .button("Inviter un joueur").button("Retirer un invité").button("§cQuitter la chambre").button("Fermer")
    .show(player).then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) inviteGuest(player, roomId);
      else if (res.selection === 1) removeGuest(player, roomId);
      else if (res.selection === 2) leaveRoom(player, roomId);
    });
}
function inviteGuest(player, roomId) {
  const others = world.getAllPlayers().filter((p) => p.id !== player.id);
  if (others.length === 0) { player.sendMessage("§7Personne d'autre en ligne."); return; }
  const form = new ActionFormData().title("Inviter").body("Qui peut entrer dans ta chambre ?");
  for (const p of others) form.button(p.name);
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= others.length) return;
    const guest = others[res.selection];
    const rooms = loadRooms();
    const r = rooms.find((x) => x.id === roomId);
    if (!r || !isActive(r) || r.renterId !== player.id) return;
    if (!r.guests) r.guests = [];
    if (!r.guests.includes(guest.id)) r.guests.push(guest.id);
    saveRooms(rooms);
    player.sendMessage("§a" + guest.name + " peut entrer dans ta chambre.");
    try { guest.sendMessage("§e" + player.name + " t'a donné accès à sa chambre à l'auberge."); } catch (e) {}
  });
}
function removeGuest(player, roomId) {
  const rooms = loadRooms();
  const r = rooms.find((x) => x.id === roomId);
  if (!r || !isActive(r) || r.renterId !== player.id || !r.guests || r.guests.length === 0) { player.sendMessage("§7Aucun invité."); return; }
  const online = world.getAllPlayers();
  const ids = [...r.guests];
  const form = new ActionFormData().title("Retirer un invité").body("Qui retirer ?");
  for (const gid of ids) { const p = online.find((x) => x.id === gid); form.button(p ? p.name : "Joueur hors ligne"); }
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= ids.length) return;
    const rooms2 = loadRooms();
    const r2 = rooms2.find((x) => x.id === roomId);
    if (!r2 || !r2.guests) return;
    r2.guests = r2.guests.filter((g) => g !== ids[res.selection]);
    saveRooms(rooms2);
    player.sendMessage("§aInvité retiré.");
  });
}
function leaveRoom(player, roomId) {
  const rooms = loadRooms();
  const r = rooms.find((x) => x.id === roomId);
  if (!r) return;
  r.renter = null; r.renterId = null; r.guests = []; r.expires = 0;
  saveRooms(rooms);
  player.sendMessage("§eTu as libéré ta chambre.");
}

// chambre louee accessible depuis le menu de tchat
export function openMyRoom(player) {
  const rooms = loadRooms();
  const r = myRoom(rooms, player);
  if (!r) { player.sendMessage("§7Tu n'as aucune chambre louée pour l'instant."); play(player, "note.bass"); return; }
  manageRoom(player, r.id);
}

// ----- editeur createur (par coordonnees) -----
export function openInnEditor(player, keeper, onChangeRole) {
  const rooms = loadRooms();
  const here = roomsOfKeeper(rooms, keeper.id);
  const form = new ActionFormData().title("Éditeur · Aubergiste")
    .body(here.length ? (here.length + " chambre(s) rattachée(s) à cet aubergiste. Touche une chambre pour la modifier.") : "Aucune chambre. Touche Ajouter une chambre, donne lui un nom et un prix, puis délimite la avec ses deux coins en te plaçant aux angles.");
  const actions = [];
  for (const r of here) { form.button(r.name + "\n§7" + r.pricePerUnit + " pièces / " + r.unitMinutes + " min, " + (isActive(r) ? "louée" : "libre")); actions.push({ type: "room", id: r.id }); }
  form.button("§2+ Ajouter une chambre"); actions.push({ type: "add" });
  form.button("Voix du PNJ"); actions.push({ type: "voice" });
  form.button("§9Changer de métier"); actions.push({ type: "role" });
  form.button("Fermer"); actions.push({ type: "close" });
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= actions.length) return;
    const a = actions[res.selection];
    if (a.type === "room") editRoom(player, keeper, a.id, onChangeRole);
    else if (a.type === "add") addRoom(player, keeper, onChangeRole);
    else if (a.type === "voice") openVoiceEditor(player, keeper, () => openInnEditor(player, keeper, onChangeRole));
    else if (a.type === "role") { if (onChangeRole) onChangeRole(); }
  });
}
function addRoom(player, keeper, onChangeRole) {
  const f = new ModalFormData().title("Nouvelle chambre");
  f.textField("Nom de la chambre", "Chambre 1", { defaultValue: "" });
  f.slider("Prix en pièces", 0, 256, { valueStep: 1, defaultValue: 8 });
  f.slider("Durée d'une location en minutes", 1, 120, { valueStep: 1, defaultValue: 10 });
  f.show(player).then((res) => {
    if (res.canceled) { openInnEditor(player, keeper, onChangeRole); return; }
    const v = res.formValues;
    const name = String(v[0] || "").trim();
    const price = v[1] | 0;
    const minutes = v[2] | 0;
    if (!name) { player.sendMessage("§cNom vide."); openInnEditor(player, keeper, onChangeRole); return; }
    if (minutes < 1) { player.sendMessage("§cDurée invalide."); openInnEditor(player, keeper, onChangeRole); return; }
    const rooms = loadRooms();
    if (nameTaken(rooms, keeper.id, name)) { player.sendMessage("§cCet aubergiste a déjà une chambre nommée ainsi."); openInnEditor(player, keeper, onChangeRole); return; }
    const l = keeper.location;
    const id = "r" + Date.now().toString(36) + Math.floor(Math.random() * 1000);
    rooms.push({
      id, keeper: keeper.id, name, a: null, b: null,
      desk: { x: l.x, y: l.y, z: l.z }, dim: keeper.dimension.id,
      pricePerUnit: price, unitMinutes: minutes,
      renter: null, renterId: null, guests: [], expires: 0,
    });
    saveRooms(rooms);
    player.sendMessage("§aChambre '" + name + "' créée. Place toi maintenant à un angle et valide le coin 1, puis à l'angle opposé pour le coin 2.");
    editRoom(player, keeper, id, onChangeRole);
  });
}
function editRoom(player, keeper, roomId, onChangeRole) {
  const r = loadRooms().find((x) => x.id === roomId);
  if (!r) { openInnEditor(player, keeper, onChangeRole); return; }
  const c1 = r.a ? (r.a.x + " " + r.a.y + " " + r.a.z) : "non défini";
  const c2 = r.b ? (r.b.x + " " + r.b.y + " " + r.b.z) : "non défini";
  const dsk = r.desk ? (Math.floor(r.desk.x) + " " + Math.floor(r.desk.y) + " " + Math.floor(r.desk.z)) : "non définie";
  new ActionFormData().title("Chambre · " + r.name)
    .body(r.pricePerUnit + " pièces / " + r.unitMinutes + " min\nCoin 1, " + c1 + "\nCoin 2, " + c2 + "\nRéception, " + dsk + "\n" + (isActive(r) ? "§eLouée actuellement." : "§7Libre."))
    .button("Valider le coin 1 ici")
    .button("Valider le coin 2 ici")
    .button("Placer la réception ici")
    .button("Réglages (nom, prix, durée)")
    .button("§cLibérer ou supprimer")
    .button("Retour")
    .show(player).then((res) => {
      if (res.canceled) { openInnEditor(player, keeper, onChangeRole); return; }
      const rooms = loadRooms(); const rr = rooms.find((x) => x.id === roomId);
      if (!rr) { openInnEditor(player, keeper, onChangeRole); return; }
      const l = player.location;
      const pos = { x: Math.floor(l.x), y: Math.floor(l.y), z: Math.floor(l.z) };
      if (res.selection === 0) { rr.a = pos; rr.dim = player.dimension.id; saveRooms(rooms); player.sendMessage("§aCoin 1 défini ici. Ferme, va à l'angle opposé, rouvre et valide le coin 2."); editRoom(player, keeper, roomId, onChangeRole); }
      else if (res.selection === 1) { rr.b = pos; saveRooms(rooms); player.sendMessage("§aCoin 2 défini. La chambre est délimitée."); editRoom(player, keeper, roomId, onChangeRole); }
      else if (res.selection === 2) { rr.desk = { x: l.x, y: l.y, z: l.z }; saveRooms(rooms); player.sendMessage("§aRéception placée ici. Les intrus seront renvoyés à cet endroit."); editRoom(player, keeper, roomId, onChangeRole); }
      else if (res.selection === 3) editRoomSettings(player, keeper, roomId, onChangeRole);
      else if (res.selection === 4) editRoomDanger(player, keeper, roomId, onChangeRole);
      else openInnEditor(player, keeper, onChangeRole);
    });
}
function editRoomSettings(player, keeper, roomId, onChangeRole) {
  const r = loadRooms().find((x) => x.id === roomId);
  if (!r) { openInnEditor(player, keeper, onChangeRole); return; }
  const f = new ModalFormData().title("Réglages · " + r.name);
  f.textField("Nom", r.name, { defaultValue: r.name });
  f.slider("Prix en pièces", 0, 256, { valueStep: 1, defaultValue: r.pricePerUnit | 0 });
  f.slider("Durée d'une location en minutes", 1, 120, { valueStep: 1, defaultValue: r.unitMinutes | 0 });
  f.show(player).then((res) => {
    if (res.canceled) { editRoom(player, keeper, roomId, onChangeRole); return; }
    const v = res.formValues; const rooms = loadRooms(); const rr = rooms.find((x) => x.id === roomId);
    if (!rr) { openInnEditor(player, keeper, onChangeRole); return; }
    rr.name = String(v[0] || "").trim() || rr.name;
    rr.pricePerUnit = v[1] | 0; rr.unitMinutes = Math.max(1, v[2] | 0);
    saveRooms(rooms); player.sendMessage("§aRéglages enregistrés."); editRoom(player, keeper, roomId, onChangeRole);
  });
}
function editRoomDanger(player, keeper, roomId, onChangeRole) {
  const f = new ModalFormData().title("Libérer ou supprimer");
  f.toggle("Forcer la libération maintenant", { defaultValue: false });
  f.toggle("Supprimer définitivement cette chambre", { defaultValue: false });
  f.show(player).then((res) => {
    if (res.canceled) { editRoom(player, keeper, roomId, onChangeRole); return; }
    const v = res.formValues; const rooms = loadRooms(); const idx = rooms.findIndex((x) => x.id === roomId);
    if (idx < 0) { openInnEditor(player, keeper, onChangeRole); return; }
    if (v[1] === true) { rooms.splice(idx, 1); saveRooms(rooms); player.sendMessage("§aChambre supprimée."); openInnEditor(player, keeper, onChangeRole); return; }
    if (v[0] === true) { const rr = rooms[idx]; rr.renter = null; rr.renterId = null; rr.guests = []; rr.expires = 0; saveRooms(rooms); player.sendMessage("§aChambre libérée."); }
    editRoom(player, keeper, roomId, onChangeRole);
  });
}

// ----- barriere + expiration (global, toutes auberges) -----
system.runInterval(() => {
  const rooms = loadRooms();
  let changed = false;
  for (const r of rooms) {
    if (r.renterId && r.expires && Date.now() >= r.expires) { r.renter = null; r.renterId = null; r.guests = []; r.expires = 0; changed = true; }
  }
  if (changed) saveRooms(rooms);
  const players = world.getAllPlayers();
  for (const r of rooms) {
    if (!r.desk) continue;
    if (!isActive(r)) continue;
    if (!r.a || !r.b) continue;
    for (const p of players) {
      let loc;
      try { loc = p.location; if (r.dim && p.dimension.id !== r.dim) continue; } catch (e) { continue; }
      if (isCreative(p)) continue;
      if (!insideBox(loc, r.a, r.b)) continue;
      if (hasAccess(r, p)) continue;
      try { p.teleport({ x: r.desk.x, y: r.desk.y, z: r.desk.z }); p.sendMessage("§cCette chambre n'est pas la tienne."); } catch (e) {}
    }
  }
}, 20);
