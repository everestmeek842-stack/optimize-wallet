-- Supabase schema for multi-platform monetization system
-- Create tables for users, wallets, subscriptions, payouts, analytics and ad events.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_id text unique,
  telegram_username text,
  email text,
  full_name text,
  master_wallet text,
  role text default 'member',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  network text not null default 'solana',
  address text not null,
  label text,
  is_master boolean default false,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  plan text not null,
  status text not null default 'active',
  amount numeric(12,2) not null default 0,
  start_date timestamptz default now(),
  end_date timestamptz
);

create table if not exists earnings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  source text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  wallet_address text not null,
  network text not null default 'solana',
  amount numeric(12,2) not null,
  status text not null default 'pending',
  tx_hash text,
  created_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  event_name text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb default '{}',
  updated_at timestamptz default now()
);

create index if not exists profiles_telegram_id_idx on profiles(telegram_id);
create index if not exists earnings_profile_id_idx on earnings(profile_id);
create index if not exists payouts_profile_id_idx on payouts(profile_id);
