import React from "react";

/**
 * Standardized Universal Status Badge for POS & ERP
 * Supports order statuses, inventory stock levels, and ledger payment types
 */
export default function StatusBadge({ status, size = "sm", className = "" }) {
  if (!status) return null;

  const normalized = String(status).trim().toLowerCase();

  let colorClasses = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700";

  // Order & Payment Statuses
  if (normalized === "completed" || normalized === "paid" || normalized === "delivered") {
    colorClasses = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  } else if (normalized === "refunded" || normalized === "fully refunded" || normalized === "cancelled" || normalized === "out of stock") {
    colorClasses = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  } else if (normalized === "partially refunded" || normalized === "partial" || normalized === "low stock" || normalized === "pending") {
    colorClasses = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  } else if (normalized === "held" || normalized === "draft") {
    colorClasses = "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  } else if (normalized === "dispatch" || normalized === "in transit" || normalized === "ar khata / credit" || normalized === "credit sale") {
    colorClasses = "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  } else if (normalized === "in stock" || normalized === "healthy") {
    colorClasses = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  } else if (normalized === "unpaid" || normalized === "overdue") {
    colorClasses = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  }

  const sizeClasses = size === "xs"
    ? "px-2 py-0.5 text-[10px]"
    : size === "md"
    ? "px-3 py-1 text-xs"
    : "px-2.5 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${sizeClasses} ${colorClasses} ${className}`}
    >
      {status}
    </span>
  );
}
