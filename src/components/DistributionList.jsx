import React from 'react';

export default function DistributionList({ title, rows, danger = false }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-slate-400">{title}</div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-400">
              <span className="truncate">{row.label}</span>
              <span>{row.count} 笔 · {row.value}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${danger ? 'bg-rose-400' : 'bg-cyan-400'}`}
                style={{ width: `${Math.max(row.value, row.count ? 8 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
