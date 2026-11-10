import React from "react";

/**
 * Universal StatCard Component
 * Compact, modern, and clean KPI card with subtle icon tint and readable typography
 */
export default function StatCard({
  title,
  value,
  icon: Icon,
  badgeText,
  badgeType = "success",
  iconBg = "bg-emerald-500/10 dark:bg-emerald-950/40",
  iconColor = "text-emerald-600 dark:text-emerald-400",
  subtitle,
  onClick,
  className = ""
}) {
  const badgeClasses = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    info: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    neutral: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
  }[badgeType] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div
      onClick={onClick}
      className={`bg-theme-card border border-theme-border rounded-lg p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between h-full min-h-[105px] w-full ${
        onClick ? "cursor-pointer hover:border-theme-primary/40" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold flex-shrink-0 ${iconBg} ${iconColor}`}>
          {Icon && <Icon className="w-4 h-4" />}
        </div>
        {badgeText && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border truncate max-w-[140px] ${badgeClasses}`}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="mt-auto">
        <p className="text-[11px] font-medium text-theme-textSecondary truncate">
          {title}
        </p>
        <h3 className="text-lg sm:text-xl font-bold text-theme-textPrimary tracking-tight mt-0.5 truncate">
          {value}
        </h3>
        {subtitle ? (
          <p className="text-[10.5px] text-theme-textMuted mt-0.5 truncate">
            {subtitle}
          </p>
        ) : (
          <div className="h-4" />
        )}
      </div>
    </div>
  );
}
