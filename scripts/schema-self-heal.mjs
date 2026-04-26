const projectRef = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !token) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function fetchIssues() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/issues`, {
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Schema self-heal failed while fetching issues', res.status, body);
    process.exit(1);
  }

  const payload = await res.json();
  return Array.isArray(payload) ? payload : payload?.issues ?? [];
}

function buildFix(issue) {
  if (issue?.type === 'missing_column') {
    return {
      action: 'alter_view_fix_column',
      view: issue.view,
      column: issue.column,
      strategy: 'safe_select_fallback',
      idempotent: true,
      never_drop_data: true,
    };
  }

  if (issue?.type === 'schema_mismatch') {
    return {
      action: 'sync_schema_safe',
      idempotent: true,
      never_drop_data: true,
    };
  }

  if (issue?.type === 'view_dependency_error') {
    return {
      action: 'rebuild_view_safe',
      idempotent: true,
      never_drop_data: true,
    };
  }

  return null;
}

async function applyFix(issue, actionBody) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/fix`, {
    method: 'POST',
    headers,
    body: JSON.stringify(actionBody),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Schema self-heal fix failed', { issue, status: res.status, body });
    process.exit(1);
  }
}

async function runSelfHeal() {
  const issues = await fetchIssues();

  for (const issue of issues) {
    const actionBody = buildFix(issue);
    if (!actionBody) {
      console.log('SELF-HEAL SKIP', { reason: 'unsupported_issue_type', issueType: issue?.type ?? null });
      continue;
    }

    console.log('SELF-HEAL APPLY', { issueType: issue.type, action: actionBody.action });
    await applyFix(issue, actionBody);
  }

  console.log('Schema self-healing completed');
}

runSelfHeal().catch((err) => {
  console.error('Schema self-heal failed with unexpected error', err);
  process.exit(1);
});
