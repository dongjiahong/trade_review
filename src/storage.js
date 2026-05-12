import {
  aiConfigKey,
  assetStoreName,
  dbName,
  dbVersion,
  defaultAiConfig,
  modelStoreName,
  seedModels,
  settingsStoreName,
  tagPresets,
  tagPresetsKey,
  tradeStoreName,
} from './data.js';
import {
  extensionFromMime,
  getTradeAssetRefs,
  hydrateTradeImages,
  normalizeModel,
  normalizeTrade,
  stripRuntimeTradeFields,
} from './tradeAssets.js';

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
      if (!db.objectStoreNames.contains(modelStoreName)) {
        db.createObjectStore(modelStoreName, { keyPath: 'id' });
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

export async function loadTradesFromDb() {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction([tradeStoreName, assetStoreName], 'readonly');
    const done = transactionDone(transaction);
    const tradeRecords = await requestToPromise(transaction.objectStore(tradeStoreName).getAll());
    const assetRecords = await requestToPromise(transaction.objectStore(assetStoreName).getAll());
    await done;
    const assetsById = new Map(assetRecords.map((asset) => [asset.id, asset]));
    return tradeRecords.map((record) => hydrateTradeImages(normalizeTrade(record), assetsById));
  } finally {
    closeDb(db);
  }
}

export async function saveTradesToDb(trades) {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction([tradeStoreName, assetStoreName], 'readwrite');
    const tradeStore = transaction.objectStore(tradeStoreName);
    const assetStore = transaction.objectStore(assetStoreName);
    const existingAssets = new Map((await requestToPromise(assetStore.getAll())).map((asset) => [asset.id, asset]));
    tradeStore.clear();
    assetStore.clear();
    trades.map(normalizeTrade).forEach((trade) => {
      getTradeAssetRefs(trade).forEach((assetRef) => {
        if (!assetRef.id) return;
        const existingAsset = existingAssets.get(assetRef.id);
        if (!assetRef.blob && existingAsset) {
          assetStore.put(existingAsset);
          return;
        }
        if (!assetRef.blob) return;
        assetStore.put({
          id: assetRef.id,
          blob: assetRef.blob,
          name: assetRef.name || `${assetRef.id}.${extensionFromMime(assetRef.mime)}`,
          mime: assetRef.mime || assetRef.blob.type || 'application/octet-stream',
          size: assetRef.size || assetRef.blob.size || 0,
          createdAt: assetRef.createdAt || new Date().toISOString(),
        });
      });
      tradeStore.put(stripRuntimeTradeFields(trade));
    });
    await transactionDone(transaction);
  } finally {
    closeDb(db);
  }
}

export async function loadModelsFromDb() {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction(modelStoreName, 'readonly');
    const done = transactionDone(transaction);
    const records = await requestToPromise(transaction.objectStore(modelStoreName).getAll());
    await done;
    return records.map(normalizeModel);
  } finally {
    closeDb(db);
  }
}

export async function saveModelsToDb(models) {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction(modelStoreName, 'readwrite');
    const store = transaction.objectStore(modelStoreName);
    store.clear();
    models.map(normalizeModel).forEach((model) => store.put(model));
    await transactionDone(transaction);
  } finally {
    closeDb(db);
  }
}

export async function loadAiConfigFromDb() {
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

export async function loadTagPresetsFromDb() {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction(settingsStoreName, 'readonly');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(settingsStoreName);
    const record = await requestToPromise(store.get(tagPresetsKey));
    await done;
    return normalizeTagPresets(record?.value);
  } finally {
    closeDb(db);
  }
}

export async function clearJournalDb() {
  const db = await openJournalDb();
  try {
    const storeNames = [tradeStoreName, assetStoreName, modelStoreName, settingsStoreName].filter((storeName) => db.objectStoreNames.contains(storeName));
    if (!storeNames.length) return;
    const transaction = db.transaction(storeNames, 'readwrite');
    storeNames.forEach((storeName) => transaction.objectStore(storeName).clear());
    await transactionDone(transaction);
  } finally {
    closeDb(db);
  }
}

export async function saveAiConfigToDb(aiConfig) {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction(settingsStoreName, 'readwrite');
    transaction.objectStore(settingsStoreName).put({ key: aiConfigKey, value: aiConfig });
    await transactionDone(transaction);
  } finally {
    closeDb(db);
  }
}

