# Traduction française de l'add-on Sieged (TAT) — v1.7.5

Ce dossier contient la traduction française complète de l'add-on **Sieged** pour
Minecraft Bedrock, ainsi que la simplification de la déclaration de guerre.
Le fichier `.mcaddon` complet prêt à installer a été livré séparément (il n'est
pas stocké dans ce dépôt pour ne pas redistribuer publiquement l'add-on entier).

## Contenu

- `texts/fr_FR.lang` — traduction française des 1022 clés du jeu (objets,
  créatures, messages HUD, titres, quêtes, sièges, invasions, royaume…)
- `texts/fr_CA.lang` — copie pour les joueurs en français canadien
- `texts/languages.json` — liste des langues du pack (fr_FR et fr_CA ajoutées)
- `patches/sieged-scripts-fr.patch` — modifications apportées aux scripts du
  pack de comportement (à appliquer sur la v1.7.1 d'origine avec `patch -p1`)

## Ce qui a été fait

### 1. Traduction complète
- **Fichiers `.lang`** : tous les noms d'objets, d'armures, d'unités, de blocs
  et tous les messages à l'écran sont traduits. Ces fichiers sont résolus
  **côté client** par Minecraft : chaque joueur voit le jeu dans sa langue,
  sans aucun coût pour le serveur.
- **`lore_i18n.js`** : bloc `fr_FR` ajouté au dictionnaire des descriptions
  d'objets (lore du Cor de guerre, des boucliers, des armes, des blasons…).
  Les locales `fr-FR`, `fr_FR`, `fr_CA` sont reconnues automatiquement.
- **`kingdom.js`** : menu complet du royaume en français (188 clés — gestion
  du drapeau, caserne, membres, rangs, diplomatie, coup d'État, dissolution…).
- **`settings.js`** : menu Paramètres de Sieged en français + « Français »
  ajouté au choix « Langue des descriptions d'objets ».
- **`banner_guard_script.js`** : menu de commandement du Garde-bannière en
  français (formations, fauconniers, pluie de flèches…).
- **`sieged_book.js`** : Registre (guide de démarrage, quêtes de boss,
  améliorations militaires) en français.
- **`war_declaration.js`** : formulaires de déclaration de guerre et de paix
  en français ; le parchemin « Déclaration de guerre » est libellé en français
  quand le destinataire joue en français.

### 2. Déclaration de guerre simplifiée
Avant : il fallait **jeter** un Parchemin par terre à moins de 2 blocs d'un
perroquet, et attendre que le script le détecte.

Maintenant : il suffit d'**utiliser le Parchemin directement sur le
perroquet** (interaction). Il se transforme immédiatement en Corbeau messager
et le menu de déclaration de guerre s'ouvre. L'ancienne méthode du lancer
fonctionne toujours en secours.

### 3. Anti-lag : pourquoi cette traduction ne peut pas figer le jeu
Le gel décrit (créatures figées puis accélération pour « rattraper » le temps)
est le comportement du watchdog Bedrock quand un script consomme trop de temps
par tick. Cette traduction a été conçue pour avoir un coût d'exécution nul :
- les `.lang` sont lus par le client, jamais par les scripts serveur ;
- les blocs `fr_FR` des scripts sont de simples données chargées une fois au
  démarrage (aucune boucle, aucun `runInterval` ajouté) ;
- la simplification perroquet→corbeau utilise un événement d'interaction
  (déclenché uniquement au clic), là où l'ancien système scanne déjà chaque
  seconde — aucun scan supplémentaire n'a été ajouté.

### 4. Correctif : objets invisibles (gris foncé) dans l'inventaire
Bug présent dans l'add-on d'origine : les trois trophées **Marque du Tyran**,
**Marque du Ravageur** et **Marque du Déchu** n'avaient pas de composant
`minecraft:icon`, d'où une icône grise dans l'inventaire. Les clés de texture
existaient déjà dans `item_texture.json` (`golden_*_trophy`) — elles sont
désormais référencées par les trois fichiers d'objets. Audit complet effectué :
tous les autres objets (160) et blocs ont une icône et un fichier de texture
valides.

### 5. Nom des packs
Les packs s'affichent désormais comme **« Sieged TAT Behavior (FR) »** et
**« Sieged TAT Resource (FR) »** dans Minecraft, avec une description en
français — pour distinguer la version traduite de l'originale d'un coup d'œil.

### 6. Version
Les deux packs passent de 1.7.1 à **1.7.5** pour que l'import remplace
proprement la version déjà installée sur la Xbox.

### 7. v1.7.5 — traduction totale + guide
- Système de quêtes entièrement en français (titres, objectifs, objets à collecter,
  choix de cartes, insignes de difficulté).
- Boutique/échanges des royaumes PNJ, casernes (remiser/déployer), rapport de moral,
  blasons (noms + descriptions), rangs, niveaux de royaume (Colonie→Royaume).
- Menu complet du Garde-bannière (y compris avertissements et pluie de flèches),
  cors de commandement (noms + lore dynamique), reddition/tribut, Charretier,
  Registre (onglet siège), dialogues du Monarque, du Général et du Roi Illageois,
  cartes de butin.
- Correction d'un bug latent : le rang choisi dans le menu était stocké tel quel
  (traduit) alors que la logique compare "Noble"/"Knight"/"Peasant" — le code
  stocke désormais la valeur canonique et n'affiche que la traduction.
- Ajout de `GUIDE-SIEGED-FR.md` : guide complet des mécaniques en français.

## Réappliquer sur une future mise à jour de Sieged

1. Décompresser le nouveau `.mcaddon` (c'est un zip).
2. Copier `texts/fr_FR.lang`, `texts/fr_CA.lang` dans `SiegedTATR/texts/` et
   ajouter `"fr_FR"` et `"fr_CA"` dans `languages.json`.
3. Appliquer `patches/sieged-scripts-fr.patch` à la racine des deux packs
   (`patch -p1 < sieged-scripts-fr.patch`) — ou redemander la traduction si
   les scripts ont trop changé.
4. Recompresser les deux dossiers en `.mcaddon`.
