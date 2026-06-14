-- Migration « Amis » — demandes + acceptation
-- À coller dans Supabase : SQL Editor > New query > coller > Run.
-- Tant que cette table n'existe pas, l'appli fonctionne (les boutons « ami »
-- afficheront juste « bientôt disponible »).

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- 'pending' (demande) | 'accepted' (amis)
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

-- Je ne vois que les liens qui me concernent.
drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- J'envoie une demande (je suis le demandeur).
drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships for insert
  with check (auth.uid() = requester_id);

-- J'accepte une demande qui m'est adressée (je suis le destinataire).
drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships for update
  using (auth.uid() = addressee_id);

-- Je retire un ami ou je refuse une demande (l'un ou l'autre des deux).
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
