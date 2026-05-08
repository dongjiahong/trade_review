export function toNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

export function calculateRiskReward(trade) {
  const entry = toNumber(trade.entry);
  const stop = toNumber(trade.stop);
  const target = toNumber(trade.target);
  if (entry === null || stop === null || target === null || entry === stop) return 0;
  return Math.abs((target - entry) / (entry - stop));
}
