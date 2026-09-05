const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TRON_RPC_ENDPOINT',
  'GASFREE_API_KEY',
  'GASFREE_API_SECRET',
];

require('dotenv').config();

const missing = required.filter((name) => !process.env[name]);
console.log('Payout preflight');
console.log(`- Supabase service role: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'}`);
console.log(`- TRON RPC: ${process.env.TRON_RPC_ENDPOINT || 'missing'}`);
console.log(`- GasFree credentials: ${process.env.GASFREE_API_KEY && process.env.GASFREE_API_SECRET ? 'configured' : 'missing'}`);

if (missing.length) {
  console.error(`Missing configuration: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Configuration is present. No transaction was broadcast.');
  console.log('A live payout requires an audited signer, an explicit operator approval, and a provider-supported testnet or sandbox first.');
}
