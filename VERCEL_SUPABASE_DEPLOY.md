# Nexus Explorer — Vercel + Supabase Always-On Deployment Guide

This guide takes the workspace you already have and puts it on a **permanent URL**
using **Vercel** (hosting + serverless API) and **Supabase** (database). Nothing in
this project was deleted — this is an addition on top of the existing Render setup.

---

## What you already have (checklist)

| Piece | Where it lives | Status |
|---|---|---|
| Frontend (mail.com workspace, AI chat, wallet) | `explorer-workspace.html` + `explorer-workspace.js` | ✅ Ready |
| Backend API | `server.js` (Express) + `api/index.js` (Vercel entry) | ✅ Ready |
| Vercel config | `vercel.json` | ✅ Ready |
| Supabase schema | `supabase-schema.sql`, `supabase/migrations/*.sql` | ⚠️ You must run 2 SQL files |
| Secrets | `.env` (local) / Vercel dashboard (cloud) | ⚠️ You must add them in Vercel |

---

## Step 1 — Prepare the Supabase database (one time)

1. Open <https://supabase.com> → your project → **SQL Editor**.
2. Run these files in order (copy → paste → **Run**):
   1. `supabase-schema.sql` (root of this repo — profiles, wallets, ledgers, api_keys)
   2. `supabase/migrations/20260906_wallet_persistence.sql` (wallet bindings, claims, withdrawals)
   3. `supabase/migrations/20260907_explorer_earnings_sessions.sql` (earnings ledger + durable login sessions)
3. From **Project Settings → API** copy:
   - `Project URL` → this is `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Step 2 — Get the Gemini key (AI drafting)

1. Open <https://aistudio.google.com/apikey>.
2. Create an API key → this is `GEMINI_API_KEY`.
3. It is used **only on the server** (`server.js`). It is never placed in the browser.

## Step 3 — Get the Telegram bot credentials (funds visible in Telegram)

1. In Telegram, open **@BotFather** → `/newbot` → follow the steps → copy the token → `TELEGRAM_BOT_TOKEN`.
2. Send any message to your new bot, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy `"chat":{"id": ...}` → `TELEGRAM_CHAT_ID`.
3. Every earning is then pushed to that chat as a message with your live wallet balance —
   that is how the funds are visible inside your Telegram.

## Step 4 — Deploy to Vercel (always-on URL)

1. Push this folder to GitHub (`git push origin master`).
2. Go to <https://vercel.com> → **Add New… → Project** → import `optimize-wallet`.
3. Framework preset: **Other**. Leave build settings empty (zero-config).
4. Open **Environment Variables** and add (values from your `.env`):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | from Step 1 |
   | `SUPABASE_ANON_KEY` | from Step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Step 1 |
   | `GEMINI_API_KEY` | from Step 2 |
   | `TELEGRAM_BOT_TOKEN` | from Step 3 |
   | `TELEGRAM_CHAT_ID` | from Step 3 |
   | `SESSION_SECRET` | any long random string |
   | `ADMIN_API_KEY` | any long random string |
   | `MASTER_WALLET_ADDRESS` | your Solana treasury address |
   | `MASTER_WALLET_NETWORK` | `solana` |

5. Click **Deploy**. You get a permanent URL like `https://optimize-wallet.vercel.app`.

> Render keeps working too — both deployments share the same Supabase database.

## Step 5 — Verify everything is alive

| Check | Expected |
|---|---|
| `https://YOUR-URL/health` | `{"ok":true,...,"supabaseConnected":true}` |
| `https://YOUR-URL/api/supabase/status` | `{"ok":true,"configured":true,...}` |
| `https://YOUR-URL/api/explorer/ai/status` | `{"ok":true,"configured":true,...}` |
| `https://YOUR-URL/explorer` | The Nexus Explorer workspace opens |
| Wallet tab → Save binding | "Wallet binding saved" toast |
| Send an email | Toast + earning appears in wallet + Telegram message |

## Step 6 — Start using it (daily flow)

1. Open `https://YOUR-URL/login` → **Register** (email + password ≥ 8 chars).
2. Open **/explorer** → **Wallet & Funds** tab → paste your **Solana address** and
   **USDT (TRC20 or SPL)** address → **Save Wallet Binding**.
3. Use **mail.com Interface**: ask the AI to prepare text → **✍️ Insert into email** → **Send Email**.
4. Every action earns money: it is stored in Supabase, added to your wallet balance,
   and announced in your Telegram chat.
5. **Access your funds**: Wallet tab → request a **withdrawal** or **claim** —
   requests are recorded for your review in `withdrawal_requests` / `airdrop_claims`.

---

## Notes & honest limits

- Payouts are **request-based**: the ledger records the request; actual on-chain
  settlement needs a verified payout provider (see `PAYOUT_*` in `.env.example`).
- The Telegram balance is a **live mirror** of your bound-wallet balance — it is not
  the custodial @wallet mini-app; it is your bot talking to your chat.
- Never paste `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or `TELEGRAM_BOT_TOKEN`
  into the browser or into any frontend file.
