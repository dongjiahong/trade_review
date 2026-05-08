import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import ModelsView from './components/ModelsView.jsx';
import OrdersView from './components/OrdersView.jsx';
import ReviewView from './components/ReviewView.jsx';
import SettingsView from './components/SettingsView.jsx';
import Sidebar from './components/Sidebar.jsx';
import TradeModal from './components/TradeModal.jsx';
import { defaultAiConfig, emptyForm, mergeSeedModelDetails, seedModels } from './data.js';
import { clearJournalDb, loadAiConfigFromDb, loadModelsFromDb, loadTradesFromDb, saveAiConfigToDb, saveModelsToDb, saveTradesToDb } from './storage.js';
import { createId, normalizeModel, normalizeTrade } from './tradeAssets.js';
import { calculateRiskReward } from './tradeMath.js';
import { calculateStats, toInputDateTime } from './tradeUtils.js';

function App() {
  const [trades, setTrades] = useState([]);
  const [models, setModels] = useState(seedModels);
  const [aiConfig, setAiConfig] = useState(defaultAiConfig);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState('正在加载 IndexedDB...');
  const [activeView, setActiveView] = useState('orders');
  const [query, setQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('全部模型');
  const [resultFilter, setResultFilter] = useState('全部结果');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedTradeId, setSelectedTradeId] = useState('');

  useEffect(() => {
    let ignore = false;
    async function hydrate() {
      try {
        const [storedTrades, storedModels, storedAiConfig] = await Promise.all([loadTradesFromDb(), loadModelsFromDb(), loadAiConfigFromDb()]);
        if (ignore) return;
        const nextTrades = storedTrades;
        const nextModels = mergeSeedModelDetails(storedModels);
        setTrades(nextTrades);
        setModels(nextModels);
        setSelectedTradeId(nextTrades[0]?.id ?? '');
        setAiConfig(storedAiConfig);
        setStorageStatus('IndexedDB 已连接');
      } catch {
        if (ignore) return;
        setTrades([]);
        setModels(seedModels);
        setSelectedTradeId('');
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

  useEffect(() => {
    if (!isHydrated) return;
    saveModelsToDb(models).catch(() => setStorageStatus('模型保存失败'));
  }, [isHydrated, models]);

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
    setForm({ ...emptyForm, model: models[0]?.name ?? '', date: toInputDateTime(new Date()) });
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
    const rMultiple = calculateRiskReward(source);
    const profit = source.profit;
    const trade = {
      ...source,
      id,
      date: source.date || toInputDateTime(new Date()),
      rMultiple,
      profit: profit === '' ? '' : String(Number.parseFloat(profit) || 0),
      result: source.result,
      closedAt: source.closePrice ? source.closedAt || toInputDateTime(new Date()) : '',
      tags: source.tags
        .split(/[,\s，]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    setTrades((current) => [trade, ...current]);
    setSelectedTradeId(id);
  }

  function updateTrade(id, patch) {
    setTrades((current) => current.map((trade) => (trade.id === id ? normalizeTrade({ ...trade, ...patch }) : trade)));
  }

  function closeTrade(id, closePrice, profit) {
    const profitNumber = Number.parseFloat(profit);
    setTrades((current) =>
      current.map((trade) =>
        trade.id === id
          ? normalizeTrade({
              ...trade,
              closePrice,
              profit: Number.isFinite(profitNumber) ? String(profitNumber) : trade.profit,
              result: Number.isFinite(profitNumber) ? (profitNumber >= 0 ? 'win' : 'loss') : trade.result,
              closedAt: toInputDateTime(new Date()),
            })
          : trade,
      ),
    );
  }

  function createModel() {
    const index = models.length + 1;
    const model = normalizeModel({
      id: createId('model'),
      name: `自定义模型 ${index}`,
      favorite: false,
      accent: ['cyan', 'emerald', 'amber', 'rose'][index % 4],
      points: ['补充模型成立条件', '补充触发信号', '补充入场管理规则'],
      fail: '补充模型失效条件。',
    });
    setModels((current) => [...current, model]);
  }

  function toggleModelFavorite(id) {
    setModels((current) => current.map((model) => (model.id === id ? { ...model, favorite: !model.favorite } : model)));
  }

  function updateModel(id, patch) {
    setModels((current) => current.map((model) => (model.id === id ? normalizeModel({ ...model, ...patch }) : model)));
  }

  async function clearAllData() {
    await clearJournalDb();
    setTrades([]);
    setModels(seedModels);
    setAiConfig(defaultAiConfig);
    setSelectedTradeId('');
    setStorageStatus('已清空，等待新数据');
  }

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-100 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] min-w-0 flex-col gap-4 px-3 py-4 lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden lg:px-5">
        <Sidebar activeView={activeView} onViewChange={setActiveView} stats={stats} />
        <main className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
          <Header onNewTrade={openNewTrade} />
          {activeView === 'orders' && (
            <OrdersView
              trades={filteredTrades}
              allTrades={trades}
              models={models}
              query={query}
              setQuery={setQuery}
              modelFilter={modelFilter}
              setModelFilter={setModelFilter}
              resultFilter={resultFilter}
              setResultFilter={setResultFilter}
              onSelect={setSelectedTradeId}
              selectedTradeId={selectedTrade?.id}
              onUpdate={updateTrade}
              onCloseTrade={closeTrade}
              onNewTrade={openNewTrade}
            />
          )}
          {activeView === 'models' && <ModelsView models={models} onCreateModel={createModel} onToggleFavorite={toggleModelFavorite} onUpdateModel={updateModel} />}
          {activeView === 'review' && (
            <ReviewView
              trades={trades}
              selectedTrade={selectedTrade}
              onSelect={setSelectedTradeId}
              onUpdate={updateTrade}
              stats={stats}
              models={models}
            />
          )}
          {activeView === 'settings' && (
            <SettingsView
              stats={stats}
              trades={trades}
              setTrades={setTrades}
              models={models}
              setModels={setModels}
              setSelectedTradeId={setSelectedTradeId}
              aiConfig={aiConfig}
              setAiConfig={setAiConfig}
              storageStatus={storageStatus}
              onClearData={clearAllData}
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
          models={models}
        />
      )}
    </div>
  );
}


export default App;
