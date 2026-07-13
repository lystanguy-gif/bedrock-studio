# Coach Tanguy — carnet d'entraînement intelligent

Application mobile (site statique, aucune dépendance) de suivi sportif avec coach adaptatif intégré, pour le programme du 13 juillet au 1er septembre 2026.

**Accès : `/sport/` sur le site publié.** Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ».

## Fonctionnalités
- Tableau de bord : séance du jour, récupération, poids, J-avant-rentrée, conseil du coach.
- Programme 7 semaines (4 séances + 1 facultative), séances déplaçables, allégeables, remplaçables par du repos.
- Suivi par série : répétitions (chiffres ou texte libre), validée/arrêtée, séries bonus, charge, ressenti, technique — conseil immédiat du coach après chaque ressenti.
- Fiches d'exercices illustrées (30 exercices) : schémas départ/arrivée, muscles, étapes, erreurs, sécurité, variantes, remplacements. Le pike push-up n'est plus imposé : le développé au-dessus de la tête (bouteilles/sac) le remplace.
- Douleurs : schéma du corps cliquable (face/dos), nature, moment, intensité 0-10, triage vert/orange/rouge avec recommandation de consulter si nécessaire.
- Validation de séance : récapitulatif → compte-rendu du coach (points positifs, à améliorer, adaptations appliquées, mini compte-rendu physique).
- Adaptation automatique des séances suivantes selon les résultats, douleurs, fatigue.
- Poids & mensurations avec graphiques (moyenne 7 jours, tour de taille, progression par exercice, douleur/fatigue).
- Conseils alimentaires basés sur la tendance de poids réelle — prise de muscle propre.
- Sauvegarde automatique (localStorage), export JSON / bilan texte pour ChatGPT / PDF, import de sauvegarde.

## Structure
```
sport/
  index.html        coquille + navigation
  css/style.css     thème sombre sportif, mobile-first
  js/poses.js       schémas d'exercices + schéma du corps (SVG)
  js/exercises.js   bibliothèque de 30 fiches d'exercices
  js/program.js     plan 7 semaines, dates, phases
  js/charts.js      graphiques SVG
  js/coach.js       moteur du coach (analyse, adaptation, douleurs, nutrition)
  js/session.js     déroulé de séance, récap, compte-rendu
  js/app.js         état, vues, export/import
```

Testé automatiquement (Playwright, viewport iPhone) sur le scénario complet : séance → séries → série bonus → remplacement → douleur → validation → compte-rendu → poids → conseil → rechargement sans perte → export/import.
