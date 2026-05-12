import { calculateRiskReward } from './tradeMath.js';

export function buildTradePlan(source, models = []) {
  const model = models.find((item) => item.name === source.model);
  const modelRulesSource = getModelRulesForDirection(model, source.direction);
  const rMultiple = calculateRiskReward(source);
  const pricePlan = [
    `方向：${source.direction || '待补充'}`,
    `入场：${source.entry || '待补充'}`,
    `止损：${source.stop || '待补充'}`,
    `止盈：${source.target || '待补充'}`,
    Number.isFinite(rMultiple) ? `计划 R：${rMultiple.toFixed(2)}R` : '',
  ].filter(Boolean);
  const riskPlan = [
    `风险金额：${source.risk || '待补充'} USD`,
    `仓位：${source.position || '待补充'} 手`,
    `杠杆：${source.leverage || '待补充'}`,
    source.stop ? `失效价：${source.direction === '空' ? '价格上破' : '价格下破'} ${source.stop}` : '失效价：待补充止损价',
  ];
  const modelRules = [
    modelRulesSource?.logic && `模型逻辑：${modelRulesSource.logic}`,
    modelRulesSource?.points?.length && `模型条件：${modelRulesSource.points.join('；')}`,
    modelRulesSource?.triggers?.length && `模型触发：${modelRulesSource.triggers.join('；')}`,
    modelRulesSource?.fail && `模型失效：${modelRulesSource.fail}`,
  ].filter(Boolean);
  const sections = [
    ['交易品种', source.symbol || '待补充'],
    ['观察周期', source.timeframe || '待补充'],
    ['市场环境', source.marketContext || '待补充：高低周期方向、关键流动性、Premium / Discount、POI 位置。'],
    ['入场模型', [source.model || '待补充', ...modelRules].join('\n')],
    ['入场条件', source.entryConditions || '待补充：具体触发信号、确认周期、等待条件。'],
    ['价格计划', pricePlan.join('\n')],
    ['风险控制', riskPlan.join('\n')],
    ['出场规则', source.exitRules || buildDefaultExitRules(source)],
    ['执行清单', source.checklist?.length ? source.checklist.join('；') : '待补充'],
  ];
  return sections.map(([title, body]) => `【${title}】\n${body}`).join('\n\n');
}

function getModelRulesForDirection(model, direction) {
  if (!model) return null;
  if (direction === '空') return model.directionRules?.short || model;
  if (direction === '多') return model.directionRules?.long || model;
  return model;
}

export function getPlanMissingItems(source) {
  return [
    !source.marketContext?.trim() && '市场环境',
    !source.entryConditions?.trim() && '入场条件',
    !source.exitRules?.trim() && '出场规则',
    !source.entry && '入场价',
    !source.stop && '止损',
    !source.target && '止盈',
  ].filter(Boolean);
}

function buildDefaultExitRules(source) {
  const target = source.target || '计划止盈';
  const stop = source.stop || '计划止损';
  return [
    `价格到达 ${target} 时按计划出场或分批减仓。`,
    `价格触及 ${stop} 或模型失效时不扩大亏损。`,
    '若入场后迟迟没有按预期推进，复盘时记录原因，不临时改成投资建议式判断。',
  ].join('\n');
}
