# Le Contrechamp — notes de projet

Appli web de débat multijoueur. Stack : React + Vite, Supabase (BDD + temps réel),
déploiement Netlify, fonction serverless Netlify pour l'IA (clé API jamais côté navigateur).

Site en ligne : https://debat-du-contrechamp.netlify.app
Branche de dev : `claude/contrechamp-debate-app-vqon1f`

## Décisions verrouillées
- **Accès** : regarder = libre/anonyme ; écrire / jouer / héberger / modérer = **compte obligatoire**
  (pseudo + email + mot de passe). Identité = pseudo + **#identifiant unique**.
- **Hiérarchie** : Admin (le propriétaire) > Hôte du lobby > Modérateur (chat/spectateurs) >
  Débatteurs / Spectateurs. Les modos ne touchent pas aux débatteurs ; seul l'hôte le fait ;
  l'admin peut fermer n'importe quel lobby et fermer des comptes (lui seul).
- **Découverte** : l'écran « façon Yubo » s'appelle **L'Agora**.
- **Filtre chat** : bloquer vulgarité / insultes / appels à la haine, avec anti-contournement
  (leet, lettres espacées, astérisques, abréviations). NE PAS bloquer les noms historiques/
  politiques (sinon on casse les débats Histoire/Politique) — pour la haine on s'appuie sur
  signalement + modération.
- **Trophées** : style des logos (médaille + ruban + symbole, par couleur de rareté) **validé**.
- **Traduction** : prévue, FR/EN d'abord.
- **IA / abonnement payant** : tout à la fin ; afficher « bientôt » en attendant.

## Assets prêts (rangés dans /public)
- `avatars/` : 36 avatars SVG (5 familles) + `avatars.json`
- `trophees.json` : 52 trophées (emojis = placeholders ; logos SVG à finaliser)
- `hashtags.json` : 247 centres d'intérêt, 16 domaines
- `base-documentaire.json` : 185 fiches (à enrichir par lots, SOURCES VÉRIFIÉES uniquement)

## Déjà fait
- Appli en ligne, design de la maquette conservé tel quel
- Bugs caméra (clignotement) + image (iPhone) corrigés ; caméra en miroir
- Fiches documentaires branchées (recherche de mots-clés dans la transcription)
- Comptes : inscription / connexion (Supabase Auth)
- Phase 1 — Vrais lobbys : création/code, rejoindre, temps réel, présence,
  sièges jusqu'à 2v2, « monter », départs, succession de l'hôte, auto-fermeture
- Phase 2 — Profils & identité : avatars, pseudo, fiche profil, #centres d'intérêt
- Phase 3 — L'Agora : liste des débats publics (filtres à venir)
- **Vidéo « maison »** : caméra + voix des débatteurs en pair-à-pair (WebRTC),
  signalisation via Supabase Realtime (broadcast), STUN public, sans serveur média
- Phase 5 — Fin de débat & trophées : bouton « Clore » → vote du public → résultats →
  attribution automatique des trophées (moteur dans `src/lib/trophies.js`).
  ⚠️ Migration SQL à passer : `docs/migration-trophees.sql` (colonnes profiles.trophies + panels.theme)

## Feuille de route
1. **Phase 1 — Vrais lobbys** : créer (→ code) / rejoindre par code ; temps réel ;
   présence (spectateurs) ; sièges jusqu'à 2v2 ; « monter » sur une place libre ;
   départs gérés ; succession de l'hôte. ← PROCHAIN
2. **Phase 2 — Profils & identité** : avatars, pseudo + #id, page profil
   (membre depuis, palmarès), #centres d'intérêt.
3. **Phase 3 — L'Agora (découverte)** : lives qui défilent, amis en haut (🔴 débatteur /
   🔵 chat), public/privé, rejoindre par code / invitation / menu.
4. **Phase 4 — Social** : amis (demandes, accepter), inviter dans un lobby.
5. **Phase 5 — Fin de débat & trophées** : bouton « terminer » → vote du public ;
   attribution des trophées ; finaliser les logos SVG.
6. **Phase 6 — Sécurité & modération** : filtre chat renforcé, signalement, menu admin,
   modérateurs généraux, fermeture de compte (admin).
7. **Finale — Vérification IA** : fonction Netlify + clé API → Claude Haiku ; puis abonnement.

## Notes techniques
- Auth Supabase : confirmation email désactivée (tests sans friction) ; à réactiver avant
  ouverture publique (traçabilité).
- Variables Netlify : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (clé publishable, publique).
- RLS Supabase : policies permissives (lecture/création/màj), pas de suppression. À resserrer
  avec de vrais comptes/règles plus tard.
