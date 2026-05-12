import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import ModelsView from './components/ModelsView.jsx';
import OrdersView from './components/OrdersView.jsx';
import ReviewView from './components/ReviewView.jsx';
import SettingsView from './components/SettingsView.jsx';
import Sidebar from './components/Sidebar.jsx';
import TradeModal from './components/TradeModal.jsx';
import { defaultAiConfig, emptyForm, mergeSeedModelDetails, seedModels, tagPresets as defaultTagPresets } from './data.js';
import { clearJournalDb, loadAiConfigFromDb, loadModelsFromDb, loadTagPresetsFromDb, loadTradesFromDb, saveAiConfigToDb, saveModelsToDb, saveTagPresetsToDb, saveTradesToDb } from './storage.js';
import { createId, normalizeModel, normalizeTrade } from './tradeAssets.js';
import { calculateRiskReward } from './tradeMath.js';
import { buildTradePlan } from './tradePlan.js';
import { calculateStats, toInputDateTime } from './tradeUtils.js';

function App() {
  const [trades, setTrades] = useState([]);
  const [models, setModels] = useState(seedModels);
  const [aiConfig, setAiConfig] = useState(defaultAiConfig);
  const [tagPresets, setTagPresets] = useState(defaultTagPresets);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState('正在加载 IndexedDB...');
  const persistenceReadyRef = useRef({ trades: false, models: false, aiConfig: false, tagPresets: false });
  const initialPersistSkippedRef = useRef({ trades: false, models: false, aiConfig: false, tagPresets: false });
  const [activeView, setActiveView] = useState('orders');
  const [query, setQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('全部模型');
  const [resultFilter, setResultFilter] = useState('全部结果');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [lastCreatedModelId, setLastCreatedModelId] = useState('');

  useEffect(() => {
    let ignore = false;
    async function hydrate() {
      const [tradesResult, modelsResult, aiConfigResult, tagPresetsResult] = await Promise.allSettled([loadTradesFromDb(), loadModelsFromDb(), loadAiConfigFromDb(), loadTagPresetsFromDb()]);
      if (ignore) return;

      const ready = {
        trades: tradesResult.status === 'fulfilled',
        models: modelsResult.status === 'fulfilled',
        aiConfig: aiConfigResult.status === 'fulfilled',
        tagPresets: tagPresetsResult.status === 'fulfilled',
      };
      persistenceReadyRef.current = ready;

      const nextTrades = ready.trades ? tradesResult.value : [];
      setTrades(nextTrades);
      setSelectedTradeId(nextTrades[0]?.id ?? '');
      setModels(ready.models ? mergeSeedModelDetails(modelsResult.value) : seedModels);
      setAiConfig(ready.aiConfig ? aiConfigResult.value : defaultAiConfig);
      setTagPresets(ready.tagPresets ? tagPresetsResult.value : defaultTagPresets);

      const failedStores = [
        ready.trades ? '' : '订单',
        ready.models ? '' : '模型',
        ready.aiConfig ? '' : 'AI 配置',
        ready.tagPresets ? '' : '标签预设',
      ].filter(Boolean);
      setStorageStatus(failedStores.length ? `IndexedDB 部分加载失败：${failedStores.join('、')}暂不自动覆盖` : 'IndexedDB 已连接');
      setIsHydrated(true);
    }
    hydrate();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !persistenceReadyRef.current.trades) return;
    if (!initialPersistSkippedRef.current.trades) {
      initialPersistSkippedRef.current.trades = true;
      return;
    }
    saveTradesToDb(trades)
      .then(() => setStorageStatus('IndexedDB 已保存'))
      .catch(() => setStorageStatus('IndexedDB 保存失败'));
  }, [isHydrated, trades]);

  useEffect(() => {
    if (!isHydrated || !persistenceReadyRef.current.aiConfig) return;
    if (!initialPersistSkippedRef.current.aiConfig) {
      initialPersistSkippedRef.current.aiConfig = true;
      return;
    }
    saveAiConfigToDb(aiConfig).catch(() => setStorageStatus('AI 配置保存失败'));
  }, [aiConfig, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !persistenceReadyRef.current.models) return;
    if (!initialPersistSkippedRef.current.models) {
      initialPersistSkippedRef.current.models = true;
      return;
    }
    saveModelsToDb(models).catch(() => setStorageStatus('模型保存失败'));
  }, [isHydrated, models]);

  useEffect(() => {
    if (!isHydrated || !persistenceReadyRef.current.tagPresets) return;
    if (!initialPersistSkippedRef.current.tagPresets) {
      initialPersistSkippedRef.current.tagPresets = true;
      return;
    }
    saveTagPresetsToDb(tagPresets).catch(() => setStorageStatus('标签预设保存失败'));
  }, [isHydrated, tagPresets]);

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
    const plannedSource = { ...source, rMultiple };
    const trade = {
      ...plannedSource,
      id,
      date: source.date || toInputDateTime(new Date()),
      rMultiple,
      plan: buildTradePlan(plannedSource, models),
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

  function deleteTrade(id) {
    setTrades((current) => {
      const nextTrades = current.filter((trade) => trade.id !== id);
      if (selectedTradeId === id) {
        setSelectedTradeId(nextTrades[0]?.id ?? '');
      }
      return nextTrades;
    });
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

  function addTagPreset(tag) {
    const normalized = String(tag || '').trim();
    if (!normalized) return;
    setTagPresets((current) => (current.includes(normalized) ? current : [...current, normalized]));
  }

  function deleteTagPreset(tag) {
    if (defaultTagPresets.includes(tag)) return;
    setTagPresets((current) => current.filter((item) => item !== tag));
  }

  function createModel() {
    const index = models.length + 1;
    const model = normalizeModel({
      id: createId('model'),
      name: `自定义模型 ${index}`,
      favorite: false,
      accent: ['cyan', 'emerald', 'amber', 'rose'][index % 4],
      directionRules: {
        long: {
          logic: '',
          points: ['补充做多模型成立条件', '补充做多触发信号', '补充做多入场管理规则'],
          triggers: [],
          fail: '补充做多模型失效条件。',
          keyPoints: [],
        },
        short: {
          logic: '',
          points: ['补充做空模型成立条件', '补充做空触发信号', '补充做空入场管理规则'],
          triggers: [],
          fail: '补充做空模型失效条件。',
          keyPoints: [],
        },
      },
    });
    setModels((current) => [...current, model]);
    setLastCreatedModelId(model.id);
  }

  function toggleModelFavorite(id) {
    setModels((current) => current.map((model) => (model.id === id ? { ...model, favorite: !model.favorite } : model)));
  }

  function updateModel(id, patch) {
    const currentModel = models.find((model) => model.id === id);
    setModels((current) => current.map((model) => (model.id === id ? normalizeModel({ ...model, ...patch }) : model)));
    if (patch.name && currentModel?.name && patch.name !== currentModel.name) {
      setTrades((currentTrades) => currentTrades.map((trade) => (trade.model === currentModel.name ? { ...trade, model: patch.name } : trade)));
      if (modelFilter === currentModel.name) {
        setModelFilter(patch.name);
      }
    }
  }

  function deleteModel(id) {
    const seedModelIds = new Set(seedModels.map((model) => model.id));
    if (seedModelIds.has(id)) return;
    setModels((current) => {
      const model = current.find((item) => item.id === id);
      if (modelFilter === model?.name) {
        setModelFilter('全部模型');
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function clearAllData() {
    try {
      await clearJournalDb();
      persistenceReadyRef.current = { trades: true, models: true, aiConfig: true, tagPresets: true };
      initialPersistSkippedRef.current = { trades: true, models: true, aiConfig: true, tagPresets: true };
      setTrades([]);
      setModels(seedModels);
      setAiConfig(defaultAiConfig);
      setTagPresets(defaultTagPresets);
      setSelectedTradeId('');
      setStorageStatus('已清空，等待新数据');
    } catch {
      setStorageStatus('清除失败：IndexedDB 结构异常');
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-100 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] min-w-0 flex-col gap-4 px-3 py-4 lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden lg:px-5">
        <Sidebar activeView={activeView} onViewChange={setActiveView} stats={stats} />
        <main className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
          <Header trades={trades} onNewTrade={openNewTrade} />
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
              onDelete={deleteTrade}
              onCloseTrade={closeTrade}
              onNewTrade={openNewTrade}
            />
          )}
          {activeView === 'models' && (
            <ModelsView
              models={models}
              lastCreatedModelId={lastCreatedModelId}
              onCreateModel={createModel}
              onToggleFavorite={toggleModelFavorite}
              onUpdateModel={updateModel}
              onDeleteModel={deleteModel}
            />
          )}
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
              tagPresets={tagPresets}
              setTagPresets={setTagPresets}
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
          tagPresets={tagPresets}
          defaultTagPresets={defaultTagPresets}
          onAddTagPreset={addTagPreset}
          onDeleteTagPreset={deleteTagPreset}
        />
      )}
    </div>
  );
}


export default App;
