# Bedrock Studio

Créateur d'add-ons Minecraft Bedrock, 100 % dans un seul fichier HTML (`bedrock_studio.html`) — ouvrable d'un double-clic, sans installation.

## Fonctionnalités

- **Items** : armes, outils, armures avec stats, effets spéciaux et texture pixel art.
- **Mobs & Boss** : créatures avec IA, stats, drops et comportements.
- **🐲 Créatures 3D** : éditeur de modèles 3D au format de géométrie natif de Minecraft Bedrock
  (os + boîtes), rendu temps réel pixel-perfect via Three.js. Export en add-on `.mcpack`
  jouable (resource pack + behavior pack), **identique en jeu** puisque c'est le format de
  Minecraft. Deux modes :
  - **🧱 Construire** : 8 modèles de départ (humanoïde, araignée, dragon ailé, golem/boss,
    quadrupède, oiseau, serpent, slime), édition à la souris (clic = sélection), taille/
    position/couleur par boîte, pivot/rotation/rôle par os, bouton **miroir** pour les parties
    symétriques (ailes, pattes…).
  - **🎬 Animer** : timeline avec lecture ▶, images-clés, et **animations automatiques**
    (marche, repos/respiration, battement d'ailes, attaque) générées d'après le rôle des os.
    Export au format `.animation.json` + câblage `scripts/animate` (marche déclenchée par le
    mouvement, vol/repos en boucle) — les animations jouent vraiment en jeu.
  - **Aide « ? » partout** : chaque réglage a une explication cliquable.
- **Pont IA** : copie un prompt prêt à coller dans Claude ou ChatGPT pour générer une créature,
  puis importe le JSON (ou n'importe quel `.geo.json` Bedrock / Blockbench) pour la visualiser.
- **Effets & Potions**, **Marchands** : systèmes additionnels.

## Utilisation

Ouvre `bedrock_studio.html` dans un navigateur. Onglet **Créatures 3D** → choisis un modèle de
départ → modifie les boîtes/couleurs → **Exporter la créature** → installe les deux `.mcpack`
dans Minecraft, puis `/summon monaddon:ton_id`.
