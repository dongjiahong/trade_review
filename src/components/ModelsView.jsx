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
  const [openModelIds, setOpenModelIds] = useState(new Set());
  const seedModelIds = useMemo(() => new Set(seedModels.map((model) => model.id)), []);

  useEffect(() => {
    if (!lastCreatedModelId) return;
    setOpenModelIds((current) => new Set(current).add(lastCreatedModelId));
  }, [lastCreatedModelId]);

  function toggleModelOpen(id) {
    setOpenModelIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <section className="rounded-md border border-slate-700/70 bg-ink-900/82 p-4 shadow-glow lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">交易模型库</h2>
          <p className="mt-1 text-sm text-slate-400">把模型拆成条件、触发、失效点，避免只看形态名称。</p>
        </div>
        <button onClick={onCreateModel} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-950">
          <Plus size={16} />
          新建模型
        </button>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {models.map((model) => {
          const isOpen = openModelIds.has(model.id);
          return (
            <article key={model.id} className="rounded-md border border-slate-700/70 bg-ink-950/55">
              <div
                onClick={() => toggleModelOpen(model.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleModelOpen(model.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className="flex w-full cursor-pointer items-start justify-between gap-3 p-4 text-left"
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-3 text-xs font-semibold text-cyan-300">{model.title || 'SMC 模型'}</div>
                  <div className="truncate text-lg font-semibold text-slate-100">{model.name}</div>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(model.id);
                  }}
                  className={`shrink-0 rounded p-1 ${model.favorite ? 'text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                  title="收藏模型"
                >
                  <Star className={model.favorite ? 'fill-amber-300' : ''} size={17} />
                </button>
              </div>
              {isOpen && (
                <ModelEditor
                  model={model}
                  canDelete={!seedModelIds.has(model.id)}
                  onUpdate={(patch) => onUpdateModel(model.id, patch)}
                  onDelete={() => onDeleteModel(model.id)}
                  referenceChart={<ReferenceChart model={model} />}
                />
              )}
            </article>
          );
        })}
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
