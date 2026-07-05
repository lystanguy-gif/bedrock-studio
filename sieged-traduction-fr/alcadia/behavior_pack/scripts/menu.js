import { system, world, ItemStack, CommandPermissionLevel } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { isCreative, COIN_ID, getCoinId, setCoinId, container, countItem, removeItem, giveList, getBalance, setBalance, addBalance } from "./util.js";
import { openMyHouses, openPropertyAdmin, openPlayerHousesAdmin, propertiesCountOf } from "./merchant.js";
import { openMyRoom } from "./inn.js";
import { openMyGrade, describeGrade, resetGrade } from "./grades.js";
import { describeCharacter, isCharacterCreated, resetCharacter, openMyNation, openCivAdmin, openNationSpawnsAdmin } from "./origins.js";

// vrai pour les opérateurs (ceux qui ont les commandes) et les joueurs en créatif
function isAdmin(player) {
  if (isCreative(player)) return true;
  try { const lvl = player.playerPermissionLevel; if (typeof lvl === "number") return lvl >= 2; if (lvl !== undefined) return String(lvl).toLowerCase().includes("operator"); } catch (e) {}
  try { const c = player.commandPermissionLevel; if (typeof c === "number") return c >= 1; if (c !== undefined) return String(c).toLowerCase() !== "any"; } catch (e) {}
  return false;
}

// ── Guide de siège (intégré depuis le guide Sieged OH FR) ──────────
const GUIDE_PAGES = [
  {
    title: "§eDémarrer en survie",
    body:
      "§7Le drapeau de royaume se gagne, il ne se fabrique pas.\n\n" +
      "§61. §7Trouve le §eChâteau du Monarque§7 dans les plaines.\n" +
      "§62. §7Parle au Monarque et au Noble du village, fais leurs quêtes.\n" +
      "§63. §7Engage des villageois avec des §eémeraudes§7.\n" +
      "§64. §7Promeus tes recrues avec des §eParchemins d'ordre de guerre§7 §8(certaines unités demandent d'abord une recherche du Registre)§7.\n" +
      "§65. §7La quête « Fonder un royaume » te donne le §eDrapeau de château§7.\n" +
      "§66. §7Pose-le pour fonder ta §eColonie§7."
  },
  {
    title: "§eRoyaume et paliers",
    body:
      "§7Interagis avec ton drapeau pour ouvrir le menu du royaume.\n\n" +
      "§7Paliers : Colonie → Village → Ville → Cité → Royaume. Chaque montée agrandit le territoire et les impôts.\n\n" +
      "§6Villageois requis §7: Village §f3§7, Ville §f6§7, Cité §f10§7, Royaume §f15 §8(+ matériaux).\n\n" +
      "§6Surveille le moral §7(golems, animaux, cultures = bonus). §cSous 10, tes troupes se rebellent§7 et un Noble peut faire un coup d'État.\n" +
      "§7La §ecaserne§7 (Ville+) permet de remiser et déployer tes troupes."
  },
  {
    title: "§eVillageois et ingénieur",
    body:
      "§7Ta population, ce sont les villageois sur ton territoire. Fais-les se reproduire ou amène-les dans ton rayon.\n\n" +
      "§6Ingénieur de siège\n" +
      "§7Il sert tes machines. Il n'a pas d'œuf, tu le crées :\n" +
      "§7tiens des §eSupports de siège§7 (Siege Legs), §eaccroupis-toi et interagis§7 sur un villageois. Il devient ingénieur.\n\n" +
      "§8L'objet est consommé. L'ingénieur est aussi requis pour certaines recherches de siège."
  },
  {
    title: "§eTroupes et commandement",
    body:
      "§6Recruter §7: émeraudes aux villageois, promotion aux §eParchemins d'ordre§7, recrutement contre XP au drapeau (rang Chevalier+), ou §eAppel aux armes§7 à la caserne.\n" +
      "§7Revendiquer des unités libres : renomme une §ebannière§7 à l'enclume puis §eaccroupi + utiliser§7 près d'elles.\n\n" +
      "§6Commander §7: apprivoise un §eGarde-bannière§7 (émeraude en main) et interagis avec lui : charger, suivre, tenir, formations, pluie de flèches...\n" +
      "§7Lie un §eCor de commandement§7 (accroupi + interagir sur le garde) pour le commander à distance.\n" +
      "§7Le §eCor de guerre§7 rallie et renforce, la §eCloche§7 invoque 4 Templiers."
  },
  {
    title: "§eMachines de siège",
    body:
      "§7Les machines demandent une §erecherche dans le Registre§7 (onglet Siège) : Transport, Brasero, Bélier, Baliste, Catapulte, Tour, Trébuchet.\n\n" +
      "§7Tu obtiens leurs §eplans§7 (œufs) via les quêtes, la boutique du Monarque ou le §eBlason de Guerre§7.\n\n" +
      "§7Pose le plan puis §econstruis la machine avec des bûches ou planches§7 en main. Accroupi + clic droit pour la faire pivoter.\n\n" +
      "§7Revendique-la avec ta §ebannière nommée§7, et ton §eingénieur§7 peut la servir."
  },
  {
    title: "§ePortails et défenses",
    body:
      "§6Porte de château §7(blocs)\n" +
      "§7Elle ne s'ouvre que de l'intérieur ; une casse normale ne fait que l'ouvrir/fermer. Pour la retirer : §ecasse-la avec une hache en diamant ou netherite§7, tout le groupe part.\n\n" +
      "§6Porte en bois §7(entité)\n" +
      "§7Elle a des points de vie : frappe-la ou envoie un bélier.\n\n" +
      "§8Pense aussi aux piques en bois, meurtrières, tonneaux à flèches, pavois et au brasero (flèches enflammées, à débloquer au Registre)."
  },
  {
    title: "§eGuerre entre joueurs",
    body:
      "§61. §7Fabrique un §eParchemin§7 : 2 sacs d'encre + papier + ficelle.\n" +
      "§62. §e§lUtilise le parchemin sur un perroquet§r§7 : il se change en corbeau messager et le menu de déclaration s'ouvre. §8(On peut aussi jeter le parchemin au sol près du perroquet.)\n" +
      "§63. §7Ta cible reçoit un parchemin : clic droit pour accepter ou refuser.\n\n" +
      "§6Paix §7: clic droit sur un parchemin pendant une guerre → propose la paix ; l'autre dépose un parchemin près du corbeau.\n" +
      "§6Reddition §7: le §fDrapeau de reddition§7 négocie paiements, tributs, voire la cession du château.\n" +
      "§6Siège §7: sonne un §ecor§7 près du drapeau ennemi et reste dans la zone."
  },
  {
    title: "§eBoss et menaces",
    body:
      "§6Le Tyran §7t'envoie une lettre puis une §cinvasion en 5 vagues§7 sur ton château. Défends ton drapeau !\n\n" +
      "§6Éclaireurs illageois §7: tue-les avant leur rapport, sinon §craid§7 en plusieurs vagues.\n\n" +
      "§6Chevalier Déchu §7(forteresses déchues) et §6Ravageur de guerre§7 (tue ses cavaliers d'abord) : boss à terrasser — leur mort débloque le §ePrestige§7 auprès du Monarque.\n\n" +
      "§7Les boss invoquent des renforts, §cjamais de bâtiments§7.\n\n" +
      "§8Guide complet : utilise un §flivre classique§8 (pack Guide Sieged) — 8 chapitres détaillés."
  }
];

