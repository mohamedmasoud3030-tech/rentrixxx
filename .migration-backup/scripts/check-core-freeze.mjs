import { execSync } from 'node:child_process';

const FROZEN_FILES = new Set([
  'src/services/accountingDocuments/AccountingDocumentEngine.ts',
  'src/services/accountingDocuments/DocumentLifecycle.ts',
  'src/services/ledger/LedgerEngine.ts',
  'src/services/audit/AuditTrail.ts',
  'src/services/reports/ReportEngine.ts',
  'src/services/reports/ReportSnapshotManager.ts',
  'src/services/documents/DocumentController.ts',
  'src/services/documents/DocumentRenderer.ts',
  'src/services/documents/DocumentEngine.ts',
  'src/services/documents/TableGenerator.ts',
]);

const ALLOW_OVERRIDE = process.env.ALLOW_CORE_CHANGES === '1';

const output = execSync('git diff --name-only --', { encoding: 'utf-8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const touchedFrozenFiles = output.filter((file) => FROZEN_FILES.has(file));

if (touchedFrozenFiles.length > 0 && !ALLOW_OVERRIDE) {
  console.error('❌ Product freeze violation: frozen core files were modified.');
  touchedFrozenFiles.forEach((file) => console.error(` - ${file}`));
  console.error('If this is an approved hotfix, run with ALLOW_CORE_CHANGES=1.');
  process.exit(1);
}

console.log('✅ Freeze check passed.');
