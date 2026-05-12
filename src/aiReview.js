import { formatProfit, resultLabels } from './tradeUtils.js';

const maxImageBytes = 4 * 1024 * 1024;

export function getAiConfigMissingItems(aiConfig) {
  return [
    !aiConfig?.enabled && '启用 AI',
    !aiConfig?.baseUrl?.trim() && 'Base URL',
    !aiConfig?.model?.trim() && '模型',
    !aiConfig?.apiKey?.trim() && 'API Key',
  ].filter(Boolean);
}

export async function analyzeTradeWithAi({ aiConfig, trade, models }) {
  const missingItems = getAiConfigMissingItems(aiConfig);
  if (missingItems.length) {
    throw new Error(`请先在设置页填写 AI 配置：${missingItems.join('、')}`);
  }
  if (!trade) {
    throw new Error('请先选择一笔订单再分析。');
  }

  const imageParts = await buildImageParts(trade);
  const promptText = buildReviewPrompt({ trade, models, imageCount: imageParts.length });
  const endpoint = `${aiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: aiConfig.model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: [
            aiConfig.systemPrompt || '你是一个交易复盘助手，只基于用户提供的订单、截图和规则进行总结，不给投资建议。',
            '你必须审视交易执行质量，不预测行情，不给买卖建议。',
            '输出必须是合法 JSON，不要使用 Markdown，不要包裹代码块。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: imageParts.length ? [{ type: 'text', text: promptText }, ...imageParts] : promptText,
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `AI 请求失败：HTTP ${response.status}`;
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 没有返回可用内容。');
  }
  return parseAiReview(content);
}

function buildReviewPrompt({ trade, models, imageCount }) {
  const model = models.find((item) => item.name === trade.model);
  const directionRules = trade.direction === '空' ? model?.directionRules?.short : model?.directionRules?.long;

  return JSON.stringify({
    task: '只对当前这一笔交易做多维度复盘，发现问题并给出下次执行清单。',
    outputSchema: {
      rating: '优秀 | 正常 | 高风险 | 待确认',
      summary: '2 到 4 句话，概括这笔交易的执行质量',
      problems: ['具体问题，必须能从当前订单字段、计划、备注、截图或缺失证据推出'],
      recurringErrors: ['只基于当前订单内部发现的反复问题或执行冲突，不要引用其他订单'],
      positives: ['做得好的地方'],
      actionItems: ['下次可执行的检查项，避免直接投资建议'],
      evidenceGaps: ['缺失或不足的证据，如截图、计划、备注、平仓信息'],
    },
    constraints: [
      '只复盘当前订单，不要分析历史订单、账户总体表现、最近交易样本或模型整体胜率。',
      '不要预测行情，不要建议买入、卖出、加仓或具体交易方向。',
      '如果截图无法判断或没有截图，要明确列为证据不足。',
      '问题要具体，例如入场等待、止损位置、R 值、计划一致性、模型失效、截图凭证、平仓管理、备注完整性。',
    ],
    selectedTrade: {
      date: trade.date,
      symbol: trade.symbol,
      timeframe: trade.timeframe,
      direction: trade.direction,
      model: trade.model,
      result: resultLabels[trade.result] || trade.result,
      entry: trade.entry,
      stop: trade.stop,
      target: trade.target,
      rMultiple: trade.rMultiple,
      risk: trade.risk,
      position: trade.position,
      leverage: trade.leverage,
      profit: formatProfit(trade.profit),
      closePrice: trade.closePrice,
      closedAt: trade.closedAt,
      tags: trade.tags,
      plan: trade.plan,
      note: trade.note,
      review: trade.review,
      checklist: trade.checklist,
      attachedImages: imageCount ? ['下单截图和平仓截图中可用的图片已附在消息后'] : [],
    },
    selectedModelRules: directionRules || null,
  });
}

async function buildImageParts(trade) {
  const images = [
    { label: '下单 K 线图', url: trade.entryImage },
    { label: '平仓 K 线图', url: trade.closeImage },
  ].filter((image) => image.url);

  const parts = [];
  for (const image of images) {
    const dataUrl = await imageUrlToDataUrl(image.url);
    if (!dataUrl) continue;
    parts.push({ type: 'text', text: image.label });
    parts.push({
      type: 'image_url',
      image_url: {
        url: dataUrl,
        detail: 'high',
      },
    });
  }
  return parts;
}

async function imageUrlToDataUrl(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || blob.size > maxImageBytes) return '';
    return await blobToDataUrl(blob);
  } catch {
    return '';
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function parseAiReview(content) {
  const text = String(content).trim();
  const jsonText = text.startsWith('{') ? text : text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) {
    return normalizeAiReview({ summary: text });
  }
  try {
    return normalizeAiReview(JSON.parse(jsonText));
  } catch {
    return normalizeAiReview({ summary: text });
  }
}

function normalizeAiReview(review) {
  return {
    rating: review.rating || '待确认',
    summary: review.summary || 'AI 未返回明确总结。',
    problems: normalizeList(review.problems),
    recurringErrors: normalizeList(review.recurringErrors),
    positives: normalizeList(review.positives),
    actionItems: normalizeList(review.actionItems),
    evidenceGaps: normalizeList(review.evidenceGaps),
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/\n+/)
    .map((item) => item.replace(/^[-*\d.、\s]+/, '').trim())
    .filter(Boolean);
}
