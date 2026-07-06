// Guide Sieged (FR) — livre-guide en jeu.
// Utiliser un livre classique (minecraft:book) ouvre un menu de chapitres.
// Aucune boucle ni runInterval : uniquement l'événement d'utilisation d'objet.
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const BTN_RETOUR = "§8⏪ Retour";
const BTN_FERMER = "§8✖ Fermer";

// ─── Contenu du guide ────────────────────────────────────────────────────────
// Chaque chapitre : { titre, sections: [{ titre, texte }] }
const GUIDE = [
    {
        titre: "§a🚀 Bien démarrer",
        sections: [
            {
                titre: "§aLes premiers pas",
                texte:
                    "§61.§r Trouvez le §6Château du Monarque§r (plaines) et parlez au §6Monarque§r : ses quêtes débloquent l'essentiel, dont le §eDrapeau de château§r.\n\n" +
                    "§62.§r §eRecruter§r : donnez des §aémeraudes§r aux villageois pour les engager.\n\n" +
                    "§63.§r §ePromouvoir§r : utilisez des §eParchemins d'ordre de guerre§r sur vos recrues pour en faire de vraies unités (certaines promotions demandent une recherche du Registre).\n\n" +
                    "§64.§r Le §eRegistre§r (livre du mod) a 4 onglets : Démarrage, Quêtes (boss), Armée (recherches) et Siège (machines).\n\n" +
                    "§65.§r Le §6Noble du village§r donne des quêtes répétables suivies dans le §eJournal de quêtes§r : tuez des ennemis ou rapportez des objets, gagnez or, acier trempé, parchemins et armes de siège."
            },
            {
                titre: "§aRevendiquer des troupes",
                texte:
                    "§7Pour donner une §efaction§r à vos troupes :\n\n" +
                    "§61.§r Renommez une §ebannière§r sur une §eenclume§r — ce nom devient celui de votre faction.\n" +
                    "§62.§r §eAccroupi + utiliser la bannière§r près de vos troupes pour les revendiquer en masse.\n\n" +
                    "§7Pour apprivoiser un §6Garde-bannière§r ou un §6Chevalier§r : tenez une §aémeraude§r et interagissez avec lui."
            }
        ]
    },
    {
        titre: "§6🏰 Ton royaume (le Drapeau)",
        sections: [
            {
                titre: "§6Fonder et faire grandir",
                texte:
                    "§7Posez votre §eDrapeau de château§r pour fonder une §eColonie§r, puis §einteragissez avec le drapeau§r pour ouvrir le menu du royaume.\n\n" +
                    "§6Niveaux :§r Colonie → Village → Ville → Cité → Royaume.\n" +
                    "§7Chaque amélioration coûte des villageois + matériaux, agrandit le territoire, augmente les impôts et débloque des fonctions (§ecaserne à partir de Ville§r, drapeaux vassaux…).\n\n" +
                    "§7Les drapeaux doivent être posés à bonne distance des royaumes voisins."
            },
            {
                titre: "§6Le moral (très important !)",
                texte:
                    "§7Le §emoral§r (0 à 100) évolue chaque jour :\n\n" +
                    "§aGains :§r +10 de base, golems de fer, unités militaires, animaux de ferme, cultures, Blason du Moral.\n" +
                    "§cPertes :§r orage, incendie dans le territoire, être en guerre, visite du Nether, « spirale » (3 pénalités ou plus).\n\n" +
                    "§cMoral bas :§r désertions de villageois et de troupes.\n" +
                    "§4Moral sous 10 :§r §lRÉBELLION§r §4— vos troupes passent à l'ennemi ! Et un Noble peut tenter un coup d'État.§r\n\n" +
                    "§7Le §eRapport du royaume§r (menu du drapeau) détaille tous les gains et pertes du jour."
            },
            {
                titre: "§6Impôts et intégrité",
                texte:
                    "§eImpôts :§r chaque jour, vos villageois produisent des émeraudes (selon leur nombre et le moral). Collectez-les sur le drapeau. Les membres Paysans peuvent aussi verser leur impôt.\n\n" +
                    "§eIntégrité du château :§r elle baisse pendant les sièges et invasions. Réparez avec des §flingots de fer§r. L'§eATH d'intégrité§r peut s'afficher en permanence à l'écran.\n\n" +
                    "§eCharretier :§r convoquez-le à votre château pour du §evoyage rapide§r entre les châteaux découverts (coût XP + émeraudes, il peut transporter vos troupes proches)."
            },
            {
                titre: "§6Membres et rangs",
                texte:
                    "§7Invitez des joueurs dans votre royaume via le menu du drapeau :\n\n" +
                    "§7§lPaysan§r §8— paye l'impôt, accès en lecture à la caserne.\n" +
                    "§b§lChevalier§r §8— recrute des unités contre de l'XP, gère la caserne.\n" +
                    "§d§lNoble§r §8— peut recevoir un drapeau vassal du roi… ou §4fomenter un coup d'État§8 si le moral du roi passe sous 10 !\n" +
                    "§6§lRoi§r §8— dirige tout, peut transmettre la couronne.\n\n" +
                    "§7Le roi peut accorder un drapeau à un Noble (niveau Ville+) : le Noble devient roi de ce drapeau vassal, sous votre royaume."
            },
            {
                titre: "§6Caserne et appel aux armes",
                texte:
                    "§7La §ecaserne§r (niveau Ville+) gère vos unités :\n\n" +
                    "§e• Ajouter :§r enrôle les unités apprivoisées autour de vous.\n" +
                    "§e• Remiser :§r met vos troupes en sécurité dans la caserne (hors du monde).\n" +
                    "§e• Déployer :§r les fait réapparaître près de vous.\n" +
                    "§e• Appel aux armes :§r transforme des villageois en soldats temporaires — coûte du moral !\n\n" +
                    "§7Idéal avant une guerre : remisez vos troupes pour les protéger, déployez-les au moment de l'attaque."
            },
            {
                titre: "§6Diplomatie",
                texte:
                    "§7Depuis le menu du drapeau (niveau suffisant) :\n\n" +
                    "§d• Alliance :§r proposez une alliance à un autre royaume.\n" +
                    "§6• Route commerciale :§r avec un allié — les deux royaumes gagnent des émeraudes chaque jour.\n" +
                    "§c• Rompre l'alliance :§r met fin à l'alliance et aux routes commerciales.\n\n" +
                    "§7Les royaumes PNJ (IA) ont aussi une §enotoriété§r : plus elle est haute, plus leurs échanges et services se débloquent."
            }
        ]
    },
    {
        titre: "§e⚔ Armée et commandement",
        sections: [
            {
                titre: "§eLes unités",
                texte:
                    "§f• §6Gardien§r §8— infanterie à bouclier, tient la ligne.\n" +
                    "§f• §6Sentinelle§r §8— arbalétrier à distance.\n" +
                    "§f• §6Templier§r §8— guerrier d'élite (invocable via la Cloche).\n" +
                    "§f• §6Fauconnier§r §8— appelle la pluie de flèches (formé à partir de 2 Sentinelles).\n" +
                    "§f• §6Chevalier§r §8— cavalerie.\n" +
                    "§f• §6Garde-bannière§r §8— votre commandant : c'est lui qui donne les ordres aux autres.\n" +
                    "§f• §6Javelinier, Lanciers…§r §8— unités ennemies ou recrutables selon le contexte.\n\n" +
                    "§7Promotion des recrues : §eParchemin d'ordre de guerre§r (certaines unités exigent une recherche du Registre)."
            },
            {
                titre: "§eMenu du Garde-bannière",
                texte:
                    "§7Interagissez avec votre Garde-bannière apprivoisé :\n\n" +
                    "§e• Charger§r §8— envoie les troupes à l'assaut.\n" +
                    "§e• Suivre / Vagabonder / Tenir la position§r §8— contrôle des déplacements (par type : infanterie, cavalerie, tireurs).\n" +
                    "§e• Marche en formation§r §8— défilé ordonné derrière le garde.\n" +
                    "§e• Rallier au drapeau§r §8— tout le monde rentre à la base.\n" +
                    "§e• Vue Commandant§r §8— vue tactique du dessus pour placer vos unités une à une.\n" +
                    "§e• Protéger le commandant§r §8— vos Templiers vous encerclent 10 s.\n" +
                    "§e• Retirer les armures§r §8— récupère l'équipement des troupes."
            },
            {
                titre: "§eFormations et fauconniers",
                texte:
                    "§7Après la recherche §6Arts d'avant-garde§r (Registre) :\n\n" +
                    "§e• Phalange§r §8— mur de boucliers sur 3 rangs (coût XP, minimum de Gardiens).\n" +
                    "§e• Tortue§r §8— cercle défensif, boucliers vers l'extérieur.\n" +
                    "§e• Arbalète à pavois§r §8— position de tir retranchée pour les Sentinelles.\n\n" +
                    "§6Pluie de flèches :§r formez des §eFauconniers§r (2 Sentinelles → 1 Fauconnier), prenez le §eMarqueur§r, lancez-le sur la zone cible : tous les fauconniers proches bombardent ! Leurs munitions se régénèrent avec le temps (ou donnez-leur des flèches)."
            },
            {
                titre: "§eCors de commandement",
                texte:
                    "§7Commandez votre Garde-bannière §eà distance§r :\n\n" +
                    "§7• Cor de commandement §8— portée 15 blocs\n" +
                    "§6• Doré §8— 25 blocs\n" +
                    "§b• Diamant §8— 40 blocs\n" +
                    "§5• Netherite §8— 75 blocs\n\n" +
                    "§eLier :§r accroupi + interagir sur votre Garde-bannière avec le cor en main. Ensuite, utilisez le cor pour ouvrir son menu à distance.\n\n" +
                    "§7Un cor peut aussi être lié à une §eporte de château§r (depuis l'intérieur) : elle ne s'ouvrira qu'avec ce cor."
            }
        ]
    },
    {
        titre: "§b🎒 Objets spéciaux",
        sections: [
            {
                titre: "§bCors, cloche et tambours",
                texte:
                    "§6Cor de guerre :§r rallie les troupes apprivoisées dans 10 blocs (+Résistance I et Force I pendant 30 s, recharge 1 min). Sert aussi à §edéclencher un siège§r près d'un château ennemi.\n\n" +
                    "§5La Cloche d'Invocation :§r invoque §e4 Templiers§r apprivoisés (recharge 1 min).\n\n" +
                    "§6Tambours de flotte :§r commande navale — §eInteragir§r = Halte/Avancer ; §eAccroupi + Interagir§r = tout le monde à terre ; §eAccroupi + Saut§r = tous à bord.\n\n" +
                    "§bNavire vassal :§r revendiquez-le avec votre bannière de faction, embarquez vos soldats, cale de stockage à bord."
            },
            {
                titre: "§bCouronnes et artefacts",
                texte:
                    "§4Couronne de Domination :§r accroupissez-vous pour §cmarquer un ennemi à mort§r — il est affaibli et votre prochain coup inflige §c+5 cœurs§r (recharge 40 s).\n\n" +
                    "§6Couronne de Souveraineté :§r §eunique sur tout le serveur§r ! Récompense du siège « Mauvais Présage V ». Si son porteur tombe, elle est à reprendre.\n\n" +
                    "§4Heaume + Plastron du Déchu :§r portés ensemble, §cAccroupi + Saut§r invoque le §4Pacte du Déchu§r : jusqu'à 4 illageois proches passent sous votre contrôle (recharge 60 s).\n\n" +
                    "§6Fléau du Ravageur :§r chaque coup chargé en moins de 5 s ajoute +3 dégâts (jusqu'à ×3).\n" +
                    "§4Répéteur du Tyran :§r arbalète à tir continu (consomme vos flèches)."
            },
            {
                titre: "§bLa forge (acier trempé)",
                texte:
                    "§7Pour forger l'§eacier trempé§r (armures et blocs) :\n\n" +
                    "§61.§r Placez une §eEnclume de forge§r.\n" +
                    "§62.§r Équipez le §eGant de forge§r et chauffez du fer (§eFer chauffé§r).\n" +
                    "§63.§r Frappez l'enclume §eau bon rythme§r : réussite = §aAcier trempé§r ; timing raté = simple lingot ou pépite de fer.\n\n" +
                    "§7L'enclume s'use : réparez-la avec des lingots de fer.\n\n" +
                    "§7L'acier trempé permet la panoplie §eacier trempé§r, puis les versions §erenforcées§r des armures."
            },
            {
                titre: "§bDéfenses de château",
                texte:
                    "§eTonneau à flèches :§r stocke des flèches (clic = déposer, accroupi + clic = prendre) — ravitaillez vos archers en défense.\n\n" +
                    "§eBrasero :§r enflamme vos flèches (à débloquer dans le Registre).\n\n" +
                    "§ePique en bois :§r accroupi + clic droit au sol pour la planter (jusqu'à 3 empilées) — blesse les ennemis qui foncent dessus. Miner le bloc rend 1 pique.\n\n" +
                    "§ePavois :§r accroupi + saut pour le planter en barrière physique ; augmente les dégâts à distance des joueurs proches.\n\n" +
                    "§eMeurtrières, Escalier de siège, Mur de boucliers, Cible :§r blocs et structures à placer pour fortifier.\n\n" +
                    "§ePortes de château :§r ne s'ouvrent que de l'intérieur ; peuvent être verrouillées ou liées à un cor."
            },
            {
                titre: "§bBoucliers spéciaux",
                texte:
                    "§7• §fÉcu§r §8— 50 % de chances de Résistance I en blocage.\n" +
                    "§7• §fBouclier en amande§r §8— ralentit l'attaquant 2 s à chaque blocage (mais vous repousse).\n" +
                    "§7• §fRondache§r §8— Vitesse I 3 s après un blocage (fragile : durabilité ÷2).\n" +
                    "§7• §fBouclier rond§r §8— renvoie 1 cœur de dégâts à l'attaquant (Faiblesse I en blocage).\n" +
                    "§7• §fGrand bouclier rond§r §8— projette l'attaquant en arrière (vous ralentit).\n" +
                    "§7• §fPavois§r §8— forteresse portable, se plante au sol."
            },
            {
                titre: "§bArmes spéciales",
                texte:
                    "§7• §fHallebarde§r §8— dégâts bonus contre les ennemis qui bloquent.\n" +
                    "§7• §fPique§r §8— frappe en ligne, anti-cavalerie.\n" +
                    "§7• §fMarteau de guerre§r §8— broie les armures lourdes.\n" +
                    "§7• §fÉtoile du matin§r §8— étourdit (Lenteur + Faiblesse, recharge 10 s).\n" +
                    "§7• §fÉpée longue§r §8— exécution : bonus sous 30 % de vie.\n" +
                    "§7• §fHache à deux têtes§r §8— fauchage de zone + vol de vie.\n" +
                    "§7• §fZweihander§r §8— +1 cœur contre les sans-bouclier.\n" +
                    "§7• §fLance§r §8— dégâts massifs à cheval.\n" +
                    "§7• §fMarteau lourd§r §8— recul massif.\n" +
                    "§7• §fGlaive§r §8— fauchage en arc large. §fGlaive court§r §8— empoisonne.\n" +
                    "§7• §fSabre§r §8— riposte au clic droit.\n" +
                    "§7• §fJavelot / Dague / Hache courte§r §8— armes de lancer.\n" +
                    "§7• §fSerpe de guerre§r §8— désarçonne les cavaliers.\n" +
                    "§7• §fArbalète lourde§r §8— inflige Faiblesse. §fArc long§r §8— ralentit à pleine tension."
            }
        ]
    },
    {
        titre: "§d🛡 Les Blasons",
        sections: [
            {
                titre: "§dÀ quoi servent les blasons ?",
                texte:
                    "§7Un blason s'§eapplique sur votre drapeau§r de royaume (un seul à la fois) et donne un bonus permanent. On les obtient auprès du §6Monarque§r ; le §8Blason vierge§r retire le blason en place (récompense de quêtes extrêmes).\n\n" +
                    "§a• Moral§r §8— pertes de moral ÷2, +20/jour, aucune rébellion possible.\n" +
                    "§b• Vigueur§r §8— annule les explosions dans le territoire.\n" +
                    "§c• Armes§r §8— 1 Gardien + 1 Sentinelle offerts par jour ; +15 unités en cas de siège ou d'invasion.\n" +
                    "§6• Architecture§r §8— perte d'intégrité ÷2 ; débloque « Rallier les villageois » et l'ATH.\n" +
                    "§e• Poursuite§r §8— vos unités : Force I + Vitesse I ; les intrus : Faiblesse I.\n" +
                    "§4• Guerre§r §8— 1 machine de siège tous les 2 jours ; la guerre ne coûte plus de moral.\n" +
                    "§2• Richesse§r §8— impôts +50 % ; membres : Héros du village.\n" +
                    "§3• Savoir§r §8— recherches -25 % ; +3 niveaux d'XP par jour."
            }
        ]
    },
    {
        titre: "§c🐦‍⬛ Guerre entre joueurs",
        sections: [
            {
                titre: "§cDéclarer la guerre",
                texte:
                    "§61.§r Fabriquez ou obtenez un §eParchemin§r.\n" +
                    "§62.§r §eUtilisez-le directement sur un perroquet§r : il se transforme aussitôt en §8Corbeau messager§r et le menu de déclaration s'ouvre (choisissez la cible et le motif).\n" +
                    "§8(L'ancienne méthode marche aussi : jeter le parchemin au sol à côté du perroquet.)\n\n" +
                    "§63.§r Votre cible reçoit un parchemin « Déclaration de guerre » : §eclic droit§r pour accepter ou refuser.\n\n" +
                    "§64.§r Guerre acceptée : tout le serveur est prévenu… §cà l'assaut !§r\n\n" +
                    "§7Victoire : §eterrassez votre adversaire§r au combat."
            },
            {
                titre: "§aFaire la paix",
                texte:
                    "§7Pendant une guerre :\n\n" +
                    "§61.§r §eClic droit sur un Parchemin§r → menu « Proposer la paix » → choisissez le joueur.\n" +
                    "§62.§r L'adversaire reçoit l'offre : il §edépose un parchemin près du corbeau messager§r pour l'accepter.\n\n" +
                    "§7La paix met fin à la guerre sans conditions.\n\n" +
                    "§8Astuce : la liste de vos guerres en cours est visible dans le menu du drapeau (« Liste des guerres »)."
            },
            {
                titre: "§cReddition et tribut",
                texte:
                    "§7Le §fDrapeau de reddition§r permet de capituler en négociant :\n\n" +
                    "§61.§r Le vaincu hisse le drapeau blanc → le vainqueur reçoit un papier pour fixer ses §econditions§r :\n" +
                    "§8• paiement immédiat (émeraudes, or, diamants, fer, netherite)\n" +
                    "§8• §etribut§r périodique livré par un messager\n" +
                    "§8• perte de moral\n" +
                    "§8• voire §4cession du château§r !\n\n" +
                    "§62.§r Le vaincu accepte ou refuse les conditions.\n\n" +
                    "§4⚠ Tuer le messager du tribut relance la guerre !§r\n\n" +
                    "§7On peut aussi acheter la paix avec le §cClan des Pillards§r pendant leurs raids."
            },
            {
                titre: "§cAssiéger un royaume",
                texte:
                    "§7Pour conquérir le drapeau d'un autre joueur :\n\n" +
                    "§61.§r Sonnez un §ecor§r près de son drapeau pour lancer le §csiège§r.\n" +
                    "§62.§r §eRestez dans la zone§r indiquée : si vous fuyez, le siège échoue.\n" +
                    "§63.§r Le défenseur est alerté et doit défendre son drapeau.\n" +
                    "§64.§r Si le siège réussit, le royaume peut être §ecapturé§r : son drapeau change de main !\n\n" +
                    "§7Un royaume qui tombe libère aussi ses colonies vassales.\n\n" +
                    "§8Pensez aux machines : bélier, catapulte, trébuchet, baliste, tour de siège (recherches du Registre + plans à construire en bois)."
            }
        ]
    },
    {
        titre: "§4👿 Menaces du monde (PvE)",
        sections: [
            {
                titre: "§4Le Tyran et son invasion",
                texte:
                    "§7Le §4Tyran§r (Roi Illageois) est le boss final :\n\n" +
                    "§61.§r Des rumeurs annoncent qu'il vous observe, puis une §4lettre de déclaration de guerre§r arrive.\n" +
                    "§62.§r Quelques jours plus tard : §cinvasion en 5 vagues§r sur votre château (ancrée sur votre Drapeau de château).\n" +
                    "§63.§r Le Tyran arrive en personne : phases de rage, §ctempête de flèches§r, §4déluge de rochers§r, gardes à tuer pour briser son bouclier.\n\n" +
                    "§7Victoire : grosses récompenses (émeraudes, diamants, netherite, pomme enchantée, 30 niveaux). Défaite : ses forces occupent votre base…\n\n" +
                    "§8À sa capture, vous choisissez son sort : la potence ou la grâce."
            },
            {
                titre: "§4Éclaireurs et raids",
                texte:
                    "§7Des §céclaireurs illageois§r viennent parfois espionner votre royaume :\n\n" +
                    "§e• Tuez-les avant la fin du temps imparti§r pour rester en sécurité.\n" +
                    "§c• S'ils s'échappent§r, ils font leur rapport → une lettre de raid arrive → §craid en plusieurs vagues§r sur votre château.\n\n" +
                    "§7Défendez le royaume : raid repoussé = récompenses ; raid perdu = royaume saccagé.\n\n" +
                    "§8Les embuscades (bandits en voyage) existent aussi — désactivables dans les Paramètres de Sieged."
            },
            {
                titre: "§4Boss : Chevalier Déchu et Ravageur",
                texte:
                    "§4Le Chevalier Déchu§r hante les forteresses déchues :\n" +
                    "§8• son emprise vous attrape — débattez-vous pour vous échapper !\n" +
                    "§8• il broie les boucliers et retourne vos troupes contre vous.\n" +
                    "§8• la quête « Victoire parfaite » (le vaincre sans subir un coup) donne un §eBlason vierge§r.\n\n" +
                    "§4Le Ravageur de guerre§r est une bête de siège cuirassée :\n" +
                    "§8• tuez d'abord §eses cavaliers§r pour pouvoir le blesser.\n" +
                    "§8• il lâche de quoi obtenir le §6Fléau du Ravageur§r.\n\n" +
                    "§6Prestige :§r auprès du Monarque, effacez ces 2 victoires pour les réaffronter en plus fort — condition pour redéfier le Tyran."
            },
            {
                titre: "§4Sièges de châteaux PNJ",
                texte:
                    "§7Le monde contient des châteaux à conquérir (pillards, désert, viking…) — les cartes de quête vous y mènent :\n\n" +
                    "§61.§r Sonnez un §ecor§r près du château pour lancer le siège.\n" +
                    "§62.§r Repoussez les §cvagues de défenseurs§r (+ flèches, renforts).\n" +
                    "§63.§r Certains châteaux ont un §bsiège naval§r : coulez la flotte, le §4navire amiral§r arrive en finale !\n\n" +
                    "§7Récompenses : émeraudes, or, diamants, débris/lingots de netherite, pomme enchantée, XP.\n\n" +
                    "§6Le siège ultime (Mauvais Présage V) a pour seul prix la §eCouronne de Souveraineté§r — unique sur le serveur."
            },
            {
                titre: "§4Royaumes PNJ et entraînement",
                texte:
                    "§2Royaumes PNJ (IA) :§r des royaumes de villageois qui grandissent avec le temps. Gagnez de la §enotoriété§r auprès d'eux pour débloquer :\n" +
                    "§8• leurs échanges (armes, boucliers, unités temporaires ou permanentes)\n" +
                    "§8• leur voyage rapide (Charretier)\n" +
                    "§8• des caravanes et de l'aide.\n" +
                    "§cLes attaquer a de lourdes conséquences !§r\n\n" +
                    "§6Entraînement (Général villageois) :§r\n" +
                    "§8• Parcours 3 vagues → gagne un §eGardien + une Sentinelle§r.\n" +
                    "§8• Épreuve d'élite (protégez le soldat blessé) → gagne un §cGarde-bannière d'élite§r (recharge 60 min)."
            }
        ]
    },
    {
        titre: "§6🏗 Modèles de construction",
        sections: [
            {
                titre: "§7Lire les schémas",
                texte:
                    "§7Dans ce chapitre, chaque case des schémas = §e1 bloc§7. Compte les cases et reproduis à l'identique !\n\n" +
                    "§8Astuces générales :\n" +
                    "§7• Varie les blocs d'une même famille (pierre, pierre taillée, andésite) pour donner de la texture.\n" +
                    "§7• Ajoute de la profondeur : murs pas tout plats, poutres en relief, escaliers sous les débords.\n" +
                    "§7• Les diamètres §eimpairs§7 (5, 7, 9, 13...) donnent des tours avec un vrai centre."
            },
            {
                titre: "§7Tours rondes : les cercles",
                texte:
                    "\uE200\uE201\uE202\uE203\uE204\n\uE210\uE211\uE212\uE213\uE214\n\uE220\uE221\uE222\uE223\uE224\n\uE230\uE231\uE232\uE233\uE234\n\uE240\uE241\uE242\uE243\uE244\n\n" +
                    "§7En haut : §eØ5§7 (gauche) et §eØ7§7 (droite).\n" +
                    "§7En bas : §eØ9§7 (gauche) et §eØ13§7 (droite).\n\n" +
                    "§8Ø5 = échauguette · Ø7 = tourelle · Ø9 = tour de garde · Ø13 = donjon rond. Monte le cercle à la verticale, puis ajoute l'encorbellement et le toit (voir « Tour ronde complète »)."
            },
            {
                titre: "§cToit 45° (classique)",
                texte:
                    "\uE205\uE206\uE207\uE208\uE209\n\uE215\uE216\uE217\uE218\uE219\n\uE225\uE226\uE227\uE228\uE229\n\uE235\uE236\uE237\uE238\uE239\n\uE245\uE246\uE247\uE248\uE249\n\n" +
                    "§7La pente monte de §e1 bloc par bloc§7 (45°) : parfaite pour les §eescaliers§7.\n" +
                    "§7Fais §edéborder le toit d'1 bloc§7 de chaque côté du mur : c'est ce débord qui rend une maison jolie.\n" +
                    "§8Dessous du débord : escaliers renversés ou dalles."
            },
            {
                titre: "§cToit mansardé (2 pentes)",
                texte:
                    "\uE20A\uE20B\uE20C\uE20D\uE20E\n\uE21A\uE21B\uE21C\uE21D\uE21E\n\uE22A\uE22B\uE22C\uE22D\uE22E\n\uE23A\uE23B\uE23C\uE23D\uE23E\n\uE24A\uE24B\uE24C\uE24D\uE24E\n\n" +
                    "§7Deux pentes : d'abord §epresque verticale§7 (2 de haut pour 1 de côté), puis §edouce§7 (1 de haut pour 2 de côté).\n" +
                    "§7Donne un étage habitable sous le toit — idéal pour les maisons de ville serrées.\n" +
                    "§8Blocs : escaliers + dalles pour la pente douce."
            },
            {
                titre: "§fFaçade à colombage",
                texte:
                    "\uE250\uE251\uE252\uE253\uE254\n\uE260\uE261\uE262\uE263\uE264\n\uE270\uE271\uE272\uE273\uE274\n\uE280\uE281\uE282\uE283\uE284\n\uE290\uE291\uE292\uE293\uE294\n\n" +
                    "§7La recette du médiéval : §esoubassement en pierre§7, murs clairs (béton blanc, laine, terre cuite blanche), et §epoutres en chêne noir§7.\n" +
                    "§7Place un poteau vertical tous les §e5-6 blocs§7, des sablières en haut et en bas, puis des §ecroix de Saint-André§7 (diagonales) dans les panneaux.\n" +
                    "§8Étage légèrement en surplomb = encore plus médiéval."
            },
            {
                titre: "§bFenêtres",
                texte:
                    "\uE255\uE256\uE257\uE258\uE259\n\uE265\uE266\uE267\uE268\uE269\n\uE275\uE276\uE277\uE278\uE279\n\uE285\uE286\uE287\uE288\uE289\n\uE295\uE296\uE297\uE298\uE299\n\n" +
                    "§7Trois modèles, de gauche à droite :\n" +
                    "§e• Lancette§7 : 1×3 avec linteau sombre — pour tours et églises.\n" +
                    "§e• Croisée§7 : 2×3 encadrée de poutres — pour maisons riches.\n" +
                    "§e• Œil rond§7 : cercle Ø5 avec verre au centre — pignons et chapelles.\n" +
                    "§8Varie les vitres : verre blanc, gris clair, jaune pâle."
            },
            {
                titre: "§7Remparts : créneaux",
                texte:
                    "\uE25A\uE25B\uE25C\uE25D\uE25E\n\uE26A\uE26B\uE26C\uE26D\uE26E\n\uE27A\uE27B\uE27C\uE27D\uE27E\n\uE28A\uE28B\uE28C\uE28D\uE28E\n\uE29A\uE29B\uE29C\uE29D\uE29E\n\n" +
                    "§7Rythme des créneaux : §e2 pleins, 1 vide§7 (les merlons font 2 blocs de haut).\n" +
                    "§7Juste sous le parapet, fais une rangée §een surplomb d'1 bloc§7 avec des trous : le §emâchicoulis§7.\n" +
                    "§8Un rempart efficace fait au moins 4-5 blocs d'épaisseur avec un chemin de ronde."
            },
            {
                titre: "§7Tour ronde complète",
                texte:
                    "\uE2A0\uE2A1\uE2A2\uE2A3\uE2A4\n\uE2B0\uE2B1\uE2B2\uE2B3\uE2B4\n\uE2C0\uE2C1\uE2C2\uE2C3\uE2C4\n\uE2D0\uE2D1\uE2D2\uE2D3\uE2D4\n\uE2E0\uE2E1\uE2E2\uE2E3\uE2E4\n\n" +
                    "§7De bas en haut : §efût§7 (le cercle monté à la verticale), §earchères§7 (fentes de 1×1 verre ou vide), §eencorbellement§7 (rangée qui déborde d'1 bloc), puis §etoit conique§7 : rétrécis d'1 bloc tous les 2 blocs de hauteur.\n" +
                    "§8Finis par un épi de faîtage (clôture + torche, ou cloche)."
            }
        ]
    },
    {
        titre: "§3💡 Conseils pour le serveur",
        sections: [
            {
                titre: "§3Bien vivre à plusieurs",
                texte:
                    "§7• Commencez par les quêtes du §6Noble§r et du §6Monarque§r pour obtenir votre §eDrapeau de château§r.\n\n" +
                    "§7• Fondez votre royaume §eloin des autres§r (distance minimale imposée entre drapeaux).\n\n" +
                    "§7• Surveillez le §emoral§r : golems + animaux + cultures = royaume stable. Sous 10, vos §ctroupes se rebellent§r et un Noble peut vous renverser !\n\n" +
                    "§7• Avant une absence : remisez vos troupes à la §ecaserne§r et réparez votre château.\n\n" +
                    "§7• L'objet §6Paramètres de Sieged§r (accroupi + interagir) permet de couper invasions/embuscades le temps que tout le monde s'installe.\n\n" +
                    "§7• Ce guide s'ouvre avec un simple §elivre§r — gardez-en un sur vous !"
            }
        ]
    }
];

