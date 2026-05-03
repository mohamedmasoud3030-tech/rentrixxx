/**
 * verify-hook.mjs — Post-activation runbook check for the Custom Access Token Hook
 *
 * After enabling the hook in the Supabase dashboard, run this script to confirm
 * that newly issued tokens carry app_metadata.user_role as expected.
 *
 * Usage:
 *   node scripts/verify-hook.mjs <supabase_access_token>
 *
 * Where <supabase_access_token> is a raw JWT from an active Supabase session.
 * You can get one from:
 *   - The browser: open DevTools → Application → Local Storage → supabase.auth.token
 *     and copy the access_token field.
 *   - The Rentrix app: add a temporary console.log(session.access_token) after sign-in.
 *
 * What this checks:
 *   - Decodes the token WITHOUT verifying the signature (safe for inspection only)
 *   - Prints the app_metadata section
 *   - Exits 0 if app_metadata.user_role is present (hook is active)
 *   - Exits 1 with a diagnostic if user_role is missing (hook not yet activated)
 *
 * This does NOT require any secrets — it only base64-decodes the JWT payload.
 */

const token = process.argv[2];

if (!token) {
  console.error(
    'Usage: node scripts/verify-hook.mjs <supabase_access_token>\n\n' +
    'Provide a raw JWT from an active Supabase session.\n' +
    'Obtain one from the browser DevTools → Local Storage → supabase.auth.token → access_token'
  );
  process.exit(2);
}

// Decode JWT payload without signature verification (inspection only)
function decodeJwtPayload(jwt) {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new Error('Not a valid JWT (expected 3 dot-separated parts)');
  }
  const payload = parts[1];
  // Re-pad base64url to standard base64
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    payload.length + (4 - (payload.length % 4)) % 4, '='
  );
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

let payload;
try {
  payload = decodeJwtPayload(token);
} catch (err) {
  console.error(`Failed to decode token: ${err.message}`);
  process.exit(2);
}

const appMetadata = payload.app_metadata ?? {};
const userRole    = appMetadata.user_role;
const sub         = payload.sub ?? '(unknown)';
const exp         = payload.exp ? new Date(payload.exp * 1000).toISOString() : '(none)';
const isExpired   = payload.exp ? Date.now() / 1000 > payload.exp : false;

console.log('\n=== Supabase Hook Verification ===\n');
console.log(`  Subject (user id): ${sub}`);
console.log(`  Expires at:        ${exp}${isExpired ? '  ⚠️  EXPIRED' : ''}`);
console.log(`  app_metadata:      ${JSON.stringify(appMetadata, null, 4).replace(/\n/g, '\n                     ')}`);
console.log('');

if (isExpired) {
  console.warn('⚠️  Warning: this token is expired. Use a fresh session token for an accurate check.\n');
}

if (userRole === 'ADMIN' || userRole === 'USER') {
  console.log(`✅  Hook is ACTIVE — app_metadata.user_role = "${userRole}"`);
  console.log('    The API server will enforce this role on all protected routes.\n');
  process.exit(0);
} else if (userRole !== undefined) {
  console.warn(`⚠️  app_metadata.user_role is present but has an unexpected value: "${userRole}"`);
  console.warn('    Check that public.profiles.role contains only "ADMIN" or "USER".\n');
  process.exit(1);
} else {
  console.error('❌  Hook is NOT ACTIVE — app_metadata.user_role is absent from this token.');
  console.error('');
  console.error('    To activate the hook, go to:');
  console.error('    Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook');
  console.error('    URI: pg-functions://postgres/public/custom_access_token_hook');
  console.error('');
  console.error('    After activation, sign out and sign back in to get a fresh token,');
  console.error('    then re-run this script.\n');
  process.exit(1);
}
