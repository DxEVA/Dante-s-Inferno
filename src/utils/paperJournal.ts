/**
 * Vertex Paper Trade Journal Engine & Institutional Execution Microstructure Layer
 * LocalStorage Key: vertex_paper_journal_v1
 */

import { ExecutionOrderMode, KlineData } from '../types';

export type PaperTradeStatus = 'PENDING' | 'OPEN' | 'WIN' | 'LOSS' | 'SCRATCH' | 'CANCELED';

export interface TelemetrySnapshot {
  rsi?: number;
  fundingRate?: number;
  oiDelta?: number;
  rvol?: number;
  sharpe?: number;
  regime?: string;
  hurst?: number;
  adx?: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  requestedEntryPrice?: number;
  filledEntryPrice?: number;
  stopLoss: number;
  tp1Price: number;
  tp2Price?: number;
  riskUsdt: number;
  positionSizeCoins: number;
  leverage?: number;
  orderType?: ExecutionOrderMode; // 'MAKER_LIMIT' (2 bps) | 'TAKER_MARKET' (5 bps + slippage)
  status: PaperTradeStatus;
  timestamp: string; // ISO string
  createdAtMs: number;
  filledAtMs?: number;
  exitPrice?: number;
  exitTime?: string;
  grossPnlUsdt?: number;
  grossPnlR?: number;
  feeUsdt?: number;
  slippageUsdt?: number;
  pnlUsdt?: number; // Net PnL after fees & slippage
  pnlR?: number; // Net R-multiple after fees & slippage
  exitReason?: string;
  strategyLensId: number; // 1-5
  strategyLensName: string;
  confidenceScore: number;
  notes?: string;
  telemetrySnapshot?: TelemetrySnapshot;
}

export interface JournalStats {
  totalTrades: number;
  pendingTrades: number;
  openTrades: number;
  closedTrades: number;
  winCount: number;
  lossCount: number;
  scratchCount: number;
  winRate: number; // percentage 0-100
  netR: number;
  totalPnlUsdt: number;
  profitFactor: number;
  avgRR: number;
  maxDrawdownR: number;
  maxDrawdownPct: number;
  expectancyR: number; // E = (P_win * AvgWinR) - (P_loss * |AvgLossR|) - AvgFeeSlippageR
  expectancyUsdt: number;
  sharpeRatio: number;
  totalFeesAndSlippageUsdt: number;
  avgFeeSlippageR: number;
  lensBreakdown: Record<
    number,
    {
      name: string;
      trades: number;
      wins: number;
      losses: number;
      winRate: number;
      netR: number;
      totalPnl: number;
    }
  >;
  regimeBreakdown: Record<
    string,
    {
      trades: number;
      wins: number;
      losses: number;
      winRate: number;
      netR: number;
    }
  >;
}

const STORAGE_KEY = 'vertex_paper_journal_v1';
const AUTO_LOG_KEY = 'vertex_paper_journal_autolog_v1';

// Institutional Fee & Slippage Constants
const MAKER_FEE_RATE = 0.0002; // 2 bps (0.02%)
const TAKER_FEE_RATE = 0.0005; // 5 bps (0.05%)
const TAKER_SLIPPAGE_RATE = 0.00035; // 3.5 bps dynamic ATR/spread slippage penalty
const FIFO_QUEUE_TRADE_THROUGH_PCT = 0.00015; // 1.5 bps trade-through required to fill resting limit order

export const LENS_NAMES: Record<number, string> = {
  1: 'Candles & PA',
  2: 'MA & Trend',
  3: 'SMC, VP & AMD',
  4: 'Orderflow & VDU',
  5: 'Quant & Options',
};

/**
 * Load all paper trades from localStorage
 */
export function loadPaperTrades(): PaperTrade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demo = getInitialDemoTrades();
      savePaperTrades(demo);
      return demo;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    const demo = getInitialDemoTrades();
    savePaperTrades(demo);
    return demo;
  } catch (err) {
    console.error('Failed to load paper trades:', err);
    return getInitialDemoTrades();
  }
}

/**
 * Save all paper trades to localStorage
 */
