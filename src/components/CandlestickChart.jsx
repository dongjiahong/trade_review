import React from 'react';

export default function CandlestickChart({ model, accent = 'cyan', compact = false, trade }) {
  const candles = getChartCandles(model);
  const colors = {
    cyan: '#22d3ee',
    emerald: '#34d399',
    amber: '#fbbf24',
    rose: '#fb7185',
  };
  const accentColor = colors[accent] ?? colors.cyan;
  const width = 720;
  const height = compact ? 230 : 360;
  const pad = compact ? 22 : 34;
  const values = candles.flatMap((candle) => [candle.high, candle.low]);
  const max = Math.max(...values) + 4;
  const min = Math.min(...values) - 4;
  const chartWidth = width - pad * 2;
  const y = (value) => pad + ((max - value) / (max - min)) * (height - pad * 2);
  const x = (index) => pad + (index / (candles.length - 1)) * chartWidth;
  const bodyWidth = compact ? 10 : 13;
  const annotations = getChartAnnotations(model, compact);

  return (
    <div className={`relative overflow-hidden rounded-md border border-slate-700/70 bg-ink-950/70 ${compact ? 'h-44' : 'h-[360px]'}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={`${model} K 线示意图`}>
        <defs>
          <linearGradient id={`zone-${compact ? 'sm' : 'lg'}-${accent}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
          <line
            key={ratio}
            x1={pad}
            x2={width - pad}
            y1={pad + (height - pad * 2) * ratio}
            y2={pad + (height - pad * 2) * ratio}
            stroke="#203245"
            strokeDasharray="5 7"
            strokeWidth="1"
          />
        ))}
        <path
          d={candles.map((candle, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y((candle.open + candle.close) / 2)}`).join(' ')}
          fill="none"
          stroke={accentColor}
          strokeOpacity="0.26"
          strokeWidth="2"
        />
        {annotations.zones.map((zone) => (
          <g key={zone.label}>
            <rect
              x={x(zone.from)}
              y={y(zone.high)}
              width={x(zone.to) - x(zone.from)}
              height={Math.max(12, y(zone.low) - y(zone.high))}
              fill={`url(#zone-${compact ? 'sm' : 'lg'}-${accent})`}
              stroke={accentColor}
              strokeOpacity="0.25"
              rx="4"
            />
            {!compact && (
              <text x={x(zone.from) + 8} y={y(zone.high) + 18} fill={accentColor} fontSize="12">
                {zone.label}
              </text>
            )}
          </g>
        ))}
        {candles.map((candle, index) => {
          const up = candle.close >= candle.open;
          const candleColor = up ? '#2dd4bf' : '#fb7185';
          const top = y(Math.max(candle.open, candle.close));
          const bottom = y(Math.min(candle.open, candle.close));
          return (
            <g key={index}>
              <line x1={x(index)} x2={x(index)} y1={y(candle.high)} y2={y(candle.low)} stroke={candleColor} strokeWidth="2" strokeLinecap="round" />
              <rect
                x={x(index) - bodyWidth / 2}
                y={top}
                width={bodyWidth}
                height={Math.max(4, bottom - top)}
                fill={up ? '#14b8a6' : '#e11d48'}
                rx="2"
              />
            </g>
          );
        })}
        {annotations.lines.map((line) => (
          <g key={line.label}>
            <line
              x1={x(line.from)}
              x2={x(line.to)}
              y1={y(line.price)}
              y2={y(line.price)}
              stroke={line.tone === 'danger' ? '#fb7185' : accentColor}
              strokeDasharray={line.dashed ? '7 6' : '0'}
              strokeWidth="2"
              strokeOpacity="0.85"
            />
            <text x={x(line.to) + 8} y={y(line.price) + 4} fill={line.tone === 'danger' ? '#fb7185' : accentColor} fontSize={compact ? '10' : '12'}>
              {line.label}
            </text>
          </g>
        ))}
        {annotations.labels.map((label) => (
          <g key={label.text}>
            <circle cx={x(label.index)} cy={y(label.price)} r={compact ? 3 : 4} fill={accentColor} />
            <text x={x(label.index) + 8} y={y(label.price) - 8} fill="#cbd5e1" fontSize={compact ? '10' : '12'}>
              {label.text}
            </text>
          </g>
        ))}
        {trade && (
          <g>
            <text x={pad} y={height - 14} fill="#94a3b8" fontSize="12">
              {trade.symbol} · {trade.direction} · 入场 {trade.entry} · 止损 {trade.stop} · 止盈 {trade.target}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function getChartCandles(model) {
  if (model.includes('FVG')) {
    return [
      { open: 56, close: 61, high: 64, low: 54 },
      { open: 61, close: 67, high: 70, low: 60 },
      { open: 68, close: 76, high: 80, low: 66 },
      { open: 76, close: 73, high: 78, low: 70 },
      { open: 74, close: 82, high: 86, low: 73 },
      { open: 85, close: 94, high: 98, low: 83 },
      { open: 93, close: 89, high: 96, low: 87 },
      { open: 88, close: 92, high: 94, low: 84 },
      { open: 93, close: 101, high: 104, low: 92 },
      { open: 101, close: 107, high: 110, low: 99 },
      { open: 106, close: 111, high: 114, low: 105 },
      { open: 112, close: 108, high: 115, low: 104 },
    ];
  }
  if (model.includes('OB')) {
    return [
      { open: 108, close: 101, high: 110, low: 98 },
      { open: 101, close: 94, high: 103, low: 90 },
      { open: 94, close: 88, high: 96, low: 84 },
      { open: 88, close: 91, high: 94, low: 82 },
      { open: 91, close: 86, high: 93, low: 80 },
      { open: 86, close: 78, high: 88, low: 74 },
      { open: 78, close: 83, high: 86, low: 75 },
      { open: 83, close: 91, high: 94, low: 81 },
      { open: 91, close: 99, high: 102, low: 89 },
      { open: 99, close: 104, high: 107, low: 96 },
      { open: 104, close: 110, high: 113, low: 101 },
      { open: 110, close: 106, high: 114, low: 103 },
    ];
  }
  if (model.includes('Breaker')) {
    return [
      { open: 64, close: 70, high: 73, low: 62 },
      { open: 70, close: 76, high: 79, low: 68 },
      { open: 76, close: 83, high: 86, low: 74 },
      { open: 84, close: 78, high: 87, low: 75 },
      { open: 78, close: 72, high: 80, low: 69 },
      { open: 72, close: 66, high: 74, low: 62 },
      { open: 66, close: 61, high: 68, low: 58 },
      { open: 61, close: 66, high: 69, low: 59 },
      { open: 66, close: 70, high: 73, low: 64 },
      { open: 70, close: 65, high: 72, low: 61 },
      { open: 65, close: 58, high: 67, low: 54 },
      { open: 58, close: 53, high: 60, low: 49 },
    ];
  }
  return [
    { open: 88, close: 83, high: 91, low: 80 },
    { open: 83, close: 78, high: 86, low: 74 },
    { open: 78, close: 72, high: 81, low: 68 },
    { open: 72, close: 66, high: 74, low: 58 },
    { open: 66, close: 62, high: 69, low: 54 },
    { open: 62, close: 71, high: 73, low: 57 },
    { open: 71, close: 80, high: 84, low: 69 },
    { open: 80, close: 86, high: 88, low: 77 },
    { open: 86, close: 82, high: 90, low: 80 },
    { open: 82, close: 91, high: 94, low: 81 },
    { open: 91, close: 99, high: 102, low: 90 },
    { open: 99, close: 104, high: 108, low: 96 },
  ];
}

function getChartAnnotations(model, compact) {
  if (model.includes('FVG')) {
    return {
      zones: [{ from: 3, to: 8, high: 86, low: 76, label: 'FVG' }],
      lines: [{ from: 2, to: 11, price: 76, label: compact ? 'FVG' : '缺口中位', dashed: true }],
      labels: [{ index: 5, price: 98, text: 'Impulse' }],
    };
  }
  if (model.includes('OB')) {
    return {
      zones: [{ from: 3, to: 8, high: 94, low: 80, label: 'OB' }],
      lines: [{ from: 0, to: 11, price: 80, label: compact ? 'SL' : 'OB 失效线', dashed: true, tone: 'danger' }],
      labels: [{ index: 7, price: 94, text: 'Reaction' }],
    };
  }
  if (model.includes('Breaker')) {
    return {
      zones: [{ from: 2, to: 9, high: 74, low: 62, label: 'Breaker' }],
      lines: [{ from: 1, to: 11, price: 62, label: compact ? 'Retest' : '回测后破位', dashed: true }],
      labels: [{ index: 8, price: 73, text: 'Retest' }],
    };
  }
  return {
    zones: [{ from: 6, to: 10, high: 84, low: 72, label: 'FVG / OB' }],
    lines: [{ from: 0, to: 11, price: 74, label: compact ? 'ChoCH' : 'ChoCH 结构线', dashed: true }],
    labels: [
      { index: 4, price: 54, text: 'Liquidity Sweep' },
      { index: 7, price: 88, text: 'ChoCH' },
    ],
  };
}
