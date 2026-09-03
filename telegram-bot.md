# Telegram Bot Integration Plan

Use a Telegram bot for master alerts, airdrop notifications, and payout events.

## Required environment values
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID

## Example flow
1. User clicks the airdrop button in the app.
2. Frontend sends a request to /api/airdrop/claim.
3. Backend stores the event in ledger memory or a database.
4. Backend sends a Telegram alert to the configured chat.
5. Master wallet receives payout or queue is created for settlement.

## Webhook route
- POST /api/telegram/webhook

## Bot operations
- Send wallet alerts
- Send airdrop confirmations
- Send payouts and failure notices
