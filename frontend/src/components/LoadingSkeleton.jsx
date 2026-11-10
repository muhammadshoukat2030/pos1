import React from "react";

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-32 bg-theme-card border border-theme-border rounded-2xl p-5" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full bg-theme-card border border-theme-border rounded-2xl p-4 animate-pulse space-y-3">
      <div className="h-8 bg-black/5 dark:bg-white/5 rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="h-10 bg-black/5 dark:bg-white/5 rounded-lg w-full" />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-44 bg-theme-card border border-theme-border rounded-xl" />
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ type = "card", count = 4, rows = 6, cols = 5 }) {
  if (type === "table") return <TableSkeleton rows={rows} cols={cols} />;
  if (type === "grid") return <GridSkeleton count={count} />;
  return <CardSkeleton count={count} />;
}
