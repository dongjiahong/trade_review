import { BookOpen, CircleX, Star, Target, Trash2, Zap } from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { Input, Textarea } from './ui.jsx';

const directionTabs = [
  { key: 'long', label: '做多描述' },
  { key: 'short', label: '做空描述' },
];

export default function ModelEditor({ model, canDelete, onToggleFavorite, onUpdate, onDelete, referenceChart }) {
  const [activeDirection, setActiveDirection] = useState('long');
  const activeRules = model.directionRules?.[activeDirection] || emptyRules();

  function updateRules(patch) {
    onUpdate({
      directionRules: {
        ...model.directionRules,
        [activeDirection]: {
          ...activeRules,
          ...patch,
        },
      },
    });
  }

  return (
    <div className="p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <Input label="模型名称" value={model.name} onChange={(value) => onUpdate({ name: value })} placeholder="例如 Liquidity Sweep + ChoCH" />
        <Input label="模型标题" value={model.title} onChange={(value) => onUpdate({ title: value })} placeholder="例如 反转模型" />
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`mt-7 inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
            model.favorite ? 'border-amber-400/45 bg-amber-500/10 text-amber-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Star className={model.favorite ? 'fill-amber-300' : ''} size={16} />
          收藏
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-md border border-rose-400/45 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/15"
          >
            <Trash2 size={16} />
            删除
          </button>
        )}
      </div>
      <div className="mb-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {directionTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDirection(tab.key)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  activeDirection === tab.key
                    ? tab.key === 'long'
                      ? 'border-emerald-400 bg-emerald-500/18 text-emerald-100'
                      : 'border-rose-400 bg-rose-500/18 text-rose-100'
                    : 'border-slate-700 bg-ink-950/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Textarea
            label="模型逻辑"
            value={activeRules.logic}
            onChange={(value) => updateRules({ logic: value })}
            placeholder="描述这个方向下模型成立的市场背景和订单流逻辑"
          />
        </div>
        {referenceChart}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ListTextarea icon={Target} label="条件" value={activeRules.points} tone="cyan" onChange={(value) => updateRules({ points: value })} />
        <ListTextarea icon={Zap} label="触发" value={activeRules.triggers} tone="amber" onChange={(value) => updateRules({ triggers: value })} />
        <Textarea label="失效" value={activeRules.fail} onChange={(value) => updateRules({ fail: value })} placeholder="描述模型失效条件" />
        <ListTextarea icon={Star} label="要点" value={activeRules.keyPoints} tone="blue" onChange={(value) => updateRules({ keyPoints: value })} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ModelList icon={Target} title="条件预览" items={activeRules.points} tone="cyan" />
        <ModelList icon={Zap} title="触发预览" items={activeRules.triggers} tone="amber" />
        <ModelList icon={CircleX} title="失效预览" items={splitText(activeRules.fail)} tone="rose" />
        <ModelList icon={BookOpen} title="要点预览" items={activeRules.keyPoints} tone="blue" />
      </div>
    </div>
  );
}

function emptyRules() {
  return {
    logic: '',
    points: ['补充模型成立条件'],
    triggers: [],
    fail: '补充模型失效条件。',
    keyPoints: [],
  };
}

function ListTextarea({ icon: Icon, label, value, tone, onChange }) {
  const tones = {
    cyan: 'text-cyan-200',
    amber: 'text-amber-100',
    blue: 'text-sky-100',
  };
  return (
    <label className="block">
      <span className={`mb-2 flex items-center gap-2 text-sm font-medium ${tones[tone]}`}>
        <Icon size={16} />
        {label}
      </span>
      <textarea
        value={(value || []).join('\n')}
        onChange={(event) => onChange(parseLines(event.target.value))}
        placeholder="每行一条"
        className="min-h-28 w-full resize-y rounded-md border border-slate-700 bg-ink-950/70 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400"
      />
    </label>
  );
}

function ModelList({ icon: Icon, title, items, tone }) {
  const tones = {
    cyan: 'text-cyan-200 border-cyan-400/20 bg-cyan-500/8',
    amber: 'text-amber-100 border-amber-400/20 bg-amber-500/8',
    rose: 'text-rose-100 border-rose-400/20 bg-rose-500/8',
    blue: 'text-sky-100 border-sky-400/20 bg-sky-500/8',
  };
  const list = items?.length ? items : ['待补充'];
  return (
    <div className={`rounded-md border p-3 ${tones[tone]}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} />
        {title}
      </div>
      <ul className="space-y-1.5 text-sm leading-5 text-slate-300">
        {list.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseLines(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitText(value) {
  return String(value || '')
    .split(/[；;。]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}
