# Nexus Platform Backend Blueprint

This workspace now includes a backend foundation for a monetization-ready multi-platform ecosystem.

## Included
- Express API server: server.js
- Supabase schema: supabase-schema.sql
- environment template: .env.example
- app monetization hooks in the browser UI

## Start the backend

1. Install dependencies:
   npm install
2. Copy env template:
   copy .env.example .env
3. Start the server:
   npm run server

## Default API routes

- GET /health
- GET /api/metrics
- POST /api/telemetry/earnings
- POST /api/config/master-wallet
- POST /api/telegram/alert
- GET /api/supabase/status

## Production architecture

- Web app: Vercel or Netlify
- Backend API: Render or Railway
- Database + auth: Supabase
- Telegram bot integration: Bot API + webhook or polling
- USDT payout: payment processor or trusted wallet provider

## Important
This backend is a production-ready foundation and not a complete live payout service. You still need to connect real provider credentials, Supabase project URL/key, and your actual payout wallet provider before running live earnings and real payouts.
