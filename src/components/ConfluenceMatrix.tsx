import React from 'react';
import { MTFMatrixRow, ConfluenceOverview } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface ConfluenceMatrixProps {
  confluence: ConfluenceOverview;
  matrix: MTFMatrixRow[];
  symbol?: string;
}

export const ConfluenceMatrix: React.FC<ConfluenceMatrixProps> = ({
  confluence,
  matrix,
  symbol = 'BTCUSDT',
}) => {
  // SVG circular circumference: 2 * Math.PI * 23 ≈ 144.51
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confluence.score / 100) * circumference;

  return (
    <div className="flex flex-col px-3 py-3 gap-2.5 bg-[#191c22] border-b border-[#272a31]">
      {/* Confluence Summary Banner */}
      <div className="flex items-center justify-between p-2.5 rounded bg-[#1d2026] border border-[#272a31] gap-3 flex-wrap">
        {/* Progress Ring Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                stroke="#272a31"
                strokeWidth="5"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                stroke="#4edea3"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="absolute font-mono text-[16px] font-bold text-[#4edea3]">
              {confluence.score}%
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-mono text-[10px] text-[#4edea3] font-bold uppercase tracking-wider">
                ● MULTI-TIMEFRAME CONFLUENCE
              </span>
              <InfoTooltip
                content={{
                  title: 'MULTI-TIMEFRAME CONFLUENCE RADAR',
                  symbol,
                  categoryBadge: 'MTF RADAR',
                  badgeColor: '#4edea3',
                  whatItIs:
                    'Multi-timeframe synthesis cross-referencing market structure, moving average trends, orderbook volatility, momentum, and volume across 15M, 1H, 4H, and 1D charts.',
                  liveRead: `${symbol} exhibits a ${confluence.score}% ${confluence.bias} confluence score with active trading corridor bounded at ${confluence.corridor}. Regime: ${confluence.regime}.`,
                  actionability:
                    confluence.score >= 75
                      ? 'All timeframes are in tight alignment; high edge for trend continuation.'
                      : 'Timeframe divergence detected; trade smaller size and take profits at corridor boundaries.',
                }}
                inlineBadgeText={`ⓘ Guide For ${symbol}`}
              />
            </div>
            <h3 className="font-sans text-[16px] text-[#dbfcff] font-bold tracking-tight">
              {confluence.bias}
            </h3>
            <span className="font-mono text-[11px] text-[#b9cacb]">
              Primary pin corridor: {confluence.corridor}
            </span>
          </div>
        </div>

        {/* Regime Badge */}
        <div className="flex flex-col items-end shrink-0">
          <span className="px-2 py-0.5 rounded bg-[#32353c] border border-[#3b494b] text-[#dbfcff] font-mono text-[10px] font-bold uppercase">
            {confluence.regime}
          </span>
          <span className="font-mono text-[11px] text-[#849495] mt-1">
            Mean Volatility: {confluence.meanVol}
          </span>
        </div>
      </div>

      {/* 5-Row Multi-Timeframe Alignment Matrix */}
      <div className="flex flex-col rounded bg-[#1d2026] border border-[#272a31] overflow-hidden">
        {/* Matrix Header */}
        <div className="grid grid-cols-5 px-3 py-1.5 bg-[#32353c] font-mono text-[9px] text-[#849495] uppercase tracking-wider font-semibold border-b border-[#272a31]">
          <span className="col-span-1">VECTOR LAYER</span>
          <span className="text-center">15M</span>
          <span className="text-center">1H</span>
          <span className="text-center">4H</span>
          <span className="text-center">1D</span>
        </div>

        {/* Rows 1-5 */}
        {matrix.map((row, idx) => (
          <div
            key={row.layer}
            className={`grid grid-cols-5 px-3 py-2 items-center hover:bg-[#272a31]/60 transition-colors text-[11px] font-mono border-b border-[#272a31]/50 last:border-b-0 ${
              idx % 2 === 1 ? 'bg-[#191c22]/40' : ''
            }`}
          >
            <div className="col-span-1 flex items-center gap-1.5">
              <InfoTooltip
                content={{
                  title: `${row.layer} VECTOR LAYER`,
                  symbol,
                  categoryBadge: 'TIMEFRAME VECTOR',
                  badgeColor: '#00f0ff',
                  whatItIs: `Multi-timeframe assessment of ${row.layer} across intraday execution and macro swing horizons.`,
                  liveRead: `${symbol} reads 15M: ${row.tf15m.text}, 1H: ${row.tf1h.text}, 4H: ${row.tf4h.text}, 1D: ${row.tf1d.text}.`,
                  actionability: 'Trade when 15M trigger aligns with 1H/4H trend vectors for high-probability execution.',
                }}
              >
                <span className="text-[12px] text-[#e1e2eb] font-medium truncate cursor-pointer hover:underline">
                  {row.layer}
                </span>
              </InfoTooltip>
            </div>

            <span className={`text-center ${row.tf15m.color} ${row.tf15m.bold ? 'font-bold' : ''}`}>
              {row.tf15m.text}
            </span>

            <span className={`text-center ${row.tf1h.color} ${row.tf1h.bold ? 'font-bold' : ''}`}>
              {row.tf1h.text}
            </span>

            <span className={`text-center ${row.tf4h.color} ${row.tf4h.bold ? 'font-bold' : ''}`}>
              {row.tf4h.text}
            </span>

            <span className={`text-center ${row.tf1d.color} ${row.tf1d.bold ? 'font-bold' : ''}`}>
              {row.tf1d.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
