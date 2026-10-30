import React, { useState } from 'react';
import { PairItem } from '../types';

interface HeaderProps {
  topPairs?: PairItem[];
  activePair?: PairItem;
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
  obMode?: 'strict' | 'loose';
  onToggleObMode?: (mode: 'strict' | 'loose') => void;
  vpMode?: 'vrvp' | 'session';
  onToggleVpMode?: (mode: 'vrvp' | 'session') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePair,
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
  obMode = 'strict',
  onToggleObMode,
  vpMode = 'vrvp',
  onToggleVpMode,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('inferno_theme');
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    const currentAttr = document.documentElement.getAttribute('data-theme');
    return currentAttr === 'light' ? 'light' : 'dark';
  });

  const handleToggleTheme = (nextTheme?: 'dark' | 'light') => {
    const resolved = nextTheme || (theme === 'dark' ? 'light' : 'dark');
    setTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
    try {
      localStorage.setItem('inferno_theme', resolved);
      window.dispatchEvent(new CustomEvent('inferno:theme-change', { detail: resolved }));
    } catch {
      // ignore storage errors
    }
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#0b0e14]/95 backdrop-blur-xl border-b border-[#1e2433] shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-12 sm:h-13 flex items-center justify-between gap-2">
          {/* Left: Brand & Live Ping Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              aria-label="Asset Launchpad"
              className="w-8 h-8 rounded bg-[#141821] border border-[#272a31] flex items-center justify-center text-[#849495] hover:text-[#00f0ff] hover:border-[#00f0ff]/50 transition-colors cursor-pointer shrink-0"
              onClick={() => (onSwitchAsset ? onSwitchAsset() : onSelectPair('BTCUSDT'))}
              title="Open Top 50 Asset Launchpad"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px]">terminal</span>
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-mono text-[10px] sm:text-[11px] text-[#00f0ff] tracking-wider uppercase font-bold truncate">
                  ● INFERNO // QUANT RADAR
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#1d2026] border border-[#272a31] font-mono text-[8px] sm:text-[9px] text-[#4edea3] font-semibold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                  <span className="hidden xs:inline">LIVE</span> {pingMs}ms
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Right: The Core Navigation Controls (Hidden on mobile to prevent crowding) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {/* 0. Global Theme Toggle (Dark vs High-Contrast Light Mode) */}
            <button
              type="button"
              onClick={() => handleToggleTheme()}
              className="px-2 py-1 rounded bg-[#191c22] hover:bg-[#272a31] text-[#b9cacb] hover:text-[#00f0ff] border border-[#272a31] hover:border-[#00f0ff]/40 font-mono text-[10px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={
                theme === 'dark'
                  ? 'Switch to High-Contrast Light Mode'
                  : 'Switch to Cyber-Brutalist Dark Mode'
              }
              aria-label="Toggle Theme"
            >
              <span className="material-symbols-outlined text-[13px] text-[#00f0ff]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              <span>{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
            </button>

            {/* 1. Global [ 🎓 ROOKIE | ⚡ PRO ] Toggle */}
            {onToggleExperienceMode && (
              <div className="flex items-center p-0.5 rounded-lg bg-[#141821] border border-[#272a31] font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => onToggleExperienceMode('rookie')}
                  className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
                  className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
                <span>JOURNAL</span>
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
                <span>GLOSSARY</span>
              </button>
            )}

            {/* 4. Switch Asset Button (Opens Top 50 Launchpad) */}
            {onSwitchAsset && (
              <button
                onClick={onSwitchAsset}
                className="px-2.5 py-1 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/50 font-mono text-[10px] font-bold transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(0,240,255,0.2)] cursor-pointer"
                title="Switch Target Crypto Asset from Top 50 Binance Perpetuals"
              >
                <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                <span>⇄ TOP 50 ASSETS</span>
              </button>
            )}

            {/* PWA Install Button if available */}
            {installPrompt && (
              <button
                onClick={onInstallPwa}
                className="px-2 py-1 rounded bg-[#191c22] hover:bg-[#272a31] text-[#00f0ff] border border-[#272a31] font-mono text-[9px] transition-colors flex items-center gap-1"
                title="Install Web App"
              >
                <span className="material-symbols-outlined text-[13px]">download</span>
                <span>INSTALL</span>
              </button>
            )}
          </div>

          {/* Mobile Right: Theme Toggle + Compact Mode Pill + Journal Shortcut + Slide-Out Drawer Trigger */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleTheme()}
              aria-label="Toggle Theme"
              className="w-8 h-8 rounded bg-[#141821] border border-[#272a31] text-[#00f0ff] flex items-center justify-center cursor-pointer"
              title={
                theme === 'dark'
                  ? 'Switch to High-Contrast Light Mode'
                  : 'Switch to Cyber-Brutalist Dark Mode'
              }
            >
              <span className="material-symbols-outlined text-[15px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {onToggleExperienceMode && (
              <button
                type="button"
                onClick={() => onToggleExperienceMode(experienceMode === 'rookie' ? 'pro' : 'rookie')}
                className={`h-8 px-2 rounded font-mono text-[9px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  experienceMode === 'rookie'
                    ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40'
                    : 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                }`}
                title="Tap to switch Rookie / Pro mode"
              >
                <span>{experienceMode === 'rookie' ? '🎓 ROOKIE' : '⚡ PRO'}</span>
              </button>
            )}

            {onOpenJournal && (
              <button
                type="button"
                onClick={onOpenJournal}
                className="h-8 px-2 rounded bg-[#141821] border border-[#272a31] text-[#4edea3] font-mono text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                title="Open Paper Trade Journal"
              >
                <span className="material-symbols-outlined text-[14px]">history_edu</span>
                {activeJournalTradesCount > 0 && (
                  <span className="px-1 rounded-full bg-[#4edea3]/20 text-[#4edea3] text-[8px] font-bold">
                    {activeJournalTradesCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Terminal Menu Drawer"
              className="w-9 h-8 rounded bg-[#141821] border border-[#00f0ff]/40 text-[#00f0ff] flex items-center justify-center cursor-pointer shadow-[0_0_8px_rgba(0,240,255,0.15)]"
            >
              <span className="material-symbols-outlined text-[18px]">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Command Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end bg-black/75 backdrop-blur-sm">
          <div
            className="fixed inset-0"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-[#0b0e14] border-l border-[#00f0ff]/40 h-full flex flex-col justify-between p-4 shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-y-auto">
            <div className="flex flex-col gap-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
                <div>
                  <span className="font-mono text-[10px] text-[#00f0ff] font-bold uppercase tracking-wider block">
                    INFERNO // TERMINAL
                  </span>
                  <span className="font-mono text-[12px] text-[#e1e2eb] font-bold">
                    Quick Command Drawer
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded bg-[#141821] border border-[#272a31] text-[#849495] hover:text-[#e1e2eb] flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* 0. Global Theme Selector */}
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[9px] text-[#849495] uppercase font-bold tracking-wider">
                  DISPLAY THEME AESTHETIC
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#141821] border border-[#272a31] font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleToggleTheme('dark')}
                    className={`min-h-[38px] rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      theme === 'dark'
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                        : 'text-[#849495]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">dark_mode</span>
                    <span>DARK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleTheme('light')}
                    className={`min-h-[38px] rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      theme === 'light'
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                        : 'text-[#849495]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">light_mode</span>
                    <span>LIGHT</span>
                  </button>
                </div>
              </div>

              {/* 1. Experience Mode Selector */}
              {onToggleExperienceMode && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] text-[#849495] uppercase font-bold tracking-wider">
                    TERMINAL EXPERIENCE MODE
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#141821] border border-[#272a31] font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleExperienceMode('rookie');
                        setDrawerOpen(false);
                      }}
                      className={`min-h-[40px] rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        experienceMode === 'rookie'
                          ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                          : 'text-[#849495]'
                      }`}
                    >
                      <span>🎓 ROOKIE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleExperienceMode('pro');
                        setDrawerOpen(false);
                      }}
                      className={`min-h-[40px] rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        experienceMode === 'pro'
                          ? 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/50'
                          : 'text-[#849495]'
                      }`}
                    >
                      <span>⚡ PRO</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Chart Structural Profile Settings (OB & VP Mode) */}
              {(onToggleObMode || onToggleVpMode) && (
                <div className="flex flex-col gap-2 pt-1 border-t border-[#1e2433]">
                  <span className="font-mono text-[9px] text-[#849495] uppercase font-bold tracking-wider">
                    STRUCTURAL ENGINE SETTINGS
                  </span>
                  {onToggleObMode && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleObMode('strict')}
                        className={`min-h-[38px] rounded font-mono text-[10px] font-bold border cursor-pointer ${
                          obMode === 'strict'
                            ? 'bg-[#00a572]/25 text-[#4edea3] border-[#4edea3]/50'
                            : 'bg-[#141821] text-[#849495] border-[#272a31]'
                        }`}
                      >
                        STRICT OB
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleObMode('loose')}
                        className={`min-h-[38px] rounded font-mono text-[10px] font-bold border cursor-pointer ${
                          obMode === 'loose'
                            ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50'
                            : 'bg-[#141821] text-[#849495] border-[#272a31]'
                        }`}
                      >
                        LOOSE OB
                      </button>
                    </div>
                  )}
                  {onToggleVpMode && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleVpMode('vrvp')}
                        className={`min-h-[38px] rounded font-mono text-[10px] font-bold border cursor-pointer ${
                          vpMode === 'vrvp'
                            ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50'
                            : 'bg-[#141821] text-[#849495] border-[#272a31]'
                        }`}
                      >
                        VISIBLE VRVP
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleVpMode('session')}
                        className={`min-h-[38px] rounded font-mono text-[10px] font-bold border cursor-pointer ${
                          vpMode === 'session'
                            ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50'
                            : 'bg-[#141821] text-[#849495] border-[#272a31]'
                        }`}
                      >
                        SESSION VP
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Primary Workspace Modals & Asset Launchpad */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#1e2433]">
                <span className="font-mono text-[9px] text-[#849495] uppercase font-bold tracking-wider">
                  TOOLS &amp; ASSET CATALOG
                </span>

                {onSwitchAsset && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onSwitchAsset();
                    }}
                    className="min-h-[44px] px-3 rounded-lg bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 font-mono text-[11px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                      <span>TOP 50 ASSET LAUNCHPAD</span>
                    </span>
                    <span className="text-[10px]">{activePair?.symbol || 'BTCUSDT'} →</span>
                  </button>
                )}

                {onOpenJournal && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onOpenJournal();
                    }}
                    className="min-h-[44px] px-3 rounded-lg bg-[#141821] hover:bg-[#191c22] text-[#e1e2eb] border border-[#272a31] font-mono text-[11px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#4edea3]">
                        history_edu
                      </span>
                      <span>PAPER TRADE JOURNAL</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#4edea3]/20 text-[#4edea3] text-[10px]">
                      {activeJournalTradesCount} ACTIVE
                    </span>
                  </button>
                )}

                {onOpenGlossary && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onOpenGlossary();
                    }}
                    className="min-h-[44px] px-3 rounded-lg bg-[#141821] hover:bg-[#191c22] text-[#e1e2eb] border border-[#272a31] font-mono text-[11px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#00f0ff]">
                        menu_book
                      </span>
                      <span>QUANT &amp; SMC GLOSSARY</span>
                    </span>
                    <span className="text-[10px] text-[#00f0ff]">25+ GUIDES →</span>
                  </button>
                )}

                {installPrompt && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onInstallPwa();
                    }}
                    className="min-h-[44px] px-3 rounded-lg bg-[#141821] hover:bg-[#191c22] text-[#00f0ff] border border-[#272a31] font-mono text-[11px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>INSTALL TERMINAL APP</span>
                    </span>
                    <span className="text-[10px]">PWA</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-[#1e2433] font-mono text-[9px] text-[#849495] flex items-center justify-between">
              <span>INFERNO // QUANT RADAR</span>
              <span className="text-[#4edea3]">LIVE {pingMs}ms</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