export function savePaperTrades(trades: PaperTrade[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch (err) {
    console.error('Failed to save paper trades:', err);
  }
}

/**
 * Auto-log preference
 */
export function getAutoLogPreference(): boolean {
  try {
    return localStorage.getItem(AUTO_LOG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoLogPreference(val: boolean): void {
  try {
    localStorage.setItem(AUTO_LOG_KEY, String(val));
  } catch {}
}

/**
 * Compute realistic execution fees & slippage for a trade
 */
export function calculateExecutionMicrostructure(
  entryPrice: number,
  exitPrice: number,
  positionSizeCoins: number,
  orderType: ExecutionOrderMode = 'TAKER_MARKET',
  isStopLossExit = false
): { feeUsdt: number; slippageUsdt: number; totalCostUsdt: number } {
  const entryNotional = Math.abs(entryPrice * positionSizeCoins);
  const exitNotional = Math.abs(exitPrice * positionSizeCoins);

  const entryFeeRate = orderType === 'MAKER_LIMIT' ? MAKER_FEE_RATE : TAKER_FEE_RATE;
  // Stop-loss exits execute as Taker Market orders; TP1 exits execute as Maker Limit orders
  const exitFeeRate = isStopLossExit ? TAKER_FEE_RATE : MAKER_FEE_RATE;

  const feeUsdt = entryNotional * entryFeeRate + exitNotional * exitFeeRate;

  const entrySlippage = orderType === 'TAKER_MARKET' ? entryNotional * TAKER_SLIPPAGE_RATE : 0;
  const exitSlippage = isStopLossExit ? exitNotional * TAKER_SLIPPAGE_RATE : 0;
  const slippageUsdt = entrySlippage + exitSlippage;

  return {
    feeUsdt: Math.round(feeUsdt * 100) / 100,
    slippageUsdt: Math.round(slippageUsdt * 100) / 100,
    totalCostUsdt: Math.round((feeUsdt + slippageUsdt) * 100) / 100,
  };
}

/**
 * Add a new paper trade with Maker Limit vs Taker Market microstructure
 */
export function addPaperTrade(
  trade: Omit<PaperTrade, 'id' | 'createdAtMs'> & { currentMarketPrice?: number }
): PaperTrade {
  const current = loadPaperTrades();
  const orderType: ExecutionOrderMode = trade.orderType || 'TAKER_MARKET';
  const riskPerCoin = Math.max(Math.abs(trade.entryPrice - trade.stopLoss), 0.0001);
  const positionSizeCoins =
    trade.positionSizeCoins && trade.positionSizeCoins > 0
      ? trade.positionSizeCoins
      : (trade.riskUsdt || 50) / riskPerCoin;

  const newTrade: PaperTrade = {
    ...trade,
    id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAtMs: Date.now(),
    orderType,
    positionSizeCoins,
    requestedEntryPrice: trade.entryPrice,
    filledEntryPrice: trade.status === 'OPEN' ? trade.entryPrice : undefined,
    filledAtMs: trade.status === 'OPEN' ? Date.now() : undefined,
  };

  const updated = [newTrade, ...current];
  savePaperTrades(updated);
  return newTrade;
}

/**
 * Update a paper trade (e.g. notes, manual close)
 */
export function updatePaperTrade(id: string, updates: Partial<PaperTrade>): PaperTrade[] {
  const current = loadPaperTrades();
  const updated = current.map((t) => (t.id === id ? { ...t, ...updates } : t));
  savePaperTrades(updated);
  return updated;
}

/**
 * Delete a trade
 */
export function deletePaperTrade(id: string): PaperTrade[] {
  const current = loadPaperTrades();
  const updated = current.filter((t) => t.id !== id);
  savePaperTrades(updated);
  return updated;
}

/**
 * Clear all trades
 */
export function clearPaperTrades(): void {
  savePaperTrades([]);
}

/**
 * Evaluate PENDING (Maker Limit queue) and OPEN trades with live tick / candle prices
 * Models FIFO queue priority (1.5 bps trade-through required for PENDING -> OPEN)
 * and deducts realistic Maker (2 bps) / Taker (5 bps) fees + ATR slippage.
 */
export function evaluateOpenTrade(
  trade: PaperTrade,
  highPrice: number,
  lowPrice: number,
  currentPrice: number,
  timestampMs: number
): PaperTrade {
  if (trade.status !== 'OPEN' && trade.status !== 'PENDING') return trade;

  const isLong = trade.direction === 'LONG';
  const orderType: ExecutionOrderMode = trade.orderType || 'TAKER_MARKET';

  // 1. Handle PENDING Maker Limit Order Fill (FIFO Queue Priority requires 1.5 bps trade-through)
  let workingTrade = trade;
  if (workingTrade.status === 'PENDING') {
    const limitTriggerLong = workingTrade.entryPrice * (1 - FIFO_QUEUE_TRADE_THROUGH_PCT);
    const limitTriggerShort = workingTrade.entryPrice * (1 + FIFO_QUEUE_TRADE_THROUGH_PCT);

    if ((isLong && lowPrice <= limitTriggerLong) || (!isLong && highPrice >= limitTriggerShort)) {
      // Limit order fills: return newly OPEN trade immediately to prevent same-candle time-travel win
      return {
        ...workingTrade,
        status: 'OPEN',
        filledEntryPrice: workingTrade.entryPrice,
        filledAtMs: timestampMs,
      };
    } else {
      return workingTrade;
    }
  }

  const effectiveEntry = workingTrade.filledEntryPrice || workingTrade.entryPrice;
  const riskPerCoin = Math.max(Math.abs(workingTrade.entryPrice - workingTrade.stopLoss), 0.0001);
  const safeRiskUsdt = Math.max(workingTrade.riskUsdt, 1);
  const positionCoins =
    workingTrade.positionSizeCoins && workingTrade.positionSizeCoins > 0
      ? workingTrade.positionSizeCoins
      : safeRiskUsdt / riskPerCoin;

  if (isLong) {
    // Check Stop Loss first (pessimistic intrabar ordering + Taker stop slippage)
    if (lowPrice <= workingTrade.stopLoss) {
      const grossPnlUsdt = -safeRiskUsdt;
      const micro = calculateExecutionMicrostructure(
        effectiveEntry,
        workingTrade.stopLoss,
        positionCoins,
        orderType,
        true
      );
      const netPnlUsdt = Math.round((grossPnlUsdt - micro.totalCostUsdt) * 100) / 100;
      const netPnlR = Math.round((netPnlUsdt / safeRiskUsdt) * 100) / 100;

      return {
        ...workingTrade,
        status: 'LOSS',
        positionSizeCoins: positionCoins,
        exitPrice: workingTrade.stopLoss,
        exitTime: new Date(timestampMs).toISOString(),
        grossPnlUsdt,
        grossPnlR: -1.0,
        feeUsdt: micro.feeUsdt,
        slippageUsdt: micro.slippageUsdt,
        pnlR: netPnlR,
        pnlUsdt: netPnlUsdt,
        exitReason: `Stop Loss Hit (SL • -$${micro.totalCostUsdt.toFixed(2)} fee/slip)`,
      };
    }

    // Check Take Profit 1 (Maker Limit TP fill)
    if (highPrice >= workingTrade.tp1Price) {
      const rewardPerCoin = workingTrade.tp1Price - effectiveEntry;
      const grossR = Math.max(0.5, rewardPerCoin / riskPerCoin);
      const grossPnlUsdt = safeRiskUsdt * grossR;
      const micro = calculateExecutionMicrostructure(
        effectiveEntry,
        workingTrade.tp1Price,
        positionCoins,
        orderType,
        false
      );
      const netPnlUsdt = Math.round((grossPnlUsdt - micro.totalCostUsdt) * 100) / 100;
      const netPnlR = Math.round((netPnlUsdt / safeRiskUsdt) * 100) / 100;

      return {
        ...workingTrade,
        status: 'WIN',
        positionSizeCoins: positionCoins,
        exitPrice: workingTrade.tp1Price,
        exitTime: new Date(timestampMs).toISOString(),
        grossPnlUsdt: Math.round(grossPnlUsdt * 100) / 100,
        grossPnlR: Math.round(grossR * 100) / 100,
        feeUsdt: micro.feeUsdt,
        slippageUsdt: micro.slippageUsdt,
        pnlR: netPnlR,
        pnlUsdt: netPnlUsdt,
        exitReason: `Take Profit 1 Hit (TP1 • -$${micro.totalCostUsdt.toFixed(2)} fee/slip)`,
      };
    }
  } else {
    // SHORT
    if (highPrice >= workingTrade.stopLoss) {
      const grossPnlUsdt = -safeRiskUsdt;
      const micro = calculateExecutionMicrostructure(
        effectiveEntry,
        workingTrade.stopLoss,
        positionCoins,
        orderType,
        true
      );
      const netPnlUsdt = Math.round((grossPnlUsdt - micro.totalCostUsdt) * 100) / 100;
      const netPnlR = Math.round((netPnlUsdt / safeRiskUsdt) * 100) / 100;

      return {
        ...workingTrade,
        status: 'LOSS',
        positionSizeCoins: positionCoins,
        exitPrice: workingTrade.stopLoss,
        exitTime: new Date(timestampMs).toISOString(),
        grossPnlUsdt,
        grossPnlR: -1.0,
        feeUsdt: micro.feeUsdt,
        slippageUsdt: micro.slippageUsdt,
        pnlR: netPnlR,
        pnlUsdt: netPnlUsdt,
        exitReason: `Stop Loss Hit (SL • -$${micro.totalCostUsdt.toFixed(2)} fee/slip)`,
      };
    }

    if (lowPrice <= workingTrade.tp1Price) {
      const rewardPerCoin = effectiveEntry - workingTrade.tp1Price;
      const grossR = Math.max(0.5, rewardPerCoin / riskPerCoin);
      const grossPnlUsdt = safeRiskUsdt * grossR;
      const micro = calculateExecutionMicrostructure(
        effectiveEntry,
        workingTrade.tp1Price,
        positionCoins,
        orderType,
        false
      );
      const netPnlUsdt = Math.round((grossPnlUsdt - micro.totalCostUsdt) * 100) / 100;
      const netPnlR = Math.round((netPnlUsdt / safeRiskUsdt) * 100) / 100;

      return {
        ...workingTrade,
        status: 'WIN',
        positionSizeCoins: positionCoins,
        exitPrice: workingTrade.tp1Price,
        exitTime: new Date(timestampMs).toISOString(),
        grossPnlUsdt: Math.round(grossPnlUsdt * 100) / 100,
        grossPnlR: Math.round(grossR * 100) / 100,
        feeUsdt: micro.feeUsdt,
        slippageUsdt: micro.slippageUsdt,
        pnlR: netPnlR,
        pnlUsdt: netPnlUsdt,
        exitReason: `Take Profit 1 Hit (TP1 • -$${micro.totalCostUsdt.toFixed(2)} fee/slip)`,
      };
    }
  }

  return workingTrade;
}

/**
 * Evaluate all open/pending trades against a list of klines for a given symbol
 */
export function gradeOpenTradesWithKlines(
  trades: PaperTrade[],
  symbol: string,
  klines: KlineData[]
): { updatedTrades: PaperTrade[]; closedCount: number } {
  if (!klines || klines.length === 0) return { updatedTrades: trades, closedCount: 0 };

  let closedCount = 0;
  let stateChanged = false;

  const updatedTrades = trades.map((trade) => {
    if ((trade.status !== 'OPEN' && trade.status !== 'PENDING') || trade.symbol !== symbol) {
      return trade;
    }

    const anchorMs =
      trade.status === 'OPEN' && trade.filledAtMs ? trade.filledAtMs : trade.createdAtMs;
    const relevantKlines = klines.filter((k) => {
      const kTime = k.time > 1e11 ? k.time : k.time * 1000;
      return kTime >= anchorMs;
    });

    if (relevantKlines.length === 0) return trade;

    let evaluated = trade;
    for (const candle of relevantKlines) {
      const cTime = candle.time > 1e11 ? candle.time : candle.time * 1000;
      const prevStatus = evaluated.status;
      evaluated = evaluateOpenTrade(
        evaluated,
        candle.high,
        candle.low,
        candle.close,
        cTime
      );
      if (evaluated.status !== prevStatus) {
        stateChanged = true;
      }
      if (evaluated.status !== 'OPEN' && evaluated.status !== 'PENDING') {
        closedCount++;
        break;
      }
    }

    return evaluated;
  });

  if (closedCount > 0 || stateChanged) {
    savePaperTrades(updatedTrades);
  }

  return { updatedTrades, closedCount };
}

/**
 * Calculate Institutional KPI Summary Statistics
 * Includes Net Mathematical Expectancy E, Sharpe Ratio, Profit Factor, Max Drawdown %,
 * Fee/Slippage drag, and Win Rate by Strategy Lens & Market Regime.
 */
export function calculateJournalStats(trades: PaperTrade[]): JournalStats {
  const totalTrades = trades.length;
  const pendingTrades = trades.filter((t) => t.status === 'PENDING').length;
  const openTrades = trades.filter((t) => t.status === 'OPEN').length;
  const closedTradesList = trades.filter(
    (t) => t.status === 'WIN' || t.status === 'LOSS' || t.status === 'SCRATCH'
  );
  const closedTrades = closedTradesList.length;

  const winCount = trades.filter((t) => t.status === 'WIN').length;
  const lossCount = trades.filter((t) => t.status === 'LOSS').length;
  const scratchCount = trades.filter((t) => t.status === 'SCRATCH').length;

  const evaluatedTradesCount = winCount + lossCount;
  const winRate = evaluatedTradesCount > 0 ? (winCount / evaluatedTradesCount) * 100 : 0;

  let netR = 0;
  let totalPnlUsdt = 0;
  let grossWinsUsdt = 0;
  let grossLossesUsdt = 0;
  let winRSum = 0;
  let lossRSumAbs = 0;
  let rSum = 0;
  let rCount = 0;
  let totalFeesAndSlippageUsdt = 0;
  let feeSlippageRSum = 0;

  let peakR = 0;
  let maxDrawdownR = 0;
  let runningR = 0;

  // Virtual $1,000 baseline equity curve for Max Drawdown %
  const BASE_EQUITY = 1000;
  let runningEquity = BASE_EQUITY;
  let peakEquity = BASE_EQUITY;
  let maxDrawdownPct = 0;

  const rSeries: number[] = [];

  const sortedClosed = [...closedTradesList].sort((a, b) => a.createdAtMs - b.createdAtMs);

  for (const t of sortedClosed) {
    const r = t.pnlR ?? (t.status === 'WIN' ? 1.5 : t.status === 'LOSS' ? -1.0 : 0);
    const pnl =
      t.pnlUsdt ?? (t.status === 'WIN' ? t.riskUsdt * 1.5 : t.status === 'LOSS' ? -t.riskUsdt : 0);
    const feeSlip = (t.feeUsdt || 0) + (t.slippageUsdt || 0);
    const feeSlipR = t.riskUsdt > 0 ? feeSlip / t.riskUsdt : 0.04;

    netR += r;
    totalPnlUsdt += pnl;
    totalFeesAndSlippageUsdt += feeSlip;
    feeSlippageRSum += feeSlipR;
    rSeries.push(r);

    if (pnl > 0) grossWinsUsdt += pnl;
    if (pnl < 0) grossLossesUsdt += Math.abs(pnl);

    if (t.status === 'WIN') {
      winRSum += Math.max(0, r);
      rSum += Math.abs(r);
      rCount++;
    } else if (t.status === 'LOSS') {
      lossRSumAbs += Math.abs(r);
      rSum += Math.abs(r);
      rCount++;
    }

    runningR += r;
    if (runningR > peakR) peakR = runningR;
    const currentDd = peakR - runningR;
    if (currentDd > maxDrawdownR) maxDrawdownR = currentDd;

    runningEquity += pnl;
    if (runningEquity > peakEquity) peakEquity = runningEquity;
    const ddPct = peakEquity > 0 ? ((peakEquity - runningEquity) / peakEquity) * 100 : 0;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
  }

  const profitFactor =
    grossLossesUsdt > 0 ? grossWinsUsdt / grossLossesUsdt : grossWinsUsdt > 0 ? 99.9 : 0;
  const avgRR = rCount > 0 ? rSum / rCount : 1.5;

  // Mathematical Expectancy E = (P_win * AvgWinR) - (P_loss * |AvgLossR|)
  // Note: winRSum and lossRSumAbs already include net fee/slippage deductions when pnlR is net
  const pWin = evaluatedTradesCount > 0 ? winCount / evaluatedTradesCount : 0;
  const pLoss = evaluatedTradesCount > 0 ? lossCount / evaluatedTradesCount : 0;
  const avgWinR = winCount > 0 ? winRSum / winCount : 0;
  const avgLossR = lossCount > 0 ? lossRSumAbs / lossCount : 0;
  const avgFeeSlippageR = evaluatedTradesCount > 0 ? feeSlippageRSum / evaluatedTradesCount : 0;
  const expectancyR = pWin * avgWinR - pLoss * avgLossR;
  const expectancyUsdt = evaluatedTradesCount > 0 ? totalPnlUsdt / evaluatedTradesCount : 0;

  // Trade-by-Trade Sharpe Ratio (annualized to 252 trading sessions, clamped [-5.0, 5.0])
  let sharpeRatio = 0;
  if (rSeries.length >= 2) {
    const meanR = rSeries.reduce((a, b) => a + b, 0) / rSeries.length;
    const stdR =
      Math.sqrt(
        rSeries.reduce((acc, val) => acc + Math.pow(val - meanR, 2), 0) / (rSeries.length - 1)
      ) || 0.0001;
    const rawSharpe = (meanR / stdR) * Math.sqrt(Math.min(rSeries.length, 252));
    sharpeRatio = Math.max(-5.0, Math.min(5.0, Math.round(rawSharpe * 100) / 100));
  }

  // Lens Breakdown
  const lensBreakdown: JournalStats['lensBreakdown'] = {};
  for (let lensId = 1; lensId <= 5; lensId++) {
    const lensTrades = trades.filter((t) => t.strategyLensId === lensId);
    const lensWins = lensTrades.filter((t) => t.status === 'WIN').length;
    const lensLosses = lensTrades.filter((t) => t.status === 'LOSS').length;
    const lensDecided = lensWins + lensLosses;
    const lWinRate = lensDecided > 0 ? (lensWins / lensDecided) * 100 : 0;

    let lNetR = 0;
    let lTotalPnl = 0;
    for (const lt of lensTrades) {
      if (lt.status === 'WIN' || lt.status === 'LOSS' || lt.status === 'SCRATCH') {
        const r = lt.pnlR ?? (lt.status === 'WIN' ? 1.5 : lt.status === 'LOSS' ? -1 : 0);
        const pnl =
          lt.pnlUsdt ??
          (lt.status === 'WIN' ? lt.riskUsdt * 1.5 : lt.status === 'LOSS' ? -lt.riskUsdt : 0);
        lNetR += r;
        lTotalPnl += pnl;
      }
    }

    lensBreakdown[lensId] = {
      name: LENS_NAMES[lensId] || `Lens ${lensId}`,
      trades: lensTrades.length,
      wins: lensWins,
      losses: lensLosses,
      winRate: lWinRate,
      netR: Math.round(lNetR * 100) / 100,
      totalPnl: Math.round(lTotalPnl * 100) / 100,
    };
  }

  // Market Regime Breakdown
  const regimeBreakdown: JournalStats['regimeBreakdown'] = {};
  for (const t of closedTradesList) {
    const regKey = t.telemetrySnapshot?.regime || 'UNCLASSIFIED';
    if (!regimeBreakdown[regKey]) {
      regimeBreakdown[regKey] = { trades: 0, wins: 0, losses: 0, winRate: 0, netR: 0 };
    }
    const bucket = regimeBreakdown[regKey];
    bucket.trades++;
    if (t.status === 'WIN') bucket.wins++;
    if (t.status === 'LOSS') bucket.losses++;
    bucket.netR = Math.round((bucket.netR + (t.pnlR ?? 0)) * 100) / 100;
    const decided = bucket.wins + bucket.losses;
    bucket.winRate = decided > 0 ? Math.round((bucket.wins / decided) * 1000) / 10 : 0;
  }

  return {
    totalTrades,
    pendingTrades,
    openTrades,
    closedTrades,
    winCount,
    lossCount,
    scratchCount,
    winRate: Math.round(winRate * 10) / 10,
    netR: Math.round(netR * 100) / 100,
    totalPnlUsdt: Math.round(totalPnlUsdt * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgRR: Math.round(avgRR * 100) / 100,
    maxDrawdownR: Math.round(maxDrawdownR * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    expectancyR: Math.round(expectancyR * 100) / 100,
    expectancyUsdt: Math.round(expectancyUsdt * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    totalFeesAndSlippageUsdt: Math.round(totalFeesAndSlippageUsdt * 100) / 100,
    avgFeeSlippageR: Math.round(avgFeeSlippageR * 100) / 100,
    lensBreakdown,
    regimeBreakdown,
  };
}

/**
 * Initial high-fidelity demo trades with realistic Maker/Taker fee & slippage microstructure
 */
function getInitialDemoTrades(): PaperTrade[] {
  const now = Date.now();
  const hour = 3600 * 1000;

  return [
    {
      id: 'pt_demo_1',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 83250,
      requestedEntryPrice: 83250,
      filledEntryPrice: 83250,
      stopLoss: 82400,
      tp1Price: 84600,
      riskUsdt: 50,
      positionSizeCoins: 0.058,
      orderType: 'MAKER_LIMIT',
      status: 'WIN',
      timestamp: new Date(now - 8 * hour).toISOString(),
      createdAtMs: now - 8 * hour,
      filledAtMs: now - 7.8 * hour,
      exitPrice: 84600,
      exitTime: new Date(now - 4 * hour).toISOString(),
      grossPnlUsdt: 79.4,
      grossPnlR: 1.59,
      feeUsdt: 1.95,
      slippageUsdt: 0,
      pnlR: 1.55,
      pnlUsdt: 77.45,
      exitReason: 'Take Profit 1 Hit (TP1 • -$1.95 Maker fee)',
      strategyLensId: 3,
      strategyLensName: 'SMC, VP & AMD',
      confidenceScore: 84,
      notes: 'Unmitigated Bullish Order Block (88/100 Footprint Score) retest at 50% Mean Threshold with CVD absorption.',
      telemetrySnapshot: {
        rsi: 48,
        fundingRate: 0.0001,
        oiDelta: 3.4,
        rvol: 1.8,
        sharpe: 1.25,
        regime: 'MEAN_REVERTING',
        hurst: 0.42,
        adx: 19.4,
      },
    },
    {
      id: 'pt_demo_2',
      symbol: 'ETHUSDT',
      direction: 'LONG',
      entryPrice: 3120,
      requestedEntryPrice: 3120,
      filledEntryPrice: 3121.09,
      stopLoss: 3075,
      tp1Price: 3210,
      riskUsdt: 50,
      positionSizeCoins: 1.11,
      orderType: 'TAKER_MARKET',
      status: 'WIN',
      timestamp: new Date(now - 14 * hour).toISOString(),
      createdAtMs: now - 14 * hour,
      filledAtMs: now - 14 * hour,
      exitPrice: 3210,
      exitTime: new Date(now - 9 * hour).toISOString(),
      grossPnlUsdt: 100.0,
      grossPnlR: 2.0,
      feeUsdt: 2.44,
      slippageUsdt: 1.21,
      pnlR: 1.93,
      pnlUsdt: 96.35,
      exitReason: 'Take Profit 1 Hit (TP1 • -$3.65 fee/slip)',
      strategyLensId: 4,
      strategyLensName: 'Orderflow & VDU',
      confidenceScore: 81,
      notes: 'NY_OVERLAP Session Volume Ignition (2.4x Session RVOL) breakout above POC with +2.3σ Ask Delta.',
      telemetrySnapshot: {
        rsi: 56,
        fundingRate: 0.00015,
        oiDelta: 5.1,
        rvol: 2.4,
        sharpe: 1.4,
        regime: 'MOMENTUM_BREAKOUT',
        hurst: 0.61,
        adx: 29.8,
      },
    },
    {
      id: 'pt_demo_3',
      symbol: 'SOLUSDT',
      direction: 'SHORT',
      entryPrice: 178.5,
      requestedEntryPrice: 178.5,
      filledEntryPrice: 178.44,
      stopLoss: 182.0,
      tp1Price: 172.0,
      riskUsdt: 50,
      positionSizeCoins: 14.28,
      orderType: 'TAKER_MARKET',
      status: 'LOSS',
      timestamp: new Date(now - 22 * hour).toISOString(),
      createdAtMs: now - 22 * hour,
      filledAtMs: now - 22 * hour,
      exitPrice: 182.0,
      exitTime: new Date(now - 18 * hour).toISOString(),
      grossPnlUsdt: -50.0,
      grossPnlR: -1.0,
      feeUsdt: 2.57,
      slippageUsdt: 1.8,
      pnlR: -1.09,
      pnlUsdt: -54.37,
      exitReason: 'Stop Loss Hit (SL • -$4.37 Taker fee/slip)',
      strategyLensId: 2,
      strategyLensName: 'MA & Trend',
      confidenceScore: 72,
      notes: 'Counter-trend short squeezed as Spot CVD absorbed Perp sellers.',
      telemetrySnapshot: {
        rsi: 68,
        fundingRate: 0.0002,
        oiDelta: -1.2,
        rvol: 1.1,
        sharpe: 0.8,
        regime: 'MOMENTUM_BREAKOUT',
        hurst: 0.58,
        adx: 27.2,
      },
    },
    {
      id: 'pt_demo_4',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 84100,
      requestedEntryPrice: 84100,
      filledEntryPrice: 84100,
      stopLoss: 83400,
      tp1Price: 85500,
      riskUsdt: 50,
      positionSizeCoins: 0.071,
      orderType: 'MAKER_LIMIT',
      status: 'WIN',
      timestamp: new Date(now - 30 * hour).toISOString(),
      createdAtMs: now - 30 * hour,
      filledAtMs: now - 29.5 * hour,
      exitPrice: 85500,
      exitTime: new Date(now - 25 * hour).toISOString(),
      grossPnlUsdt: 100.0,
      grossPnlR: 2.0,
      feeUsdt: 2.41,
      slippageUsdt: 0,
      pnlR: 1.95,
      pnlUsdt: 97.59,
      exitReason: 'Take Profit 1 Hit (TP1 • -$2.41 Maker fee)',
      strategyLensId: 1,
      strategyLensName: 'Candles & PA',
      confidenceScore: 88,
      notes: 'Bullish Hammer off +GEX pin strike and Zero-Gamma Flip floor in H=0.41 Mean-Reverting regime.',
      telemetrySnapshot: {
        rsi: 44,
        fundingRate: 0.00008,
        oiDelta: 2.9,
        rvol: 1.6,
        sharpe: 1.6,
        regime: 'MEAN_REVERTING',
        hurst: 0.41,
        adx: 17.5,
      },
    },
    {
      id: 'pt_demo_5',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 84500,
      requestedEntryPrice: 84500,
      filledEntryPrice: 84500,
      stopLoss: 83750,
      tp1Price: 86000,
      riskUsdt: 50,
      positionSizeCoins: 0.066,
      orderType: 'MAKER_LIMIT',
      status: 'OPEN',
      timestamp: new Date(now - 1 * hour).toISOString(),
      createdAtMs: now - 1 * hour,
      filledAtMs: now - 0.8 * hour,
      strategyLensId: 5,
      strategyLensName: 'Quant & Options',
      confidenceScore: 82,
      notes: 'Active trade defending Zero-Gamma Flip level with positive dealer gamma pinning.',
      telemetrySnapshot: {
        rsi: 52,
        fundingRate: 0.0001,
        oiDelta: 4.8,
        rvol: 1.3,
        sharpe: 1.1,
        regime: 'MEAN_REVERTING',
        hurst: 0.44,
        adx: 20.1,
      },
    },
  ];
}
