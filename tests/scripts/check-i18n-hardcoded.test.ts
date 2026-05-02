import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

describe('check-i18n-hardcoded script', () => {
  it('fails only when new hardcoded strings are added beyond baseline', () => {
    const dir = mkdtempSync(join(tmpdir(), 'i18n-guard-'));
    mkdirSync(join(dir, 'src/ui'), { recursive: true });
    mkdirSync(join(dir, 'scripts'), { recursive: true });

    copyFileSync('scripts/check-i18n-hardcoded.mjs', join(dir, 'scripts/check-i18n-hardcoded.mjs'));
    writeFileSync(join(dir, 'src/ui/Comp.tsx'), '<div>مرحبا</div>\n');
    writeFileSync(join(dir, 'scripts/i18n-hardcoded-baseline.txt'), 'src/ui/Comp.tsx:1:مرحبا\n');

    const first = spawnSync('node', ['scripts/check-i18n-hardcoded.mjs'], { cwd: dir, encoding: 'utf8' });
    expect(first.status).toBe(0);
    expect(first.stdout).toContain('No new hardcoded UI strings');

    writeFileSync(join(dir, 'src/ui/Comp.tsx'), '<div>مرحبا</div>\n<div>نص جديد</div>\n');
    const second = spawnSync('node', ['scripts/check-i18n-hardcoded.mjs'], { cwd: dir, encoding: 'utf8' });
    expect(second.status).toBe(1);
    expect(second.stderr).toContain('New hardcoded UI strings detected');
  });
});
