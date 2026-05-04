#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'];
export const IMPORT_TARGET_EXTENSIONS = [...SOURCE_EXTENSIONS, '.css', '.scss', '.sass', '.less'];
export const IMPORT_RE = /from\s+['\"]([^'\"]+)['\"]|import\s+['\"]([^'\"]+)['\"]|import\(['\"]([^'\"]+)['\"]\)/g;

function normalize(p) {
  return p.replace(/\\/g, '/');
}

export function walk(dir, ignoreNames = ['node_modules', '.git', '.migration-backup'], acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreNames.includes(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, ignoreNames, acc);
    else acc.push(abs);
  }
  return acc;
}


function findCaseInsensitivePath(absPath) {
  if (fs.existsSync(absPath)) return absPath;
  const dir = path.dirname(absPath);
  if (dir === absPath) return null;
  const realDir = findCaseInsensitivePath(dir);
  if (!realDir || !fs.existsSync(realDir) || !fs.statSync(realDir).isDirectory()) return null;
  const base = path.basename(absPath);
  const match = fs.readdirSync(realDir).find((entry) => entry.toLowerCase() === base.toLowerCase());
  return match ? path.join(realDir, match) : null;
}

export function resolveImportFile(rootDir, fromFileRel, specifier, srcRoot = 'artifacts/rentrix/src') {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const fromAbs = path.join(rootDir, fromFileRel);
  const base = specifier.startsWith('@/')
    ? path.join(rootDir, srcRoot, specifier.slice(2))
    : path.resolve(path.dirname(fromAbs), specifier);

  const candidates = [
    base,
    ...IMPORT_TARGET_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...IMPORT_TARGET_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    const resolved = fs.existsSync(candidate) ? candidate : findCaseInsensitivePath(candidate);
    if (resolved && fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return fs.realpathSync.native(resolved);
  }
  return null;
}

export function expectedSpecifier(rootDir, fromFileRel, resolvedAbs, originalSpecifier, sourceRootRel = 'artifacts/rentrix/src') {
  const ext = path.extname(resolvedAbs);
  let noExtAbs = resolvedAbs.slice(0, -ext.length);
  const specHasExt = /\.[^\/]+$/.test(originalSpecifier);
  const specWantsIndex = /\/index(\.[^\/]+)?$/.test(originalSpecifier);
  if (!specWantsIndex && noExtAbs.endsWith(`${path.sep}index`)) noExtAbs = noExtAbs.slice(0, -(`${path.sep}index`).length);
  const targetAbs = specHasExt ? noExtAbs + ext : noExtAbs;

  const resolvedRel = normalize(path.relative(rootDir, targetAbs));
  const sourceRootPrefix = `${normalize(sourceRootRel)}/`;
  if (originalSpecifier.startsWith('@/') && resolvedRel.startsWith(sourceRootPrefix)) {
    return `@/${resolvedRel.slice(sourceRootPrefix.length)}`;
  }

  const rel = normalize(path.relative(path.dirname(path.join(rootDir, fromFileRel)), targetAbs));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

export function runCasingCheck({
  rootDir = process.cwd(),
  scanRoots = ['artifacts/rentrix/src'],
  enforceLowercaseDirs = ['artifacts/rentrix/src/components/ui'],
} = {}) {
  const errors = [];
  const files = scanRoots
    .flatMap((dir) => walk(path.join(rootDir, dir)))
    .filter((file) => SOURCE_EXTENSIONS.includes(path.extname(file)));

  const lowerCollisionMap = new Map();
  for (const file of files) {
    const rel = normalize(path.relative(rootDir, file));
    const key = rel.toLowerCase();
    const existing = lowerCollisionMap.get(key) ?? [];
    existing.push(rel);
    lowerCollisionMap.set(key, existing);
  }

  for (const rels of lowerCollisionMap.values()) {
    if (rels.length > 1) errors.push(`Case-conflict files: ${rels.join(' <> ')}`);
  }

  for (const dir of enforceLowercaseDirs) {
    const dirFiles = walk(path.join(rootDir, dir)).filter((file) => SOURCE_EXTENSIONS.includes(path.extname(file)));
    for (const file of dirFiles) {
      const rel = normalize(path.relative(rootDir, file));
      if (/[A-Z]/.test(path.basename(rel))) errors.push(`Non-lowercase filename: ${rel}`);
    }
  }

  for (const file of files) {
    const fromRel = normalize(path.relative(rootDir, file));
    const text = fs.readFileSync(file, 'utf8');

    let match;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(text))) {
      const specifier = match[1] || match[2] || match[3];
      const resolved = resolveImportFile(rootDir, fromRel, specifier);
      if (!resolved) continue;

      const expected = expectedSpecifier(rootDir, fromRel, resolved, specifier);
      if (specifier.toLowerCase() === expected.toLowerCase() && specifier !== expected) {
        errors.push(`Import case mismatch in ${fromRel}: '${specifier}' -> '${expected}'`);
      }
    }
  }

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = runCasingCheck();
  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log('Import path casing check passed.');
}
