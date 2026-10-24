import React, { useState, useMemo } from 'react';
import {
  KlineData,
  VolumeProfile,
  OrderBlock,
  DeribitOptionsData,
  LiquidityLevels,
  TelemetryMetrics,
  MTFMatrixRow,
  ExecutionCalculation,
  SharpeSortinoMetrics,
  PotentialSetupSpeculation,
} from '../types';
import { calculateRVOL } from '../utils/quantEngine';

export interface PaperTradeEntry {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  tp1Price: number;
  riskUsdt: number;
  positionSizeCoins: number;
  timestamp: string;
  checklistScore: number;
  orderType?: 'MAKER_LIMIT' | 'TAKER_MARKET';
  status?: string;
  pnlUsdt?: number;
  pnlR?: number;
}

interface PreFlightChecklistProps {
  symbol: string;
  currentPrice: number;
  klines: KlineData[];
  volumeProfile: VolumeProfile;
  bullOB: OrderBlock | null;
  bearOB: OrderBlock | null;
  optionsData: DeribitOptionsData;
  liquidity?: LiquidityLevels;
  telemetry: TelemetryMetrics;
  matrix: MTFMatrixRow[];
  calcResult: ExecutionCalculation;
  sharpeSortino?: SharpeSortinoMetrics;
  currentSetup: PotentialSetupSpeculation;
  experienceMode: 'rookie' | 'pro';
  paperTrades: PaperTradeEntry[];
  onAddPaperTrade: (trade: PaperTradeEntry) => void;
  onRemovePaperTrade: (id: string) => void;
}

