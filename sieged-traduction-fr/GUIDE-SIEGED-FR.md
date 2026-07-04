# 📖 Guide complet de Sieged (en français) — pour ton realm

Ce guide explique **tous les objets à fonction spéciale et toutes les mécaniques** de l'add-on Sieged, d'après une lecture complète de son code (v1.7). Il est pensé pour un serveur où chaque joueur fonde son royaume, recrute des troupes et peut faire la guerre aux autres.

---

## 1. Bien démarrer

1. Trouve le **Château du Monarque** (plaines). Parle au **Monarque** : il donne des quêtes qui débloquent l'essentiel (dont le **Drapeau de château**).
2. **Recruter** : donne des **émeraudes** aux villageois pour les engager.
3. **Promouvoir** : utilise des **Parchemins d'ordre de guerre** sur tes recrues pour les transformer en vraies unités (certaines promotions exigent d'abord une recherche dans le **Registre**).
4. Le **Registre** (livre) contient 4 onglets : Démarrage, Quêtes (suivi des boss), Armée (recherches militaires) et Siège (machines de guerre).
5. Le **Noble du village** donne des quêtes répétables (tue X ennemis / rapporte X objets) avec un **Journal de quêtes** pour suivre ta progression. Récompenses : or, acier trempé, parchemins, armes de siège…

## 2. Fonder et gérer ton royaume (le Drapeau)

Le **Drapeau de château** est l'objet central : pose-le pour fonder ta **Colonie**. **Interagis avec le drapeau** pour ouvrir le menu du royaume.

