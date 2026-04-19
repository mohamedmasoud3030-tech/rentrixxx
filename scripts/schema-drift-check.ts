import { createClient } from '@supabase/supabase-js';

const EXPECTED_FIELDS = [
  'id',
  'unit_id',
  'tenant_id',
  'rent_amount',
  'due_day',
  'start_date',
  'end_date',
  'deposit',
  'status',
  'sponsor_name',
  'sponsor_id',
  'sponsor_phone',
];

function readEnv(name: string, fallback?: string): string {
  const value = (process.env[name] || (fallback ? process.env[fallback] : '') || '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}${fallback ? ` (or ${fallback})` : ''}`);
  }
  return value;
}

async function main() {
  const supabaseUrl = readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('contracts').select('*').limit(1);

  if (error) {
    throw new Error(`Failed to read contracts sample row: ${error.message}`);
  }

  const sample = data?.[0] as Record<string, unknown> | undefined;
  if (!sample) {
    console.error('SCHEMA DRIFT DETECTED');
    console.error('No sample row found in contracts. Cannot compare actual columns.');
    process.exit(1);
  }

  const actualColumns = Object.keys(sample);
  const missingFields = EXPECTED_FIELDS.filter((field) => !actualColumns.includes(field));
  const extraFields = actualColumns.filter((field) => !EXPECTED_FIELDS.includes(field));

  if (missingFields.length > 0 || extraFields.length > 0) {
    console.error('SCHEMA DRIFT DETECTED');
    console.error('Missing fields:', missingFields.length ? missingFields.join(', ') : 'None');
    console.error('Extra fields:', extraFields.length ? extraFields.join(', ') : 'None');
    process.exit(1);
  }

  console.log('SCHEMA OK');
}

main().catch((err) => {
  console.error('SCHEMA DRIFT DETECTED');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
