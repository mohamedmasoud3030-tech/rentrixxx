#!/usr/bin/env node
import { existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const outputPath = '.tmp-schema-drift.sql';
const schemaList = 'public,auth,storage';

const runSupabase = (args) =>
  spawnSync('supabase', args, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

const versionCheck = runSupabase(['--version']);
if (versionCheck.error) {
  console.log('Skipping schema drift check because the Supabase CLI is not installed in this environment.');
  process.exit(0);
}

const diffResult = runSupabase(['db', 'diff', '--linked', '--schema', schemaList]);

if (diffResult.status !== 0) {
  const combinedOutput = `${diffResult.stdout}\n${diffResult.stderr}`.trim();

  const missingLinkContext =
    /not linked|run supabase link|cannot find project ref|config/i.test(combinedOutput) ||
    (!existsSync('supabase/config.toml') && !existsSync('.supabase'));

  if (missingLinkContext) {
    console.log('Skipping schema drift check because this workspace is not linked to a Supabase project.');
    console.log('Run `supabase link --project-ref <ref>` before using this command in a linked environment.');
    process.exit(0);
  }

  console.error('Schema drift check failed to execute.');
  if (combinedOutput) console.error(combinedOutput);
  process.exit(diffResult.status ?? 1);
}

const combinedOutput = `${diffResult.stdout}\n${diffResult.stderr}`;
const diffSql = combinedOutput
  .split(/\r?\n/)
  .filter((line) => {
    const normalized = line.trim();
    return normalized && !/^Diffing schemas:/i.test(normalized) && !/^Finished supabase db diff/i.test(normalized);
  })
  .join('\n')
  .trim();

if (!diffSql) {
  console.log(`No schema drift detected for schemas: ${schemaList}.`);
  process.exit(0);
}

try {
  rmSync(outputPath, { force: true });
} catch {
  // no-op
}

console.error(`Schema drift detected for schemas: ${schemaList}.`);
console.error(diffSql.slice(0, 4000));
process.exit(1);