export async function saveTagPresetsToDb(presets) {
  const db = await openJournalDb();
  try {
    const transaction = db.transaction(settingsStoreName, 'readwrite');
    transaction.objectStore(settingsStoreName).put({ key: tagPresetsKey, value: normalizeTagPresets(presets) });
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

export async function buildExportArchive(trades, models, aiConfig, presets = tagPresets) {
  const exportedAt = new Date().toISOString();
  const storedTrades = trades.map(stripRuntimeTradeFields);
  const storedModels = models.map(normalizeModel);
  const assetEntries = trades
    .flatMap((trade) =>
      getTradeAssetRefs(trade)
        .filter((assetRef) => assetRef.id && assetRef.blob)
        .map((assetRef) => ({
          id: assetRef.id,
          file: `assets/${assetRef.id}.${extensionFromMime(assetRef.mime || assetRef.blob.type)}`,
          name: assetRef.name || '',
          mime: assetRef.mime || assetRef.blob.type || 'application/octet-stream',
          size: assetRef.size || assetRef.blob.size || 0,
          tradeId: trade.id,
          blob: assetRef.blob,
        })),
    );
  const manifest = {
    app: 'SMC Journal',
    format: 'smc-journal-archive',
    formatVersion: 2,
    exportedAt,
    counts: {
      trades: storedTrades.length,
      models: storedModels.length,
      assets: assetEntries.length,
    },
    files: {
      trades: 'trades.json',
      models: 'models.json',
      aiConfig: 'ai-config.json',
      tagPresets: 'tag-presets.json',
      assets: assetEntries.map(({ blob, ...asset }) => asset),
    },
  };
  const publicAiConfig = { ...aiConfig, apiKey: '' };
  const entries = [
    { path: 'manifest.json', data: encodeJson(manifest) },
    { path: 'trades.json', data: encodeJson(storedTrades) },
    { path: 'models.json', data: encodeJson(storedModels) },
    { path: 'ai-config.json', data: encodeJson(publicAiConfig) },
    { path: 'tag-presets.json', data: encodeJson(normalizeTagPresets(presets)) },
  ];
  for (const asset of assetEntries) {
    entries.push({ path: asset.file, data: new Uint8Array(await asset.blob.arrayBuffer()) });
  }
  return new Blob([createZip(entries)], { type: 'application/zip' });
}

export async function parseImportArchive(buffer) {
  const files = readZipEntries(new Uint8Array(buffer));
  const manifest = parseJsonFile(files, 'manifest.json');
  if (manifest?.format !== 'smc-journal-archive') throw new Error('Invalid archive format');
  const trades = parseJsonFile(files, manifest.files?.trades || 'trades.json');
  const models = files.has(manifest.files?.models || 'models.json') ? parseJsonFile(files, manifest.files?.models || 'models.json') : seedModels;
  const aiConfig = parseJsonFile(files, manifest.files?.aiConfig || 'ai-config.json');
  const importedTagPresets = files.has(manifest.files?.tagPresets || 'tag-presets.json')
    ? parseJsonFile(files, manifest.files?.tagPresets || 'tag-presets.json')
    : tagPresets;
  const assets = new Map((manifest.files?.assets || []).map((asset) => [asset.id, asset]));
  return {
    trades: trades.map((trade) => {
      const normalized = normalizeTrade(trade);
      const importedAssets = new Map();
      [normalized.entryImageAssetId, normalized.closeImageAssetId].filter(Boolean).forEach((assetId) => {
        const asset = assets.get(assetId);
        const bytes = asset ? files.get(asset.file) : null;
        if (!asset || !bytes) return;
        const blob = new Blob([bytes], { type: asset.mime || 'application/octet-stream' });
        importedAssets.set(assetId, {
          id: asset.id,
          blob,
          name: asset.name,
          mime: asset.mime,
          size: asset.size || blob.size,
          createdAt: new Date().toISOString(),
        });
      });
      return hydrateTradeImages(normalized, importedAssets);
    }),
    models: models.map(normalizeModel),
    aiConfig,
    tagPresets: normalizeTagPresets(importedTagPresets),
  };
}

export function parseImportPackage(parsed) {
  const importedTrades = Array.isArray(parsed) ? parsed : parsed.trades || parsed.data?.trades;
  if (!Array.isArray(importedTrades)) throw new Error('Invalid import file');
  return {
    trades: importedTrades.map((trade) => normalizeTrade({ ...trade, image: '' })),
    models: (parsed.models || parsed.data?.models || seedModels).map(normalizeModel),
    aiConfig: parsed.aiConfig || parsed.data?.aiConfig,
    tagPresets: normalizeTagPresets(parsed.tagPresets || parsed.data?.tagPresets || tagPresets),
  };
}

function normalizeTagPresets(presets) {
  const source = Array.isArray(presets) ? presets : tagPresets;
  const next = source.map((tag) => String(tag || '').trim()).filter(Boolean);
  return [...new Set([...tagPresets, ...next])];
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
