const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef) {
  console.error('AUTO-FIX FAILED: SUPABASE_PROJECT_REF is required');
  process.exit(1);
}

if (!accessToken) {
  console.error('AUTO-FIX FAILED: SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};

async function autoFix() {
  const issuesRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/issues`, {
    headers,
  });

  if (!issuesRes.ok) {
    const text = await issuesRes.text();
    console.error('AUTO-FIX FAILED: unable to fetch issues', issuesRes.status, text);
    process.exit(1);
  }

  const issuesPayload = await issuesRes.json();
  const issues = Array.isArray(issuesPayload) ? issuesPayload : issuesPayload?.issues ?? [];

  for (const issue of issues) {
    let actionBody = null;
    if (issue?.type === 'missing_table') {
      actionBody = { action: 'create_table_if_not_exists', table: issue.table, idempotent: true };
    } else if (issue?.type === 'schema_mismatch') {
      actionBody = { action: 'sync_schema', idempotent: true };
    } else if (issue?.type === 'rls_violation') {
      actionBody = { action: 'repair_rls', table: issue.table, idempotent: true };
    }

    if (!actionBody) {
      console.log('AUTO-FIX SKIPPED', { reason: 'unsupported_issue_type', issueType: issue?.type ?? null });
      continue;
    }

    console.log('AUTO-FIX APPLY', { issueType: issue.type, action: actionBody.action, table: issue.table ?? null });

    const fixRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/fix`, {
      method: 'POST',
      headers,
      body: JSON.stringify(actionBody),
    });

    if (!fixRes.ok) {
      const text = await fixRes.text();
      console.error('AUTO-FIX FAILED', { issue, status: fixRes.status, body: text });
      process.exit(1);
    }
  }

  console.log('Auto-fix completed safely');
}

autoFix().catch((err) => {
  console.error('AUTO-FIX FAILED: unexpected error', err);
  process.exit(1);
});