function openGuideMenu(player) {
  const form = new ActionFormData().title("Guide du serveur").body("Choisis un chapitre.");
  for (const p of GUIDE_PAGES) form.button(p.title);
  form.button("Retour");
  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection === GUIDE_PAGES.length) { openMainMenu(player); return; }
    showGuidePage(player, res.selection);
  });
}

function showGuidePage(player, idx) {
  const page = GUIDE_PAGES[idx];
  if (!page) { openGuideMenu(player); return; }
  new ActionFormData().title(page.title).body(page.body)
    .button("Retour au guide")
    .button("Fermer")
    .show(player).then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) openGuideMenu(player);
    });
}

function openMainMenu(player) {
  const admin = isAdmin(player);
  const form = new ActionFormData().title("Menu d'Alcadia").body(admin ? "Menu administrateur et créatif." : "Que veux-tu gérer ?");
  const actions = [];
  form.button("Mon personnage"); actions.push("character");
  form.button("Mon peuple"); actions.push("nation");
  form.button("Ma maison"); actions.push("house");
  form.button("Ma chambre"); actions.push("room");
  form.button("Mon grade"); actions.push("grade");
  form.button("§2Guide du serveur"); actions.push("guide");
  if (admin) {
    form.button("§9Gérer un joueur"); actions.push("players");
    form.button("§9Propriétés du monde"); actions.push("propadmin");
    form.button("§9Civilisations"); actions.push("civadmin");
    form.button("§9Spawns des peuples"); actions.push("natspawn");
    form.button("§9Monnaie du serveur"); actions.push("coin");
    form.button("§9Outil de configuration PNJ"); actions.push("tool");
    form.button("§9Aide créateur"); actions.push("help");
  }
  form.button("Fermer"); actions.push("close");
  form.show(player).then((res) => {
    if (res.canceled || res.selection >= actions.length) return;
    const a = actions[res.selection];
    if (a === "character") openCharacter(player);
    else if (a === "nation") openMyNation(player);
    else if (a === "house") openMyHouses(player);
    else if (a === "room") openMyRoom(player);
    else if (a === "grade") openMyGrade(player);
    else if (a === "guide") openGuideMenu(player);
    else if (a === "players") openPlayersAdmin(player);
    else if (a === "propadmin") openPropertyAdmin(player);
    else if (a === "civadmin") openCivAdmin(player);
    else if (a === "natspawn") openNationSpawnsAdmin(player);
    else if (a === "coin") openCoinSetting(player);
    else if (a === "tool") giveConfigTool(player);
    else if (a === "help") showHelp(player);
  });
}

