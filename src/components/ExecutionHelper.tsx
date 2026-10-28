import React from 'react';
import { ExecutionCalculation } from '../types';

interface ExecutionHelperProps {
  calc: ExecutionCalculation;
  baseAsset: string;
  onRiskChange: (val: number) => void;
  onEntryChange: (val: number) => void;
  onStopChange: (val: number) => void;
  onCopyText: (text: string, label: string) => void;
  onHoverLevel?: (level: { label: string; price: number } | null) => void;
  highlightedLevel?: { label: string; price: number } | null;
}

export const ExecutionHelper: React.FC<ExecutionHelperProps> = ({
  calc,
  baseAsset,
  onRiskChange,
  onEntryChange,
  onStopChange,
  onCopyText,
  onHoverLevel,
  highlightedLevel,
}) => {
  const isTightStop = calc.stopDistPct < 2.0;
  const makerCost = calc.makerFeeUsdt ?? Math.round(calc.notionalValue * 0.0004 * 100) / 100;
  const takerCost =
    calc.takerFeeAndSlippageUsdt ?? Math.round(calc.notionalValue * 0.0014 * 100) / 100;
  const feeDragPct =
    calc.feeDragPctOfRisk ??
    (calc.riskUsdt > 0 ? Math.round((takerCost / calc.riskUsdt) * 1000) / 10 : 0);
  const netRR1 = calc.effectiveNetRR1 ?? 1.42;
  const netRR2 = calc.effectiveNetRR2 ?? 2.84;
  const halfKellyPct = calc.halfKellyRiskPct ?? 1.25;

  const isTracked = (price: number) =>
    Boolean(
      highlightedLevel &&
        price > 0 &&
        Math.abs(highlightedLevel.price - price) / price < 0.0002
    );

  const toggleTrackLevel = (label: string, price: number) => {
    if (!onHoverLevel || !price || price <= 0) return;
    if (isTracked(price)) {
      onHoverLevel(null);
    } else {
      onHoverLevel({ label, price });
    }
  };

  return (
    <div className="flex flex-col px-3 py-3 gap-2.5 bg-[#080b11] cyber-grid-bg border border-[#1e2636] border-l-2 border-l-[#00f0ff]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">
            INSTITUTIONAL EXECUTION &amp; MICROSTRUCTURE CALCULATOR
          </span>
          <span className="font-mono text-[11px] text-[#849495]">
            READ-ONLY SIZING, FEE/SLIPPAGE DRAG &amp; HALF-KELLY OPTIMIZER
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#00f0ff]/30 font-mono text-[9px] text-[#00f0ff] font-bold uppercase">
            HALF-KELLY OPTIMAL: {halfKellyPct.toFixed(2)}% EQUITY
          </span>
          <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#4edea3]/30 font-mono text-[9px] text-[#4edea3] font-bold uppercase">
            RISK ENGINE READY
          </span>
        </div>
      </div>

      {/* Inputs Row (3 items) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Input 1: Risk (USDT) */}
        <div className="cyber-panel p-2.5 flex flex-col gap-1">
          <label className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
            RISK CAPITAL ($ USDT)
          </label>
          <div className="flex items-center justify-between">
            <span className="text-[#00f0ff] font-mono text-[13px]">$</span>
            <input
              type="number"
              step="5"
              min="1"
              value={calc.riskUsdt}
              onChange={(e) => onRiskChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-right font-mono text-[18px] text-[#e1e2eb] font-bold focus:outline-none"
            />
          </div>
        </div>

        {/* Input 2: Entry Price ($) */}
        <div
          className={`cyber-panel p-2.5 flex flex-col gap-1 ${
            isTracked(calc.entryPrice) ? 'cyber-panel-tracked' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
              ENTRY PRICE ($ MID)
            </label>
            {onHoverLevel && (
              <button
                type="button"
                onClick={() => toggleTrackLevel('SIZER ENTRY', calc.entryPrice)}
                className="font-mono text-[8px] px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#00f0ff] cursor-pointer"
              >
                {isTracked(calc.entryPrice) ? '🎯 TRACKING' : '🎯 TRACK'}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#00f0ff] font-mono text-[13px]">$</span>
            <input
              type="number"
              step="10"
              value={calc.entryPrice}
              onChange={(e) => onEntryChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-right font-mono text-[18px] text-[#00f0ff] font-bold focus:outline-none"
            />
          </div>
        </div>

        {/* Input 3: Stop Loss ($) */}
        <div
          className={`cyber-panel p-2.5 flex flex-col gap-1 ${
            isTracked(calc.stopLoss) ? 'cyber-panel-tracked' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
              STOP LOSS ($ INVAL)
            </label>
            {onHoverLevel && (
              <button
                type="button"
                onClick={() => toggleTrackLevel('SIZER STOP LOSS', calc.stopLoss)}
                className="font-mono text-[8px] px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#ffb4ab] cursor-pointer"
              >
                {isTracked(calc.stopLoss) ? '🎯 TRACKING' : '🎯 TRACK'}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#ffb4ab] font-mono text-[13px]">$</span>
            <input
              type="number"
              step="10"
              value={calc.stopLoss}
              onChange={(e) => onStopChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-right font-mono text-[18px] text-[#ffb4ab] font-bold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Computed Outputs Strip (Position Size, Notional, Stop Dist, Fee/Slippage Microstructure) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
        {/* Position Size */}
        <div className="cyber-panel p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
              POSITION SIZE
            </span>
            <button
              onClick={() =>
                onCopyText(`${calc.positionSize.toFixed(4)} ${baseAsset}`, 'Position Size')
              }
              className="text-[#849495] hover:text-[#00f0ff] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
            </button>
          </div>
          <div className="font-mono text-[17px] text-[#00f0ff] font-bold mt-1">
            {calc.positionSize.toFixed(4)} {baseAsset}
          </div>
          <span className="font-mono text-[10px] text-[#b9cacb]">Contract Delta</span>
        </div>

        {/* Notional Value */}
        <div className="cyber-panel p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
              NOTIONAL VALUE
            </span>
            <button
              onClick={() => onCopyText(calc.notionalValue.toFixed(2), 'Notional Value')}
              className="text-[#849495] hover:text-[#00f0ff] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
            </button>
          </div>
          <div className="font-mono text-[17px] text-[#e1e2eb] font-bold mt-1">
            $
            {calc.notionalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="font-mono text-[10px] text-[#b9cacb]">
            Leverage Eq: {calc.leverageEq.toFixed(1)}x (${calc.riskUsdt} risk)
          </span>
        </div>

        {/* Stop Distance % */}
        <div className="cyber-panel p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
              STOP DISTANCE
            </span>
            <span className="material-symbols-outlined text-[#849495] text-[14px]">
              straighten
            </span>
          </div>
          <div className="font-mono text-[17px] text-[#ffb4ab] font-bold mt-1">
            -{calc.stopDistPct.toFixed(2)}%
          </div>
          <span
            className={`font-mono text-[10px] ${
              isTightStop ? 'text-[#4edea3]' : 'text-[#fcd34d]'
            }`}
          >
            {isTightStop ? 'Tight Invalidation Zone' : 'Moderate Invalidation Zone'}
          </span>
        </div>

        {/* Round-Trip Fee & Slippage Drag */}
        <div className="cyber-panel p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#fcd34d] uppercase font-semibold">
              ROUND-TRIP FEE &amp; SLIP
            </span>
            <span className="font-mono text-[9px] text-[#849495]">2 vs 8.5 bps</span>
          </div>
          <div className="font-mono text-[14px] text-[#e1e2eb] font-bold mt-1 flex items-baseline justify-between">
            <span className="text-[#00f0ff]" title="Maker Limit Round-Trip (4 bps)">
              Lim: ${makerCost.toFixed(2)}
            </span>
            <span className="text-[#fcd34d]" title="Taker Market + Slippage Round-Trip (14 bps)">
              Mkt: ${takerCost.toFixed(2)}
            </span>
          </div>
          <span
            className={`font-mono text-[10px] ${
              feeDragPct > 18 ? 'text-[#ffb4ab] font-bold' : 'text-[#849495]'
            }`}
          >
            {feeDragPct > 18
              ? `⚠️ High Drag (${feeDragPct}% of 1R)`
              : `Taker Drag: ${feeDragPct}% of 1R`}
          </span>
        </div>
      </div>

      {/* Profit Target Brackets (Gross vs Effective Net R:R Projections) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 tabular-nums">
        {/* Target 1 */}
        <div
          onClick={() => toggleTrackLevel('TARGET 1 (+1.5R)', calc.target1Price)}
          className={`cyber-panel p-2.5 flex items-center justify-between cursor-pointer ${
            isTracked(calc.target1Price) ? 'cyber-panel-tracked' : ''
          }`}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 bg-[#00a572]/20 border border-[#00a572]/40 text-[#4edea3] font-mono text-[9px] uppercase font-bold">
                +1.5R GROSS • +{netRR1.toFixed(2)}R NET
              </span>
              <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
                TARGET 1 (50% SCALE-OUT)
              </span>
              {isTracked(calc.target1Price) && (
                <span className="font-mono text-[8px] text-[#00f0ff] font-bold">🎯 TRACKING</span>
              )}
            </div>
            <span className="font-mono text-[18px] text-[#4edea3] font-bold mt-1">
              $
              {calc.target1Price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="font-mono text-[11px] text-[#b9cacb]">
              Gross: +${calc.target1RewardUsdt.toFixed(2)} • Net: +$
              {Math.max(0, calc.target1RewardUsdt - takerCost).toFixed(2)} USDT (+
              {calc.target1Pct.toFixed(2)}%)
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyText(calc.target1Price.toFixed(2), 'Target 1 (+1.5R)');
            }}
            className="px-2.5 py-1 bg-[#141821] hover:bg-[#00f0ff] text-[#00f0ff] hover:text-[#00363a] border border-[#1e2636] hover:border-[#00f0ff] font-mono text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[13px]">content_copy</span>
            <span>Copy</span>
          </button>
        </div>

        {/* Target 2 */}
        <div
          onClick={() => toggleTrackLevel('TARGET 2 (+3.0R)', calc.target2Price)}
          className={`cyber-panel p-2.5 flex items-center justify-between cursor-pointer ${
            isTracked(calc.target2Price) ? 'cyber-panel-tracked' : ''
          }`}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 bg-[#00a572]/20 border border-[#00a572]/40 text-[#4edea3] font-mono text-[9px] uppercase font-bold">
                +3.0R GROSS • +{netRR2.toFixed(2)}R NET
              </span>
              <span className="font-mono text-[10px] text-[#ddb7ff] uppercase font-semibold">
                TARGET 2 (RUNNER)
              </span>
              {isTracked(calc.target2Price) && (
                <span className="font-mono text-[8px] text-[#00f0ff] font-bold">🎯 TRACKING</span>
              )}
            </div>
            <span className="font-mono text-[18px] text-[#4edea3] font-bold mt-1">
              $
              {calc.target2Price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="font-mono text-[11px] text-[#b9cacb]">
              Gross: +${calc.target2RewardUsdt.toFixed(2)} • Net: +$
              {Math.max(0, calc.target2RewardUsdt - takerCost).toFixed(2)} USDT (+
              {calc.target2Pct.toFixed(2)}%)
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyText(calc.target2Price.toFixed(2), 'Target 2 (+3.0R)');
            }}
            className="px-2.5 py-1 bg-[#141821] hover:bg-[#00f0ff] text-[#00f0ff] hover:text-[#00363a] border border-[#1e2636] hover:border-[#00f0ff] font-mono text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[13px]">content_copy</span>
            <span>Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
