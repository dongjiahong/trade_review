import { ClipboardList, Filter, MoreVertical, Search, Trash2 } from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
import { imagePatchFromAsset } from '../tradeAssets.js';
import { formatDate, formatProfit, profitTone, resultLabels } from '../tradeUtils.js';
import PasteImagePanel from './PasteImagePanel.jsx';
import { FieldShell, Metric, ResultBadge, Select, StatusPill, TextBlock } from './ui.jsx';

export default function OrdersView(props) {
  const {
    trades,
    allTrades,
    models,
    query,
    setQuery,
    modelFilter,
    setModelFilter,
    resultFilter,
    setResultFilter,
    onSelect,
    selectedTradeId,
    onUpdate,
    onDelete,
    onCloseTrade,
    onNewTrade,
  } = props;
  const selectedTrade = allTrades.find((trade) => trade.id === selectedTradeId) ?? allTrades[0];
  const [openMenuTradeId, setOpenMenuTradeId] = useState('');

  useEffect(() => {
    if (!openMenuTradeId) return undefined;
    function closeMenu() {
      setOpenMenuTradeId('');
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') closeMenu();
    }
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuTradeId]);

  return (
    <section className={`grid w-full min-w-0 gap-4 lg:min-h-0 lg:flex-1 ${selectedTrade ? '2xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
      <div className="flex min-w-0 flex-col rounded-md border border-slate-700/70 bg-ink-900/82 shadow-glow lg:min-h-0">
        <div className="shrink-0 border-b border-slate-700/70 p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StatusPill label="全部" value={allTrades.length} tone="slate" />
            <StatusPill label="盈利" value={allTrades.filter((trade) => trade.result === 'win').length} tone="emerald" />
            <StatusPill label="亏损" value={allTrades.filter((trade) => trade.result === 'loss').length} tone="rose" />
            <StatusPill label="进行中" value={allTrades.filter((trade) => trade.result === 'pending').length} tone="amber" />
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_170px_150px_auto]">
            <FieldShell icon={<Search size={16} />}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索品种、模型、备注..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </FieldShell>
            <Select value={modelFilter} onChange={setModelFilter} options={['全部模型', ...models.map((model) => model.name)]} />
            <Select value={resultFilter} onChange={setResultFilter} options={['全部结果', 'win', 'loss', 'pending']} labels={resultLabels} />
            <button className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
              <Filter size={16} />
              筛选
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead className="bg-ink-950/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {['日期', '品种', '方向', '入场', '止损', '止盈', 'R', '利润 $', '结果', '标签', ''].map((head) => (
                  <th key={head} className="px-4 py-3 text-left font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  onClick={() => onSelect(trade.id)}
                  className={`cursor-pointer border-t border-slate-800/90 transition hover:bg-slate-800/35 ${
                    selectedTradeId === trade.id ? 'bg-cyan-500/8' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-slate-300">{formatDate(trade.date)}</td>
                  <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                  <td className={`px-4 py-3 font-semibold ${trade.direction === '多' ? 'text-emerald-300' : 'text-rose-300'}`}>{trade.direction}</td>
                  <td className="px-4 py-3 text-slate-300">{trade.entry}</td>
                  <td className="px-4 py-3 text-slate-300">{trade.stop}</td>
                  <td className="px-4 py-3 text-slate-300">{trade.target}</td>
                  <td className="px-4 py-3 font-semibold text-cyan-300">{Number(trade.rMultiple).toFixed(2)}R</td>
                  <td className={`px-4 py-3 font-semibold ${profitTone(trade.profit)}`}>{formatProfit(trade.profit)}</td>
                  <td className="px-4 py-3">
                    <ResultBadge result={trade.result} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {trade.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="relative px-4 py-3 text-slate-500">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuTradeId((current) => (current === trade.id ? '' : trade.id));
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      aria-label="订单操作"
                      aria-expanded={openMenuTradeId === trade.id}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuTradeId === trade.id && (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-3 top-10 z-30 w-36 rounded-md border border-slate-700 bg-ink-950 py-1 shadow-glow"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(trade.id);
                            setOpenMenuTradeId('');
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                        >
                          查看详情
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(trade.id);
                            setOpenMenuTradeId('');
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-200 hover:bg-rose-500/12"
                        >
                          <Trash2 size={14} />
                          删除订单
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trades.length === 0 && (
            <div className="grid min-h-56 place-items-center px-4 py-12 text-center">
              <div>
                <ClipboardList className="mx-auto mb-3 text-slate-500" size={34} />
                <div className="font-medium">没有匹配的订单</div>
                <button onClick={onNewTrade} className="mt-3 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-950">
                  新增第一笔交易
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {selectedTrade && <TradeInspector trade={selectedTrade} onUpdate={onUpdate} onCloseTrade={onCloseTrade} />}
    </section>
  );
}

function TradeInspector({ trade, onUpdate, onCloseTrade }) {
  const [closePrice, setClosePrice] = useState('');
  const [closeProfit, setCloseProfit] = useState('');

  useEffect(() => {
    setClosePrice(trade?.closePrice || '');
    setCloseProfit(trade?.profit || '');
  }, [trade?.id, trade?.closePrice, trade?.profit]);

  if (!trade) return null;

  return (
    <aside className="min-h-0 overflow-y-auto rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">当前选中交易</div>
          <h2 className="mt-1 text-lg font-semibold">{trade.symbol} · {trade.timeframe}</h2>
        </div>
        <ResultBadge result={trade.result} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Metric label="模型" value={trade.model} />
        <Metric label="方向" value={trade.direction} />
        <Metric label="周期" value={trade.timeframe} />
        <Metric label="入场" value={trade.entry} />
        <Metric label="止损" value={trade.stop} />
        <Metric label="止盈" value={trade.target} />
        <Metric label="利润 $" value={formatProfit(trade.profit)} />
        <Metric label="平仓" value={trade.closePrice || '-'} />
        <Metric label="手数" value={trade.position || '-'} />
      </div>
      <label className="mb-2 block text-xs text-slate-400">平仓时填写价格和扣除点差、手续费后的实际利润</label>
      <div className="mb-4 rounded-md border border-slate-700 bg-ink-950/55 p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input
            value={closePrice}
            onChange={(event) => setClosePrice(event.target.value)}
            placeholder="填写平仓价格"
            className="rounded-md border border-slate-700 bg-ink-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          />
          <input
            value={closeProfit}
            onChange={(event) => setCloseProfit(event.target.value)}
            placeholder="实际利润 $"
            className="rounded-md border border-slate-700 bg-ink-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          />
          <button
            disabled={!closePrice || !closeProfit}
            onClick={() => onCloseTrade(trade.id, closePrice, closeProfit)}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            平仓
          </button>
        </div>
        {trade.closedAt && <div className="mt-2 text-xs text-slate-500">平仓时间：{formatDate(trade.closedAt)}</div>}
      </div>
      <PasteImagePanel
        label="下单 K 线图"
        image={trade.entryImage}
        onImage={(asset) => onUpdate(trade.id, imagePatchFromAsset(asset, 'entry'))}
        compact
      />
      <div className="mt-3">
        <PasteImagePanel
          label="平仓 K 线图"
          image={trade.closeImage}
          onImage={(asset) => onUpdate(trade.id, imagePatchFromAsset(asset, 'close'))}
          compact
        />
      </div>
      <TextBlock title="交易计划" text={trade.plan} empty="暂无计划记录" />
      <TextBlock title="执行备注" text={trade.note} empty="暂无备注" />
      <textarea
        value={trade.review}
        onChange={(event) => onUpdate(trade.id, { review: event.target.value })}
        placeholder="完结后记录复盘结论..."
        className="mt-3 min-h-24 w-full resize-none rounded-md border border-slate-700 bg-ink-950/70 p-3 text-sm text-slate-200 outline-none focus:border-cyan-400"
      />
    </aside>
  );
}
