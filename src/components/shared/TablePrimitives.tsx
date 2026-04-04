import React from 'react';

type WithClassName = { className?: string; children?: React.ReactNode };

const join = (...classes: Array<string | undefined>): string => classes.filter(Boolean).join(' ');

export const TableContainer: React.FC<WithClassName> = ({ className, children }) => (
  <div className={join('table-system__container', className)}>{children}</div>
);

export const TableRoot: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className, children, ...props }) => (
  <table className={join('table-system', className)} {...props}>{children}</table>
);

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, children, ...props }) => (
  <thead className={join('table-system__head', className)} {...props}>{children}</thead>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className, children, ...props }) => (
  <tr className={join('table-system__row', className)} {...props}>{children}</tr>
);

export const TableHeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => (
  <th className={join('table-system__th', className)} {...props}>{children}</th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => (
  <td className={join('table-system__td', className)} {...props}>{children}</td>
);
