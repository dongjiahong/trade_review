import { Calendar, Plus } from 'lucide-react';
import React from 'react';

export default function Header({ onNewTrade }) {
  return (
    <header className="shrink-0 flex flex-col gap-3 rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs text-cyan-300">
          <Calendar size={14} />
          复盘周期 · 2024-05-27 至 2024-06-02
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal">订单记录</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onNewTrade}
          className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-cyan-400"
        >
          <Plus size={16} />
          新增交易
        </button>
      </div>
    </header>
  );
}
