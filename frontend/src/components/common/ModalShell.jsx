import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Universal ModalShell Component
 * Standardized dialog container with backdrop blur, keyboard ESC dismissal, and header
 */
export default function ModalShell({
  isOpen,
  onClose,
  title,
  icon: Icon,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-xl",
  className = ""
}) {
  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-theme-card border border-theme-border rounded-xl p-4 sm:p-5 w-full ${maxWidth} shadow-lg space-y-3.5 max-h-[92vh] flex flex-col ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-theme-border">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm sm:text-base text-theme-textPrimary flex items-center gap-2">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-theme-textSecondary mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-theme-textMuted hover:text-theme-textPrimary hover:bg-black/5 dark:hover:bg-white/5 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs text-theme-textPrimary">
          {children}
        </div>

        {/* Optional Action Footer */}
        {footer && (
          <div className="pt-3 border-t border-theme-border flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
