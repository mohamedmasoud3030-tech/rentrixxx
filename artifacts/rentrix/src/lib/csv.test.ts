import { describe, expect, it } from 'vitest';
import { buildCsv, escapeCsvCell } from './csv';

describe('csv helpers', () => {
  it('escapes quotes, commas, and new lines', () => {
    expect(escapeCsvCell('A "quoted", value')).toBe('"A ""quoted"", value"');
    expect(escapeCsvCell('line 1\nline 2')).toBe('"line 1\nline 2"');
  });


  it('neutralizes formula-like cells to prevent spreadsheet execution', () => {
    expect(escapeCsvCell('=2+2')).toBe("'=2+2");
    expect(escapeCsvCell('+cmd')).toBe("'+cmd");
    expect(escapeCsvCell('-10')).toBe("'-10");
    expect(escapeCsvCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
  });

  it('neutralizes formula-like cells with leading control characters', () => {
    expect(escapeCsvCell('\t=HYPERLINK("https://example.com")')).toBe('\'\t=HYPERLINK(""https://example.com"")');
    expect(escapeCsvCell('\r+cmd')).toBe('\'\r+cmd');
    expect(escapeCsvCell('\n-10')).toBe('\'\n-10');
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
