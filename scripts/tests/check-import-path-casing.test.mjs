import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import { runCasingCheck, resolveImportFile, expectedSpecifier } from '../check-import-path-casing.mjs';

function mkRepo(setup) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'case-check-'));
  setup(root);
  return root;
}
function write(root, rel, content = '') {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

test('detects case-conflict files', () => {
  const root = mkRepo((r) => {
    write(r, 'artifacts/rentrix/src/components/ui/card.tsx', 'export const A = 1');
    write(r, 'artifacts/rentrix/src/components/ui/Card.tsx', 'export const B = 2');
  });
  const errors = runCasingCheck({ rootDir: root });
  assert(errors.some((e) => e.includes('Case-conflict files')));
});

test('flags non-lowercase filenames in enforced directories', () => {
  const root = mkRepo((r) => {
    write(r, 'artifacts/rentrix/src/components/ui/Button.tsx', 'export default 1');
  });
  const errors = runCasingCheck({ rootDir: root });
  assert(errors.some((e) => e.includes('Non-lowercase filename')));
});

test('flags alias and relative import casing mismatches', () => {
  const root = mkRepo((r) => {
    write(r, 'artifacts/rentrix/src/components/ui/card.tsx', 'export const Card = 1');
    write(r, 'artifacts/rentrix/src/ui/page.tsx', "import { Card } from '@/components/ui/Card';\nimport { Card as C2 } from '../components/ui/Card';");
  });
  const errors = runCasingCheck({ rootDir: root });
  assert.equal(errors.filter((e) => e.includes('Import case mismatch')).length, 2);
});

test('resolution handles extensionless and index imports', () => {
  const root = mkRepo((r) => {
    write(r, 'artifacts/rentrix/src/lib/utils/index.ts', 'export const x = 1');
    write(r, 'artifacts/rentrix/src/ui/page.tsx', 'export const y = 1');
  });
  const resolved = resolveImportFile(root, 'artifacts/rentrix/src/ui/page.tsx', '../lib/utils');
  assert.ok(resolved);
  const expected = expectedSpecifier(root, 'artifacts/rentrix/src/ui/page.tsx', resolved, '../lib/utils');
  assert.equal(expected, '../lib/utils');
});