- **Niveaux** : Colonie → Village → Ville → Cité → Royaume. Chaque amélioration (villageois + matériaux requis) agrandit le territoire, le rendement des impôts et débloque des fonctions (caserne à partir de Ville, drapeaux vassaux, etc.).
- **Moral** (0–100) : gagné chaque jour (base +10, golems, unités, animaux, cultures, blason) et perdu par : orage, incendie dans le territoire, être en guerre, visite du Nether, « spirale » (3 pénalités ou plus). Moral bas = désertions ; sous 10 = **rébellions** (tes troupes passent à l'ennemi !) et risque de **coup d'État** par un Noble.
- **Impôts** : chaque jour, tes villageois produisent des émeraudes (selon leur nombre et le moral). Collecte-les sur le drapeau. Le **rapport du royaume** détaille tout.
- **Intégrité du château** : baisse pendant les attaques ; répare avec du fer. L'**ATH d'intégrité** peut s'afficher en permanence.
- **Membres et rangs** : invite des joueurs — **Paysan** (paye l'impôt), **Chevalier** (peut recruter des unités contre de l'XP et gérer la caserne), **Noble** (peut recevoir un drapeau vassal, ou fomenter un coup d'État si le moral du roi est < 10). Le **Roi** dirige tout et peut transmettre la couronne.
- **Caserne** (niveau Ville+) : enrôle tes unités apprivoisées, remise-les en sécurité, redéploie-les, ou lance l'**appel aux armes** (transforme des villageois en soldats temporaires contre du moral).
- **Diplomatie** : alliances entre royaumes, routes commerciales (émeraudes/jour pour les deux royaumes), rupture d'alliance.
- **Blasons** : voir section 5.

## 3. Recruter et commander une armée

**Unités principales** : Gardien (bouclier, mêlée), Sentinelle (arbalète), Templier (élite sacrée), Fauconnier (pluie de flèches), Chevalier (cavalerie), Garde-bannière (commandant), Javelinier, Lanciers…

- **Apprivoiser un Garde-bannière / Chevalier** : tiens une **émeraude** et interagis.
- **Revendiquer des troupes en masse** : renomme une **bannière** sur une enclume (c'est le nom de ta faction), puis **accroupi + utiliser la bannière** près des troupes.
- **Menu du Garde-bannière** (interagir) : Charger, Suivre, Vagabonder, Marche en formation, Tenir la position, Rallier au drapeau, Vue Commandant (vue du dessus pour placer tes unités), Retirer les armures, Protéger le commandant (les Templiers t'encerclent).
  - **Formations avancées** (après la recherche « Arts d'avant-garde ») : **Phalange** (mur de boucliers sur 3 rangs) et **Tortue** (défense circulaire) — coûtent des niveaux d'XP et exigent assez de Gardiens.
  - **Former des fauconniers** : convertit 2 Sentinelles → 1 Fauconnier (coût en XP). La **Pluie de flèches** se déclenche en lançant un **Marqueur** ; les fauconniers proches bombardent la zone (munitions qui se régénèrent).
- **Cors de commandement** (normal 15 blocs → doré 25 → diamant 40 → netherite 75) : **accroupi + interagir** sur ton Garde-bannière pour lier le cor, ensuite utilise-le à distance pour ouvrir son menu de commandement. Un cor peut aussi être lié à une **porte de château** (de l'intérieur) pour qu'elle ne s'ouvre qu'avec lui.
- **Équiper en masse** : certains parchemins/objets permettent d'armer toutes les unités dans 32 blocs (tiens l'arme en main quand on te le demande). Le **Parchemin d'ordre de retour** récupère tout l'équipement d'une unité (consommé à l'usage).

## 4. Objets spéciaux (à fonction)

- **Cor de guerre** : rallie toutes les troupes apprivoisées dans 10 blocs (+Résistance I et Force I, 30 s: recharge 1 min). Sert aussi à **déclencher un siège** sur un château ennemi/PNJ.
- **La Cloche d'Invocation** : invoque 4 Templiers apprivoisés (recharge 1 min).
- **Tambours de flotte** : commande tes navires — Interagir = Halte/Avancer ; Accroupi + Interagir = tout le monde à terre ; Accroupi + Saut = tous à bord.
- **Navire vassal** : revendique-le (bannière de faction), embarque tes soldats, cale de stockage.
- **Couronne de Domination** : accroupis-toi pour **marquer un ennemi à mort** (l'affaiblit, ton prochain coup fait +5 cœurs — recharge 40 s).
- **Couronne de Souveraineté** : unique sur le serveur — récompense du siège « Mauvais Présage V ». Si son porteur meurt, elle est à reprendre !
- **Heaume + Plastron du Déchu** : portés ensemble, **Accroupi + Saut** invoque le **Pacte du Déchu** — jusqu'à 4 illageois proches passent sous ton contrôle (recharge 60 s).
- **Fléau du Ravageur de guerre** : chaque coup chargé en moins de 5 s ajoute +3 dégâts (jusqu'à ×3).
- **Répéteur du Tyran** : arbalète à tir continu (consomme tes flèches).
- **Enclume de forge + Gant de forge + Fer chauffé** : mini-jeu de forge au bon timing → **Acier trempé** (raté = lingot ou pépite de fer). L'acier trempé sert aux armures/blocs.
- **Tonneau à flèches** : stocke des flèches (clic pour déposer, accroupi + clic pour prendre) — ravitaille les défenses.
- **Brasero** : enflamme tes flèches (à débloquer dans le Registre).
- **Pique en bois** : accroupi + clic droit au sol pour la planter (empilable ×3) — blesse les ennemis qui foncent dessus.
- **Pavois** : accroupi + saut pour le planter en barrière ; augmente les dégâts à distance des joueurs proches.
- **Cible, Escalier de siège, Meurtrières, Mur de boucliers** : blocs/structures défensives à placer.
- **Boucliers spéciaux** : Écu (50 % Résistance I en blocage), Bouclier en amande (ralentit l'attaquant), Rondache (Vitesse après blocage), Bouclier rond (renvoie 1 cœur), Grand bouclier rond (projette l'attaquant), Pavois (barrière).
- **Armes spéciales** : Hallebarde (anti-bouclier), Pique (frappe en ligne, anti-cavalerie), Marteau de guerre (anti-armure), Étoile du matin (étourdit), Épée longue (exécution < 30 % PV), Hache à deux têtes (fauchage + vol de vie), Zweihander (anti-sans-bouclier), Lance (charge à cheval), Marteau lourd (recul), Glaive (fauchage large), Sabre (riposte au clic droit), Javelot/Dague/Hache courte (lancer), Serpe de guerre (désarçonne les cavaliers), Arbalète lourde (Faiblesse), Arc long (ralentit à pleine tension).
- **Charretier** : PNJ de **voyage rapide** entre châteaux découverts (coût XP + émeraudes, recharge) ; peut transporter tes troupes proches. Convoque-le depuis le menu du drapeau.
- **Oracle** : révèle les menaces proches.
- **Chariot de siège** : transport terrestre — lie-le en montant dedans.
- **Paramètres de Sieged** (objet) : accroupi + interagir pour activer/désactiver les systèmes (invasions, batailles, sièges, déclarations de guerre, embuscades, langue des descriptions…).

## 5. Les Blasons (à appliquer sur ton drapeau — un seul à la fois)

Obtenus en échangeant avec le Monarque (Blason vierge en récompense de quêtes extrêmes).

| Blason | Effet |
|---|---|
| **Moral** | Pertes de moral ÷2, récupération +20/jour, aucune rébellion possible |
| **Vigueur** | Annule les explosions dans ton territoire |
| **Armes** | 1 Gardien + 1 Sentinelle offerts chaque jour ; +15 unités en cas de siège/invasion |
| **Architecture** | Perte d'intégrité ÷2 ; débloque « Rallier les villageois » et l'ATH |
| **Poursuite** | Tes unités : Force I + Vitesse I ; les ennemis dans ton territoire : Faiblesse I |
| **Guerre** | 1 machine de siège tous les 2 jours ; être en guerre ne coûte plus de moral |
| **Richesse** | Impôts +50 % ; membres : Héros du village dans le territoire |
| **Savoir** | Recherches -25 % ; +3 niveaux d'XP par jour |
| **Vierge** | Retire le blason actuel |

## 6. Guerre entre joueurs 🐦‍⬛

1. Tiens un **Parchemin** et **utilise-le sur un perroquet** : il se transforme immédiatement en **Corbeau messager** et le menu s'ouvre (choisis ta cible et ton motif). *(Ancienne méthode toujours possible : jeter le parchemin au sol près du perroquet.)*
2. La cible reçoit un parchemin « Déclaration de guerre » : **clic droit** pour accepter ou refuser.
3. En guerre : tuer l'adversaire = victoire. **Paix** : clic droit sur un parchemin → « Proposer la paix » ; l'autre dépose un parchemin près du corbeau pour accepter.
4. **Reddition** : le **Drapeau de reddition** ouvre la négociation — le vainqueur fixe ses conditions (paiement immédiat, **tribut** périodique livré par un messager, perte de moral, voire cession du château). Tuer le messager du tribut relance la guerre !
5. **Assiéger un royaume** : sonne un **cor** près du drapeau ennemi et reste dans la zone ; défends le tien quand on t'attaque. Un royaume conquis peut être capturé (son drapeau change de main).

## 7. Menaces du monde (PvE)

- **Le Tyran (Roi Illageois)** : boss final. Il t'envoie d'abord une **lettre de déclaration de guerre**, puis une **invasion en 5 vagues** sur ton château (ancrée sur ton Drapeau de château). Boss à phases : rages, tempête de flèches, déluge de rochers, gardes à tuer pour briser son bouclier. À sa défaite, tu peux le juger (pendaison ou grâce).
- **Éclaireurs & raids illageois** : des éclaireurs espionnent ton royaume — tue-les avant qu'ils ne fassent leur rapport, sinon raid en plusieurs vagues.
- **Le Chevalier Déchu** : boss des forteresses déchues ; son emprise t'attrape (échappe-toi !), il brise les boucliers. Sa quête « sans dégât » donne un Blason vierge.
- **Le Ravageur de guerre** : bête de siège — tue ses cavaliers pour le blesser. Lâche le matériau du **Fléau**.
- **Sièges de châteaux PNJ** : sonne un cor près d'un château (pillards, désert, viking…) et repousse les vagues de défenseurs ; certains ont des **sièges navals** (coule la flotte, navire amiral en finale). Récompenses : émeraudes, diamants, netherite… et la **Couronne de Souveraineté** pour le siège ultime.
- **Embuscades** : bandits/pillards surgissent en voyage (désactivable dans les Paramètres).
- **Royaumes PNJ (IA)** : 30 royaumes de villageois nommés qui grandissent avec le temps. Gagne de la **notoriété** auprès d'eux pour débloquer leurs **échanges** (armes, boucliers, unités permanentes…), leur voyage rapide, etc. Les attaquer a des conséquences !
- **Entraînement** : le **Général villageois** propose un parcours (3 vagues → gagne un Gardien + une Sentinelle) et une **épreuve d'élite** (protège le soldat blessé → gagne un **Garde-bannière d'élite** ; recharge 60 min).
- **Prestige** : auprès du Monarque, efface tes victoires sur le Chevalier Déchu et le Ravageur pour les réaffronter en plus fort — condition pour défier le Tyran à nouveau.

## 8. Conseils pour ton realm Xbox

- Chaque joueur devrait commencer par les quêtes du Noble/Monarque pour obtenir son **Drapeau de château**, puis fonder sa colonie **loin des autres** (distance minimale entre drapeaux imposée par l'add-on).
- Le **moral** est la vraie ressource à surveiller : golems + animaux + cultures dans le territoire = royaume stable.
- Les **rébellions** à moral bas sont brutales (tes propres troupes deviennent des ennemis Sieged).
- Le réglage **Paramètres de Sieged** permet de couper les invasions/embuscades le temps que tout le monde s'installe.

---
*Guide rédigé à partir du code de Sieged TAT v1.7 (traduction française v1.7.5).*
