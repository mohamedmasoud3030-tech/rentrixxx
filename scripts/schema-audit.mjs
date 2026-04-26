const projectRef = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !token) {
  console.error('Missing env vars');
  process.exit(1);
}

async function runAudit() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/schema`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Schema audit failed', res.status, body);
    process.exit(1);
  }

  const schema = await res.json();
  const views = Array.isArray(schema?.views) ? schema.views : [];
  let missingCount = 0;
  const brokenViewCount = Number(schema?.broken_view_definitions ?? 0);
  const schemaDriftCount = Number(schema?.schema_drift_count ?? 0);

  for (const view of views) {
    const expected = Array.isArray(view?.expected_columns) ? view.expected_columns : [];
    const actual = Array.isArray(view?.actual_columns) ? view.actual_columns : [];

    for (const col of expected) {
      if (!actual.includes(col)) {
        missingCount += 1;
        console.log(`MISSING COLUMN: ${col} in ${view?.name ?? 'unknown_view'}`);
      }
    }
  }

  const totalIssues = missingCount + brokenViewCount + schemaDriftCount;
  console.log(
    `Schema audit completed: missing_columns=${missingCount}, broken_views=${brokenViewCount}, schema_drift=${schemaDriftCount}`
  );

  if (totalIssues > 0) {
    console.error('Schema audit mismatch detected; failing fast before apply phase');
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Schema audit failed with unexpected error', err);
  process.exit(1);
});
