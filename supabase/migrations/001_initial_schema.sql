-- ============================================================
-- Begin Now — Migration 001 : Schéma initial
-- ============================================================

-- Extension UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (extension de auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  email       text not null,
  avatar_url  text,
  total_points int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- RLS : lecture publique des profils (pour la recherche d'amis)
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- RLS : update uniquement son propre profil
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ============================================================
-- OBJECTIVE_TEMPLATES (objectifs prédéfinis)
-- ============================================================
create table if not exists public.objective_templates (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  icon         text not null,
  type         text not null check (type in ('binary', 'quantifiable')),
  unit         text,
  positive_goal bool not null default true,
  description  text,
  created_at   timestamptz not null default now()
);

alter table public.objective_templates enable row level security;

create policy "Templates are viewable by all authenticated users"
  on public.objective_templates for select
  to authenticated
  using (true);

-- ============================================================
-- OBJECTIVES (objectifs des users)
-- ============================================================
create table if not exists public.objectives (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  template_id    uuid references public.objective_templates(id),
  title          text not null,
  type           text not null check (type in ('binary', 'quantifiable')),
  unit           text,
  target_value   int,
  positive_goal  bool not null default true,
  start_date     date,
  end_date       date,
  is_active      bool not null default true,
  is_public      bool not null default true,
  color          text not null default '#2D5BE3',
  icon           text not null default '⭐',
  created_at     timestamptz not null default now()
);

alter table public.objectives enable row level security;

create policy "Users can view own objectives"
  on public.objectives for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own objectives"
  on public.objectives for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own objectives"
  on public.objectives for update
  to authenticated
  using (auth.uid() = user_id);

create index idx_objectives_user_id on public.objectives(user_id);
create index idx_objectives_active on public.objectives(user_id, is_active);

-- ============================================================
-- DAILY_LOGS
-- ============================================================
create table if not exists public.daily_logs (
  id            uuid primary key default gen_random_uuid(),
  objective_id  uuid not null references public.objectives(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  log_date      date not null,
  status        text not null check (status in ('done', 'failed', 'skipped')),
  value         int,
  note          text,
  created_at    timestamptz not null default now(),
  unique (objective_id, log_date)
);

alter table public.daily_logs enable row level security;

create policy "Users can manage own logs"
  on public.daily_logs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_logs_user_date on public.daily_logs(user_id, log_date);
create index idx_logs_objective on public.daily_logs(objective_id);

-- ============================================================
-- STREAKS
-- ============================================================
create table if not exists public.streaks (
  id              uuid primary key default gen_random_uuid(),
  objective_id    uuid not null references public.objectives(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  current_streak  int not null default 0,
  longest_streak  int not null default 0,
  last_log_date   date,
  unique (objective_id)
);

alter table public.streaks enable row level security;

create policy "Users can view own streaks"
  on public.streaks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own streaks"
  on public.streaks for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own streaks"
  on public.streaks for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================
-- BADGES
-- ============================================================
create table if not exists public.badges (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  description      text not null,
  icon             text not null,
  condition_type   text not null check (condition_type in ('streak_days', 'total_done', 'perfect_week')),
  condition_value  int,
  created_at       timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy "Badges are viewable by all"
  on public.badges for select
  to authenticated
  using (true);

-- ============================================================
-- USER_BADGES (badges gagnés)
-- ============================================================
create table if not exists public.user_badges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  objective_id  uuid not null references public.objectives(id) on delete cascade,
  badge_id      uuid not null references public.badges(id),
  earned_at     timestamptz not null default now(),
  unique (user_id, objective_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "Users can view own badges"
  on public.user_badges for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Backend can insert badges"
  on public.user_badges for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "Users can see their own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "Addressee can update friendship status"
  on public.friendships for update
  to authenticated
  using (auth.uid() = addressee_id);

create index idx_friendships_requester on public.friendships(requester_id);
create index idx_friendships_addressee on public.friendships(addressee_id);
