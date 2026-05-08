import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  FileImage,
  Filter,
  ImagePlus,
  LayoutGrid,
  LineChart,
  ListChecks,
  MoreVertical,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

const dbName = 'smc-journal-db';
const dbVersion = 2;
const tradeStoreName = 'trades';
const assetStoreName = 'assets';
const settingsStoreName = 'settings';
const aiConfigKey = 'ai-config';

const defaultAiConfig = {
  enabled: true,
  provider: 'OpenAI',
  model: 'gpt-4.1-mini',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  systemPrompt: '你是一个交易复盘助手，只基于用户提供的订单、截图和规则进行总结，不给投资建议。',
};

const models = [
  {
    name: 'Liquidity Sweep + ChoCH',
    favorite: true,
    accent: 'cyan',
    points: ['扫掉关键流动性后反向收回', 'ChoCH 确认结构切换', '回踩 FVG 或 OB 入场'],
    fail: '扫流后继续同向放量，结构没有真正转换。',
  },
  {
    name: 'FVG Continuation',
    favorite: true,
    accent: 'emerald',
    points: ['顺势趋势清晰', 'FVG 未被深度回补', '入场后不应快速跌破缺口中位'],
    fail: '缺口被完全回补且动能衰竭。',
  },
  {
    name: 'OB Reversal',
    favorite: true,
    accent: 'amber',
    points: ['趋势末端出现有效 OB', '价格回踩订单块后出现反应', '止损放在 OB 外侧'],
    fail: 'OB 被实体突破后继续尝试逆势。',
  },
  {
    name: 'Breaker Retest',
    favorite: true,
    accent: 'rose',
    points: ['旧结构失败形成 Breaker', '回测区间时等待小级别确认', '目标优先看前低/前高流动性'],
    fail: '未回测就追单，或回测时没有确认。',
  },
];

const seedTrades = [
  {
    id: 'T-240531-1',
    date: '2024-05-31T15:42',
    symbol: 'EUR/USD',
    timeframe: '1H',
    session: '伦敦盘',
    direction: '多',
    model: 'Liquidity Sweep + ChoCH',
    entry: '1.08234',
    stop: '1.07834',
    target: '1.09034',
    rMultiple: 2,
    position: '1.00',
    risk: '100',
    profit: '200',
    result: 'win',
    tags: ['扫流', 'FVG1'],
    note: '流动性扫完后出现 ChoCH，回踩 FVG 后确认。',
    plan: '等待 FVG 回补后再次入场，清点正常。',
    review: '执行基本符合计划，出场可以再耐心。',
    checklist: ['趋势方向确认', '风险收益比合格', '入场后按计划管理'],
    image: '',
  },
  {
    id: 'T-240531-2',
    date: '2024-05-31T10:15',
    symbol: 'NAS100',
    timeframe: '5M',
    session: '纽约盘',
    direction: '空',
    model: 'FVG Continuation',
    entry: '18942.25',
    stop: '18962.25',
    target: '18642.25',
    rMultiple: 2.5,
    position: '0.50',
    risk: '80',
    profit: '200',
    result: 'win',
    tags: ['FVG', '顺势'],
    note: '顺势缺口延续，入场后没有回到结构上方。',
    plan: '等回补缺口中位再做空。',
    review: '入场位置好，但减仓记录不够细。',
    checklist: ['趋势方向确认', '风险收益比合格'],
    image: '',
  },
  {
    id: 'T-240530-1',
    date: '2024-05-30T22:05',
    symbol: 'XAU/USD',
    timeframe: '15M',
    session: '纽约盘',
    direction: '多',
    model: 'OB Reversal',
    entry: '2345.12',
    stop: '2326.12',
    target: '2360.12',
    rMultiple: 2,
    position: '0.20',
    risk: '120',
    profit: '',
    result: 'pending',
    tags: ['OB', '待结果'],
    note: '订单已建立，等待纽约盘后半段结果。',
    plan: '若跌破 OB 外侧直接止损，不提前移动止损。',
    review: '',
    checklist: ['风险收益比合格', '等待确认信号'],
    image: '',
  },
  {
    id: 'T-240530-2',
    date: '2024-05-30T16:30',
    symbol: 'GBP/USD',
    timeframe: '1H',
    session: '伦敦盘',
    direction: '多',
    model: 'Breaker Retest',
    entry: '1.27123',
    stop: '1.26763',
    target: '1.28123',
    rMultiple: 2,
    position: '1.00',
    risk: '100',
    profit: '-100',
    result: 'loss',
    tags: ['Breaker', '复盘'],
    note: 'Breaker retest 过早入场，小级别确认不足。',
    plan: '等待回踩后确认。',
    review: '亏损来自确认不足，下一次要等小级别结构转换。',
    checklist: ['风险收益比合格'],
    image: '',
  },
];

const emptyForm = {
  symbol: 'EUR/USD',
  timeframe: '1H',
  session: '',
  direction: '多',
  model: 'Liquidity Sweep + ChoCH',
  entry: '',
  stop: '',
  target: '',
  rMultiple: '2.00',
  position: '1.00',
  risk: '100',
  profit: '',
  result: 'pending',
  tags: '',
  plan: '',
  note: '',
  review: '',
  checklist: ['趋势方向确认', '风险收益比合格'],
  image: '',
  imageAssetId: '',
  imageName: '',
  imageMime: '',
  imageSize: 0,
};

