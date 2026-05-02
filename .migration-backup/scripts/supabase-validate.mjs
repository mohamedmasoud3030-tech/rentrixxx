const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef) {
  console.error('VALIDATION FAILED: SUPABASE_PROJECT_REF is required');
  process.exit(1);
}

if (!accessToken) {
  console.error('VALIDATION FAILED: SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

async function validate() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/validate`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('VALIDATION FAILED: non-2xx response', { status: res.status, bodyLength: text.length });
    process.exit(1);
  }

  const data = await res.json();
  if (!data?.ok) {
    const issuesCount = Array.isArray(data?.issues) ? data.issues.length : 0;
    console.error('VALIDATION FAILED', { issuesCount });
    process.exit(1);
  }

  console.log('Supabase validation passed');
}

validate().catch((err) => {
  console.error('VALIDATION FAILED: unexpected error', { message: err instanceof Error ? err.message : 'unknown_error' });
  process.exit(1);
});
