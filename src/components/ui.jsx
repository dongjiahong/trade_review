import { ChevronDown } from 'lucide-react';
import React from 'react';
import { resultLabels } from '../tradeUtils.js';

export function FieldShell({ icon, children }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-ink-950/70 px-3 py-2 text-slate-400">
      {icon}
      {children}
    </div>
  );
}

export function Select({ value, onChange, options, labels = {} }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full appearance-none rounded-md border border-slate-700 bg-ink-950/70 px-3 py-2 pr-9 text-sm outline-none focus:border-cyan-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
    </div>
  );
}

export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">
        {label} {required && <span className="text-rose-300">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-700 bg-ink-950/70 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400"
      />
    </label>
  );
}

export function Textarea({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full resize-none rounded-md border border-slate-700 bg-ink-950/70 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400"
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, options, labels }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <Select value={value} onChange={onChange} options={options} labels={labels} />
    </label>
  );
}

export function Segmented({ label, value, onChange, options }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              value === option
                ? option === '多'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                  : 'border-rose-400 bg-rose-500/20 text-rose-100'
                : 'border-slate-700 bg-ink-950/70 text-slate-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextBlock({ title, text, empty }) {
  return (
    <div className="mt-3 rounded-md border border-slate-700/70 bg-ink-950/45 p-3">
      <div className="mb-1 text-xs text-slate-500">{title}</div>
      <p className="text-sm leading-6 text-slate-300">{text || empty}</p>
    </div>
  );
}

export function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-slate-700/70 bg-ink-950/55 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export function StatusPill({ label, value, tone }) {
  const tones = {
    slate: 'text-slate-200 bg-slate-500/10',
    emerald: 'text-emerald-200 bg-emerald-500/10',
    rose: 'text-rose-200 bg-rose-500/10',
    amber: 'text-amber-200 bg-amber-500/10',
  };
  return (
    <span className={`rounded px-3 py-1.5 text-sm ${tones[tone]}`}>
      {label} <b className="ml-1">{value}</b>
    </span>
  );
}

export function ResultBadge({ result }) {
  const styles = {
    win: 'bg-emerald-500/14 text-emerald-200 border-emerald-400/25',
    loss: 'bg-rose-500/14 text-rose-200 border-rose-400/25',
    pending: 'bg-amber-500/14 text-amber-200 border-amber-400/25',
  };
  return <span className={`inline-flex rounded border px-2.5 py-1 text-xs font-semibold ${styles[result] ?? styles.pending}`}>{resultLabels[result] ?? resultLabels.pending}</span>;
}
