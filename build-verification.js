const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const requiredFiles = [
  'index.html',
  'auth-login.html',
  'explorer-workspace.html',
  'explorer-workspace.js',
  'styles.css',
  'server.js'
];

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required runtime file: ${file}`);
  }
}

for (const file of ['server.js', 'explorer-workspace.js', 'deployment-verification.js']) {
  execFileSync(process.execPath, ['--check', path.join(__dirname, file)], { stdio: 'inherit' });
}

const sourceFiles = ['package.json', 'server.js', '.env.example', 'render.yaml'];
const forbiddenSecretPatterns = [
  /(?:AQ\.[A-Za-z0-9_-]{20,}|sk-or-v1-[A-Za-z0-9_-]{20,})/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'](?!your-)[^"']+/,
  /(?:TELEGRAM_BOT_TOKEN|ADMIN_API_KEY|SESSION_SECRET)\s*=\s*["'](?!your-)[^"']+/,
  /botToken\s*[,}]/
];

for (const file of sourceFiles) {
  const contents = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const pattern of forbiddenSecretPatterns) {
    if (pattern.test(contents)) {
      throw new Error(`Potential secret or credential leak found in ${file}`);
    }
  }
}

console.log(`Build verification passed: ${requiredFiles.length} runtime files and ${sourceFiles.length} configuration files checked.`);
