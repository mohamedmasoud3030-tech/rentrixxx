import type { ReactNode } from 'react';

type Column<T> = { key: string; header: ReactNode; render: (row: T) => ReactNode };

export function DataTable<T>({ rows, columns, keyOf, empty }: { rows: T[]; columns: Array<Column<T>>; keyOf: (row: T) => string; empty?: ReactNode }) {
  if (!rows.length) return <>{empty ?? null}</>;
  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-start">
        <thead><tr>{columns.map((c) => <th key={c.key} className="border-b px-3 py-2 text-sm font-bold">{c.header}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={keyOf(row)}>{columns.map((c) => <td key={c.key} className="border-b px-3 py-2 text-sm">{c.render(row)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
