-- Mount Street — core schema (Supabase / Postgres)
-- Apply in the Supabase SQL editor or via the CLI. App logic still enforces the
-- Tier-2-never-auto rule (see runner.ts); the DB stores state and the audit trail.

create extension if not exists "pgcrypto";

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz not null default now()
);

create table if not exists brand_profile (
  user_id     uuid primary key references users(id) on delete cascade,
  company     text,
  voice       text,
  logo_url    text,
  colors      jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists agent_configs (
  user_id     uuid not null references users(id) on delete cascade,
  agent_id    text not null,
  autonomy    text not null default 'ask_every_time'
              check (autonomy in ('draft_only','ask_every_time','auto_within_limits')),
  caps        jsonb not null default '{}'::jsonb,
  primary key (user_id, agent_id)
);

create table if not exists runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  agent_id    text not null,
  input       jsonb,
  draft       jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists pending_actions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  agent_id    text not null,
  risk_tier   int  not null check (risk_tier in (0,1,2)),
  draft       jsonb not null,
  summary     text not null,
  status      text not null default 'pending'
              check (status in ('pending','approved','rejected','executed','failed')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,            -- audit: when the human (or system) decided
  executed_at timestamptz,
  result      text
);

create index if not exists pending_actions_user_status_idx
  on pending_actions (user_id, status);

create table if not exists integrations (
  user_id     uuid not null references users(id) on delete cascade,
  provider    text not null,          -- 'gmail' | 'stripe' | ...
  access_token  text,
  refresh_token text,
  meta        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, provider)
);
