import React, { useState, useMemo, useEffect } from 'react';
import {
  PaperTrade,
  PaperTradeStatus,
  loadPaperTrades,
  calculateJournalStats,
  deletePaperTrade,
  updatePaperTrade,
  clearPaperTrades,
  gradeOpenTradesWithKlines,
  getAutoLogPreference,
  setAutoLogPreference,
  calculateExecutionMicrostructure,
} from '../utils/paperJournal';
import { fetchKlines } from '../services/marketData';

interface PaperJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshTrades?: () => void;
  onShowToast: (msg: string) => void;
}

export const PaperJournalModal: React.FC<PaperJournalModalProps> = ({
  isOpen,
  onClose,
  onRefreshTrades,
  onShowToast,
}) => {
  const [trades, setTrades] = useState<PaperTrade[]>(() => loadPaperTrades());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLens, setFilterLens] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [autoLog, setAutoLog] = useState<boolean>(() => getAutoLogPreference());
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // Sync trades whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setTrades(loadPaperTrades());
      setConfirmReset(false);
    }
  }, [isOpen]);

  const stats = useMemo(() => calculateJournalStats(trades), [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'PENDING' && t.status === 'PENDING') ||
        (filterStatus === 'OPEN' && t.status === 'OPEN') ||
        (filterStatus === 'WIN' && t.status === 'WIN') ||
        (filterStatus === 'LOSS' && t.status === 'LOSS') ||
        (filterStatus === 'SCRATCH' && t.status === 'SCRATCH');

      const matchLens = filterLens === 'ALL' || t.strategyLensId === filterLens;

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.symbol.toLowerCase().includes(q) ||
        t.strategyLensName.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q));

      return matchStatus && matchLens && matchSearch;
    });
  }, [trades, filterStatus, filterLens, search]);

  if (!isOpen) return null;

  const handleToggleAutoLog = () => {
    const next = !autoLog;
    setAutoLog(next);
    setAutoLogPreference(next);
    onShowToast(`AUTO-LOG (>=80% CONFIDENCE): ${next ? 'ACTIVATED' : 'PAUSED'}`);
  };

  const handleForceFillLimitOrder = (trade: PaperTrade) => {
    const isLong = trade.direction === 'LONG';
    const slipRate = 0.00035;
    const filledEntry =
      Math.round(trade.entryPrice * (isLong ? 1 + slipRate : 1 - slipRate) * 10000) / 10000;
    const updated = updatePaperTrade(trade.id, {
      status: 'OPEN',
      orderType: 'TAKER_MARKET',
      filledEntryPrice: filledEntry,
      entryPrice: filledEntry,
      filledAtMs: Date.now(),
      notes: `${trade.notes || ''} • Force-filled @ Market`.trim(),
    });
    setTrades(updated);
    onRefreshTrades?.();
    onShowToast(`⚡ LIMIT CONVERTED TO MARKET FILL: ${trade.symbol} @ $${filledEntry}`);
  };

  const handleManualCloseTrade = (
    trade: PaperTrade,
    status: PaperTradeStatus,
    reason: string,
    grossR: number
  ) => {
    const exitPrice =
      status === 'WIN'
        ? trade.tp1Price
        : status === 'LOSS'
        ? trade.stopLoss
        : trade.filledEntryPrice || trade.entryPrice;

    const isStopExit = status === 'LOSS';
    const { feeUsdt, slippageUsdt, totalCostUsdt } = calculateExecutionMicrostructure(
      trade.filledEntryPrice || trade.entryPrice,
      exitPrice,
      trade.positionSizeCoins,
      trade.orderType || 'TAKER_MARKET',
      isStopExit
    );

    const grossPnlUsdt = Math.round(trade.riskUsdt * grossR * 100) / 100;
    const netPnlUsdt = Math.round((grossPnlUsdt - totalCostUsdt) * 100) / 100;
    const netPnlR =
      trade.riskUsdt > 0 ? Math.round((netPnlUsdt / trade.riskUsdt) * 100) / 100 : grossR;

    const updated = updatePaperTrade(trade.id, {
      status,
      exitReason: `${reason} (Net after $${totalCostUsdt.toFixed(2)} fee/slip)`,
      grossPnlR: grossR,
      grossPnlUsdt,
      feeUsdt,
      slippageUsdt,
      pnlR: netPnlR,
      pnlUsdt: netPnlUsdt,
      exitPrice,
      exitTime: new Date().toISOString(),
    });
    setTrades(updated);
    onRefreshTrades?.();
    onShowToast(
      `TRADE CLOSED: ${trade.symbol} (${reason} -> Net ${netPnlR >= 0 ? '+' : ''}${netPnlR}R / $${netPnlUsdt})`
    );
  };

  const handleDeleteTrade = (id: string) => {
    const updated = deletePaperTrade(id);
    setTrades(updated);
    onRefreshTrades?.();
    onShowToast('PAPER TRADE REMOVED');
  };

  const handleClearAll = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    clearPaperTrades();
    setTrades(loadPaperTrades());
    setConfirmReset(false);
    onRefreshTrades?.();
    onShowToast('JOURNAL RESET TO INSTITUTIONAL BASELINE');
  };

  const handleSaveNote = (id: string) => {
    const updated = updatePaperTrade(id, { notes: noteText });
    setTrades(updated);
    setEditingNoteId(null);
    onShowToast('NOTE SAVED');
  };

  const handleAutoGradeWithBinance = async () => {
    const activeTrades = trades.filter((t) => t.status === 'OPEN' || t.status === 'PENDING');
    if (activeTrades.length === 0) {
      onShowToast('NO PENDING OR OPEN TRADES TO GRADE');
      return;
    }

    setIsGrading(true);
    onShowToast('FETCHING BINANCE 15M KLINES FOR FIFO FILLS & TARGET/STOP GRADING...');

    let totalNewlyClosed = 0;
    let currentTrades = [...trades];

    const symbols = Array.from(new Set(activeTrades.map((t) => t.symbol)));

    for (const sym of symbols) {
      try {
        const klines = await fetchKlines(sym, '15m', 100);
        const { updatedTrades, closedCount } = gradeOpenTradesWithKlines(currentTrades, sym, klines);
        currentTrades = updatedTrades;
        totalNewlyClosed += closedCount;
      } catch (err) {
        console.warn(`Failed to auto-grade klines for ${sym}:`, err);
      }
    }

    setTrades(currentTrades);
    setIsGrading(false);
    onRefreshTrades?.();

    if (totalNewlyClosed > 0) {
      onShowToast(`AUTO-GRADED: ${totalNewlyClosed} TRADES RESOLVED WITH FEE & SLIPPAGE DEDUCTION!`);
    } else {
      onShowToast('FIFO QUEUE & OPEN POSITIONS UPDATED AGAINST BINANCE KLINES');
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vertex_paper_trades_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('EXPORTED JOURNAL TO JSON');
  };

  const formatPrice = (p: number) => {
    if (!p) return '$0';
    if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    if (p >= 1) return `$${p.toFixed(2)}`;
    return `$${p.toFixed(4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-6xl bg-[#0b0e14] border border-[#00f0ff]/40 rounded-xl shadow-[0_16px_50px_rgba(0,0,0,0.95)] flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#272a31] bg-[#141821]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center text-[#00f0ff]">
              <span className="material-symbols-outlined text-[18px]">history_edu</span>
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-mono text-[14px] sm:text-[15px] font-bold text-[#dbfcff]">
                  INSTITUTIONAL PAPER EXECUTION LAB &amp; FIFO STRATEGY LEDGER
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] font-mono text-[9px] font-semibold">
                  FIFO LIMIT QUEUE • MAKER 2 BPS / TAKER 5 BPS + SLIPPAGE
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#849495]">
                Net Expectancy E = (P_win × AvgWinR) - (P_loss × |AvgLossR|) - FeeDragR • Marked to live Binance streams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#191c22] hover:bg-[#272a31] text-[#849495] hover:text-[#e1e2eb] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Section 1: 8-Card Institutional Performance & Microstructure KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 p-3 bg-[#10131a] border-b border-[#1e2433] tabular-nums">
          {/* 1. Win Rate */}
          <div className="p-2 rounded-lg bg-[#141821] border border-[#272a31] flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#849495] uppercase">WIN RATE</span>
            <span
              className={`font-mono text-[16px] font-bold ${
                stats.winRate >= 58 ? 'text-[#4edea3]' : stats.winRate >= 45 ? 'text-[#f59e0b]' : 'text-[#ffb4ab]'
              }`}
            >
              {stats.winRate.toFixed(1)}%
            </span>
            <span className="font-mono text-[9px] text-[#849495]">
              {stats.winCount}W / {stats.lossCount}L / {stats.scratchCount}S
            </span>
          </div>

          {/* 2. Expectancy per Trade (E) */}
          <div className="p-2 rounded-lg bg-[#141821] border border-[#00f0ff]/30 flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#00f0ff] uppercase font-bold">EXPECTANCY / TRADE</span>
            <span
              className={`font-mono text-[16px] font-bold ${
                stats.expectancyR >= 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
              }`}
            >
              {stats.expectancyR >= 0 ? '+' : ''}
              {stats.expectancyR.toFixed(2)}R
            </span>
            <span className="font-mono text-[9px] text-[#b9cacb]">
              EV: {stats.expectancyUsdt >= 0 ? '+' : ''}${stats.expectancyUsdt.toFixed(2)}/trade
            </span>
          </div>

          {/* 3. Portfolio Sharpe Ratio */}
          <div className="p-2 rounded-lg bg-[#141821] border border-[#272a31] flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#849495] uppercase">PORTFOLIO SHARPE</span>
            <span
              className={`font-mono text-[16px] font-bold ${
                stats.sharpeRatio >= 1.2
                  ? 'text-[#4edea3]'
                  : stats.sharpeRatio >= 0.4
                  ? 'text-[#fcd34d]'
                  : 'text-[#ffb4ab]'
              }`}
            >
              {stats.sharpeRatio >= 0 ? '+' : ''}
              {stats.sharpeRatio.toFixed(2)}
            </span>
            <span className="font-mono text-[9px] text-[#849495]">Annualized R-Curve</span>
          </div>

          {/* 4. Net Cumulative R */}
          <div className="p-2 rounded-lg bg-[#141821] border border-[#272a31] flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#849495] uppercase">NET CUMULATIVE R</span>
            <span
              className={`font-mono text-[16px] font-bold ${
                stats.netR >= 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
              }`}
            >
              {stats.netR >= 0 ? '+' : ''}
              {stats.netR.toFixed(2)}R
            </span>
            <span className="font-mono text-[9px] text-[#849495]">
              Avg Win: +{stats.avgRR.toFixed(2)}R
            </span>
          </div>

          {/* 5. Net Realized PnL ($) */}
          <div className="p-2 rounded-lg bg-[#141821] border border-[#272a31] flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#849495] uppercase">NET REALIZED P&amp;L</span>
            <span
              className={`font-mono text-[16px] font-bold ${
                stats.totalPnlUsdt >= 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
              }`}
            >
              {stats.totalPnlUsdt >= 0 ? '+' : ''}${stats.totalPnlUsdt.toLocaleString()}
            </span>
            <span className="font-mono text-[9px] text-[#849495]">After Fee &amp; Slip</span>
          </div>

          {/* 6. Cumulative Fees & Slippage Drag */}
          <div className="p-2 rounded-lg bg-[#141821] border border-[#272a31] flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#849495] uppercase">FEES &amp; SLIPPAGE</span>
            <span className="font-mono text-[16px] font-bold text-[#fcd34d]">
              -${stats.totalFeesAndSlippageUsdt.toFixed(2)}
            </span>
            <span className="font-mono text-[9px] text-[#849495]">
              Drag: -{stats.avgFeeSlippageR.toFixed(2)}R/trd
            </span>
          </div>

          {/* 7. Profit Factor & Max Drawdown */}
          <div className="p-2 rounded-lg bg-[#141821] border border-[#272a31] flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#849495] uppercase">PF &amp; MAX DD</span>
            <span className="font-mono text-[16px] font-bold text-[#00f0ff]">
              {stats.profitFactor >= 99 ? 'MAX' : stats.profitFactor.toFixed(2)} PF
            </span>
            <span className="font-mono text-[9px] text-[#ffb4ab]">
              Max DD: -{stats.maxDrawdownR.toFixed(2)}R ({stats.maxDrawdownPct.toFixed(1)}%)
            </span>
          </div>

          {/* 8. FIFO Queue & Open Positions */}
          <div className="p-2 rounded-lg bg-[#141821] border border-[#272a31] flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#849495] uppercase">QUEUE / ACTIVE</span>
            <span className="font-mono text-[15px] font-bold text-[#dbfcff]">
              {stats.pendingTrades}Q • {stats.openTrades}O
            </span>
            <span className="font-mono text-[9px] text-[#4edea3]">
              {stats.totalTrades} Total Logged
            </span>
          </div>
        </div>

        {/* Section 2: Strategy Lens Leaderboard + Statistical Regime Attribution */}
        <div className="px-4 py-2 bg-[#0e1118] border-b border-[#1e2433] flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono text-[10px] text-[#849495] uppercase font-bold tracking-wider">
              ✦ 5-STRATEGY LENS LEADERBOARD &amp; STATISTICAL REGIME ATTRIBUTION
            </span>
            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[9px]">
              {Object.entries(stats.regimeBreakdown).map(([reg, rInfo]) => (
                <span
                  key={reg}
                  className="px-2 py-0.5 rounded bg-[#141821] border border-[#272a31] text-[#b9cacb]"
                >
                  <strong className="text-[#00f0ff]">{reg.replace('_', ' ')}:</strong>{' '}
                  <span className={rInfo.netR >= 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}>
                    {rInfo.netR >= 0 ? '+' : ''}
                    {rInfo.netR}R
                  </span>{' '}
                  ({rInfo.winRate.toFixed(0)}% WR)
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 overflow-x-auto no-scrollbar">
            {Object.entries(stats.lensBreakdown).map(([id, info]) => {
              const lensNum = Number(id);
              return (
                <button
                  key={id}
                  onClick={() => setFilterLens(filterLens === lensNum ? 'ALL' : lensNum)}
                  className={`p-2 rounded border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                    filterLens === lensNum
                      ? 'bg-[#00f0ff]/15 border-[#00f0ff]'
                      : 'bg-[#141821] border-[#272a31] hover:border-[#3b494b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-[#849495] font-bold">
                      TAB {id}
                    </span>
                    <span
                      className={`font-mono text-[9px] font-bold ${
                        info.netR >= 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
                      }`}
                    >
                      {info.netR >= 0 ? '+' : ''}
                      {info.netR}R
                    </span>
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-[#dbfcff] truncate">
                    {info.name}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-[#849495]">
                    <span>{info.trades} trades</span>
                    <span className="text-[#4edea3] font-bold">
                      {info.winRate.toFixed(0)}% WR
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Action Controls Bar (Auto-Grade, Filter, Search, Auto-Log Toggle) */}
        <div className="p-3 bg-[#121620] border-b border-[#1e2433] flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Filters & Search */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative w-44">
              <span className="absolute left-2.5 top-2 material-symbols-outlined text-[14px] text-[#849495]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter symbol/notes..."
                className="w-full h-7 pl-7 pr-2 bg-[#0b0e14] border border-[#272a31] rounded font-mono text-[10px] text-[#e1e2eb] focus:outline-none focus:border-[#00f0ff]"
              />
            </div>

            {/* Status Pills including PENDING FIFO Queue */}
            <div className="flex items-center p-0.5 rounded bg-[#0b0e14] border border-[#272a31] font-mono text-[9px] flex-wrap">
              {['ALL', 'PENDING', 'OPEN', 'WIN', 'LOSS', 'SCRATCH'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-1 rounded font-bold transition-colors cursor-pointer ${
                    filterStatus === st
                      ? 'bg-[#272a31] text-[#00f0ff]'
                      : 'text-[#849495] hover:text-[#e1e2eb]'
                  }`}
                >
                  {st === 'PENDING' ? `PENDING (${stats.pendingTrades})` : st}
                </button>
              ))}
            </div>

            {/* Clear Lens Filter if active */}
            {filterLens !== 'ALL' && (
              <button
                onClick={() => setFilterLens('ALL')}
                className="px-2 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] font-mono text-[9px] flex items-center gap-1 cursor-pointer"
              >
                <span>Tab {filterLens} Filtered</span>
                <span className="material-symbols-outlined text-[10px]">close</span>
              </button>
            )}
          </div>

          {/* Right: Auto-Grade, Auto-Log, Export & Clear */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Auto-Grade via Binance Klines */}
            <button
              onClick={handleAutoGradeWithBinance}
              disabled={isGrading}
              className="px-2.5 py-1 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/50 font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)] cursor-pointer disabled:opacity-50"
              title="Fetch latest Binance 15m klines to evaluate FIFO limit fills and hit targets/stops"
            >
              <span className={`material-symbols-outlined text-[14px] ${isGrading ? 'animate-spin' : ''}`}>
                {isGrading ? 'sync' : 'verified'}
              </span>
              <span>{isGrading ? 'GRADING FIFO & KLINES...' : 'AUTO-GRADE VIA BINANCE'}</span>
            </button>

            {/* Auto-Log Toggle */}
            <button
              onClick={handleToggleAutoLog}
              className={`px-2 py-1 rounded font-mono text-[10px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                autoLog
                  ? 'bg-[#4edea3]/20 border-[#4edea3]/50 text-[#4edea3]'
                  : 'bg-[#191c22] border-[#272a31] text-[#849495]'
              }`}
              title="Automatically log high-confidence (>=80%) setups when tabs refresh"
            >
              <span className="material-symbols-outlined text-[13px]">
                {autoLog ? 'toggle_on' : 'toggle_off'}
              </span>
              <span>AUTO-LOG &ge;80%</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportJson}
              className="px-2 py-1 rounded bg-[#191c22] hover:bg-[#272a31] text-[#b9cacb] border border-[#272a31] font-mono text-[10px] flex items-center gap-1 cursor-pointer"
              title="Export all trades to JSON file"
            >
              <span className="material-symbols-outlined text-[13px]">file_download</span>
              <span>EXPORT</span>
            </button>

            {/* Inline Two-Step Reset */}
            <button
              onClick={handleClearAll}
              onMouseLeave={() => setConfirmReset(false)}
              className={`px-2 py-1 rounded font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-colors border ${
                confirmReset
                  ? 'bg-[#f43f5e] text-white border-[#f43f5e] font-bold'
                  : 'bg-[#ffb4ab]/10 hover:bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30'
              }`}
              title="Reset paper trades"
            >
              <span className="material-symbols-outlined text-[13px]">delete</span>
              <span>{confirmReset ? 'CONFIRM RESET?' : 'RESET'}</span>
            </button>
          </div>
        </div>

        {/* Section 4: Scrollable Trade List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 divide-y divide-[#1e2433]">
          {filteredTrades.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[32px] text-[#849495]">
                library_books
              </span>
              <span className="font-mono text-[13px] text-[#dbfcff] font-semibold">
                No trades match the current filter
              </span>
              <span className="font-mono text-[11px] text-[#849495]">
                Click &quot;Log to Paper Journal&quot; inside any Strategy Tab or Pre-Flight Checklist to test Maker Limit or Taker Market execution.
              </span>
            </div>
          ) : (
            filteredTrades.map((trade) => {
              const isLong = trade.direction === 'LONG';
              const isPending = trade.status === 'PENDING';
              const isOpen = trade.status === 'OPEN';
              const isWin = trade.status === 'WIN';
              const isLoss = trade.status === 'LOSS';
              const isMaker = trade.orderType === 'MAKER_LIMIT';
              const totalCost = Math.round(((trade.feeUsdt || 0) + (trade.slippageUsdt || 0)) * 100) / 100;

              return (
                <div
                  key={trade.id}
                  className="py-3 flex flex-col gap-2 transition-colors hover:bg-[#141821]/50 px-2 rounded-lg"
                >
                  {/* Row 1: Header (Symbol, Direction, Order Type, Lens, Telemetry Snapshot, Status Badge) */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[14px] font-bold text-[#dbfcff]">
                        {trade.symbol}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isLong
                            ? 'bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30'
                            : 'bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30'
                        }`}
                      >
                        {trade.direction}
                      </span>

                      {/* Order Microstructure Badge */}
                      <span
                        className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          isMaker
                            ? 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/30'
                            : 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/35'
                        }`}
                      >
                        {isMaker ? '🎯 MAKER LIMIT (2 bps)' : '⚡ TAKER MARKET (5 bps + slip)'}
                      </span>

                      {/* Strategy Lens Badge */}
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#1d2026] text-[#00f0ff] border border-[#00f0ff]/30 font-semibold">
                        TAB {trade.strategyLensId}: {trade.strategyLensName}
                      </span>

                      {/* Confidence Score */}
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#0b0e14] text-[#fcd34d] font-bold">
                        {trade.confidenceScore}% CONF
                      </span>

                      {/* Telemetry Snapshot Pills if present */}
                      {trade.telemetrySnapshot?.regime && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#141821] border border-[#272a31] text-[#b9cacb]">
                          {trade.telemetrySnapshot.regime.replace('_', ' ')}
                          {trade.telemetrySnapshot.hurst !== undefined
                            ? ` • H=${trade.telemetrySnapshot.hurst.toFixed(2)}`
                            : ''}
                          {trade.telemetrySnapshot.adx !== undefined
                            ? ` • ADX=${trade.telemetrySnapshot.adx.toFixed(0)}`
                            : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Pill */}
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          isPending
                            ? 'bg-[#f59e0b]/15 text-[#fcd34d] border border-[#f59e0b]/40'
                            : isOpen
                            ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                            : isWin
                            ? 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/50'
                            : isLoss
                            ? 'bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/50'
                            : 'bg-[#272a31] text-[#849495]'
                        }`}
                      >
                        {isPending && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping"></span>}
                        {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse"></span>}
                        {isPending ? 'PENDING FIFO LIMIT' : trade.status}
                        {trade.pnlR !== undefined && (
                          <span className="font-mono ml-1 font-bold">
                            ({trade.pnlR >= 0 ? '+' : ''}
                            {trade.pnlR}R NET)
                          </span>
                        )}
                      </span>

                      {/* Trade Timestamp */}
                      <span className="font-mono text-[9px] text-[#849495]">
                        {new Date(trade.createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Price & Microstructure Execution Specs (Entry/Fill, Stop, TP1, Risk/Size, Fees/Slip, Net PnL) */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 font-mono text-[11px] bg-[#0b0e14] p-2.5 rounded-lg border border-[#272a31] tabular-nums">
                    <div>
                      <span className="text-[9px] text-[#849495] block">
                        {isPending ? 'LIMIT ENTRY (QUEUE)' : 'FILLED ENTRY'}
                      </span>
                      <span className="text-[#dbfcff] font-semibold">
                        {formatPrice(trade.filledEntryPrice || trade.entryPrice)}
                      </span>
                      {trade.requestedEntryPrice &&
                        trade.filledEntryPrice &&
                        Math.abs(trade.filledEntryPrice - trade.requestedEntryPrice) > 1e-6 && (
                          <span className="text-[9px] text-[#849495] block">
                            Req: {formatPrice(trade.requestedEntryPrice)}
                          </span>
                        )}
                    </div>
                    <div>
                      <span className="text-[9px] text-[#849495] block">STOP LOSS</span>
                      <span className="text-[#ffb4ab] font-semibold">{formatPrice(trade.stopLoss)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#849495] block">TAKE PROFIT (TP1)</span>
                      <span className="text-[#4edea3] font-semibold">{formatPrice(trade.tp1Price)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#849495] block">RISK / SIZE</span>
                      <span className="text-[#e1e2eb]">
                        ${trade.riskUsdt} ({trade.positionSizeCoins} {trade.symbol.replace('USDT', '')})
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#849495] block">FEE &amp; SLIPPAGE</span>
                      <span className="text-[#fcd34d] font-semibold">
                        {totalCost > 0 ? `-$${totalCost.toFixed(2)}` : isMaker ? 'Est. 2 bps' : 'Est. 8.5 bps'}
                      </span>
                      {totalCost > 0 && (
                        <span className="text-[9px] text-[#849495] block">
                          Fee ${(trade.feeUsdt || 0).toFixed(2)} • Slip ${(trade.slippageUsdt || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] text-[#849495] block">NET REALIZED P&amp;L</span>
                      <span
                        className={`font-bold ${
                          trade.pnlUsdt && trade.pnlUsdt > 0
                            ? 'text-[#4edea3]'
                            : trade.pnlUsdt && trade.pnlUsdt < 0
                            ? 'text-[#ffb4ab]'
                            : 'text-[#849495]'
                        }`}
                      >
                        {trade.pnlUsdt !== undefined
                          ? `${trade.pnlUsdt >= 0 ? '+' : ''}$${trade.pnlUsdt.toFixed(2)}`
                          : isPending
                          ? 'RESTING IN BOOK'
                          : 'RUNNING'}
                      </span>
                      {trade.grossPnlUsdt !== undefined && (
                        <span className="text-[9px] text-[#849495] block">
                          Gross: {trade.grossPnlUsdt >= 0 ? '+' : ''}${trade.grossPnlUsdt.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Notes & Manual Close / Queue Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      {editingNoteId === trade.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add trade reasoning or post-mortem notes..."
                            className="flex-1 h-6 px-2 bg-[#0b0e14] border border-[#00f0ff] rounded text-[#e1e2eb] text-[10px] focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveNote(trade.id)}
                            className="px-2 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 cursor-pointer font-bold"
                          >
                            SAVE
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="px-1.5 py-0.5 rounded bg-[#191c22] text-[#849495] cursor-pointer"
                          >
                            CANCEL
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNoteId(trade.id);
                            setNoteText(trade.notes || '');
                          }}
                          className="text-[#849495] hover:text-[#e1e2eb] flex items-center gap-1 cursor-pointer truncate"
                          title="Click to edit notes"
                        >
                          <span className="material-symbols-outlined text-[12px] text-[#00f0ff]">edit_note</span>
                          <span className="truncate italic">
                            {trade.notes ? `"${trade.notes}"` : '+ Add trade notes...'}
                          </span>
                          {trade.exitReason && (
                            <span className="text-[#00f0ff] not-italic ml-1.5">
                              • [{trade.exitReason}]
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Pending & Open Trades */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleForceFillLimitOrder(trade)}
                            className="px-2 py-0.5 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 cursor-pointer font-bold transition-colors"
                            title="Convert resting limit order into immediate Taker Market fill"
                          >
                            ⚡ FILL @ MARKET
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="px-2 py-0.5 rounded bg-[#ffb4ab]/10 hover:bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/30 cursor-pointer transition-colors"
                          >
                            ✕ CANCEL LIMIT
                          </button>
                        </>
                      )}

                      {isOpen && (
                        <>
                          <button
                            onClick={() => handleManualCloseTrade(trade, 'WIN', 'Manual TP1 Hit', 1.5)}
                            className="px-2 py-0.5 rounded bg-[#4edea3]/10 hover:bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40 cursor-pointer font-bold transition-colors"
                          >
                            HIT TP1 (+1.5R)
                          </button>
                          <button
                            onClick={() => handleManualCloseTrade(trade, 'LOSS', 'Manual SL Hit', -1.0)}
                            className="px-2 py-0.5 rounded bg-[#ffb4ab]/10 hover:bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/40 cursor-pointer font-bold transition-colors"
                          >
                            HIT SL (-1.0R)
                          </button>
                          <button
                            onClick={() => handleManualCloseTrade(trade, 'SCRATCH', 'Breakeven Exit', 0)}
                            className="px-2 py-0.5 rounded bg-[#191c22] hover:bg-[#272a31] text-[#b9cacb] border border-[#272a31] cursor-pointer transition-colors"
                          >
                            SCRATCH (0R)
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-[#191c22] hover:bg-[#ffb4ab]/20 text-[#849495] hover:text-[#ffb4ab] transition-colors cursor-pointer"
                        title="Delete trade entry"
                      >
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-[#272a31] bg-[#141821] flex items-center justify-between font-mono text-[10px] text-[#849495]">
          <span>VERTEX INSTITUTIONAL EXECUTION SIMULATOR // FIFO LIMIT &amp; FEE MODEL</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 font-semibold transition-colors cursor-pointer"
          >
            CLOSE JOURNAL
          </button>
        </div>
      </div>
    </div>
  );
};
