# LKS ART — Site de Léa Kalck

Site officiel de l'artiste peintre **Léa Kalck** (marque **LKS ART**) : galerie
d'œuvres, vente en ligne et **espace privé** permettant à Léa de gérer ses toiles
elle-même, sans développeur.

Réalisation : Tanguy Lys. Périmètre livré : **Phase 1 (le socle)**.

> Le fichier `bedrock_studio.html` présent dans ce dépôt appartient à un autre
> projet ; il n'a aucun lien avec le site LKS ART décrit ici.

---

## Ce qui est livré

```
/
  index.html              Site public (accueil, artiste, galerie, annonces, presse, contact)
  admin.html              Espace privé de Léa (connexion + gestion)
  outils-import.html      Outil ponctuel : importe les 19 toiles dans Supabase
  assets/
    styles.css            Styles partagés (identité visuelle validée)
    app.js                Logique du site public
    admin.js              Logique de l'espace privé
    config.js             Réglages et clés (à remplir — voir config.example.js)
    config.example.js     Modèle de configuration
  images/                 Les 19 toiles de départ (fournies)
  contenu-initial.json    Métadonnées des 19 toiles (repli + seed)
  supabase-schema.sql     Schéma de base prêt à exécuter
  GUIDE-LEA.md            Mode d'emploi simple pour Léa
```

**Stack :** front statique HTML / CSS / JavaScript vanilla (aucune étape de build),
client Supabase chargé via CDN. Déployable partout (Netlify, Vercel, Cloudflare
Pages, OVHcloud, etc.).

---

## Fonctionnement immédiat (mode démonstration)

Tel quel, sans aucune configuration, le site **fonctionne déjà** : il affiche les
19 toiles fournies (repli sur `images/` + `contenu-initial.json`). La galerie
n'est donc jamais vide pendant la mise en place. Le bouton PayPal est en mode
démonstration et le formulaire de contact ouvre la messagerie du visiteur.

Pour tester en local :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

(Un simple serveur statique est nécessaire car le site charge `config.js` et
`contenu-initial.json` ; l'ouverture directe du fichier `file://` ne suffit pas.)

---

## Mise en place complète (passage en production)

1. **Créer un projet Supabase** sur https://supabase.com.
2. **Exécuter `supabase-schema.sql`** dans l'éditeur SQL de Supabase
   (crée la table `paintings`, les tables `annonces`, `presse` et `site_content`,
   les règles de sécurité RLS, **et le bucket de stockage public `paintings`**).
3. **Créer l'utilisateur de Léa** dans *Authentication → Users* (e-mail + mot de passe).
5. **Remplir `assets/config.js`** à partir de `config.example.js` :
   - `SUPABASE_URL` et `SUPABASE_ANON_KEY` (*Project Settings → API*),
   - `CONTACT_FORM_ENDPOINT` (voir ci-dessous),
   - `PAYPAL_CLIENT_ID` (plus tard, quand Léa aura son compte PayPal Business),
   - `FACEBOOK_URL`, `DOMAIN`.
6. **Service e-mail du formulaire de contact** : créer un formulaire
   [Formspree](https://formspree.io) pointant vers `lksartpeinturekalck@gmail.com`
   et coller l'URL d'endpoint dans `CONTACT_FORM_ENDPOINT`. (EmailJS ou une Edge
   Function Supabase + Resend conviennent aussi.) Tant que ce champ est vide, le
   formulaire bascule sur l'ouverture de la messagerie du visiteur (`mailto`).
7. **Importer les 19 toiles** (facultatif) : ouvrir `outils-import.html`, se
   connecter, cliquer sur « Importer les 19 toiles ». L'opération est idempotente
   (les doublons sont ignorés). On peut aussi tout ajouter à la main depuis
   l'espace privé.
8. **Déployer** sur l'hébergeur choisi (glisser-déposer le dossier, ou connecter
   le dépôt Git).
9. **Enregistrer et brancher le domaine en `.fr`** au nom de Léa.
10. **Tester le parcours complet** (voir critères de validation ci-dessous).

> Sécurité : la clé `SUPABASE_ANON_KEY` est **publique par conception**. La
> protection repose sur les policies RLS : lecture publique de la galerie,
> écriture (ajout / modification / suppression) réservée à Léa une fois connectée.

---

## L'espace privé de Léa (`admin.html`)

Protégé par la connexion Supabase Auth (e-mail + mot de passe). Une fois
connectée, Léa peut, en quelques clics et sans aucun terme technique :

- **ajouter une peinture** (photo depuis téléphone/ordinateur, titre, catégorie,
  dimensions, technique, prix *optionnel*, description) ;
- **modifier** une œuvre (y compris remplacer l'image) ;
- **supprimer** une œuvre ;
- **marquer une œuvre comme vendue** ;
- **réordonner** les œuvres (flèches ▲ / ▼) ;
- gérer ses **annonces** et sa **revue de presse** ;
- **personnaliser le site** (onglet « Mon site ») : photo d'accueil, portrait,
  accroche, bio, médium/atelier/expo et coordonnées de contact.

Si le prix est laissé vide, **aucun prix n'est affiché** sur le site public.

> **Léa ne touche jamais à Supabase.** Tout se fait depuis `admin.html`. Quand
> elle clique sur « Enregistrer » / « Mettre à jour le site », le site écrit dans
> Supabase en arrière-plan et les visiteurs voient le changement **en direct**,
> sans actualisation manuelle. Toi (Tanguy) n'interviens dans Supabase qu'une
> seule fois, à la mise en place. Les textes/photos de personnalisation vivent
> dans la table `site_content` ; les valeurs de `config.js` ne servent que de
> contenu par défaut, remplacé dès que Léa édite depuis « Mon site ».

Voir `GUIDE-LEA.md` pour le mode d'emploi destiné à Léa.

---

## Paiement PayPal

Chaque fiche d'œuvre porte un bouton d'achat. Tant que `PAYPAL_CLIENT_ID` est
vide, le bouton est en **démonstration**. Dès que l'identifiant PayPal Business
de Léa est renseigné, le vrai bouton PayPal (SDK officiel) s'affiche et encaisse
au prix de la toile.

> La commission PayPal (~3 %) est prélevée par PayPal sur le compte de Léa ; ce
> n'est pas une commission du développeur.

---

## Protection des images

Filigrane discret « LKS ART » au survol, clic droit et glisser-déposer désactivés
sur les images, et clause de non-reproduction dans les mentions légales. (Note :
aucune protection « biométrique » de toile n'existe ; la vraie réponse au besoin
d'authenticité est le certificat d'authenticité à QR code, prévu en Phase 2.)

---

## Critères de validation — Phase 1

- [x] La galerie publique charge les œuvres depuis Supabase (avec repli si non configuré).
- [x] Léa peut se connecter, ajouter une toile avec photo, la voir apparaître sur le site.
- [x] Léa peut modifier, supprimer et marquer une toile comme vendue.
- [x] Le prix est optionnel ; une toile sans prix n'affiche aucun prix.
- [x] L'envoi du formulaire fait partir un e-mail vers la boîte de Léa (Formspree).
- [x] Le bouton PayPal s'affiche sur chaque fiche, prêt à recevoir l'identifiant.
- [x] Le site est entièrement responsive (propre sur téléphone).
- [x] Mentions légales et conformité RGPD présentes.
- [ ] Le site est déployé et accessible sur le domaine *(étape d'hébergement).*

---

## Phase 2 (non incluse, sur devis)

Certificat d'authenticité à QR code · commande de peinture sur mesure à partir
d'une photo (devis/facture) · boutique éphémère avec récompenses.
