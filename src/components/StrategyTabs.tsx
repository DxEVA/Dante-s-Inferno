import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KlineData,
  VolumeProfile,
  OrderBlock,
  DeribitOptionsData,
  LiquidityLevels,
  TelemetryMetrics,
  MTFMatrixRow,
  ConfluenceOverview,
  SpeculationBrief as SpeculationBriefType,
  ExecutionCalculation,
  AMDPhaseResult,
  CandlestickAnalysisResult,
  MovingAverageAnalysisResult,
  PotentialSetupSpeculation,
  StrategyConfidence,
  SharpeSortinoMetrics,
} from '../types';
import { calculateStrategyConfidence, calculateRVOL } from '../utils/quantEngine';
import { TelemetryCards } from './TelemetryCards';
import { AMDPhaseEngine } from './AMDPhaseEngine';
import { ConfluenceMatrix } from './ConfluenceMatrix';
import { SpeculationBrief } from './SpeculationBrief';
import { ExecutionHelper } from './ExecutionHelper';
import { InfoTooltip } from './InfoTooltip';
import { PreFlightChecklist, PaperTradeEntry } from './PreFlightChecklist';
import { ReverseAcademyDeck } from './ReverseAcademyDeck';
import { loadAcademyProgress, AcademyProgressState } from '../utils/reverseAcademyEngine';
import { AsciiOrderflowBar, AsciiWaveSparkline, ScrambleValue } from './AsciiTelemetry';
import { getRookieMentorGuide } from '../utils/metricBenchmarks';

export type TacticalDeckMode = 'LENSES' | 'MTF_RADAR' | 'PREFLIGHT_SIZER' | 'REVERSE_ACADEMY';
type LensSubView = 'DIAGNOSTICS' | 'SETUP';

interface StrategyTabsProps {
  currentPrice: number;
  baseAsset: string;
  activeSymbol?: string;
  klines: KlineData[];
  volumeProfile: VolumeProfile;
  bullOB: OrderBlock | null;
  bearOB: OrderBlock | null;
  optionsData: DeribitOptionsData;
  liquidity?: LiquidityLevels;
  telemetry: TelemetryMetrics;
  matrix: MTFMatrixRow[];
  confluence: ConfluenceOverview;
  amdPhase: AMDPhaseResult;
  brief: SpeculationBriefType;
  isBriefLoading: boolean;
  onRunQuant: () => void;
  calcResult: ExecutionCalculation;
  onRiskChange: (val: number) => void;
  onEntryChange: (val: number) => void;
  onStopChange: (val: number) => void;
  onCopyText: (text: string, label: string) => void;
  onLoadSetup: (entry: number, stop: number, tp1: number, tp2: number) => void;
  candlestickResult: CandlestickAnalysisResult;
  maResult: MovingAverageAnalysisResult;
  lensSetups: Record<number, PotentialSetupSpeculation>;
  sharpeSortino?: SharpeSortinoMetrics;
  timeframe?: string;
  experienceMode?: 'rookie' | 'pro';
  paperTrades?: PaperTradeEntry[];
  onAddPaperTrade?: (trade: PaperTradeEntry) => void;
  onRemovePaperTrade?: (id: string) => void;
  activeTab?: 1 | 2 | 3 | 4 | 5;
  onTabChange?: (tab: 1 | 2 | 3 | 4 | 5) => void;
  externalDeckRequest?: { deck: TacticalDeckMode; ts: number } | null;
  onNavigateMobilePage?: (page: 'CHART' | 'RADAR' | 'LENSES' | 'EXECUTE' | 'ACADEMY') => void;
  onHoverLevel?: (level: { label: string; price: number } | null) => void;
  highlightedLevel?: { label: string; price: number } | null;
}

