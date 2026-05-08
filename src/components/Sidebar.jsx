import { BookOpenCheck, ClipboardList, LineChart, Settings, Sparkles } from 'lucide-react';
import React from 'react';
import { Metric } from './ui.jsx';

export default function Sidebar({ activeView, onViewChange, stats }) {
  const items = [
    ['orders', ClipboardList, '订单记录'],
    ['models', BookOpenCheck, '模型库'],
    ['review', Sparkles, '复盘'],
    ['settings', Settings, '设置'],
  ];

  return (
    <aside className="flex w-full flex-col justify-between rounded-md border border-slate-700/70 bg-ink-900/88 p-3 shadow-glow lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-64">
      <div>
        <div className="mb-5 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-cyan-500/15 text-cyan-300">
            <LineChart size={22} />
          </div>
          <div>
            <div className="text-base font-semibold">SMC Journal</div>
            <div className="text-xs text-slate-400">交易复盘工作台</div>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {items.map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={`flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition ${
                activeView === key
                  ? 'bg-cyan-500/14 text-cyan-200 ring-1 ring-cyan-400/20'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-5 rounded-md border border-slate-700/70 bg-ink-950/65 p-3">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">Trader SMC</div>
            <div className="text-xs text-slate-400">本周 {stats.total} 笔记录</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Metric label="胜率" value={`${stats.winRate}%`} />
          <Metric label="均R" value={`${stats.avgR}R`} />
          <Metric label="待结" value={stats.pending} />
        </div>
      </div>
    </aside>
  );
}
