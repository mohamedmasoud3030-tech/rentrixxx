import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const targets = ['core/contracts/**/*.ts', 'src/utils/invoices/**/*.ts'];

// Temporary allowlist for remaining files while migrating.
const allowlist = new Set([]);

const offenders = [];
for (const pattern of targets) {
  for (const file of globSync(pattern)) {
    if (allowlist.has(file)) continue;
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (/\bany\b/.test(line)) {
        offenders.push(`${file}:${idx + 1}: contains explicit any`);
      }
    });
  }
}

if (offenders.length) {
  console.error('Found explicit any in protected paths:\n' + offenders.join('\n'));
  process.exit(1);
}

console.log('No explicit any found in protected paths.');
