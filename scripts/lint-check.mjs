import fs from 'node:fs';
import path from 'node:path';

const tsDebtTargets = [
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

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const CLASSNAME_ATTR_RE = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([\s\S]*?)`\})/g;
const INLINE_STYLE_RE = /style\s*=\s*\{\{([\s\S]*?)\}\}/g;
const ALLOW_HEX_MARKER = 'lint-rx-allow-hex';

const DESIGN_TOKEN_GUARD_EXCEPTIONS = {
  // Print templates may require fixed colors for print fidelity.
  printPathPattern: /src\/components\/print\//,
  // Rare utility/legacy files with tracked debt until token migration.
  inlineStyleFileAllowlist: new Set([
    'src/components/settings/AppearanceSettings.tsx',
    'src/components/shared/DocumentHeader.tsx',
  ]),
};

let hasError = false;

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.tmp-tests') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, fileList);
      continue;
    }

    if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function getLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function hasAllowMarker(line) {
  return line.includes(ALLOW_HEX_MARKER);
}

function isPrintUtilityClass(classValue) {
  return classValue.includes('print:');
}

function runTypeDebtChecks() {
  for (const file of tsDebtTargets) {
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
}

function runDesignTokenGuard() {
  const files = walk('src');

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    let classMatch;
    while ((classMatch = CLASSNAME_ATTR_RE.exec(content)) !== null) {
      const classValue = classMatch[1] ?? classMatch[2] ?? classMatch[3] ?? '';
      const foundHex = classValue.match(HEX_COLOR_RE);
      if (!foundHex) continue;

      const lineNumber = getLineNumber(content, classMatch.index);
      const line = lines[lineNumber - 1] ?? '';

      if (hasAllowMarker(line) || isPrintUtilityClass(classValue) || DESIGN_TOKEN_GUARD_EXCEPTIONS.printPathPattern.test(file)) continue;

      console.error(
        [
          `${file}:${lineNumber} Design token guard violation: hardcoded hex color in className (${foundHex.join(', ')}).`,
          'Use token classes like bg-rx-*, text-rx-*, border-rx-* or CSS variables (var(--rx-*)).',
          `If unavoidable (rare utility/print), add an inline exception marker: /* ${ALLOW_HEX_MARKER}: reason */.`,
        ].join(' '),
      );
      hasError = true;
    }

    let styleMatch;
    while ((styleMatch = INLINE_STYLE_RE.exec(content)) !== null) {
      const styleValue = styleMatch[1] ?? '';
      const foundHex = styleValue.match(HEX_COLOR_RE);
      if (!foundHex) continue;

      const lineNumber = getLineNumber(content, styleMatch.index);
      const line = lines[lineNumber - 1] ?? '';
      const prevLine = lines[lineNumber - 2] ?? '';

      if (
        hasAllowMarker(line)
        || hasAllowMarker(prevLine)
        || DESIGN_TOKEN_GUARD_EXCEPTIONS.printPathPattern.test(file)
        || DESIGN_TOKEN_GUARD_EXCEPTIONS.inlineStyleFileAllowlist.has(file)
      ) continue;

      console.error(
        [
          `${file}:${lineNumber} Design token guard violation: hardcoded hex color in inline style (${foundHex.join(', ')}).`,
          'Use CSS variables (var(--rx-*)) or token-based classNames (bg-rx-*, text-rx-*, border-rx-*).',
          `If unavoidable (rare utility/print), add an inline exception marker: /* ${ALLOW_HEX_MARKER}: reason */.`,
        ].join(' '),
      );
      hasError = true;
    }
  }
}

runTypeDebtChecks();
runDesignTokenGuard();

if (hasError) process.exit(1);
console.log('Custom lint checks passed.');
