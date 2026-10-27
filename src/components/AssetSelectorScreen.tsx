import React, { useState, useMemo } from 'react';
import { PairItem } from '../types';

interface AssetSelectorScreenProps {
  pairs: PairItem[];
  isLoading: boolean;
  onSelectPair: (pair: PairItem) => void;
  activeSymbol?: string;
  pingMs?: number;
}

export const AssetSelectorScreen: React.FC<AssetSelectorScreenProps> = ({
  pairs,
  isLoading,
  onSelectPair,
  activeSymbol,
  pingMs = 24,
}) => {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'majors' | 'gainers' | 'losers' | 'volume'>('all');

  const filteredPairs = useMemo(() => {
    let list = [...pairs];

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.baseAsset.toLowerCase().includes(q)
      );
    }

    // Filter tabs
    switch (filterTab) {
      case 'majors':
        return list.slice(0, 10);
      case 'gainers':
        return list.filter((p) => p.isUp ?? p.change24h > 0).sort((a, b) => {
          const deltaA = a.change24h ?? (parseFloat((a.delta || '0').replace('%', '').replace('+', '')) || 0);
          const deltaB = b.change24h ?? (parseFloat((b.delta || '0').replace('%', '').replace('+', '')) || 0);
          return deltaB - deltaA;
        });
      case 'losers':
        return list.filter((p) => (p.isUp !== undefined ? !p.isUp : p.change24h <= 0)).sort((a, b) => {
          const deltaA = a.change24h ?? (parseFloat((a.delta || '0').replace('%', '').replace('+', '')) || 0);
          const deltaB = b.change24h ?? (parseFloat((b.delta || '0').replace('%', '').replace('+', '')) || 0);
          return deltaA - deltaB;
        });
      case 'volume':
        return list.sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0));
      case 'all':
      default:
        return list;
    }
  }, [pairs, search, filterTab]);

  const formatPrice = (price: number) => {
    if (!price || price <= 0) return '0.00';
    if (price < 0.0001) return price.toFixed(7);
    if (price < 0.01) return price.toFixed(5);
    if (price < 1) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb] flex flex-col selection:bg-[#00f0ff]/20">
      {/* Top Launchpad Navbar */}
      <header className="border-b border-[#1e2433] bg-[#0b0e14]/95 backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#141820] border border-[#00f0ff]/30 flex items-center justify-center text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.15)]">
              <span className="material-symbols-outlined text-[20px]">radar</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-[#00f0ff] uppercase tracking-wider font-bold">
                  ● INFERNO // QUANT RADAR // SELECT TARGET ASSET
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#191c22] border border-[#272a31] font-mono text-[8px] text-[#4edea3]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                  BINANCE PERPETUAL FEED ({pairs.length} ASSETS)
                </span>
              </div>
              <h1 className="font-mono text-[16px] font-bold tracking-tight text-[#e1e2eb]">
                Institutional Top 50 Liquidity Launchpad
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto font-mono text-[11px]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141820] border border-[#272a31] text-[#849495]">
              <span className="material-symbols-outlined text-[14px] text-[#4edea3]">network_check</span>
              <span>{pingMs}ms LATENCY</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#141820] border border-[#272a31] text-[#00f0ff] font-semibold">
              DERIBIT &amp; BINANCE REST+WS
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Search & Quick Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-[#141820] border border-[#272a31] p-3 rounded-xl shadow-lg">
          {/* Instant Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#849495] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search BTC, ETH, SOL, XRP, DOGE, PEPE, SUI, ARB..."
              className="w-full bg-[#0b0e14] border border-[#272a31] rounded-lg pl-9 pr-8 py-2 font-mono text-[12px] text-[#e1e2eb] placeholder-[#849495]/60 focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]/50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#849495] hover:text-[#e1e2eb] text-[14px]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar font-mono text-[11px] shrink-0">
            {(
              [
                { id: 'all', label: 'All Top 50', icon: 'grid_view' },
                { id: 'majors', label: 'Top 10 Majors', icon: 'stars' },
                { id: 'gainers', label: '24h Gainers', icon: 'trending_up' },
                { id: 'losers', label: '24h Losers', icon: 'trending_down' },
                { id: 'volume', label: 'High Volume', icon: 'equalizer' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer font-semibold ${
                  filterTab === tab.id
                    ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/50 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    : 'bg-[#191c22] text-[#849495] border-[#272a31] hover:text-[#e1e2eb] hover:border-[#849495]/40'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Launch Instruction Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#141820]/80 border border-[#272a31] text-[11px] font-mono text-[#849495]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#00f0ff]">touch_app</span>
            <span>
              Click any perpetual contract below to initialize high-speed quant orderflow, institutional volume profile &amp; 5-strategy telemetry.
            </span>
          </div>
          <span className="hidden sm:inline text-[#4edea3] font-semibold">
            {filteredPairs.length} ASSETS AVAILABLE
          </span>
        </div>

        {/* Grid of Top 50 Crypto Cards */}
        {isLoading && pairs.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 20 }).map((_, idx) => (
              <div
                key={idx}
                className="h-32 rounded-xl bg-[#141820]/50 border border-[#272a31] animate-pulse p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-16 h-4 bg-[#272a31] rounded"></div>
                  <div className="w-10 h-4 bg-[#272a31] rounded"></div>
                </div>
                <div className="w-24 h-6 bg-[#272a31] rounded"></div>
                <div className="w-full h-2 bg-[#272a31] rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredPairs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-3 bg-[#141820]/40 border border-[#272a31] rounded-xl">
            <span className="material-symbols-outlined text-4xl text-[#849495]">search_off</span>
            <div className="font-mono text-[14px] text-[#e1e2eb] font-semibold">
              No matching assets found for "{search}"
            </div>
            <button
              onClick={() => {
                setSearch('');
                setFilterTab('all');
              }}
              className="px-3 py-1.5 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-mono text-[11px] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {filteredPairs.map((pair, idx) => {
              const isActive = pair.symbol === activeSymbol;
              const high = pair.high24h ?? pair.price * 1.02;
              const low = pair.low24h ?? pair.price * 0.98;
              const rangeSpan = Math.max(high - low, 0.0001);
              const pricePct = Math.min(100, Math.max(0, ((pair.price - low) / rangeSpan) * 100));

              return (
                <button
                  key={pair.symbol}
                  onClick={() => onSelectPair(pair)}
                  className={`group relative text-left bg-[#141820] hover:bg-[#191f2b] border rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition-all duration-150 cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-0.5 ${
                    isActive
                      ? 'border-[#00f0ff] ring-1 ring-[#00f0ff]/50 bg-[#16202c]'
                      : 'border-[#272a31] hover:border-[#00f0ff]/50'
                  }`}
                >
                  {/* Top: Rank, Symbol & Delta Pill */}
                  <div className="flex items-center justify-between gap-1 w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-[#849495] w-5 text-center">
                        #{pair.rank || idx + 1}
                      </span>
                      <span className="font-mono text-[14px] font-bold text-[#e1e2eb] group-hover:text-[#00f0ff] transition-colors">
                        {pair.baseAsset}
                      </span>
                      <span className="font-mono text-[9px] text-[#849495] px-1 py-0.2 rounded bg-[#0b0e14] border border-[#272a31]">
                        PERP
                      </span>
                    </div>

                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        pair.isUp
                          ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                          : 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                      }`}
                    >
                      {pair.delta}
                    </span>
                  </div>

                  {/* Middle: Live Price */}
                  <div>
                    <div className="font-mono text-[16px] font-bold text-[#ffffff] tracking-tight">
                      ${formatPrice(pair.price)}
                    </div>
                    <div className="font-mono text-[10px] text-[#849495] flex items-center justify-between mt-0.5">
                      <span>24h Vol:</span>
                      <span className="text-[#00f0ff] font-semibold">{pair.vol}</span>
                    </div>
                  </div>

                  {/* 24h High/Low Mini Bar */}
                  <div className="w-full flex flex-col gap-1 pt-1 border-t border-[#272a31]/60">
                    <div className="flex items-center justify-between font-mono text-[9px] text-[#849495]">
                      <span>L: ${formatPrice(low)}</span>
                      <span>H: ${formatPrice(high)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0b0e14] rounded-full overflow-hidden border border-[#272a31] relative">
                      <div
                        className="h-full bg-gradient-to-r from-[#ffb4ab] via-[#f59e0b] to-[#4edea3] rounded-full"
                        style={{ width: `${pricePct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Hover indicator CTA */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[14px] text-[#00f0ff]">
                      arrow_outward
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e2433] bg-[#0b0e14] py-3 px-4 font-mono text-[10px] text-[#849495] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#00f0ff]">INFERNO // TERMINAL</span>
          <span>•</span>
          <span>Binance Futures USDT Perpetuals Catalog</span>
        </div>
        <div>
          <span>DISCLAIMER: For analytical &amp; algorithmic research purposes only. Not financial advice.</span>
        </div>
      </footer>
    </div>
  );
};
