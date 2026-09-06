-- Apply in the Supabase SQL editor before enabling wallet persistence.
-- The application owns user IDs, so user_id is UUID rather than a foreign key to auth.users.
create table if not exists public.wallet_bindings (
  user_id uuid primary key,
  solana_address text not null,
  usdt_address text not null,
  usdt_network text not null check (usdt_network in ('TRC20', 'SPL')),
  available_balance_usd numeric(18, 6) not null default 0 check (available_balance_usd >= 0),
  pending_balance_usd numeric(18, 6) not null default 0 check (pending_balance_usd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.airdrop_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wallet_bindings(user_id) on delete cascade,
  amount_usd numeric(18, 6) not null check (amount_usd between 1 and 5),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'paid')),
  claimed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  transaction_hash text unique
);
create index if not exists airdrop_claims_user_claimed_at_idx on public.airdrop_claims(user_id, claimed_at desc);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wallet_bindings(user_id) on delete restrict,
  asset text not null check (asset in ('SOL', 'USDT')),
  amount numeric(30, 9) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'paid')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  transaction_hash text unique
);
create index if not exists withdrawal_requests_user_created_at_idx on public.withdrawal_requests(user_id, created_at desc);

-- Do not expose payment records directly to browser clients. The Express API uses
-- SUPABASE_SERVICE_ROLE_KEY and authenticates its own sessions.
alter table public.wallet_bindings enable row level security;
alter table public.airdrop_claims enable row level security;
alter table public.withdrawal_requests enable row level security;
