import { emptyForm } from './data.js';
import { calculateRiskReward } from './tradeMath.js';
import { resultLabels, toInputDateTime } from './tradeUtils.js';

export function normalizeTrade(trade) {
  const { session, ...normalizedTrade } = {
    ...emptyForm,
    ...trade,
    id: trade.id || `T-${Date.now()}`,
    date: trade.date || toInputDateTime(new Date()),
    leverage: trade.leverage === undefined || trade.leverage === '' ? '100' : String(trade.leverage),
    position: trade.position === undefined || trade.position === '' ? '0.01' : String(trade.position),
    closePrice: trade.closePrice === undefined || trade.closePrice === null ? '' : String(trade.closePrice),
    closedAt: trade.closedAt || '',
    rMultiple: calculateRiskReward(trade),
    profit: trade.profit === '' || trade.profit === undefined || trade.profit === null ? '' : String(Number.parseFloat(trade.profit) || 0),
    tags: Array.isArray(trade.tags)
      ? trade.tags
      : String(trade.tags || '')
          .split(/[,\s，]+/)
          .map((tag) => tag.trim())
          .filter(Boolean),
    checklist: Array.isArray(trade.checklist) ? trade.checklist : [],
    result: resultLabels[trade.result] ? trade.result : 'pending',
    image: '',
    imageAssetId: '',
    imageName: '',
    imageMime: '',
    imageSize: 0,
    entryImage: trade.entryImageAssetId && typeof trade.entryImage === 'string' ? trade.entryImage : trade.imageAssetId && typeof trade.image === 'string' ? trade.image : '',
    entryImageAssetId: typeof trade.entryImageAssetId === 'string' ? trade.entryImageAssetId : typeof trade.imageAssetId === 'string' ? trade.imageAssetId : '',
    entryImageName: typeof trade.entryImageName === 'string' ? trade.entryImageName : typeof trade.imageName === 'string' ? trade.imageName : '',
    entryImageMime: typeof trade.entryImageMime === 'string' ? trade.entryImageMime : typeof trade.imageMime === 'string' ? trade.imageMime : '',
    entryImageSize: Number(trade.entryImageSize || trade.imageSize) || 0,
    closeImage: trade.closeImageAssetId && typeof trade.closeImage === 'string' ? trade.closeImage : '',
    closeImageAssetId: typeof trade.closeImageAssetId === 'string' ? trade.closeImageAssetId : '',
    closeImageName: typeof trade.closeImageName === 'string' ? trade.closeImageName : '',
    closeImageMime: typeof trade.closeImageMime === 'string' ? trade.closeImageMime : '',
    closeImageSize: Number(trade.closeImageSize) || 0,
  };
  return normalizedTrade;
}

export function normalizeModel(model) {
  return {
    id: model.id || createId('model'),
    name: model.name || '未命名模型',
    title: model.title || '',
    favorite: Boolean(model.favorite),
    accent: ['cyan', 'emerald', 'amber', 'rose'].includes(model.accent) ? model.accent : 'cyan',
    referenceImage: model.referenceImage || '',
    chartFocus: model.chartFocus || '50% 50%',
    chartZoom: Number(model.chartZoom) || 1,
    logic: model.logic || '',
    points: Array.isArray(model.points) && model.points.length ? model.points : ['补充模型成立条件'],
    triggers: Array.isArray(model.triggers) ? model.triggers : [],
    keyPoints: Array.isArray(model.keyPoints) ? model.keyPoints : [],
    fail: model.fail || '补充模型失效条件。',
  };
}

export function imagePatchFromAsset(asset, slot = 'entry') {
  const prefix = slot === 'close' ? 'close' : 'entry';
  if (!asset) {
    return {
      [`${prefix}Image`]: '',
      [`${prefix}ImageAssetId`]: '',
      [`${prefix}ImageName`]: '',
      [`${prefix}ImageMime`]: '',
      [`${prefix}ImageSize`]: 0,
      [`${prefix}ImageBlob`]: undefined,
      [`${prefix}ImageCreatedAt`]: '',
    };
  }
  return {
    [`${prefix}Image`]: asset.url,
    [`${prefix}ImageAssetId`]: asset.id,
    [`${prefix}ImageName`]: asset.name,
    [`${prefix}ImageMime`]: asset.mime,
    [`${prefix}ImageSize`]: asset.size,
    [`${prefix}ImageBlob`]: asset.blob,
    [`${prefix}ImageCreatedAt`]: new Date().toISOString(),
  };
}

export function hydrateTradeImages(trade, assetsById) {
  return ['entry', 'close'].reduce((current, slot) => {
    const assetId = current[`${slot}ImageAssetId`];
    const asset = assetsById.get(assetId);
    if (!asset?.blob) return current;
    return {
      ...current,
      [`${slot}Image`]: URL.createObjectURL(asset.blob),
      [`${slot}ImageAssetId`]: asset.id,
      [`${slot}ImageName`]: asset.name,
      [`${slot}ImageMime`]: asset.mime,
      [`${slot}ImageSize`]: asset.size,
      [`${slot}ImageBlob`]: asset.blob,
      [`${slot}ImageCreatedAt`]: asset.createdAt,
    };
  }, trade);
}

export function stripRuntimeTradeFields(trade) {
  const normalized = normalizeTrade(trade);
  const { entryImageBlob, entryImageCreatedAt, closeImageBlob, closeImageCreatedAt, ...storedTrade } = normalized;
  return {
    ...storedTrade,
    image: '',
    entryImage: '',
    closeImage: '',
  };
}

export function getTradeAssetRefs(trade) {
  return ['entry', 'close'].map((slot) => ({
    id: trade[`${slot}ImageAssetId`],
    blob: trade[`${slot}ImageBlob`],
    name: trade[`${slot}ImageName`],
    mime: trade[`${slot}ImageMime`],
    size: trade[`${slot}ImageSize`],
    createdAt: trade[`${slot}ImageCreatedAt`],
  }));
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function extensionFromMime(mime = '') {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'bin';
}
