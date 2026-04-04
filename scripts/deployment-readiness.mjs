const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const optionalVars = [
  'VITE_ERROR_TRACKER_DSN',
  'VITE_LOG_LEVEL',
  'VITE_RELEASE_VERSION',
];

const placeholderPatterns = [/changeme/i, /placeholder/i, /^test$/i, /^your[_-]?/i];

const isInvalid = (value) => {
  if (!value || !value.trim()) return true;
  return placeholderPatterns.some(pattern => pattern.test(value.trim()));
};

const strict = process.argv.includes('--strict');
let hasErrors = false;

for (const key of requiredVars) {
  const value = process.env[key] || '';
  if (isInvalid(value)) {
    hasErrors = true;
    console.error(`❌ Required env missing or placeholder: ${key}`);
  } else {
    console.log(`✅ Required env set: ${key}`);
  }
}

for (const key of optionalVars) {
  const value = process.env[key] || '';
  if (!value) {
    console.warn(`⚠️ Optional env not set: ${key}`);
  } else if (isInvalid(value)) {
    console.warn(`⚠️ Optional env looks like placeholder: ${key}`);
  } else {
    console.log(`✅ Optional env set: ${key}`);
  }
}

console.log('\nRollback strategy checklist:');
console.log('1) Keep previous deployment artifact and release tag.');
console.log('2) Database migrations must be backward-compatible and reversible.');
console.log('3) If errors spike, redeploy previous stable tag and disable risky feature flags.');

if (hasErrors && strict) {
  process.exit(1);
}
