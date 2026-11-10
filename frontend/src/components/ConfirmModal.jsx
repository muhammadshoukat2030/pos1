import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  confirmColor = "bg-rose-600 hover:bg-rose-700",
  loading = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-theme">
      <div className="bg-theme-card border border-theme-border rounded-card shadow-card max-w-md w-full p-5 text-theme-textPrimary">
        <div className="flex items-center justify-between pb-3 border-b border-theme-border">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-btn hover:bg-theme-surface text-theme-textSecondary hover:text-theme-textPrimary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 text-sm text-theme-textSecondary">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 rounded-btn text-xs font-medium border border-theme-border bg-theme-surface hover:bg-theme-card text-theme-textPrimary transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold text-white shadow-xs transition cursor-pointer ${confirmColor} ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