// ─── Navigation ──────────────────────────────────────────────────────────────
async function showSection(player, chap, section) {
    const form = new ActionFormData()
        .title(section.titre)
        .body(section.texte + "\n ")
        .button(BTN_RETOUR);
    const res = await form.show(player);
    if (!res.canceled) {
        system.run(() => showChapter(player, chap));
    }
}

async function showChapter(player, chap) {
    if (chap.sections.length === 1) {
        // Chapitre à section unique : afficher directement le texte
        const form = new ActionFormData()
            .title(chap.titre)
            .body(chap.sections[0].texte + "\n ")
            .button(BTN_RETOUR);
        const res = await form.show(player);
        if (!res.canceled) system.run(() => showMainMenu(player));
        return;
    }
    const form = new ActionFormData()
        .title(chap.titre)
        .body("§7Choisissez un sujet :");
    for (const s of chap.sections) form.button(s.titre);
    form.button(BTN_RETOUR);
    const res = await form.show(player);
    if (res.canceled || res.selection === undefined) return;
    if (res.selection === chap.sections.length) {
        system.run(() => showMainMenu(player));
        return;
    }
    system.run(() => showSection(player, chap, chap.sections[res.selection]));
}

async function showMainMenu(player) {
    const form = new ActionFormData()
        .title("§6§l📖 Guide Sieged")
        .body("§7Tout ce qu'il faut savoir pour bâtir ton royaume,\n§7lever une armée et faire la guerre.\n\n§8Choisis un chapitre :");
    for (const chap of GUIDE) form.button(chap.titre);
    form.button(BTN_FERMER);
    const res = await form.show(player);
    if (res.canceled || res.selection === undefined) return;
    if (res.selection >= GUIDE.length) return;
    system.run(() => showChapter(player, GUIDE[res.selection]));
}

// ─── Déclencheur : utiliser un livre classique ───────────────────────────────
world.afterEvents.itemUse.subscribe((ev) => {
    if (ev.itemStack?.typeId !== "minecraft:book") return;
    const player = ev.source;
    if (!player || player.typeId !== "minecraft:player") return;
    system.run(() => showMainMenu(player));
});
