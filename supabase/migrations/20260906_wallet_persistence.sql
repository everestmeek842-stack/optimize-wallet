-- Apply in the Supabase SQL editor before enabling wallet persistence.
-- The application owns user IDs, so user_id is UUID rather than a foreign key to auth.users.
-- Compatible with Supabase PostgreSQL 15+ and Vercel serverless functions.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main wallet bindings table
CREATE TABLE IF NOT EXISTS public.wallet_bindings (
  user_id uuid PRIMARY KEY,
  solana_address text NOT NULL,
  usdt_address text NOT NULL,
  usdt_network text NOT NULL CHECK (usdt_network IN ('TRC20', 'SPL')),
  available_balance_usd numeric(18, 6) NOT NULL DEFAULT 0 CHECK (available_balance_usd >= 0),
  pending_balance_usd numeric(18, 6) NOT NULL DEFAULT 0 CHECK (pending_balance_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Airdrop claims table
CREATE TABLE IF NOT EXISTS public.airdrop_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.wallet_bindings(user_id) ON DELETE CASCADE,
  amount_usd numeric(18, 6) NOT NULL CHECK (amount_usd BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'paid')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  transaction_hash text UNIQUE
);

CREATE INDEX IF NOT EXISTS airdrop_claims_user_claimed_at_idx ON public.airdrop_claims(user_id, claimed_at DESC);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.wallet_bindings(user_id) ON DELETE CASCADE,
  asset text NOT NULL CHECK (asset IN ('SOL', 'USDT')),
  amount numeric(30, 9) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  transaction_hash text UNIQUE
);

CREATE INDEX IF NOT EXISTS withdrawal_requests_user_created_at_idx ON public.withdrawal_requests(user_id, created_at DESC);

-- Auto-update trigger for updated_at column on wallet_bindings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_wallet_bindings_updated_at
  BEFORE UPDATE ON public.wallet_bindings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Do not expose payment records directly to browser clients. The Express API uses
-- SUPABASE_SERVICE_ROLE_KEY and authenticates its own sessions.
-- Row Level Security - commented out for initial setup, enable when ready
-- ALTER TABLE public.wallet_bindings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.airdrop_claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
