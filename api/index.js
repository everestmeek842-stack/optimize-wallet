// Vercel serverless entry point. The Express app is imported (not started) so
// every /api/* request is handled by this function with the same routes,
// authentication, Supabase persistence, Gemini drafting, and Telegram alerts
// as the local/Render server. Static pages are served by the Vercel CDN.
const app = require('../server');

module.exports = app;