function App() {
  const [trades, setTrades] = useState(seedTrades);
  const [aiConfig, setAiConfig] = useState(defaultAiConfig);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState('正在加载 IndexedDB...');
  const [activeView, setActiveView] = useState('orders');
  const [query, setQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('全部模型');
  const [resultFilter, setResultFilter] = useState('全部结果');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedTradeId, setSelectedTradeId] = useState(seedTrades[0].id);

  useEffect(() => {
    let ignore = false;
    async function hydrate() {
      try {
        const [storedTrades, storedAiConfig] = await Promise.all([loadTradesFromDb(), loadAiConfigFromDb()]);
        if (ignore) return;
        const nextTrades = storedTrades.length ? storedTrades : seedTrades;
        setTrades(nextTrades);
        setSelectedTradeId(nextTrades[0]?.id ?? seedTrades[0].id);
        setAiConfig(storedAiConfig);
        setStorageStatus('IndexedDB 已连接');
      } catch {
        if (ignore) return;
        setTrades(seedTrades);
        setSelectedTradeId(seedTrades[0].id);
        setStorageStatus('IndexedDB 不可用，当前使用内存数据');
      } finally {
        if (!ignore) setIsHydrated(true);
      }
    }
    hydrate();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveTradesToDb(trades)
      .then(() => setStorageStatus('IndexedDB 已保存'))
      .catch(() => setStorageStatus('IndexedDB 保存失败'));
  }, [isHydrated, trades]);

  useEffect(() => {
    if (!isHydrated) return;
    saveAiConfigToDb(aiConfig).catch(() => setStorageStatus('AI 配置保存失败'));
  }, [aiConfig, isHydrated]);

  const selectedTrade = trades.find((trade) => trade.id === selectedTradeId) ?? trades[0];

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const text = `${trade.symbol} ${trade.model} ${trade.note} ${trade.tags.join(' ')}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      const matchesModel = modelFilter === '全部模型' || trade.model === modelFilter;
      const matchesResult = resultFilter === '全部结果' || trade.result === resultFilter;
      return matchesQuery && matchesModel && matchesResult;
    });
  }, [modelFilter, query, resultFilter, trades]);

  const stats = useMemo(() => calculateStats(trades), [trades]);

  function openNewTrade() {
    setForm({ ...emptyForm, date: toInputDateTime(new Date()) });
    setIsModalOpen(true);
  }

  function saveTrade() {
    if (!form.symbol || !form.entry || !form.stop || !form.target) return;
    addTradeFromForm(form);
    setIsModalOpen(false);
    setActiveView('orders');
  }

  function saveDraft() {
    const draft = {
      ...form,
      entry: form.entry || '-',
      stop: form.stop || '-',
      target: form.target || '-',
      result: 'pending',
      tags: form.tags ? `${form.tags} 草稿` : '草稿',
      note: form.note || '草稿订单，等待补充入场、止损、止盈或执行结果。',
    };
    addTradeFromForm(draft);
    setIsModalOpen(false);
    setActiveView('orders');
  }

  function addTradeFromForm(source) {
    const id = `T-${Date.now()}`;
    const trade = {
      ...source,
      id,
      date: source.date || toInputDateTime(new Date()),
      rMultiple: Number.parseFloat(source.rMultiple) || 0,
      profit: source.profit === '' ? '' : String(Number.parseFloat(source.profit) || 0),
      tags: source.tags
        .split(/[,\s，]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    setTrades((current) => [trade, ...current]);
    setSelectedTradeId(id);
  }

  function updateTrade(id, patch) {
    setTrades((current) => current.map((trade) => (trade.id === id ? { ...trade, ...patch } : trade)));
  }

  function resetDemo() {
    setTrades(seedTrades);
    setSelectedTradeId(seedTrades[0].id);
  }

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-4 px-3 py-4 lg:flex-row lg:px-5">
        <Sidebar activeView={activeView} onViewChange={setActiveView} stats={stats} />
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <Header onNewTrade={openNewTrade} onReset={resetDemo} />
          {activeView === 'orders' && (
            <OrdersView
              trades={filteredTrades}
              allTrades={trades}
              query={query}
              setQuery={setQuery}
              modelFilter={modelFilter}
              setModelFilter={setModelFilter}
              resultFilter={resultFilter}
              setResultFilter={setResultFilter}
              onSelect={setSelectedTradeId}
              selectedTradeId={selectedTrade?.id}
              onUpdate={updateTrade}
              onNewTrade={openNewTrade}
            />
          )}
          {activeView === 'models' && <ModelsView />}
          {activeView === 'review' && (
            <ReviewView
              trades={trades}
              selectedTrade={selectedTrade}
              onSelect={setSelectedTradeId}
              onUpdate={updateTrade}
              stats={stats}
            />
          )}
          {activeView === 'settings' && (
            <SettingsView
              stats={stats}
              trades={trades}
              setTrades={setTrades}
              setSelectedTradeId={setSelectedTradeId}
              aiConfig={aiConfig}
              setAiConfig={setAiConfig}
              storageStatus={storageStatus}
            />
          )}
        </main>
      </div>
      {isModalOpen && (
        <TradeModal
          form={form}
          setForm={setForm}
          onClose={() => setIsModalOpen(false)}
          onSave={saveTrade}
          onSaveDraft={saveDraft}
        />
      )}
    </div>
  );
}

function Sidebar({ activeView, onViewChange, stats }) {
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

function Header({ onNewTrade, onReset }) {
  return (
    <header className="flex flex-col gap-3 rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs text-cyan-300">
          <Calendar size={14} />
          复盘周期 · 2024-05-27 至 2024-06-02
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal">订单记录</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw size={16} />
          重置示例
        </button>
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

function OrdersView(props) {
  const {
    trades,
    allTrades,
    query,
    setQuery,
    modelFilter,
    setModelFilter,
    resultFilter,
    setResultFilter,
    onSelect,
    selectedTradeId,
    onUpdate,
    onNewTrade,
  } = props;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-md border border-slate-700/70 bg-ink-900/82 shadow-glow">
        <div className="border-b border-slate-700/70 p-4">
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="bg-ink-950/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {['日期', '品种', '方向', '模型', '入场', '止损', '止盈', 'R', '利润', '结果', '标签', ''].map((head) => (
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
                  <td className="px-4 py-3 text-slate-300">{trade.model}</td>
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
                  <td className="px-4 py-3 text-slate-500">
                    <MoreVertical size={16} />
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
      <TradeInspector trade={allTrades.find((trade) => trade.id === selectedTradeId) ?? allTrades[0]} onUpdate={onUpdate} />
    </section>
  );
}

function TradeInspector({ trade, onUpdate }) {
  if (!trade) return null;

  return (
    <aside className="rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">当前选中交易</div>
          <h2 className="mt-1 text-lg font-semibold">{trade.symbol} · {trade.timeframe}</h2>
        </div>
        <ResultBadge result={trade.result} />
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Metric label="入场" value={trade.entry} />
        <Metric label="止损" value={trade.stop} />
        <Metric label="止盈" value={trade.target} />
        <Metric label="利润" value={formatProfit(trade.profit)} />
      </div>
      <label className="mb-2 block text-xs text-slate-400">完结后更新结果</label>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {['pending', 'win', 'loss'].map((result) => (
          <button
            key={result}
            onClick={() => onUpdate(trade.id, { result })}
            className={`rounded-md border px-3 py-2 text-sm ${
              trade.result === result
                ? 'border-cyan-400 bg-cyan-500/14 text-cyan-100'
                : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {resultLabels[result]}
          </button>
        ))}
      </div>
      <PasteImagePanel
        image={trade.image}
        onImage={(asset) => onUpdate(trade.id, imagePatchFromAsset(asset))}
        compact
      />
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