function giveConfigTool(player) {
  try {
    const stack = new ItemStack("minecraft:stick", 1);
    stack.nameTag = "§bConfiguration PNJ";
    const inv = player.getComponent("minecraft:inventory");
    if (inv && inv.container) { inv.container.addItem(stack); player.sendMessage("§aBâton de configuration reçu. Utilise le sur une créature pour la transformer en PNJ, ou sur un PNJ pour l'éditer."); }
  } catch (e) { player.sendMessage("§cImpossible de te donner l'outil, inventaire plein ?"); }
}

function openCoinSetting(player) {
  const f = new ModalFormData().title("Monnaie du serveur")
    .textField("Identifiant de l'objet servant de pièce", "exemple monnaie:piece_or", { defaultValue: getCoinId() });
  f.show(player).then((res) => {
    if (res.canceled) return;
    const id = String(res.formValues[0] || "").trim();
    if (!id) { player.sendMessage("§cIdentifiant vide."); return; }
    setCoinId(id);
    player.sendMessage("§aMonnaie réglée sur " + id + ". Les dépôts et retraits de pièces physiques utiliseront cet objet.");
  });
}
function showHelp(player) {
  new ActionFormData().title("Aide créateur")
    .body("Pour créer un PNJ : passe en créatif, prends le §bbâton de configuration§r (bouton ci-dessus), puis utilise-le sur une créature. Choisis ensuite son métier : marchand, aubergiste, officier, vendeur de maison ou agence immobilière.\n\n§cNe convertis pas les créatures du mod Sieged§r (unités, machines, PNJ de quête) : elles sont protégées et resteront gérées par Sieged.\n\nL'aubergiste se règle par coordonnées dans son éditeur. La vente de propriété se règle dans l'éditeur d'un marchand. Le propriétaire gère ensuite sa maison dans Ma maison.\n\nTout joueur ouvre ce menu avec la montre Menu ou la commande /alcadia:menu.")
    .button("Fermer").show(player);
}

