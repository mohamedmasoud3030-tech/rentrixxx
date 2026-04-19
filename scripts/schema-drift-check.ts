import { supabaseData } from '../src/services/supabaseDataService';

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

async function main() {
  const rows = await supabaseData.fetchRecent<Record<string, unknown>>('contracts', 1);
  const sample = rows[0];

  if (!sample) {
    console.error('SCHEMA DRIFT DETECTED');
    console.error('No sample row found in contracts. Cannot compare actual columns.');
    process.exit(1);
  }

  const actualColumns = Object.keys(sample).map((key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`));
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
