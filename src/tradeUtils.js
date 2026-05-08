export const resultLabels = {
  win: '盈利',
  loss: '亏损',
  pending: '进行中',
};

export function formatProfit(value) {
  if (value === '' || value === undefined || value === null) return '-';
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) return '-';
  return number.toFixed(2);
}

export function profitTone(value) {
  const number = Number.parseFloat(value);
  if (Number.isNaN(number) || number === 0) return 'text-slate-300';
  return number > 0 ? 'text-emerald-300' : 'text-rose-300';
}

export function percent(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

export function calculateStats(trades) {
  const closed = trades.filter((trade) => trade.result !== 'pending');
  const wins = closed.filter((trade) => trade.result === 'win');
  const losses = closed.filter((trade) => trade.result === 'loss');
  const winR = wins.reduce((sum, trade) => sum + Number(trade.rMultiple || 0), 0);
  const lossR = losses.length;
  const avgR = closed.length ? (winR - lossR) / closed.length : 0;
  return {
    total: trades.length,
    pending: trades.length - closed.length,
    winRate: closed.length ? Math.round((wins.length / closed.length) * 100) : 0,
    avgR: avgR.toFixed(2),
    payoff: losses.length ? `${(winR / Math.max(wins.length, 1)).toFixed(2)} : 1` : '暂无',
    maxRisk: Math.max(...trades.map((trade) => Number(trade.rMultiple || 0)), 0).toFixed(2),
  };
}

export function buildInsight(trades, models) {
  const byModel = models
    .map((model) => {
      const group = trades.filter((trade) => trade.model === model.name && trade.result !== 'pending');
      const wins = group.filter((trade) => trade.result === 'win').length;
      return { name: model.name, total: group.length, rate: group.length ? wins / group.length : 0 };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.rate - a.rate);

  const pending = trades.filter((trade) => trade.result === 'pending').length;
  const weakest = [...byModel].sort((a, b) => a.rate - b.rate)[0];

  return [
    {
      title: '表现较好的模型',
      text: byModel[0] ? `${byModel[0].name} 当前样本胜率 ${Math.round(byModel[0].rate * 100)}%，但样本量只有 ${byModel[0].total}，不宜过度推断。` : '暂无已完结订单，先积累样本。',
      tone: 'border-emerald-400/20 bg-emerald-500/8',
    },
    {
      title: '需要复查的问题',
      text: weakest ? `${weakest.name} 的完结样本表现偏弱，优先检查是否存在提前入场或失效后继续持仓。` : '订单完成后再查看模型分布。',
      tone: 'border-amber-400/20 bg-amber-500/8',
    },
    {
      title: '未完结订单',
      text: pending ? `当前还有 ${pending} 笔进行中订单，统计胜率与平均 R 时已暂时排除它们。` : '当前没有进行中订单。',
      tone: 'border-cyan-400/20 bg-cyan-500/8',
    },
  ];
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-') + ` ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function toInputDateTime(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