function ModelsView() {
  return (
    <section className="rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">交易模型库</h2>
          <p className="mt-1 text-sm text-slate-400">把模型拆成条件、触发、失效点，避免只看形态名称。</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-950">
          <Plus size={16} />
          新建模型
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {models.map((model) => (
          <article key={model.name} className="rounded-md border border-slate-700/70 bg-ink-950/55 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold">{model.name}</h3>
              {model.favorite && <Star className="shrink-0 fill-amber-300 text-amber-300" size={17} />}
            </div>
            <CandlestickChart model={model.name} accent={model.accent} compact />
            <div className="mt-4 space-y-3 text-sm">
              {model.points.map((point) => (
                <div key={point} className="flex gap-2 text-slate-300">
                  <Check className="mt-0.5 shrink-0 text-emerald-300" size={15} />
                  <span>{point}</span>
                </div>
              ))}
              <div className="rounded-md border border-rose-400/20 bg-rose-500/8 p-3 text-rose-100">
                失效：{model.fail}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewView({ trades, selectedTrade, onSelect, onUpdate, stats }) {
  const insight = buildInsight(trades);
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
  const sessionRows = ['伦敦盘', '纽约盘', '亚洲盘'].map((session) => {
    const group = closedTrades.filter((trade) => trade.session === session);
    const wins = group.filter((trade) => trade.result === 'win').length;
    return { label: session, value: group.length ? Math.round((wins / group.length) * 100) : 0, count: group.length };
  });
  const problemRows = [
    { label: '追单记录', value: 72, count: 6 },
    { label: '止损移动过快', value: 48, count: 4 },
    { label: 'FVG 回踩确认不足', value: 42, count: 4 },
    {
      label: '复盘截图缺失',
      value: Math.round((trades.filter((trade) => !trade.imageAssetId).length / Math.max(trades.length, 1)) * 100),
      count: trades.filter((trade) => !trade.imageAssetId).length,
    },
  ];
  const aiSummary = selectedTrade
    ? `${selectedTrade.model} 的入场逻辑和 ${selectedTrade.timeframe} 结构匹配度较高，重点复查是否等待了二次确认，以及截图中是否完整包含入场、止损、止盈区域。`
    : '请选择一笔交易查看智能复盘。';

  return (
    <section className="grid gap-4 xl:grid-cols-[240px_minmax(360px,1fr)] 2xl:grid-cols-[240px_minmax(380px,1fr)_300px_270px]">
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
                <span className={`font-semibold ${trade.result === 'loss' ? 'text-rose-300' : trade.result === 'pending' ? 'text-amber-300' : 'text-cyan-300'}`}>
                  {Number(trade.rMultiple).toFixed(2)}R
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">{formatDate(trade.date)} · {trade.model}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">{trade.session || '未记录时段'}</span>
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
                <div className="mt-1 text-xs text-slate-500">{formatDate(selectedTrade.date)} · {selectedTrade.session || '未记录时段'} · {selectedTrade.timeframe}</div>
              </div>
              <ResultBadge result={selectedTrade.result} />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="入场" value={selectedTrade.entry} />
              <Metric label="止损" value={selectedTrade.stop} />
              <Metric label="止盈" value={selectedTrade.target} />
              <Metric label="R" value={`${Number(selectedTrade.rMultiple).toFixed(2)}R`} />
              <Metric label="利润" value={formatProfit(selectedTrade.profit)} />
            </div>
            <div className="mb-4 rounded-md border border-slate-700/70 bg-ink-950/55 p-3">
              {selectedTrade.image ? (
                <img src={selectedTrade.image} alt="交易截图" className="max-h-[420px] w-full rounded object-contain" />
              ) : (
                <CandlestickChart model={selectedTrade.model} accent={selectedTrade.result === 'loss' ? 'rose' : selectedTrade.direction === '多' ? 'cyan' : 'amber'} trade={selectedTrade} />
              )}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <TextBlock title="交易计划" text={selectedTrade.plan} empty="暂无计划" />
              <TextBlock title="执行备注" text={selectedTrade.note} empty="暂无备注" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Metric label="风险金额" value={`$${selectedTrade.risk}`} />
              <Metric label="仓位" value={`${selectedTrade.position}%`} />
            </div>
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
              <li>1. 入场确认依赖单一信号，缺少小级别结构二次确认。</li>
              <li>2. 止损移动记录不完整，复盘时难以判断执行质量。</li>
              <li>3. 进行中订单需要和已完结订单分开统计。</li>
            </ol>
          </div>
          <div className="mt-3 rounded-md border border-rose-400/25 bg-rose-500/8 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-100">
              <X size={16} />
              重复出现的错误
            </div>
            <ol className="space-y-1 text-sm leading-6 text-slate-300">
              <li>1. 提前进场，没有等 FVG 或 OB 的明确反应。</li>
              <li>2. 亏损后继续观察同一方向，容易形成确认偏误。</li>
              <li>3. 截图缺少出场后的结构变化。</li>
            </ol>
          </div>
          <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-500/8 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <ShieldCheck size={16} />
              做得好的地方
            </div>
            <ul className="space-y-1 text-sm leading-6 text-slate-300">
              <li>✓ 风险金额和 R 倍数记录清楚。</li>
              <li>✓ 模型标签能帮助后续统计胜率。</li>
              <li>✓ 允许订单先保持进行中，避免过早给结论。</li>
            </ul>
          </div>
          <div className="mt-3 rounded-md border border-sky-400/20 bg-sky-500/8 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-100">
              <ListChecks size={16} />
              改进建议 / 下次执行清单
            </div>
            {['等待价格回踩关键区后再确认入场', '上传包含入场、止损、止盈和出场后的完整截图', '订单未完成前保持进行中，不纳入胜率结论', '每笔交易补充情绪和是否按计划执行'].map((item) => (
              <label key={item} className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" className="h-4 w-4 accent-cyan-400" defaultChecked={item.includes('订单未完成')} />
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
            <DistributionList title="交易时段胜率" rows={sessionRows} />
            <DistributionList title="问题趋势" rows={problemRows} danger />
          </div>
        </div>
        {selectedTrade && (
          <div className="rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow">
            <h2 className="mb-3 font-semibold">截图凭证</h2>
            <PasteImagePanel
              image={selectedTrade.image}
              onImage={(asset) => onUpdate(selectedTrade.id, imagePatchFromAsset(asset))}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsView({ stats, trades, setTrades, setSelectedTradeId, aiConfig, setAiConfig, storageStatus }) {
  const importRef = useRef(null);

  function updateAiConfig(key, value) {
    setAiConfig((current) => ({ ...current, [key]: value }));
  }

  async function exportData() {
    const blob = await buildExportArchive(trades, aiConfig);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smc-journal-export-${new Date().toISOString().slice(0, 10)}.smcj.zip`;
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
      setTrades(nextTrades.length ? nextTrades : seedTrades);
      setSelectedTradeId(nextTrades[0]?.id ?? seedTrades[0].id);
      if (nextPackage.aiConfig) {
        setAiConfig((current) => ({ ...current, ...nextPackage.aiConfig, apiKey: nextPackage.aiConfig.apiKey || current.apiKey || '' }));
      }
    } catch {
      alert('导入失败：请选择由 SMC Journal 导出的 .smcj.zip 文件。');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
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
          <h3 className="font-semibold">导出格式</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-400 md:grid-cols-3">
            <Metric label="manifest" value="格式版本 / 时间 / 数量" />
            <Metric label="trades" value="订单记录 / 图片引用" />
            <Metric label="assets" value="截图二进制文件 / mime / size" />
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
    </section>
  );
}

function TradeModal({ form, setForm, onClose, onSave, onSaveDraft }) {
  const canSave = form.symbol && form.entry && form.stop && form.target;

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
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
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="日期" type="datetime-local" value={form.date ?? ''} onChange={(value) => update('date', value)} />
              <SelectField label="品种" value={form.symbol} onChange={(value) => update('symbol', value)} options={['EUR/USD', 'GBP/USD', 'XAU/USD', 'NAS100', 'US30', 'BTC/USD']} />
              <SelectField label="时间框架" value={form.timeframe} onChange={(value) => update('timeframe', value)} options={['1M', '5M', '15M', '1H', '4H', '1D']} />
              <Segmented label="方向" value={form.direction} onChange={(value) => update('direction', value)} options={['多', '空']} />
              <SelectField label="模型" value={form.model} onChange={(value) => update('model', value)} options={models.map((model) => model.name)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="入场价" required value={form.entry} onChange={(value) => update('entry', value)} />
              <Input label="止损" required value={form.stop} onChange={(value) => update('stop', value)} />
              <Input label="止盈" required value={form.target} onChange={(value) => update('target', value)} />
              <Input label="风险回报比 (R)" value={form.rMultiple} onChange={(value) => update('rMultiple', value)} />
              <Input label="仓位 (%)" value={form.position} onChange={(value) => update('position', value)} />
              <Input label="风险金额 (USD)" value={form.risk} onChange={(value) => update('risk', value)} />
              <Input label="利润 (USD)" value={form.profit} onChange={(value) => update('profit', value)} placeholder="完成后可填写，亏损填负数" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="当前结果" value={form.result} onChange={(value) => update('result', value)} options={['pending', 'win', 'loss']} labels={resultLabels} />
              <Input label="标签" value={form.tags} onChange={(value) => update('tags', value)} placeholder="扫流 FVG 伦敦盘" />
            </div>
            <Textarea label="交易计划" value={form.plan} onChange={(value) => update('plan', value)} placeholder="入场条件、失效条件、管理规则..." />
            <Textarea label="执行备注" value={form.note} onChange={(value) => update('note', value)} placeholder="当时看到的结构、情绪、是否等待确认..." />
            <Textarea label="复盘结论" value={form.review} onChange={(value) => update('review', value)} placeholder="可留空，订单完成后再补。" />
            <Checklist value={form.checklist} onChange={(value) => update('checklist', value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              K 线截图 <span className="text-slate-500">可选</span>
            </label>
            <PasteImagePanel image={form.image} onImage={(asset) => setForm((current) => ({ ...current, ...imagePatchFromAsset(asset) }))} />
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

function PasteImagePanel({ image, onImage, compact = false }) {
  const fileRef = useRef(null);
  const [isOver, setIsOver] = useState(false);

  function readFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    onImage({
      id: createId('asset'),
      blob: file,
      url: URL.createObjectURL(file),
      name: file.name || `chart-${Date.now()}.${extensionFromMime(file.type)}`,
      mime: file.type,
      size: file.size,
    });
  }

  function handlePaste(event) {
    const file = [...event.clipboardData.files].find((item) => item.type.startsWith('image/'));
    if (file) {
      event.preventDefault();
      readFile(file);
    }
  }

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        readFile(event.dataTransfer.files[0]);
      }}
      className={`rounded-md border border-dashed p-3 outline-none transition focus:border-cyan-400 ${
        isOver ? 'border-cyan-300 bg-cyan-500/10' : 'border-cyan-500/45 bg-cyan-500/5'
      }`}
    >
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => readFile(event.target.files[0])} />
      {image ? (
        <div>
          <img src={image} alt="交易截图预览" className={`w-full rounded object-contain ${compact ? 'max-h-44' : 'max-h-72'}`} />
          <div className="mt-3 flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">
              <Upload size={15} />
              替换
            </button>
            <button onClick={() => onImage(null)} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
              移除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`grid w-full place-items-center rounded text-center text-slate-300 ${compact ? 'min-h-28' : 'min-h-56'}`}
        >
          <div>
            <ImagePlus className="mx-auto mb-3 text-cyan-300" size={compact ? 28 : 38} />
            <div className="font-medium">粘贴、拖拽或上传截图</div>
            <div className="mt-1 text-xs text-slate-500">支持 PNG / JPG / WebP，截图可稍后补充</div>
          </div>
        </button>
      )}
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

function CandlestickChart({ model, accent = 'cyan', compact = false, trade }) {
  const candles = getChartCandles(model);
  const colors = {
    cyan: '#22d3ee',
    emerald: '#34d399',
    amber: '#fbbf24',
    rose: '#fb7185',
  };
  const accentColor = colors[accent] ?? colors.cyan;
  const width = 720;
  const height = compact ? 230 : 360;
  const pad = compact ? 22 : 34;
  const values = candles.flatMap((candle) => [candle.high, candle.low]);
  const max = Math.max(...values) + 4;
  const min = Math.min(...values) - 4;
  const chartWidth = width - pad * 2;
  const y = (value) => pad + ((max - value) / (max - min)) * (height - pad * 2);
  const x = (index) => pad + (index / (candles.length - 1)) * chartWidth;
  const bodyWidth = compact ? 10 : 13;
  const annotations = getChartAnnotations(model, compact);

  return (
    <div className={`relative overflow-hidden rounded-md border border-slate-700/70 bg-ink-950/70 ${compact ? 'h-44' : 'h-[360px]'}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={`${model} K 线示意图`}>
        <defs>
          <linearGradient id={`zone-${compact ? 'sm' : 'lg'}-${accent}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
          <line
            key={ratio}
            x1={pad}
            x2={width - pad}
            y1={pad + (height - pad * 2) * ratio}
            y2={pad + (height - pad * 2) * ratio}
            stroke="#203245"
            strokeDasharray="5 7"
            strokeWidth="1"
          />
        ))}
        <path
          d={candles.map((candle, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y((candle.open + candle.close) / 2)}`).join(' ')}
          fill="none"
          stroke={accentColor}
          strokeOpacity="0.26"
          strokeWidth="2"
        />
        {annotations.zones.map((zone) => (
          <g key={zone.label}>
            <rect
              x={x(zone.from)}
              y={y(zone.high)}
              width={x(zone.to) - x(zone.from)}
              height={Math.max(12, y(zone.low) - y(zone.high))}
              fill={`url(#zone-${compact ? 'sm' : 'lg'}-${accent})`}
              stroke={accentColor}
              strokeOpacity="0.25"
              rx="4"
            />
            {!compact && (
              <text x={x(zone.from) + 8} y={y(zone.high) + 18} fill={accentColor} fontSize="12">
                {zone.label}
              </text>
            )}
          </g>
        ))}
        {candles.map((candle, index) => {
          const up = candle.close >= candle.open;
          const candleColor = up ? '#2dd4bf' : '#fb7185';
          const top = y(Math.max(candle.open, candle.close));
          const bottom = y(Math.min(candle.open, candle.close));
          return (
            <g key={index}>
              <line x1={x(index)} x2={x(index)} y1={y(candle.high)} y2={y(candle.low)} stroke={candleColor} strokeWidth="2" strokeLinecap="round" />
              <rect
                x={x(index) - bodyWidth / 2}
                y={top}
                width={bodyWidth}
                height={Math.max(4, bottom - top)}
                fill={up ? '#14b8a6' : '#e11d48'}
                rx="2"
              />
            </g>
          );
        })}
        {annotations.lines.map((line) => (
          <g key={line.label}>
            <line
              x1={x(line.from)}
              x2={x(line.to)}
              y1={y(line.price)}
              y2={y(line.price)}
              stroke={line.tone === 'danger' ? '#fb7185' : accentColor}
              strokeDasharray={line.dashed ? '7 6' : '0'}
              strokeWidth="2"
              strokeOpacity="0.85"
            />
            <text x={x(line.to) + 8} y={y(line.price) + 4} fill={line.tone === 'danger' ? '#fb7185' : accentColor} fontSize={compact ? '10' : '12'}>
              {line.label}
            </text>
          </g>
        ))}
        {annotations.labels.map((label) => (
          <g key={label.text}>
            <circle cx={x(label.index)} cy={y(label.price)} r={compact ? 3 : 4} fill={accentColor} />
            <text x={x(label.index) + 8} y={y(label.price) - 8} fill="#cbd5e1" fontSize={compact ? '10' : '12'}>
              {label.text}
            </text>
          </g>
        ))}
        {trade && (
          <g>
            <text x={pad} y={height - 14} fill="#94a3b8" fontSize="12">
              {trade.symbol} · {trade.direction} · 入场 {trade.entry} · 止损 {trade.stop} · 止盈 {trade.target}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function DistributionList({ title, rows, danger = false }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-slate-400">{title}</div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-400">
              <span className="truncate">{row.label}</span>
              <span>{row.count} 笔 · {row.value}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${danger ? 'bg-rose-400' : 'bg-cyan-400'}`}
                style={{ width: `${Math.max(row.value, row.count ? 8 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getChartCandles(model) {
  if (model.includes('FVG')) {
    return [
      { open: 56, close: 61, high: 64, low: 54 },
      { open: 61, close: 67, high: 70, low: 60 },
      { open: 68, close: 76, high: 80, low: 66 },
      { open: 76, close: 73, high: 78, low: 70 },
      { open: 74, close: 82, high: 86, low: 73 },
      { open: 85, close: 94, high: 98, low: 83 },
      { open: 93, close: 89, high: 96, low: 87 },
      { open: 88, close: 92, high: 94, low: 84 },
      { open: 93, close: 101, high: 104, low: 92 },
      { open: 101, close: 107, high: 110, low: 99 },
      { open: 106, close: 111, high: 114, low: 105 },
      { open: 112, close: 108, high: 115, low: 104 },
    ];
  }
  if (model.includes('OB')) {
    return [
      { open: 108, close: 101, high: 110, low: 98 },
      { open: 101, close: 94, high: 103, low: 90 },
      { open: 94, close: 88, high: 96, low: 84 },
      { open: 88, close: 91, high: 94, low: 82 },
      { open: 91, close: 86, high: 93, low: 80 },
      { open: 86, close: 78, high: 88, low: 74 },
      { open: 78, close: 83, high: 86, low: 75 },
      { open: 83, close: 91, high: 94, low: 81 },
      { open: 91, close: 99, high: 102, low: 89 },
      { open: 99, close: 104, high: 107, low: 96 },
      { open: 104, close: 110, high: 113, low: 101 },
      { open: 110, close: 106, high: 114, low: 103 },
    ];
  }
  if (model.includes('Breaker')) {
    return [
      { open: 64, close: 70, high: 73, low: 62 },
      { open: 70, close: 76, high: 79, low: 68 },
      { open: 76, close: 83, high: 86, low: 74 },
      { open: 84, close: 78, high: 87, low: 75 },
      { open: 78, close: 72, high: 80, low: 69 },
      { open: 72, close: 66, high: 74, low: 62 },
      { open: 66, close: 61, high: 68, low: 58 },
      { open: 61, close: 66, high: 69, low: 59 },
      { open: 66, close: 70, high: 73, low: 64 },
      { open: 70, close: 65, high: 72, low: 61 },
      { open: 65, close: 58, high: 67, low: 54 },
      { open: 58, close: 53, high: 60, low: 49 },
    ];
  }
  return [
    { open: 88, close: 83, high: 91, low: 80 },
    { open: 83, close: 78, high: 86, low: 74 },
    { open: 78, close: 72, high: 81, low: 68 },
    { open: 72, close: 66, high: 74, low: 58 },
    { open: 66, close: 62, high: 69, low: 54 },
    { open: 62, close: 71, high: 73, low: 57 },
    { open: 71, close: 80, high: 84, low: 69 },
    { open: 80, close: 86, high: 88, low: 77 },
    { open: 86, close: 82, high: 90, low: 80 },
    { open: 82, close: 91, high: 94, low: 81 },
    { open: 91, close: 99, high: 102, low: 90 },
    { open: 99, close: 104, high: 108, low: 96 },
  ];
}

function getChartAnnotations(model, compact) {
  if (model.includes('FVG')) {
    return {
      zones: [{ from: 3, to: 8, high: 86, low: 76, label: 'FVG' }],
      lines: [{ from: 2, to: 11, price: 76, label: compact ? 'FVG' : '缺口中位', dashed: true }],
      labels: [{ index: 5, price: 98, text: 'Impulse' }],
    };
  }
  if (model.includes('OB')) {
    return {
      zones: [{ from: 3, to: 8, high: 94, low: 80, label: 'OB' }],
      lines: [{ from: 0, to: 11, price: 80, label: compact ? 'SL' : 'OB 失效线', dashed: true, tone: 'danger' }],
      labels: [{ index: 7, price: 94, text: 'Reaction' }],
    };
  }
  if (model.includes('Breaker')) {
    return {
      zones: [{ from: 2, to: 9, high: 74, low: 62, label: 'Breaker' }],
      lines: [{ from: 1, to: 11, price: 62, label: compact ? 'Retest' : '回测后破位', dashed: true }],
      labels: [{ index: 8, price: 73, text: 'Retest' }],
    };
  }
  return {
    zones: [{ from: 6, to: 10, high: 84, low: 72, label: 'FVG / OB' }],
    lines: [{ from: 0, to: 11, price: 74, label: compact ? 'ChoCH' : 'ChoCH 结构线', dashed: true }],
    labels: [
      { index: 4, price: 54, text: 'Liquidity Sweep' },
      { index: 7, price: 88, text: 'ChoCH' },
    ],
  };
}

function FieldShell({ icon, children }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-ink-950/70 px-3 py-2 text-slate-400">
      {icon}
      {children}
    </div>
  );
}

function Select({ value, onChange, options, labels = {} }) {
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

function Input({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
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

function Textarea({ label, value, onChange, placeholder }) {
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

function SelectField({ label, value, onChange, options, labels }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <Select value={value} onChange={onChange} options={options} labels={labels} />
    </label>
  );
}

function Segmented({ label, value, onChange, options }) {
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

function TextBlock({ title, text, empty }) {
  return (
    <div className="mt-3 rounded-md border border-slate-700/70 bg-ink-950/45 p-3">
      <div className="mb-1 text-xs text-slate-500">{title}</div>
      <p className="text-sm leading-6 text-slate-300">{text || empty}</p>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-slate-700/70 bg-ink-950/55 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function StatusPill({ label, value, tone }) {
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

function ResultBadge({ result }) {
  const styles = {
    win: 'bg-emerald-500/14 text-emerald-200 border-emerald-400/25',
    loss: 'bg-rose-500/14 text-rose-200 border-rose-400/25',
    pending: 'bg-amber-500/14 text-amber-200 border-amber-400/25',
  };
  return <span className={`inline-flex rounded border px-2.5 py-1 text-xs font-semibold ${styles[result] ?? styles.pending}`}>{resultLabels[result] ?? resultLabels.pending}</span>;
}

const resultLabels = {
  win: '盈利',
  loss: '亏损',
  pending: '进行中',
};

function formatProfit(value) {
  if (value === '' || value === undefined || value === null) return '-';
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) return '-';
  const prefix = number > 0 ? '+' : '';
  return `${prefix}$${number.toFixed(2)}`;
}

function profitTone(value) {
  const number = Number.parseFloat(value);
  if (Number.isNaN(number) || number === 0) return 'text-slate-300';
  return number > 0 ? 'text-emerald-300' : 'text-rose-300';
}

function openJournalDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(tradeStoreName)) {
        db.createObjectStore(tradeStoreName, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(assetStoreName)) {
        db.createObjectStore(assetStoreName, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(settingsStoreName)) {
        db.createObjectStore(settingsStoreName, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function closeDb(db) {
  if (db) db.close();
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function loadTradesFromDb() {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction([tradeStoreName, assetStoreName], 'readonly');
    const done = transactionDone(transaction);
    const tradeRecords = await requestToPromise(transaction.objectStore(tradeStoreName).getAll());
    const assetRecords = await requestToPromise(transaction.objectStore(assetStoreName).getAll());
    await done;
    const assetsById = new Map(assetRecords.map((asset) => [asset.id, asset]));
    return tradeRecords.map((record) => hydrateTradeImage(normalizeTrade(record), assetsById.get(record.imageAssetId)));
  } finally {
    closeDb(db);
  }
}

async function saveTradesToDb(trades) {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction([tradeStoreName, assetStoreName], 'readwrite');
    const tradeStore = transaction.objectStore(tradeStoreName);
    const assetStore = transaction.objectStore(assetStoreName);
    tradeStore.clear();
    assetStore.clear();
    trades.map(normalizeTrade).forEach((trade) => {
      if (trade.imageAssetId && trade.imageBlob) {
        assetStore.put({
          id: trade.imageAssetId,
          blob: trade.imageBlob,
          name: trade.imageName || `${trade.imageAssetId}.${extensionFromMime(trade.imageMime)}`,
          mime: trade.imageMime || trade.imageBlob.type || 'application/octet-stream',
          size: trade.imageSize || trade.imageBlob.size || 0,
          createdAt: trade.imageCreatedAt || new Date().toISOString(),
        });
      }
      tradeStore.put(stripRuntimeTradeFields(trade));
    });
    await transactionDone(transaction);
  } finally {
    closeDb(db);
  }
}

async function loadAiConfigFromDb() {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction(settingsStoreName, 'readonly');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(settingsStoreName);
    const record = await requestToPromise(store.get(aiConfigKey));
    await done;
    return { ...defaultAiConfig, ...(record?.value ?? {}) };
  } finally {
    closeDb(db);
  }
}

async function saveAiConfigToDb(aiConfig) {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction(settingsStoreName, 'readwrite');
    transaction.objectStore(settingsStoreName).put({ key: aiConfigKey, value: aiConfig });
    await transactionDone(transaction);
  } finally {
    closeDb(db);
  }
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function normalizeTrade(trade) {
  return {
    ...emptyForm,
    ...trade,
    id: trade.id || `T-${Date.now()}`,
    date: trade.date || toInputDateTime(new Date()),
    rMultiple: Number.parseFloat(trade.rMultiple) || 0,
    profit: trade.profit === '' || trade.profit === undefined || trade.profit === null ? '' : String(Number.parseFloat(trade.profit) || 0),
    tags: Array.isArray(trade.tags)
      ? trade.tags
      : String(trade.tags || '')
          .split(/[,\s，]+/)
          .map((tag) => tag.trim())
          .filter(Boolean),
    checklist: Array.isArray(trade.checklist) ? trade.checklist : [],
    result: resultLabels[trade.result] ? trade.result : 'pending',
    image: trade.imageAssetId && typeof trade.image === 'string' ? trade.image : '',
    imageAssetId: typeof trade.imageAssetId === 'string' ? trade.imageAssetId : '',
    imageName: typeof trade.imageName === 'string' ? trade.imageName : '',
    imageMime: typeof trade.imageMime === 'string' ? trade.imageMime : '',
    imageSize: Number(trade.imageSize) || 0,
  };
}

function imagePatchFromAsset(asset) {
  if (!asset) {
    return {
      image: '',
      imageAssetId: '',
      imageName: '',
      imageMime: '',
      imageSize: 0,
      imageBlob: undefined,
      imageCreatedAt: '',
    };
  }
  return {
    image: asset.url,
    imageAssetId: asset.id,
    imageName: asset.name,
    imageMime: asset.mime,
    imageSize: asset.size,
    imageBlob: asset.blob,
    imageCreatedAt: new Date().toISOString(),
  };
}

function hydrateTradeImage(trade, asset) {
  if (!asset?.blob) return trade;
  return {
    ...trade,
    image: URL.createObjectURL(asset.blob),
    imageAssetId: asset.id,
    imageName: asset.name,
    imageMime: asset.mime,
    imageSize: asset.size,
    imageBlob: asset.blob,
    imageCreatedAt: asset.createdAt,
  };
}

function stripRuntimeTradeFields(trade) {
  const normalized = normalizeTrade(trade);
  const { imageBlob, imageCreatedAt, ...storedTrade } = normalized;
  return {
    ...storedTrade,
    image: '',
  };
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extensionFromMime(mime = '') {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'bin';
}

async function buildExportArchive(trades, aiConfig) {
  const exportedAt = new Date().toISOString();
  const storedTrades = trades.map(stripRuntimeTradeFields);
  const assetEntries = trades
    .filter((trade) => trade.imageAssetId && trade.imageBlob)
    .map((trade) => ({
      id: trade.imageAssetId,
      file: `assets/${trade.imageAssetId}.${extensionFromMime(trade.imageMime || trade.imageBlob.type)}`,
      name: trade.imageName || '',
      mime: trade.imageMime || trade.imageBlob.type || 'application/octet-stream',
      size: trade.imageSize || trade.imageBlob.size || 0,
      tradeId: trade.id,
      blob: trade.imageBlob,
    }));
  const manifest = {
    app: 'SMC Journal',
    format: 'smc-journal-archive',
    formatVersion: 2,
    exportedAt,
    counts: {
      trades: storedTrades.length,
      assets: assetEntries.length,
    },
    files: {
      trades: 'trades.json',
      aiConfig: 'ai-config.json',
      assets: assetEntries.map(({ blob, ...asset }) => asset),
    },
  };
  const publicAiConfig = { ...aiConfig, apiKey: '' };
  const entries = [
    { path: 'manifest.json', data: encodeJson(manifest) },
    { path: 'trades.json', data: encodeJson(storedTrades) },
    { path: 'ai-config.json', data: encodeJson(publicAiConfig) },
  ];
  for (const asset of assetEntries) {
    entries.push({ path: asset.file, data: new Uint8Array(await asset.blob.arrayBuffer()) });
  }
  return new Blob([createZip(entries)], { type: 'application/zip' });
}

async function parseImportArchive(buffer) {
  const files = readZipEntries(new Uint8Array(buffer));
  const manifest = parseJsonFile(files, 'manifest.json');
  if (manifest?.format !== 'smc-journal-archive') throw new Error('Invalid archive format');
  const trades = parseJsonFile(files, manifest.files?.trades || 'trades.json');
  const aiConfig = parseJsonFile(files, manifest.files?.aiConfig || 'ai-config.json');
  const assets = new Map((manifest.files?.assets || []).map((asset) => [asset.id, asset]));
  return {
    trades: trades.map((trade) => {
      const normalized = normalizeTrade(trade);
      const asset = assets.get(normalized.imageAssetId);
      const bytes = asset ? files.get(asset.file) : null;
      if (!asset || !bytes) return normalized;
      const blob = new Blob([bytes], { type: asset.mime || 'application/octet-stream' });
      return hydrateTradeImage(normalized, {
        id: asset.id,
        blob,
        name: asset.name,
        mime: asset.mime,
        size: asset.size || blob.size,
        createdAt: new Date().toISOString(),
      });
    }),
    aiConfig,
  };
}

function parseImportPackage(parsed) {
  const importedTrades = Array.isArray(parsed) ? parsed : parsed.trades || parsed.data?.trades;
  if (!Array.isArray(importedTrades)) throw new Error('Invalid import file');
  return {
    trades: importedTrades.map((trade) => normalizeTrade({ ...trade, image: '' })),
    aiConfig: parsed.aiConfig || parsed.data?.aiConfig,
  };
}

function encodeJson(value) {
  return new TextEncoder().encode(JSON.stringify(value, null, 2));
}

function parseJsonFile(files, path) {
  const bytes = files.get(path);
  if (!bytes) throw new Error(`Missing ${path}`);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.path);
    const data = entry.data;
    const crc = crc32(data);
    const local = zipHeader(0x04034b50, [
      [2, 20],
      [2, 0],
      [2, 0],
      [2, 0],
      [2, 0],
      [4, crc],
      [4, data.length],
      [4, data.length],
      [2, name.length],
      [2, 0],
    ]);
    localParts.push(local, name, data);
    const central = zipHeader(0x02014b50, [
      [2, 20],
      [2, 20],
      [2, 0],
      [2, 0],
      [2, 0],
      [2, 0],
      [4, crc],
      [4, data.length],
      [4, data.length],
      [2, name.length],
      [2, 0],
      [2, 0],
      [2, 0],
      [2, 0],
      [4, 0],
      [4, offset],
    ]);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = zipHeader(0x06054b50, [
    [2, 0],
    [2, 0],
    [2, entries.length],
    [2, entries.length],
    [4, centralSize],
    [4, offset],
    [2, 0],
  ]);
  return concatBytes([...localParts, ...centralParts, end]);
}

function readZipEntries(bytes) {
  const endOffset = findZipEnd(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entryCount = view.getUint16(endOffset + 10, true);
  let centralOffset = view.getUint32(endOffset + 16, true);
  const files = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) throw new Error('Invalid central directory');
    const method = view.getUint16(centralOffset + 10, true);
    if (method !== 0) throw new Error('Compressed ZIP files are not supported');
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    files.set(name, bytes.slice(dataStart, dataStart + compressedSize));
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function findZipEnd(bytes) {
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (bytes[index] === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x05 && bytes[index + 3] === 0x06) {
      return index;
    }
  }
  throw new Error('Invalid ZIP archive');
}

function zipHeader(signature, fields) {
  const length = 4 + fields.reduce((sum, [size]) => sum + size, 0);
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);
  let offset = 4;
  fields.forEach(([size, value]) => {
    if (size === 2) view.setUint16(offset, value, true);
    if (size === 4) view.setUint32(offset, value >>> 0, true);
    offset += size;
  });
  return bytes;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function calculateStats(trades) {
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

function buildInsight(trades) {
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

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toInputDateTime(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default App;
