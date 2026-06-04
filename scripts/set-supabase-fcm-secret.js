const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRef = process.env.SUPABASE_PROJECT_REF || 'kbudyhgugehbdgoaofiv';
const inputPath =
  process.argv[2] ||
  process.env.FIREBASE_ADMIN_SDK_JSON_PATH ||
  '';

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!inputPath) {
  fail(
    'Usage: npm run supabase:set-fcm-secret -- "C:\\path\\to\\firebase-adminsdk.json"\n' +
      'Or set FIREBASE_ADMIN_SDK_JSON_PATH before running this script.'
  );
}

const resolvedInputPath = path.resolve(inputPath);
if (!fs.existsSync(resolvedInputPath)) {
  fail(`Firebase Admin SDK JSON file not found: ${resolvedInputPath}`);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(resolvedInputPath, 'utf8'));
} catch (error) {
  fail(`Firebase Admin SDK JSON could not be parsed: ${error.message}`);
}

if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
  fail('Firebase Admin SDK JSON is missing project_id, client_email, or private_key.');
}

const tempEnvPath = path.join(os.tmpdir(), `kir-fcm-secret-${Date.now()}.env`);
try {
  const minified = JSON.stringify(serviceAccount);
  fs.writeFileSync(tempEnvPath, `FCM_SERVICE_ACCOUNT_JSON=${minified}\n`, { encoding: 'utf8' });

  console.log(`Setting FCM_SERVICE_ACCOUNT_JSON for Supabase project ${projectRef}.`);
  console.log(`SUPABASE_ACCESS_TOKEN present: ${Boolean(process.env.SUPABASE_ACCESS_TOKEN)}`);

  const command = process.platform === 'win32'
    ? 'cmd.exe'
    : 'npx';
  const args = process.platform === 'win32'
    ? [
        '/d',
        '/s',
        '/c',
        [
          'npx',
          'supabase',
          'secrets',
          'set',
          '--env-file',
          tempEnvPath,
          '--project-ref',
          projectRef,
        ].join(' '),
      ]
    : ['supabase', 'secrets', 'set', '--env-file', tempEnvPath, '--project-ref', projectRef];

  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: process.env,
    shell: false,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.error) {
    console.error(`Supabase CLI spawn error: ${result.error.message}`);
  }
  if (result.stderr) {
    const sanitizedStderr = result.stderr
      .replace(/sbp_[A-Za-z0-9_-]+/g, 'sbp_***')
      .replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----***-----END PRIVATE KEY-----');
    process.stderr.write(sanitizedStderr);
  }

  if (result.status !== 0) {
    fail(
      `Failed to set FCM_SERVICE_ACCOUNT_JSON for Supabase project ${projectRef}. CLI exit code: ${result.status}. ` +
        'If `npx supabase login --token ...` reports success but this still fails, set SUPABASE_ACCESS_TOKEN ' +
        'in the same PowerShell session and rerun this script.'
    );
  }

  console.log(`FCM_SERVICE_ACCOUNT_JSON set for Supabase project ${projectRef}.`);
} finally {
  fs.rmSync(tempEnvPath, { force: true });
}