export const StrategyTabs: React.FC<StrategyTabsProps> = ({
  currentPrice,
  baseAsset,
  activeSymbol,
  klines,
  volumeProfile,
  bullOB,
  bearOB,
  optionsData,
  liquidity,
  telemetry,
  matrix,
  confluence,
  amdPhase,
  brief,
  isBriefLoading,
  onRunQuant,
  calcResult,
  onRiskChange,
  onEntryChange,
  onStopChange,
  onCopyText,
  onLoadSetup,
  candlestickResult,
  maResult,
  lensSetups,
  sharpeSortino,
  experienceMode = 'rookie',
  paperTrades = [],
  onAddPaperTrade = () => {},
  onRemovePaperTrade = () => {},
  activeTab: controlledActiveTab,
  onTabChange,
  externalDeckRequest,
  onNavigateMobilePage,
  onHoverLevel,
  highlightedLevel,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<1 | 2 | 3 | 4 | 5>(1);
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const [activeDeck, setActiveDeck] = useState<TacticalDeckMode>('LENSES');
  const [lensSubView, setLensSubView] = useState<LensSubView>('DIAGNOSTICS');
  const [filterOnlyKeyLevels, setFilterOnlyKeyLevels] = useState<boolean>(false);
  const [academyProgress, setAcademyProgress] = useState<AcademyProgressState>(() =>
    loadAcademyProgress()
  );
  const [learnDrawers, setLearnDrawers] = useState<Record<string, boolean>>({});

  const isLearnOpen = (key: string) =>
    key in learnDrawers ? learnDrawers[key] : experienceMode === 'rookie';

  const toggleLearnDrawer = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    const cur = isLearnOpen(key);
    setLearnDrawers((prev) => ({ ...prev, [key]: !cur }));
  };

  const isPriceTracked = (price?: number) =>
    Boolean(
      highlightedLevel &&
        price &&
        price > 0 &&
        Math.abs(highlightedLevel.price - price) / price < 0.0002
    );

  const toggleTrackPrice = (e: React.MouseEvent | null, label: string, price?: number) => {
    if (e) e.stopPropagation();
    if (!onHoverLevel || !price || price <= 0) return;
    if (isPriceTracked(price)) {
      onHoverLevel(null);
    } else {
      onHoverLevel({ label, price });
    }
  };

  const renderInlineLearnDrawer = (metricKey: string, uniqueId: string) => {
    const open = isLearnOpen(uniqueId);
    const mentor = getRookieMentorGuide(metricKey, symbol);
    const primaryResource = mentor.resources[0];
    const videoResource = mentor.resources.find((r) => r.type === 'VIDEO') || mentor.resources[1];

    return (
      <div className="flex flex-col gap-1.5 pt-1.5 mt-1 border-t border-[#1e2636] text-left">
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono text-[8px] text-[#849495] uppercase">BENCHMARK &amp; GUIDE</span>
          <button
            type="button"
            onClick={(e) => toggleLearnDrawer(e, uniqueId)}
            className={`px-1.5 py-0.5 font-mono text-[8px] uppercase font-bold border transition-colors cursor-pointer ${
              open
                ? 'bg-[#00f0ff]/15 border-[#00f0ff]/50 text-[#00f0ff]'
                : 'bg-[#0b0e14] hover:bg-[#141821] border-[#1e2636] text-[#b9cacb] hover:text-[#00f0ff]'
            }`}
          >
            🎓 STD NORM &amp; DECODE {open ? '▴' : '▾'}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="overflow-hidden flex flex-col gap-1 pt-0.5"
            >
              <div className="p-1.5 bg-[#06080d] border border-[#1e2636] font-mono text-[8.5px] flex flex-col gap-0.5">
                <div className="text-[#00f0ff] truncate">
                  <strong>STD NORM:</strong> {mentor.standardRangeGuide.normal}
                </div>
                <div className="text-[#4edea3] truncate">
                  <strong>HIGH EXT:</strong> {mentor.standardRangeGuide.tooHigh}
                </div>
                <div className="text-[#ffb4ab] truncate">
                  <strong>LOW EXT:</strong> {mentor.standardRangeGuide.tooLow}
                </div>
              </div>
              <p className="font-sans text-[9.5px] text-[#b9cacb] leading-snug">
                <strong className="text-[#fcd34d] font-mono">🔗 Analogy:</strong> {mentor.familiarBridge}
              </p>
              <p className="font-sans text-[9px] text-[#dbfcff] bg-[#0b0e14] px-1.5 py-1 border-l-2 border-l-[#00f0ff] leading-snug">
                <strong className="text-[#4edea3] font-mono">✓ DO:</strong> {mentor.rookieActionRule.doThis}{' '}
                <strong className="text-[#ffb4ab] font-mono">• ✕ AVOID:</strong> {mentor.rookieActionRule.avoidTrap}
              </p>
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {primaryResource && (
                  <a
                    href={primaryResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-1.5 py-0.5 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/30 font-mono text-[8px] font-bold"
                  >
                    📖 READ GUIDE ↗
                  </a>
                )}
                {videoResource && (
                  <a
                    href={videoResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-1.5 py-0.5 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/25 text-[#fcd34d] border border-[#f59e0b]/30 font-mono text-[8px] font-bold"
                  >
                    ▶ WATCH VIDEO ↗
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  useEffect(() => {
    if (externalDeckRequest?.deck) {
      setActiveDeck(externalDeckRequest.deck);
    }
  }, [externalDeckRequest]);

  const handleTabSelect = (tabId: 1 | 2 | 3 | 4 | 5) => {
    setInternalActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const symbol = activeSymbol || (baseAsset ? `${baseAsset}USDT` : 'BTCUSDT');

  const TABS: { id: 1 | 2 | 3 | 4 | 5; label: string; icon: string; name: string; code: string }[] = [
    { id: 1, label: '1. CANDLES & PA', icon: '🕯️', name: 'CANDLESTICK & PRICE ACTION', code: 'MOD_01' },
    { id: 2, label: '2. MA & TREND', icon: '📈', name: 'MOVING AVERAGE & DYNAMIC TREND', code: 'MOD_02' },
    { id: 3, label: '3. SMC, VP & AMD', icon: '🏛️', name: 'SMC, VOLUME PROFILE & AMD PHASE', code: 'MOD_03' },
    { id: 4, label: '4. ORDERFLOW & VDU', icon: '🫧', name: 'ORDERFLOW & VOLUME ANOMALY', code: 'MOD_04' },
    { id: 5, label: '5. QUANT & OPTIONS', icon: '🧮', name: 'QUANTITATIVE & OPTIONS DERIVATIVES', code: 'MOD_05' },
  ];

  const currentSetup = lensSetups[activeTab] || lensSetups[1];

  const confidences = useMemo<Record<number, StrategyConfidence>>(
    () => ({
      1: calculateStrategyConfidence(1, currentPrice, klines, volumeProfile, bullOB, bearOB, optionsData, liquidity, candlestickResult, maResult, amdPhase, telemetry, confluence, sharpeSortino),
      2: calculateStrategyConfidence(2, currentPrice, klines, volumeProfile, bullOB, bearOB, optionsData, liquidity, candlestickResult, maResult, amdPhase, telemetry, confluence, sharpeSortino),
      3: calculateStrategyConfidence(3, currentPrice, klines, volumeProfile, bullOB, bearOB, optionsData, liquidity, candlestickResult, maResult, amdPhase, telemetry, confluence, sharpeSortino),
      4: calculateStrategyConfidence(4, currentPrice, klines, volumeProfile, bullOB, bearOB, optionsData, liquidity, candlestickResult, maResult, amdPhase, telemetry, confluence, sharpeSortino),
      5: calculateStrategyConfidence(5, currentPrice, klines, volumeProfile, bullOB, bearOB, optionsData, liquidity, candlestickResult, maResult, amdPhase, telemetry, confluence, sharpeSortino),
    }),
    [currentPrice, klines, volumeProfile, bullOB, bearOB, optionsData, liquidity, candlestickResult, maResult, amdPhase, telemetry, confluence, sharpeSortino]
  );

  // Live 5-Point Pre-Flight Score for Deck 3 Header Badge
  const preFlightSummary = useMemo(() => {
    const isLong = calcResult.entryPrice >= calcResult.stopLoss;
    const refPrice = currentPrice || calcResult.entryPrice;

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

    let minDistPct = 99;
    for (const c of structuralCandidates) {
      if (c.price > 0 && refPrice > 0) {
        const d = (Math.abs(refPrice - c.price) / refPrice) * 100;
        if (d < minDistPct) minDistPct = d;
      }
    }
    const passLocation = minDistPct <= 1.2;

    const rvols = calculateRVOL(klines);
    const lastRvol = telemetry.sessionRvol || rvols[rvols.length - 1] || 1.0;
    const recentVdu = rvols.slice(-4).some((r) => r <= 0.55);
    const hasAbsorption =
      telemetry.divergenceBias.toLowerCase().includes('absorption') ||
      telemetry.divergenceBias.toLowerCase().includes('squeeze') ||
      (isLong && telemetry.cvdDelta > 0) ||
      (!isLong && telemetry.cvdDelta < 0);
    const passOrderflow = lastRvol <= 0.55 || lastRvol >= 1.15 || recentVdu || hasAbsorption;

    const sharpe = sharpeSortino?.sharpeRatio ?? 1.0;
    const absSharpe = Math.abs(sharpe);
    const passSharpe =
      (isLong && sharpe >= 0.35) ||
      (!isLong && sharpe <= -0.35) ||
      (absSharpe < 0.5 && passLocation);

    const entry = calcResult.entryPrice || refPrice;
    const tp1 = calcResult.target1Price;
    const callWall = optionsData.callWall || 0;
    const putWall = optionsData.putWall || 0;
    const srHigh = liquidity?.srHigh || 0;
    const srLow = liquidity?.srLow || 0;

    const isBarrierBlocking = (barrierPrice: number) => {
      if (!barrierPrice || barrierPrice <= 0 || !entry || !tp1) return false;
      if (isLong) {
        return barrierPrice > entry * 1.001 && barrierPrice < tp1 * 0.999;
      } else {
        return barrierPrice < entry * 0.999 && barrierPrice > tp1 * 1.001;
      }
    };

    const pathClear = isLong
      ? !isBarrierBlocking(callWall) && !isBarrierBlocking(srHigh)
      : !isBarrierBlocking(putWall) && !isBarrierBlocking(srLow);

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

    const passedCount = [passLocation, passOrderflow, passSharpe, pathClear, passRRAndMtf].filter(Boolean).length;
    return {
      passedCount,
      isReady: passedCount >= 4,
    };
  }, [calcResult, currentPrice, volumeProfile, bullOB, bearOB, liquidity, optionsData, klines, telemetry, sharpeSortino, matrix]);

  const formatP = (p: number) => {
    if (!p) return '0';
    if (p < 0.001) return p.toFixed(7);
    if (p < 0.1) return p.toFixed(5);
    if (p < 10) return p.toFixed(4);
    if (p < 1000) return p.toFixed(2);
    return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  // Universal Speculative Confidence HUD Header rendered at the top of Deck 1
  const renderConfidenceMeterCard = (confidence: StrategyConfidence, tabName: string, tabId: number) => {
    const score = Math.max(0, Math.min(100, confidence.score));
    const isHigh = score >= 70;
    const isMid = score >= 45 && score < 70;
    const color = isHigh ? '#4edea3' : isMid ? '#f59e0b' : '#ffb4ab';
    const strokeColor = isHigh
      ? 'rgba(78, 222, 163, 0.95)'
      : isMid
      ? 'rgba(245, 158, 11, 0.95)'
      : 'rgba(255, 180, 171, 0.95)';
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const leftBorderClass =
      confidence.bias === 'BULLISH'
        ? 'border-l-[#4edea3]'
        : confidence.bias === 'BEARISH'
        ? 'border-l-[#f43f5e]'
        : 'border-l-[#00f0ff]';

    const getPlainEnglishTakeaway = () => {
      const setup = lensSetups[tabId] || currentSetup;
      if (tabId === 1) {
        const patName = candlestickResult.primaryPattern?.name || 'neutral price action';
        const lvlName = candlestickResult.anatomy?.nearestSrName || 'POC';
        return `Price just printed ${patName} near ${lvlName} ($${formatP(setup.reactionZoneLow)}–$${formatP(setup.reactionZoneHigh)}). ${
          score >= 70
            ? 'Candlestick buyers/sellers are showing strong conviction at this level—watch the trigger rule before acting.'
            : 'Candles are still forming mid-range; wait for a clean rejection wick at the Key Reaction Zone.'
        }`;
      }
      if (tabId === 2) {
        return `${symbol} moving averages show ${maResult.ribbonAlignment} with a Rolling Sharpe of ${(sharpeSortino?.sharpeRatio ?? 1.15).toFixed(2)}. ${
          Math.abs(maResult.stretchScoreAtr) >= 2.2
            ? 'Price is stretched far away from its 21 EMA—do not chase here; wait for a pullback to the moving average.'
            : 'Price is tracking smoothly along its trend averages—ideal for pullback entries near the 21 EMA.'
        }`;
      }
      if (tabId === 3) {
        const obZone = bullOB ? `$${formatP(bullOB.low)}–$${formatP(bullOB.high)}` : `$${formatP(volumeProfile.val)}`;
        return `${symbol} is in the ${amdPhase.phase} stage of the institutional cycle. Big buyers previously stepped in around ${obZone}, while highest volume fair value (POC) sits at $${formatP(volumeProfile.poc)}.`;
      }
      if (tabId === 4) {
        return `Orderflow tracks real-time market buying vs. passive limit walls. ${
          telemetry.cvdDelta >= 0
            ? `Buyers are net positive (+${Math.round(telemetry.cvdDelta)} CVD) above the $${formatP(liquidity?.bidLiquidityPrice || volumeProfile.val)} bid wall.`
            : `Sellers are pressing the tape (${Math.round(telemetry.cvdDelta)} CVD); watch for cyan VDU bars (RVOL < 0.45x) signaling seller exhaustion.`
        }`;
      }
      return `Options dealers hold ${telemetry.netGex >= 0 ? '+' : ''}$${telemetry.netGex}M Net GEX with Max Pain at $${formatP(optionsData.maxPain)}. ${
        telemetry.netGex >= 0
          ? 'Positive dealer gamma acts like shock absorbers, pulling price back toward Max Pain and favoring calm range trades.'
          : 'Negative dealer gamma amplifies volatility—expect fast momentum moves once key strikes break.'
      }`;
    };

    return (
      <div className="flex flex-col gap-2">
        <div
          className={`cyber-panel cyber-scan-active flex flex-col gap-3 border-l-2 ${leftBorderClass} p-3`}
        >
          {/* Top Row: Circular SVG Gauge + Headline & Bias */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  fill="transparent"
                  stroke="#1e2433"
                  strokeWidth="7"
                />
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  fill="transparent"
                  stroke={strokeColor}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="square"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center tabular-nums">
                <span className="font-mono text-[19px] font-bold tracking-tight" style={{ color }}>
                  <ScrambleValue text={`${score}%`} />
                </span>
                <span className="font-mono text-[7px] uppercase tracking-wider text-[#849495]">BAYESIAN</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#0b0e14] text-[#00f0ff] border border-[#1e2433] font-bold">
                    {TABS.find((t) => t.id === tabId)?.code || 'MOD_01'}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-none border ${
                      confidence.bias === 'BULLISH'
                        ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                        : confidence.bias === 'BEARISH'
                        ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                        : 'bg-[#849495]/10 text-[#849495] border-[#849495]/30'
                    }`}
                  >
                    {confidence.bias} BIAS
                  </span>
                  <InfoTooltip
                    content={{
                      title: `${tabName} CONFIDENCE`,
                      symbol,
                      categoryBadge: 'QUANT CONFIDENCE',
                      badgeColor: color,
                      whatItIs:
                        'An objective 4-pillar weighting model dynamically calibrated from orderflow tape aggression, structural auction zones, and volatility regimes.',
                      liveRead: `${symbol} currently prints a ${score}% ${confidence.bias} score across: ${confidence.pillars
                        .map((p) => `${p.label} (${p.score}%)`)
                        .join(', ')}.`,
                      actionability:
                        score >= 70
                          ? `High statistical alignment supporting ${confidence.bias} execution. Prioritize defined reaction zones with tight structural invalidations.`
                          : 'Moderate/neutral confluence; await secondary confirmation or key-level rejection before deploying size.',
                    }}
                    inlineBadgeText={`ⓘ Guide`}
                  />
                </div>
              </div>
              <h3 className="font-mono text-[13px] font-bold text-[#e1e2eb] leading-snug">
                {confidence.headline}
              </h3>
              {confidence.bayesianBreakdown && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5 font-mono text-[9px] tabular-nums">
                  <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#00f0ff]">
                    Struct: {confidence.bayesianBreakdown.structuralRegime}%
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#4edea3]">
                    Flow: {confidence.bayesianBreakdown.spotPerpFlow}%
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#ddb7ff]">
                    GEX: {confidence.bayesianBreakdown.optionsGamma}%
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#fcd34d]">
                    RVOL: {confidence.bayesianBreakdown.volatilityRvol}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: 4 Sub-Pillar Mechanical Spring Score Bars */}
          <div className="grid grid-cols-2 gap-2 bg-[#0b0e14] p-2.5 border border-[#1e2433] tabular-nums">
            {confidence.pillars.map((pillar, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-[#849495] font-semibold truncate">
                    {pillar.label} <span className="text-[#00f0ff] font-normal">({pillar.weightPct}%)</span>
                  </span>
                  <span className="font-bold text-[#e1e2eb]">{pillar.score}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#191c22] rounded-none overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pillar.score}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    className="h-full"
                    style={{
                      backgroundColor:
                        pillar.score >= 70 ? '#4edea3' : pillar.score >= 45 ? '#f59e0b' : '#ffb4ab',
                    }}
                  />
                </div>
                <span className="font-mono text-[8px] text-[#849495] truncate">{pillar.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conflict / Hard-Gate Warning Banner if active */}
        {confidence.conflictWarning && (
          <div className="px-3 py-1.5 rounded-none bg-[#f59e0b]/10 border border-[#f59e0b]/40 border-l-2 border-l-[#f59e0b] font-mono text-[10px] text-[#fcd34d] flex items-center gap-2">
            <span>{confidence.conflictWarning}</span>
          </div>
        )}

        {/* Rookie Plain-English Takeaway Banner */}
        {experienceMode === 'rookie' && (
          <div className="px-3 py-2 rounded-none bg-[#141821] border border-[#00f0ff]/35 border-l-2 border-l-[#00f0ff] flex items-start gap-2">
            <span className="text-[14px] shrink-0">🎓</span>
            <p className="font-sans text-[11px] text-[#dbfcff] leading-relaxed">
              <strong className="text-[#00f0ff] font-mono uppercase">Plain-English Takeaway: </strong>
              {getPlainEnglishTakeaway()}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Reusable Potential Setup Speculation Card rendered inside Sub-View B (`[ B // ACTIONABLE SETUP ]`)
  const renderSetupSpeculationCard = (setup: PotentialSetupSpeculation) => {
    const borderAccent =
      setup.bias === 'BULLISH'
        ? 'border-l-[#4edea3]'
        : setup.bias === 'BEARISH'
        ? 'border-l-[#f43f5e]'
        : 'border-l-[#00f0ff]';

    return (
      <div
        className={`flex flex-col bg-[#141820] border border-[#1e2433] border-l-2 ${borderAccent} rounded-none p-3.5 gap-3 relative overflow-hidden`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#1e2433] pb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#0b0e14] text-[#00f0ff] border border-[#1e2433] font-bold">
              EXEC_B
            </span>
            <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">
              {setup.lensTitle}
            </span>
            <span
              className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-none border ${
                setup.bias === 'BULLISH'
                  ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                  : setup.bias === 'BEARISH'
                  ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                  : 'bg-[#849495]/10 text-[#849495] border-[#849495]/30'
              }`}
            >
              {setup.bias} BIAS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <InfoTooltip
              content={{
                title: setup.setupType,
                symbol,
                categoryBadge: 'POTENTIAL SETUP SPECULATION',
                badgeColor: setup.bias === 'BULLISH' ? '#4edea3' : '#ffb4ab',
                whatItIs:
                  'A structured, rule-based execution thesis identifying entry reaction zones, invalidation criteria, and take-profit targets.',
                liveRead: `Thesis for ${symbol}: ${setup.thesis}`,
                actionability: `Trigger Condition: ${setup.triggerCondition} Invalidation: $${formatP(setup.invalidationPrice)}.`,
              }}
              inlineBadgeText={`ⓘ Setup Guide`}
            />
          </div>
        </div>

        {/* Setup Headline & Thesis */}
        <div className="flex flex-col gap-1">
          <h4 className="font-mono text-[14px] font-bold text-[#dbfcff]">{setup.setupType}</h4>
          <p className="font-sans text-[12px] text-[#b9cacb] leading-relaxed">{setup.thesis}</p>
        </div>

        {/* 4 Execution Metric Pillars (Interactive Track on Chart) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 tabular-nums">
          {/* Reaction Zone */}
          <div
            onClick={(e) => toggleTrackPrice(e, `${setup.lensTitle} ENTRY`, setup.suggestedEntry)}
            className={`cyber-panel p-2.5 flex flex-col justify-between cursor-pointer ${
              isPriceTracked(setup.suggestedEntry) ? 'cyber-panel-tracked' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                KEY REACTION ZONE
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[8px] px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#00f0ff]">
                  {isPriceTracked(setup.suggestedEntry) ? '🎯 TRACKING' : '🎯 TRACK'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyText(
                      `$${formatP(setup.reactionZoneLow)} - $${formatP(setup.reactionZoneHigh)}`,
                      'Reaction Zone'
                    );
                  }}
                  className="text-[#849495] hover:text-[#00f0ff] transition-colors cursor-pointer"
                  title="Copy Reaction Zone"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                </button>
              </div>
            </div>
            <div className="font-mono text-[13px] font-bold text-[#00f0ff] mt-1">
              ${formatP(setup.reactionZoneLow)} – ${formatP(setup.reactionZoneHigh)}
            </div>
            <span className="font-mono text-[9px] text-[#849495] mt-0.5">
              Midpoint Entry: ${formatP(setup.suggestedEntry)}
            </span>
          </div>

          {/* Trigger Condition */}
          <div className="cyber-panel p-2.5 flex flex-col justify-between">
            <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
              TRIGGER CONFIRMATION
            </span>
            <div className="font-sans text-[11px] font-medium text-[#e1e2eb] mt-1 leading-snug">
              {setup.triggerCondition}
            </div>
            <span className="font-mono text-[9px] text-[#4edea3] mt-0.5">Execution Validation Rule</span>
          </div>

          {/* Invalidation Stop */}
          <div
            onClick={(e) =>
              toggleTrackPrice(e, `${setup.lensTitle} STOP`, setup.invalidationPrice)
            }
            className={`cyber-panel p-2.5 flex flex-col justify-between cursor-pointer ${
              isPriceTracked(setup.invalidationPrice) ? 'cyber-panel-tracked' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                STRUCTURAL STOP ($INVAL)
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[8px] px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#ffb4ab]">
                  {isPriceTracked(setup.invalidationPrice) ? '🎯 TRACKING' : '🎯 TRACK'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyText(`$${formatP(setup.invalidationPrice)}`, 'Invalidation Stop');
                  }}
                  className="text-[#849495] hover:text-[#ffb4ab] transition-colors cursor-pointer"
                  title="Copy Stop Price"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                </button>
              </div>
            </div>
            <div className="font-mono text-[14px] font-bold text-[#ffb4ab] mt-1">
              ${formatP(setup.invalidationPrice)}
            </div>
            <span className="font-mono text-[9px] text-[#849495] mt-0.5">
              Dist: {((Math.abs(currentPrice - setup.invalidationPrice) / currentPrice) * 100).toFixed(2)}%
            </span>
          </div>

          {/* Targets */}
          <div
            onClick={(e) => toggleTrackPrice(e, `${setup.lensTitle} TP1`, setup.target1Price)}
            className={`cyber-panel p-2.5 flex flex-col justify-between cursor-pointer ${
              isPriceTracked(setup.target1Price) ? 'cyber-panel-tracked' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                THEORETICAL TARGETS
              </span>
              <span className="font-mono text-[8px] px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#4edea3]">
                {isPriceTracked(setup.target1Price) ? '🎯 TRACKING' : '🎯 TRACK TP1'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-[12px] font-bold text-[#4edea3]">
                TP1: ${formatP(setup.target1Price)}
              </span>
              <span className="font-mono text-[12px] font-bold text-[#dbfcff]">
                TP2: ${formatP(setup.target2Price)}
              </span>
            </div>
            <span className="font-mono text-[9px] text-[#849495] mt-0.5">POC &amp; Major Liquidity Walls</span>
          </div>
        </div>

        {/* Action Buttons: Load into Sizing Calculator (Auto-Jumps to Deck 3) & 1-Click Log to Paper Journal */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#1e2433]">
          <span className="font-mono text-[8px] text-[#849495] uppercase">
            STRUCTURAL &amp; STATISTICAL ANALYSIS • AUTO-SYNCS WITH SYS.03 SIZER
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const riskPerCoin = Math.abs(setup.suggestedEntry - setup.invalidationPrice);
                const positionCoins =
                  riskPerCoin > 0 ? Math.round((50 / riskPerCoin) * 1000) / 1000 : 0.01;
                onLoadSetup(
                  setup.suggestedEntry,
                  setup.invalidationPrice,
                  setup.target1Price,
                  setup.target2Price
                );
                onAddPaperTrade({
                  id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  symbol,
                  direction: setup.bias === 'BEARISH' ? 'SHORT' : 'LONG',
                  entryPrice: setup.suggestedEntry,
                  stopLoss: setup.invalidationPrice,
                  tp1Price: setup.target1Price,
                  riskUsdt: 50,
                  positionSizeCoins: positionCoins,
                  status: 'OPEN',
                  timestamp: new Date().toISOString(),
                  createdAtMs: Date.now(),
                  strategyLensId: activeTab,
                  strategyLensName: TABS.find((t) => t.id === activeTab)?.name || 'Quant Setup',
                  confidenceScore: confidences[activeTab]?.score || 75,
                  notes: `${setup.setupType} - ${setup.triggerCondition}`,
                } as any);
                setActiveDeck('PREFLIGHT_SIZER');
                onNavigateMobilePage?.('EXECUTE');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-none bg-[#4edea3]/15 hover:bg-[#4edea3]/25 text-[#4edea3] border border-[#4edea3]/40 font-mono text-[10px] font-bold uppercase transition-all cursor-pointer"
              title="Log this setup as an active paper trade and open Pre-Flight Sizer"
            >
              <span className="material-symbols-outlined text-[14px]">history_edu</span>
              <span>LOG PAPER TRADE</span>
            </button>

            <button
              onClick={() => {
                onLoadSetup(
                  setup.suggestedEntry,
                  setup.invalidationPrice,
                  setup.target1Price,
                  setup.target2Price
                );
                setActiveDeck('PREFLIGHT_SIZER');
                onNavigateMobilePage?.('EXECUTE');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-none bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff] font-mono text-[10px] font-bold uppercase transition-all shadow-[0_0_12px_rgba(0,240,255,0.2)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">calculate</span>
              <span>LOAD SETUP INTO CALCULATOR →</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full bg-[#10131a]">
      {/* =========================================================================== */}
      {/* TOP CYBER-BRUTALIST 4-DECK COMMAND SWITCHER BAR (Desktop Only; Mobile uses Bottom Nav) */}
      {/* =========================================================================== */}
      <div className="hidden lg:grid sticky top-0 z-30 bg-[#0b0e14]/95 backdrop-blur-md border-b border-[#1e2433] grid-cols-2 xl:grid-cols-4">
        {/* DECK 1: SYS.01 // STRATEGY LENSES (5) */}
        <button
          type="button"
          onClick={() => setActiveDeck('LENSES')}
          className={`flex items-center justify-between gap-1 px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-wider border-b xl:border-b-0 border-r border-[#1e2433] transition-colors cursor-pointer ${
            activeDeck === 'LENSES'
              ? 'bg-[#141821] text-[#00f0ff] border-l-2 border-l-[#00f0ff] font-bold'
              : 'bg-[#0b0e14] text-[#849495] hover:text-[#e1e2eb] hover:bg-[#10131a]'
          }`}
        >
          <span className="truncate">[ SYS.01 // LENSES (5) ]</span>
          <span
            className={`px-1.5 py-0.5 text-[9px] font-bold border tabular-nums shrink-0 ${
              (confidences[activeTab]?.score ?? 65) >= 70
                ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                : (confidences[activeTab]?.score ?? 65) >= 50
                ? 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40'
                : 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/40'
            }`}
          >
            T{activeTab}: {confidences[activeTab]?.score ?? 65}%
          </span>
        </button>

        {/* DECK 2: SYS.02 // MTF RADAR & AI BRIEF */}
        <button
          type="button"
          onClick={() => setActiveDeck('MTF_RADAR')}
          className={`flex items-center justify-between gap-1 px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-wider border-b xl:border-b-0 xl:border-r border-[#1e2433] transition-colors cursor-pointer ${
            activeDeck === 'MTF_RADAR'
              ? 'bg-[#141821] text-[#00f0ff] border-l-2 border-l-[#00f0ff] font-bold'
              : 'bg-[#0b0e14] text-[#849495] hover:text-[#e1e2eb] hover:bg-[#10131a]'
          }`}
        >
          <span className="truncate">[ SYS.02 // MTF &amp; AI ]</span>
          <span
            className={`px-1.5 py-0.5 text-[9px] font-bold border tabular-nums shrink-0 ${
              confluence.score >= 65
                ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                : confluence.score <= 35
                ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/40'
                : 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40'
            }`}
          >
            {confluence.score}%
          </span>
        </button>

        {/* DECK 3: SYS.03 // PRE-FLIGHT & SIZER */}
        <button
          type="button"
          onClick={() => setActiveDeck('PREFLIGHT_SIZER')}
          className={`flex items-center justify-between gap-1 px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-wider border-r border-[#1e2433] transition-colors cursor-pointer ${
            activeDeck === 'PREFLIGHT_SIZER'
              ? 'bg-[#141821] text-[#00f0ff] border-l-2 border-l-[#00f0ff] font-bold'
              : 'bg-[#0b0e14] text-[#849495] hover:text-[#e1e2eb] hover:bg-[#10131a]'
          }`}
        >
          <span className="truncate">[ SYS.03 // SIZER ]</span>
          <div className="flex items-center gap-1 shrink-0 tabular-nums">
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold border ${
                preFlightSummary.isReady
                  ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                  : preFlightSummary.passedCount >= 3
                  ? 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40'
                  : 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/40'
              }`}
            >
              {preFlightSummary.passedCount}/5 PASS
            </span>
          </div>
        </button>

        {/* DECK 4: SYS.04 // REVERSE ACADEMY */}
        <button
          type="button"
          onClick={() => setActiveDeck('REVERSE_ACADEMY')}
          className={`flex items-center justify-between gap-1 px-2.5 py-2.5 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
            activeDeck === 'REVERSE_ACADEMY'
              ? 'bg-[#141821] text-[#fcd34d] border-l-2 border-l-[#fcd34d] font-bold'
              : 'bg-[#0b0e14] text-[#849495] hover:text-[#e1e2eb] hover:bg-[#10131a]'
          }`}
        >
          <span className="truncate">[ SYS.04 // REVERSE ACADEMY ]</span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold border bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40 tabular-nums shrink-0">
            LVL {Math.max(1, academyProgress.completedLevels.length)}/5 •{' '}
            {Math.round((academyProgress.completedLevels.length / 5) * 100)}%
          </span>
        </button>
      </div>

      {/* =========================================================================== */}
      {/* ACTIVE DECK WORKSPACE BODY WITH MECHANICAL MOTION/REACT TRANSITIONS         */}
      {/* =========================================================================== */}
      <AnimatePresence mode="wait">
        {activeDeck === 'LENSES' && (
          <motion.div
            key="deck-lenses"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="flex flex-col w-full"
          >
            {/* 5-Lens Selector Strip */}
            <div className="flex items-center bg-[#0b0e14] px-2.5 py-2 border-b border-[#1e2433] overflow-x-auto no-scrollbar gap-1.5">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const tabConf = confidences[tab.id]?.score ?? 65;
                const pillClass =
                  tabConf >= 70
                    ? 'bg-[#4edea3]/20 text-[#4edea3] border-[#4edea3]/40'
                    : tabConf >= 50
                    ? 'bg-[#f59e0b]/20 text-[#fcd34d] border-[#f59e0b]/40'
                    : 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/40';

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabSelect(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-none font-mono text-[10px] uppercase font-bold tracking-tight shrink-0 transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-[#141821] border-[#00f0ff] text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                        : 'bg-[#10131a] border-[#1e2433] text-[#849495] hover:text-[#e1e2eb] hover:border-[#3b494b]'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`px-1 py-0.5 rounded-none text-[9px] font-bold border tabular-nums ${pillClass}`}
                    >
                      {tabConf}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Lens Container */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`lens-tab-${activeTab}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="flex flex-col p-3 gap-3"
              >
                {/* 1. Compact Confidence HUD Header */}
                {renderConfidenceMeterCard(
                  confidences[activeTab],
                  TABS.find((t) => t.id === activeTab)?.name || 'STRATEGY LENS',
                  activeTab
                )}

                {/* 2. Internal Sub-View Toggle Bar ([ A // DEEP DIAGNOSTICS ] vs [ B // ACTIONABLE SETUP ]) */}
                <div className="grid grid-cols-2 bg-[#0b0e14] border border-[#1e2433]">
                  <button
                    type="button"
                    onClick={() => setLensSubView('DIAGNOSTICS')}
                    className={`flex items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-wider border-r border-[#1e2433] transition-colors cursor-pointer ${
                      lensSubView === 'DIAGNOSTICS'
                        ? 'bg-[#191c22] text-[#00f0ff] border-b-2 border-b-[#00f0ff] font-bold'
                        : 'text-[#849495] hover:text-[#e1e2eb]'
                    }`}
                  >
                    <span>[ A // DEEP DIAGNOSTICS ]</span>
                    <span className="text-[9px] text-[#849495]">TELEMETRY</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLensSubView('SETUP')}
                    className={`flex items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                      lensSubView === 'SETUP'
                        ? 'bg-[#191c22] text-[#4edea3] border-b-2 border-b-[#4edea3] font-bold'
                        : 'text-[#849495] hover:text-[#e1e2eb]'
                    }`}
                  >
                    <span>[ B // ACTIONABLE SETUP ]</span>
                    <span
                      className={`px-1.5 py-0.5 text-[8px] font-bold border ${
                        currentSetup.bias === 'BULLISH'
                          ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                          : currentSetup.bias === 'BEARISH'
                          ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                          : 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/30'
                      }`}
                    >
                      {currentSetup.bias}
                    </span>
                  </button>
                </div>

                {/* 3. Sub-View Content Body */}
                <AnimatePresence mode="wait">
                  {lensSubView === 'SETUP' ? (
                    <motion.div
                      key={`lens-${activeTab}-setup`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                      className="flex flex-col gap-3"
                    >
                      {renderSetupSpeculationCard(currentSetup)}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`lens-${activeTab}-diagnostics`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                      className="flex flex-col gap-3"
                    >
                      {/* ================================================================= */}
                      {/* TAB 1 DIAGNOSTICS: 🕯️ CANDLES & PRICE ACTION                      */}
                      {/* ================================================================= */}
                      {activeTab === 1 && (
                        <div className="flex flex-col gap-3">
                          {candlestickResult.marketRegime && (
                            <div className="flex flex-col gap-1.5 p-3 rounded-none bg-[#141821] border border-[#1e2433] border-l-2 border-l-[#00f0ff]">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">
                                    🧭 STATISTICAL MARKET REGIME CLASSIFIER (HURST &amp; ADX GATE)
                                  </span>
                                  <span
                                    className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-none border ${
                                      candlestickResult.marketRegime.isBreakoutActive
                                        ? 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40'
                                        : 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                                    }`}
                                  >
                                    {candlestickResult.marketRegime.regimeHeadline}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums">
                                  <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#dbfcff]">
                                    Hurst H: <strong>{candlestickResult.marketRegime.hurstExponent.toFixed(2)}</strong>
                                  </span>
                                  <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#00f0ff]">
                                    ADX(14): <strong>{candlestickResult.marketRegime.adx14.toFixed(1)}</strong>
                                  </span>
                                  <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#b9cacb]">
                                    Vol Pct: <strong>{candlestickResult.marketRegime.volPercentile}th</strong>
                                  </span>
                                </div>
                              </div>
                              {candlestickResult.marketRegime.fadeWarning && (
                                <div className="font-mono text-[10px] text-[#fcd34d] bg-[#f59e0b]/10 px-2.5 py-1.5 border border-[#f59e0b]/30">
                                  {candlestickResult.marketRegime.fadeWarning}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Primary Active Pattern Hero Card */}
                          {candlestickResult.primaryPattern ? (
                            <div className="flex flex-col bg-[#191c22] border border-[#1e2433] rounded-none p-3 gap-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[18px]">🕯️</span>
                                  <div>
                                    <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">
                                      PRIMARY DETECTED PATTERN
                                    </span>
                                    <h4 className="font-mono text-[15px] font-bold text-[#dbfcff]">
                                      {candlestickResult.primaryPattern.name}
                                    </h4>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap tabular-nums">
                                  <InfoTooltip
                                    content={{
                                      title: candlestickResult.primaryPattern.name,
                                      symbol,
                                      categoryBadge: 'PATTERN FORMATION',
                                      badgeColor:
                                        candlestickResult.primaryPattern.bias === 'BULLISH' ? '#4edea3' : '#ffb4ab',
                                      whatItIs: candlestickResult.primaryPattern.description,
                                      liveRead: `${candlestickResult.primaryPattern.name} formed on ${symbol} ${
                                        candlestickResult.primaryPattern.barsAgo === 0
                                          ? 'on the current candle'
                                          : `${candlestickResult.primaryPattern.barsAgo} bars ago`
                                      } at $${formatP(candlestickResult.primaryPattern.price)} with ${candlestickResult.primaryPattern.rvol.toFixed(
                                        1
                                      )}x RVOL (${candlestickResult.primaryPattern.quality}% Quality).`,
                                      actionability:
                                        candlestickResult.primaryPattern.bias === 'BULLISH'
                                          ? `Defend invalidation below pattern low with initial target at nearest overhead resistance ($${formatP(
                                              volumeProfile.poc || currentPrice * 1.01
                                            )}).`
                                          : `Defend invalidation above pattern high with initial target at nearest support.`,
                                    }}
                                    inlineBadgeText={`ⓘ Explainer`}
                                  />
                                  <span
                                    className={`font-mono text-[10px] font-bold px-2 py-0.5 border ${
                                      candlestickResult.primaryPattern.bias === 'BULLISH'
                                        ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                                        : candlestickResult.primaryPattern.bias === 'BEARISH'
                                        ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                                        : 'bg-[#849495]/10 text-[#849495] border-[#849495]/30'
                                    }`}
                                  >
                                    {candlestickResult.primaryPattern.bias}
                                  </span>
                                  <span className="font-mono text-[10px] bg-[#0b0e14] border border-[#1e2433] text-[#b9cacb] px-2 py-0.5">
                                    {candlestickResult.primaryPattern.barsAgo === 0
                                      ? 'Current Candle'
                                      : `${candlestickResult.primaryPattern.barsAgo} Bars Ago`}
                                  </span>
                                  <div className="flex items-center gap-1 bg-[#0b0e14] border border-[#1e2433] px-2 py-0.5 font-mono text-[10px] text-[#e1e2eb]">
                                    <span>Quality:</span>
                                    <span className="text-[#00f0ff] font-bold">
                                      {candlestickResult.primaryPattern.quality}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <p className="font-sans text-[12px] text-[#b9cacb] leading-relaxed">
                                {candlestickResult.primaryPattern.description} Tested key level:{' '}
                                <span className="text-[#00f0ff] font-mono font-semibold">
                                  {candlestickResult.primaryPattern.testedLevelName || 'Dynamic Intraday S/R'}
                                </span>{' '}
                                at RVOL{' '}
                                <span className="text-[#f59e0b] font-mono font-semibold">
                                  {candlestickResult.primaryPattern.rvol.toFixed(2)}x
                                </span>
                                .
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 bg-[#191c22] border border-[#1e2433] rounded-none text-center font-mono text-[12px] text-[#849495]">
                              Scanning candles for institutional formations...
                            </div>
                          )}

                          {/* Candle Anatomy Telemetry Grid (4 Cards) */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
                            <div className="p-2.5 bg-[#191c22] border border-[#1e2433] flex flex-col justify-between">
                              <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                                WICK REJECTION
                              </span>
                              <div className="font-mono text-[15px] font-bold text-[#4edea3] mt-1">
                                {((candlestickResult.anatomy?.wickRejectionRatio || 0.5) * 100).toFixed(0)}%
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                Shadow vs range
                              </span>
                            </div>

                            <div className="p-2.5 bg-[#191c22] border border-[#1e2433] flex flex-col justify-between">
                              <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                                CLOSE LOC (CLV)
                              </span>
                              <div className="font-mono text-[15px] font-bold text-[#dbfcff] mt-1">
                                {(candlestickResult.anatomy?.clvPct || 50).toFixed(0)}%
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                Close within bar
                              </span>
                            </div>

                            <div className="p-2.5 bg-[#191c22] border border-[#1e2433] flex flex-col justify-between">
                              <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                                BODY / ATR
                              </span>
                              <div className="font-mono text-[15px] font-bold text-[#f59e0b] mt-1">
                                {(candlestickResult.anatomy?.bodyToAtrRatio || 0.8).toFixed(2)}x
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                Vs 14-bar ATR
                              </span>
                            </div>

                            <div className="p-2.5 bg-[#191c22] border border-[#1e2433] flex flex-col justify-between">
                              <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                                NEAREST S/R
                              </span>
                              <div className="font-mono text-[12px] font-bold text-[#00f0ff] mt-1 truncate">
                                {candlestickResult.anatomy?.nearestSrName || 'POC'}
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                {(candlestickResult.anatomy?.nearestSrDistancePct || 0.5).toFixed(2)}% away
                              </span>
                            </div>
                          </div>

                          {/* Multi-Bar Pattern Scanner Table (22 Formations) */}
                          {(() => {
                            const visiblePatterns = filterOnlyKeyLevels
                              ? candlestickResult.recentPatterns.filter((p) => p.isAtKeyLevel)
                              : candlestickResult.recentPatterns;

                            return (
                              <div className="flex flex-col bg-[#191c22] border border-[#1e2433] rounded-none p-3 gap-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider">
                                      INSTITUTIONAL PATTERN SCANNER (22 FORMATIONS)
                                    </span>
                                    <span className="text-[9px] font-mono text-[#849495]">
                                      ({visiblePatterns.length} Signals)
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setFilterOnlyKeyLevels((prev) => !prev)}
                                    className={`px-2 py-1 rounded-none text-[9px] font-mono font-semibold border transition-all cursor-pointer ${
                                      filterOnlyKeyLevels
                                        ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40'
                                        : 'bg-[#0b0e14] text-[#849495] border-[#1e2433] hover:text-[#e1e2eb]'
                                    }`}
                                  >
                                    {filterOnlyKeyLevels ? '● KEY S/R ONLY' : '○ SHOW ALL'}
                                  </button>
                                </div>

                                <div className="overflow-x-auto no-scrollbar">
                                  <table className="w-full text-left font-mono text-[10px] tabular-nums">
                                    <thead>
                                      <tr className="text-[#849495] border-b border-[#1e2433] bg-[#141820]">
                                        <th className="px-2 py-1.5">TIME</th>
                                        <th className="px-2 py-1.5">FORMATION</th>
                                        <th className="px-2 py-1.5">BIAS</th>
                                        <th className="px-2 py-1.5">PRICE</th>
                                        <th className="px-2 py-1.5">KEY LEVEL</th>
                                        <th className="px-2 py-1.5 text-right">RVOL</th>
                                        <th className="px-2 py-1.5 text-right">QUAL</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1e2433]">
                                      {visiblePatterns.length === 0 ? (
                                        <tr>
                                          <td colSpan={7} className="px-3 py-3 text-center text-[#849495]">
                                            {filterOnlyKeyLevels
                                              ? 'No patterns directly at key levels. Toggle filter to show all.'
                                              : 'No recent pattern signals detected in scan window.'}
                                          </td>
                                        </tr>
                                      ) : (
                                        visiblePatterns.map((p, idx) => (
                                          <tr key={idx} className="hover:bg-[#1d2026] transition-colors">
                                            <td className="px-2 py-1.5 text-[#849495]">
                                              {p.barsAgo === 0 ? 'Now' : `${p.barsAgo}b`}
                                            </td>
                                            <td className="px-2 py-1.5 font-bold text-[#dbfcff]">
                                              <InfoTooltip
                                                content={{
                                                  title: p.name,
                                                  symbol,
                                                  categoryBadge: 'PATTERN SCAN',
                                                  badgeColor: p.bias === 'BULLISH' ? '#4edea3' : '#ffb4ab',
                                                  whatItIs: p.description,
                                                  liveRead: `${p.name} on ${symbol} at $${formatP(p.price)} with ${p.rvol.toFixed(1)}x volume. Quality: ${p.quality}%.`,
                                                  actionability:
                                                    p.bias === 'BULLISH'
                                                      ? 'Potential continuation or reversal bounce if key level holds.'
                                                      : 'Potential rejection or markdown extension.',
                                                }}
                                              >
                                                <span className="hover:underline cursor-pointer">{p.name}</span>
                                              </InfoTooltip>
                                            </td>
                                            <td className="px-2 py-1.5">
                                              <span
                                                className={`text-[8px] font-bold px-1.5 py-0.5 ${
                                                  p.bias === 'BULLISH'
                                                    ? 'bg-[#4edea3]/10 text-[#4edea3]'
                                                    : p.bias === 'BEARISH'
                                                    ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]'
                                                    : 'bg-[#849495]/10 text-[#849495]'
                                                }`}
                                              >
                                                {p.bias}
                                              </span>
                                            </td>
                                            <td className="px-2 py-1.5 text-[#e1e2eb]">${formatP(p.price)}</td>
                                            <td className="px-2 py-1.5">
                                              {p.isAtKeyLevel ? (
                                                <span className="text-[#00f0ff] font-semibold">
                                                  ✓ {p.testedLevelName}
                                                </span>
                                              ) : (
                                                <span className="text-[#849495]">Mid</span>
                                              )}
                                            </td>
                                            <td className="px-2 py-1.5 text-right text-[#b9cacb]">
                                              {p.rvol.toFixed(1)}x
                                            </td>
                                            <td className="px-2 py-1.5 text-right font-bold text-[#00f0ff]">
                                              {p.quality}%
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* ================================================================= */}
                      {/* TAB 2 DIAGNOSTICS: 📈 MA & TREND DYNAMICS                         */}
                      {/* ================================================================= */}
                      {activeTab === 2 && (
                        <div className="flex flex-col gap-3">
                          {/* EMA Ribbon Alignment Banner */}
                          <div className="flex items-center justify-between p-3 rounded-none bg-[#191c22] border border-[#1e2433] border-l-2 border-l-[#00f0ff] flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-[#00f0ff] text-[20px]">
                                ssid_chart
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-[#849495] uppercase font-bold tracking-wider block">
                                    EMA RIBBON ALIGNMENT REGIME
                                  </span>
                                  <InfoTooltip
                                    content={{
                                      title: 'EMA RIBBON ALIGNMENT',
                                      symbol,
                                      categoryBadge: 'TREND DYNAMICS',
                                      badgeColor: '#00f0ff',
                                      whatItIs:
                                        'Geometric stacking of 9, 21, 50, and 200 Exponential Moving Averages evaluating multi-horizon trend velocity.',
                                      liveRead: `${symbol} prints ${maResult.ribbonAlignment}. Intermediate trend: ${maResult.ribbonBias} REGIME with ${maResult.emaCross50200}.`,
                                      actionability:
                                        maResult.ribbonBias === 'BULLISH'
                                          ? 'Buy pullbacks into 21/50 EMA with trend-continuation bias.'
                                          : maResult.ribbonBias === 'BEARISH'
                                          ? 'Sell rallies into 21/50 EMA with markdown bias.'
                                          : 'Wait for ribbon expansion before committing trend size.',
                                    }}
                                    inlineBadgeText={`ⓘ Explainer`}
                                  />
                                </div>
                                <div className="font-mono text-[13px] font-bold text-[#dbfcff]">
                                  {maResult.ribbonAlignment}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono text-[9px] font-bold px-2 py-0.5 border ${
                                  maResult.ribbonBias === 'BULLISH'
                                    ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                                    : maResult.ribbonBias === 'BEARISH'
                                    ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                                    : 'bg-[#849495]/10 text-[#849495] border-[#849495]/30'
                                }`}
                              >
                                {maResult.ribbonBias} REGIME
                              </span>
                              <span className="font-mono text-[9px] bg-[#0b0e14] px-2 py-0.5 border border-[#1e2433] text-[#b9cacb]">
                                {maResult.emaCross50200}
                              </span>
                            </div>
                          </div>

                          {/* 6-Card Moving Average Telemetry Grid (Click any MA card to Track on Chart) */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 tabular-nums">
                            {[
                              maResult.mas.ema9,
                              maResult.mas.ema21,
                              maResult.mas.ema50,
                              maResult.mas.ema200,
                              maResult.mas.sma200,
                              maResult.mas.vwap,
                            ].map((ma) => (
                              <InfoTooltip
                                key={ma.name}
                                content={{
                                  title: ma.name,
                                  symbol,
                                  categoryBadge: 'MOVING AVERAGE',
                                  badgeColor: ma.status === 'SUPPORT' ? '#4edea3' : '#ffb4ab',
                                  whatItIs: `${ma.period}-period benchmark measuring average transacted value across price bars.`,
                                  liveRead: `${ma.name} for ${symbol} is at $${formatP(ma.price)} (${
                                    ma.distancePct >= 0 ? '+' : ''
                                  }${ma.distancePct.toFixed(2)}% vs Price). Status: ${ma.status}.`,
                                  actionability: `Acts as ${ma.status.toLowerCase()} zone. Respect break and retest price action.`,
                                }}
                                className="w-full"
                              >
                                <div
                                  onClick={(e) => toggleTrackPrice(e, `${ma.name} LEVEL`, ma.price)}
                                  className={`cyber-panel p-2.5 flex flex-col justify-between transition-all cursor-pointer w-full ${
                                    isPriceTracked(ma.price) ? 'cyber-panel-tracked' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
                                      {ma.name}
                                    </span>
                                    <span
                                      className={`font-mono text-[8px] font-bold px-1.5 py-0.5 ${
                                        ma.status === 'SUPPORT'
                                          ? 'bg-[#4edea3]/10 text-[#4edea3]'
                                          : ma.status === 'RESISTANCE'
                                          ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]'
                                          : 'bg-[#00f0ff]/10 text-[#00f0ff]'
                                      }`}
                                    >
                                      {ma.status}
                                    </span>
                                  </div>
                                  <div className="font-mono text-[14px] font-bold text-[#e1e2eb] mt-1">
                                    ${formatP(ma.price)}
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="font-mono text-[9px] text-[#849495]">
                                      {ma.distancePct >= 0 ? '+' : ''}
                                      {ma.distancePct.toFixed(2)}%
                                    </span>
                                    <span className="font-mono text-[8px] text-[#00f0ff]">
                                      {isPriceTracked(ma.price) ? '🎯 TRACKING' : '🎯 TRACK'}
                                    </span>
                                  </div>
                                </div>
                              </InfoTooltip>
                            ))}
                          </div>

                          {/* ATR Overextension, EMA Cross & Dedicated Sharpe/Sortino Card */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 tabular-nums">
                            <div className="p-3 bg-[#191c22] border border-[#1e2433] flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#00f0ff] uppercase font-bold tracking-wider">
                                  ATR STRETCH SCORE
                                </span>
                                <span className="font-mono text-[12px] font-bold text-[#e1e2eb]">
                                  {maResult.stretchScoreAtr.toFixed(2)} σ
                                </span>
                              </div>
                              <div className="font-sans text-[11px] text-[#b9cacb] mt-1">
                                {maResult.overextensionStatus}
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-1">
                                (Close - 21 EMA) / 14 ATR
                              </span>
                            </div>

                            <div className="p-3 bg-[#191c22] border border-[#1e2433] flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#00f0ff] uppercase font-bold tracking-wider">
                                  EMA DYNAMICS
                                </span>
                                <span className="font-mono text-[10px] font-bold text-[#4edea3]">
                                  {maResult.emaCross921}
                                </span>
                              </div>
                              <div className="font-sans text-[11px] text-[#b9cacb] mt-1">
                                9/21 EMA momentum vs macro 50/200 baseline.
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-1">
                                Macro: {maResult.emaCross50200}
                              </span>
                            </div>

                            <div className="p-3 bg-[#191c22] border border-[#00f0ff]/30 flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#00f0ff] uppercase font-bold tracking-wider">
                                  SHARPE / SORTINO
                                </span>
                                <span
                                  className={`font-mono text-[12px] font-bold ${
                                    (sharpeSortino?.sharpeRatio ?? 1.15) >= 1.0
                                      ? 'text-[#4edea3]'
                                      : (sharpeSortino?.sharpeRatio ?? 1.15) >= 0.5
                                      ? 'text-[#fcd34d]'
                                      : 'text-[#ffb4ab]'
                                  }`}
                                >
                                  {(sharpeSortino?.sharpeRatio ?? 1.15) >= 0 ? '+' : ''}
                                  {(sharpeSortino?.sharpeRatio ?? 1.15).toFixed(2)}
                                </span>
                              </div>
                              <div className="font-mono text-[11px] text-[#e1e2eb] mt-1 flex items-center justify-between">
                                <span>
                                  Sortino: <strong>{(sharpeSortino?.sortinoRatio ?? 1.48).toFixed(2)}</strong>
                                </span>
                                <span>
                                  Eff:{' '}
                                  <strong className="text-[#4edea3]">
                                    {((sharpeSortino?.returnEfficiency ?? 0.62) * 100).toFixed(0)}%
                                  </strong>
                                </span>
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] truncate mt-1">
                                {sharpeSortino?.sharpeRegime ?? 'Moderate Bullish Drift'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================================================================= */}
                      {/* TAB 3 DIAGNOSTICS: 🏛️ SMC, VOLUME PROFILE & AMD PHASE             */}
                      {/* ================================================================= */}
                      {activeTab === 3 && (
                        <div className="flex flex-col gap-3">
                          <AMDPhaseEngine amdPhase={amdPhase} symbol={symbol} />

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 tabular-nums">
                            {/* Volume Profile Auction Status */}
                            <div
                              onClick={(e) =>
                                toggleTrackPrice(e, 'POC (Point of Control)', volumeProfile.poc)
                              }
                              className={`cyber-panel border-l-2 border-l-[#00f0ff] p-3 flex flex-col justify-between cursor-pointer ${
                                isPriceTracked(volumeProfile.poc) ? 'cyber-panel-tracked' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#00f0ff] uppercase font-bold tracking-wider">
                                  VP 70% AUCTION
                                </span>
                                <span className="font-mono text-[8px] px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#00f0ff]">
                                  {isPriceTracked(volumeProfile.poc) ? '🎯 TRACKING POC' : '🎯 TRACK POC'}
                                </span>
                              </div>
                              <div
                                onClick={(e) => toggleTrackPrice(e, 'VAH (70% Value High)', volumeProfile.vah)}
                                className="flex items-baseline justify-between mt-1.5 hover:bg-[#141821] px-1 py-0.5"
                              >
                                <span className="font-mono text-[10px] text-[#849495]">VAH:</span>
                                <span className="font-mono text-[12px] font-bold text-[#00dbe9]">
                                  ${formatP(volumeProfile.vah)}{' '}
                                  {isPriceTracked(volumeProfile.vah) && '🎯'}
                                </span>
                              </div>
                              <div
                                onClick={(e) => toggleTrackPrice(e, 'POC (Point of Control)', volumeProfile.poc)}
                                className="flex items-baseline justify-between hover:bg-[#141821] px-1 py-0.5"
                              >
                                <span className="font-mono text-[10px] text-[#849495]">POC:</span>
                                <span className="font-mono text-[12px] font-bold text-[#f59e0b]">
                                  ${formatP(volumeProfile.poc)}{' '}
                                  {isPriceTracked(volumeProfile.poc) && '🎯'}
                                </span>
                              </div>
                              <div
                                onClick={(e) => toggleTrackPrice(e, 'VAL (70% Value Low)', volumeProfile.val)}
                                className="flex items-baseline justify-between hover:bg-[#141821] px-1 py-0.5"
                              >
                                <span className="font-mono text-[10px] text-[#849495]">VAL:</span>
                                <span className="font-mono text-[12px] font-bold text-[#00dbe9]">
                                  ${formatP(volumeProfile.val)}{' '}
                                  {isPriceTracked(volumeProfile.val) && '🎯'}
                                </span>
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-1">
                                {currentPrice >= volumeProfile.val && currentPrice <= volumeProfile.vah
                                  ? 'State: Balance Inside Value'
                                  : 'State: Directional Imbalance'}
                              </span>
                              {renderInlineLearnDrawer('volume_profile', 'tab3_vp')}
                            </div>

                            {/* Bullish Order Block */}
                            <div
                              onClick={(e) =>
                                bullOB &&
                                toggleTrackPrice(
                                  e,
                                  `BULL OB 50% MT (Q:${bullOB.qualityScore ?? 80})`,
                                  bullOB.midpoint
                                )
                              }
                              className={`cyber-panel border-l-2 border-l-[#4edea3] p-3 flex flex-col justify-between cursor-pointer ${
                                bullOB && isPriceTracked(bullOB.midpoint) ? 'cyber-panel-tracked' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#4edea3] uppercase font-bold tracking-wider">
                                  BULL OB (DEMAND)
                                </span>
                                <span className="px-1.5 py-0.5 bg-[#0b0e14] text-[#4edea3] border border-[#4edea3]/30 font-mono text-[8px] font-bold">
                                  {bullOB && isPriceTracked(bullOB.midpoint)
                                    ? '🎯 TRACKING'
                                    : `Q:${bullOB?.qualityScore ?? 80}/100`}
                                </span>
                              </div>
                              {bullOB ? (
                                <>
                                  <div className="font-mono text-[13px] font-bold text-[#4edea3] mt-1">
                                    ${formatP(bullOB.low)} – ${formatP(bullOB.high)}
                                  </div>
                                  <div className="font-mono text-[10px] text-[#b9cacb] mt-0.5">
                                    50% Mean: ${formatP(bullOB.midpoint)} 🎯
                                  </div>
                                  <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                    {bullOB.mitigationStatus || 'UNMITIGATED'} ({Math.round(bullOB.mitigationPct || 0)}% mit)
                                  </span>
                                </>
                              ) : (
                                <span className="font-mono text-[10px] text-[#849495] mt-2">
                                  No active unmitigated Bull OB
                                </span>
                              )}
                              {renderInlineLearnDrawer('order_blocks', 'tab3_bull_ob')}
                            </div>

                            {/* Bearish Order Block */}
                            <div
                              onClick={(e) =>
                                bearOB &&
                                toggleTrackPrice(
                                  e,
                                  `BEAR OB 50% MT (Q:${bearOB.qualityScore ?? 80})`,
                                  bearOB.midpoint
                                )
                              }
                              className={`cyber-panel border-l-2 border-l-[#ffb4ab] p-3 flex flex-col justify-between cursor-pointer ${
                                bearOB && isPriceTracked(bearOB.midpoint) ? 'cyber-panel-tracked' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#ffb4ab] uppercase font-bold tracking-wider">
                                  BEAR OB (SUPPLY)
                                </span>
                                <span className="px-1.5 py-0.5 bg-[#0b0e14] text-[#ffb4ab] border border-[#ffb4ab]/30 font-mono text-[8px] font-bold">
                                  {bearOB && isPriceTracked(bearOB.midpoint)
                                    ? '🎯 TRACKING'
                                    : `Q:${bearOB?.qualityScore ?? 80}/100`}
                                </span>
                              </div>
                              {bearOB ? (
                                <>
                                  <div className="font-mono text-[13px] font-bold text-[#ffb4ab] mt-1">
                                    ${formatP(bearOB.low)} – ${formatP(bearOB.high)}
                                  </div>
                                  <div className="font-mono text-[10px] text-[#b9cacb] mt-0.5">
                                    50% Mean: ${formatP(bearOB.midpoint)} 🎯
                                  </div>
                                  <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                    {bearOB.mitigationStatus || 'UNMITIGATED'} ({Math.round(bearOB.mitigationPct || 0)}% mit)
                                  </span>
                                </>
                              ) : (
                                <span className="font-mono text-[10px] text-[#849495] mt-2">
                                  No active unmitigated Bear OB
                                </span>
                              )}
                              {renderInlineLearnDrawer('order_blocks', 'tab3_bear_ob')}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================================================================= */}
                      {/* TAB 4 DIAGNOSTICS: 🫧 ORDERFLOW, VDU & ABSORPTION                 */}
                      {/* ================================================================= */}
                      {activeTab === 4 && (
                        <div className="flex flex-col gap-3">
                          {telemetry.spotPerpDivergence && (
                            <div className="cyber-panel border-l-2 border-l-[#00f0ff] flex flex-col gap-2 p-3">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">
                                  ⚖️ SPOT VS. PERP CVD FLOW &amp; BASIS
                                </span>
                                <span
                                  className={`font-mono text-[9px] font-bold px-2 py-0.5 border ${
                                    telemetry.spotPerpDivergence.flowRegime === 'SPOT_DRIVEN_EXPANSION' ||
                                    telemetry.spotPerpDivergence.flowRegime === 'SPOT_ABSORPTION_ACCUMULATION'
                                      ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                                      : telemetry.spotPerpDivergence.flowRegime.includes('TRAP')
                                      ? 'bg-[#f43f5e]/15 text-[#ffb4ab] border-[#f43f5e]/40'
                                      : 'bg-[#272a31] text-[#b9cacb] border-white/10'
                                  }`}
                                >
                                  {telemetry.spotPerpDivergence.headline}
                                </span>
                              </div>
                              <p className="font-sans text-[11px] text-[#b9cacb] leading-snug">
                                {telemetry.spotPerpDivergence.description}
                              </p>
                              <div className="flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#4edea3]">
                                    Spot Δ:{' '}
                                    <strong>
                                      {telemetry.spotPerpDivergence.spotDeltaPct >= 0 ? '+' : ''}
                                      {telemetry.spotPerpDivergence.spotDeltaPct.toFixed(1)}%
                                    </strong>
                                  </span>
                                  <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#00f0ff]">
                                    Perp Δ:{' '}
                                    <strong>
                                      {telemetry.spotPerpDivergence.perpDeltaPct >= 0 ? '+' : ''}
                                      {telemetry.spotPerpDivergence.perpDeltaPct.toFixed(1)}%
                                    </strong>
                                  </span>
                                  <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#1e2433] text-[#fcd34d]">
                                    Basis:{' '}
                                    <strong>
                                      {telemetry.spotPerpDivergence.basisBps >= 0 ? '+' : ''}
                                      {telemetry.spotPerpDivergence.basisBps.toFixed(1)} bps
                                    </strong>
                                  </span>
                                </div>
                                <AsciiOrderflowBar
                                  buyRatio={Math.max(
                                    0.15,
                                    Math.min(
                                      0.85,
                                      0.5 + (telemetry.spotPerpDivergence.spotDeltaPct || 0) / 100
                                    )
                                  )}
                                  width={14}
                                />
                              </div>
                            </div>
                          )}

                          {/* VDU & Ignition Scanner */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="cyber-panel p-3 flex flex-col justify-between">
                              <span className="font-mono text-[9px] text-[#00f0ff] uppercase font-bold tracking-wider">
                                💧 VOLUME DRY-UP (VDU)
                              </span>
                              <div className="font-mono text-[16px] font-bold text-[#00f0ff] mt-1 flex items-center justify-between">
                                <span>RVOL &lt; 0.45x</span>
                                <AsciiWaveSparkline
                                  values={klines.slice(-8).map((k) => k.volume)}
                                  isStreaming={true}
                                  barsCount={6}
                                />
                              </div>
                              <p className="font-sans text-[10px] text-[#b9cacb] mt-1 leading-snug">
                                Seller exhaustion &amp; pre-breakout volatility compression.
                              </p>
                            </div>

                            <div className="cyber-panel p-3 flex flex-col justify-between">
                              <span className="font-mono text-[9px] text-[#f59e0b] uppercase font-bold tracking-wider">
                                ⚡ VOLUME IGNITION
                              </span>
                              <div className="font-mono text-[16px] font-bold text-[#f59e0b] mt-1">
                                RVOL &gt; 2.0x
                              </div>
                              <p className="font-sans text-[10px] text-[#b9cacb] mt-1 leading-snug">
                                Institutional displacement initiating directional expansion.
                              </p>
                            </div>

                            <div className="cyber-panel p-3 flex flex-col justify-between">
                              <span className="font-mono text-[9px] text-[#e879f9] uppercase font-bold tracking-wider">
                                🟡 ABSORPTION RINGS
                              </span>
                              <div className="font-mono text-[16px] font-bold text-[#e879f9] mt-1">
                                Limit Wall Defense
                              </div>
                              <p className="font-sans text-[10px] text-[#b9cacb] mt-1 leading-snug">
                                Aggressive market orders absorbed by resting limit books.
                              </p>
                            </div>
                          </div>

                          {/* 500-Depth Bid vs Ask Liquidity Walls (Interactive Track on Chart) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 tabular-nums">
                            <div
                              onClick={(e) =>
                                toggleTrackPrice(
                                  e,
                                  'ORDERBOOK BID WALL',
                                  liquidity?.bidLiquidityPrice || currentPrice * 0.985
                                )
                              }
                              className={`cyber-panel border-l-2 border-l-[#4edea3] p-3 flex flex-col justify-between cursor-pointer ${
                                isPriceTracked(liquidity?.bidLiquidityPrice || currentPrice * 0.985)
                                  ? 'cyber-panel-tracked'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#4edea3] uppercase font-bold tracking-wider">
                                  BID WALL (SUPPORT)
                                </span>
                                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#4edea3] font-bold">
                                  {isPriceTracked(
                                    liquidity?.bidLiquidityPrice || currentPrice * 0.985
                                  )
                                    ? '🎯 TRACKING ON CHART'
                                    : liquidity?.bidLiquidityQty
                                    ? `${liquidity.bidLiquidityQty.toFixed(1)} ${baseAsset}`
                                    : '🎯 TRACK'}
                                </span>
                              </div>
                              <div className="font-mono text-[16px] font-bold text-[#4edea3] mt-1">
                                ${formatP(liquidity?.bidLiquidityPrice || currentPrice * 0.985)}
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-1">
                                500-Depth Resting Limit Buyer Concentration
                              </span>
                            </div>

                            <div
                              onClick={(e) =>
                                toggleTrackPrice(
                                  e,
                                  'ORDERBOOK ASK WALL',
                                  liquidity?.askLiquidityPrice || currentPrice * 1.018
                                )
                              }
                              className={`cyber-panel border-l-2 border-l-[#ffb4ab] p-3 flex flex-col justify-between cursor-pointer ${
                                isPriceTracked(liquidity?.askLiquidityPrice || currentPrice * 1.018)
                                  ? 'cyber-panel-tracked'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#ffb4ab] uppercase font-bold tracking-wider">
                                  ASK WALL (SUPPLY)
                                </span>
                                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#ffb4ab] font-bold">
                                  {isPriceTracked(
                                    liquidity?.askLiquidityPrice || currentPrice * 1.018
                                  )
                                    ? '🎯 TRACKING ON CHART'
                                    : liquidity?.askLiquidityQty
                                    ? `${liquidity.askLiquidityQty.toFixed(1)} ${baseAsset}`
                                    : '🎯 TRACK'}
                                </span>
                              </div>
                              <div className="font-mono text-[16px] font-bold text-[#ffb4ab] mt-1">
                                ${formatP(liquidity?.askLiquidityPrice || currentPrice * 1.018)}
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-1">
                                500-Depth Resting Limit Seller Concentration
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================================================================= */}
                      {/* TAB 5 DIAGNOSTICS: 🧮 QUANT & OPTIONS DERIVATIVES                 */}
                      {/* ================================================================= */}
                      {activeTab === 5 && (
                        <div className="flex flex-col gap-3">
                          {/* Black-Scholes Dealer Positioning & Zero-Gamma Strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
                            <div
                              onClick={(e) =>
                                toggleTrackPrice(
                                  e,
                                  'ZERO-GAMMA FLIP (0-Γ)',
                                  optionsData.zeroGammaLevel || optionsData.maxPain
                                )
                              }
                              className={`cyber-panel p-2.5 flex flex-col justify-between cursor-pointer ${
                                isPriceTracked(optionsData.zeroGammaLevel || optionsData.maxPain)
                                  ? 'cyber-panel-tracked'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                                  ZERO-GAMMA FLIP
                                </span>
                                <span className="font-mono text-[8px] text-[#00f0ff]">🎯</span>
                              </div>
                              <div className="font-mono text-[14px] font-bold text-[#00f0ff] mt-1">
                                ${formatP(optionsData.zeroGammaLevel || optionsData.maxPain)}
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-0.5 truncate">
                                {optionsData.gammaRegime || 'POSITIVE_GAMMA_PINNING'}
                              </span>
                            </div>

                            <div
                              onClick={(e) =>
                                toggleTrackPrice(e, 'MAX PAIN STRIKE', optionsData.maxPain)
                              }
                              className={`cyber-panel p-2.5 flex flex-col justify-between cursor-pointer ${
                                isPriceTracked(optionsData.maxPain) ? 'cyber-panel-tracked' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                                  MAX PAIN STRIKE
                                </span>
                                <span className="font-mono text-[8px] text-[#ddb7ff]">🎯</span>
                              </div>
                              <div className="font-mono text-[14px] font-bold text-[#ddb7ff] mt-1">
                                ${formatP(optionsData.maxPain)}
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                Intrinsic Expiry Pin
                              </span>
                            </div>

                            <div
                              onClick={(e) =>
                                toggleTrackPrice(e, 'CALL WALL STRIKE', optionsData.callWall)
                              }
                              className={`cyber-panel p-2.5 flex flex-col justify-between cursor-pointer ${
                                isPriceTracked(optionsData.callWall) ? 'cyber-panel-tracked' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                                  CALL / PUT WALLS
                                </span>
                                <span className="font-mono text-[8px] text-[#ffb4ab]">🎯</span>
                              </div>
                              <div className="font-mono text-[11px] font-bold text-[#e1e2eb] mt-1">
                                <span className="text-[#ffb4ab]">${formatP(optionsData.callWall)}</span>
                                {' / '}
                                <span
                                  onClick={(e) =>
                                    toggleTrackPrice(e, 'PUT WALL STRIKE', optionsData.putWall)
                                  }
                                  className="text-[#4edea3] hover:underline"
                                >
                                  ${formatP(optionsData.putWall)}
                                </span>
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                Dealer Hedging Bounds
                              </span>
                            </div>

                            <div className="cyber-panel p-2.5 flex flex-col justify-between">
                              <span className="font-mono text-[9px] text-[#849495] uppercase font-semibold">
                                25D SKEW &amp; P/C RATIO
                              </span>
                              <div className="font-mono text-[13px] font-bold text-[#fcd34d] mt-1">
                                {(optionsData.skew25d ?? 0) >= 0 ? '+' : ''}
                                {(optionsData.skew25d ?? 0).toFixed(1)}% • P/C {(optionsData.pcRatio ?? 0.85).toFixed(2)}
                              </div>
                              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                                Put-Call Volatility Skew
                              </span>
                            </div>
                          </div>

                          {/* 3x2 Derivatives Telemetry Cards with Sharpe & Sortino */}
                          <TelemetryCards
                            metrics={telemetry}
                            symbol={symbol}
                            experienceMode={experienceMode}
                            onHoverLevel={onHoverLevel}
                            highlightedLevel={highlightedLevel}
                            onNavigateMobilePage={onNavigateMobilePage}
                          />
                        </div>
                      )}

                      {/* Bottom Quick-Action Bar inside Diagnostics to flip to Setup or Sizer */}
                      <div className="flex items-center justify-between px-3 py-2 bg-[#0b0e14] border border-[#1e2433] font-mono text-[10px]">
                        <span className="text-[#849495] truncate">
                          ACTIVE THESIS: <strong className="text-[#dbfcff]">{currentSetup.setupType}</strong>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setLensSubView('SETUP')}
                            className="px-2.5 py-1 bg-[#141821] hover:bg-[#191c22] text-[#00f0ff] border border-[#00f0ff]/40 font-bold uppercase cursor-pointer"
                          >
                            VIEW SETUP [B] →
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* DECK 2: [ SYS.02 // MTF RADAR & AI BRIEF ]                                */}
        {/* ========================================================================= */}
        {activeDeck === 'MTF_RADAR' && (
          <motion.div
            key="deck-mtf-radar"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="flex flex-col p-3 gap-3"
          >
            {/* Brutalist Deck Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0b0e14] border border-[#1e2433] border-l-2 border-l-[#00f0ff] font-mono text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-[#00f0ff] font-bold">SYS.02</span>
                <span className="text-[#e1e2eb] font-bold uppercase">
                  MULTI-TIMEFRAME CONFLUENCE MATRIX &amp; AI QUANT BRIEF
                </span>
              </div>
              <span className="text-[#849495] tabular-nums">15M / 1H / 4H / 1D</span>
            </div>

            {/* Confluence Gauge & MTF Matrix */}
            <ConfluenceMatrix confluence={confluence} matrix={matrix} symbol={symbol} />

            {/* Gemini AI Master Speculation Brief */}
            <SpeculationBrief
              brief={brief}
              isLoading={isBriefLoading}
              onRunQuant={onRunQuant}
              onCopyText={onCopyText}
            />

            {/* 3x2 Derivatives Telemetry Cards */}
            <TelemetryCards
              metrics={telemetry}
              symbol={symbol}
              experienceMode={experienceMode}
              onHoverLevel={onHoverLevel}
              highlightedLevel={highlightedLevel}
              onNavigateMobilePage={onNavigateMobilePage}
            />
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* DECK 3: [ SYS.03 // PRE-FLIGHT & SIZER ]                                  */}
        {/* ========================================================================= */}
        {activeDeck === 'PREFLIGHT_SIZER' && (
          <motion.div
            key="deck-preflight-sizer"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="flex flex-col p-3 gap-3"
          >
            {/* Active Setup Sync Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-[#0b0e14] border border-[#1e2433] border-l-2 border-l-[#4edea3] font-mono text-[10px] tabular-nums">
              <div className="flex items-center gap-2">
                <span className="text-[#4edea3] font-bold">SYS.03</span>
                <span className="text-[#e1e2eb] font-bold uppercase">
                  EXECUTION SIZER &amp; 5-POINT PRE-FLIGHT GATE
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onLoadSetup(
                    currentSetup.suggestedEntry,
                    currentSetup.invalidationPrice,
                    currentSetup.target1Price,
                    currentSetup.target2Price
                  )
                }
                className="px-2 py-0.5 bg-[#141821] hover:bg-[#191c22] text-[#00f0ff] border border-[#00f0ff]/40 font-bold uppercase cursor-pointer"
              >
                SYNC TAB {activeTab} SETUP
              </button>
            </div>

            {/* 5-Point Pre-Flight Checklist */}
            <PreFlightChecklist
              symbol={symbol}
              currentPrice={currentPrice}
              klines={klines}
              volumeProfile={volumeProfile}
              bullOB={bullOB}
              bearOB={bearOB}
              optionsData={optionsData}
              liquidity={liquidity}
              telemetry={telemetry}
              matrix={matrix}
              calcResult={calcResult}
              sharpeSortino={sharpeSortino}
              currentSetup={currentSetup}
              experienceMode={experienceMode}
              paperTrades={paperTrades}
              onAddPaperTrade={onAddPaperTrade}
              onRemovePaperTrade={onRemovePaperTrade}
            />

            {/* Microstructure Execution Calculator */}
            <ExecutionHelper
              calc={calcResult}
              baseAsset={baseAsset}
              onRiskChange={onRiskChange}
              onEntryChange={onEntryChange}
              onStopChange={onStopChange}
              onCopyText={onCopyText}
              onHoverLevel={onHoverLevel}
              highlightedLevel={highlightedLevel}
            />
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* DECK 4: [ SYS.04 // REVERSE ACADEMY ]                                     */}
        {/* ========================================================================= */}
        {activeDeck === 'REVERSE_ACADEMY' && (
          <motion.div
            key="deck-reverse-academy"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="flex flex-col w-full"
          >
            <ReverseAcademyDeck
              symbol={symbol}
              currentPrice={currentPrice}
              telemetry={telemetry}
              volumeProfile={volumeProfile}
              bullOB={bullOB}
              bearOB={bearOB}
              optionsData={optionsData}
              liquidity={liquidity}
              candlestickResult={candlestickResult}
              maResult={maResult}
              amdPhase={amdPhase}
              calcResult={calcResult}
              sharpeSortino={sharpeSortino}
              confluence={confluence}
              onProgressChange={setAcademyProgress}
              focusXRaySignal={externalDeckRequest?.ts}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
