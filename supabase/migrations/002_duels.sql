-- ============================================================
-- Begin Now — Migration 002 : Duels / Défis
-- ============================================================

create table if not exists public.duels (
  id              uuid primary key default gen_random_uuid(),
  challenger_id   uuid not null references public.profiles(id) on delete cascade,
  challenged_id   uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  description     text,
  icon            text not null default '⚔️',
  start_date      date,
  end_date        date,
  status          text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'active', 'completed')),
  created_at      timestamptz not null default now()
);

alter table public.duels enable row level security;

create policy "Users can view their own duels"
  on public.duels for select
  to authenticated
  using (auth.uid() = challenger_id or auth.uid() = challenged_id);

create policy "Users can create duels"
  on public.duels for insert
  to authenticated
  with check (auth.uid() = challenger_id);

create policy "Challenged user can update duel status"
  on public.duels for update
  to authenticated
  using (auth.uid() = challenged_id or auth.uid() = challenger_id);

create index idx_duels_challenger on public.duels(challenger_id);
create index idx_duels_challenged on public.duels(challenged_id);
