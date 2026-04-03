import { execSync } from 'node:child_process';

const requiredEnv = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_PROJECT_REF'];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`❌ Missing required env vars for schema drift check: ${missing.join(', ')}`);
  process.exit(1);
}

let output = '';
try {
  output = execSync('npx supabase db diff --linked --schema public', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  console.error('❌ Failed to run `supabase db diff --linked --schema public`.');
  if (error.stderr) {
    console.error(String(error.stderr));
  }
  process.exit(1);
}

if (output.length > 0) {
  console.error('❌ Schema drift detected. Supabase CLI produced non-empty diff output.');
  console.error(output);
  process.exit(1);
}

console.log('✅ No schema drift detected.');
