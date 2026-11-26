import React from 'react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  isTabular?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface ZiroTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyField: keyof T;
  className?: string;
  emptyMessage?: string;
}

export function ZiroTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  className = '',
  emptyMessage = 'No records found',
}: ZiroTableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-[#1F2633] bg-[#090B0E] ${className}`}>
      <table className="w-full text-left text-sm text-[#F4F6F9] border-collapse">
        <thead className="border-b border-[#1F2633] bg-[#12161E] text-xs font-mono uppercase tracking-wider text-[#8B95A5]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 font-medium ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1F2633]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-[#8B95A5]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                className="hover:bg-[#12161E]/60 transition-colors"
              >
                {columns.map((col) => {
                  const cellValue = col.render ? col.render(row) : row[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${
                        col.isTabular ? 'ziro-tabular font-mono' : ''
                      } ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