export const PreFlightChecklist: React.FC<PreFlightChecklistProps> = ({
  symbol,
  currentPrice,
  klines,
  volumeProfile,
  bullOB,
  bearOB,
  optionsData,
  liquidity,
  telemetry,
  matrix,
  calcResult,
  sharpeSortino,
  currentSetup,
  experienceMode,
  paperTrades,
  onAddPaperTrade,
  onRemovePaperTrade,
}) => {
  const [showJournal, setShowJournal] = useState<boolean>(false);
  const [orderType, setOrderType] = useState<'MAKER_LIMIT' | 'TAKER_MARKET'>('MAKER_LIMIT');

  const formatP = (p: number) => {
    if (!p) return '0';
    if (p < 0.001) return p.toFixed(7);
    if (p < 0.1) return p.toFixed(5);
    if (p < 10) return p.toFixed(4);
    if (p < 1000) return p.toFixed(2);
    return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  // Auto-evaluate the 5 Institutional Pre-Flight Criteria
  const checks = useMemo(() => {
    const isLong = calcResult.entryPrice >= calcResult.stopLoss;
    const refPrice = currentPrice || calcResult.entryPrice;

    // 1. Key Structural Location: Within 1.2% of OB, VAH/VAL, POC, S/R, or Options Wall
    const structuralCandidates: { name: string; price: number }[] = [
      { name: 'POC', price: volumeProfile.poc },
      { name: 'VAH', price: volumeProfile.vah },
      { name: 'VAL', price: volumeProfile.val },
    ];
    if (bullOB) structuralCandidates.push({ name: 'Bull OB', price: bullOB.midpoint });
    if (bearOB) structuralCandidates.push({ name: 'Bear OB', price: bearOB.midpoint });
    if (liquidity?.srLow) structuralCandidates.push({ name: 'S/R Support', price: liquidity.srLow });
    if (liquidity?.srHigh) structuralCandidates.push({ name: 'S/R Resistance', price: liquidity.srHigh });
    if (optionsData.putWall) structuralCandidates.push({ name: 'Put Wall', price: optionsData.putWall });
    if (optionsData.callWall) structuralCandidates.push({ name: 'Call Wall', price: optionsData.callWall });
    if (optionsData.zeroGammaLevel) structuralCandidates.push({ name: '0-Gamma Flip', price: optionsData.zeroGammaLevel });

    let bestLevel = { name: 'POC', price: volumeProfile.poc, distPct: 99 };
    for (const c of structuralCandidates) {
      if (c.price > 0 && refPrice > 0) {
        const d = (Math.abs(refPrice - c.price) / refPrice) * 100;
        if (d < bestLevel.distPct) {
          bestLevel = { name: c.name, price: c.price, distPct: d };
        }
      }
    }
    const passLocation = bestLevel.distPct <= 1.2;

    // 2. Volume & Orderflow Confirmation: Session RVOL VDU (<=0.45x) or Breakout (>=1.2x) or CVD Absorption
    const rvols = calculateRVOL(klines);
    const lastRvol = telemetry.sessionRvol || rvols[rvols.length - 1] || 1.0;
    const recentVdu = rvols.slice(-4).some((r) => r <= 0.55);
    const hasAbsorption =
      telemetry.divergenceBias.toLowerCase().includes('absorption') ||
      telemetry.divergenceBias.toLowerCase().includes('squeeze') ||
      (isLong && telemetry.cvdDelta > 0) ||
      (!isLong && telemetry.cvdDelta < 0);
    const passOrderflow = lastRvol <= 0.55 || lastRvol >= 1.15 || recentVdu || hasAbsorption;

    // 3. Risk-Adjusted Trend (Sharpe Ratio): Does setup align with Rolling Sharpe regime?
    const sharpe = sharpeSortino?.sharpeRatio ?? 1.0;
    const absSharpe = Math.abs(sharpe);
    const passSharpe =
      (isLong && sharpe >= 0.35) ||
      (!isLong && sharpe <= -0.35) ||
      (absSharpe < 0.5 && passLocation); // Range fade at key location in low-Sharpe regime

    // 4. Derivatives & Dealer Path Clear: Path to TP1 clear of opposing Call Wall / Put Wall
    const tp1 = calcResult.target1Price;
    const callWall = optionsData.callWall || refPrice * 1.05;
    const putWall = optionsData.putWall || refPrice * 0.95;
    const pathClear = isLong
      ? tp1 <= callWall * 1.003
      : tp1 >= putWall * 0.997;

    // 5. Minimum Effective Net R:R + MTF Alignment
    const mtfRow = matrix[0];
    const mtfCells = mtfRow ? [mtfRow.tf15m, mtfRow.tf1h, mtfRow.tf4h, mtfRow.tf1d] : [];
    const alignedMtfCount =
      mtfCells.length > 0
        ? mtfCells.filter((cell) =>
            isLong
              ? cell.text.toLowerCase().includes('bull') ||
                cell.text.toLowerCase().includes('above') ||
                cell.color.includes('4edea3')
              : cell.text.toLowerCase().includes('bear') ||
                cell.text.toLowerCase().includes('below') ||
                cell.color.includes('ffb4ab')
          ).length
        : 3;

    const riskDist = Math.abs(calcResult.entryPrice - calcResult.stopLoss);
    const tp2Dist = Math.abs(calcResult.target2Price - calcResult.entryPrice);
    const rrRatio = riskDist > 0 ? tp2Dist / riskDist : 2.5;
    const effectiveNetRR = calcResult.effectiveNetRR2 ?? rrRatio * 0.92;
    const passRRAndMtf = effectiveNetRR >= 1.8 && alignedMtfCount >= 2;

    const items = [
      {
        id: 'location',
        title: '1. Key Structural Location',
        passed: passLocation,
        detail: passLocation
          ? `Price is ${bestLevel.distPct.toFixed(2)}% from ${bestLevel.name} ($${formatP(bestLevel.price)}) — inside 1.2% institutional reaction zone.`
          : `Price is ${bestLevel.distPct.toFixed(2)}% away from nearest level (${bestLevel.name} $${formatP(bestLevel.price)}). Wait for pullback closer to level.`,
      },
      {
        id: 'orderflow',
        title: '2. Volume & Orderflow Confirmation',
        passed: passOrderflow,
        detail: passOrderflow
          ? `Confirmed (${lastRvol.toFixed(2)}x Session RVOL • ${telemetry.divergenceBias}).`
          : `Neutral volume (${lastRvol.toFixed(2)}x Session RVOL). Watch for VDU (<0.45x) or Ignition (>1.2x).`,
      },
      {
        id: 'sharpe',
        title: '3. Risk-Adjusted Trend (Sharpe Ratio)',
        passed: passSharpe,
        detail: passSharpe
          ? `Rolling Sharpe (${sharpe >= 0 ? '+' : ''}${sharpe.toFixed(2)}) & Sortino (${(sharpeSortino?.sortinoRatio ?? 1.2).toFixed(2)}) support ${isLong ? 'Long' : 'Short'} execution.`
          : `Rolling Sharpe (${sharpe.toFixed(2)}) opposes directional chase; demand strict key-level entry.`,
      },
      {
        id: 'dealer',
        title: '4. Derivatives & Dealer Path Clear',
        passed: pathClear,
        detail: pathClear
          ? `Path to TP1 ($${formatP(tp1)}) is clear of opposing ${isLong ? `Call Wall ($${formatP(callWall)})` : `Put Wall ($${formatP(putWall)})`}.`
          : `Warning: Opposing ${isLong ? `Call Wall ($${formatP(callWall)})` : `Put Wall ($${formatP(putWall)})`} sits before TP1 ($${formatP(tp1)}).`,
      },
      {
        id: 'rr_mtf',
        title: '5. Net R:R (After Fees) + MTF',
        passed: passRRAndMtf,
        detail: `Net +${effectiveNetRR.toFixed(2)}R to TP2 ($${formatP(calcResult.target2Price)}) after fee/slip drag • ${alignedMtfCount}/4 MTF aligned.`,
      },
    ];

    const score = items.filter((i) => i.passed).length;
    return { items, score, isLong, rrRatio };
  }, [
    calcResult,
    currentPrice,
    volumeProfile,
    bullOB,
    bearOB,
    liquidity,
    optionsData,
    klines,
    telemetry,
    sharpeSortino,
    matrix,
  ]);

  // Risk-of-Ruin & Leverage Safety Guardrail computation
  const stopDistPct = calcResult.stopDistPct || 1.0;
  const safeMaxLeverage = Math.min(20, Math.max(1, Math.floor(85 / Math.max(stopDistPct, 0.25))));
  const isStopTooTight = stopDistPct < 0.35;
  const isStopTooWide = stopDistPct > 6.5;

  const handleLogPaperTrade = () => {
    const newTrade: PaperTradeEntry = {
      id: `${Date.now()}`,
      symbol,
      direction: checks.isLong ? 'LONG' : 'SHORT',
      entryPrice: orderType === 'TAKER_MARKET' ? currentPrice || calcResult.entryPrice : calcResult.entryPrice,
      stopLoss: calcResult.stopLoss,
      tp1Price: calcResult.target1Price,
      riskUsdt: calcResult.riskUsdt,
      positionSizeCoins: calcResult.positionSize,
      orderType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      checklistScore: checks.score,
    };
    onAddPaperTrade(newTrade);
    setShowJournal(true);
  };

  return (
    <div className="flex flex-col bg-[#141821]/90 backdrop-blur-md border border-white/[0.07] rounded-xl p-4 gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#272a31] pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-[#00f0ff] uppercase font-bold tracking-wider">
            ✈️ AUTO-GRADED 5-POINT PRE-FLIGHT CHECKLIST
          </span>
          <span
            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border tabular-nums ${
              checks.score >= 4
                ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                : checks.score === 3
                ? 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40'
                : 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/40'
            }`}
          >
            {checks.score}/5 CHECKS PASSED •{' '}
            {checks.score >= 4
              ? 'CLEARED FOR EXECUTION'
              : checks.score === 3
              ? 'MODERATE GRADE (REDUCE SIZE)'
              : 'LOW GRADE — WAIT FOR BETTER ALIGNMENT'}
          </span>
        </div>

        {/* Execution Mode Toggle + One-Click Paper Trade Logger Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg bg-[#0b0e14] border border-[#272a31] font-mono text-[9px]">
            <button
              type="button"
              onClick={() => setOrderType('MAKER_LIMIT')}
              className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                orderType === 'MAKER_LIMIT'
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
              title="Log as resting Maker Limit order at Setup Entry (2 bps fee, requires FIFO trade-through)"
            >
              🎯 LIMIT (2 bps)
            </button>
            <button
              type="button"
              onClick={() => setOrderType('TAKER_MARKET')}
              className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                orderType === 'TAKER_MARKET'
                  ? 'bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/40'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
              title="Log as immediate Taker Market fill at Spot Price (5 bps fee + 3.5 bps slippage)"
            >
              ⚡ MARKET (5 bps+slip)
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogPaperTrade}
            className="px-3 py-1 rounded-lg bg-[#4edea3]/15 hover:bg-[#4edea3]/25 text-[#4edea3] border border-[#4edea3]/40 font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(78,222,163,0.15)]"
          >
            <span>
              📝 LOG {orderType === 'MAKER_LIMIT' ? 'LIMIT' : 'MARKET'} ({checks.isLong ? 'LONG' : 'SHORT'})
            </span>
          </button>

          {paperTrades.length > 0 && (
            <button
              type="button"
              onClick={() => setShowJournal((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-[#191c22] hover:bg-[#272a31] text-[#00f0ff] border border-[#272a31] font-mono text-[10px] font-bold cursor-pointer tabular-nums"
            >
              {showJournal ? 'HIDE JOURNAL' : `PAPER JOURNAL (${paperTrades.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Rookie Plain-English Takeaway inside Checklist */}
      {experienceMode === 'rookie' && (
        <div className="px-3 py-2 rounded-lg bg-[#0b0e14] border border-[#00f0ff]/25 flex items-start gap-2">
          <span className="text-[14px] shrink-0">🎓</span>
          <p className="font-sans text-[11px] text-[#dbfcff] leading-relaxed">
            <strong>Plain-English Pre-Flight Rule:</strong> Professional quants never enter a trade on gut feeling. If this setup scores <strong>4/5 or 5/5 ✓</strong>, institutional conditions are aligned in your favor. Use <strong>🎯 LIMIT (2 bps)</strong> to rest an order at your entry price in the FIFO queue, or <strong>⚡ MARKET</strong> for an immediate fill with realistic slippage!
          </p>
        </div>
      )}

      {/* 5 Checklist Rows */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {checks.items.map((item) => (
          <div
            key={item.id}
            className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
              item.passed
                ? 'bg-[#0b0e14]/90 border-[#4edea3]/30'
                : 'bg-[#0b0e14]/90 border-[#ffb4ab]/30'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[10px] font-bold text-[#e1e2eb] leading-tight">
                {item.title}
              </span>
              <span
                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  item.passed
                    ? 'bg-[#4edea3]/20 text-[#4edea3]'
                    : 'bg-[#ffb4ab]/20 text-[#ffb4ab]'
                }`}
              >
                {item.passed ? '✓ PASS' : '✗ WAIT'}
              </span>
            </div>
            <p className="font-sans text-[10px] text-[#b9cacb] leading-snug">
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Risk-of-Ruin & Leverage Safety Guardrail Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0b0e14] border border-[#272a31] font-mono text-[10px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#fcd34d] font-bold uppercase">🛡️ LEVERAGE &amp; RISK-OF-RUIN GUARDRAIL:</span>
          <span className="text-[#b9cacb] tabular-nums">
            Stop Distance: <strong className="text-[#e1e2eb]">{stopDistPct.toFixed(2)}%</strong> • Recommended Max Leverage:{' '}
            <strong className="text-[#4edea3]">≤{Math.min(10, safeMaxLeverage)}x</strong> • Half-Kelly Optimal:{' '}
            <strong className="text-[#00f0ff]">{(calcResult.halfKellyRiskPct ?? 1.25).toFixed(2)}% Equity</strong>
          </span>
        </div>
        <div>
          {isStopTooTight ? (
            <span className="px-2 py-0.5 rounded bg-[#f43f5e]/20 text-[#ffb4ab] border border-[#f43f5e]/40 font-bold">
              ⚠️ STOP TOO TIGHT (&lt;0.35%) — HIGH WICK &amp; FEE DRAG RISK
            </span>
          ) : isStopTooWide ? (
            <span className="px-2 py-0.5 rounded bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/40 font-bold">
              ⚠️ WIDE SWING STOP ({stopDistPct.toFixed(1)}%) — USE SPOT OR ≤3x LEVERAGE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30 font-bold">
              ✓ HEALTHY STRUCTURAL STOP BUFFER
            </span>
          )}
        </div>
      </div>

      {/* Interactive Paper Trade Journal Simulator Table */}
      {showJournal && paperTrades.length > 0 && (
        <div className="flex flex-col gap-2 pt-1 border-t border-[#272a31]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold">
              📝 LIVE PAPER TRADE SIMULATOR JOURNAL (FIFO QUEUE &amp; FEE-ADJUSTED MARK)
            </span>
            <span className="font-mono text-[9px] text-[#849495]">
              Maker 2 bps • Taker 5 bps + 3.5 bps Slippage
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="text-[#849495] border-b border-[#272a31] bg-[#0b0e14]">
                  <th className="px-2.5 py-1.5">STATUS / TYPE</th>
                  <th className="px-2.5 py-1.5">ASSET / SIDE</th>
                  <th className="px-2.5 py-1.5">ENTRY</th>
                  <th className="px-2.5 py-1.5">STOP</th>
                  <th className="px-2.5 py-1.5">TP1 (+1.5R)</th>
                  <th className="px-2.5 py-1.5 text-right">NET MARK P&amp;L</th>
                  <th className="px-2.5 py-1.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2433]">
                {paperTrades.slice(0, 8).map((pt) => {
                  const isPending = pt.status === 'PENDING';
                  const isClosed = pt.status === 'WIN' || pt.status === 'LOSS' || pt.status === 'SCRATCH';
                  const markPrice = pt.symbol === symbol ? currentPrice : pt.entryPrice;
                  const priceDiff =
                    pt.direction === 'LONG'
                      ? markPrice - pt.entryPrice
                      : pt.entryPrice - markPrice;
                  const estFee =
                    pt.entryPrice *
                    pt.positionSizeCoins *
                    (pt.orderType === 'MAKER_LIMIT' ? 0.0004 : 0.0014);
                  const liveNetUsdt = isClosed
                    ? pt.pnlUsdt ?? 0
                    : isPending
                    ? 0
                    : priceDiff * pt.positionSizeCoins - estFee;
                  const liveNetR = isClosed
                    ? pt.pnlR ?? 0
                    : pt.riskUsdt > 0
                    ? liveNetUsdt / pt.riskUsdt
                    : 0;

                  return (
                    <tr key={pt.id} className="hover:bg-[#191c22]">
                      <td className="px-2.5 py-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-1 ${
                            isPending
                              ? 'bg-[#f59e0b]/20 text-[#fcd34d]'
                              : pt.status === 'OPEN'
                              ? 'bg-[#00f0ff]/15 text-[#00f0ff]'
                              : pt.status === 'WIN'
                              ? 'bg-[#4edea3]/20 text-[#4edea3]'
                              : 'bg-[#ffb4ab]/20 text-[#ffb4ab]'
                          }`}
                        >
                          {pt.status || 'OPEN'}
                        </span>
                        <span className="text-[9px] text-[#849495]">
                          {pt.orderType === 'MAKER_LIMIT' ? 'LIMIT' : 'MKT'}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 font-bold">
                        <span className="text-[#e1e2eb] mr-1.5">{pt.symbol}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            pt.direction === 'LONG'
                              ? 'bg-[#4edea3]/15 text-[#4edea3]'
                              : 'bg-[#ffb4ab]/15 text-[#ffb4ab]'
                          }`}
                        >
                          {pt.direction}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-[#dbfcff]">${formatP(pt.entryPrice)}</td>
                      <td className="px-2.5 py-1.5 text-[#ffb4ab]">${formatP(pt.stopLoss)}</td>
                      <td className="px-2.5 py-1.5 text-[#4edea3]">${formatP(pt.tp1Price)}</td>
                      <td
                        className={`px-2.5 py-1.5 text-right font-bold ${
                          isPending
                            ? 'text-[#fcd34d]'
                            : liveNetUsdt >= 0
                            ? 'text-[#4edea3]'
                            : 'text-[#ffb4ab]'
                        }`}
                      >
                        {isPending
                          ? 'IN FIFO QUEUE'
                          : `${liveNetUsdt >= 0 ? '+' : ''}$${liveNetUsdt.toFixed(2)} (${
                              liveNetR >= 0 ? '+' : ''
                            }${liveNetR.toFixed(2)}R)`}
                      </td>
                      <td className="px-2.5 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => onRemovePaperTrade(pt.id)}
                          className="text-[#849495] hover:text-[#ffb4ab] text-[10px] cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
