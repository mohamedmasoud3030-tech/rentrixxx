import React from 'react';

export const DataTable: React.FC<{ headers: string[]; rows: React.ReactNode[][]; emptyMessage?: string }> = ({ headers, rows, emptyMessage = 'لا توجد بيانات' }) => (
  <div className="table-shell overflow-x-auto rounded-2xl border border-border bg-card">
    <table className="w-full text-right text-sm">
      <thead className="bg-background/70 text-xs text-text-muted">
        <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="px-4 py-8 text-center text-text-muted">{emptyMessage}</td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={idx} className="transition-colors hover:bg-background/50">
              {row.map((cell, cIdx) => <td key={cIdx} className="px-4 py-3">{cell}</td>)}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
