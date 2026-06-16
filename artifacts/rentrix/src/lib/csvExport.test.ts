import { describe, expect, it } from 'vitest';
import { buildCsv, CSV_UTF8_BOM, escapeCsvValue, withUtf8Bom } from './csvExport';

describe('csvExport', () => {
  it('neutralizes formula-leading text values', () => {
    expect(escapeCsvValue('=SUM(1,1)')).toBe('"\'=SUM(1,1)"');
    expect(escapeCsvValue(' -10')).toBe('"\' -10"');
    expect(escapeCsvValue('@tenant')).toBe('"\'@tenant"');
  });

  it('builds sorted-key CSV and preserves a UTF-8 BOM wrapper', () => {
    expect(buildCsv([{ name: 'مستأجر', amount: 5 }])).toBe('amount,name\n5,"مستأجر"');
    expect(withUtf8Bom('a,b')).toBe(`${CSV_UTF8_BOM}a,b`);
  });
});
