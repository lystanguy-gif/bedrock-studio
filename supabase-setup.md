# Réglages en ligne + réception automatique — mise en place (gratuit, ~10 min, une seule fois)

Objectif : l'équipage modifie **horaires, dates et prix** depuis la console (onglet **Réglages**),
et le **site les affiche automatiquement** — sans jamais toucher au code. En prime, les réservations
du site arrivent **toutes seules** dans la console (plus de copier-coller).

Tout passe par **Supabase** (offre gratuite, largement suffisante). L'équipage n'utilise **que la console** ;
personne n'a besoin d'aller sur Supabase au quotidien.

> Tant que les clés ne sont pas renseignées, le site et la console fonctionnent comme avant (mode démo). Rien ne casse.

---

## 1. Créer le projet Supabase
1. Aller sur <https://supabase.com> → **Start your project** → créer un compte gratuit.
2. **New project** : nom « la-carline », mot de passe de base de données (à garder), région **Europe (Paris/Frankfurt)**.
3. Attendre ~1 min que le projet soit prêt.

## 2. Créer les tables (copier-coller)
Menu de gauche **SQL Editor** → **New query** → coller ceci → **Run** :

```sql
-- Réglages du site (une seule ligne)
create table if not exists public.settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb
);
insert into public.settings (id, data) values (1,
  '{"horaires":["10h00","14h30","16h30"],
    "saison":"De mi-juin à mi-septembre, tous les jours. Au printemps et à l''automne, sur réservation.",
    "prix":{"adulte":"14,50 €","enfant":"10 €","capitaine":"40 €"}}')
on conflict (id) do nothing;

alter table public.settings enable row level security;
create policy "lecture publique des réglages" on public.settings for select using (true);
create policy "modification par staff connecté" on public.settings for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Réservations reçues depuis le site
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  nom text, telephone text, email text, personnes int,
  date text, depart text, message text, statut text default 'nouveau'
);
alter table public.reservations enable row level security;
create policy "création publique (formulaire du site)" on public.reservations for insert with check (true);
create policy "lecture par staff connecté" on public.reservations for select using (auth.role() = 'authenticated');
create policy "mise à jour par staff connecté" on public.reservations for update using (auth.role() = 'authenticated');
```

## 3. Créer le compte équipage (pour la console)
Menu **Authentication** → **Users** → **Add user** → **Create new user** :
- e-mail (ex. `equipage@lacarline.fr`) + un mot de passe.
- (Décocher « Send invite » si proposé ; on veut juste un identifiant.)

C'est ce couple e-mail / mot de passe que l'équipage saisira dans la console (onglet Réglages → Se connecter).

## 4. Récupérer les 2 clés
Menu **Project Settings** (roue dentée) → **API** :
- **Project URL** → c'est `SB_URL` (ex. `https://abcd1234.supabase.co`)
- **Project API keys → `anon` `public`** → c'est `SB_KEY`

## 5. Coller les clés (à 2 endroits identiques)
Dans **`index.html`** et **`admin.html`**, repérer en haut du script :
```js
const SB_URL = "";
const SB_KEY = "";
```
et coller vos valeurs entre les guillemets, par exemple :
```js
const SB_URL = "https://abcd1234.supabase.co";
const SB_KEY = "eyJhbGciOi...";  // la clé anon (publique)
```
(Si vous utilisez le fichier unique `carline.html`, je le régénère après avoir mis les clés.)

---

## Utilisation au quotidien (équipage)
- **Modifier horaires / dates / prix** : Console → menu **⋯** → **Réglages du site** → se connecter (la 1ʳᵉ fois) → modifier → **Enregistrer**. Le site est à jour aussitôt.
- **Recevoir les réservations** : Console → menu **⋯** → **Recevoir les réservations en ligne**. Les nouvelles demandes apparaissent dans la liste.

## Sécurité
- La clé `anon` est **publique** (normal) : avec les règles ci-dessus, le public peut seulement **lire les réglages** et **déposer une réservation**. Lire les réservations et **modifier les prix** exige la **connexion équipage**.
- Aucune donnée bancaire ici (le paiement reste chez Stripe). Conforme RGPD : données limitées à la réservation.
