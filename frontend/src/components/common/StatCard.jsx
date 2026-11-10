import React from "react";

/**
 * Universal StatCard Component
 * Renders executive KPI metrics with theme-aware corner rings and icon badge
 */
export default function StatCard({
  title,
  value,
  icon: Icon,
  badgeText,
  badgeType = "success",
  iconBg = "bg-theme-primary/10",
  iconColor = "text-theme-primary",
  subtitle,
  onClick,
  className = ""
}) {
  const badgeClasses = {
    success: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    danger: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    info: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    neutral: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
  }[badgeType] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-theme-card border border-theme-border rounded-2xl p-5 shadow-card group hover:shadow-dropdown transition duration-300 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Decorative Corner Rings Watermark */}
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full border-4 border-theme-primary/10 pointer-events-none" />
      <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full border-2 border-theme-primary/10 pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${iconBg} ${iconColor}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {badgeText && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-theme-textMuted uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-2xl font-black text-theme-textPrimary tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="text-xs text-theme-textSecondary mt-1 flex items-center justify-between">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
