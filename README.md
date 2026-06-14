# Bedrock Studio

Créateur d'add-ons Minecraft Bedrock, 100 % dans un seul fichier HTML (`bedrock_studio.html`) — ouvrable d'un double-clic, sans installation.

## Fonctionnalités

- **Items** : armes, outils, armures avec stats, effets spéciaux et texture pixel art.
- **Mobs & Boss** : créatures avec IA, stats, drops et comportements.
- **🐲 Créatures 3D** : éditeur de modèles 3D au format de géométrie natif de Minecraft Bedrock
  (os + boîtes), rendu temps réel pixel-perfect via Three.js. Export en add-on `.mcpack`
  jouable (resource pack + behavior pack), **identique en jeu** puisque c'est le format de
  Minecraft. Modèles de départ (humanoïde, quadrupède, blob), sélection à la souris, couleurs.
- **Pont IA** : copie un prompt prêt à coller dans Claude ou ChatGPT pour générer une créature,
  puis importe le JSON (ou n'importe quel `.geo.json` Bedrock / Blockbench) pour la visualiser.
- **Effets & Potions**, **Marchands** : systèmes additionnels.

## Utilisation

Ouvre `bedrock_studio.html` dans un navigateur. Onglet **Créatures 3D** → choisis un modèle de
départ → modifie les boîtes/couleurs → **Exporter la créature** → installe les deux `.mcpack`
dans Minecraft, puis `/summon monaddon:ton_id`.
