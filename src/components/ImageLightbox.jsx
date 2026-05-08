import { X } from 'lucide-react';
import React, { useEffect } from 'react';

export default function ImageLightbox({ image, title = 'K 线图', onClose }) {
  useEffect(() => {
    if (!image) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/82 p-4" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col rounded-md border border-slate-700 bg-ink-950 shadow-glow" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
          <div className="min-w-0 truncate text-sm font-semibold text-slate-100">{title}</div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100" aria-label="关闭预览">
            <X size={18} />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-3">
          <img src={image} alt={title} className="max-h-[82vh] max-w-full rounded object-contain" />
        </div>
      </div>
    </div>
  );
}
