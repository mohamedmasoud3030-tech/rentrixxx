import { describe, expect, it } from 'vitest';
import { buildCsv, escapeCsvCell } from './csv';

describe('csv helpers', () => {
  it('escapes quotes, commas, and new lines', () => {
    expect(escapeCsvCell('A "quoted", value')).toBe('"A ""quoted"", value"');
    expect(escapeCsvCell('line 1\nline 2')).toBe('"line 1\nline 2"');
  });

  it('neutralizes spreadsheet formulas', () => {
    expect(escapeCsvCell('=HYPERLINK("https://evil.example")')).toBe('"\'=HYPERLINK(""https://evil.example"")"');
    expect(escapeCsvCell('+2+2')).toBe("'+2+2");
    expect(escapeCsvCell('-1+3')).toBe("'-1+3");
    expect(escapeCsvCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
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
