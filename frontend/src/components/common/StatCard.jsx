import React from "react";

/**
 * Universal Bizniz StatCard Component
 * Compact, proportional KPI card matching the Bizniz reference design:
 * - Height: approx 96px
 * - Equal height in the same row
 * - Heading and value aligned on the left
 * - Small icon background on the right
 * - Theme-aware iconBg, iconColor, and card border radius (18px)
 */
export default function StatCard({
  title,
  value,
  icon: Icon,
  badgeText,
  badgeType = "success",
  iconBg = "bg-theme-iconBg",
  iconColor = "text-theme-iconColor",
  subtitle,
  onClick,
  className = ""
}) {
  const badgeClasses = {
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    info: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    neutral: "bg-theme-surface text-theme-textSecondary border-theme-border"
  }[badgeType] || "bg-theme-surface text-theme-textSecondary border-theme-border";

  return (
    <div
      onClick={onClick}
      className={`bg-theme-card border border-theme-border rounded-card p-3 sm:p-3.5 shadow-card hover:border-theme-primary/30 transition-all duration-theme flex items-center justify-between gap-3 h-[96px] min-h-[96px] w-full ${
        onClick ? "cursor-pointer active:scale-[0.99]" : ""
      } ${className}`}
    >
      {/* Left: Heading, Value, and Subtitle/Badge */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-[11.5px] font-medium text-theme-textSecondary truncate leading-tight">
          {title}
        </p>
        <h3 className="text-lg sm:text-xl font-bold text-theme-textPrimary tracking-tight truncate leading-tight mt-1">
          {value}
        </h3>
        {subtitle ? (
          <p className="text-[10px] text-theme-textMuted mt-1 truncate">
            {subtitle}
          </p>
        ) : badgeText ? (
          <div className="mt-1">
            <span className={`inline-block text-[9.5px] font-semibold px-2 py-0.5 rounded-badge border truncate max-w-[130px] ${badgeClasses}`}>
              {badgeText}
            </span>
          </div>
        ) : (
          <div className="h-3.5" />
        )}
      </div>

      {/* Right: Small Icon Background Box */}
      <div className="flex flex-col items-end justify-between flex-shrink-0 h-full py-0.5">
        <div
          className={`w-9 h-9 rounded-btn flex items-center justify-center font-bold flex-shrink-0 transition-colors duration-theme ${iconBg} ${iconColor}`}
        >
          {Icon && <Icon className="w-4 h-4" />}
        </div>
        {subtitle && badgeText ? (
          <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-badge border truncate max-w-[110px] ${badgeClasses}`}>
            {badgeText}
          </span>
        ) : (
          <div className="h-2" />
        )}
      </div>
    </div>
  );
}
