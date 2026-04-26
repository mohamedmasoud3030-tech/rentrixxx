const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const allowDestructiveFixes = process.env.SUPABASE_ALLOW_DESTRUCTIVE_FIXES === 'true';

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

const buildAction = (issue) => {
  switch (issue?.type) {
    case 'missing_table':
      return {
        action: 'create_table_if_not_exists',
        table: issue.table,
        idempotent: true,
      };
    case 'column_mismatch':
      return {
        action: 'alter_table_add_column',
        table: issue.table,
        column: issue.column,
        idempotent: true,
      };
    case 'type_mismatch':
      return {
        action: 'alter_column_type_safe_cast',
        table: issue.table,
        column: issue.column,
        targetType: issue.targetType,
        idempotent: true,
      };
    case 'rls_violation':
      return {
        action: 'repair_rls_policy',
        table: issue.table,
        idempotent: true,
      };
    case 'constraint_error':
      if (!allowDestructiveFixes) {
        return null;
      }
      return {
        action: 'drop_if_exists_recreate_safe',
        table: issue.table,
        constraint: issue.constraint,
        idempotent: true,
      };
    case 'schema_mismatch':
      return {
        action: 'sync_schema',
        idempotent: true,
      };
    default:
      return null;
  }
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
    const actionBody = buildAction(issue);
    if (!actionBody) {
      console.log('AUTO-FIX SKIPPED', { reason: 'unsupported_or_disallowed', issue });
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

  console.log('Auto-fix completed');
}

autoFix().catch((err) => {
  console.error('AUTO-FIX FAILED: unexpected error', err);
  process.exit(1);
});
