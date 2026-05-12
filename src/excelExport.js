import { formatProfit, resultLabels } from './tradeUtils.js';

const columns = [
  ['id', '订单 ID', 18],
  ['date', '日期', 18],
  ['symbol', '品种', 12],
  ['timeframe', '观察周期', 10],
  ['direction', '方向', 8],
  ['model', '入场模型', 24],
  ['entry', '入场价', 12],
  ['stop', '止损', 12],
  ['target', '止盈', 12],
  ['rMultiple', '计划 R', 10],
  ['risk', '风险金额 $', 12],
  ['position', '仓位', 10],
  ['leverage', '杠杆', 10],
  ['result', '结果', 10],
  ['closePrice', '平仓价格', 12],
  ['closedAt', '平仓时间', 18],
  ['profit', '实际利润 $', 12],
  ['tags', '标签', 18],
  ['checklist', '执行清单', 28],
  ['marketContext', '市场环境', 28],
  ['entryConditions', '入场条件', 28],
  ['exitRules', '出场规则', 28],
  ['plan', '交易计划', 42],
  ['note', '执行备注', 32],
  ['review', '复盘结论', 32],
  ['entryImageName', '下单截图文件', 20],
  ['closeImageName', '平仓截图文件', 20],
  ['entryImage', '下单截图', 18],
  ['closeImage', '平仓截图', 18],
];

export async function buildExcelExport(trades, { dateFrom = '', dateTo = '' } = {}) {
  const filteredTrades = filterTradesByDate(trades, dateFrom, dateTo);
  const imageEntries = await collectImages(filteredTrades);
  const entries = [
    { path: '[Content_Types].xml', data: text(contentTypesXml(imageEntries)) },
    { path: '_rels/.rels', data: text(rootRelsXml()) },
    { path: 'xl/workbook.xml', data: text(workbookXml()) },
    { path: 'xl/_rels/workbook.xml.rels', data: text(workbookRelsXml()) },
    { path: 'xl/styles.xml', data: text(stylesXml()) },
    { path: 'xl/worksheets/sheet1.xml', data: text(tradesSheetXml(filteredTrades, imageEntries)) },
    { path: 'xl/worksheets/_rels/sheet1.xml.rels', data: text(sheetRelsXml()) },
    { path: 'xl/drawings/drawing1.xml', data: text(drawingXml(imageEntries)) },
    { path: 'xl/drawings/_rels/drawing1.xml.rels', data: text(drawingRelsXml(imageEntries)) },
  ];
  for (const image of imageEntries) {
    entries.push({ path: `xl/media/${image.fileName}`, data: new Uint8Array(await image.blob.arrayBuffer()) });
  }
  return new Blob([createZip(entries)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function filterTradesByDate(trades, dateFrom, dateTo) {
  const start = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const end = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
  return trades.filter((trade) => {
    const time = new Date(trade.date).getTime();
    if (!Number.isFinite(time)) return !dateFrom && !dateTo;
    return time >= start && time <= end;
  });
}

async function collectImages(trades) {
  const images = [];
  const entryImageColumn = columnIndex('entryImage') - 1;
  const closeImageColumn = columnIndex('closeImage') - 1;
  trades.forEach((trade, tradeIndex) => {
    [
      ['entry', trade.entryImageBlob, trade.entryImageMime, trade.entryImageName],
      ['close', trade.closeImageBlob, trade.closeImageMime, trade.closeImageName],
    ].forEach(([slot, blob, mime, name]) => {
      if (!blob) return;
      const extension = extensionFromMime(mime || blob.type || name);
      images.push({
        id: images.length + 1,
        row: tradeIndex + 1,
        col: slot === 'entry' ? entryImageColumn : closeImageColumn,
        blob,
        mime: mime || blob.type || 'image/png',
        fileName: `image${images.length + 1}.${extension}`,
      });
    });
  });
  return images;
}

function tradesSheetXml(trades, images) {
  const entryImageColumn = columnIndex('entryImage') - 1;
  const closeImageColumn = columnIndex('closeImage') - 1;
  const rows = [
    columns.map(([, label]) => label),
    ...trades.map((trade, index) => {
      const row = index + 1;
      return [
        trade.id,
        formatDate(trade.date),
        trade.symbol,
        trade.timeframe,
        trade.direction,
        trade.model,
        trade.entry,
        trade.stop,
        trade.target,
        Number(trade.rMultiple || 0).toFixed(2),
        trade.risk,
        trade.position,
        trade.leverage,
        resultLabels[trade.result] || trade.result,
        trade.closePrice || '',
        formatDate(trade.closedAt),
        formatProfit(trade.profit),
        trade.tags?.join(' / ') || '',
        trade.checklist?.join(' / ') || '',
        trade.marketContext || '',
        trade.entryConditions || '',
        trade.exitRules || '',
        trade.plan || '',
        trade.note || '',
        trade.review || '',
        trade.entryImageName || '',
        trade.closeImageName || '',
        images.some((image) => image.row === row && image.col === entryImageColumn) ? '见图' : '',
        images.some((image) => image.row === row && image.col === closeImageColumn) ? '见图' : '',
      ];
    }),
  ];
  return worksheetXml(rows, {
    widths: columns.map(([, , width]) => width),
    rowHeights: new Map(trades.map((trade, index) => [index + 2, hasTradeImage(trade) ? 92 : 46])),
    drawing: true,
    freezeHeader: true,
  });
}

function hasTradeImage(trade) {
  return Boolean(trade.entryImageBlob || trade.closeImageBlob);
}

function columnIndex(key) {
  return columns.findIndex(([columnKey]) => columnKey === key) + 1;
}

function worksheetXml(rows, { widths = [], rowHeights = new Map(), drawing = false, freezeHeader = false } = {}) {
  const cols = widths.length
    ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const views = freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const rowXml = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const height = rowHeights.get(rowNumber);
      const cells = row.map((value, colIndex) => cellXml(rowNumber, colIndex + 1, value, rowIndex === 0 ? 1 : 0)).join('');
      return `<row r="${rowNumber}"${height ? ` ht="${height}" customHeight="1"` : ''}>${cells}</row>`;
    })
    .join('');
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${views}
  ${cols}
  <sheetData>${rowXml}</sheetData>
  ${drawing ? '<drawing r:id="rId1"/>' : ''}
</worksheet>`);
}

function cellXml(row, col, value, style = 0) {
  const ref = `${columnName(col)}${row}`;
  const safeValue = value === undefined || value === null ? '' : String(value);
  return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${escapeXml(safeValue)}</t></is></c>`;
}

function drawingXml(images) {
  const anchors = images
    .map((image) => {
      const row = image.row;
      const col = image.col;
      return `<xdr:twoCellAnchor editAs="oneCell">
  <xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>95250</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>95250</xdr:rowOff></xdr:from>
  <xdr:to><xdr:col>${col + 1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
  <xdr:pic>
    <xdr:nvPicPr><xdr:cNvPr id="${image.id}" name="${escapeXml(image.fileName)}"/><xdr:cNvPicPr/></xdr:nvPicPr>
    <xdr:blipFill><a:blip r:embed="rId${image.id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
    <xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
  </xdr:pic>
  <xdr:clientData/>
</xdr:twoCellAnchor>`;
    })
    .join('');
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>`);
}

function contentTypesXml(images) {
  const imageDefaults = [...new Set(images.map((image) => extensionFromMime(image.mime || image.fileName)))].map((extension) => {
    const type = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    return `<Default Extension="${extension}" ContentType="${type}"/>`;
  });
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${imageDefaults.join('')}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
</Types>`);
}

function rootRelsXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
}

function workbookXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="交易记录" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);
}

function workbookRelsXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
}

function sheetRelsXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`);
}

function drawingRelsXml(images) {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${images.map((image) => `<Relationship Id="rId${image.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${image.fileName}"/>`).join('')}
</Relationships>`);
}

function stylesXml() {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf></cellXfs>
</styleSheet>`);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function columnName(index) {
  let name = '';
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function extensionFromMime(value = '') {
  const lower = value.toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('gif')) return 'gif';
  return 'png';
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function text(value) {
  return new TextEncoder().encode(value);
}

function xml(value) {
  return value.replace(/^\s+/gm, '').trim();
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.path);
    const data = entry.data;
    const crc = crc32(data);
    const local = zipHeader(0x04034b50, [[2, 20], [2, 0], [2, 0], [2, 0], [2, 0], [4, crc], [4, data.length], [4, data.length], [2, name.length], [2, 0]]);
    localParts.push(local, name, data);
    const central = zipHeader(0x02014b50, [[2, 20], [2, 20], [2, 0], [2, 0], [2, 0], [2, 0], [4, crc], [4, data.length], [4, data.length], [2, name.length], [2, 0], [2, 0], [2, 0], [2, 0], [4, 0], [4, offset]]);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = zipHeader(0x06054b50, [[2, 0], [2, 0], [2, entries.length], [2, entries.length], [4, centralSize], [4, offset], [2, 0]]);
  return new Blob([...localParts, ...centralParts, end]);
}

function zipHeader(signature, fields) {
  const size = 4 + fields.reduce((sum, [bytes]) => sum + bytes, 0);
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  let offset = 0;
  view.setUint32(offset, signature, true);
  offset += 4;
  fields.forEach(([bytes, value]) => {
    if (bytes === 2) view.setUint16(offset, value, true);
    if (bytes === 4) view.setUint32(offset, value, true);
    offset += bytes;
  });
  return new Uint8Array(buffer);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
