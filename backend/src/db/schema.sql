-- ============================================================
--  Team Task Manager - Database Schema (Supabase / PostgreSQL)
--  Run this in the Supabase SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- USERS ----------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  email         text        not null unique,
  password_hash text        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists users_email_lower_idx on public.users (lower(email));

-- ---------- TEAMS ----------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  owner_id    uuid        not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists teams_owner_idx on public.teams (owner_id);

-- ---------- TEAM MEMBERS (many-to-many) ----------
create table if not exists public.team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid        not null references public.teams(id) on delete cascade,
  user_id   uuid        not null references public.users(id) on delete cascade,
  role      text        not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);
create index if not exists team_members_team_idx on public.team_members (team_id);
create index if not exists team_members_user_idx on public.team_members (user_id);

-- ---------- TASKS ----------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid        not null references public.teams(id) on delete cascade,
  title       text        not null,
  description text,
  status      text        not null default 'todo'
                          check (status in ('todo', 'in_progress', 'done')),
  priority    text        not null default 'medium'
                          check (priority in ('low', 'medium', 'high')),
  assignee_id uuid        references public.users(id) on delete set null,
  created_by  uuid        not null references public.users(id) on delete cascade,
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_team_idx     on public.tasks (team_id);
create index if not exists tasks_assignee_idx on public.tasks (assignee_id);
create index if not exists tasks_status_idx   on public.tasks (status);
create index if not exists tasks_title_idx    on public.tasks (lower(title));

-- ---------- SESSIONS (connect-pg-simple) ----------
create table if not exists public.session (
  sid    varchar primary key,
  sess   json    not null,
  expire timestamp(6) not null
);
create index if not exists session_expire_idx on public.session (expire);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================================
--  OPTIONAL HARDENING
--  The API talks to Postgres with the service-role key, which
--  bypasses RLS. If you ever query Supabase directly from the
--  browser with the anon key, enable RLS and add policies:
--
--  alter table public.tasks enable row level security;
--  create policy "members read tasks" on public.tasks for select
--    using (exists (
--      select 1 from public.team_members tm
--      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
--    ));
-- ============================================================
