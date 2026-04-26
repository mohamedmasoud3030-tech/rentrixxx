import { createClient } from '@supabase/supabase-js';

type ContractRow = Record<string, unknown>;

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
] as const;

function resolveEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toSnakeCaseColumns(sample: ContractRow): string[] {
  return Object.keys(sample).map((key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`));
}

async function main(): Promise<void> {
  const supabaseUrl = resolveEnv('SUPABASE_URL');
  const supabaseAnonKey = resolveEnv('SUPABASE_ANON_KEY');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.from('contracts').select('*').limit(1);

  if (error) {
    throw new Error(`Failed to fetch contracts sample: ${error.message}`);
  }

  const sample = data?.[0] as ContractRow | undefined;

  if (!sample) {
    throw new Error('No sample row found in contracts. Cannot compare actual columns.');
  }

  const actualColumns = toSnakeCaseColumns(sample);
  const missingFields = EXPECTED_FIELDS.filter((field) => !actualColumns.includes(field));
  const extraFields = actualColumns.filter((field) => !EXPECTED_FIELDS.includes(field as (typeof EXPECTED_FIELDS)[number]));

  if (missingFields.length > 0 || extraFields.length > 0) {
    console.error('SCHEMA DRIFT DETECTED');
    console.error('Missing fields:', missingFields.length ? missingFields.join(', ') : 'None');
    console.error('Extra fields:', extraFields.length ? extraFields.join(', ') : 'None');
    process.exit(1);
  }

  console.log('SCHEMA OK');
}

main().catch((err: unknown) => {
  console.error('SCHEMA DRIFT DETECTED');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
