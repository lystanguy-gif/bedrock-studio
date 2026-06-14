-- Migration « Filtres de L'Agora » — colonne pays
-- À coller dans Supabase : SQL Editor > New query > coller > Run.
--
-- Sans cette colonne, l'appli fonctionne quand même : les débats n'auront
-- simplement pas de pays, et le filtre « par pays » de L'Agora restera vide.
-- (La colonne « theme » existe déjà dans ta base — rien à faire pour elle.)

alter table public.panels
  add column if not exists country text;
