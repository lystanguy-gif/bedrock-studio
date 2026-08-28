-- LKS ART — Schema Supabase
-- A executer dans l'editeur SQL du projet Supabase.
-- Ce script est "idempotent" : on peut le relancer sans erreur, il remet
-- simplement les tables et les regles d'acces dans l'etat attendu.

-- 0. Droits d'acces sur le schema public.
-- Les policies RLS decrivent QUI a le droit de faire QUOI, mais Postgres exige
-- en plus un GRANT sur la table elle-meme. Sans ces lignes, l'API renvoie
-- "permission denied for table paintings" meme connecte. Les GRANT sont places
-- en fin de fichier (apres la creation des tables) : voir section 9.

-- 1. Table des oeuvres
create table if not exists public.paintings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  sort_order  int not null default 0,
  title       text not null,
  description text default '',
  category    text not null default 'paysages',
  dimensions  text default '',
  medium      text default 'Huile sur toile',
  price       numeric,            -- peut etre NULL, alors aucun prix affiche
  image_url   text,
  sold        boolean not null default false,
  availability text not null default 'sale'  -- 'sale' | 'request' | 'exhibition'
);

-- 2. Activer la securite au niveau des lignes
alter table public.paintings enable row level security;

-- 3. Lecture publique (les visiteurs voient la galerie)
drop policy if exists "Lecture publique des oeuvres" on public.paintings;
create policy "Lecture publique des oeuvres"
  on public.paintings
  for select
  using (true);

-- 4. Ecriture reservee aux utilisateurs connectes (Lea uniquement)
drop policy if exists "Ajout reserve aux connectes" on public.paintings;
create policy "Ajout reserve aux connectes"
  on public.paintings
  for insert
  to authenticated
  with check (true);

drop policy if exists "Modification reservee aux connectes" on public.paintings;
create policy "Modification reservee aux connectes"
  on public.paintings
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Suppression reservee aux connectes" on public.paintings;
create policy "Suppression reservee aux connectes"
  on public.paintings
  for delete
  to authenticated
  using (true);

-- 5. Stockage des images
-- Le bucket public "paintings" est cree automatiquement ci-dessous
-- (plus besoin de le creer a la main dans l'interface).
insert into storage.buckets (id, name, public)
values ('paintings', 'paintings', true)
on conflict (id) do update set public = true;

-- Regles d'acces aux images.
-- Remarque : si ces quatre blocs renvoient une erreur du type
-- "must be owner of table objects", ce n'est pas bloquant : le bucket est
-- public, donc l'affichage fonctionne. Les droits d'envoi peuvent alors etre
-- ajoutes depuis l'interface Supabase (Storage > paintings > Policies).
drop policy if exists "Lecture publique des images" on storage.objects;
create policy "Lecture publique des images"
  on storage.objects
  for select
  using ( bucket_id = 'paintings' );

drop policy if exists "Upload images reserve aux connectes" on storage.objects;
create policy "Upload images reserve aux connectes"
  on storage.objects
  for insert
  to authenticated
  with check ( bucket_id = 'paintings' );

drop policy if exists "Maj images reservee aux connectes" on storage.objects;
create policy "Maj images reservee aux connectes"
  on storage.objects
  for update
  to authenticated
  using ( bucket_id = 'paintings' );

drop policy if exists "Suppression images reservee aux connectes" on storage.objects;
create policy "Suppression images reservee aux connectes"
  on storage.objects
  for delete
  to authenticated
  using ( bucket_id = 'paintings' );

-- 6. Optionnel, table des annonces
create table if not exists public.annonces (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  body        text default ''
);
alter table public.annonces enable row level security;
drop policy if exists "Lecture publique annonces" on public.annonces;
create policy "Lecture publique annonces" on public.annonces for select using (true);
drop policy if exists "Ecriture annonces connectes" on public.annonces;
create policy "Ecriture annonces connectes" on public.annonces for all to authenticated using (true) with check (true);

-- 7. Optionnel, table presse et medias
create table if not exists public.presse (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  media       text not null,     -- nom de la radio ou du media
  title       text default '',
  url         text default ''
);
alter table public.presse enable row level security;
drop policy if exists "Lecture publique presse" on public.presse;
create policy "Lecture publique presse" on public.presse for select using (true);
drop policy if exists "Ecriture presse connectes" on public.presse;
create policy "Ecriture presse connectes" on public.presse for all to authenticated using (true) with check (true);

-- 8. Contenu personnalisable du site (textes et images modifiables par Lea)
-- Table cle/valeur : chaque ligne est un reglage edite depuis l'espace prive.
-- Exemples de cles : hero_kicker, hero_sub, about_body, about_medium,
--   about_atelier, about_expose, contact_email, contact_hours,
--   facebook_url, hero_image, portrait_image.
create table if not exists public.site_content (
  key         text primary key,
  value       text default '',
  updated_at  timestamptz not null default now()
);
alter table public.site_content enable row level security;
drop policy if exists "Lecture publique du contenu" on public.site_content;
create policy "Lecture publique du contenu" on public.site_content for select using (true);
drop policy if exists "Ecriture contenu connectes" on public.site_content;
create policy "Ecriture contenu connectes" on public.site_content for all to authenticated using (true) with check (true);

-- 9. Droits d'acces (GRANT) sur les tables du schema public.
-- A executer APRES la creation des tables ci-dessus.
-- Les visiteurs anonymes ne peuvent que lire ; seul un utilisateur connecte
-- (Lea) peut ecrire. Les policies RLS restent la deuxieme barriere.
grant usage on schema public to anon, authenticated;

grant select on public.paintings, public.annonces, public.presse, public.site_content
  to anon, authenticated;

grant insert, update, delete on public.paintings, public.annonces, public.presse, public.site_content
  to authenticated;
