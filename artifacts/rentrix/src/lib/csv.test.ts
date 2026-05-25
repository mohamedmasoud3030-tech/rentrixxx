import { describe, expect, it } from 'vitest';
import { buildCsv, escapeCsvCell } from './csv';

describe('csv helpers', () => {
  it('escapes quotes, commas, and new lines', () => {
    expect(escapeCsvCell('A "quoted", value')).toBe('"A ""quoted"", value"');
    expect(escapeCsvCell('line 1\nline 2')).toBe('"line 1\nline 2"');
  });

  it('neutralizes formula-like cells without converting negative numbers to text', () => {
    expect(escapeCsvCell('=SUM(1,2)')).toBe(`"'=SUM(1,2)"`);
    expect(escapeCsvCell('+cmd')).toBe("'+cmd");
    expect(escapeCsvCell('@tenant')).toBe("'@tenant");
    expect(escapeCsvCell('-not-a-number')).toBe("'-not-a-number");
    expect(escapeCsvCell('\t=SUM(1,2)')).toBe(`"'\t=SUM(1,2)"`);
    expect(escapeCsvCell('\r+cmd')).toBe(`"'\r+cmd"`);
    expect(escapeCsvCell('\n-danger')).toBe(`"'\n-danger"`);
    expect(escapeCsvCell(-12.5)).toBe('-12.5');
    expect(escapeCsvCell('-12.5')).toBe('-12.5');
  });

  it('builds csv with headers and rows', () => {
    const csv = buildCsv(
      [
        { header: 'Name', value: (row: { name: string; amount: number }) => row.name },
        { header: 'Amount', value: (row) => row.amount },
      ],
      [{ name: 'Tenant, One', amount: 12.5 }],
    );

    expect(csv).toBe('Name,Amount\n"Tenant, One",12.5');
  });
});