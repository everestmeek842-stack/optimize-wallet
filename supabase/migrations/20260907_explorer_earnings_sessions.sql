-- Explorer ecosystem persistence: earnings ledger, durable sessions, and a
-- user mirror so authentication works on ephemeral serverless hosts (Vercel).
-- Apply in the Supabase SQL editor alongside 20260906_wallet_persistence.sql.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- App users table for durable authentication on Vercel serverless hosts
create table if not exists public.app_users (
  id uuid primary key,
  email text not null unique,
  name text not null default 'User',
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  token_hash text primary key,
  user_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);

create table if not exists public.explorer_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  amount numeric(18, 6) not null check (amount >= 0),
  description text not null default 'Explorer activity',
  server text not null default 'default',
  source text not null default 'explorer-workspace',
  created_at timestamptz not null default now()
);
create index if not exists explorer_earnings_user_created_at_idx on public.explorer_earnings(user_id, created_at desc);

-- Do not expose payment records directly to browser clients. The Express API uses
-- SUPABASE_SERVICE_ROLE_KEY and authenticates its own sessions.
-- Enable row level security;
-- alter table public.app_users enable row level security;
-- alter table public.user_sessions enable row level security;
-- alter table public.explorer_earnings enable row level security;