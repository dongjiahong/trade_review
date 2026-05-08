import { Check, Save, X } from 'lucide-react';
import React from 'react';
import { tagPresets } from '../data.js';
import { imagePatchFromAsset } from '../tradeAssets.js';
import { calculateRiskReward } from '../tradeMath.js';
import { resultLabels } from '../tradeUtils.js';
import PasteImagePanel from './PasteImagePanel.jsx';
import { Input, Metric, SelectField, Segmented, Textarea } from './ui.jsx';

export default function TradeModal({ form, setForm, onClose, onSave, onSaveDraft, models }) {
  const canSave = form.symbol && form.entry && form.stop && form.target;
  const computedR = calculateRiskReward(form);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(tag) {
    setForm((current) => {
      const tags = String(current.tags || '')
        .split(/[,\s，]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      const nextTags = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
      return { ...current, tags: nextTags.join(' ') };
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-3">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-md border border-slate-700 bg-ink-900 shadow-glow">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">新增交易</h2>
            <p className="text-xs text-slate-400">结果可以先保持进行中，订单完成后再更新。</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="grid max-h-[calc(92vh-136px)] gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-4">
            <div className="rounded-md border border-slate-700/70 bg-ink-950/35 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-200">基础信息</div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="日期" type="datetime-local" value={form.date ?? ''} onChange={(value) => update('date', value)} />
                <SelectField label="品种" value={form.symbol} onChange={(value) => update('symbol', value)} options={['EUR/USD', 'GBP/USD', 'XAU/USD', 'NAS100', 'US30', 'BTC/USD']} />
                <SelectField label="时间框架" value={form.timeframe} onChange={(value) => update('timeframe', value)} options={['1M', '3M', '5M', '15M', '30M', '1H', '4H', '1D']} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Segmented label="方向" value={form.direction} onChange={(value) => update('direction', value)} options={['多', '空']} />
                <div className="md:col-span-2">
                  <SelectField label="模型" value={form.model} onChange={(value) => update('model', value)} options={models.map((model) => model.name)} />
                </div>
              </div>
            </div>
            <div className="rounded-md border border-slate-700/70 bg-ink-950/35 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-200">价格与风控</div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="入场价" required value={form.entry} onChange={(value) => update('entry', value)} />
                <Input label="止损" required value={form.stop} onChange={(value) => update('stop', value)} />
                <Input label="止盈" required value={form.target} onChange={(value) => update('target', value)} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Metric label="风险回报比" value={`${computedR.toFixed(2)}R`} />
                <Input label="仓位 (手)" value={form.position} onChange={(value) => update('position', value)} placeholder="如 0.01" />
                <Input label="杠杆比例" value={form.leverage} onChange={(value) => update('leverage', value)} placeholder="如 100" />
                <Input label="风险金额 $" value={form.risk} onChange={(value) => update('risk', value)} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input label="平仓价格" value={form.closePrice} onChange={(value) => update('closePrice', value)} placeholder="未平仓可留空" />
                <Input label="实际利润 $" value={form.profit} onChange={(value) => update('profit', value)} placeholder="扣除点差和手续费后手填" />
              </div>
            </div>
            <div className="rounded-md border border-slate-700/70 bg-ink-950/35 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-200">结果与标签</div>
              <div className="grid gap-3">
                <SelectField label="当前结果" value={form.result} onChange={(value) => update('result', value)} options={['pending', 'win', 'loss']} labels={resultLabels} />
                <Input label="标签" value={form.tags} onChange={(value) => update('tags', value)} placeholder="扫流 FVG 伦敦盘" />
                <div className="flex flex-wrap gap-2">
                  {tagPresets.map((tag) => {
                    const active = String(form.tags || '').split(/[,\s，]+/).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-md border px-2.5 py-1 text-xs ${
                          active ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100' : 'border-slate-700 bg-ink-950/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Textarea label="交易计划" value={form.plan} onChange={(value) => update('plan', value)} placeholder="入场条件、失效条件、管理规则..." />
            <Textarea label="执行备注" value={form.note} onChange={(value) => update('note', value)} placeholder="当时看到的结构、情绪、是否等待确认..." />
            <Textarea label="复盘结论" value={form.review} onChange={(value) => update('review', value)} placeholder="可留空，订单完成后再补。" />
            <Checklist value={form.checklist} onChange={(value) => update('checklist', value)} />
          </div>
          <div>
            <PasteImagePanel label="下单 K 线图" image={form.entryImage} onImage={(asset) => setForm((current) => ({ ...current, ...imagePatchFromAsset(asset, 'entry') }))} />
            <div className="mt-4">
              <PasteImagePanel label="平仓 K 线图" image={form.closeImage} onImage={(asset) => setForm((current) => ({ ...current, ...imagePatchFromAsset(asset, 'close') }))} />
            </div>
            <div className="mt-4 rounded-md border border-slate-700/70 bg-ink-950/55 p-4">
              <h3 className="mb-3 text-sm font-semibold">交易前检查</h3>
              <div className="space-y-2 text-sm text-slate-300">
                {['趋势方向是否明确', '入场是否等待确认', '风险收益比合格', '止损位置可执行', '不因情绪扩大仓位'].map((item) => (
                  <label key={item} className="flex items-center gap-2">
                    <input className="h-4 w-4 accent-cyan-400" type="checkbox" defaultChecked={item !== '不因情绪扩大仓位'} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-700 px-5 py-4 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
            取消
          </button>
          <button
            onClick={onSaveDraft}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <Save size={16} />
            保存草稿
          </button>
          <button
            disabled={!canSave}
            onClick={onSave}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Check size={16} />
            保存交易
          </button>
        </div>
      </div>
    </div>
  );
}

function Checklist({ value, onChange }) {
  const options = ['趋势方向确认', '风险收益比合格', '等待确认信号', '止损位置合理', '无情绪化加仓'];
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">执行清单</label>
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((item) => (
          <label key={item} className="flex items-center gap-2 rounded-md border border-slate-700/70 bg-ink-950/50 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={value.includes(item)}
              onChange={(event) => {
                onChange(event.target.checked ? [...value, item] : value.filter((current) => current !== item));
              }}
              className="h-4 w-4 accent-cyan-400"
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}
