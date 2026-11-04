import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  PairItem,
  KlineData,
  VolumeProfile,
  OrderBlock,
  DeribitOptionsData,
  LiquidityLevels,
  TelemetryMetrics,
  ConfluenceOverview,
  AMDPhaseResult,
  CandlestickAnalysisResult,
  MovingAverageAnalysisResult,
  SharpeSortinoMetrics,
} from '../types';
import { calculateStrategyConfidence, calculateRVOL } from '../utils/quantEngine';
import {
  calculateGannAndCyclesTelemetry,
  evaluateFamousStrategies,
  FamousStrategyEvaluation,
} from '../utils/famousStrategiesEngine';
import { StageId } from './StrategyTabs';

interface AssetBriefingScreenProps {
  activePair: PairItem;
  klines: KlineData[];
  isInitialLoading: boolean;
  isStreaming: boolean;
  selectedTf: string;
  onSelectTf: (tf: string) => void;
  experienceMode: 'rookie' | 'pro';
  onToggleExperienceMode: (mode: 'rookie' | 'pro') => void;
  volumeProfile: VolumeProfile;
  bullOB: OrderBlock | null;
  bearOB: OrderBlock | null;
  optionsData: DeribitOptionsData;
  liquidity: LiquidityLevels;
  telemetry: TelemetryMetrics;
  confluence: ConfluenceOverview;
  amdPhase: AMDPhaseResult;
  candlestickResult: CandlestickAnalysisResult;
  maResult: MovingAverageAnalysisResult;
  sharpeSortino: SharpeSortinoMetrics;
  onChangeAsset: () => void;
  onEnterWorkstation: () => void;
  onOpenStageInTerminal: (stageId: StageId) => void;
  onLaunchWithSetup: (entry: number, stop: number, tp1: number, tp2: number) => void;
  onOpenPlaybooksInTerminal: () => void;
}

