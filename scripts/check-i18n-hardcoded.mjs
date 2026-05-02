import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('src/**/*.{tsx,ts,jsx,js}', { nodir: true, exclude: ['**/*.test.*', '**/__tests__/**'] });
const issues = [];
const textRegex = />\s*([^<{\n][^<{\n]{1,120})\s*</g;
const attrRegex = /\b(placeholder|title|aria-label|label)=(["'])([^"']*[\u0600-\u06FFA-Za-z][^"']*)\2/g;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const re of [textRegex, attrRegex]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      const raw = (re === textRegex ? m[1] : m[3]).trim();
      if (!raw || raw.startsWith('{') || raw.includes('http')) continue;
      if (!/[\u0600-\u06FFA-Za-z]/.test(raw)) continue;
      const line = content.slice(0, m.index).split('\n').length;
      issues.push(`${file}:${line}:${raw}`);
    }
  }
}
issues.sort();

const baselinePath = 'scripts/i18n-hardcoded-baseline.txt';
const update = process.argv.includes('--update-baseline');
if (update) {
  writeFileSync(baselinePath, issues.join('\n') + '\n');
  console.log(`Updated baseline with ${issues.length} entries.`);
  process.exit(0);
}
const baseline = readFileSync(baselinePath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const baseSet = new Set(baseline);
const added = issues.filter((x) => !baseSet.has(x));
if (added.length) {
  console.error('New hardcoded UI strings detected:');
  added.slice(0, 50).forEach((i) => console.error(` - ${i}`));
  process.exit(1);
}
console.log(`No new hardcoded UI strings. Checked ${issues.length} instances against baseline.`);
