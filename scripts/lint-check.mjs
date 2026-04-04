import fs from 'node:fs';

const targets = [
  'src/contexts/AppContext.tsx',
  'src/components/reports/ReportsDashboard.tsx',
  'src/services/auditEngine.ts',
  'src/services/supabaseDataService.ts',
];
const anyThresholds = {
  'src/contexts/AppContext.tsx': 0,
  'src/components/reports/ReportsDashboard.tsx': 40,
  'src/services/auditEngine.ts': 0,
};

let hasError = false;

for (const file of targets) {
  const content = fs.readFileSync(file, 'utf8');
  const anyMatches = content.match(/\bany\b/g)?.length ?? 0;
  const hasNoCheck = content.includes('@ts-nocheck');

  if (hasNoCheck && file !== 'src/services/supabaseDataService.ts') {
    console.error(`TS-NOCHECK found in ${file}`);
    hasError = true;
  }

  if (file !== 'src/services/supabaseDataService.ts' && anyMatches > (anyThresholds[file] ?? 0)) {
    console.error(`Unexpected any usage in ${file}: ${anyMatches}`);
    hasError = true;
  }
  if (file !== 'src/services/supabaseDataService.ts' && anyMatches > 0 && anyMatches <= (anyThresholds[file] ?? 0)) {
    console.log(`Info: ${file} has acceptable temporary any usage (${anyMatches}).`);
  }

  if (file === 'src/services/supabaseDataService.ts') {
    console.log(`Info: ${file} still has gradual migration debt (tracked).`);
  }
}

if (hasError) process.exit(1);
console.log('Custom lint checks passed.');