// fiche du personnage et compte bancaire
function openCharacter(player) {
  const bal = getBalance(player);
  const cont = container(player);
  const inHand = cont ? countItem(cont, COIN_ID) : 0;
  let body = isCharacterCreated(player) ? describeCharacter(player) : "Tu n'as pas encore créé ton personnage.\n§7Fais §f/scriptevent origin:open §7pour le créer.";
  body += "\n\n§6Compte §f" + bal + " pièces\n§6En main §f" + inHand + " pièces";
  new ActionFormData().title("Mon personnage").body(body)
    .button("Retirer des pièces")
    .button("Déposer des pièces")
    .button("Fermer")
    .show(player).then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) withdraw(player);
      else if (res.selection === 1) deposit(player);
    });
}
function withdraw(player) {
  const bal = getBalance(player);
  if (bal <= 0) { player.sendMessage("§7Ton compte est vide, tu n'as rien à retirer."); return; }
  const f = new ModalFormData().title("Retirer des pièces");
  f.textField("Combien retirer, tu as " + bal + " sur ton compte", String(Math.min(bal, 16)), { defaultValue: "" });
  f.show(player).then((res) => {
    if (res.canceled) { openCharacter(player); return; }
    const n = parseInt(String(res.formValues[0] || "").trim(), 10);
    if (!Number.isFinite(n) || n <= 0) { player.sendMessage("§cMontant invalide, entre un nombre."); return; }
    const cur = getBalance(player);
    if (n > cur) { player.sendMessage("§cTu n'as que " + cur + " pièces sur ton compte."); return; }
    setBalance(player, cur - n);
    giveList(player, [{ id: COIN_ID, count: n }]);
    player.sendMessage("§aTu as retiré " + n + " pièces. Compte restant " + getBalance(player) + ".");
    try { player.playSound("random.orb"); } catch (e) {}
  });
}
function deposit(player) {
  const cont = container(player);
  const have = cont ? countItem(cont, COIN_ID) : 0;
  if (have <= 0) { player.sendMessage("§7Tu n'as aucune pièce en main à déposer."); return; }
  const f = new ModalFormData().title("Déposer des pièces");
  f.textField("Combien déposer, tu en as " + have + " en main", String(have), { defaultValue: "" });
  f.show(player).then((res) => {
    if (res.canceled) { openCharacter(player); return; }
    const n = parseInt(String(res.formValues[0] || "").trim(), 10);
    if (!Number.isFinite(n) || n <= 0) { player.sendMessage("§cMontant invalide, entre un nombre."); return; }
    const cont2 = container(player);
    const have2 = cont2 ? countItem(cont2, COIN_ID) : 0;
    if (n > have2) { player.sendMessage("§cTu n'as que " + have2 + " pièces en main."); return; }
    removeItem(cont2, COIN_ID, n);
    addBalance(player, n);
    player.sendMessage("§aTu as déposé " + n + " pièces. Compte " + getBalance(player) + ".");
    try { player.playSound("random.orb"); } catch (e) {}
  });
}

// commande /alcadia:menu, visible dans l'autocomplétion du tchat, utilisable par tous
try {
  system.beforeEvents.startup.subscribe((init) => {
    try {
      init.customCommandRegistry.registerCommand(
        {
          name: "alcadia:menu",
          description: "Ouvre le menu d'Alcadia",
          permissionLevel: CommandPermissionLevel.Any,
          cheatsRequired: false,
        },
        (origin) => {
          const p = origin && origin.sourceEntity;
          if (p && p.typeId === "minecraft:player") {
            system.run(() => { try { openMainMenu(p); } catch (e) {} });
          }
          return { status: 0 };
        }
      );
    } catch (e) {}
  });
} catch (e) {}

