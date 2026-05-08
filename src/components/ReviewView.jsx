import { AlertTriangle, BarChart3, ListChecks, ShieldCheck, Sparkles, X } from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { buildInsight, formatDate, formatProfit, percent, resultLabels } from '../tradeUtils.js';
import DistributionList from './DistributionList.jsx';
import ImageLightbox from './ImageLightbox.jsx';
import { Metric, ResultBadge, Select, TextBlock } from './ui.jsx';

export default function ReviewView({ trades, selectedTrade, onSelect, onUpdate, stats, models }) {
  const [previewImage, setPreviewImage] = useState('');
  const insight = buildInsight(trades, models);
  const closedTrades = trades.filter((trade) => trade.result !== 'pending');
  const modelRows = models.map((model) => {
    const group = closedTrades.filter((trade) => trade.model === model.name);
    const wins = group.filter((trade) => trade.result === 'win').length;
    return {
      label: model.name,
      value: group.length ? Math.round((wins / group.length) * 100) : 0,
      count: group.length,
    };
  });
  const resultRows = ['win', 'loss', 'pending'].map((result) => {
    const count = trades.filter((trade) => trade.result === result).length;
    return { label: resultLabels[result], value: percent(count, trades.length), count };
  });
  const missingReviewCount = trades.filter((trade) => !trade.review?.trim()).length;
  const missingPlanCount = trades.filter((trade) => !trade.plan?.trim()).length;
  const missingImageCount = trades.filter((trade) => !trade.entryImageAssetId).length;
  const problemRows = [
    { label: '复盘结论缺失', value: percent(missingReviewCount, trades.length), count: missingReviewCount },
    { label: '交易计划缺失', value: percent(missingPlanCount, trades.length), count: missingPlanCount },
    { label: '截图凭证缺失', value: percent(missingImageCount, trades.length), count: missingImageCount },
    { label: '进行中订单', value: percent(stats.pending, trades.length), count: stats.pending },
  ];
  const aiSummary = selectedTrade
    ? `${selectedTrade.model} 当前状态为${resultLabels[selectedTrade.result]}，利润为 ${formatProfit(selectedTrade.profit)}。本次复盘优先检查计划、截图和执行备注是否完整。`
    : '请选择一笔交易查看智能复盘。';
  const aiProblems = selectedTrade
    ? [
        !selectedTrade.entryImageAssetId && '缺少下单截图，后续难以复盘入场结构。',
        selectedTrade.result !== 'pending' && !selectedTrade.closeImageAssetId && '已平仓但缺少平仓截图，难以复盘出场质量。',
        !selectedTrade.plan?.trim() && '缺少交易计划，无法判断这笔交易是否按规则执行。',
        !selectedTrade.review?.trim() && selectedTrade.result !== 'pending' && '订单已完结但还没有复盘结论。',
      ].filter(Boolean)
    : ['暂无选中交易，无法生成单笔问题。'];
  const recurringErrors = [
    missingReviewCount > 0 && `${missingReviewCount} 笔订单缺少复盘结论。`,
    missingImageCount > 0 && `${missingImageCount} 笔订单缺少截图凭证。`,
    stats.pending > 0 && `${stats.pending} 笔订单仍在进行中，统计时已排除。`,
  ].filter(Boolean);
  const positives = [
    closedTrades.length > 0 && `已有 ${closedTrades.length} 笔完结订单可用于统计。`,
    models.length > 0 && `模型库已维护 ${models.length} 个模型，新增订单会直接复用。`,
    trades.some((trade) => trade.profit !== '') && '已有订单记录利润字段，可用于后续收益统计。',
  ].filter(Boolean);
  const actionItems = [
    missingImageCount > 0 && '优先补齐缺少截图的订单。',
    missingPlanCount > 0 && '补齐入场前计划，区分计划内和计划外交易。',
    stats.pending > 0 && '进行中订单完成后再更新结果和利润。',
    '导出 ZIP 备份后再进行大批量清理或导入。',
  ].filter(Boolean);

  return (
    <section className="grid gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto xl:grid-cols-[240px_minmax(360px,1fr)] 2xl:grid-cols-[240px_minmax(380px,1fr)_300px_270px]">
      <div className="rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow">
        <div className="mb-4 grid gap-2">
          <label className="block text-xs text-slate-400">
            时间范围
            <Select value="本周 (05/27 - 06/02)" onChange={() => {}} options={['本周 (05/27 - 06/02)', '本月', '全部时间']} />
          </label>
          <label className="block text-xs text-slate-400">
            品种
            <Select value="全部品种" onChange={() => {}} options={['全部品种', 'EUR/USD', 'GBP/USD', 'XAU/USD', 'NAS100']} />
          </label>
        </div>
        <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-semibold">交易列表</h2>
          <span className="text-xs text-slate-400">共 {trades.length} 笔</span>
        </div>
        <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
          {trades.map((trade) => (
            <button
              key={trade.id}
              onClick={() => onSelect(trade.id)}
              className={`w-full rounded-md border p-3 text-left text-sm ${
                selectedTrade?.id === trade.id
                  ? 'border-cyan-400/60 bg-cyan-500/10'
                  : 'border-slate-700 bg-ink-950/45 hover:bg-slate-800/45'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{trade.symbol}</span>
                <span className={`font-semibold ${profitToneClass(trade.profit, trade.result)}`}>
                  {formatProfit(trade.profit)}
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">{formatDate(trade.date)}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">{trade.timeframe}</span>
                <ResultBadge result={trade.result} />
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow">
        {selectedTrade && (
          <>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs text-cyan-300">选中交易详情</div>
                <h2 className="mt-1 text-xl font-semibold">{selectedTrade.symbol} · {selectedTrade.model}</h2>
                <div className="mt-1 text-xs text-slate-500">{formatDate(selectedTrade.date)} · {selectedTrade.timeframe}</div>
              </div>
              <ResultBadge result={selectedTrade.result} />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              <Metric label="方向" value={selectedTrade.direction} />
              <Metric label="时间框架" value={selectedTrade.timeframe} />
              <Metric label="入场" value={selectedTrade.entry} />
              <Metric label="止损" value={selectedTrade.stop} />
              <Metric label="止盈" value={selectedTrade.target} />
              <Metric label="R" value={`${Number(selectedTrade.rMultiple).toFixed(2)}R`} />
              <Metric label="利润 $" value={formatProfit(selectedTrade.profit)} />
              <Metric label="平仓" value={selectedTrade.closePrice || '-'} />
              <Metric label="平仓时间" value={selectedTrade.closedAt ? formatDate(selectedTrade.closedAt) : '-'} />
              <Metric label="手数" value={selectedTrade.position || '-'} />
              <Metric label="杠杆" value={`${selectedTrade.leverage || '-'}x`} />
            </div>
            <div className="mb-4 rounded-md border border-cyan-400/20 bg-cyan-500/8 p-3">
              <div className="text-xs text-cyan-300">交易模型</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{selectedTrade.model || '-'}</div>
            </div>
            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              <TradeImagePreview title="下单 K 线图" image={selectedTrade.entryImage} onPreview={setPreviewImage} />
              <TradeImagePreview title="平仓 K 线图" image={selectedTrade.closeImage} onPreview={setPreviewImage} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <TextBlock title="交易计划" text={selectedTrade.plan} empty="暂无计划" />
              <TextBlock title="执行备注" text={selectedTrade.note} empty="暂无备注" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Metric label="风险金额 $" value={selectedTrade.risk || '-'} />
              <Metric label="标签" value={selectedTrade.tags?.length ? selectedTrade.tags.join(' / ') : '-'} />
            </div>
            <TextBlock title="执行清单" text={selectedTrade.checklist?.length ? selectedTrade.checklist.join(' / ') : ''} empty="暂无执行清单" />
            <textarea
              value={selectedTrade.review}
              onChange={(event) => onUpdate(selectedTrade.id, { review: event.target.value })}
              placeholder="记录复盘：是否按模型执行、哪里偏离、下次规则..."
              className="mt-3 min-h-28 w-full resize-none rounded-md border border-slate-700 bg-ink-950/70 p-3 text-sm outline-none focus:border-cyan-400"
            />
          </>
        )}
      </div>
      <div className="space-y-4">
        <div className="rounded-md border border-cyan-400/20 bg-ink-900/82 p-4 shadow-glow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-cyan-100">
              <Sparkles size={17} />
              AI智能复盘分析
            </h2>
            <button className="rounded-md border border-slate-700 bg-ink-950/70 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">重新分析</button>
          </div>
          <div className="rounded-md border border-cyan-400/20 bg-cyan-500/8 p-3">
            <div className="mb-1 flex items-center justify-between text-sm font-semibold text-cyan-100">
              <span>AI 总结</span>
              <span>{selectedTrade?.result === 'win' ? '优秀' : selectedTrade?.result === 'loss' ? '高风险' : '待确认'}</span>
            </div>
            <p className="text-sm leading-6 text-slate-300">{aiSummary}</p>
          </div>
          <div className="mt-3 rounded-md border border-amber-400/20 bg-amber-500/8 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-100">
              <AlertTriangle size={16} />
              发现的问题
            </div>
            <ol className="space-y-1 text-sm leading-6 text-slate-300">
              {aiProblems.map((item, index) => (
                <li key={item}>{index + 1}. {item}</li>
              ))}
            </ol>
          </div>
          <div className="mt-3 rounded-md border border-rose-400/25 bg-rose-500/8 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-100">
              <X size={16} />
              重复出现的错误
            </div>
            <ol className="space-y-1 text-sm leading-6 text-slate-300">
              {(recurringErrors.length ? recurringErrors : ['暂无重复问题，继续积累样本。']).map((item, index) => (
                <li key={item}>{index + 1}. {item}</li>
              ))}
            </ol>
          </div>
          <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-500/8 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <ShieldCheck size={16} />
              做得好的地方
            </div>
            <ul className="space-y-1 text-sm leading-6 text-slate-300">
              {(positives.length ? positives : ['暂无完结数据，先录入订单。']).map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3 rounded-md border border-sky-400/20 bg-sky-500/8 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-100">
              <ListChecks size={16} />
              改进建议 / 下次执行清单
            </div>
            {actionItems.map((item) => (
              <label key={item} className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" className="h-4 w-4 accent-cyan-400" defaultChecked={item.includes('进行中')} />
                {item}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <BarChart3 size={17} />
            本周复盘洞察
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="胜率" value={`${stats.winRate}%`} />
            <Metric label="平均 R" value={`${stats.avgR}R`} />
            <Metric label="盈亏比" value={stats.payoff} />
            <Metric label="最大风险" value={`${stats.maxRisk}R`} />
          </div>
          <div className="mt-4 space-y-3">
            <DistributionList title="最近 20 笔交易规律 · 模型分布" rows={modelRows} />
            <DistributionList title="结果分布" rows={resultRows} />
            <DistributionList title="问题趋势" rows={problemRows} danger />
          </div>
        </div>
      </div>
      <ImageLightbox image={previewImage} title="下单 K 线截图" onClose={() => setPreviewImage('')} />
    </section>
  );
}

function TradeImagePreview({ title, image, onPreview }) {
  return (
    <div className="rounded-md border border-slate-700/70 bg-ink-950/55 p-3">
      <div className="mb-2 text-xs font-medium text-slate-400">{title}</div>
      {image ? (
        <button type="button" onClick={() => onPreview(image)} className="block w-full cursor-zoom-in rounded">
          <img src={image} alt={title} className="max-h-[320px] w-full rounded object-contain" />
        </button>
      ) : (
        <div className="grid min-h-44 place-items-center rounded border border-dashed border-slate-700 text-sm text-slate-500">暂无截图</div>
      )}
    </div>
  );
}

function profitToneClass(value, result) {
  const number = Number.parseFloat(value);
  if (Number.isFinite(number)) {
    if (number > 0) return 'text-emerald-300';
    if (number < 0) return 'text-rose-300';
  }
  if (result === 'pending') return 'text-amber-300';
  return 'text-slate-300';
}
