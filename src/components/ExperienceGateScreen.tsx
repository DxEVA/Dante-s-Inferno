import React, { useState } from 'react';
import { motion } from 'motion/react';

interface ExperienceGateScreenProps {
  pingMs: number;
  currentMode: 'rookie' | 'pro';
  onSelectMode: (mode: 'rookie' | 'pro', rememberSession: boolean) => void;
}

export const ExperienceGateScreen: React.FC<ExperienceGateScreenProps> = ({
  pingMs,
  currentMode,
  onSelectMode,
}) => {
  const [rememberSession, setRememberSession] = useState<boolean>(true);
  const [hoveredCard, setHoveredCard] = useState<'rookie' | 'pro' | null>(null);

  const rookieFeatures = [
    {
      icon: 'translate',
      title: 'Plain-English Signal Translation:',
      desc: 'Translates institutional orderflow, GEX, and Hurst regimes into clear takeaways.',
    },
    {
      icon: 'filter_alt',
      title: 'Step-by-Step 6-Stage Funnel:',
      desc: 'Walks you from Price & Volume to Execution without visual overload.',
    },
    {
      icon: 'psychology',
      title: 'Built-In Mentor Analogies & Trap Warnings:',
      desc: 'Explains standard baselines vs. live deviations on every card.',
    },
    {
      icon: 'school',
      title: 'Interactive Codex & Spot-Check Quizzes:',
      desc: 'Learn all 12 indicators and 14 famous strategies while watching live charts.',
    },
  ];

  const proFeatures = [
    {
      icon: 'query_stats',
      title: 'Raw Microstructure & Derivatives Vectors:',
      desc: 'Instant access to 50-VWMA Z-Scores, Spot vs. Perp CVD Basis, and 500-Depth Liquidity Walls.',
    },
    {
      icon: 'auto_awesome_mosaic',
      title: 'Multi-Era SSRN, Gann & Lunar Scanner:',
      desc: 'Live 250-bar walk-forward backtests, Square of 9 harmonics, and DeMark/Crabel tape counters.',
    },
    {
      icon: 'radar',
      title: 'Zero-Gamma (0-Γ) & Dealer GEX Pinning:',
      desc: 'Real-time Deribit options positioning, 25Δ skew, and max pain gravity.',
    },
    {
      icon: 'calculate',
      title: 'Half-Kelly & Maker/Taker Fee Drag Sizer:',
      desc: 'Precision R-multiple execution calculator with 1-click paper journal logging.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#05070c] hud-grid-bg text-[#e1e2eb] flex flex-col justify-between overflow-x-hidden select-none">
      {/* Ambient Holographic Radial Auroras */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.14),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(192,132,252,0.10),transparent_55%)]" />

      {/* Top Telemetry Status Bar */}
      <header className="relative z-10 w-full border-b border-white/10 bg-[#070a12]/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap font-mono text-[10px] sm:text-[11px]">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#00f0ff]/15 border border-[#00f0ff]/50 text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.25)]">
              <span className="material-symbols-outlined text-[15px]">terminal</span>
            </span>
            <span className="text-[#00f0ff] font-bold tracking-wider uppercase">
              INFERNO QUANT OS // v4.2
            </span>
            <span className="hidden md:inline text-white/25">•</span>
            <span className="hidden md:inline text-[#b9cacb]">
              BINANCE SPOT/PERP + DERIBIT GEX + GANN/SSRN ENGINE ONLINE
            </span>
          </div>

          <div className="flex items-center gap-3 tabular-nums">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4edea3]/12 border border-[#4edea3]/40 text-[#4edea3] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
              PING: {pingMs}ms
            </span>
            <span className="hidden sm:inline text-[#849495]">SYS_STATUS: NOMINAL</span>
          </div>
        </div>
      </header>

      {/* Main Centerpiece Portal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-6xl mx-auto w-full gap-8">
        {/* Header Block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col items-center text-center max-w-2xl gap-2.5"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/35 font-mono text-[10px] font-bold text-[#00f0ff] tracking-widest uppercase shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
            STEP 01 // OPERATOR INTERFACE CALIBRATION
          </div>

          <h1 className="font-mono text-2xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
            SELECT OPERATOR INTERFACE MODE
          </h1>

          <p className="font-sans text-[13.5px] sm:text-[15px] text-[#cbd5e1] leading-relaxed">
            Calibrate telemetry density, mentorship overlays, and quantitative depth before
            selecting your target market.
          </p>
        </motion.div>

        {/* Two Large Interactive Holographic Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full items-stretch">
          {/* CARD 1: ROOKIE // GUIDED MARKET READER */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
            onMouseEnter={() => setHoveredCard('rookie')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onSelectMode('rookie', rememberSession)}
            className={`hud-glass-card cyber-scan-active p-6 sm:p-7 flex flex-col justify-between gap-6 cursor-pointer border transition-all ${
              hoveredCard === 'rookie' || currentMode === 'rookie'
                ? 'border-[#00f0ff]/60 shadow-[0_0_38px_rgba(0,240,255,0.18)]'
                : 'border-white/10'
            }`}
          >
            <div className="flex flex-col gap-4">
              {/* Top Badge Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#00f0ff]/20 to-[#4edea3]/15 border border-[#00f0ff]/50 font-mono text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider">
                  RECOMMENDED FOR LEARNING &amp; STRUCTURED FLOW
                </span>
                <span className="font-mono text-[10px] text-[#4edea3] font-bold">
                  MODE // 01
                </span>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1.5">
                <h2 className="font-mono text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>🎓 ROOKIE // GUIDED MARKET READER</span>
                </h2>
                <p className="font-sans text-[13px] text-[#94a3b8] leading-relaxed">
                  Designed for traders who want institutional-grade data translated into clear,
                  step-by-step decisions with real-time mentor guardrails.
                </p>
              </div>

              {/* 4 Feature Highlights */}
              <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
                {rookieFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#0b101b]/85 border border-white/[0.07]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/12 border border-[#00f0ff]/35 flex items-center justify-center text-[#00f0ff] shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[17px]">{feat.icon}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-sans text-[13px] font-bold text-white">
                        {feat.title}
                      </span>
                      <span className="font-sans text-[12px] text-[#cbd5e1] leading-relaxed">
                        {feat.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectMode('rookie', rememberSession);
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00f0ff]/25 via-[#00f0ff]/15 to-[#4edea3]/20 hover:from-[#00f0ff]/35 hover:to-[#4edea3]/30 border border-[#00f0ff]/60 text-white font-mono text-[12px] sm:text-[13px] font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(0,240,255,0.22)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>[ INITIALIZE ROOKIE MENTOR HUD → ]</span>
            </button>
          </motion.div>

          {/* CARD 2: PRO // INSTITUTIONAL QUANT TERMINAL */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            onMouseEnter={() => setHoveredCard('pro')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onSelectMode('pro', rememberSession)}
            className={`hud-glass-card cyber-scan-active p-6 sm:p-7 flex flex-col justify-between gap-6 cursor-pointer border transition-all ${
              hoveredCard === 'pro' || currentMode === 'pro'
                ? 'border-[#f59e0b]/60 shadow-[0_0_38px_rgba(245,158,11,0.18)]'
                : 'border-white/10'
            }`}
          >
            <div className="flex flex-col gap-4">
              {/* Top Badge Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#f59e0b]/25 to-[#c084fc]/20 border border-[#f59e0b]/50 font-mono text-[10px] font-bold text-[#fcd34d] uppercase tracking-wider">
                  HIGH-DENSITY MICROSTRUCTURE &amp; EXECUTION
                </span>
                <span className="font-mono text-[10px] text-[#c084fc] font-bold">
                  MODE // 02
                </span>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1.5">
                <h2 className="font-mono text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>⚡ PRO // INSTITUTIONAL QUANT TERMINAL</span>
                </h2>
                <p className="font-sans text-[13px] text-[#94a3b8] leading-relaxed">
                  Unfiltered quantitative telemetry, raw orderbook depth vectors, Deribit GEX
                  strikes, and walk-forward strategy backtests at maximum density.
                </p>
              </div>

              {/* 4 Feature Highlights */}
              <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
                {proFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#0b101b]/85 border border-white/[0.07]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center text-[#fcd34d] shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[17px]">{feat.icon}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-sans text-[13px] font-bold text-white">
                        {feat.title}
                      </span>
                      <span className="font-sans text-[12px] text-[#cbd5e1] leading-relaxed">
                        {feat.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectMode('pro', rememberSession);
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#f59e0b]/25 via-[#f59e0b]/15 to-[#c084fc]/25 hover:from-[#f59e0b]/35 hover:to-[#c084fc]/35 border border-[#f59e0b]/60 text-[#fcd34d] font-mono text-[12px] sm:text-[13px] font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(245,158,11,0.22)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>[ INITIALIZE PRO QUANT WORKSTATION → ]</span>
            </button>
          </motion.div>
        </div>

        {/* Bottom Session Toggle & Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl w-full px-4 py-3 rounded-xl bg-[#090d16]/85 border border-white/10 font-mono text-[11px] text-[#94a3b8]">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(e) => setRememberSession(e.target.checked)}
              className="w-4 h-4 accent-[#00f0ff] rounded cursor-pointer"
            />
            <span className="text-[#e1e2eb]">Remember my operator mode for this session</span>
          </label>
          <span className="text-[10.5px] text-[#849495]">
            💡 You can switch between <strong className="text-[#00f0ff]">🎓 ROOKIE</strong> and{' '}
            <strong className="text-[#4edea3]">⚡ PRO</strong> anytime in the top terminal header.
          </span>
        </div>
      </main>
    </div>
  );
};