// ===== modération, gérer un joueur en ligne =====
function openPlayersAdmin(viewer) {
  const players = world.getAllPlayers();
  const form = new ActionFormData().title("Gérer un joueur").body("Joueurs en ligne. Touche un joueur pour le gérer.");
  for (const p of players) form.button(p.name);
  form.button("Retour");
  form.show(viewer).then((res) => {
    if (res.canceled || res.selection >= players.length) return;
    openPlayerAdmin(viewer, players[res.selection]);
  });
}
function openPlayerAdmin(viewer, target) {
  new ActionFormData().title("Joueur " + target.name)
    .button("Inspecter")
    .button("Compte bancaire")
    .button("Grade")
    .button("Biens")
    .button("§cRéinitialiser le personnage")
    .button("Retour")
    .show(viewer).then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) openInspect(viewer, target);
      else if (res.selection === 1) openBankAdmin(viewer, target);
      else if (res.selection === 2) openGradeAdmin(viewer, target);
      else if (res.selection === 3) openPlayerHousesAdmin(viewer, target.id, target.name);
      else if (res.selection === 4) confirmResetChar(viewer, target);
    });
}
function openInspect(viewer, target) {
  const bal = getBalance(target);
  const grade = describeGrade(target) || "aucun";
  const props = propertiesCountOf(target.id);
  let body = isCharacterCreated(target) ? describeCharacter(target) : "Personnage non créé.";
  body += "\n\n§6Compte §f" + bal + " pièces\n§6Grade §f" + grade + "\n§6Biens §f" + props;
  new ActionFormData().title("Inspecter " + target.name).body(body).button("Retour")
    .show(viewer).then((res) => { if (!res.canceled) openPlayerAdmin(viewer, target); });
}
function openBankAdmin(viewer, target) {
  const bal = getBalance(target);
  new ActionFormData().title("Compte de " + target.name).body("Solde actuel " + bal + " pièces.")
    .button("Définir un montant").button("§cMettre à zéro").button("Retour")
    .show(viewer).then((res) => {
      if (res.canceled || res.selection === 2) return;
      if (res.selection === 0) {
        const f = new ModalFormData().title("Compte de " + target.name);
        f.textField("Nouveau solde en pièces", String(bal), { defaultValue: String(bal) });
        f.show(viewer).then((r) => {
          if (r.canceled) { openBankAdmin(viewer, target); return; }
          const n = parseInt(String(r.formValues[0] || "").trim(), 10);
          if (!Number.isFinite(n) || n < 0) { viewer.sendMessage("§cMontant invalide."); openBankAdmin(viewer, target); return; }
          setBalance(target, n);
          viewer.sendMessage("§aCompte de " + target.name + " réglé à " + n + " pièces.");
          try { target.sendMessage("§eUn modérateur a ajusté ton compte à " + n + " pièces."); } catch (e) {}
          openBankAdmin(viewer, target);
        });
      } else {
        setBalance(target, 0);
        viewer.sendMessage("§aCompte de " + target.name + " remis à zéro.");
        try { target.sendMessage("§eUn modérateur a remis ton compte à zéro."); } catch (e) {}
        openBankAdmin(viewer, target);
      }
    });
}
function openGradeAdmin(viewer, target) {
  const grade = describeGrade(target);
  new ActionFormData().title("Grade de " + target.name).body(grade ? ("Grade actuel, " + grade + ".") : "Ce joueur n'a aucun grade.")
    .button("§cRetirer le grade").button("Retour")
    .show(viewer).then((res) => {
      if (res.canceled || res.selection === 1) return;
      resetGrade(target);
      viewer.sendMessage("§aGrade de " + target.name + " retiré.");
      try { target.sendMessage("§eUn modérateur t'a retiré ton grade."); } catch (e) {}
    });
}
function confirmResetChar(viewer, target) {
  new ActionFormData().title("Réinitialiser " + target.name)
    .body("Cela efface l'identité du joueur : prénom, sexe, gabarit et civilisation. Action définitive. Confirmer ?")
    .button("§cOui, réinitialiser").button("Annuler")
    .show(viewer).then((res) => {
      if (res.canceled || res.selection === 1) return;
      resetCharacter(target);
      viewer.sendMessage("§aPersonnage de " + target.name + " réinitialisé.");
    });
}

// objet menu : une montre nommée, qui ouvre le menu quand on l'utilise (marche pour tous, même en aventure)
const MENU_ITEM = "minecraft:clock";
const MENU_NAME = "§bMenu d'Alcadia";

function giveMenuItem(player) {
  try {
    const stack = new ItemStack(MENU_ITEM, 1);
    stack.nameTag = MENU_NAME;
    const inv = player.getComponent("minecraft:inventory");
    if (inv && inv.container) { const left = inv.container.addItem(stack); if (left) player.dimension.spawnItem(left, player.location); }
  } catch (e) {}
}

// à la première connexion, on donne la montre et on rappelle la commande
world.afterEvents.playerSpawn.subscribe((ev) => {
  try {
    if (!ev.initialSpawn || !ev.player) return;
    const p = ev.player;
    p.sendMessage("§7Ouvre ton menu avec la montre §bMenu§7 de ton inventaire, ou avec §f/alcadia:menu§7.");
    if (p.hasTag("alcadia_menu_given")) return;
    giveMenuItem(p);
    p.addTag("alcadia_menu_given");
  } catch (e) {}
});

// utiliser la montre Menu ouvre le menu
world.afterEvents.itemUse.subscribe((ev) => {
  try {
    const item = ev.itemStack;
    const p = ev.source;
    if (!item || !p || p.typeId !== "minecraft:player") return;
    if (item.typeId === MENU_ITEM && item.nameTag === MENU_NAME) {
      system.run(() => { try { openMainMenu(p); } catch (e) {} });
    }
  } catch (e) {}
});

// commande optionnelle pour redonner la montre à un joueur, par un opérateur
try {
  system.beforeEvents.startup.subscribe((init) => {
    try {
      init.customCommandRegistry.registerCommand(
        { name: "alcadia:montre", description: "Donne la montre Menu au joueur", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false },
        (origin) => {
          const p = origin && origin.sourceEntity;
          if (p && p.typeId === "minecraft:player") system.run(() => { try { giveMenuItem(p); p.sendMessage("§aTu as reçu la montre Menu."); } catch (e) {} });
          return { status: 0 };
        }
      );
    } catch (e) {}
  });
} catch (e) {}
