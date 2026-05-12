import { AlertTriangle, Calendar, Download, Upload } from 'lucide-react';
import React from 'react';
import { useRef, useState } from 'react';
import { seedModels } from '../data.js';
import { buildExcelExport, filterTradesByDate } from '../excelExport.js';
import { buildExportArchive, parseImportArchive, parseImportPackage } from '../storage.js';
import { Input, Metric, Textarea } from './ui.jsx';

export default function SettingsView({ stats, trades, setTrades, models, setModels, setSelectedTradeId, aiConfig, setAiConfig, tagPresets, setTagPresets, storageStatus, onClearData }) {
  const importRef = useRef(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [excelDateFrom, setExcelDateFrom] = useState('');
  const [excelDateTo, setExcelDateTo] = useState('');
  const excelTrades = filterTradesByDate(trades, excelDateFrom, excelDateTo);

  function updateAiConfig(key, value) {
    setAiConfig((current) => ({ ...current, [key]: value }));
  }

  async function exportData() {
    const blob = await buildExportArchive(trades, models, aiConfig, tagPresets);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smc-journal-export-${new Date().toISOString().slice(0, 10)}.smcj.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    const blob = await buildExcelExport(trades, { dateFrom: excelDateFrom, dateTo: excelDateTo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smc-journal-trades-${excelDateFrom || 'all'}-${excelDateTo || 'all'}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const nextPackage = file.name.endsWith('.zip') || file.name.endsWith('.smcj.zip')
        ? await parseImportArchive(await file.arrayBuffer())
        : parseImportPackage(JSON.parse(await file.text()));
      const nextTrades = nextPackage.trades;
      setTrades(nextTrades);
      setSelectedTradeId(nextTrades[0]?.id ?? '');
      setModels(nextPackage.models?.length ? nextPackage.models : seedModels);
      if (nextPackage.aiConfig) {
        setAiConfig((current) => ({ ...current, ...nextPackage.aiConfig, apiKey: nextPackage.aiConfig.apiKey || current.apiKey || '' }));
      }
      if (nextPackage.tagPresets?.length) {
        setTagPresets(nextPackage.tagPresets);
      }
    } catch {
      alert('导入失败：请选择由 SMC Journal 导出的 .smcj.zip 文件。');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <section className="grid gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-md border border-slate-700/70 bg-ink-900/82 p-5 shadow-glow">
        <h2 className="text-xl font-semibold">设置</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric label="本地存储" value="IndexedDB" />
          <Metric label="存储状态" value={storageStatus} />
          <Metric label="订单数量" value={stats.total} />
          <Metric label="未完结订单" value={stats.pending} />
        </div>
        <div className="mt-5 rounded-md border border-slate-700/70 bg-ink-950/45 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold">数据导入 / 导出</h3>
              <p className="mt-1 text-sm text-slate-400">
                导出为 .smcj.zip：订单和截图资源分离，截图以二进制文件保存。导出文件默认不包含 API Key。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportData}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                <Download size={16} />
                导出 ZIP
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-cyan-400"
              >
                <Upload size={16} />
                导入 ZIP
              </button>
              <input ref={importRef} type="file" accept=".smcj.zip,.zip,application/zip,application/json,.json" hidden onChange={importData} />
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-slate-700/70 bg-ink-950/45 p-4">
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="font-semibold">导出 Excel</h3>
              <p className="mt-1 text-sm text-slate-400">每行导出一笔交易，包含订单字段、交易计划、备注、复盘结论，并将下单/平仓截图嵌入同一行。</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <DatePickerField label="开始日期" value={excelDateFrom} onChange={setExcelDateFrom} />
              <DatePickerField label="结束日期" value={excelDateTo} onChange={setExcelDateTo} />
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={!excelTrades.length}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Download size={16} />
                  导出 Excel ({excelTrades.length})
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-slate-700/70 bg-ink-950/45 p-4">
          <h3 className="font-semibold">导出格式</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-400 md:grid-cols-3">
            <Metric label="manifest" value="格式版本 / 时间 / 数量" />
            <Metric label="trades" value="订单记录 / 图片引用" />
            <Metric label="assets" value="截图二进制文件 / mime / size" />
          </div>
        </div>
        <div className="mt-5 rounded-md border border-rose-400/25 bg-rose-500/8 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-rose-100">危险操作</h3>
              <p className="mt-1 text-sm text-slate-400">清除后会删除订单、截图资产和 AI 配置，自定义模型会恢复为默认模型。</p>
            </div>
            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="rounded-md border border-rose-400/50 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/15"
            >
              清除数据
            </button>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-slate-700/70 bg-ink-900/82 p-5 shadow-glow">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">AI 配置</h2>
            <p className="mt-1 text-sm text-slate-400">用于后续接入真实 AI 复盘接口，当前页面先保存配置。</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={aiConfig.enabled}
              onChange={(event) => updateAiConfig('enabled', event.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            启用
          </label>
        </div>
        <div className="grid gap-3">
          <Input label="服务商" value={aiConfig.provider} onChange={(value) => updateAiConfig('provider', value)} placeholder="OpenAI / DeepSeek / 自定义" />
          <Input label="模型" value={aiConfig.model} onChange={(value) => updateAiConfig('model', value)} placeholder="gpt-4.1-mini" />
          <Input label="Base URL" value={aiConfig.baseUrl} onChange={(value) => updateAiConfig('baseUrl', value)} placeholder="https://api.openai.com/v1" />
          <Input label="API Key" type="password" value={aiConfig.apiKey} onChange={(value) => updateAiConfig('apiKey', value)} placeholder="仅保存在本机 IndexedDB" />
          <Textarea
            label="系统提示词"
            value={aiConfig.systemPrompt}
            onChange={(value) => updateAiConfig('systemPrompt', value)}
            placeholder="定义 AI 复盘时的角色、边界和输出结构"
          />
        </div>
      </div>
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
          <div className="w-full max-w-md rounded-md border border-rose-400/35 bg-ink-900 p-5 shadow-glow">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-rose-100">
              <AlertTriangle size={20} />
              确认清除全部数据
            </div>
            <p className="text-sm leading-6 text-slate-300">
              此操作会删除 IndexedDB 中的所有订单、截图资产和 AI 配置，自定义模型会恢复为默认模型。导出备份后再清除会更稳妥。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  await onClearData();
                  setIsClearConfirmOpen(false);
                }}
                className="rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DatePickerField({ label, value, onChange }) {
  const inputRef = useRef(null);

  function openPicker() {
    inputRef.current?.showPicker?.();
    inputRef.current?.focus();
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <div className="flex rounded-md border border-slate-700 bg-ink-950/70 focus-within:border-cyan-400">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onClick={openPicker}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <button type="button" onClick={openPicker} className="border-l border-slate-700 px-3 text-slate-400 hover:text-cyan-200" aria-label={`选择${label}`}>
          <Calendar size={16} />
        </button>
      </div>
    </label>
  );
}
