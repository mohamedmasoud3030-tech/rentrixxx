import React from 'react';

export const TableShell: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div {...props} className={['table-shell', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className = '', children, ...props }) => (
  <table {...props} className={['w-full text-sm text-start', className].filter(Boolean).join(' ')}>
    {children}
  </table>
);

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', children, ...props }) => (
  <thead {...props} className={className}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = '', children, ...props }) => (
  <tbody {...props} className={className}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', children, ...props }) => (
  <tr {...props} className={className}>
    {children}
  </tr>
);

export const TableHeadCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <th {...props} className={['text-start', className].filter(Boolean).join(' ')}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...props }) => (
  <td {...props} className={className}>
    {children}
  </td>
);
