import React from 'react';
import { PairItem } from '../types';

interface HeaderProps {
  topPairs?: PairItem[];
  pingMs: number;
  onSelectPair: (symbol: string) => void;
  onOpenSearch?: () => void;
  installPrompt: any;
  onInstallPwa: () => void;
  onSwitchAsset?: () => void;
  experienceMode?: 'rookie' | 'pro';
  onToggleExperienceMode?: (mode: 'rookie' | 'pro') => void;
  onOpenGlossary?: () => void;
  onOpenJournal?: () => void;
  activeJournalTradesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  pingMs,
  onSelectPair,
  installPrompt,
  onInstallPwa,
  onSwitchAsset,
  experienceMode = 'rookie',
  onToggleExperienceMode,
  onOpenGlossary,
  onOpenJournal,
  activeJournalTradesCount = 0,
}) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#0b0e14]/95 backdrop-blur-xl border-b border-[#1e2433] shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-12 sm:h-13 flex items-center justify-between gap-2">
        {/* Left: Brand & Live Ping Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            aria-label="Asset Launchpad"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#141821] border border-[#272a31] flex items-center justify-center text-[#849495] hover:text-[#00f0ff] hover:border-[#00f0ff]/50 transition-colors cursor-pointer shrink-0"
            onClick={() => (onSwitchAsset ? onSwitchAsset() : onSelectPair('BTCUSDT'))}
            title="Open Top 50 Asset Launchpad"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">terminal</span>
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-mono text-[10px] sm:text-[11px] text-[#00f0ff] tracking-wider uppercase font-bold truncate">
                ● VERTEX // RADAR
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#1d2026] border border-[#272a31] font-mono text-[8px] sm:text-[9px] text-[#4edea3] font-semibold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                <span className="hidden xs:inline">LIVE</span> {pingMs}ms
              </span>
            </div>
          </div>
        </div>

        {/* Right: The 4 Core Navigation Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1. Global [ 🎓 ROOKIE | ⚡ PRO ] Toggle */}
          {onToggleExperienceMode && (
            <div className="flex items-center p-0.5 rounded-lg bg-[#141821] border border-[#272a31] font-mono text-[9px] sm:text-[10px]">
              <button
                type="button"
                onClick={() => onToggleExperienceMode('rookie')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  experienceMode === 'rookie'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                    : 'text-[#849495] hover:text-[#e1e2eb]'
                }`}
                title="Rookie Guide Mode: Plain-English Takeaways & Workflow Guidance"
              >
                <span>🎓 ROOKIE</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleExperienceMode('pro')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  experienceMode === 'pro'
                    ? 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/50 shadow-[0_0_8px_rgba(78,222,163,0.25)]'
                    : 'text-[#849495] hover:text-[#e1e2eb]'
                }`}
                title="Pro Terminal Mode: High-Density Institutional View"
              >
                <span>⚡ PRO</span>
              </button>
            </div>
          )}

          {/* 2. Paper Trade Journal Button with Active Count Badge */}
          {onOpenJournal && (
            <button
              type="button"
              onClick={onOpenJournal}
              className="px-2 py-1 rounded bg-[#191c22] hover:bg-[#272a31] text-[#b9cacb] hover:text-[#4edea3] border border-[#272a31] hover:border-[#4edea3]/40 font-mono text-[10px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open Automated Paper Trade Journal & Strategy Tester"
            >
              <span className="material-symbols-outlined text-[13px] text-[#4edea3]">history_edu</span>
              <span className="hidden sm:inline">JOURNAL</span>
              {activeJournalTradesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/50 text-[8px] font-bold">
                  {activeJournalTradesCount}
                </span>
              )}
            </button>
          )}

          {/* 3. Interactive Institutional Glossary Button */}
          {onOpenGlossary && (
            <button
              type="button"
              onClick={onOpenGlossary}
              className="px-2 py-1 rounded bg-[#191c22] hover:bg-[#272a31] text-[#b9cacb] hover:text-[#00f0ff] border border-[#272a31] hover:border-[#00f0ff]/40 font-mono text-[10px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open Interactive Institutional Jargon & Quant Glossary"
            >
              <span className="material-symbols-outlined text-[13px] text-[#00f0ff]">menu_book</span>
              <span className="hidden sm:inline">GLOSSARY</span>
            </button>
          )}

          {/* 4. Switch Asset Button (Opens Top 50 Launchpad) */}
          {onSwitchAsset && (
            <button
              onClick={onSwitchAsset}
              className="px-2 sm:px-2.5 py-1 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/50 font-mono text-[10px] font-bold transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(0,240,255,0.2)] cursor-pointer"
              title="Switch Target Crypto Asset from Top 50 Binance Perpetuals"
            >
              <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
              <span className="hidden md:inline">⇄ TOP 50 ASSETS</span>
              <span className="md:hidden">⇄ ASSET</span>
            </button>
          )}

          {/* PWA Install Button if available */}
          {installPrompt && (
            <button
              onClick={onInstallPwa}
              className="px-1.5 sm:px-2 py-1 rounded bg-[#191c22] hover:bg-[#272a31] text-[#00f0ff] border border-[#272a31] font-mono text-[9px] transition-colors flex items-center gap-1"
              title="Install Web App"
            >
              <span className="material-symbols-outlined text-[13px]">download</span>
              <span className="hidden lg:inline">INSTALL</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
