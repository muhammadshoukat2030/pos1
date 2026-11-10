import React from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { TableSkeleton } from "../LoadingSkeleton";

/**
 * Universal DataTable Component
 * Standardized responsive data table with headers, skeleton loading, and pagination controls
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found",
  emptyIcon: EmptyIcon = Inbox,
  pagination,
  keyExtractor = (row, index) => row._id || row.id || index,
  className = ""
}) {
  if (loading) {
    return <TableSkeleton rows={pagination?.pageSize || 8} cols={columns.length} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-2xl p-12 text-center text-xs text-theme-textMuted shadow-card">
        <EmptyIcon className="w-10 h-10 mx-auto mb-2 text-theme-textMuted opacity-40" />
        <p className="font-semibold">{emptyMessage}</p>
      </div>
    );
  }

  const {
    currentPage = 1,
    totalPages = 1,
    totalItems = data.length,
    pageSize = 25,
    onPageChange,
    onPageSizeChange
  } = pagination || {};

  return (
    <div className={`bg-theme-card border border-theme-border rounded-2xl shadow-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-theme-textPrimary">
          <thead className="bg-black/5 dark:bg-white/5 border-b border-theme-border text-[11px] font-bold text-theme-textSecondary uppercase tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`p-3.5 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  } ${col.className || ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {data.map((row, rowIdx) => (
              <tr
                key={keyExtractor(row, rowIdx)}
                className="hover:bg-black/5 dark:hover:bg-white/5 transition duration-150"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`p-3.5 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.cellClassName || ""}`}
                  >
                    {col.render ? col.render(row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="px-5 py-3.5 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-theme-bg/30">
          <div className="flex items-center gap-3 text-theme-textSecondary">
            <span>
              Showing <strong className="text-theme-textPrimary">{totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong className="text-theme-textPrimary">{Math.min(currentPage * pageSize, totalItems)}</strong> of{" "}
              <strong className="text-theme-textPrimary">{totalItems}</strong> records
            </span>

            {onPageSizeChange && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="bg-theme-card border border-theme-border rounded-lg px-2 py-1 text-xs font-semibold text-theme-textPrimary focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none font-semibold transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <div className="px-3 py-1 font-bold text-theme-textPrimary">
              Page {currentPage} of {totalPages}
            </div>

            <button
              type="button"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-theme-border bg-theme-card hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none font-semibold transition"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
