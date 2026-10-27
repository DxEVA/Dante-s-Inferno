import React, { useState, useRef, useEffect } from 'react';
import { PairItem, SharpeSortinoMetrics } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface TickerBarProps {
  activePair: PairItem;
  topPairs: PairItem[];
  allPairs?: PairItem[];
  selectedTf: string;
  obMode: 'strict' | 'loose';
  vpMode: 'vrvp' | 'session';
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectPair: (symbol: string) => void;
  onSelectTf: (tf: string) => void;
  onToggleObMode: (mode: 'strict' | 'loose') => void;
  onToggleVpMode: (mode: 'vrvp' | 'session') => void;
  sharpeSortino?: SharpeSortinoMetrics;
}

export const TickerBar: React.FC<TickerBarProps> = ({
  activePair,
  topPairs,
  allPairs = [],
  selectedTf,
  obMode,
  vpMode,
  sharpeSortino,
  searchQuery,
  onSearchChange,
  onSelectPair,
  onSelectTf,
  onToggleObMode,
  onToggleVpMode,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [isTop50ModalOpen, setIsTop50ModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Pool to search from: Top 50 perpetuals if loaded, else topPairs
  const searchPool = allPairs.length > 0 ? allPairs.slice(0, 50) : topPairs;
  const quickTop10 = allPairs.length >= 10 ? allPairs.slice(0, 10) : topPairs.slice(0, 10);

  const searchResults = searchQuery.trim()
    ? searchPool.filter(
        (p) =>
          p.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.baseAsset.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchPool;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsTop50ModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col bg-[#141821] px-2.5 sm:px-3 py-1.5 sm:py-2 gap-1.5 sm:gap-2 border-b border-[#272a31] shadow-sm">
      {/* Active Asset Header & Metric Strip */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Symbol, Perpetual tag & Live Price */}
        <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0 truncate">
          <h2 className="font-mono text-[16px] sm:text-[22px] font-bold text-[#dbfcff] tracking-tight truncate">
            {activePair.symbol}
          </h2>
          <span className="hidden sm:inline font-mono text-[10px] text-[#849495] uppercase tracking-wider font-semibold">
            PERP
          </span>
          <span className="font-mono text-[14px] sm:text-[18px] text-[#e1e2eb] font-semibold tracking-tight tabular-nums">
            ${activePair.price >= 1000
              ? activePair.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : activePair.price >= 1
              ? activePair.price.toFixed(2)
              : activePair.price.toFixed(4)}
          </span>
        </div>

        {/* Delta, Vol, Sharpe Badge & Top 50 Modal Trigger */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded font-mono text-[9px] sm:text-[10px] font-bold tabular-nums ${
              activePair.isUp
                ? 'bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30'
                : 'bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30'
            }`}
          >
            <span className="material-symbols-outlined text-[11px] sm:text-[13px]">
              {activePair.isUp ? 'trending_up' : 'trending_down'}
            </span>
            <span>{activePair.delta}</span>
          </span>

          <div className="hidden sm:flex px-2 py-0.5 rounded bg-[#1d2026] border border-[#272a31] font-mono text-[11px] text-[#b9cacb]">
            24h: <span className="text-[#00f0ff] font-medium ml-1">{activePair.vol}</span>
          </div>

          {sharpeSortino && (
            <InfoTooltip
              content={{
                title: 'ROLLING SHARPE & SORTINO REGIME',
                symbol: activePair.symbol,
                categoryBadge: 'QUANT RISK',
                badgeColor:
                  sharpeSortino.sharpeRatio >= 1.0
                    ? '#4edea3'
                    : sharpeSortino.sharpeRatio >= 0.5
                    ? '#f59e0b'
                    : '#00f0ff',
                whatItIs:
                  'Risk-adjusted return metrics measuring return per unit of total risk (Sharpe), downside risk only (Sortino), and directional trend efficiency (Kaufman).',
                liveRead: `${activePair.symbol} Rolling Sharpe is ${sharpeSortino.sharpeRatio.toFixed(
                  2
                )} (${sharpeSortino.sharpeRegime}), Sortino Ratio is ${sharpeSortino.sortinoRatio.toFixed(
                  2
                )}, and Kaufman Trend Efficiency is ${(sharpeSortino.returnEfficiency * 100).toFixed(0)}%.`,
                actionability:
                  sharpeSortino.sharpeRatio >= 1.0
                    ? `${activePair.symbol} volatility strongly rewards trend-following and momentum expansion holding.`
                    : Math.abs(sharpeSortino.sharpeRatio) < 0.5
                    ? `${activePair.symbol} is in a low-efficiency chop regime; strictly favor mean-reversion range fading over breakout chasing.`
                    : `${activePair.symbol} is exhibiting steady directional drift; size positions cautiously on pullbacks.`,
              }}
            >
              <div className="px-1.5 sm:px-2 py-0.5 rounded bg-[#1d2026] hover:bg-[#252a36] border border-[#00f0ff]/30 hover:border-[#00f0ff] font-mono text-[9px] sm:text-[11px] text-[#b9cacb] flex items-center gap-1 transition-colors cursor-pointer shadow-sm tabular-nums">
                <span className="text-[8px] sm:text-[9px] text-[#849495] font-semibold">SHARPE:</span>
                <span
                  className={`font-bold ${
                    sharpeSortino.sharpeRatio >= 1.0
                      ? 'text-[#4edea3]'
                      : sharpeSortino.sharpeRatio >= 0.5
                      ? 'text-[#fcd34d]'
                      : Math.abs(sharpeSortino.sharpeRatio) < 0.5
                      ? 'text-[#00f0ff]'
                      : 'text-[#ffb4ab]'
                  }`}
                >
                  {sharpeSortino.sharpeRatio >= 0 ? '+' : ''}
                  {sharpeSortino.sharpeRatio.toFixed(2)}
                </span>
              </div>
            </InfoTooltip>
          )}

          <button
            onClick={() => setIsTop50ModalOpen(true)}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-[#0b0e14] border border-[#00f0ff]/50 hover:border-[#00f0ff] text-[#00f0ff] font-mono text-[9px] sm:text-[11px] font-semibold transition-all shadow-[0_0_8px_rgba(0,240,255,0.15)] cursor-pointer shrink-0"
            title="Browse full list of Top 50 Binance Perpetual contracts"
          >
            <span className="material-symbols-outlined text-[12px] sm:text-[13px]">table_rows</span>
            <span>TOP 50</span>
          </button>
        </div>
      </div>

      {/* Desktop Quick Search Input (Hidden on mobile to save vertical real estate) */}
      <div ref={searchContainerRef} className="relative w-full hidden md:flex flex-col">
        <div className="relative w-full flex items-center">
          <div className="absolute left-2.5 flex items-center pointer-events-none text-[#849495]">
            <span className="material-symbols-outlined text-[15px]">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder="Search Top 50 Binance Perps by Symbol or Base Asset (e.g. BTC, SOL, SUI, DOGE)..."
            className="w-full h-7.5 pl-8 pr-16 rounded bg-[#0b0e14] border border-[#272a31] text-[#e1e2eb] text-[11px] font-mono placeholder:text-[#849495] focus:outline-none focus:border-[#00f0ff] transition-all"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <span className="px-1.5 py-0.2 rounded bg-[#272a31] text-[#00f0ff] font-mono text-[8px] uppercase tracking-wider">
              TOP 50
            </span>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && (
          <div className="absolute top-8 left-0 w-full bg-[#0b0e14]/98 border border-[#00f0ff]/40 rounded shadow-[0_8px_24px_rgba(0,0,0,0.8)] z-50 max-h-72 overflow-y-auto no-scrollbar py-1">
            <div className="px-3 py-1 font-mono text-[9px] text-[#849495] uppercase border-b border-[#1e2433] flex justify-between">
              <span>TOP 50 LIQUID USDT PERPETUALS</span>
              <span>{searchResults.length} ASSETS</span>
            </div>
            {searchResults.length === 0 ? (
              <div className="px-3 py-3 text-center font-mono text-[11px] text-[#849495]">
                No matching perpetual pair in Top 50
              </div>
            ) : (
              searchResults.map((pair, idx) => (
                <button
                  key={pair.symbol}
                  onClick={() => {
                    onSelectPair(pair.symbol);
                    setIsSearchOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#191c22] border-b border-[#191c22]/50 font-mono text-[11px] transition-colors text-left cursor-pointer ${
                    pair.symbol === activePair.symbol ? 'bg-[#00f0ff]/10 text-[#00f0ff]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#849495] w-6">#{pair.rank || idx + 1}</span>
                    <span className="text-[#dbfcff] font-semibold">{pair.symbol}</span>
                    <span className="text-[#849495] text-[10px]">({pair.baseAsset})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#e1e2eb]">
                      ${pair.price >= 1000
                        ? pair.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : pair.price >= 1
                        ? pair.price.toFixed(2)
                        : pair.price.toFixed(4)}
                    </span>
                    <span className={`w-14 text-right ${pair.isUp ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}`}>
                      {pair.delta}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Single Clean Row: Timeframe Selector & Sensitivity / VP Toggles (Horizontal Scroll) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar whitespace-nowrap py-0.5">
        {/* Timeframe Selector */}
        <div className="flex items-center rounded bg-[#0b0e14] border border-[#272a31] p-0.5 shrink-0">
          {['5m', '15m', '30m', '1h', '2h', '4h', '12h', '1d', '1w'].map((tf) => {
            const isSelected = selectedTf === tf;
            return (
              <button
                key={tf}
                onClick={() => onSelectTf(tf)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono text-[9px] sm:text-[10px] uppercase font-semibold transition-colors shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#272a31] text-[#00f0ff] border border-[#00f0ff]/40 shadow-sm font-bold'
                    : 'text-[#849495] hover:text-[#e1e2eb]'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Sensitivity & Profile Anchor Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded bg-[#0b0e14] border border-[#272a31] p-0.5">
            <button
              onClick={() => onToggleObMode('strict')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-mono text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer ${
                obMode === 'strict'
                  ? 'bg-[#00a572] text-[#00311f] font-bold shadow-sm'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              STRICT OB
            </button>
            <button
              onClick={() => onToggleObMode('loose')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-mono text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer ${
                obMode === 'loose'
                  ? 'bg-[#272a31] text-[#00f0ff] font-bold'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              LOOSE
            </button>
          </div>

          <div className="flex items-center rounded bg-[#0b0e14] border border-[#272a31] p-0.5">
            <button
              onClick={() => onToggleVpMode('vrvp')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-mono text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer ${
                vpMode === 'vrvp'
                  ? 'bg-[#272a31] text-[#00f0ff] border border-[#00f0ff]/40 font-bold'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              VRVP
            </button>
            <button
              onClick={() => onToggleVpMode('session')}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-mono text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer ${
                vpMode === 'session'
                  ? 'bg-[#272a31] text-[#00f0ff] border border-[#00f0ff]/40 font-bold'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              SESSION
            </button>
          </div>
        </div>
      </div>

      {/* Top 50 Perps Full Modal */}
      {isTop50ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div
            ref={modalRef}
            className="w-full max-w-2xl bg-[#0b0e14] border border-[#00f0ff]/50 rounded-xl shadow-[0_16px_50px_rgba(0,0,0,0.95)] flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#272a31] bg-[#141821]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00f0ff] text-[20px]">leaderboard</span>
                <div>
                  <h3 className="font-mono text-[14px] font-bold text-[#dbfcff]">
                    TOP 50 BINANCE USDT PERPETUAL CONTRACTS
                  </h3>
                  <p className="font-mono text-[10px] text-[#849495]">
                    Ranked strictly descending by 24-hour USDT quote volume
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTop50ModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#272a31] text-[#849495] hover:text-[#e1e2eb] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 border-b border-[#272a31] bg-[#10131a]">
              <div className="relative">
                <span className="absolute left-2.5 top-2 material-symbols-outlined text-[16px] text-[#849495]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Filter by coin or symbol (e.g. SUI, PEPE, AVAX)..."
                  className="w-full h-8 pl-8 pr-3 bg-[#0b0e14] border border-[#272a31] rounded font-mono text-[11px] text-[#e1e2eb] focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            {/* Modal Grid / Table */}
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[#1e2433]">
              {searchResults.map((pair, idx) => {
                const isActive = pair.symbol === activePair.symbol;
                return (
                  <button
                    key={pair.symbol}
                    onClick={() => {
                      onSelectPair(pair.symbol);
                      setIsTop50ModalOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#191c22] transition-colors text-left cursor-pointer ${
                      isActive ? 'bg-[#00f0ff]/10 border-l-2 border-[#00f0ff]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] font-bold text-[#849495] w-6">
                        #{pair.rank || idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-bold text-[#dbfcff]">
                            {pair.symbol}
                          </span>
                          <span className="font-mono text-[10px] text-[#849495]">
                            {pair.baseAsset}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-mono text-[13px] text-[#e1e2eb] font-semibold">
                          ${pair.price >= 1000
                            ? pair.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : pair.price >= 1
                            ? pair.price.toFixed(2)
                            : pair.price.toFixed(4)}
                        </div>
                        <div className="font-mono text-[10px] text-[#849495]">
                          Vol: <span className="text-[#00f0ff]">{pair.vol}</span>
                        </div>
                      </div>

                      <span
                        className={`font-mono text-[12px] font-bold px-2 py-0.5 rounded w-18 text-center ${
                          pair.isUp
                            ? 'bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30'
                            : 'bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30'
                        }`}
                      >
                        {pair.delta}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
