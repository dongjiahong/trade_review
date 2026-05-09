import { Calendar, Plus } from 'lucide-react';
import React from 'react';
import { useMemo } from 'react';

export default function Header({ trades, onNewTrade }) {
  const reviewPeriod = useMemo(() => formatReviewPeriod(trades), [trades]);

  return (
    <header className="shrink-0 flex flex-col gap-3 rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs text-cyan-300">
          <Calendar size={14} />
          复盘周期 · {reviewPeriod}
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

function formatReviewPeriod(trades = []) {
  const timestamps = trades.map((trade) => new Date(trade.date).getTime()).filter(Number.isFinite);
  if (!timestamps.length) return '暂无交易记录';
  const start = new Date(Math.min(...timestamps));
  const end = new Date(Math.max(...timestamps));
  const startText = formatDate(start);
  const endText = formatDate(end);
  return startText === endText ? startText : `${startText} 至 ${endText}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
