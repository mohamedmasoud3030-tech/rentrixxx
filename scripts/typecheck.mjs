import fs from 'node:fs';

const requiredFiles = [
  'tsconfig.typecheck.json',
  'src/constants/status.ts',
  'src/utils/status.ts',
  'src/utils/validation.ts',
  'src/services/auditEngine.ts',
  'src/config/env.ts',
  'src/services/errorTracker.ts',
  'src/contexts/authContext.tsx',
  'src/contexts/financeContext.tsx',
  'src/contexts/operationsContext.tsx',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing required file for staged type checks: ${file}`);
    process.exit(1);
  }
}

console.log(`Staged typecheck prerequisites verified (${requiredFiles.length} files).`);
