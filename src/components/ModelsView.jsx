import { Plus, Star } from 'lucide-react';
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import bosPullbackImage from '../../images/BOS Pullback.jpg';
import breakerBlockImage from '../../images/Breaker Block.jpg';
import equalHighsLowsImage from '../../images/Equal Highs : Equal Lows Liquidity Run.jpg';
import fvgContinuationImage from '../../images/FVG Continuation.jpg';
import inducementSweepPoiImage from '../../images/Inducement + Sweep + POI.jpg';
import liquiditySweepChochImage from '../../images/Liquidity Sweep + ChoCH.jpg';
import obReversalImage from '../../images/OB Reversal.jpg';
import { seedModels } from '../data.js';
import ModelEditor from './ModelEditor.jsx';

const referenceImages = {
  'liquidity-sweep-choch': liquiditySweepChochImage,
  'fvg-continuation': fvgContinuationImage,
  'ob-reversal': obReversalImage,
  'bos-pullback': bosPullbackImage,
  'inducement-sweep-poi': inducementSweepPoiImage,
  'breaker-block': breakerBlockImage,
  'equal-highs-lows-run': equalHighsLowsImage,
};

export default function ModelsView({ models, lastCreatedModelId, onCreateModel, onToggleFavorite, onUpdateModel, onDeleteModel }) {
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const seedModelIds = useMemo(() => new Set(seedModels.map((model) => model.id)), []);
  const selectedModel = models.find((model) => model.id === selectedModelId) || models[0];

  useEffect(() => {
    if (!lastCreatedModelId) return;
    setSelectedModelId(lastCreatedModelId);
  }, [lastCreatedModelId]);

  useEffect(() => {
    if (!models.length) {
      setSelectedModelId('');
      return;
    }
    if (!models.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  return (
    <section className="rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">交易模型库</h2>
          <p className="mt-1 text-sm text-slate-400">每个模型分别维护做多和做空描述，下单时交易计划会按方向引用。</p>
        </div>
        <button onClick={onCreateModel} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-950">
          <Plus size={16} />
          新建模型
        </button>
      </div>
      <div className="grid min-h-0 gap-4 lg:h-[calc(100%-76px)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto rounded-md border border-slate-700/70 bg-ink-950/45 p-2">
          <div className="space-y-2">
            {models.map((model) => {
              const active = selectedModel?.id === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModelId(model.id)}
                  className={`flex w-full items-start justify-between gap-3 rounded-md border px-3 py-3 text-left transition ${
                    active ? 'border-cyan-400/50 bg-cyan-500/12' : 'border-transparent hover:border-slate-700 hover:bg-slate-800/45'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-100">{model.name}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{model.title || 'SMC 模型'}</span>
                  </span>
                  {model.favorite && <Star className="mt-0.5 shrink-0 fill-amber-300 text-amber-300" size={15} />}
                </button>
              );
            })}
          </div>
        </aside>
        <div className="min-h-0 overflow-y-auto rounded-md border border-slate-700/70 bg-ink-950/45">
          {selectedModel ? (
            <ModelEditor
              model={selectedModel}
              canDelete={!seedModelIds.has(selectedModel.id)}
              onToggleFavorite={() => onToggleFavorite(selectedModel.id)}
              onUpdate={(patch) => onUpdateModel(selectedModel.id, patch)}
              onDelete={() => onDeleteModel(selectedModel.id)}
              referenceChart={<ReferenceChart model={selectedModel} />}
            />
          ) : (
            <div className="grid min-h-80 place-items-center text-sm text-slate-500">暂无模型</div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReferenceChart({ model }) {
  const image = referenceImages[model.referenceImage];
  if (!image) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-500">
        暂无参考图
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-700/70 bg-white">
      <div className="grid place-items-center bg-white p-2">
        <img
          src={image}
          alt={`${model.name} K 线示意图`}
          className="h-auto max-h-[340px] w-full object-contain"
        />
      </div>
      <div className="border-t border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">{model.name} K 线示意图</div>
    </div>
  );
}
