-- Migration « Moteur de trophées » (Phase 5)
-- À coller dans Supabase : menu « SQL Editor » > New query > coller > Run.
-- Le code de l'appli fonctionne même sans cette migration (les trophées ne
-- s'afficheront simplement pas sur les profils publics tant qu'elle n'est pas faite).

-- 1) Trophées visibles sur la fiche profil publique de chaque membre.
alter table public.profiles
  add column if not exists trophies jsonb not null default '[]'::jsonb;

-- 2) Thème du débat (catégorie). Sert aux trophées de thème (Politique, Sciences…)
--    et, plus tard, aux filtres de L'Agora.
alter table public.panels
  add column if not exists theme text;

-- 3) IMPORTANT — seulement SI tu avais créé une contrainte limitant les valeurs
--    de messages.kind (par ex. à 'transcript' et 'comment'). Le vote de fin de
--    débat ajoute deux types de messages : 'vote' et 'phase'.
--    Si tu n'as PAS de contrainte CHECK sur "kind", ignore ce bloc (rien à faire).
--
-- Pour vérifier si une contrainte existe :
--   select conname from pg_constraint
--   where conrelid = 'public.messages'::regclass and contype = 'c';
--
-- Si une contrainte du genre "messages_kind_check" existe, remplace-la ainsi
-- (adapte le nom si besoin) :
--   alter table public.messages drop constraint messages_kind_check;
--   alter table public.messages add constraint messages_kind_check
--     check (kind in ('transcript','comment','vote','phase'));
