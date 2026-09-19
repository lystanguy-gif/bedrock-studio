-- LKS ART — Durcissement des droits d'ecriture
-- ---------------------------------------------------------------------------
-- A EXECUTER APRES avoir desactive l'inscription libre dans Supabase
-- (Authentication > Sign In / Providers > Email > "Allow new users to sign up").
--
-- Probleme corrige
-- Les policies actuelles autorisent l'ecriture a TOUT utilisateur connecte
-- ("to authenticated using (true)"). Or l'inscription libre etant ouverte,
-- n'importe qui pouvait creer un compte, donc obtenir ces droits : ajout,
-- modification et suppression des oeuvres, des annonces, de la presse et des
-- textes du site, ainsi que l'envoi de fichiers dans le stockage.
--
-- Principe retenu
-- L'ecriture est reservee au compte de Lea, identifie par son UID. Meme si un
-- autre compte venait a exister, il ne pourrait rien modifier. La lecture
-- publique de la galerie reste inchangee.
--
-- Si l'UID change un jour (compte recree), remplacer la valeur ci-dessous et
-- reexecuter ce fichier ; il est concu pour etre rejoue sans erreur.
-- ---------------------------------------------------------------------------

create or replace function public.est_lartiste()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() = '0c65d350-f9db-447f-87fe-d1006e13a45c'::uuid;
$$;

-- Oeuvres
drop policy if exists "Ajout reserve aux connectes" on public.paintings;
create policy "Ajout reserve a l'artiste" on public.paintings
  for insert to authenticated with check (public.est_lartiste());

drop policy if exists "Modification reservee aux connectes" on public.paintings;
create policy "Modification reservee a l'artiste" on public.paintings
  for update to authenticated using (public.est_lartiste()) with check (public.est_lartiste());

drop policy if exists "Suppression reservee aux connectes" on public.paintings;
create policy "Suppression reservee a l'artiste" on public.paintings
  for delete to authenticated using (public.est_lartiste());

-- Annonces
drop policy if exists "Ecriture annonces connectes" on public.annonces;
create policy "Ecriture annonces artiste" on public.annonces
  for all to authenticated using (public.est_lartiste()) with check (public.est_lartiste());

-- Presse
drop policy if exists "Ecriture presse connectes" on public.presse;
create policy "Ecriture presse artiste" on public.presse
  for all to authenticated using (public.est_lartiste()) with check (public.est_lartiste());

-- Contenu editable du site
drop policy if exists "Ecriture contenu connectes" on public.site_content;
create policy "Ecriture contenu artiste" on public.site_content
  for all to authenticated using (public.est_lartiste()) with check (public.est_lartiste());

-- Stockage des images
drop policy if exists "Upload images reserve aux connectes" on storage.objects;
create policy "Upload images reserve a l'artiste" on storage.objects
  for insert to authenticated with check ( bucket_id = 'paintings' and public.est_lartiste() );

drop policy if exists "Maj images reservee aux connectes" on storage.objects;
create policy "Maj images reservee a l'artiste" on storage.objects
  for update to authenticated using ( bucket_id = 'paintings' and public.est_lartiste() );

drop policy if exists "Suppression images reservee aux connectes" on storage.objects;
create policy "Suppression images reservee a l'artiste" on storage.objects
  for delete to authenticated using ( bucket_id = 'paintings' and public.est_lartiste() );

notify pgrst, 'reload schema';

-- Verification attendue apres execution : connecte en tant que Lea, l'espace
-- prive doit continuer a fonctionner normalement (ajout, modification,
-- suppression, envoi d'image). Tout autre compte doit se voir refuser
-- l'ecriture.
