-- ============================================================
-- Begin Now — Migration 003 : Duel Logs
-- ============================================================

create table if not exists public.duel_logs (
  id          uuid primary key default gen_random_uuid(),
  duel_id     uuid not null references public.duels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  log_date    date not null,
  status      text not null check (status in ('done', 'skipped')),
  created_at  timestamptz not null default now(),
  unique (duel_id, user_id, log_date)
);

alter table public.duel_logs enable row level security;

create policy "Duel participants can view logs"
  on public.duel_logs for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.duels d
      where d.id = duel_id
        and (d.challenger_id = auth.uid() or d.challenged_id = auth.uid())
    )
  );

create policy "Users can insert own duel logs"
  on public.duel_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own duel logs"
  on public.duel_logs for update
  to authenticated
  using (auth.uid() = user_id);

create index idx_duel_logs_duel on public.duel_logs(duel_id);
create index idx_duel_logs_user on public.duel_logs(user_id, log_date);
