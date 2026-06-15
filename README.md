# La Carline — site & console de réservation

Bateau promenade sur le lac de Serre-Ponçon (Savines-le-Lac, Hautes-Alpes).

## Fichiers

| Fichier | Rôle |
|---|---|
| **`index.html`** | Le site public (vitrine + carte animée du parcours + réservation + paiement en ligne). Multilingue FR/EN/IT/DE/NL/ES. Un seul fichier, aucune dépendance serveur. |
| **`admin.html`** | La **console de réservation** privée pour l'équipage : boîte de réception, classement par statut, recherche, raccourcis clavier, réponses e-mail pré-remplies au prénom, export Excel/CSV. |

## Le site (`index.html`)

- **Carte animée fidèle au lac** : la silhouette du lac de Serre-Ponçon (forme en Y), les 6 escales placées à leur position géographique, et le bateau qui suit un tracé passant **par chaque point** dans l'ordre. Le tracé est construit à partir des points eux-mêmes (`WP` dans le script), donc l'animation ne peut pas « rater » une escale. Pour ajuster un point, il suffit de modifier ses coordonnées dans le tableau `WP`.
- **Réservation** : le formulaire envoie la demande (formulaire Netlify si hébergé sur Netlify, sinon ouverture automatique de la messagerie vers `bateaulacarline@gmail.com`).
- **Navigation** : tous les boutons/onglets sont des raccourcis qui défilent en douceur vers la bonne section (sans masquage sous l'en-tête).

### Activer le paiement en ligne (sécurisé, sans serveur)

Le paiement passe par un **lien de paiement Stripe** : aucune donnée bancaire ne transite par le site, tout est traité par Stripe (certifié PCI-DSS, 3-D Secure).

1. Créer un compte gratuit sur <https://dashboard.stripe.com>.
2. **Paiements → Liens de paiement → Nouveau**. Créer un produit « Billet promenade La Carline » (14,50 €) et activer **« Laisser le client choisir la quantité »**.
3. Copier le lien (`https://buy.stripe.com/...`).
4. Dans `index.html`, le coller entre les guillemets de :
   ```js
   const STRIPE_LINK = "";
   ```
   Le bouton « Payer en ligne » devient alors actif et pré-remplit l'e-mail du client + une référence de réservation.

## La console (`admin.html`)

Ouvrir le fichier dans un navigateur (à garder privé, non publié). Version locale : les réservations sont enregistrées **sur l'appareil** (dans le navigateur).

- **Recevoir les demandes** : bouton *Importer* — coller le CSV exporté par Netlify (colonnes `nom, telephone, email, personnes, date, depart, message`) ou un fichier ; ou *Nouvelle* pour saisir à la main. Les doublons (même nom + date) sont ignorés.
- **Classer** : filtres par statut (Nouveau / Confirmé / En attente / Annulé / Archivé), recherche, tri.
- **Répondre (rien ne s'envoie tout seul)** : modèles d'e-mail personnalisés au prénom **et à la date** — Confirmation, **Disponibilité** (le texte s'adapte aux places déjà réservées ce jour-là), Devis groupe, Remboursement, Rappel. L'e-mail s'ouvre pré-rempli ; la personne relit et envoie elle-même.
- **Exporter** : Excel (`.xls`) ou CSV.
- **Raccourcis clavier** : `N` nouvelle · `/` rechercher · `J`/`K` naviguer · `C` confirmer · `A` archiver · `E` e-mail de confirmation · `Échap` fermer.

### Vers une plateforme serveur « tout automatique »

La console locale est l'étape 1. L'évolution recommandée (multi-postes, accès par mot de passe, demandes reçues automatiquement, statut « payé » mis à jour par Stripe, e-mails automatiques, sauvegardes RGPD) nécessite un hébergement avec base de données (Supabase / Firebase / serveur Node). Les données saisies ici s'exportent puis se réimportent — rien n'est perdu lors de la migration. Détails dans la console → « Évolution serveur ».
