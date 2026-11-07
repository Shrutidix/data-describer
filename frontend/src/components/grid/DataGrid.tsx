import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown } from 'lucide-react';
import { CellError } from '../../types';

interface DataGridProps {
  columns: string[];
  rows: any[];
  totalRows: number;
  page: number;
  pageSize: number;
  cellErrors: CellError[];
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  loading?: boolean;
}

export const DataGrid: React.FC<DataGridProps> = ({
  columns,
  rows,
  totalRows,
  page,
  pageSize,
  cellErrors,
  onPageChange,
  loading = false,
}) => {
  const [hoveredError, setHoveredError] = useState<{ row: number; col: string; reason: string } | null>(null);

  // Quick lookup map: "row_col" -> reason
  const errorMap = new Map<string, string>();
  cellErrors.forEach((err) => {
    errorMap.set(`${err.row}_${err.col}`, err.reason);
  });

  const totalPages = Math.ceil(totalRows / pageSize) || 1;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col shadow-sm">
      {/* Table header bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">Data Preview Grid</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {totalRows.toLocaleString()} rows
          </span>
          {cellErrors.length > 0 && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
              <AlertCircle className="w-3 h-3" />
              <span>{cellErrors.length} flagged cells highlighted</span>
            </span>
          )}
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
          <span>
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid container with horizontal scroll */}
      <div className="overflow-x-auto min-h-[300px] max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium tracking-wider">
              <th className="py-2.5 px-3 w-14 text-center border-r border-slate-800/60 font-mono text-slate-500">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="py-2.5 px-3 border-r border-slate-800/60 whitespace-nowrap font-semibold text-slate-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{col}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {rows.map((row, rIdx) => {
              const actualRowIdx = row.__row_idx ?? rIdx;
              return (
                <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-3 text-center border-r border-slate-800/60 text-slate-500 font-semibold select-none">
                    {actualRowIdx + 1}
                  </td>
                  {columns.map((col) => {
                    const cellVal = row[col];
                    const errorReason = errorMap.get(`${actualRowIdx}_${col}`);
                    const isError = Boolean(errorReason);
                    const isNull = cellVal === null || cellVal === undefined || cellVal === '';

                    return (
                      <td
                        key={col}
                        onMouseEnter={() => isError && setHoveredError({ row: actualRowIdx, col, reason: errorReason! })}
                        onMouseLeave={() => setHoveredError(null)}
                        className={`py-2 px-3 border-r border-slate-800/60 whitespace-nowrap transition-colors relative ${
                          isError
                            ? 'bg-rose-500/15 text-rose-300 font-medium border-rose-500/30'
                            : isNull
                            ? 'text-slate-600 italic'
                            : 'text-slate-300'
                        }`}
                      >
                        <span>{isNull ? 'null' : String(cellVal)}</span>
                        {isError && (
                          <span className="inline-block ml-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating tooltip for hovered error */}
      {hoveredError && (
        <div className="p-2.5 bg-slate-950 border border-rose-500/30 rounded-xl text-rose-300 text-xs shadow-xl flex items-center gap-2 m-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Cell issue at row {hoveredError.row + 1}, column "{hoveredError.col}":</strong>{' '}
            {hoveredError.reason}
          </span>
        </div>
      )}
    </div>
  );
};

