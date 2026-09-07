// Vercel serverless entry point. The Express app is imported (not started) so
// every /api/* request is handled by this function with the same routes,
// authentication, Supabase persistence, Gemini drafting, and Telegram alerts
// as the local/Render server. Static pages are served by the Vercel CDN from
// the public/ folder.
let app;
let loadError = null;
try {
  app = require('../server');
} catch (e) {
  loadError = e;
  // Keep the function alive so /health can surface the exact load failure.
  app = null;
}

module.exports = (req, res) => {
  if (loadError) {
    res.status(500).json({
      ok: false,
      path: req.path,
      error: String(loadError && (loadError.stack || loadError.message || loadError)),
    });
    return;
  }
  return app(req, res);
};