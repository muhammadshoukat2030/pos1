import React from "react";

/**
 * Universal FormField Component
 * Standardized form inputs (input, select, textarea) with icons, labels, and error messages
 */
export default function FormField({
  label,
  required = false,
  error,
  helperText,
  icon: Icon,
  suffix,
  as = "input",
  options = [],
  children,
  className = "",
  containerClassName = "",
  ...inputProps
}) {
  const baseInputStyles =
    "w-full text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl px-3 py-2 text-theme-textPrimary placeholder:text-theme-textMuted focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition disabled:opacity-50";

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-bold text-theme-textSecondary">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-theme-textMuted pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}

        {as === "select" ? (
          <select
            className={`${baseInputStyles} ${Icon ? "pl-9" : ""} ${suffix ? "pr-12" : ""} ${
              error ? "border-rose-400 ring-1 ring-rose-400" : ""
            } ${className}`}
            {...inputProps}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
        ) : as === "textarea" ? (
          <textarea
            className={`${baseInputStyles} ${Icon ? "pl-9" : ""} ${
              error ? "border-rose-400 ring-1 ring-rose-400" : ""
            } ${className}`}
            {...inputProps}
          />
        ) : (
          <input
            className={`${baseInputStyles} ${Icon ? "pl-9" : ""} ${suffix ? "pr-12" : ""} ${
              error ? "border-rose-400 ring-1 ring-rose-400" : ""
            } ${className}`}
            {...inputProps}
          />
        )}

        {suffix && (
          <span className="absolute right-3 text-xs font-semibold text-theme-textMuted pointer-events-none">
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-[11px] font-semibold text-rose-500">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-theme-textMuted">{helperText}</p>
      ) : null}
    </div>
  );
}
