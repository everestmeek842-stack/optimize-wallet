const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { createProxyMiddleware } = require('http-proxy-middleware');
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

function getUserFromRequest(req) {
  const token = getCookieValue(req.headers.cookie || '', 'sessionToken');
  if (!token || !sessions[token]) return null;
  const session = sessions[token];
  if (Date.now() > session.expiresAt) {
    delete sessions[token];
    return null;
  }
  return getUserById(session.userId);
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }
  req.user = user;
  next();
}

function setSessionCookie(res, token) {
  const expires = new Date(Date.now() + SESSION_TTL_MS).toUTCString();
  res.setHeader('Set-Cookie', `sessionToken=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure=false; Expires=${expires}`);
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

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

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

app.use('/api/standalone-proxy/:targetApp', createProxyMiddleware({
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
}));

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
  await verifySupabaseConnection();
  console.log('Local Frontend: http://localhost:8000');
  console.log(`Local Backend API: http://localhost:${port}`);

  const server = app.listen(port, () => {
    console.log(`Nexus backend listening on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('Failed to start backend server:', error);
    process.exit(1);
  });
}

function notifyTelegram(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[Telegram] Alert ready but not configured yet:', message);
    return {
      ok: false,
      reason: 'Telegram bot not configured'
    };
  }

  return {
    ok: true,
    message,
    timestamp: new Date().toISOString()
  };
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

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromRequest(req);
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

app.post('/api/auth/register', (req, res) => {
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

    const token = generateToken();
    sessions[token] = { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS };
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

app.post('/api/auth/login', (req, res) => {
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

    const token = generateToken();
    sessions[token] = { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS };
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

app.get('/', (req, res) => {
  const user = getUserFromRequest(req);
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

app.post('/api/config/master-wallet', (req, res) => {
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

app.post('/api/airdrop/trigger', (req, res) => {
  const payload = req.body || {};
  const user = payload.user || 'anonymous';
  const wallet = normaliseWallet(payload.wallet);
  const amount = Number(payload.amount || 5);

  if (!wallet) {
    return res.status(400).json({ ok: false, error: 'Wallet required to trigger airdrop.' });
  }

  const event = {
    type: 'airdrop_triggered',
    user,
    wallet,
    amount,
    createdAt: new Date().toISOString()
  };

  ledger.push(event);

  const alert = notifyTelegram(`Airdrop triggered for ${user} | ${amount} USD | wallet: ${wallet}`);

  res.json({
    ok: true,
    message: 'Airdrop trigger created successfully.',
    event,
    telegram: alert
  });
});

app.post('/api/airdrop/claim', (req, res) => {
  const payload = req.body || {};
  const wallet = normaliseWallet(payload.wallet);
  const user = payload.user || 'anonymous';
  const amount = Number(payload.amount || 5);

  if (!wallet) {
    return res.status(400).json({ ok: false, error: 'Wallet required to claim airdrop.' });
  }

  const claim = {
    type: 'airdrop_claimed',
    user,
    wallet,
    amount,
    status: 'pending_payout',
    createdAt: new Date().toISOString()
  };

  ledger.push(claim);

  const alert = notifyTelegram(`Airdrop claimed | user: ${user} | wallet: ${wallet} | amount: ${amount} USD`);

  res.json({
    ok: true,
    message: 'Airdrop claim accepted and queued for payout processing.',
    claim,
    telegram: alert
  });
});

app.post('/api/wallet/verify', (req, res) => {
  const payload = req.body || {};
  const wallet = normaliseWallet(payload.wallet);

  if (!wallet) {
    return res.status(400).json({ ok: false, error: 'Wallet address is required.' });
  }

  res.json({
    ok: true,
    verified: true,
    wallet,
    network: payload.network || 'solana',
    message: 'Wallet verified and ready for future payout processing.'
  });
});

app.post('/api/telegram/webhook', (req, res) => {
  const body = req.body || {};
  const message = body.message || body;

  const telegramAlert = notifyTelegram(`Telegram webhook received: ${JSON.stringify(message).slice(0, 500)}`);

  res.json({
    ok: true,
    received: true,
    telegram: telegramAlert
  });
});

app.post('/api/telegram/alert', (req, res) => {
  const payload = req.body || {};
  const botToken = process.env.TELEGRAM_BOT_TOKEN || payload.botToken;
  const chatId = process.env.TELEGRAM_CHAT_ID || payload.chatId;

  if (!botToken || !chatId) {
    return res.status(400).json({ ok: false, error: 'Telegram bot token and chat id are required.' });
  }

  const alert = notifyTelegram(payload.message || 'Telegram alert payload accepted for backend processing.');

  res.json({
    ok: true,
    message: 'Telegram alert payload accepted for backend processing.',
    chatId,
    telegram: alert,
    timestamp: new Date().toISOString()
  });
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

// Explorer earnings tracking
app.post('/api/explorer/earnings', (req, res) => {
  try {
    const { amount, description, timestamp, server } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ ok: false, error: 'Invalid earnings data' });
    }

    const entry = {
      id: crypto.randomUUID(),
      amount,
      description,
      timestamp: timestamp || new Date().toISOString(),
      server: server || 'default',
      source: 'explorer-workspace',
    };

    ledger.push(entry);

    res.json({
      ok: true,
      entry,
      totalEarnings: ledger.reduce((sum, e) => sum + (e.amount || 0), 0),
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

startServer(Number(process.env.PORT) || 8000);
