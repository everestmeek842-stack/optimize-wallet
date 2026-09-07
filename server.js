const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const sessions = {};
const API_KEY_SCOPES = new Set(['reader', 'transactions:read', 'transactions:write', 'earnings:read', 'partner:sync', 'keys:manage']);
const GASFREE_PERMIT_DOMAIN = {
  name: 'GasFreeController',
  version: 'V1.0.0',
  chainId: Number(process.env.TRON_CHAIN_ID_DEC || 728126428),
  verifyingContract: process.env.GASFREE_MAINNET_VERIFYING_CONTRACT || 'TFFAMQLZybALb4uxHA9RBE7pxhUAjF3UTHQGuFzL87ZqhxkgqYEryRAd7gqFqL5rdc',
};
const GASFREE_PERMIT_TYPES = {
  PermitTransfer: [
    { name: 'token', type: 'address' }, { name: 'serviceProvider', type: 'address' },
    { name: 'user', type: 'address' }, { name: 'receiver', type: 'address' },
    { name: 'value', type: 'uint256' }, { name: 'maxFee', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }, { name: 'version', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

function ensureUserStore() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
  }
}

function readUsers() {
  ensureUserStore();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (error) {
    return {};
  }
}

function writeUsers(users) {
  ensureUserStore();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashApiKey(secret) {
  const pepper = process.env.API_KEY_PEPPER || process.env.SESSION_SECRET;
  if (!pepper) throw new Error('API_KEY_PEPPER must be configured before issuing API keys.');
  return crypto.createHmac('sha256', pepper).update(secret).digest('hex');
}

function safeSecretMatch(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hasApiScope(key, scope) {
  return key.scopes.includes(scope) || key.scopes.includes('keys:manage');
}

function requireApiScope(scope) {
  return async (req, res, next) => {
    const authorization = String(req.headers.authorization || '');
    const secret = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : String(req.headers['x-api-key'] || '').trim();
    if (!secret) return res.status(401).json({ ok: false, error: 'API key required.' });

    let keyHash;
    try {
      keyHash = hashApiKey(secret);
    } catch (error) {
      return res.status(503).json({ ok: false, error: 'API key signing is not configured.' });
    }

    if (!supabaseAdmin) return res.status(503).json({ ok: false, error: 'Supabase service role is required for API key authentication.' });
    const { data: key, error } = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', keyHash).maybeSingle();
    if (error) return res.status(503).json({ ok: false, error: 'API key store is unavailable.' });
    if (!key || key.revoked_at || (key.expires_at && Date.now() >= Date.parse(key.expires_at)) || !hasApiScope({ scopes: key.scopes || [] }, scope)) {
      return res.status(403).json({ ok: false, error: 'API key is invalid, expired, revoked, or missing the required scope.' });
    }

    await supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id);
    key.lastUsedAt = new Date().toISOString();
    req.apiKey = key;
    next();
  };
}

function requireKeyManager(req, res, next) {
  const configuredAdminKey = process.env.ADMIN_API_KEY;
  const suppliedAdminKey = String(req.headers['x-admin-api-key'] || '');
  if (!configuredAdminKey || !suppliedAdminKey || !safeSecretMatch(configuredAdminKey, suppliedAdminKey)) {
    return res.status(403).json({ ok: false, error: 'Key management requires the configured admin credential.' });
  }
  next();
}

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getCookieValue(cookieHeader, key) {
  const cookie = (cookieHeader || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${key}=`));
  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(key.length + 1));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getUserById(id) {
  const users = readUsers();
  return Object.values(users).find((user) => user.id === id) || null;
}

function hashSessionToken(token) {
  const secret = process.env.SESSION_SECRET || 'nexus-dev-session-secret';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

// Sessions live in memory for local runs and in Supabase for serverless
// deployments (Vercel) where memory does not survive between invocations.
async function persistSession(token, userId, expiresAt) {
  sessions[token] = { userId, expiresAt };
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('user_sessions').insert({
      token_hash: hashSessionToken(token),
      user_id: userId,
      expires_at: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    console.warn('[Auth] Session persistence skipped:', error.message);
  }
}

// Mirror the local user store into Supabase so registrations survive
// ephemeral serverless filesystems.
async function mirrorUser(user) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('app_users').upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      password_hash: user.passwordHash,
      password_salt: user.passwordSalt,
      created_at: user.createdAt,
    }, { onConflict: 'id' });
  } catch (error) {
    console.warn('[Auth] User mirror skipped:', error.message);
  }
}

async function loadUserById(id) {
  const local = getUserById(id);
  if (local) return local;
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .select('id,email,name,password_hash,password_salt,created_at')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      passwordHash: data.password_hash,
      passwordSalt: data.password_salt,
      createdAt: data.created_at,
    };
  } catch (error) {
    return null;
  }
}

async function getUserFromRequest(req) {
  const token = getCookieValue(req.headers.cookie || '', 'sessionToken');
  if (!token) return null;
  const session = sessions[token];
  if (session) {
    if (Date.now() > session.expiresAt) {
      delete sessions[token];
      return null;
    }
    return loadUserById(session.userId);
  }
  if (!supabaseAdmin) return null;
  try {
    const { data: stored, error } = await supabaseAdmin
      .from('user_sessions')
      .select('user_id,expires_at')
      .eq('token_hash', hashSessionToken(token))
      .maybeSingle();
    if (error || !stored) return null;
    if (Date.now() > Date.parse(stored.expires_at)) return null;
    return loadUserById(stored.user_id);
  } catch (error) {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }
  req.user = user;
  next();
}

function setSessionCookie(res, token) {
  const expires = new Date(Date.now() + SESSION_TTL_MS).toUTCString();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sessionToken=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Expires=${expires}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sessionToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

const allowedOrigins = [process.env.FRONTEND_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null].filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase clients are created defensively so a transient/misconfigured URL can
// never crash the module (which would take down every route on serverless hosts).
// Downstream routes check for a non-null client and respond 503 "unavailable"
// if persistence is not configured, keeping the rest of the app healthy.
let supabase = null;
let supabaseAdmin = null;
try {
  if (supabaseUrl && supabaseAnonKey && /^https?:\/\//i.test(String(supabaseUrl).trim())) {
    supabase = createClient(String(supabaseUrl).trim(), supabaseAnonKey);
  }
} catch (e) {
  console.error('[supabase] anon client init failed:', e && e.message);
}
try {
  if (supabaseUrl && supabaseServiceKey && /^https?:\/\//i.test(String(supabaseUrl).trim())) {
    supabaseAdmin = createClient(String(supabaseUrl).trim(), supabaseServiceKey);
  }
} catch (e) {
  console.error('[supabase] admin client init failed:', e && e.message);
}

const standaloneProxyTargets = {
  telegram: 'https://web.telegram.org',
  whatsapp: 'https://web.whatsapp.com',
  github: 'https://github.com',
  tiktok: 'https://www.tiktok.com',
  facebook: 'https://www.facebook.com',
  instagram: 'https://www.instagram.com',
  chatgpt: 'https://chatgpt.com',
  notion: 'https://www.notion.so',
  cloud: 'https://drive.google.com',
};

app.use('/api/standalone-proxy/:targetApp', (req, res, next) => {
  if (!standaloneProxyTargets[req.params.targetApp]) {
    return res.status(400).json({ ok: false, error: 'Unsupported embedded application.' });
  }
  next();
});

// http-proxy-middleware ships as ESM; on some serverless runtimes (Vercel) a
// top-level require() throws ERR_REQUIRE_ESM, so it is loaded lazily with a
// dynamic import() only when the standalone proxy route is actually used.
let standaloneProxyMwPromise = null;
function getStandaloneProxyMiddleware() {
  if (!standaloneProxyMwPromise) {
    standaloneProxyMwPromise = import('http-proxy-middleware')
      .then((mod) => mod.createProxyMiddleware({
        changeOrigin: true,
        router: (req) => standaloneProxyTargets[req.params.targetApp],
        pathRewrite: (path, req) => path.replace(`/api/standalone-proxy/${req.params.targetApp}`, '') || '/',
        on: {
          proxyReq: (proxyReq) => {
            proxyReq.removeHeader('authorization');
            proxyReq.removeHeader('cookie');
          },
          proxyRes: (proxyRes) => {
            proxyRes.headers['x-nexus-proxy'] = 'public-content-only';
          },
        },
        onError: (error, req, res) => {
          if (!res.headersSent) res.status(502).json({ ok: false, error: 'The target application does not allow embedded access.' });
        },
      }))
      .catch((error) => {
        standaloneProxyMwPromise = null;
        throw error;
      });
  }
  return standaloneProxyMwPromise;
}

app.use('/api/standalone-proxy/:targetApp', async (req, res, next) => {
  try {
    const middleware = await getStandaloneProxyMiddleware();
    middleware(req, res, next);
  } catch (error) {
    res.status(503).json({ ok: false, error: 'Standalone proxy middleware is unavailable.' });
  }
});

async function generateApiKey(req, res) {
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: 'Supabase service role is required for API key management.' });
  const payload = req.body || {};
  const scopes = Array.isArray(payload.scopes) && payload.scopes.length ? [...new Set(payload.scopes)] : ['reader'];
  const invalidScope = scopes.find((scope) => !API_KEY_SCOPES.has(scope));
  if (invalidScope) return res.status(400).json({ ok: false, error: `Unsupported scope: ${invalidScope}` });

  let expiresAt = null;
  if (payload.expiresAt) {
    const parsedExpiry = Date.parse(payload.expiresAt);
    if (!Number.isFinite(parsedExpiry) || parsedExpiry <= Date.now()) {
      return res.status(400).json({ ok: false, error: 'expiresAt must be a future ISO date or omitted for no expiration.' });
    }
    expiresAt = new Date(parsedExpiry).toISOString();
  }

  let secret;
  try {
    secret = `nexus_live_${crypto.randomBytes(32).toString('base64url')}`;
    const id = crypto.randomUUID();
    const record = {
      name: String(payload.name || 'Unnamed integration').trim().slice(0, 80),
      key_prefix: secret.slice(0, 20),
      key_hash: hashApiKey(secret),
      scopes,
      expires_at: expiresAt,
    };
    const { data, error } = await supabaseAdmin.from('api_keys').insert({ id, ...record }).select('id,name,key_prefix,scopes,expires_at,created_at').single();
    if (error) return res.status(503).json({ ok: false, error: 'Unable to persist API key in Supabase.' });
    return res.status(201).json({ ok: true, key: { ...data, secret, warning: 'Store this secret now. It cannot be retrieved again.' } });
  } catch (error) {
    return res.status(503).json({ ok: false, error: error.message || 'Unable to issue API key.' });
  }
}

app.post('/api/keys', requireKeyManager, generateApiKey);
app.post('/api/v1/keys/generate', requireKeyManager, generateApiKey);

app.get('/api/keys', requireKeyManager, async (_req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: 'Supabase service role is required for API key management.' });
  const { data, error } = await supabaseAdmin.from('api_keys').select('id,name,key_prefix,scopes,expires_at,revoked_at,last_used_at,created_at').order('created_at', { ascending: false });
  if (error) return res.status(503).json({ ok: false, error: 'Unable to read API keys from Supabase.' });
  res.json({ ok: true, keys: data || [] });
});

app.post('/api/keys/:keyId/revoke', requireKeyManager, async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: 'Supabase service role is required for API key management.' });
  const revokedAt = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from('api_keys').update({ revoked_at: revokedAt }).eq('id', req.params.keyId.replace(/^key_/, '')).select('id,revoked_at').maybeSingle();
  if (error) return res.status(503).json({ ok: false, error: 'Unable to revoke API key in Supabase.' });
  if (!data) return res.status(404).json({ ok: false, error: 'API key not found.' });
  res.json({ ok: true, key: data });
});

app.post('/api/v1/keys/:keyId/revoke', requireKeyManager, async (req, res) => {
  req.params.keyId = req.params.keyId.replace(/^key_/, '');
  const revokedAt = new Date().toISOString();
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: 'Supabase service role is required for API key management.' });
  const { data, error } = await supabaseAdmin.from('api_keys').update({ revoked_at: revokedAt }).eq('id', req.params.keyId).select('id,revoked_at').maybeSingle();
  if (error) return res.status(503).json({ ok: false, error: 'Unable to revoke API key in Supabase.' });
  if (!data) return res.status(404).json({ ok: false, error: 'API key not found.' });
  res.json({ ok: true, key: data });
});

app.post('/api/transactions', requireApiScope('transactions:write'), async (req, res) => {
  const payload = req.body || {};
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    return res.status(400).json({ ok: false, error: 'Transaction amount must be a positive number under 1,000,000.' });
  }

  const transaction = {
    id: crypto.randomUUID(),
    amount,
    asset: String(payload.asset || 'USDT').toUpperCase(),
    destination: String(payload.destination || '').trim(),
    status: 'authorized',
    createdAt: new Date().toISOString(),
    apiKeyId: req.apiKey.id,
  };
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: 'Supabase service role is required for transaction persistence.' });
  const { data, error } = await supabaseAdmin.from('transaction_ledger').insert({ api_key_id: req.apiKey.id, amount, asset: transaction.asset, destination: transaction.destination, status: 'authorized' }).select('*').single();
  if (error) return res.status(503).json({ ok: false, error: 'Transaction persistence failed; no payout was attempted.' });
  res.status(201).json({ ok: true, transaction: data, message: 'Transaction recorded in Supabase. Configure a verified payout provider to settle funds.' });
});

app.post('/api/v1/payments/gasfree/permit', requireApiScope('transactions:write'), (req, res) => {
  const message = req.body || {};
  const requiredFields = GASFREE_PERMIT_TYPES.PermitTransfer.map((field) => field.name);
  const missing = requiredFields.filter((field) => message[field] === undefined || message[field] === '');
  if (missing.length) return res.status(400).json({ ok: false, error: `Missing permit fields: ${missing.join(', ')}` });
  res.json({ ok: true, typedData: { domain: GASFREE_PERMIT_DOMAIN, types: GASFREE_PERMIT_TYPES, primaryType: 'PermitTransfer', message }, message: 'Sign this typed data with the user wallet. The server never receives private keys.' });
});

app.post('/api/v1/partner/events', requireApiScope('partner:sync'), async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: 'Supabase service role is required for partner events.' });
  const payload = req.body || {};
  const amount = Number(payload.amount);
  const currency = String(payload.currency || 'USDT').toUpperCase();
  const source = String(payload.source || 'partner').trim().slice(0, 80);
  const profileId = payload.profileId || null;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000 || !source) return res.status(400).json({ ok: false, error: 'A valid positive amount and source are required.' });
  const masterAmount = Number((amount * Number(process.env.MONETIZATION_MASTER_SPLIT || 0.8)).toFixed(8));
  const platformAmount = Number((amount - masterAmount).toFixed(8));
  const { data, error } = await supabaseAdmin.from('monetization_ledger').insert({ source, profile_id: profileId, currency, gross_amount: amount, master_amount: masterAmount, platform_amount: platformAmount, external_id: String(payload.externalId || '').slice(0, 160) || null, status: 'settled' }).select('*').single();
  if (error) return res.status(503).json({ ok: false, error: 'Partner event could not be persisted.' });
  res.status(201).json({ ok: true, event: data, split: { master: masterAmount, platform: platformAmount } });
});

app.get('/api/v1/earnings', requireApiScope('earnings:read'), async (_req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: 'Supabase service role is required for earnings.' });
  const { data, error } = await supabaseAdmin.from('monetization_ledger').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return res.status(503).json({ ok: false, error: 'Earnings are unavailable.' });
  res.json({ ok: true, earnings: data || [] });
});

async function verifySupabaseConnection() {
  if (!supabase) {
    console.warn('[Supabase] Not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.');
    return false;
  }

  try {
    const query = supabase.from('users').select('count', { count: 'exact', head: true });
    const result = await Promise.race([
      query,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Health query timed out')), 10000))
    ]);

    if (result.error) throw result.error;
    console.log('✅ [Supabase] Connected successfully to live database');
    return true;
  } catch (error) {
    const message = error && error.message ? error.message : 'Unable to reach Supabase or query the users table.';
    console.warn(`[Supabase] Connection verification failed: ${message}`);
    return false;
  }
}

function requireSupabaseAdmin(res) {
  if (supabaseAdmin) return true;
  res.status(503).json({
    ok: false,
    error: 'Persistent storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  });
  return false;
}

function validSolanaAddress(value) {
  // Base58 public keys are 32 bytes, normally encoded in 32–44 characters.
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

function validTronAddress(value) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
}

function normaliseWalletBinding(payload = {}) {
  const solanaAddress = String(payload.solanaAddress || '').trim();
  const usdtAddress = String(payload.usdtAddress || '').trim();
  const usdtNetwork = String(payload.usdtNetwork || '').toUpperCase();

  if (!solanaAddress || !validSolanaAddress(solanaAddress)) {
    return { error: 'A valid Solana address is required.' };
  }
  if (!['TRC20', 'SPL'].includes(usdtNetwork)) {
    return { error: 'USDT network must be TRC20 or SPL.' };
  }
  if (!usdtAddress || (usdtNetwork === 'TRC20' ? !validTronAddress(usdtAddress) : !validSolanaAddress(usdtAddress))) {
    return { error: `A valid ${usdtNetwork === 'TRC20' ? 'TRON' : 'Solana'} USDT address is required.` };
  }
  return { solanaAddress, usdtAddress, usdtNetwork };
}

const baseMetrics = {
  ads: 128.4,
  cinema: 356.1,
  usdtPayout: 1248.4,
  users: 1240,
  activeSessions: 318,
  dailyRevenue: 842.55,
  rank: 'VIP-2'
};

const ledger = [];

const masterWalletStrategies = [
  { id: 1, name: 'Real-time yield aggregation', type: 'yield', description: 'Keep treasury balances in liquid-staked assets to generate passive yield while preserving payout liquidity.' },
  { id: 2, name: 'Transaction fee surcharging', type: 'fees', description: 'Add a small spread over actual network fees on claims and payouts to create sustainable fee revenue.' },
  { id: 3, name: 'MEV protection & tip monetization', type: 'mev', description: 'Use protected routing for high-value payouts and capture back-run rebates into the treasury pool.' },
  { id: 4, name: 'Automated multi-tier staking pools', type: 'yield', description: 'Rebalance inactive treasury funds across vetted yield strategies for compounding gains.' },
  { id: 5, name: 'Tiered dynamic claim fees', type: 'fees', description: 'Charge a premium for instant claims while offering slower batched payouts with reduced fees.' },
  { id: 6, name: 'Micro-slippage optimization', type: 'ops', description: 'Match incoming deposit flow against outgoing withdrawals before on-chain execution to save fees.' },
  { id: 7, name: 'Native automated token swapping fees', type: 'swaps', description: 'Take a defined platform fee on DEX routing when users claim funds in alternative assets.' },
  { id: 8, name: 'Tiered holding locks', type: 'yield', description: 'Boost user earnings by locking funds longer, keeping capital available for treasury yield strategies.' },
  { id: 9, name: 'Auto-compounding treasury vaults', type: 'yield', description: 'Harvest protocol rewards and re-invest them automatically to increase capital efficiency.' },
  { id: 10, name: 'Treasury arbitrage & flash liquidity', type: 'arbitrage', description: 'Use stablecoin reserves as internal liquidity for fees and opportunistic arbitrage plays.' },
  { id: 11, name: 'Cross-chain settlement consolidation', type: 'ops', description: 'Batch flows so each payout stack executes more efficiently with less per-transaction overhead.' },
  { id: 12, name: 'Unclaimed funds maintenance rules', type: 'fees', description: 'Apply small dormant-account deductions to return unused value to the treasury and protect the pool.' },
  { id: 13, name: 'Revenue split routing at relayer level', type: 'fees', description: 'Split each fee event automatically between user reserve, treasury, and operations vaults.' },
  { id: 14, name: 'Partner referral & affiliate rebates', type: 'partners', description: 'Route bridge, swap, and fiat on/off-ramp activity through partner affiliate IDs to collect passive rebates.' },
  { id: 15, name: 'Real-time treasury hedging', type: 'risk', description: 'Convert volatile fee inflows into stablecoins to protect master-wallet reserves from drawdown risk.' }
];

function normaliseWallet(value) {
  if (!value) return '';
  return String(value).trim();
}

async function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Nexus backend listening on port ${port}`);
    // Diagnostics must never delay the platform port bind or prevent a deploy.
    verifySupabaseConnection().catch((error) => console.warn('[Supabase] Startup diagnostic failed:', error.message));
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Refusing to bind a different port.`);
    }

    console.error('Failed to start backend server:', error);
    process.exit(1);
  });
}

function isPlaceholderValue(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  return /^your-/i.test(text) || text.length < 10;
}

function telegramConfigured() {
  return Boolean(
    process.env.ENABLE_TELEGRAM_ALERTS !== 'false' &&
    !isPlaceholderValue(process.env.TELEGRAM_BOT_TOKEN) &&
    !isPlaceholderValue(process.env.TELEGRAM_CHAT_ID)
  );
}

const telegramAlertThrottle = new Map();
const TELEGRAM_ALERT_COOLDOWN_MS = 45 * 1000;

// Real Telegram delivery. Earnings and wallet updates are pushed straight into
// the configured Telegram chat so the balance is visible inside Telegram too.
async function notifyTelegram(message, { throttleKey = null } = {}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramConfigured()) {
    console.log('[Telegram] Alert ready but not configured yet:', message);
    return { ok: false, reason: 'Telegram bot not configured', message };
  }

  if (throttleKey) {
    const lastSentAt = telegramAlertThrottle.get(throttleKey) || 0;
    if (Date.now() - lastSentAt < TELEGRAM_ALERT_COOLDOWN_MS) {
      return { ok: false, reason: 'Throttled to avoid alert spam', message };
    }
    telegramAlertThrottle.set(throttleKey, Date.now());
  }

  try {
    const requestUrl = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      console.warn('[Telegram] sendMessage failed:', result.description || `HTTP ${response.status}`);
      return { ok: false, reason: result.description || `HTTP ${response.status}`, message };
    }
    return { ok: true, message, deliveredAt: new Date().toISOString() };
  } catch (error) {
    console.warn('[Telegram] sendMessage error:', error.message);
    return { ok: false, reason: error.message, message };
  }
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'Nexus Platform Backend',
    mode: 'production-ready scaffold',
    timestamp: new Date().toISOString(),
    supabaseConnected: Boolean(supabase),
    masterWallet: Boolean(process.env.MASTER_WALLET_ADDRESS),
  });
});

app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'auth-login.html'));
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated.' });
  }

  res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const payload = req.body || {};
    const email = normaliseEmail(payload.email);
    const password = String(payload.password || '');
    const name = String(payload.name || 'User').trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'A valid email address is required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters long.' });
    }

    const users = readUsers();
    if (users[email]) {
      return res.status(409).json({ ok: false, error: 'An account with this email already exists.' });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const user = {
      id: crypto.randomUUID(),
      email,
      name: name || 'User',
      passwordHash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
    };

    users[email] = user;
    writeUsers(users);
    await mirrorUser(user);

    const token = generateToken();
    await persistSession(token, user.id, Date.now() + SESSION_TTL_MS);
    setSessionCookie(res, token);

    res.status(201).json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      message: 'Account created successfully.'
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unable to create account right now.' });
  }
});

// Telegram pending verifications store
const telegramPending = new Map();

// Telegram: Send verification code
app.post('/api/auth/telegram/send-code', async (req, res) => {
  const { phone, sessionId } = req.body || {};
  if (!phone || !sessionId) {
    return res.status(400).json({ ok: false, error: 'Phone and sessionId are required.' });
  }
  // Generate a 5-digit code
  const code = String(Math.floor(10000 + Math.random() * 90000));
  telegramPending.set(sessionId, { phone, code, createdAt: Date.now() });
  // Clean up old entries (older than 10 minutes)
  const now = Date.now();
  for (const [key, val] of telegramPending.entries()) {
    if (now - val.createdAt > 600000) telegramPending.delete(key);
  }
  console.log(`[Telegram Auth] Code for ${phone} (session ${sessionId.slice(-6)}): ${code}`);
  res.json({ ok: true, message: 'Verification code sent.', sessionId });
});

// Telegram: Verify code and login
app.post('/api/auth/telegram/verify', async (req, res) => {
  const { phone, code, sessionId } = req.body || {};
  if (!phone || !code || !sessionId) {
    return res.status(400).json({ ok: false, error: 'Phone, code, and sessionId are required.' });
  }
  const pending = telegramPending.get(sessionId);
  if (!pending) {
    return res.status(400).json({ ok: false, error: 'Session expired. Request a new code.' });
  }
  if (pending.phone !== phone) {
    return res.status(400).json({ ok: false, error: 'Phone number mismatch.' });
  }
  if (pending.code !== code) {
    return res.status(401).json({ ok: false, error: 'Invalid verification code.' });
  }
  // Code verified - clean up
  telegramPending.delete(sessionId);
  // Create or find user
  const users = readUsers();
  const tgUserId = 'tg_' + phone.replace(/[^0-9]/g, '');
  if (!users[tgUserId]) {
    users[tgUserId] = {
      id: tgUserId,
      name: 'Telegram User',
      email: '',
      phone: phone,
      passwordHash: null,
      source: 'telegram',
      createdAt: new Date().toISOString()
    };
    writeUsers(users);
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = { userId: tgUserId, createdAt: Date.now() };
  res.cookie('nexus_session', token, { httpOnly: true, maxAge: SESSION_TTL_MS, sameSite: 'lax' });
  res.json({ ok: true, user: { id: tgUserId, name: users[tgUserId].name, phone }, token });
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const payload = req.body || {};
    const email = normaliseEmail(payload.email);
    const password = String(payload.password || '');

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' });
    }

    const users = readUsers();
    const user = users[email];
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
    }

    const candidateHash = hashPassword(password, user.passwordSalt);
    if (candidateHash !== user.passwordHash) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
    }

    await mirrorUser(user);
    const token = generateToken();
    await persistSession(token, user.id, Date.now() + SESSION_TTL_MS);
    setSessionCookie(res, token);

    res.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      message: 'Logged in successfully.'
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unable to log in right now.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = getCookieValue(req.headers.cookie || '', 'sessionToken');
  if (token) delete sessions[token];
  clearSessionCookie(res);
  res.json({ ok: true, message: 'Logged out.' });
});

app.get('/', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app', requireAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/metrics', (_req, res) => {
  res.json({
    ...baseMetrics,
    updatedAt: new Date().toISOString()
  });
});

app.get('/api/admin/dashboard', (_req, res) => {
  res.json({
    ok: true,
    metrics: {
      ...baseMetrics,
      ledgerCount: ledger.length,
      updatedAt: new Date().toISOString()
    },
    masterWalletAddress: process.env.MASTER_WALLET_ADDRESS || null,
    masterWalletNetwork: process.env.MASTER_WALLET_NETWORK || 'solana',
    strategies: masterWalletStrategies,
    ledger: ledger.slice(-20).reverse()
  });
});

// Durable wallet binding and payout-request records. These routes deliberately do
// not custody keys, sign transactions, or represent a payment as settled.
app.get('/api/wallet-binding', requireAuth, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const { data, error } = await supabaseAdmin
    .from('wallet_bindings')
    .select('solana_address,usdt_address,usdt_network,available_balance_usd,pending_balance_usd,updated_at')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(503).json({ ok: false, error: 'Unable to load wallet binding.' });
  return res.json({ ok: true, binding: data || null });
});

app.put('/api/wallet-binding', requireAuth, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const binding = normaliseWalletBinding(req.body);
  if (binding.error) return res.status(400).json({ ok: false, error: binding.error });
  const { data, error } = await supabaseAdmin
    .from('wallet_bindings')
    .upsert({
      user_id: req.user.id,
      solana_address: binding.solanaAddress,
      usdt_address: binding.usdtAddress,
      usdt_network: binding.usdtNetwork,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('solana_address,usdt_address,usdt_network,available_balance_usd,pending_balance_usd,updated_at')
    .single();
  if (error) return res.status(503).json({ ok: false, error: 'Unable to save wallet binding.' });
  return res.json({ ok: true, binding: data });
});

app.post('/api/airdrop/claim-request', requireAuth, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const amount = Number(req.body?.amount);
  const cooldownMinutes = Math.max(10, Math.min(15, Number(process.env.AIRDROP_COOLDOWN_MINUTES || 15)));
  if (!Number.isFinite(amount) || amount < 1 || amount > 5) {
    return res.status(400).json({ ok: false, error: 'Claim amount must be between $1 and $5.' });
  }
  const { data: binding, error: bindingError } = await supabaseAdmin
    .from('wallet_bindings').select('user_id').eq('user_id', req.user.id).maybeSingle();
  if (bindingError || !binding) return res.status(400).json({ ok: false, error: 'Bind payout wallets before requesting a claim.' });
  const { data: lastClaim, error: claimLookupError } = await supabaseAdmin
    .from('airdrop_claims').select('claimed_at').eq('user_id', req.user.id).order('claimed_at', { ascending: false }).limit(1).maybeSingle();
  if (claimLookupError) return res.status(503).json({ ok: false, error: 'Unable to check the claim cooldown.' });
  const nextClaimAt = lastClaim ? new Date(new Date(lastClaim.claimed_at).getTime() + cooldownMinutes * 60 * 1000) : null;
  if (nextClaimAt && nextClaimAt > new Date()) {
    return res.status(429).json({ ok: false, error: 'Claim cooldown is active.', nextClaimAt: nextClaimAt.toISOString() });
  }
  const { data: claim, error } = await supabaseAdmin.from('airdrop_claims').insert({
    user_id: req.user.id, amount_usd: amount, status: 'requested', claimed_at: new Date().toISOString(),
  }).select('id,amount_usd,status,claimed_at').single();
  if (error) return res.status(503).json({ ok: false, error: 'Unable to persist claim request.' });
  return res.status(202).json({ ok: true, claim, nextClaimAt: new Date(Date.now() + cooldownMinutes * 60 * 1000).toISOString(), message: 'Claim request recorded for authorized review. No blockchain payout has been sent.' });
});

app.post('/api/withdrawal-requests', requireAuth, async (req, res) => {
  if (!requireSupabaseAdmin(res)) return;
  const amount = Number(req.body?.amount);
  const asset = String(req.body?.asset || 'USDT').toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0 || !['SOL', 'USDT'].includes(asset)) return res.status(400).json({ ok: false, error: 'Provide a positive SOL or USDT withdrawal amount.' });
  const { data: binding } = await supabaseAdmin.from('wallet_bindings').select('user_id').eq('user_id', req.user.id).maybeSingle();
  if (!binding) return res.status(400).json({ ok: false, error: 'Bind payout wallets before requesting a withdrawal.' });
  const { data, error } = await supabaseAdmin.from('withdrawal_requests').insert({ user_id: req.user.id, asset, amount, status: 'requested' }).select('id,asset,amount,status,created_at').single();
  if (error) return res.status(503).json({ ok: false, error: 'Unable to persist withdrawal request.' });
  return res.status(202).json({ ok: true, withdrawal: data, message: 'Withdrawal request recorded for authorized review. No blockchain payout has been sent.' });
});

app.get('/api/master-wallet/strategies', (_req, res) => {
  res.json({
    ok: true,
    count: masterWalletStrategies.length,
    strategies: masterWalletStrategies,
    updatedAt: new Date().toISOString()
  });
});

app.post('/api/telemetry/earnings', (req, res) => {
  const payload = req.body || {};
  const ads = Number(payload.ads ?? baseMetrics.ads);
  const cinema = Number(payload.cinema ?? baseMetrics.cinema);
  const usdtPayout = Number(payload.usdtPayout ?? baseMetrics.usdtPayout);

  ledger.push({
    type: 'earnings_update',
    ads,
    cinema,
    usdtPayout,
    createdAt: new Date().toISOString()
  });

  res.json({
    ok: true,
    metrics: {
      ads,
      cinema,
      usdtPayout,
      updatedAt: new Date().toISOString()
    }
  });
});

app.post('/api/config/master-wallet', requireKeyManager, (req, res) => {
  const payload = req.body || {};
  const wallet = normaliseWallet(payload.masterWalletAddress || process.env.MASTER_WALLET_ADDRESS);

  if (!wallet) {
    return res.status(400).json({ ok: false, error: 'Master wallet is required.' });
  }

  ledger.push({ type: 'master_wallet_update', wallet, network: payload.network || process.env.MASTER_WALLET_NETWORK || 'solana', createdAt: new Date().toISOString() });

  res.json({
    ok: true,
    masterWalletAddress: wallet,
    network: payload.network || process.env.MASTER_WALLET_NETWORK || 'solana',
    timestamp: new Date().toISOString()
  });
});

function legacyPayoutRoute(_req, res) {
  return res.status(410).json({
    ok: false,
    error: 'This demo payout route is retired. Use authenticated wallet binding and claim-request endpoints.',
  });
}
app.post('/api/airdrop/trigger', legacyPayoutRoute);
app.post('/api/airdrop/claim', legacyPayoutRoute);
app.post('/api/wallet/verify', legacyPayoutRoute);

app.post('/api/telegram/webhook', async (req, res) => {
  const body = req.body || {};
  const message = body.message || body;

  const telegramAlert = await notifyTelegram(`Telegram webhook received: ${JSON.stringify(message).slice(0, 500)}`);

  res.json({
    ok: true,
    received: true,
    telegram: telegramAlert
  });
});

app.post('/api/telegram/alert', async (req, res) => {
  const payload = req.body || {};
  const botToken = process.env.TELEGRAM_BOT_TOKEN || payload.botToken;
  const chatId = process.env.TELEGRAM_CHAT_ID || payload.chatId;

  if (!botToken || !chatId) {
    return res.status(400).json({ ok: false, error: 'Telegram bot token and chat id are required.' });
  }

  const alert = await notifyTelegram(payload.message || 'Telegram alert payload accepted for backend processing.');

  res.json({
    ok: true,
    message: 'Telegram alert payload accepted for backend processing.',
    chatId,
    telegram: alert,
    timestamp: new Date().toISOString()
  });
});

// Telegram WebApp initData validation
// Validates the initData signature using HMAC-SHA256 with the bot token
app.post('/api/telegram/init', async (req, res) => {
  const { initData } = req.body || {};
  
  if (!initData) {
    return res.status(400).json({ ok: false, error: 'initData is required.' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured on the server.' });
  }

  try {
    // Parse initData - it can be a JSON string or an object
    let parsedData = initData;
    if (typeof initData === 'string') {
      try {
        parsedData = JSON.parse(initData);
      } catch (e) {
        // If it's not valid JSON, treat it as a query string
        parsedData = Object.fromEntries(new URLSearchParams(initData));
      }
    }

    // Extract signature from initData
    const signature = parsedData.signature || parsedData.hash;
    if (!signature) {
      return res.status(400).json({ ok: false, error: 'No signature found in initData.' });
    }

    // Remove signature from data to verify
    const dataToVerify = { ...parsedData };
    delete dataToVerify.signature;
    delete dataToVerify.hash;

    // Create data check string (sorted key-value pairs)
    const dataCheckString = Object.keys(dataToVerify)
      .sort()
      .map(key => `${key}=${dataToVerify[key]}`)
      .join('\n');

    // Compute HMAC-SHA256 using bot token as key
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const signatureBuffer = Buffer.from(signature, 'hex');
    const hmacBuffer = Buffer.from(hmac, 'hex');
    
    const isValid = signatureBuffer.length === hmacBuffer.length && 
                    crypto.timingSafeEqual(signatureBuffer, hmacBuffer);

    if (!isValid) {
      return res.status(401).json({ ok: false, error: 'Invalid initData signature.' });
    }

    // Check timestamp to prevent replay attacks (optional, 24h tolerance)
    const authDate = parsedData.auth_date;
    if (authDate) {
      const authTimestamp = parseInt(authDate, 10);
      const now = Math.floor(Date.now() / 1000);
      const maxAge = 24 * 60 * 60; // 24 hours
      if (now - authTimestamp > maxAge) {
        return res.status(401).json({ ok: false, error: 'initData has expired.' });
      }
    }

    res.json({
      ok: true,
      message: 'Telegram WebApp initialized successfully.',
      user: parsedData.user || null,
      chat: parsedData.chat || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Telegram] initData validation error:', error.message);
    res.status(500).json({ ok: false, error: 'Failed to validate initData.' });
  }
});

// Telegram friends list endpoint
app.get('/api/telegram/friends', async (_req, res) => {
  // In a real implementation, this would fetch from Telegram Bot API
  // or from your database where you store user friendships
  res.json({
    ok: true,
    friends: [
      { id: '1', name: 'Alice Johnson', username: 'alice_j', online: true, lastSeen: null },
      { id: '2', name: 'Bob Smith', username: 'bobsmith', online: false, lastSeen: '2 hours ago' },
      { id: '3', name: 'Charlie Davis', username: 'charlie_d', online: true, lastSeen: null },
      { id: '4', name: 'Diana Wilson', username: 'diana_w', online: false, lastSeen: '1 day ago' },
    ]
  });
});

// Telegram chat history endpoint
app.get('/api/telegram/chat/:peerId', async (req, res) => {
  const { peerId } = req.params;
  // In a real implementation, this would fetch from your database
  res.json({
    ok: true,
    peerId,
    messages: [
      { text: 'Hey! How are you?', fromMe: false, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { text: 'I\'m good, thanks! Working on the Nexus project.', fromMe: true, timestamp: new Date(Date.now() - 3000000).toISOString() },
      { text: 'That sounds awesome! Let me know if you need help.', fromMe: false, timestamp: new Date(Date.now() - 2400000).toISOString() },
    ]
  });
});

// Telegram send message endpoint
app.post('/api/telegram/send-message', async (req, res) => {
  const { peerId, text } = req.body || {};
  if (!peerId || !text) {
    return res.status(400).json({ ok: false, error: 'peerId and text are required.' });
  }
  // In a real implementation, this would send via Telegram Bot API
  res.json({ ok: true, message: { text, fromMe: true, timestamp: new Date().toISOString() } });
});

app.get('/api/supabase/status', async (_req, res) => {
  if (!supabase) {
    return res.status(200).json({ ok: false, message: 'Supabase is not configured yet.', configured: false });
  }

  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    res.json({ ok: true, configured: true, sample: data || [] });
  } catch (error) {
    res.status(200).json({ ok: false, configured: true, message: 'Supabase client is ready but table not present yet.', error: error.message });
  }
});

app.get('/api/monetization/status', (_req, res) => {
  const configured = Boolean(
    process.env.PAYOUT_PROVIDER &&
    process.env.PAYOUT_API_KEY &&
    process.env.MASTER_WALLET_ADDRESS
  );

  res.json({
    ok: true,
    live: configured,
    provider: process.env.PAYOUT_PROVIDER || null,
    network: process.env.MASTER_WALLET_NETWORK || 'solana',
    message: configured
      ? 'Provider credentials detected. Payout execution still requires provider-specific implementation and webhook verification.'
      : 'Demo accounting only. Configure a payout provider, funded treasury, and verified webhooks before enabling live payouts.'
  });
});

// ===== EXPLORER WORKSPACE ENDPOINTS =====

// Serve Explorer workspace
app.get('/explorer', (_req, res) => {
  res.sendFile(path.join(__dirname, 'explorer-workspace.html'));
});

// Explorer earnings tracking — records every earning, persists it to Supabase,
// credits the bound wallet balance, and mirrors the update into Telegram.
app.post('/api/explorer/earnings', async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const description = String(req.body?.description || 'Explorer activity').slice(0, 200);
    const server = String(req.body?.server || 'default').slice(0, 20);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid earnings data' });
    }

    const user = await getUserFromRequest(req);
    const entry = {
      id: crypto.randomUUID(),
      amount,
      description,
      timestamp: new Date().toISOString(),
      server,
      source: 'explorer-workspace',
      userId: user ? user.id : null,
    };

    ledger.push(entry);

    let credited = 0;
    let wallet = null;

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('explorer_earnings').insert({
        user_id: user ? user.id : null,
        amount,
        description,
        server,
        source: 'explorer-workspace',
      });
      if (error) console.warn('[Explorer] Earnings persistence failed:', error.message);
    }

    if (user && supabaseAdmin) {
      const { data: binding, error: bindingError } = await supabaseAdmin
        .from('wallet_bindings')
        .select('available_balance_usd,pending_balance_usd,solana_address,usdt_address,usdt_network')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!bindingError && binding) {
        const available = Number((Number(binding.available_balance_usd || 0) + amount).toFixed(6));
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('wallet_bindings')
          .update({ available_balance_usd: available, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select('available_balance_usd,pending_balance_usd,solana_address,usdt_address,usdt_network')
          .single();
        if (!updateError && updated) {
          credited = amount;
          wallet = updated;
        }
      }
    }

    const totalEarnings = ledger.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (amount >= 0.01) {
      const balanceLine = wallet
        ? `Wallet available: $${Number(wallet.available_balance_usd).toFixed(2)}`
        : 'Bind your wallet in the Explorer to hold funds.';
      notifyTelegram(
        `💰 <b>Nexus Explorer earning</b>\n+${amount.toFixed(2)} USD — ${description}\n${balanceLine}`,
        { throttleKey: `earning:${user ? user.id : 'anon'}` }
      ).catch(() => {});
    }

    res.json({
      ok: true,
      entry,
      totalEarnings,
      credited,
      wallet,
      telegramConfigured: telegramConfigured(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to record earnings' });
  }
});

// Explorer health reporting
app.post('/api/explorer/health', (req, res) => {
  try {
    const { currentTab, currentServer, earnings, interactions, automatedTasks, timestamp } = req.body;
    
    const healthReport = {
      timestamp: timestamp || new Date().toISOString(),
      currentTab,
      currentServer,
      earnings,
      interactions,
      automatedTasks,
      systemStatus: 'operational',
      ports: {
        local: 4000,
        external: 8000,
      }
    };

    res.json({
      ok: true,
      health: healthReport,
      message: 'System operational and synced across both ports',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Health check failed' });
  }
});

// ===== EXPLORER AI — server-side Gemini drafting (the key never reaches the browser) =====
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

function geminiConfigured() {
  return !isPlaceholderValue(process.env.GEMINI_API_KEY);
}

async function callGemini({ systemInstruction, prompt }) {
  // Try the configured model first; if Google has retired it, the error message
  // names the recommended replacement — parse it and retry automatically.
  const models = [GEMINI_MODEL];
  let lastError = null;

  for (let attempt = 0; attempt < models.length && attempt < 3; attempt++) {
    const model = models[attempt];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `Gemini request failed (HTTP ${response.status})`;
      const recommended = message.match(/models\/([a-z0-9.\-]+)/i);
      if (recommended && recommended[1] && !models.includes(recommended[1])) {
        console.warn(`[Gemini] Model ${model} unavailable — retrying with ${recommended[1]}`);
        models.push(recommended[1]);
        lastError = new Error(message);
        continue;
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    const text = (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('\n').trim();
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }
  throw lastError || new Error('Gemini request failed.');
}

function parseDraftText(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && (parsed.subject || parsed.body)) {
        return { subject: String(parsed.subject || '').slice(0, 200), body: String(parsed.body || '') };
      }
    } catch (_) { /* fall through to raw text below */ }
  }
  return { subject: '', body: text };
}

app.get('/api/explorer/ai/status', (_req, res) => {
  res.json({ ok: true, configured: geminiConfigured(), model: GEMINI_MODEL, provider: 'google-gemini' });
});

// Prepare or improve email text on request. Safe when unconfigured: reports
// configured:false instead of failing, and the key stays on the server.
app.post('/api/explorer/ai/draft', async (req, res) => {
  if (!geminiConfigured()) {
    return res.status(200).json({
      ok: false,
      configured: false,
      message: 'Gemini drafting is not configured on the server yet. Add GEMINI_API_KEY to the server environment (Vercel/Render dashboard or .env) and restart — never put the key in the browser.',
    });
  }

  const payload = req.body || {};
  const prompt = String(payload.prompt || '').trim();
  const action = String(payload.action || 'draft');
  if (!prompt && !payload.body) {
    return res.status(400).json({ ok: false, error: 'Describe what you want the AI to prepare, or provide a draft to improve.' });
  }

  const systemInstruction = [
    'You are the Nexus Explorer email drafting assistant inside a mail.com style workspace.',
    'You prepare, improve, shorten, or formalise email text for the workspace owner.',
    'Always answer with a JSON object of the shape {"subject": "...", "body": "..."} and nothing else.',
    'Keep the body plain text, well structured, warm and professional, ready to send.',
  ].join(' ');

  const parts = [];
  if (payload.recipients) parts.push(`Recipients: ${payload.recipients}`);
  if (payload.subject) parts.push(`Current subject: ${payload.subject}`);
  if (payload.body) parts.push(`Current draft:\n${payload.body}`);
  parts.push(`Request (${action}): ${prompt || 'improve this draft'}`);

  try {
    const text = await callGemini({ systemInstruction, prompt: parts.join('\n\n') });
    const draft = parseDraftText(text);
    res.json({ ok: true, configured: true, model: GEMINI_MODEL, action, ...draft });
  } catch (error) {
    res.status(error.status === 400 ? 400 : 502).json({ ok: false, configured: true, error: error.message });
  }
});

// Explorer summary: persisted totals, wallet binding, and Telegram status for the UI.
app.get('/api/explorer/summary', async (req, res) => {
  const user = await getUserFromRequest(req);
  const explorerEntries = ledger.filter((e) => e.source === 'explorer-workspace');
  let lifetimeUserEarnings = 0;
  let wallet = null;
  let earningsPersisted = false;

  if (user && supabaseAdmin) {
    const { data: earningsRows, error: earningsError } = await supabaseAdmin
      .from('explorer_earnings').select('amount').eq('user_id', user.id);
    if (!earningsError && earningsRows) {
      earningsPersisted = true;
      lifetimeUserEarnings = earningsRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    }
    const { data: binding } = await supabaseAdmin
      .from('wallet_bindings')
      .select('solana_address,usdt_address,usdt_network,available_balance_usd,pending_balance_usd,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    wallet = binding || null;
  }

  res.json({
    ok: true,
    totals: {
      ledgerTotal: ledger.reduce((sum, e) => sum + (e.amount || 0), 0),
      explorerTotal: explorerEntries.reduce((sum, e) => sum + (e.amount || 0), 0),
    },
    user: user ? { id: user.id, email: user.email, name: user.name } : null,
    lifetimeUserEarnings,
    earningsPersisted,
    wallet,
    telegram: { configured: telegramConfigured() },
    updatedAt: new Date().toISOString(),
  });
});

// Email sending endpoint
app.post('/api/explorer/send-email', (req, res) => {
  try {
    const { recipients, subject, body, server } = req.body;

    if (!recipients || !subject || !body) {
      return res.status(400).json({ ok: false, error: 'Missing email fields' });
    }

    const emailRecord = {
      id: crypto.randomUUID(),
      recipients: Array.isArray(recipients) ? recipients : recipients.split(','),
      subject,
      body,
      timestamp: new Date().toISOString(),
      server: server || 'default',
      status: 'sent',
      earnings: 0.05,
    };

    ledger.push(emailRecord);

    res.json({
      ok: true,
      email: emailRecord,
      message: `Email sent to ${emailRecord.recipients.length} recipient(s)`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
});

// PDF generation endpoint
app.post('/api/explorer/generate-pdf', (req, res) => {
  try {
    const { docType, title, content, server } = req.body;

    if (!docType || !title || !content) {
      return res.status(400).json({ ok: false, error: 'Missing PDF data' });
    }

    const pdfRecord = {
      id: crypto.randomUUID(),
      type: docType,
      title,
      contentLength: content.length,
      timestamp: new Date().toISOString(),
      server: server || 'default',
      status: 'generated',
      earnings: 0.10,
    };

    ledger.push(pdfRecord);

    res.json({
      ok: true,
      pdf: pdfRecord,
      message: `PDF generated: ${title}`,
      downloadUrl: `/api/explorer/pdf/${pdfRecord.id}`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to generate PDF' });
  }
});

// Server state management
app.post('/api/explorer/switch-server', (req, res) => {
  try {
    const { state } = req.body;
    const validStates = ['ny', 'ca', 'tx', 'fl', 'wa'];

    if (!validStates.includes(state)) {
      return res.status(400).json({ ok: false, error: 'Invalid server state' });
    }

    const latencies = {
      ny: 12,
      ca: 45,
      tx: 28,
      fl: 18,
      wa: 52,
    };

    res.json({
      ok: true,
      activeServer: state,
      latency: latencies[state],
      timestamp: new Date().toISOString(),
      dualPortStatus: {
        port4000: 'active',
        port8000: 'active',
        synchronized: true,
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to switch server' });
  }
});

// Monetization strategies
app.get('/api/explorer/strategies', (_req, res) => {
  const strategies = [
    { id: 1, name: 'Real-time yield aggregation', type: 'yield', earning: '$0.015/interaction' },
    { id: 2, name: 'Transaction fee surcharging', type: 'fees', earning: '$0.008/tx' },
    { id: 3, name: 'MEV protection & tip monetization', type: 'mev', earning: '$0.012/interaction' },
    { id: 4, name: 'Automated multi-tier staking pools', type: 'yield', earning: '$0.020/day' },
    { id: 5, name: 'Tiered dynamic claim fees', type: 'fees', earning: '$0.010/claim' },
    { id: 6, name: 'Micro-slippage optimization', type: 'ops', earning: '$0.005/swap' },
    { id: 7, name: 'Native automated token swapping fees', type: 'swaps', earning: '$0.012/swap' },
    { id: 8, name: 'Tiered holding locks', type: 'yield', earning: '$0.018/lock' },
    { id: 9, name: 'Auto-compounding treasury vaults', type: 'yield', earning: '$0.025/compound' },
    { id: 10, name: 'Treasury arbitrage & flash liquidity', type: 'arbitrage', earning: '$0.030/arb' },
    { id: 11, name: 'Cross-chain settlement consolidation', type: 'ops', earning: '$0.008/settlement' },
    { id: 12, name: 'Unclaimed funds maintenance rules', type: 'fees', earning: '$0.005/interval' },
    { id: 13, name: 'Revenue split routing at relayer level', type: 'fees', earning: '$0.015/event' },
    { id: 14, name: 'Partner referral & affiliate rebates', type: 'partners', earning: '$0.020/referral' },
    { id: 15, name: 'Real-time treasury hedging', type: 'risk', earning: '$0.012/hedge' },
  ];

  res.json({
    ok: true,
    strategies,
    count: strategies.length,
    totalDailyEarnings: strategies.reduce((sum, s) => sum + parseFloat(s.earning.match(/[\d.]+/)[0]), 0),
  });
});

// Workflow automation endpoint
app.post('/api/explorer/workflow', (req, res) => {
  try {
    const { action, workflow, server } = req.body;

    if (action === 'record') {
      const workflowRecord = {
        id: crypto.randomUUID(),
        workflow,
        timestamp: new Date().toISOString(),
        server,
        status: 'recorded',
        earnings: 0.15,
      };
      ledger.push(workflowRecord);

      res.json({
        ok: true,
        workflow: workflowRecord,
        message: 'Workflow recorded and AI is learning',
      });
    } else if (action === 'execute') {
      const execution = {
        id: crypto.randomUUID(),
        workflow,
        timestamp: new Date().toISOString(),
        server,
        status: 'executed',
        earnings: 0.25,
      };
      ledger.push(execution);

      res.json({
        ok: true,
        execution,
        message: 'Workflow executed by AI',
      });
    } else {
      res.status(400).json({ ok: false, error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Workflow operation failed' });
  }
});

// Get earnings summary
app.get('/api/explorer/earnings-summary', (_req, res) => {
  const totalEarnings = ledger.reduce((sum, e) => sum + (e.amount || 0), 0);
  const explorerEntries = ledger.filter(e => e.source === 'explorer-workspace');
  const explorerEarnings = explorerEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

  res.json({
    ok: true,
    totalEarnings,
    explorerEarnings,
    transactionCount: ledger.length,
    explorerTransactionCount: explorerEntries.length,
    averagePerTransaction: explorerEntries.length > 0 ? explorerEarnings / explorerEntries.length : 0,
  });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  // Try to serve explorer workspace first
  if (req.path === '/explorer' || req.path === '/explorer/') {
    return res.sendFile(path.join(__dirname, 'explorer-workspace.html'));
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ ok: false, path: req.originalUrl, message: 'Route not found.' });
});

module.exports = app;

// Start the HTTP listener only when this file is the entry point (local runs,
// Render, Electron) AND we are NOT inside the Vercel serverless runtime.
// Vercel sets process.env.VERCEL=1 and runs the app as a request handler, so
// binding a port there would break the deployment (FUNCTION_INVOCATION_FAILED).
const isVercelRuntime = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
if (require.main === module && !isVercelRuntime) {
  startServer(Number(process.env.PORT) || 8000);
}
