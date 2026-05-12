import { ImagePlus, Maximize2, Upload } from 'lucide-react';
import React from 'react';
import { useEffect, useRef, useState } from 'react';
import ImageLightbox from './ImageLightbox.jsx';

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

export default function PasteImagePanel({ label = 'K 线截图', image, onImage, compact = false }) {
  const fileRef = useRef(null);
  const panelRef = useRef(null);
  const [isOver, setIsOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

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

  useEffect(() => {
    if (!isFocused) return undefined;
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isFocused]);

  return (
    <div
      ref={panelRef}
      tabIndex={0}
      onClick={() => panelRef.current?.focus()}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
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
      <div className="mb-2 text-sm font-medium text-slate-200">
        {label} <span className="text-slate-500">单击粘贴 / 拖拽 / 双击上传</span>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => readFile(event.target.files[0])} />
      {image ? (
        <div>
          <button
            type="button"
            onClick={() => setPreviewImage(image)}
            className="group relative block w-full overflow-hidden rounded border border-slate-700/70 bg-ink-950/60"
          >
            <img src={image} alt="交易截图预览" className={`w-full object-contain ${compact ? 'max-h-44' : 'max-h-72'}`} />
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-black/65 px-2 py-1 text-xs text-slate-100 opacity-0 transition group-hover:opacity-100">
              <Maximize2 size={13} />
              放大
            </span>
          </button>
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
          onClick={() => panelRef.current?.focus()}
          onDoubleClick={() => fileRef.current?.click()}
          className={`grid w-full place-items-center rounded text-center text-slate-300 ${compact ? 'min-h-28' : 'min-h-56'}`}
        >
          <div>
            <ImagePlus className="mx-auto mb-3 text-cyan-300" size={compact ? 28 : 38} />
            <div className="font-medium">粘贴、拖拽或双击上传截图</div>
            <div className="mt-1 text-xs text-slate-500">单击聚焦后可 Ctrl+V / Cmd+V，双击打开文件选择</div>
          </div>
        </button>
      )}
      <ImageLightbox image={previewImage} title={label} onClose={() => setPreviewImage('')} />
    </div>
  );
}