export const AssetBriefingScreen: React.FC<AssetBriefingScreenProps> = ({
  activePair,
  klines,
  isInitialLoading,
  isStreaming,
  selectedTf,
  onSelectTf,
  experienceMode,
  onToggleExperienceMode,
  volumeProfile,
  bullOB,
  bearOB,
  optionsData,
  liquidity,
  telemetry,
  confluence,
  amdPhase,
  candlestickResult,
  maResult,
  sharpeSortino,
  onChangeAsset,
  onEnterWorkstation,
  onOpenStageInTerminal,
  onLaunchWithSetup,
  onOpenPlaybooksInTerminal,
}) => {
  const currentPrice = activePair.price;
  const symbol = activePair.symbol;

  const formatP = (p?: number) => {
    if (!p || !Number.isFinite(p)) return '0.00';
    if (p < 0.001) return p.toFixed(7);
    if (p < 0.1) return p.toFixed(5);
    if (p < 10) return p.toFixed(4);
    if (p < 1000) return p.toFixed(2);
    return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const pctDist = (target?: number) => {
    if (!target || !currentPrice || currentPrice <= 0) return '0.00%';
    const diff = ((target - currentPrice) / currentPrice) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
  };

  // Gann & Lunar Telemetry
  const gannCycles = useMemo(
    () =>
      calculateGannAndCyclesTelemetry(
        currentPrice,
        volumeProfile.poc || currentPrice,
        Date.now(),
        klines
      ),
    [currentPrice, volumeProfile.poc, klines]
  );

  // 14 Strategy Playbooks & Top 3 Podium
  const famousStrategies = useMemo<FamousStrategyEvaluation[]>(
    () =>
      evaluateFamousStrategies({
        symbol,
        currentPrice,
        klines,
        volumeProfile,
        bullOB,
        bearOB,
        optionsData,
        liquidity,
        telemetry,
        candlestickResult,
        maResult,
        amdPhase,
        confluence,
        sharpeSortino,
      }),
    [
      symbol,
      currentPrice,
      klines,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      telemetry,
      candlestickResult,
      maResult,
      amdPhase,
      confluence,
      sharpeSortino,
    ]
  );

  const top3Strategies = useMemo(() => {
    const strictPool = famousStrategies.filter(
      (s) =>
        s.possibilityScore >= 50 &&
        s.status !== 'WRONG_REGIME' &&
        s.backtest250Bars.avgRealizedR >= 0
    );
    const regimePool = famousStrategies.filter(
      (s) => s.possibilityScore >= 50 && s.status !== 'WRONG_REGIME'
    );
    const pool =
      strictPool.length >= 3
        ? strictPool
        : regimePool.length >= 3
        ? regimePool
        : famousStrategies;
    return [...pool].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 3);
  }, [famousStrategies]);

  // 5-Stage Funnel Scores
  const stagePipeline = useMemo(() => {
    const l1 = calculateStrategyConfidence(
      1,
      currentPrice,
      klines,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      candlestickResult,
      maResult,
      amdPhase,
      telemetry,
      confluence,
      sharpeSortino
    );
    const l2 = calculateStrategyConfidence(
      2,
      currentPrice,
      klines,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      candlestickResult,
      maResult,
      amdPhase,
      telemetry,
      confluence,
      sharpeSortino
    );
    const l3 = calculateStrategyConfidence(
      3,
      currentPrice,
      klines,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      candlestickResult,
      maResult,
      amdPhase,
      telemetry,
      confluence,
      sharpeSortino
    );
    const l4 = calculateStrategyConfidence(
      4,
      currentPrice,
      klines,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      candlestickResult,
      maResult,
      amdPhase,
      telemetry,
      confluence,
      sharpeSortino
    );
    const l5 = calculateStrategyConfidence(
      5,
      currentPrice,
      klines,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      candlestickResult,
      maResult,
      amdPhase,
      telemetry,
      confluence,
      sharpeSortino
    );

    const s2Score = Math.round(l3.score * 0.55 + l4.score * 0.45);
    const s4Score = Math.round(l3.score * 0.45 + l4.score * 0.55);

    const buildNode = (
      id: StageId,
      code: string,
      title: string,
      subtitle: string,
      score: number,
      bias: string
    ) => {
      const status: 'PASS' | 'WAIT' | 'CONFLICT' =
        score >= 65 ? 'PASS' : score >= 45 ? 'WAIT' : 'CONFLICT';
      const color = score >= 65 ? '#4edea3' : score >= 45 ? '#f59e0b' : '#ffb4ab';
      return { id, code, title, subtitle, score, bias, status, color };
    };

    return [
      buildNode(1, '01', 'PRICE & S/R', 'Wicks & Structure', l1.score, l1.bias),
      buildNode(2, '02', 'VOLUME & VA', 'POC, VAH/VAL & RVOL', s2Score, l3.bias),
      buildNode(3, '03', 'TREND & MA', 'EMA Stack & Stretch', l2.score, l2.bias),
      buildNode(4, '04', 'ORDERFLOW & SMC', 'OBs, AMD & Spot/Perp', s4Score, l4.bias),
      buildNode(5, '05', 'QUANT & GEX', 'Hurst, ADX & Dealer Γ', l5.score, l5.bias),
    ];
  }, [
    currentPrice,
    klines,
    volumeProfile,
    bullOB,
    bearOB,
    optionsData,
    liquidity,
    candlestickResult,
    maResult,
    amdPhase,
    telemetry,
    confluence,
    sharpeSortino,
  ]);

  const hurst = candlestickResult.marketRegime?.hurstExponent ?? 0.5;
  const adx = candlestickResult.marketRegime?.adx14 ?? 21;
  const rvols = useMemo(() => calculateRVOL(klines), [klines]);
  const sessionRvol = telemetry.sessionRvol || rvols[rvols.length - 1] || 1.0;
  const zeroGamma = optionsData.zeroGammaLevel || optionsData.maxPain;
  const spotDelta = telemetry.spotPerpDivergence?.spotDeltaPct ?? 0;
  const perpDelta = telemetry.spotPerpDivergence?.perpDeltaPct ?? 0;
  const basisBps = telemetry.spotPerpDivergence?.basisBps ?? 0;

  const isDiscount = currentPrice < volumeProfile.val;
  const isPremium = currentPrice > volumeProfile.vah;
  const vaLocationText = isDiscount
    ? 'in Discount below Value Area Low (VAL)'
    : isPremium
    ? 'in Premium above Value Area High (VAH)'
    : 'inside the 70% Fair Value Area';

  const radialScore = Math.max(5, Math.min(99, confluence.score || 68));
  const radialColor =
    radialScore >= 65 ? '#4edea3' : radialScore <= 38 ? '#ffb4ab' : '#00f0ff';
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (radialScore / 100) * circumference;

  return (
    <div className="relative min-h-screen w-full bg-[#05070c] hud-grid-bg text-[#e1e2eb] flex flex-col overflow-x-hidden select-none pb-16">
      {/* Ambient Radial Glows */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.12),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(78,222,163,0.08),transparent_55%)]" />

      {/* ===================================================================== */}
      {/* TOP COMMAND HEADER BAR                                                */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#070a12]/92 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.65)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Change Asset + Operator Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onChangeAsset}
              className="px-3 py-2 rounded-xl bg-[#101624] hover:bg-[#161f33] border border-white/15 hover:border-[#00f0ff]/50 font-mono text-[11px] font-bold text-[#e1e2eb] hover:text-[#00f0ff] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>← CHANGE ASSET</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onToggleExperienceMode(experienceMode === 'rookie' ? 'pro' : 'rookie')
              }
              className={`px-3 py-2 rounded-xl border font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                experienceMode === 'rookie'
                  ? 'bg-[#00f0ff]/15 border-[#00f0ff]/50 text-[#00f0ff]'
                  : 'bg-[#f59e0b]/15 border-[#f59e0b]/50 text-[#fcd34d]'
              }`}
              title="Click to switch between Rookie Guided Mode and Pro Institutional Mode"
            >
              <span>
                {experienceMode === 'rookie' ? '🎓 MODE: ROOKIE' : '⚡ MODE: PRO'}
              </span>
            </button>
          </div>

          {/* Center: Symbol, Live Price, 24h Change %, Timeframe Pills & Live Pulse */}
          <div className="flex items-center gap-3 flex-wrap tabular-nums">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base sm:text-lg font-extrabold text-white tracking-tight">
                {activePair.symbol}
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-[#00f0ff]">
                ${formatP(currentPrice)}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                  activePair.change24h >= 0
                    ? 'bg-[#4edea3]/12 text-[#4edea3] border-[#4edea3]/40'
                    : 'bg-[#ffb4ab]/12 text-[#ffb4ab] border-[#ffb4ab]/40'
                }`}
              >
                {activePair.change24h >= 0 ? '+' : ''}
                {activePair.change24h.toFixed(2)}%
              </span>
            </div>

            {/* Timeframe Selector Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0b101b] border border-white/10 font-mono text-[10.5px]">
              {(['15m', '1h', '4h', '1d'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onSelectTf(tf)}
                  className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                    selectedTf === tf
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                      : 'text-[#849495] hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/30 font-mono text-[10px] text-[#4edea3] font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isStreaming ? 'bg-[#4edea3] animate-pulse' : 'bg-[#f59e0b]'
                }`}
              />
              {isStreaming ? 'LIVE STREAM' : 'SYNCING'}
            </span>
          </div>

          {/* Right: Primary Launch Button */}
          <button
            type="button"
            onClick={onEnterWorkstation}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff]/25 via-[#00f0ff]/15 to-[#4edea3]/25 hover:from-[#00f0ff]/35 hover:to-[#4edea3]/35 border border-[#00f0ff]/60 text-white font-mono text-[11px] sm:text-[12px] font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(0,240,255,0.25)] transition-all cursor-pointer flex items-center gap-2"
          >
            <span>⚡ ENTER FULL CHART &amp; WORKSTATION →</span>
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* LOADING STATE OR EXECUTIVE QUANT BRIEFING BODY                        */}
      {/* ===================================================================== */}
      {isInitialLoading || klines.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/30 animate-ping" />
            <div className="w-16 h-16 rounded-full border-2 border-[#00f0ff] border-t-transparent animate-spin" />
            <span className="material-symbols-outlined text-[#00f0ff] text-[24px]">radar</span>
          </div>
          <div className="font-mono text-sm sm:text-base font-bold text-[#00f0ff] tracking-wider uppercase max-w-xl">
            SYNCHRONIZING 250-BAR MULTI-TIMEFRAME TELEMETRY, DERIBIT OPTIONS GEX &amp; 14 STRATEGY
            BACKTESTS FOR {activePair.symbol}...
          </div>
          <p className="font-sans text-[13px] text-[#94a3b8] max-w-md">
            Computing Volume Profile bell curve, unmitigated institutional Order Blocks, W.D. Gann
            Square of 9 harmonics, and walk-forward win rates.
          </p>
        </div>
      ) : (
        <main className="relative z-10 max-w-7xl mx-auto w-full px-3 sm:px-6 pt-6 flex flex-col gap-6">
          {/* Mission Briefing Title Strip */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-[#00f0ff]/15 border border-[#00f0ff]/40 font-mono text-[10px] font-bold text-[#00f0ff] uppercase tracking-widest">
                STEP 03 // EXECUTIVE QUANT MISSION BRIEFING
              </span>
              <span className="font-sans text-[13px] text-[#cbd5e1]">
                Review the distilled multi-layer verdict below or jump directly into any stage or
                strategy setup.
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#849495]">
              SAMPLE: 250 BARS ({selectedTf.toUpperCase()}) • GANN/LUNAR/SSRN ACTIVE
            </span>
          </div>

          {/* ================================================================= */}
          {/* ROW 1: HOLOGRAPHIC CORE VERDICT & STATISTICAL WEATHER (3 PANELS)  */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            {/* PANEL 1: Master Confluence & Traffic Light Verdict */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="hud-glass-card cyber-scan-active p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
                  01 // MASTER CONFLUENCE &amp; VERDICT
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-white/15 font-mono text-[10px] font-bold text-[#fcd34d]">
                  AMD: {amdPhase.phase}
                </span>
              </div>

              {/* Radial Gauge + Bias Headline */}
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke={radialColor}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
                    <span
                      className="font-mono text-xl font-extrabold"
                      style={{ color: radialColor }}
                    >
                      {radialScore}%
                    </span>
                    <span className="font-mono text-[8.5px] text-[#849495] uppercase">
                      CONFLUENCE
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span
                    className="font-mono text-sm sm:text-base font-extrabold tracking-tight"
                    style={{ color: radialColor }}
                  >
                    {confluence.bias}
                  </span>
                  <span className="font-mono text-[10.5px] text-[#94a3b8]">
                    Regime: <strong className="text-white">{confluence.regime}</strong>
                  </span>
                  <span className="font-mono text-[10.5px] text-[#94a3b8]">
                    Corridor: <strong className="text-[#00f0ff]">{confluence.corridor}</strong>
                  </span>
                </div>
              </div>

              {/* Rookie vs Pro Executive Summary Paragraph */}
              <div className="rounded-xl bg-[#0b101b]/90 border border-white/[0.08] p-3.5">
                <div className="font-mono text-[10px] font-bold text-[#00f0ff] uppercase mb-1">
                  {experienceMode === 'rookie'
                    ? '🎓 ROOKIE PLAIN-ENGLISH TAKEAWAY:'
                    : '⚡ PRO INSTITUTIONAL SYNTHESIS:'}
                </div>
                {experienceMode === 'rookie' ? (
                  <p className="font-sans text-[13px] text-[#cbd5e1] leading-relaxed">
                    {symbol} is currently trading <strong>{vaLocationText}</strong> with the Fair
                    Value magnet (POC) at <strong>${formatP(volumeProfile.poc)}</strong>. Orderflow
                    shows{' '}
                    <strong>
                      {telemetry.cvdDelta >= 0
                        ? 'net buyer absorption (+CVD)'
                        : 'net seller pressure (-CVD)'}
                    </strong>{' '}
                    and Session RVOL at <strong>{sessionRvol.toFixed(2)}x</strong>.{' '}
                    {radialScore >= 65
                      ? 'Multi-stage alignment favors stalking a structured pullback entry.'
                      : 'Wait for price to test a key Value Area or Order Block boundary before committing risk.'}
                  </p>
                ) : (
                  <p className="font-sans text-[13px] text-[#cbd5e1] leading-relaxed">
                    Regime prints Hurst <strong>H={hurst.toFixed(2)}</strong> &amp; ADX{' '}
                    <strong>{adx.toFixed(1)}</strong> with Sharpe{' '}
                    <strong>{sharpeSortino.sharpeRatio.toFixed(2)}</strong>. Perp-Spot basis sits
                    at <strong>{basisBps >= 0 ? '+' : ''}{basisBps.toFixed(1)} bps</strong> (Spot{' '}
                    {spotDelta >= 0 ? '+' : ''}
                    {spotDelta.toFixed(1)}% vs Perp {perpDelta >= 0 ? '+' : ''}
                    {perpDelta.toFixed(1)}%). Dealer Net GEX is{' '}
                    <strong>
                      {telemetry.netGex >= 0 ? '+' : ''}${telemetry.netGex}M
                    </strong>{' '}
                    around the <strong>${formatP(zeroGamma)}</strong> Zero-Gamma flip.
                  </p>
                )}
              </div>
            </motion.div>

            {/* PANEL 2: Statistical Regime & Microstructure Pulse */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="hud-glass-card p-5 flex flex-col justify-between gap-4 tabular-nums"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
                  02 // STATISTICAL REGIME &amp; MICROSTRUCTURE
                </span>
                <span className="font-mono text-[10px] text-[#4edea3] font-bold">
                  SHARPE {sharpeSortino.sharpeRatio.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {/* Cell 1: Hurst & ADX */}
                <div className="rounded-xl bg-[#0b101b]/90 border border-white/[0.08] p-3.5 flex flex-col justify-between">
                  <span className="font-mono text-[10px] text-[#849495] uppercase">
                    HURST (H) &amp; ADX(14)
                  </span>
                  <div className="font-mono text-[16px] font-bold text-white mt-1">
                    {hurst.toFixed(2)} <span className="text-[#849495]">/</span> {adx.toFixed(1)}
                  </div>
                  <span
                    className={`font-mono text-[10px] font-bold mt-1 ${
                      hurst > 0.55 || adx >= 25 ? 'text-[#fcd34d]' : 'text-[#4edea3]'
                    }`}
                  >
                    {hurst > 0.55 || adx >= 25 ? 'TRENDING EXPANSION' : 'MEAN-REVERTING RANGE'}
                  </span>
                </div>

                {/* Cell 2: 50-VWMA Z-Score & Stretch */}
                <div className="rounded-xl bg-[#0b101b]/90 border border-white/[0.08] p-3.5 flex flex-col justify-between">
                  <span className="font-mono text-[10px] text-[#849495] uppercase">
                    50-VWMA Z-SCORE &amp; STRETCH
                  </span>
                  <div className="font-mono text-[16px] font-bold text-[#00f0ff] mt-1">
                    {telemetry.zScore >= 0 ? '+' : ''}
                    {telemetry.zScore.toFixed(2)}σ{' '}
                    <span className="text-[#849495] text-[13px]">/</span>{' '}
                    {maResult.stretchScoreAtr >= 0 ? '+' : ''}
                    {maResult.stretchScoreAtr.toFixed(2)} ATR
                  </div>
                  <span className="font-mono text-[10px] text-[#cbd5e1] mt-1">
                    {maResult.overextensionStatus} ({maResult.ribbonBias} Stack)
                  </span>
                </div>

                {/* Cell 3: Session RVOL & Flow */}
                <div className="rounded-xl bg-[#0b101b]/90 border border-white/[0.08] p-3.5 flex flex-col justify-between">
                  <span className="font-mono text-[10px] text-[#849495] uppercase">
                    SESSION RVOL &amp; FLOW
                  </span>
                  <div className="font-mono text-[16px] font-bold text-[#4edea3] mt-1">
                    {sessionRvol.toFixed(2)}x{' '}
                    <span className="text-[11px] font-normal text-[#cbd5e1]">
                      ({sessionRvol <= 0.45 ? 'VDU' : sessionRvol >= 2.0 ? 'IGNITION' : 'NORMAL'})
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#cbd5e1] mt-1">
                    Spot {spotDelta >= 0 ? '+' : ''}
                    {spotDelta.toFixed(1)}% • Perp {perpDelta >= 0 ? '+' : ''}
                    {perpDelta.toFixed(1)}%
                  </span>
                </div>

                {/* Cell 4: Options GEX & Funding */}
                <div className="rounded-xl bg-[#0b101b]/90 border border-white/[0.08] p-3.5 flex flex-col justify-between">
                  <span className="font-mono text-[10px] text-[#849495] uppercase">
                    OPTIONS GEX &amp; FUNDING
                  </span>
                  <div className="font-mono text-[15px] font-bold text-[#e9d5ff] mt-1">
                    Net GEX {telemetry.netGex >= 0 ? '+' : ''}${telemetry.netGex}M
                  </div>
                  <span className="font-mono text-[10px] text-[#cbd5e1] mt-1">
                    0-Γ ${formatP(zeroGamma)} • Funding {(telemetry.fundingRate * 100).toFixed(4)}%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* PANEL 3: Structural Map & Gann/Lunar Coordinates */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="hud-glass-card p-5 flex flex-col justify-between gap-3.5 tabular-nums"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
                  03 // STRUCTURAL &amp; GANN/LUNAR COORDINATES
                </span>
                <span className="font-mono text-[10px] text-[#fcd34d] font-bold">
                  {gannCycles.phaseEmoji} {gannCycles.phaseName}
                </span>
              </div>

              {/* 1. 70% Value Area Corridor */}
              <div className="rounded-xl bg-[#0b101b]/90 border border-white/[0.08] p-3 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-bold text-[#00f0ff] uppercase">
                  70% VALUE AREA CORRIDOR
                </span>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] text-[#849495] block">VAH (HIGH)</span>
                    <strong className="text-white">${formatP(volumeProfile.vah)}</strong>
                    <span className="text-[9px] text-[#849495] block">
                      {pctDist(volumeProfile.vah)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#fcd34d] block">POC MAGNET</span>
                    <strong className="text-[#fcd34d]">${formatP(volumeProfile.poc)}</strong>
                    <span className="text-[9px] text-[#849495] block">
                      {pctDist(volumeProfile.poc)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#4edea3] block">VAL (LOW)</span>
                    <strong className="text-[#4edea3]">${formatP(volumeProfile.val)}</strong>
                    <span className="text-[9px] text-[#849495] block">
                      {pctDist(volumeProfile.val)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Unmitigated Order Blocks */}
              <div className="rounded-xl bg-[#0b101b]/90 border border-white/[0.08] p-3 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-bold text-[#4edea3] uppercase">
                  UNMITIGATED ORDER BLOCKS (50% MT)
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] text-[#4edea3] block">BULL OB 50% MT</span>
                    <strong className="text-white">
                      {bullOB ? `$${formatP(bullOB.midpoint)} (${pctDist(bullOB.midpoint)})` : 'None Active'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#ffb4ab] block">BEAR OB 50% MT</span>
                    <strong className="text-white">
                      {bearOB ? `$${formatP(bearOB.midpoint)} (${pctDist(bearOB.midpoint)})` : 'None Active'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Gann Square of 9 & Lunar Cycle */}
              <div className="rounded-xl bg-[#0b101b]/90 border border-white/[0.08] p-3 flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-bold text-[#c084fc] uppercase">
                  GANN SQUARE OF 9 &amp; LUNAR SYNODIC CYCLE
                </span>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] text-[#4edea3] block">-90° SUPPORT</span>
                    <strong className="text-[#4edea3]">
                      ${formatP(gannCycles.sq9Levels.sup90)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#ffb4ab] block">+90° RESIST</span>
                    <strong className="text-[#ffb4ab]">
                      ${formatP(gannCycles.sq9Levels.res90)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#c084fc] block">LUNAR PHASE</span>
                    <strong className="text-[#e9d5ff]">
                      {gannCycles.illuminationPct}% ({gannCycles.lunarAgeDays}d)
                    </strong>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ================================================================= */}
          {/* ROW 2: THE 5-STAGE FUNNEL READINESS STRIP                         */}
          {/* ================================================================= */}
          <div className="hud-glass-card p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
                  📊 5-STAGE PROGRESSIVE FUNNEL READINESS PIPELINE
                </span>
                <span className="font-sans text-[12px] text-[#94a3b8]">
                  Click any stage node to jump directly to that diagnostic layer in the live
                  workstation.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 tabular-nums">
              {stagePipeline.map((node) => (
                <div
                  key={node.id}
                  className="rounded-xl bg-[#0b101b]/90 border border-white/10 p-3.5 flex flex-col justify-between gap-3 hover:border-[#00f0ff]/50 transition-all"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold text-[#00f0ff]">
                        STAGE {node.code}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded font-mono text-[9px] font-bold border"
                        style={{
                          color: node.color,
                          borderColor: `${node.color}55`,
                          backgroundColor: `${node.color}18`,
                        }}
                      >
                        {node.status}
                      </span>
                    </div>

                    <div className="font-mono text-[13px] font-bold text-white mt-0.5">
                      {node.title}
                    </div>
                    <span className="font-sans text-[11px] text-[#849495]">{node.subtitle}</span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-white/[0.07]">
                    <span
                      className="font-mono text-lg font-extrabold"
                      style={{ color: node.color }}
                    >
                      {node.score}%
                    </span>
                    <span className="font-mono text-[10px] text-[#cbd5e1]">{node.bias}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenStageInTerminal(node.id)}
                    className="w-full py-2 px-2.5 rounded-lg bg-[#141c2e] hover:bg-[#00f0ff]/20 border border-white/10 hover:border-[#00f0ff]/50 font-mono text-[10.5px] font-bold text-[#00f0ff] uppercase transition-all cursor-pointer"
                  >
                    [ OPEN STAGE {node.code} → ]
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ================================================================= */}
          {/* ROW 3: TOP 3 BEST AVAILABLE SETUPS & 1-CLICK EXECUTION LAUNCHPAD  */}
          {/* ================================================================= */}
          <div className="hud-glass-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-white/10 pb-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#f59e0b]/20 border border-[#f59e0b]/50 font-mono text-[10px] font-bold text-[#fcd34d] uppercase">
                    🏆 TOP 3 HIGHEST-EDGE PLAYBOOK SETUPS ACTIVE ON {symbol}
                  </span>
                  <span className="font-mono text-[11px] text-[#4edea3] font-bold">
                    250-BAR WALK-FORWARD VERIFIED
                  </span>
                </div>
                <p className="font-sans text-[12.5px] text-[#cbd5e1]">
                  Ranked by composite live rule match + 250-candle historical win rate and R-multiple
                  expectancy.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenPlaybooksInTerminal}
                className="px-3.5 py-2 rounded-xl bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 border border-[#f59e0b]/50 font-mono text-[11px] font-bold text-[#fcd34d] uppercase transition-all cursor-pointer"
              >
                [ 🏆 INSPECT ALL 14 PLAYBOOKS → ]
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 tabular-nums">
              {top3Strategies.map((strat, idx) => {
                const rankBadges = ['#1 PRIMARY EDGE', '#2 RUNNER-UP EDGE', '#3 ALTERNATIVE EDGE'];
                return (
                  <div
                    key={strat.id}
                    className="rounded-xl bg-[#0b101b]/95 border border-white/10 p-4 flex flex-col justify-between gap-4 shadow-xl"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#00f0ff]/15 border border-[#00f0ff]/40 font-mono text-[9.5px] font-bold text-[#00f0ff] uppercase">
                          {rankBadges[idx]} • {strat.era}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold ${
                              strat.direction === 'LONG'
                                ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                                : strat.direction === 'SHORT'
                                ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/40'
                                : 'bg-white/10 text-white border-white/20'
                            }`}
                          >
                            {strat.direction}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#4edea3]/15 border border-[#4edea3]/40 font-mono text-[10px] font-bold text-[#4edea3]">
                            {strat.possibilityScore}% MATCH
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-sans text-[16px] font-bold text-white tracking-tight">
                          {strat.name}
                        </h3>
                        <span className="font-mono text-[10px] text-[#94a3b8]">
                          {strat.authorOrPaper} • Win Rate:{' '}
                          <strong className="text-[#4edea3]">
                            {strat.backtest250Bars.winRatePct}% (N={strat.backtest250Bars.signalsCount}
                            , {strat.backtest250Bars.avgRealizedR}R)
                          </strong>
                        </span>
                      </div>

                      <p className="font-sans text-[12.5px] text-[#cbd5e1] leading-relaxed">
                        {strat.tradePlan.triggerNote}
                      </p>

                      {/* 4-Rule Live Checklist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {strat.rules.map((r, rIdx) => (
                          <div
                            key={rIdx}
                            className={`p-2 rounded-lg border font-mono text-[9.5px] flex flex-col gap-0.5 ${
                              r.passed
                                ? 'bg-[#4edea3]/10 border-[#4edea3]/35 text-[#4edea3]'
                                : 'bg-[#070a12] border-white/[0.07] text-[#849495]'
                            }`}
                          >
                            <span className="font-bold truncate">
                              {r.passed ? '✓' : '○'} {r.label}
                            </span>
                            <span className="text-[9px] text-[#e1e2eb] truncate">
                              {r.liveReading}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Trade Plan Coordinates */}
                      <div className="grid grid-cols-4 gap-1.5 p-2.5 rounded-lg bg-[#070a12] border border-white/10 font-mono text-[10px]">
                        <div>
                          <span className="text-[8px] text-[#849495] block">ENTRY</span>
                          <strong className="text-[#00f0ff]">
                            ${formatP(strat.tradePlan.entryPrice)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[8px] text-[#849495] block">STOP</span>
                          <strong className="text-[#ffb4ab]">
                            ${formatP(strat.tradePlan.stopLoss)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[8px] text-[#849495] block">TP1</span>
                          <strong className="text-[#4edea3]">
                            ${formatP(strat.tradePlan.tp1Price)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[8px] text-[#849495] block">TP2</span>
                          <strong className="text-[#4edea3]">
                            ${formatP(strat.tradePlan.tp2Price)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() =>
                          onLaunchWithSetup(
                            strat.tradePlan.entryPrice,
                            strat.tradePlan.stopLoss,
                            strat.tradePlan.tp1Price,
                            strat.tradePlan.tp2Price
                          )
                        }
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#4edea3]/25 to-[#00f0ff]/20 hover:from-[#4edea3]/35 hover:to-[#00f0ff]/30 border border-[#4edea3]/60 font-mono text-[11px] font-bold text-[#4edea3] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        [ 🎯 LAUNCH TERMINAL &amp; LOAD INTO STAGE 06 SIZER → ]
                      </button>
                      <button
                        type="button"
                        onClick={onOpenPlaybooksInTerminal}
                        className="w-full py-2 px-3 rounded-xl bg-[#141821] hover:bg-[#1c2230] border border-white/10 font-mono text-[10.5px] font-semibold text-[#fcd34d] uppercase transition-all cursor-pointer"
                      >
                        [ 🏆 INSPECT ALL 14 PLAYBOOKS → ]
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
