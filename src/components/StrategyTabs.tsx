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
import { PreFlightChecklist, PaperTradeEntry } from './PreFlightChecklist';
import { ReverseAcademyDeck } from './ReverseAcademyDeck';
import { loadAcademyProgress, AcademyProgressState } from '../utils/reverseAcademyEngine';
import { AsciiOrderflowBar, AsciiWaveSparkline, ScrambleValue } from './AsciiTelemetry';
import { getRookieMentorGuide } from '../utils/metricBenchmarks';
import {
  calculateGannAndCyclesTelemetry,
  evaluateFamousStrategies,
  FamousStrategyEvaluation,
  PlaybookEra,
} from '../utils/famousStrategiesEngine';
import { InfernoCodexHub } from './InfernoCodexHub';
import { SignalBiasPill } from './SignalBiasPill';
import { PlaybookHub } from './PlaybookHub';
import {
  InfernoCandle,
  OrderBlockZone,
  VolumeProfileSnapshot,
} from '../services/CraneStrikeEngine';

export type TacticalDeckMode =
  | 'LENSES'
  | 'MTF_RADAR'
  | 'PLAYBOOKS'
  | 'PREFLIGHT_SIZER'
  | 'REVERSE_ACADEMY';
export type StageId = 1 | 2 | 3 | 4 | 5 | 6;
type FlowViewMode = 'GUIDED' | 'COMPACT_ALL' | 'PLAYBOOKS' | 'CODEX';
type PlaybookFilterType = 'ALL' | 'READY' | PlaybookEra;

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
  onPlotTradeGeometry?: (plan: {
    entry: number;
    stopLoss: number;
    tp1: number;
    direction: 'LONG' | 'SHORT';
    rr: number;
  }) => void;
  candlestickResult: CandlestickAnalysisResult;
  maResult: MovingAverageAnalysisResult;
  lensSetups: Record<number, PotentialSetupSpeculation>;
  sharpeSortino?: SharpeSortinoMetrics;
  timeframe?: string;
  experienceMode?: 'rookie' | 'pro';
  paperTrades?: PaperTradeEntry[];
  onAddPaperTrade?: (trade: PaperTradeEntry) => void;
  onRemovePaperTrade?: (id: string) => void;
  activeTab?: StageId;
  onTabChange?: (tab: StageId) => void;
  externalDeckRequest?: { deck: TacticalDeckMode; ts: number } | null;
  onNavigateMobilePage?: (
    page: 'CHART' | 'RADAR' | 'LENSES' | 'PLAYBOOKS' | 'EXECUTE' | 'ACADEMY'
  ) => void;
  isWorkspaceExpanded?: boolean;
  onToggleWorkspaceExpand?: (expanded: boolean) => void;
  onHoverLevel?: (level: { label: string; price: number } | null) => void;
  highlightedLevel?: { label: string; price: number } | null;
}

interface StageDefinition {
  id: StageId;
  stepCode: string;
  shortTitle: string;
  stepperLabel: string;
  fullTitle: string;
  subtitle: string;
  question: string;
  mentorKeys: string[];
  studyLinks: { label: string; source: string; url: string }[];
}

const STAGES: StageDefinition[] = [
  {
    id: 1,
    stepCode: '01',
    shortTitle: 'Price',
    stepperLabel: '1. Price',
    fullTitle: 'Price & Structure',
    subtitle: 'Candles, Wicks & Support / Resistance',
    question: 'Are buyers or sellers rejecting key price levels right now?',
    mentorKeys: ['wick_rejection'],
    studyLinks: [
      {
        label: 'Candlestick Wick Rejection Guide',
        source: 'Investopedia',
        url: 'https://www.investopedia.com/terms/c/candlestick.asp',
      },
      {
        label: 'Support & Resistance Structure',
        source: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000502023-support-and-resistance/',
      },
      {
        label: 'Price Action & Pinbar Psychology',
        source: 'Binance Academy',
        url: 'https://academy.binance.com/en/articles/a-beginners-guide-to-candlestick-charts',
      },
    ],
  },
  {
    id: 2,
    stepCode: '02',
    shortTitle: 'Volume',
    stepperLabel: '2. Volume',
    fullTitle: 'Volume & Value Area',
    subtitle: 'POC, VAH/VAL & Session RVOL',
    question: 'Is price at a discount or premium auction zone with real volume participation?',
    mentorKeys: ['volume_profile', 'session_rvol'],
    studyLinks: [
      {
        label: 'Volume Profile (POC, VAH, VAL)',
        source: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000502040-volume-profile-indicators-basic-concepts/',
      },
      {
        label: 'Auction Market Theory & Fair Value',
        source: 'Bookmap',
        url: 'https://bookmap.com/blog/volume-profile-trading-how-to-use-it-in-your-strategy',
      },
      {
        label: 'Relative Volume (RVOL) & VDU',
        source: 'Investopedia',
        url: 'https://www.investopedia.com/terms/v/volumeoftrade.asp',
      },
    ],
  },
  {
    id: 3,
    stepCode: '03',
    shortTitle: 'Trend',
    stepperLabel: '3. Trend',
    fullTitle: 'Moving Averages & Trend',
    subtitle: 'EMA Ribbon, VWAP, ATR Stretch & MTF',
    question: 'Is the multi-timeframe trend aligned, or is price over-stretched?',
    mentorKeys: ['atr_stretch', 'vwma_zscore'],
    studyLinks: [
      {
        label: 'Exponential Moving Average (EMA) Ribbons',
        source: 'Investopedia',
        url: 'https://www.investopedia.com/terms/e/ema.asp',
      },
      {
        label: 'Institutional Session VWAP Tactics',
        source: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000502018-volume-weighted-average-price-vwap/',
      },
      {
        label: 'ATR Overextension & Mean Reversion',
        source: 'Binance Academy',
        url: 'https://academy.binance.com/en/articles/moving-averages-explained',
      },
    ],
  },
  {
    id: 4,
    stepCode: '04',
    shortTitle: 'Orderflow',
    stepperLabel: '4. Orderflow',
    fullTitle: 'Orderflow & Smart Money',
    subtitle: 'Order Blocks, AMD, CVD & Spot vs Perp',
    question: 'Are institutional Spot buyers stepping in at unmitigated Order Blocks?',
    mentorKeys: ['order_blocks', 'cvd_delta'],
    studyLinks: [
      {
        label: 'Orderflow, Limit Absorption & CVD Delta',
        source: 'Bookmap',
        url: 'https://bookmap.com/blog/cumulative-volume-delta-cvd-in-trading/',
      },
      {
        label: 'Wyckoff Accumulation, Manipulation, Distribution',
        source: 'Investopedia',
        url: 'https://www.investopedia.com/articles/active-trading/070715/making-money-wyckoff-way.asp',
      },
      {
        label: 'Spot vs Perpetual Futures Basis Flow',
        source: 'Binance Academy',
        url: 'https://academy.binance.com/en/articles/what-are-perpetual-futures-contracts',
      },
    ],
  },
  {
    id: 5,
    stepCode: '05',
    shortTitle: 'Quant',
    stepperLabel: '5. Quant',
    fullTitle: 'Quant & Derivatives',
    subtitle: 'Hurst, ADX, Z-Score, Options GEX & Funding/OI',
    question: 'What do statistical regime math and options market-makers indicate?',
    mentorKeys: ['hurst_adx', 'net_gex', 'sharpe_sortino', 'funding_rate', 'oi_delta'],
    studyLinks: [
      {
        label: 'Options Gamma Exposure (GEX) & Zero-Gamma',
        source: 'Deribit Insights',
        url: 'https://insights.deribit.com/',
      },
      {
        label: 'Hurst Exponent & Wilder ADX Regime Math',
        source: 'Investopedia',
        url: 'https://www.investopedia.com/terms/a/adx.asp',
      },
      {
        label: 'Sharpe & Sortino Risk-Adjusted Returns',
        source: 'Investopedia',
        url: 'https://www.investopedia.com/terms/s/sharperatio.asp',
      },
    ],
  },
  {
    id: 6,
    stepCode: '06',
    shortTitle: 'Summary',
    stepperLabel: '6. Summary',
    fullTitle: 'Summary & Execution Sizer',
    subtitle: 'Funnel Scorecard, Pre-Flight & Position Calculator',
    question: 'Do all 5 stages align for execution, and what is our fee-adjusted position size?',
    mentorKeys: ['sharpe_sortino'],
    studyLinks: [
      {
        label: 'Position Sizing & Fractional Kelly Criterion',
        source: 'Investopedia',
        url: 'https://www.investopedia.com/articles/trading/04/091504.asp',
      },
      {
        label: 'Maker Limit vs Taker Market Execution Drag',
        source: 'Binance Academy',
        url: 'https://academy.binance.com/en/articles/what-are-maker-and-taker-fees',
      },
    ],
  },
];

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
  onPlotTradeGeometry,
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
  isWorkspaceExpanded = false,
  onToggleWorkspaceExpand,
  onHoverLevel,
  highlightedLevel,
}) => {
  const [internalStage, setInternalStage] = useState<StageId>(1);
  const activeStage: StageId = controlledActiveTab !== undefined ? controlledActiveTab : internalStage;

  const [viewMode, setViewMode] = useState<FlowViewMode>('GUIDED');
  const [showReverseXRay, setShowReverseXRay] = useState<boolean>(false);
  const [showFullPatternScanner, setShowFullPatternScanner] = useState<boolean>(false);
  const [showAiBriefInStage5, setShowAiBriefInStage5] = useState<boolean>(false);
  const [filterOnlyKeyLevels, setFilterOnlyKeyLevels] = useState<boolean>(false);
  const [selectedSetupLensId, setSelectedSetupLensId] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [, setAcademyProgress] = useState<AcademyProgressState>(() => loadAcademyProgress());
  const [openLearnStages, setOpenLearnStages] = useState<Record<number, boolean>>({});
  const [playbookFilter, setPlaybookFilter] = useState<PlaybookFilterType>('ALL');
  const [assessedStrategyId, setAssessedStrategyId] = useState<string | null>(null);
  const [expandedPlaybookId, setExpandedPlaybookId] = useState<string | null>(null);
  const [showGannLevelsDrawer, setShowGannLevelsDrawer] = useState<boolean>(false);
  const [isLight, setIsLight] = useState<boolean>(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
  );

  useEffect(() => {
    const syncTheme = () => {
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    };
    window.addEventListener('inferno:theme-change', syncTheme);
    return () => window.removeEventListener('inferno:theme-change', syncTheme);
  }, []);

  const getReadableStatusColor = (dotHex: string) => {
    if (!isLight) return dotHex;
    if (dotHex === '#10b981' || dotHex === '#4edea3') return '#047857';
    if (dotHex === '#f59e0b') return '#b45309';
    if (dotHex === '#f43f5e' || dotHex === '#ffb4ab') return '#b91c1c';
    return '#2563eb';
  };

  const symbol = activeSymbol || (baseAsset ? `${baseAsset}USDT` : 'BTCUSDT');

  const infernoCandles: InfernoCandle[] = useMemo(() => {
    return klines.map((k) => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      takerBuyVolume: k.takerBuyVolume,
    }));
  }, [klines]);

  const orderBlockZones: OrderBlockZone[] = useMemo(() => {
    const zones: OrderBlockZone[] = [];
    if (bullOB) {
      zones.push({
        id: 'bull-ob',
        top: bullOB.high,
        bottom: bullOB.low,
        type: 'BULL',
        mitigated: (bullOB.mitigationStatus || bullOB.status) !== 'UNMITIGATED',
        isDisplacement: true,
      });
    }
    if (bearOB) {
      zones.push({
        id: 'bear-ob',
        top: bearOB.high,
        bottom: bearOB.low,
        type: 'BEAR',
        mitigated: (bearOB.mitigationStatus || bearOB.status) !== 'UNMITIGATED',
        isDisplacement: true,
      });
    }
    return zones;
  }, [bullOB, bearOB]);

  const vpSnapshot: VolumeProfileSnapshot | undefined = useMemo(() => {
    if (!volumeProfile || !volumeProfile.buckets) return undefined;
    return {
      poc: volumeProfile.poc,
      vah: volumeProfile.vah,
      val: volumeProfile.val,
      hvns: volumeProfile.buckets.filter((b) => b.isHVN).map((b) => b.price),
      lvns: volumeProfile.buckets.filter((b) => b.isLVN).map((b) => b.price),
    };
  }, [volumeProfile]);

  const stageToLensMap: Record<number, 1 | 2 | 3 | 4 | 5> = {
    1: 1,
    2: 3,
    3: 2,
    4: 4,
    5: 5,
  };

  const handleStageSelect = (stageId: StageId) => {
    setInternalStage(stageId);
    onTabChange?.(stageId);
    if (stageId <= 5) {
      setSelectedSetupLensId(stageToLensMap[stageId] || 1);
    }
  };

  useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setInternalStage(controlledActiveTab);
      if (controlledActiveTab <= 5) {
        setSelectedSetupLensId(stageToLensMap[controlledActiveTab] || 1);
      }
    }
  }, [controlledActiveTab]);

  // Sync external deck requests
  useEffect(() => {
    if (!externalDeckRequest?.deck) return;
    if (externalDeckRequest.deck === 'PREFLIGHT_SIZER') {
      setViewMode('GUIDED');
      setShowReverseXRay(false);
      handleStageSelect(6);
      onToggleWorkspaceExpand?.(false);
    } else if (externalDeckRequest.deck === 'PLAYBOOKS') {
      setViewMode('PLAYBOOKS');
      setShowReverseXRay(false);
      onToggleWorkspaceExpand?.(true);
    } else if (externalDeckRequest.deck === 'REVERSE_ACADEMY') {
      setViewMode('CODEX');
      setShowReverseXRay(true);
      onToggleWorkspaceExpand?.(true);
    } else if (externalDeckRequest.deck === 'MTF_RADAR') {
      setViewMode('GUIDED');
      setShowReverseXRay(false);
      handleStageSelect(5);
      onToggleWorkspaceExpand?.(false);
    } else if (externalDeckRequest.deck === 'LENSES') {
      setViewMode('GUIDED');
      setShowReverseXRay(false);
      onToggleWorkspaceExpand?.(false);
      if (activeStage === 6) {
        handleStageSelect(1);
      }
    }
  }, [externalDeckRequest]);

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

  const formatP = (p: number) => {
    if (!p) return '0';
    if (p < 0.001) return p.toFixed(7);
    if (p < 0.1) return p.toFixed(5);
    if (p < 10) return p.toFixed(4);
    if (p < 1000) return p.toFixed(2);
    return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  // Gann Astro-Geometric, Lunar Synodic & Classical Tape Telemetry
  const gannCyclesTelemetry = useMemo(
    () =>
      calculateGannAndCyclesTelemetry(
        currentPrice,
        volumeProfile.poc || currentPrice,
        Date.now(),
        klines
      ),
    [currentPrice, volumeProfile.poc, klines]
  );

  // 14 World-Renowned Models across 4 Eras
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

  const readyPlaybooksCount = useMemo(
    () => famousStrategies.filter((s) => s.possibilityScore >= 70).length,
    [famousStrategies]
  );

  const top3PodiumStrategies = useMemo(() => {
    const strictEligible = famousStrategies.filter(
      (s) =>
        s.possibilityScore >= 50 &&
        s.status !== 'WRONG_REGIME' &&
        s.backtest250Bars.avgRealizedR >= 0
    );
    const regimeEligible = famousStrategies.filter(
      (s) => s.possibilityScore >= 50 && s.status !== 'WRONG_REGIME'
    );
    const pool =
      strictEligible.length >= 3
        ? strictEligible
        : regimeEligible.length >= 3
        ? regimeEligible
        : famousStrategies;
    return [...pool]
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 3);
  }, [famousStrategies]);

  const assessedStrategy = useMemo(
    () => famousStrategies.find((s) => s.id === assessedStrategyId) || null,
    [famousStrategies, assessedStrategyId]
  );

  // Underlying 5 Lens Confidences from quantEngine
  const lensConfidences = useMemo<Record<number, StrategyConfidence>>(
    () => ({
      1: calculateStrategyConfidence(
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
      ),
      2: calculateStrategyConfidence(
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
      ),
      3: calculateStrategyConfidence(
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
      ),
      4: calculateStrategyConfidence(
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
      ),
      5: calculateStrategyConfidence(
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
      ),
    }),
    [
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
    ]
  );

  // Map the 6 Progressive Stages to Live Stage Scores, Biases, Status Dots, and Plain-English Takeaways
  const stageEvaluations = useMemo(() => {
    const rvols = calculateRVOL(klines);
    const sesRvol = telemetry.sessionRvol || rvols[rvols.length - 1] || 1.0;
    const isDiscount = currentPrice < volumeProfile.val;
    const isPremium = currentPrice > volumeProfile.vah;
    const auctionZoneLabel = isDiscount
      ? 'Discount (< VAL)'
      : isPremium
      ? 'Premium (> VAH)'
      : 'Fair Value (Inside VA)';

    // Stage 1: Price & Structure (Lens 1)
    const s1Conf = lensConfidences[1];
    const patName = candlestickResult.primaryPattern?.name || 'Neutral Bar Structure';
    const srLow = liquidity?.srLow || volumeProfile.val || currentPrice * 0.985;
    const srHigh = liquidity?.srHigh || volumeProfile.vah || currentPrice * 1.015;
    const distSrLowPct = currentPrice > 0 ? ((currentPrice - srLow) / currentPrice) * 100 : 1.2;
    const distSrHighPct = currentPrice > 0 ? ((srHigh - currentPrice) / currentPrice) * 100 : 1.2;

    // Stage 2: Volume & Value Area
    const vpScore = Math.round(lensConfidences[3].score * 0.55 + lensConfidences[4].score * 0.45);
    const vpBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      isDiscount || (currentPrice >= volumeProfile.poc && telemetry.cvdDelta >= 0)
        ? 'BULLISH'
        : isPremium && telemetry.cvdDelta < 0
        ? 'BEARISH'
        : lensConfidences[3].bias;

    // Stage 3: Moving Averages & Trend (Lens 2)
    const s3Conf = lensConfidences[2];

    // Stage 4: Orderflow & Smart Money
    const s4Score = Math.round(lensConfidences[3].score * 0.45 + lensConfidences[4].score * 0.55);
    const s4Bias =
      lensConfidences[4].score >= lensConfidences[3].score
        ? lensConfidences[4].bias
        : lensConfidences[3].bias;

    // Stage 5: Quant & Derivatives (Lens 5)
    const s5Conf = lensConfidences[5];

    // Stage 6: Verdict & Execution
    const avgFunnelScore = Math.round(
      (s1Conf.score + vpScore + s3Conf.score + s4Score + s5Conf.score) / 5
    );
    const s6Bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      confluence.score >= 60 ? 'BULLISH' : confluence.score <= 40 ? 'BEARISH' : s1Conf.bias;

    const getStatusColor = (score: number): string =>
      score >= 65 ? '#10b981' : score >= 45 ? '#f59e0b' : '#f43f5e';

    const getStatusLabel = (score: number): 'PASS' | 'WAIT' | 'CONFLICT' =>
      score >= 65 ? 'PASS' : score >= 45 ? 'WAIT' : 'CONFLICT';

    return {
      1: {
        score: s1Conf.score,
        bias: s1Conf.bias,
        dotColor: getStatusColor(s1Conf.score),
        status: getStatusLabel(s1Conf.score),
        headline: s1Conf.headline,
        takeaway: `${symbol} printed ${patName} (${
          candlestickResult.primaryPattern?.quality ?? 68
        }% quality) with ${((candlestickResult.anatomy?.wickRejectionRatio || 0.5) * 100).toFixed(
          0
        )}% wick rejection. Price sits ${distSrLowPct.toFixed(2)}% above support ($${formatP(
          srLow
        )}) and ${distSrHighPct.toFixed(2)}% below resistance ($${formatP(srHigh)}).`,
        setup: lensSetups[1],
      },
      2: {
        score: vpScore,
        bias: vpBias,
        dotColor: getStatusColor(vpScore),
        status: getStatusLabel(vpScore),
        headline: `${auctionZoneLabel} • SES-RVOL ${sesRvol.toFixed(2)}x`,
        takeaway: `${symbol} is trading in ${auctionZoneLabel} relative to the 70% Value Area ($${formatP(
          volumeProfile.val
        )} – $${formatP(volumeProfile.vah)}) with Point of Control (POC) at $${formatP(
          volumeProfile.poc
        )} and Session RVOL at ${sesRvol.toFixed(2)}x (${
          sesRvol <= 0.45
            ? 'VDU Seller Exhaustion'
            : sesRvol >= 2.0
            ? 'Institutional Volume Ignition'
            : 'Normal Session Participation'
        }).`,
        setup: lensSetups[3] || lensSetups[1],
      },
      3: {
        score: s3Conf.score,
        bias: s3Conf.bias,
        dotColor: getStatusColor(s3Conf.score),
        status: getStatusLabel(s3Conf.score),
        headline: `${maResult.ribbonAlignment} • Stretch ${maResult.stretchScoreAtr >= 0 ? '+' : ''}${maResult.stretchScoreAtr.toFixed(2)} ATR`,
        takeaway: `Moving averages show ${maResult.ribbonAlignment} with Session VWAP at $${formatP(
          maResult.mas.vwap.price
        )}. ATR Stretch is ${maResult.stretchScoreAtr.toFixed(2)} ATR (${
          Math.abs(maResult.stretchScoreAtr) >= 2.0
            ? 'Overextended — wait for a pullback toward the 21 EMA before entering'
            : 'Healthy — price is tracking near dynamic moving average support/resistance'
        }).`,
        setup: lensSetups[2] || lensSetups[1],
      },
      4: {
        score: s4Score,
        bias: s4Bias,
        dotColor: getStatusColor(s4Score),
        status: getStatusLabel(s4Score),
        headline: `AMD: ${amdPhase.phase} • CVD ${telemetry.cvdDelta >= 0 ? '+' : ''}${Math.round(
          telemetry.cvdDelta
        )}`,
        takeaway: `Smart Money cycle is in ${amdPhase.phase}. ${
          bullOB
            ? `Unmitigated Bull OB 50% Mean Threshold sits at $${formatP(bullOB.midpoint)} (Q:${
                bullOB.qualityScore ?? 82
              }/100). `
            : ''
        }${
          telemetry.spotPerpDivergence?.headline ||
          (telemetry.cvdDelta >= 0
            ? 'Taker buyers are absorbing passive supply.'
            : 'Taker sellers are pressing the orderbook.')
        }`,
        setup: lensSetups[4] || lensSetups[3] || lensSetups[1],
      },
      5: {
        score: s5Conf.score,
        bias: s5Conf.bias,
        dotColor: getStatusColor(s5Conf.score),
        status: getStatusLabel(s5Conf.score),
        headline: `Hurst ${(candlestickResult.marketRegime?.hurstExponent ?? 0.5).toFixed(
          2
        )} • GEX ${telemetry.netGex >= 0 ? '+' : ''}$${telemetry.netGex}M`,
        takeaway: `Statistical regime prints Hurst H=${(
          candlestickResult.marketRegime?.hurstExponent ?? 0.5
        ).toFixed(2)} & ADX=${(candlestickResult.marketRegime?.adx14 ?? 22).toFixed(1)} (${
          candlestickResult.marketRegime?.regimeHeadline || 'Range Rotation'
        }) with Rolling Sharpe ${(sharpeSortino?.sharpeRatio ?? 1.0).toFixed(
          2
        )}. Options dealers hold ${telemetry.netGex >= 0 ? '+' : ''}$${
          telemetry.netGex
        }M Net GEX with Zero-Gamma Flip at $${formatP(
          optionsData.zeroGammaLevel || optionsData.maxPain
        )}.`,
        setup: lensSetups[5] || lensSetups[1],
      },
      6: {
        score: avgFunnelScore,
        bias: s6Bias,
        dotColor: getStatusColor(avgFunnelScore),
        status: getStatusLabel(avgFunnelScore),
        headline: `${avgFunnelScore}% 5-Stage Funnel Confluence (${s6Bias})`,
        takeaway: `All 5 upstream stages synthesize into a ${avgFunnelScore}% ${s6Bias} funnel rating. Verify the 5-Point Pre-Flight Checklist and size your Maker Limit or Taker Market order below.`,
        setup: lensSetups[selectedSetupLensId] || lensSetups[1],
      },
    };
  }, [
    klines,
    telemetry,
    currentPrice,
    volumeProfile,
    lensConfidences,
    candlestickResult,
    liquidity,
    symbol,
    lensSetups,
    maResult,
    amdPhase,
    bullOB,
    sharpeSortino,
    optionsData,
    confluence.score,
    selectedSetupLensId,
  ]);

  const isStageLearnOpen = (stageId: number) =>
    stageId in openLearnStages ? openLearnStages[stageId] : false;

  const toggleStageLearn = (stageId: number) => {
    setOpenLearnStages((prev) => ({
      ...prev,
      [stageId]: !isStageLearnOpen(stageId),
    }));
  };

  // Reusable Visual Benchmark Range Strip Component
  const renderBenchmarkRangeStrip = (
    pct: number,
    markerColor: string,
    leftLabel: string,
    centerLabel: string,
    rightLabel: string
  ) => {
    const clampedPct = Math.max(4, Math.min(96, pct));
    return (
      <div className="flex flex-col gap-1.5 pt-2">
        <div
          className={`relative w-full h-1.5 rounded-full overflow-hidden ${
            isLight ? 'bg-[#e2e8f0]' : 'bg-[#090d16]'
          }`}
        >
          <div
            className="absolute inset-y-0 left-0 opacity-35 rounded-full"
            style={{
              width: `${clampedPct}%`,
              backgroundColor: markerColor,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-1.5 -ml-0.5 rounded-full"
            style={{
              left: `${clampedPct}%`,
              backgroundColor: markerColor,
            }}
          />
        </div>
        <div
          className={`flex items-center justify-between font-mono text-[10px] tabular-nums ${
            isLight ? 'text-[#64748b]' : 'text-[#64748b]'
          }`}
        >
          <span>{leftLabel}</span>
          <span className={`font-medium ${isLight ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>
            {centerLabel}
          </span>
          <span>{rightLabel}</span>
        </div>
      </div>
    );
  };

  // Rule B: Clean Stage Verdict Header (Used in Stages 1–5)
  const renderStageVerdictBanner = (stageDef: StageDefinition) => {
    const evalData = stageEvaluations[stageDef.id as 1 | 2 | 3 | 4 | 5];
    const biasWord =
      evalData.bias === 'BULLISH'
        ? 'Bullish'
        : evalData.bias === 'BEARISH'
        ? 'Bearish'
        : 'Neutral';

    return (
      <div className="cyber-panel p-4 flex flex-col gap-3">
        {/* Top Row: Stage Title + Question on left, Bias Badge on right */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-sans text-[13px] font-semibold ${
                  isLight ? 'text-[#0f172a]' : 'text-[#f8fafc]'
                }`}
              >
                {stageDef.stepperLabel} — {stageDef.fullTitle}
              </span>
              <span
                className={`font-mono text-[11px] ${
                  isLight ? 'text-[#64748b]' : 'text-[#64748b]'
                }`}
              >
                {stageDef.subtitle}
              </span>
            </div>
            <h3
              className={`font-sans text-[14px] font-medium leading-snug ${
                isLight ? 'text-[#334155]' : 'text-[#94a3b8]'
              }`}
            >
              {stageDef.question}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SignalBiasPill
              bias={evalData.bias}
              label={`${biasWord} ${evalData.score}%`}
              size="sm"
            />
          </div>
        </div>

        {/* Concise 1-sentence summary + two clean text buttons */}
        <div
          className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight ? 'border-[#e2e8f0]' : 'border-white/[0.06]'
          }`}
        >
          <p
            className={`font-sans text-[13px] leading-relaxed flex-1 ${
              isLight ? 'text-[#1e293b]' : 'text-[#cbd5e1]'
            }`}
          >
            {evalData.takeaway}
          </p>

          <div className="flex items-center gap-2 shrink-0 font-sans text-[12px]">
            <button
              type="button"
              onClick={(e) =>
                toggleTrackPrice(
                  e,
                  `${stageDef.shortTitle} Entry`,
                  evalData.setup.suggestedEntry
                )
              }
              className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
                isPriceTracked(evalData.setup.suggestedEntry)
                  ? 'bg-[#3b82f6]/15 text-[#60a5fa] border-[#3b82f6]/40'
                  : isLight
                  ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                  : 'bg-[#171c28] hover:bg-[#1e2536] text-[#e2e8f0] border-white/[0.08]'
              }`}
            >
              {isPriceTracked(evalData.setup.suggestedEntry)
                ? `Highlighted ($${formatP(evalData.setup.suggestedEntry)})`
                : 'Highlight on Chart'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (stageDef.id <= 5) {
                  setSelectedSetupLensId(stageToLensMap[stageDef.id] || 1);
                }
                onLoadSetup(
                  evalData.setup.suggestedEntry,
                  evalData.setup.invalidationPrice,
                  evalData.setup.target1Price,
                  evalData.setup.target2Price
                );
                handleStageSelect(6);
              }}
              className="px-3 py-1.5 bg-[#6366f1]/15 hover:bg-[#6366f1]/25 text-[#a5b4fc] border border-[#6366f1]/30 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Load Setup
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Bottom Stage Navigation & Cleanly Collapsed Learn Accordion
  const renderStageFooterAndLearn = (stageDef: StageDefinition) => {
    const learnOpen = isStageLearnOpen(stageDef.id);
    const prevStage = stageDef.id > 1 ? STAGES[stageDef.id - 2] : null;
    const nextStage = stageDef.id < 6 ? STAGES[stageDef.id] : null;

    return (
      <div className="flex flex-col gap-3 pt-1">
        {/* Collapsible Learn & Study Links Accordion */}
        <div className="cyber-panel overflow-hidden">
          <button
            type="button"
            onClick={() => toggleStageLearn(stageDef.id)}
            className="w-full px-4 py-2.5 flex items-center justify-between gap-2 font-sans text-[12px] font-medium text-[#94a3b8] hover:text-[#f8fafc] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>Learn &amp; Study Links ({stageDef.shortTitle})</span>
              {experienceMode === 'rookie' && (
                <span className="px-1.5 py-0.5 rounded bg-[#3b82f6]/15 border border-[#3b82f6]/30 font-mono text-[10px] text-[#60a5fa]">
                  Rookie Guide
                </span>
              )}
            </span>
            <span className="font-mono text-[11px]">{learnOpen ? 'Hide ▴' : 'Learn & Study Links ▾'}</span>
          </button>

          <AnimatePresence initial={false}>
            {learnOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden border-t border-white/[0.06] bg-[#0d1017] p-4 flex flex-col gap-3"
              >
                <div className="divide-y divide-white/[0.06]">
                  {stageDef.mentorKeys.map((mKey) => {
                    const mentor = getRookieMentorGuide(mKey, symbol);
                    return (
                      <div key={mKey} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-sans text-[12px] font-semibold text-[#f8fafc] capitalize">
                            {mKey.replace(/_/g, ' ')} — Mental Model
                          </span>
                          <span className="font-mono text-[11px] text-[#64748b]">
                            Norm: {mentor.standardRangeGuide.normal}
                          </span>
                        </div>
                        <p className="font-sans text-[12.5px] text-[#94a3b8] leading-relaxed">
                          <strong className="text-[#f8fafc] font-medium">Analogy: </strong>
                          {mentor.familiarBridge}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans text-[12px] pt-1">
                          <div className="rounded-md p-2.5 bg-[#12161f] border border-white/[0.06] text-[#cbd5e1]">
                            <strong className="text-[#10b981] font-mono text-[11px]">DO: </strong>
                            {mentor.rookieActionRule.doThis}
                          </div>
                          <div className="rounded-md p-2.5 bg-[#12161f] border border-white/[0.06] text-[#cbd5e1]">
                            <strong className="text-[#f43f5e] font-mono text-[11px]">AVOID: </strong>
                            {mentor.rookieActionRule.avoidTrap}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* External Study References */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-[#64748b] uppercase">
                      Study References:
                    </span>
                    {stageDef.studyLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-md bg-[#12161f] hover:bg-[#171c28] border border-white/[0.07] text-[#94a3b8] hover:text-[#f8fafc] font-sans text-[11px] transition-colors"
                      >
                        {link.label} ({link.source}) ↗
                      </a>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('CODEX');
                      setShowReverseXRay(true);
                      onToggleWorkspaceExpand?.(true);
                    }}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-[#171c28] hover:bg-[#1e2536] border border-white/[0.08] text-[#f8fafc] font-sans cursor-pointer transition-colors"
                  >
                    Open Learn &amp; X-Ray →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sequential Stage Stepper Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap cyber-panel px-4 py-2.5 font-sans text-[12px]">
          <div>
            {prevStage ? (
              <button
                type="button"
                onClick={() => handleStageSelect(prevStage.id)}
                className="font-medium px-3 py-1.5 rounded-md bg-[#171c28] hover:bg-[#1e2536] text-[#cbd5e1] border border-white/[0.08] transition-colors cursor-pointer"
              >
                ← {prevStage.stepperLabel}
              </button>
            ) : (
              <span className="text-[11px] text-[#64748b] font-mono">
                Stage 1 of 6
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stageDef.id < 6 && (
              <button
                type="button"
                onClick={() => {
                  setShowReverseXRay(false);
                  handleStageSelect(6);
                  onToggleWorkspaceExpand?.(false);
                }}
                className="font-medium px-3 py-1.5 rounded-md bg-[#171c28] hover:bg-[#1e2536] text-[#cbd5e1] border border-white/[0.08] transition-colors cursor-pointer"
              >
                Execute &amp; Size
              </button>
            )}

            {nextStage && (
              <button
                type="button"
                onClick={() => handleStageSelect(nextStage.id)}
                className="px-3.5 py-1.5 bg-[#6366f1]/15 hover:bg-[#6366f1]/25 text-[#a5b4fc] border border-[#6366f1]/30 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Next: {nextStage.stepperLabel} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // STAGE 1 CONTENT: PRICE & STRUCTURE (Hairline Key-Value List)
  // ============================================================================
  const renderStage01Price = () => {
    const wickPct = Math.round((candlestickResult.anatomy?.wickRejectionRatio || 0.5) * 100);
    const clvPct = Math.round(candlestickResult.anatomy?.clvPct || 50);
    const bodyAtr = candlestickResult.anatomy?.bodyToAtrRatio || 0.8;
    const srLow = liquidity?.srLow || volumeProfile.val || currentPrice * 0.985;
    const srHigh = liquidity?.srHigh || volumeProfile.vah || currentPrice * 1.015;
    const distLowPct = currentPrice > 0 ? ((currentPrice - srLow) / currentPrice) * 100 : 1.0;
    const distHighPct = currentPrice > 0 ? ((srHigh - currentPrice) / currentPrice) * 100 : 1.0;
    const rangePositionPct =
      srHigh > srLow ? ((currentPrice - srLow) / (srHigh - srLow)) * 100 : 50;

    const visiblePatterns = filterOnlyKeyLevels
      ? candlestickResult.recentPatterns.filter((p) => p.isAtKeyLevel)
      : candlestickResult.recentPatterns;

    const primaryBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      candlestickResult.primaryPattern?.bias === 'BULLISH'
        ? 'BULLISH'
        : candlestickResult.primaryPattern?.bias === 'BEARISH'
        ? 'BEARISH'
        : 'NEUTRAL';

    const clvBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      clvPct >= 65 ? 'BULLISH' : clvPct <= 35 ? 'BEARISH' : 'NEUTRAL';

    const wickBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      wickPct >= 50
        ? clvPct >= 50
          ? 'BULLISH'
          : 'BEARISH'
        : 'NEUTRAL';

    return (
      <div className="flex flex-col p-4 gap-3.5">
        {renderStageVerdictBanner(STAGES[0])}

        {/* Hairline Metric List Card: Candle Anatomy & Support/Resistance */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-[13px] font-semibold text-[#f8fafc]">
              Price Action &amp; Structural Levels
            </span>
            <span className="font-mono text-[11px] text-[#64748b] tabular-nums">
              Spot: ${formatP(currentPrice)}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] font-mono text-[12px] tabular-nums">
            {/* Row 1: Primary Candlestick Pattern */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Primary Candlestick Pattern
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  {candlestickResult.primaryPattern?.description || 'Active bar formation'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">
                  {candlestickResult.primaryPattern?.name || 'Neutral Bar'} ({candlestickResult.primaryPattern?.quality ?? 68}%)
                </span>
                <SignalBiasPill bias={primaryBias} />
              </div>
            </div>

            {/* Row 2: Wick Rejection Ratio */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Wick Rejection Ratio
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  {wickPct >= 55 ? 'Strong limit absorption tail' : 'Standard intrabar wick'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">{wickPct}%</span>
                <SignalBiasPill bias={wickBias} />
              </div>
            </div>

            {/* Row 3: Close Location Value (CLV) */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Close Location Value (CLV) &amp; Body Impulse
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Where candle closed within its High–Low range
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">
                  {clvPct}% CLV • {bodyAtr.toFixed(2)}x ATR
                </span>
                <SignalBiasPill bias={clvBias} />
              </div>
            </div>

            {/* Row 4: Nearest Structural Support (SR Low) */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'Support (SR Low)', srLow)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Structural Support (SR Low)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Click to highlight level on chart ({distLowPct.toFixed(2)}% below spot)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#10b981] font-semibold">${formatP(srLow)}</span>
                <SignalBiasPill
                  bias={distLowPct <= 1.2 ? 'BULLISH' : 'NEUTRAL'}
                  label={distLowPct <= 1.2 ? 'BULLISH DEMAND' : 'SUPPORT'}
                />
              </div>
            </div>

            {/* Row 5: Nearest Structural Resistance (SR High) */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'Resistance (SR High)', srHigh)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Structural Resistance (SR High)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Click to highlight level on chart ({distHighPct.toFixed(2)}% above spot)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f43f5e] font-semibold">${formatP(srHigh)}</span>
                <SignalBiasPill
                  bias={distHighPct <= 1.2 ? 'BEARISH' : 'NEUTRAL'}
                  label={distHighPct <= 1.2 ? 'BEARISH SUPPLY' : 'RESISTANCE'}
                />
              </div>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            rangePositionPct,
            rangePositionPct <= 30 ? '#10b981' : rangePositionPct >= 70 ? '#f43f5e' : '#3b82f6',
            `Support $${formatP(srLow)}`,
            `Range Position: ${rangePositionPct.toFixed(0)}%`,
            `Resistance $${formatP(srHigh)}`
          )}

          {/* Optional Multi-Bar Pattern Scanner Drawer */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowFullPatternScanner((prev) => !prev)}
              className="font-sans text-[12px] font-medium text-[#60a5fa] hover:text-[#93c5fd] cursor-pointer"
            >
              {showFullPatternScanner
                ? 'Hide Recent Candlestick History ▴'
                : `View Recent Candlestick History (${candlestickResult.recentPatterns.length}) ▾`}
            </button>

            {showFullPatternScanner && (
              <button
                type="button"
                onClick={() => setFilterOnlyKeyLevels((prev) => !prev)}
                className={`px-2.5 py-1 rounded border font-mono text-[10px] cursor-pointer ${
                  filterOnlyKeyLevels
                    ? 'bg-[#3b82f6]/15 text-[#60a5fa] border-[#3b82f6]/40'
                    : 'bg-[#171c28] text-[#94a3b8] border-white/[0.08]'
                }`}
              >
                {filterOnlyKeyLevels ? 'Showing Key Level Hits Only' : 'Filter: Key Levels Only'}
              </button>
            )}
          </div>

          {showFullPatternScanner && (
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06] pt-1 font-mono text-[11px]">
              {visiblePatterns.slice(0, 6).map((pat, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#f8fafc] font-semibold">{pat.name}</span>
                    <span className="text-[#64748b] text-[10px]">
                      {pat.barsAgo === 0 ? 'Current Bar' : `${pat.barsAgo}b ago`} • {pat.testedLevelName || 'Structure'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#94a3b8]">Q:{pat.quality}%</span>
                    <SignalBiasPill bias={pat.bias} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {renderStageFooterAndLearn(STAGES[0])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 2 CONTENT: VOLUME & VALUE AREA (Hairline Key-Value List)
  // ============================================================================
  const renderStage02Volume = () => {
    const rvols = calculateRVOL(klines);
    const curRvol = rvols[rvols.length - 1] || 1.0;
    const sesRvol = telemetry.sessionRvol || curRvol;
    const isDiscount = currentPrice < volumeProfile.val;
    const isPremium = currentPrice > volumeProfile.vah;
    const vaWidth = Math.max(volumeProfile.vah - volumeProfile.val, currentPrice * 0.005);
    const vaPosPct = ((currentPrice - volumeProfile.val) / vaWidth) * 100;

    return (
      <div className="flex flex-col p-4 gap-3.5">
        {renderStageVerdictBanner(STAGES[1])}

        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-[13px] font-semibold text-[#f8fafc]">
              Volume Profile (70% Value Area) &amp; Relative Volume
            </span>
            <span className="font-mono text-[11px] text-[#64748b]">
              {isDiscount ? 'Discount Zone' : isPremium ? 'Premium Zone' : 'Inside Value Area'}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] font-mono text-[12px] tabular-nums">
            {/* VAL */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'Value Area Low (VAL)', volumeProfile.val)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Value Area Low (VAL — 70% Lower Boundary)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Institutional discount boundary — click to highlight on chart
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#10b981] font-semibold">${formatP(volumeProfile.val)}</span>
                <SignalBiasPill
                  bias={currentPrice <= volumeProfile.val * 1.003 ? 'BULLISH' : 'NEUTRAL'}
                  label={currentPrice <= volumeProfile.val * 1.003 ? 'DISCOUNT BID' : 'VAL'}
                />
              </div>
            </div>

            {/* POC */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'Point of Control (POC)', volumeProfile.poc)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Point of Control (POC — Peak Traded Volume)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Highest volume price magnet — click to highlight on chart
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f59e0b] font-semibold">${formatP(volumeProfile.poc)}</span>
                <SignalBiasPill
                  bias={currentPrice >= volumeProfile.poc ? 'BULLISH' : 'BEARISH'}
                  label={currentPrice >= volumeProfile.poc ? 'ABOVE POC' : 'BELOW POC'}
                />
              </div>
            </div>

            {/* VAH */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'Value Area High (VAH)', volumeProfile.vah)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Value Area High (VAH — 70% Upper Boundary)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Institutional premium boundary — click to highlight on chart
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f43f5e] font-semibold">${formatP(volumeProfile.vah)}</span>
                <SignalBiasPill
                  bias={currentPrice >= volumeProfile.vah * 0.997 ? 'BEARISH' : 'NEUTRAL'}
                  label={currentPrice >= volumeProfile.vah * 0.997 ? 'PREMIUM SUPPLY' : 'VAH'}
                />
              </div>
            </div>

            {/* Session RVOL */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Time-of-Day Session RVOL
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  {sesRvol <= 0.45
                    ? 'VDU seller exhaustion (< 0.45x)'
                    : sesRvol >= 2.0
                    ? 'Institutional volume expansion (> 2.0x)'
                    : 'Normal session volume participation'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">{sesRvol.toFixed(2)}x</span>
                <SignalBiasPill
                  bias={
                    sesRvol >= 1.5
                      ? telemetry.cvdDelta >= 0
                        ? 'BULLISH'
                        : 'BEARISH'
                      : sesRvol <= 0.45
                      ? 'BULLISH'
                      : 'NEUTRAL'
                  }
                />
              </div>
            </div>

            {/* Rolling 20-Bar RVOL */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Rolling 20-Bar Relative Volume
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Current candle volume vs 20-bar moving average
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">{curRvol.toFixed(2)}x</span>
                <SignalBiasPill
                  bias={
                    curRvol >= 1.4
                      ? telemetry.cvdDelta >= 0
                        ? 'BULLISH'
                        : 'BEARISH'
                      : 'NEUTRAL'
                  }
                />
              </div>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            vaPosPct,
            isDiscount ? '#10b981' : isPremium ? '#f43f5e' : '#3b82f6',
            `VAL $${formatP(volumeProfile.val)}`,
            `POC $${formatP(volumeProfile.poc)}`,
            `VAH $${formatP(volumeProfile.vah)}`
          )}
        </div>

        {renderStageFooterAndLearn(STAGES[1])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 3 CONTENT: MOVING AVERAGES & TREND (Hairline Key-Value List)
  // ============================================================================
  const renderStage03Trend = () => {
    const stretch = maResult.stretchScoreAtr;
    const stretchPct = ((stretch + 3) / 6) * 100;
    const ribbonBiasNormalized: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      maResult.ribbonBias === 'BULLISH'
        ? 'BULLISH'
        : maResult.ribbonBias === 'BEARISH'
        ? 'BEARISH'
        : 'NEUTRAL';

    const maRows = [
      { label: 'EMA 9 (Fast Momentum)', data: maResult.mas.ema9 },
      { label: 'EMA 21 (Dynamic Pullback Trigger)', data: maResult.mas.ema21 },
      { label: 'EMA 50 (Intermediate Trend Baseline)', data: maResult.mas.ema50 },
      { label: 'EMA 200 (Macro Institutional Bias)', data: maResult.mas.ema200 },
      { label: 'Session VWAP (Volume-Weighted Fair Price)', data: maResult.mas.vwap },
    ];

    return (
      <div className="flex flex-col p-4 gap-3.5">
        {renderStageVerdictBanner(STAGES[2])}

        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-sans text-[13px] font-semibold text-[#f8fafc]">
              EMA Ribbon Stack, Session VWAP &amp; ATR Stretch
            </span>
            <SignalBiasPill
              bias={ribbonBiasNormalized}
              label={`${maResult.ribbonAlignment}`}
            />
          </div>

          <div className="divide-y divide-white/[0.06] font-mono text-[12px] tabular-nums">
            {maRows.map((row, idx) => {
              const above = row.data.distancePct >= 0;
              return (
                <div
                  key={idx}
                  onClick={(e) => toggleTrackPrice(e, row.label, row.data.price)}
                  className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                      {row.label}
                    </span>
                    <span className="font-sans text-[11px] text-[#64748b]">
                      Status: {row.data.status} ({row.data.distancePct >= 0 ? '+' : ''}
                      {row.data.distancePct.toFixed(2)}% from spot)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#f8fafc] font-semibold">${formatP(row.data.price)}</span>
                    <SignalBiasPill
                      bias={above ? 'BULLISH' : 'BEARISH'}
                      label={above ? 'ABOVE' : 'BELOW'}
                    />
                  </div>
                </div>
              );
            })}

            {/* ATR Rubber-Band Stretch Row */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  ATR Rubber-Band Stretch (Distance from EMA 21)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  {maResult.overextensionStatus} — values beyond ±2.0 ATR signal mean-reversion risk
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">
                  {stretch >= 0 ? '+' : ''}
                  {stretch.toFixed(2)} ATR
                </span>
                <SignalBiasPill
                  bias={
                    stretch <= -1.8
                      ? 'BULLISH'
                      : stretch >= 1.8
                      ? 'BEARISH'
                      : ribbonBiasNormalized
                  }
                />
              </div>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            stretchPct,
            Math.abs(stretch) >= 2.0 ? '#f43f5e' : '#10b981',
            '-3.0 ATR (Oversold)',
            `Current: ${stretch >= 0 ? '+' : ''}${stretch.toFixed(2)} ATR`,
            '+3.0 ATR (Overbought)'
          )}
        </div>

        {/* Multi-Timeframe Alignment Matrix */}
        <ConfluenceMatrix matrix={matrix} confluence={confluence} />

        {renderStageFooterAndLearn(STAGES[2])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 4 CONTENT: ORDERFLOW & SMART MONEY (Hairline Key-Value List)
  // ============================================================================
  const renderStage04Orderflow = () => {
    const spotPerp = telemetry.spotPerpDivergence;

    return (
      <div className="flex flex-col p-4 gap-3.5">
        {renderStageVerdictBanner(STAGES[3])}

        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-[13px] font-semibold text-[#f8fafc]">
              Institutional Order Blocks, CVD Delta &amp; Spot vs Perp Basis
            </span>
            <span className="font-mono text-[11px] text-[#64748b]">
              AMD Phase: {amdPhase.phase}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] font-mono text-[12px] tabular-nums">
            {/* Bullish Order Block */}
            <div
              onClick={(e) => bullOB && toggleTrackPrice(e, 'Bull OB 50% Mean', bullOB.midpoint)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Unmitigated Bullish Order Block (50% Mean Threshold)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  {bullOB
                    ? `Range $${formatP(bullOB.low)} – $${formatP(bullOB.high)} • Displacement ${bullOB.displacementAtrRatio ?? bullOB.impulseAtrMultiple ?? 1.8}x ATR`
                    : 'No unmitigated bullish footprint in active window'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#10b981] font-semibold">
                  {bullOB ? `$${formatP(bullOB.midpoint)} (Q:${bullOB.qualityScore ?? 80})` : 'None'}
                </span>
                <SignalBiasPill bias={bullOB ? 'BULLISH' : 'NEUTRAL'} />
              </div>
            </div>

            {/* Bearish Order Block */}
            <div
              onClick={(e) => bearOB && toggleTrackPrice(e, 'Bear OB 50% Mean', bearOB.midpoint)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Unmitigated Bearish Order Block (50% Mean Threshold)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  {bearOB
                    ? `Range $${formatP(bearOB.low)} – $${formatP(bearOB.high)} • Displacement ${bearOB.displacementAtrRatio ?? bearOB.impulseAtrMultiple ?? 1.8}x ATR`
                    : 'No unmitigated bearish footprint in active window'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f43f5e] font-semibold">
                  {bearOB ? `$${formatP(bearOB.midpoint)} (Q:${bearOB.qualityScore ?? 80})` : 'None'}
                </span>
                <SignalBiasPill bias={bearOB ? 'BEARISH' : 'NEUTRAL'} />
              </div>
            </div>

            {/* Cumulative Volume Delta (CVD) */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Cumulative Volume Delta (CVD) &amp; Aggression
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Net market buy minus market sell taker volume
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-semibold ${
                    telemetry.cvdDelta >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                  }`}
                >
                  {telemetry.cvdDelta >= 0 ? '+' : ''}
                  {Math.round(telemetry.cvdDelta).toLocaleString()}
                </span>
                <SignalBiasPill
                  bias={
                    telemetry.cvdDelta > 0
                      ? 'BULLISH'
                      : telemetry.cvdDelta < 0
                      ? 'BEARISH'
                      : 'NEUTRAL'
                  }
                />
              </div>
            </div>

            {/* Spot vs Perp Basis Flow */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Spot vs Perpetual Futures CVD Divergence
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  {spotPerp?.headline || 'Comparing cash Spot flow against leveraged Perp flow'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">
                  {spotPerp?.flowRegime ? spotPerp.flowRegime.replace(/_/g, ' ') : 'SYNCHRONIZED'}
                </span>
                <SignalBiasPill
                  bias={
                    spotPerp?.flowRegime === 'SPOT_DRIVEN_EXPANSION' ||
                    spotPerp?.flowRegime === 'SPOT_ABSORPTION_ACCUMULATION'
                      ? 'BULLISH'
                      : spotPerp?.flowRegime === 'LEVERAGE_TRAP_LONG' ||
                        spotPerp?.flowRegime === 'LEVERAGE_TRAP_SHORT'
                      ? 'BEARISH'
                      : 'NEUTRAL'
                  }
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06]">
            <AsciiOrderflowBar
              buyRatio={
                volumeProfile.totalAskVolume && volumeProfile.totalBidVolume
                  ? volumeProfile.totalAskVolume /
                    Math.max(1, volumeProfile.totalAskVolume + volumeProfile.totalBidVolume)
                  : telemetry.cvdDelta >= 0
                  ? 0.58
                  : 0.42
              }
            />
          </div>
        </div>

        {/* Wyckoff AMD Cycle Component */}
        <AMDPhaseEngine amdPhase={amdPhase} symbol={symbol} />

        {renderStageFooterAndLearn(STAGES[3])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 5 CONTENT: QUANT & DERIVATIVES (Hairline Key-Value List)
  // ============================================================================
  const renderStage05Quant = () => {
    const hurst = candlestickResult.marketRegime?.hurstExponent ?? 0.5;
    const adx = candlestickResult.marketRegime?.adx14 ?? 22;
    const vwmaZ = telemetry.zScore ?? 0;
    const sharpe = sharpeSortino?.sharpeRatio ?? 1.0;
    const sortino = sharpeSortino?.sortinoRatio ?? 1.25;
    const zeroGamma = optionsData.zeroGammaLevel || optionsData.maxPain;

    return (
      <div className="flex flex-col p-4 gap-3.5">
        {renderStageVerdictBanner(STAGES[4])}

        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-[13px] font-semibold text-[#f8fafc]">
              Statistical Regime Math &amp; Options Dealer Positioning
            </span>
            <span className="font-mono text-[11px] text-[#64748b]">
              {candlestickResult.marketRegime?.regimeHeadline || 'Balanced Regime'}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] font-mono text-[12px] tabular-nums">
            {/* Hurst Exponent & Wilder ADX */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Hurst Exponent (H) &amp; Wilder ADX(14)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  H &gt; 0.55 persistent trend • H &lt; 0.45 mean reversion • ADX &gt; 25 strong trend
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">
                  H={hurst.toFixed(2)} • ADX={adx.toFixed(1)}
                </span>
                <SignalBiasPill
                  bias={
                    hurst >= 0.55 && adx >= 25
                      ? maResult.ribbonBias === 'BEARISH'
                        ? 'BEARISH'
                        : 'BULLISH'
                      : 'NEUTRAL'
                  }
                  label={hurst >= 0.55 ? 'TRENDING' : hurst <= 0.45 ? 'MEAN REVERT' : 'ROTATION'}
                />
              </div>
            </div>

            {/* VWMA Z-Score */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  20-Bar VWMA Z-Score (Statistical Deviation)
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                   Beyond ±2.0σ indicates 95% statistical exhaustion
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">
                  {vwmaZ >= 0 ? '+' : ''}
                  {vwmaZ.toFixed(2)}σ
                </span>
                <SignalBiasPill
                  bias={vwmaZ <= -1.8 ? 'BULLISH' : vwmaZ >= 1.8 ? 'BEARISH' : 'NEUTRAL'}
                />
              </div>
            </div>

            {/* Rolling Sharpe & Sortino */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Rolling Sharpe &amp; Sortino Risk-Adjusted Return
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  {sharpeSortino?.sharpeRegime || 'Return per unit of total and downside volatility'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">
                  Sharpe {sharpe.toFixed(2)} • Sortino {sortino.toFixed(2)}
                </span>
                <SignalBiasPill
                  bias={sharpe >= 1.0 ? 'BULLISH' : sharpe < 0 ? 'BEARISH' : 'NEUTRAL'}
                />
              </div>
            </div>

            {/* Net Dealer GEX & Zero-Gamma Flip */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'Zero-Gamma Flip', zeroGamma)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Options Dealer Net GEX &amp; Zero-Gamma Level
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Zero-Gamma at ${formatP(zeroGamma)} • Call Wall ${formatP(optionsData.callWall)} • Put Wall ${formatP(optionsData.putWall)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-semibold ${
                    telemetry.netGex >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                  }`}
                >
                  {telemetry.netGex >= 0 ? '+' : ''}${telemetry.netGex}M GEX
                </span>
                <SignalBiasPill
                  bias={telemetry.netGex >= 0 ? 'BULLISH' : 'BEARISH'}
                  label={telemetry.netGex >= 0 ? 'LONG GAMMA' : 'SHORT GAMMA'}
                />
              </div>
            </div>

            {/* Perp Funding & Open Interest Delta */}
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-sans text-[12.5px] text-[#cbd5e1] font-medium">
                  Perpetual Funding Rate &amp; Open Interest Delta
                </span>
                <span className="font-sans text-[11px] text-[#64748b]">
                  Negative funding with rising OI signals short-squeeze fuel
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#f8fafc] font-semibold">
                  {(telemetry.fundingRate * 100).toFixed(4)}% • OI {telemetry.oi4hDelta >= 0 ? '+' : ''}
                  {telemetry.oi4hDelta.toFixed(2)}%
                </span>
                <SignalBiasPill
                  bias={
                    telemetry.fundingRate < 0
                      ? 'BULLISH'
                      : telemetry.fundingRate > 0.02
                      ? 'BEARISH'
                      : 'NEUTRAL'
                  }
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAiBriefInStage5((prev) => !prev)}
              className="font-sans text-[12px] font-medium text-[#60a5fa] hover:text-[#93c5fd] cursor-pointer"
            >
              {showAiBriefInStage5
                ? 'Hide Telemetry Cards & Quant Brief ▴'
                : 'Expand Full Telemetry Cards & Quant Synthesis ▾'}
            </button>
          </div>

          {showAiBriefInStage5 && (
            <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.06]">
              <TelemetryCards
                metrics={telemetry}
                symbol={symbol}
                experienceMode={experienceMode}
                onHoverLevel={onHoverLevel}
                highlightedLevel={highlightedLevel}
              />
              <SpeculationBrief
                brief={brief}
                isLoading={isBriefLoading}
                onRunQuant={onRunQuant}
                onCopyText={onCopyText}
              />
            </div>
          )}
        </div>

        {renderStageFooterAndLearn(STAGES[4])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 6 CONTENT: SUMMARY & EXECUTION SIZER
  // ============================================================================
  const renderStage06Execute = () => {
    const activeSetup = lensSetups[selectedSetupLensId] || lensSetups[1];

    return (
      <div className="flex flex-col p-4 gap-3.5">
        {/* 5-Stage Funnel Summary List */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-sans text-[14px] font-semibold text-[#f8fafc]">
                6. Summary &amp; Execution Sizer
              </h3>
              <p className="font-sans text-[12px] text-[#94a3b8]">
                Review all 5 analytical stages, select a setup template, and calculate exact position size.
              </p>
            </div>
            <SignalBiasPill
              bias={stageEvaluations[6].bias}
              label={`${stageEvaluations[6].score}% Funnel Alignment`}
              size="sm"
            />
          </div>

          <div className="divide-y divide-white/[0.06] font-mono text-[12px] tabular-nums">
            {([1, 2, 3, 4, 5] as const).map((sId) => {
              const st = STAGES[sId - 1];
              const ev = stageEvaluations[sId];
              return (
                <div
                  key={sId}
                  onClick={() => handleStageSelect(sId)}
                  className="py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-sans text-[12px] font-medium text-[#f8fafc] w-24 shrink-0">
                      {st.stepperLabel}
                    </span>
                    <span className="font-sans text-[12px] text-[#94a3b8] truncate">
                      {ev.headline}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[#cbd5e1] font-semibold">{ev.score}%</span>
                    <SignalBiasPill bias={ev.bias} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Setup Lens Selector Row */}
          <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-sans text-[12px] font-medium text-[#94a3b8]">
                Active Stage Setup Template:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap font-sans text-[11px]">
                {(
                  [
                    { id: 1, label: '1. Price S/R' },
                    { id: 3, label: '2. Volume Area' },
                    { id: 2, label: '3. MA Pullback' },
                    { id: 4, label: '4. Orderflow OB' },
                    { id: 5, label: '5. Quant GEX' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedSetupLensId(item.id);
                      const s = lensSetups[item.id];
                      if (s) {
                        onLoadSetup(
                          s.suggestedEntry,
                          s.invalidationPrice,
                          s.target1Price,
                          s.target2Price
                        );
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                      selectedSetupLensId === item.id
                        ? 'bg-[#3b82f6]/15 text-[#60a5fa] border-[#3b82f6]/40'
                        : 'bg-[#171c28] hover:bg-[#1e2536] text-[#94a3b8] border-white/[0.07]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {activeSetup && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] tabular-nums">
                <button
                  type="button"
                  onClick={(e) => toggleTrackPrice(e, 'Setup Entry', activeSetup.suggestedEntry)}
                  className="p-2.5 rounded-lg bg-[#0d1017] border border-white/[0.06] text-left hover:border-white/15 cursor-pointer"
                >
                  <span className="block text-[10px] text-[#64748b]">ENTRY</span>
                  <strong className="text-[#f8fafc] text-[13px]">
                    ${formatP(activeSetup.suggestedEntry)}
                  </strong>
                </button>
                <button
                  type="button"
                  onClick={(e) => toggleTrackPrice(e, 'Setup Stop', activeSetup.invalidationPrice)}
                  className="p-2.5 rounded-lg bg-[#0d1017] border border-white/[0.06] text-left hover:border-white/15 cursor-pointer"
                >
                  <span className="block text-[10px] text-[#64748b]">STOP LOSS</span>
                  <strong className="text-[#f43f5e] text-[13px]">
                    ${formatP(activeSetup.invalidationPrice)}
                  </strong>
                </button>
                <button
                  type="button"
                  onClick={(e) => toggleTrackPrice(e, 'Setup TP1', activeSetup.target1Price)}
                  className="p-2.5 rounded-lg bg-[#0d1017] border border-white/[0.06] text-left hover:border-white/15 cursor-pointer"
                >
                  <span className="block text-[10px] text-[#64748b]">TARGET 1 (TP1)</span>
                  <strong className="text-[#10b981] text-[13px]">
                    ${formatP(activeSetup.target1Price)}
                  </strong>
                </button>
                <button
                  type="button"
                  onClick={(e) => toggleTrackPrice(e, 'Setup TP2', activeSetup.target2Price)}
                  className="p-2.5 rounded-lg bg-[#0d1017] border border-white/[0.06] text-left hover:border-white/15 cursor-pointer"
                >
                  <span className="block text-[10px] text-[#64748b]">TARGET 2 (TP2)</span>
                  <strong className="text-[#10b981] text-[13px]">
                    ${formatP(activeSetup.target2Price)}
                  </strong>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 5-Point Pre-Flight Checklist & Paper Journal */}
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
          currentSetup={activeSetup}
          experienceMode={experienceMode}
          paperTrades={paperTrades}
          onAddPaperTrade={onAddPaperTrade}
          onRemovePaperTrade={onRemovePaperTrade}
        />

        {/* Position Sizer & Fee Drag Calculator */}
        <ExecutionHelper
          baseAsset={baseAsset}
          calc={calcResult}
          onRiskChange={onRiskChange}
          onEntryChange={onEntryChange}
          onStopChange={onStopChange}
          onCopyText={onCopyText}
          onHoverLevel={onHoverLevel}
          highlightedLevel={highlightedLevel}
        />

        {renderStageFooterAndLearn(STAGES[5])}
      </div>
    );
  };

  // ============================================================================
  // COMPACT ALL 6 STAGES VIEW
  // ============================================================================
  const renderCompactAllStack = () => {
    return (
      <div className="flex flex-col divide-y divide-white/[0.06]">
        {renderStage01Price()}
        {renderStage02Volume()}
        {renderStage03Trend()}
        {renderStage04Orderflow()}
        {renderStage05Quant()}
        {renderStage06Execute()}
      </div>
    );
  };

  // ============================================================================
  // RULE C: PLAYBOOKS (14) — SCANNABLE SUMMARY FIRST, EXPAND ON CLICK
  // ============================================================================
  const renderPlaybooksAndGannHub = () => {
    const sq9 = gannCyclesTelemetry.sq9Levels;

    const filteredModels = famousStrategies.filter((m) => {
      if (playbookFilter === 'ALL') return true;
      if (playbookFilter === 'READY') return m.possibilityScore >= 70;
      return m.era === playbookFilter;
    });

    const handleSpotlightAndLoadGannLevel = (
      e: React.MouseEvent,
      label: string,
      price: number,
      isSupport: boolean
    ) => {
      e.stopPropagation();
      if (!price || price <= 0) return;
      onHoverLevel?.({ label: `Gann ${label}`, price });
      const stopDist = price * 0.008;
      const entry = price;
      const stop = isSupport ? price - stopDist : price + stopDist;
      const tp1 = isSupport ? price + stopDist * 2.0 : price - stopDist * 2.0;
      const tp2 = isSupport ? price + stopDist * 3.5 : price - stopDist * 3.5;
      onLoadSetup(entry, stop, tp1, tp2);
    };

    return (
      <div className="flex flex-col p-4 gap-4">
        {/* Playbook Hub & Crane Strike 5-Gate Sequential Veto System */}
        <PlaybookHub
          symbol={symbol}
          htfCandles={infernoCandles}
          ltfCandles={infernoCandles}
          orderBlocks={orderBlockZones}
          volumeProfile={vpSnapshot}
          fundingRateZScore={telemetry?.fundingRate ? telemetry.fundingRate * 100 : 0}
          oiDeltaFlushPct={telemetry?.oi4hDelta || 0}
          onPlotTradeGeometry={(plan) => {
            if (onPlotTradeGeometry) {
              onPlotTradeGeometry(plan);
            } else {
              onLoadSetup(plan.entry, plan.stopLoss, plan.tp1, plan.tp1);
            }
          }}
        />

        {/* 1. Sleek 4-Column Compact Cyclical Context Bar */}
        <div className="flex flex-col gap-2">
          <div className="py-2.5 px-3 bg-[#12161f] rounded-lg border border-white/[0.07] grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px] tabular-nums">
            {/* Col 1: Lunar */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748b] uppercase font-sans font-medium">
                Lunar Cycle (SSRN)
              </span>
              <span className="text-[#f8fafc] font-semibold truncate">
                Lunar: {gannCyclesTelemetry.phaseName} ({gannCyclesTelemetry.illuminationPct}%)
              </span>
            </div>

            {/* Col 2: Solar */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748b] uppercase font-sans font-medium">
                Gann Solar Longitude
              </span>
              <span className="text-[#f8fafc] font-semibold truncate">
                Solar: {gannCyclesTelemetry.solarLongitudeDeg}° ({gannCyclesTelemetry.nearestCardinalLabel})
              </span>
            </div>

            {/* Col 3: Gann Sq9 + [ Gann Levels ▾ ] toggle */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-[#64748b] uppercase font-sans font-medium">
                  Gann Square of 9
                </span>
                <button
                  type="button"
                  onClick={() => setShowGannLevelsDrawer((prev) => !prev)}
                  className="text-[10px] text-[#60a5fa] hover:text-[#93c5fd] font-sans font-medium cursor-pointer"
                >
                  [ Gann Levels {showGannLevelsDrawer ? '▴' : '▾'} ]
                </button>
              </div>
              <span className="text-[#f8fafc] font-semibold truncate">
                Gann Sq9: {sq9.nearestSq9Label} (${formatP(sq9.nearestSq9Price)})
              </span>
            </div>

            {/* Col 4: Tape Counters */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748b] uppercase font-sans font-medium">
                Classical Tape
              </span>
              <span className="text-[#f8fafc] font-semibold truncate">
                Tape: TD {gannCyclesTelemetry.tdSequentialCount >= 0 ? `+${gannCyclesTelemetry.tdSequentialCount}` : gannCyclesTelemetry.tdSequentialCount} / {gannCyclesTelemetry.isNR7 ? 'NR7' : gannCyclesTelemetry.isNR4 ? 'NR4' : 'Wide'}
              </span>
            </div>
          </div>

          {/* Expandable Gann Square of 9 Harmonic Levels Drawer */}
          <AnimatePresence initial={false}>
            {showGannLevelsDrawer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-[#0d1017] rounded-lg border border-white/[0.07] grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] tabular-nums">
                  <button
                    type="button"
                    onClick={(e) => handleSpotlightAndLoadGannLevel(e, '-90° Sup', sq9.sup90, true)}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      isPriceTracked(sq9.sup90)
                        ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                        : 'bg-[#12161f] hover:bg-[#171c28] border-white/[0.06] text-[#cbd5e1]'
                    }`}
                  >
                    <span className="block text-[9.5px] text-[#64748b]">-90° HARMONIC SUP</span>
                    <strong className="text-[#10b981]">${formatP(sq9.sup90)}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSpotlightAndLoadGannLevel(e, '+90° Res', sq9.res90, false)}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      isPriceTracked(sq9.res90)
                        ? 'bg-[#f43f5e]/15 border-[#f43f5e]/40 text-[#f43f5e]'
                        : 'bg-[#12161f] hover:bg-[#171c28] border-white/[0.06] text-[#cbd5e1]'
                    }`}
                  >
                    <span className="block text-[9.5px] text-[#64748b]">+90° HARMONIC RES</span>
                    <strong className="text-[#f43f5e]">${formatP(sq9.res90)}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSpotlightAndLoadGannLevel(e, '-180° Sup', sq9.sup180, true)}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      isPriceTracked(sq9.sup180)
                        ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                        : 'bg-[#12161f] hover:bg-[#171c28] border-white/[0.06] text-[#cbd5e1]'
                    }`}
                  >
                    <span className="block text-[9.5px] text-[#64748b]">-180° OPPOSITION SUP</span>
                    <strong className="text-[#10b981]">${formatP(sq9.sup180)}</strong>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSpotlightAndLoadGannLevel(e, '+180° Res', sq9.res180, false)}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      isPriceTracked(sq9.res180)
                        ? 'bg-[#f43f5e]/15 border-[#f43f5e]/40 text-[#f43f5e]'
                        : 'bg-[#12161f] hover:bg-[#171c28] border-white/[0.06] text-[#cbd5e1]'
                    }`}
                  >
                    <span className="block text-[9.5px] text-[#64748b]">+180° OPPOSITION RES</span>
                    <strong className="text-[#f43f5e]">${formatP(sq9.res180)}</strong>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Top 3 Best Available Setups (Clean 3-Column Row) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-sans text-[13px] font-semibold text-[#f8fafc]">
              Top 3 Best Available Setups
            </span>
            <span className="font-mono text-[11px] text-[#64748b]">
              {readyPlaybooksCount} of 14 models ready on {symbol}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 tabular-nums">
            {top3PodiumStrategies.map((strat, idx) => {
              const rankLabels = ['#1 Best Match', '#2 Runner-Up', '#3 Alternative'];
              const avgR = strat.backtest250Bars.avgRealizedR;
              return (
                <div
                  key={strat.id}
                  className="cyber-panel p-3.5 flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-2">
                    {/* Rank + Direction & Score */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold text-[#94a3b8] uppercase">
                        {rankLabels[idx]}
                      </span>
                      <SignalBiasPill
                        bias={
                          strat.direction === 'LONG'
                            ? 'BULLISH'
                            : strat.direction === 'SHORT'
                            ? 'BEARISH'
                            : 'NEUTRAL'
                        }
                        label={`${strat.direction} • ${strat.possibilityScore}%`}
                      />
                    </div>

                    {/* Strategy Name + Win Rate */}
                    <div>
                      <div className="font-sans text-[14px] font-semibold text-[#f8fafc] leading-snug">
                        {strat.name}
                      </div>
                      <div className="font-mono text-[11px] text-[#10b981] mt-0.5">
                        {strat.backtest250Bars.winRatePct}% Win • {avgR >= 0 ? '+' : ''}
                        {avgR}R ({strat.backtest250Bars.signalsCount} trades)
                      </div>
                    </div>

                    {/* Compact Entry / Stop / Target Row */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/[0.06] font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={(e) =>
                          toggleTrackPrice(e, `${strat.name} Entry`, strat.tradePlan.entryPrice)
                        }
                        className="text-left hover:opacity-80 cursor-pointer"
                      >
                        <span className="block text-[9.5px] text-[#64748b]">Entry</span>
                        <strong className="text-[#f8fafc]">
                          ${formatP(strat.tradePlan.entryPrice)}
                        </strong>
                      </button>
                      <button
                        type="button"
                        onClick={(e) =>
                          toggleTrackPrice(e, `${strat.name} Stop`, strat.tradePlan.stopLoss)
                        }
                        className="text-left hover:opacity-80 cursor-pointer"
                      >
                        <span className="block text-[9.5px] text-[#64748b]">Stop</span>
                        <strong className="text-[#f43f5e]">
                          ${formatP(strat.tradePlan.stopLoss)}
                        </strong>
                      </button>
                      <button
                        type="button"
                        onClick={(e) =>
                          toggleTrackPrice(e, `${strat.name} Target`, strat.tradePlan.tp1Price)
                        }
                        className="text-left hover:opacity-80 cursor-pointer"
                      >
                        <span className="block text-[9.5px] text-[#64748b]">Target</span>
                        <strong className="text-[#10b981]">
                          ${formatP(strat.tradePlan.tp1Price)}
                        </strong>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPlaybookId((prev) => (prev === strat.id ? null : strat.id))
                      }
                      className="px-2.5 py-1.5 rounded-md bg-[#171c28] hover:bg-[#1e2536] border border-white/[0.07] text-[#cbd5e1] font-sans text-[11.5px] font-medium cursor-pointer"
                    >
                      {expandedPlaybookId === strat.id ? 'Hide Rules ▴' : 'Details ▾'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLoadSetup(
                          strat.tradePlan.entryPrice,
                          strat.tradePlan.stopLoss,
                          strat.tradePlan.tp1Price,
                          strat.tradePlan.tp2Price
                        );
                        setViewMode('GUIDED');
                        handleStageSelect(6);
                        onToggleWorkspaceExpand?.(false);
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#6366f1]/15 hover:bg-[#6366f1]/25 text-[#a5b4fc] border border-[#6366f1]/30 rounded-lg font-sans text-[11.5px] font-medium transition-colors cursor-pointer"
                    >
                      Use Setup
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. The 14 Strategy Cards (Accordion Progressive Disclosure) */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-sans text-[13px] font-semibold text-[#f8fafc]">
              All 14 Quantitative Playbooks ({filteredModels.length})
            </span>

            {/* Clean Era Filter Segmented Bar */}
            <div className="flex items-center gap-1 flex-wrap p-1 rounded-lg bg-[#0d1017] border border-white/[0.06] font-sans text-[11px]">
              {(
                [
                  { id: 'ALL', label: `All (${famousStrategies.length})` },
                  { id: 'READY', label: `Ready (${readyPlaybooksCount})` },
                  { id: 'GANN & CYCLICAL', label: 'Gann & Cyclical' },
                  { id: 'CLASSICAL LEGENDS', label: 'Classical' },
                  { id: 'SSRN ACADEMIC', label: 'SSRN Academic' },
                  { id: 'OPTIONS & DEALER', label: 'Options & Flow' },
                ] as const
              ).map((tab) => {
                const active = playbookFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPlaybookFilter(tab.id)}
                    className={`relative px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      active
                        ? 'text-[#f8fafc]'
                        : 'text-[#64748b] hover:text-[#cbd5e1]'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activePlaybookFilterGlow"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-md bg-[#1e2536] border border-white/[0.09] pointer-events-none"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accordion List of 14 Strategies */}
          <div className="flex flex-col gap-2 tabular-nums">
            {filteredModels.map((model) => {
              const isExpanded = expandedPlaybookId === model.id;
              const avgR = model.backtest250Bars.avgRealizedR;

              return (
                <div
                  key={model.id}
                  className="rounded-lg bg-[#0d1017] border border-white/[0.07] hover:border-white/[0.13] transition-colors overflow-hidden"
                >
                  {/* Collapsed View (Default): Clean horizontal card */}
                  <div
                    onClick={() =>
                      setExpandedPlaybookId((prev) => (prev === model.id ? null : model.id))
                    }
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    {/* Left: Strategy Title, Author/Era Subtitle, and LONG / SHORT badge */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <SignalBiasPill
                        bias={
                          model.direction === 'LONG'
                            ? 'BULLISH'
                            : model.direction === 'SHORT'
                            ? 'BEARISH'
                            : 'NEUTRAL'
                        }
                        label={model.direction}
                      />
                      <div className="min-w-0">
                        <div className="font-sans text-[13.5px] font-semibold text-[#f8fafc] truncate">
                          {model.name}
                        </div>
                        <div className="font-mono text-[11px] text-[#64748b] truncate">
                          {model.authorOrPaper} • {model.era}
                        </div>
                      </div>
                    </div>

                    {/* Right: Match Score, Backtest Win Rate, Details ▾, and Load Setup */}
                    <div
                      className="flex items-center justify-between sm:justify-end gap-3 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3 font-mono text-[11.5px]">
                        <div className="text-right">
                          <span className="block text-[9.5px] text-[#64748b]">MATCH</span>
                          <strong
                            className={
                              model.possibilityScore >= 70
                                ? 'text-[#10b981]'
                                : model.possibilityScore >= 50
                                ? 'text-[#f59e0b]'
                                : 'text-[#94a3b8]'
                            }
                          >
                            {model.possibilityScore}%
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9.5px] text-[#64748b]">BACKTEST</span>
                          <strong className="text-[#cbd5e1]">
                            {model.backtest250Bars.winRatePct}% • {avgR >= 0 ? '+' : ''}
                            {avgR}R
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPlaybookId((prev) =>
                              prev === model.id ? null : model.id
                            )
                          }
                          className="px-2.5 py-1.5 rounded-md bg-[#171c28] hover:bg-[#1e2536] border border-white/[0.07] text-[#cbd5e1] font-sans text-[11.5px] font-medium cursor-pointer"
                        >
                          {isExpanded ? 'Details ▴' : 'Details ▾'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onLoadSetup(
                              model.tradePlan.entryPrice,
                              model.tradePlan.stopLoss,
                              model.tradePlan.tp1Price,
                              model.tradePlan.tp2Price
                            );
                            setViewMode('GUIDED');
                            handleStageSelect(6);
                            onToggleWorkspaceExpand?.(false);
                          }}
                          className="px-3 py-1.5 bg-[#6366f1]/15 hover:bg-[#6366f1]/25 text-[#a5b4fc] border border-[#6366f1]/30 rounded-lg font-sans text-[11.5px] font-medium transition-colors cursor-pointer"
                        >
                          Load Setup
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded View (When Details ▾ is clicked) */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="overflow-hidden border-t border-white/[0.06] bg-[#12161f] px-4 py-3.5 flex flex-col gap-3"
                      >
                        <p className="font-sans text-[12.5px] text-[#cbd5e1] leading-relaxed">
                          {model.tradePlan.triggerNote}
                        </p>

                        {/* 4-Rule Live Checklist (Hairline list) */}
                        <div className="divide-y divide-white/[0.06] border-y border-white/[0.06] font-mono text-[11.5px]">
                          {model.rules.map((r, rIdx) => (
                            <div
                              key={rIdx}
                              className="py-2 flex items-center justify-between gap-3"
                            >
                              <span
                                className={
                                  r.passed
                                    ? 'text-[#10b981] font-medium'
                                    : 'text-[#64748b]'
                                }
                              >
                                {r.passed ? '✓' : '○'} {r.label}
                              </span>
                              <span className="text-[#f8fafc]">{r.liveReading}</span>
                            </div>
                          ))}
                        </div>

                        {/* Entry / Stop / TP1 / TP2 Prices */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                          <button
                            type="button"
                            onClick={(e) =>
                              toggleTrackPrice(
                                e,
                                `${model.name} Entry`,
                                model.tradePlan.entryPrice
                              )
                            }
                            className="p-2 rounded bg-[#0d1017] border border-white/[0.06] text-left hover:border-white/15 cursor-pointer"
                          >
                            <span className="block text-[9.5px] text-[#64748b]">ENTRY</span>
                            <strong className="text-[#f8fafc]">
                              ${formatP(model.tradePlan.entryPrice)}
                            </strong>
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              toggleTrackPrice(
                                e,
                                `${model.name} Stop`,
                                model.tradePlan.stopLoss
                              )
                            }
                            className="p-2 rounded bg-[#0d1017] border border-white/[0.06] text-left hover:border-white/15 cursor-pointer"
                          >
                            <span className="block text-[9.5px] text-[#64748b]">STOP LOSS</span>
                            <strong className="text-[#f43f5e]">
                              ${formatP(model.tradePlan.stopLoss)}
                            </strong>
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              toggleTrackPrice(
                                e,
                                `${model.name} TP1`,
                                model.tradePlan.tp1Price
                              )
                            }
                            className="p-2 rounded bg-[#0d1017] border border-white/[0.06] text-left hover:border-white/15 cursor-pointer"
                          >
                            <span className="block text-[9.5px] text-[#64748b]">TARGET 1</span>
                            <strong className="text-[#10b981]">
                              ${formatP(model.tradePlan.tp1Price)}
                            </strong>
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              toggleTrackPrice(
                                e,
                                `${model.name} TP2`,
                                model.tradePlan.tp2Price
                              )
                            }
                            className="p-2 rounded bg-[#0d1017] border border-white/[0.06] text-left hover:border-white/15 cursor-pointer"
                          >
                            <span className="block text-[9.5px] text-[#64748b]">TARGET 2</span>
                            <strong className="text-[#10b981]">
                              ${formatP(model.tradePlan.tp2Price)}
                            </strong>
                          </button>
                        </div>

                        {/* Rookie Guide Explanation & Academic/Book Link */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <p className="font-sans text-[12px] text-[#94a3b8] leading-relaxed flex-1">
                            <strong className="text-[#f8fafc] font-medium">
                              {experienceMode === 'rookie' ? 'Rookie Guide: ' : 'Strategy Thesis: '}
                            </strong>
                            {experienceMode === 'rookie'
                              ? model.rookieExplanation
                              : model.corePhilosophy}
                          </p>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) =>
                                toggleTrackPrice(
                                  e,
                                  `${model.name} Entry`,
                                  model.tradePlan.entryPrice
                                )
                              }
                              className="px-2.5 py-1.5 rounded-md bg-[#171c28] hover:bg-[#1e2536] border border-white/[0.08] text-[#cbd5e1] font-sans text-[11px] font-medium cursor-pointer"
                            >
                              Highlight Entry
                            </button>
                            <a
                              href={model.referenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-md bg-[#171c28] hover:bg-[#1e2536] border border-white/[0.08] text-[#60a5fa] font-sans text-[11px] font-medium"
                            >
                              {model.referenceSourceLabel} ↗
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // DEDICATED STRATEGY ASSESSMENT MODAL OVERLAY (If triggered)
  // ============================================================================
  const renderStrategyAssessmentModal = () => {
    if (!assessedStrategy) return null;
    const s = assessedStrategy;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={() => setAssessedStrategyId(null)}
      >
        <div
          className="cyber-panel max-w-2xl w-full p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] text-[#64748b] uppercase">
                {s.era} • {s.authorOrPaper}
              </span>
              <h3 className="font-sans text-[16px] font-semibold text-[#f8fafc] mt-0.5">
                {s.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setAssessedStrategyId(null)}
              className="px-2.5 py-1 rounded bg-[#171c28] text-[#94a3b8] hover:text-white font-mono text-[11px] cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <p className="font-sans text-[13px] text-[#cbd5e1] leading-relaxed">
            {s.tradePlan.triggerNote}
          </p>

          <div className="divide-y divide-white/[0.06] border-y border-white/[0.06] font-mono text-[12px]">
            {s.rules.map((r, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                <span className={r.passed ? 'text-[#10b981]' : 'text-[#64748b]'}>
                  {r.passed ? '✓' : '○'} {r.label}
                </span>
                <span className="text-[#f8fafc]">{r.liveReading}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onLoadSetup(
                  s.tradePlan.entryPrice,
                  s.tradePlan.stopLoss,
                  s.tradePlan.tp1Price,
                  s.tradePlan.tp2Price
                );
                setAssessedStrategyId(null);
                setViewMode('GUIDED');
                handleStageSelect(6);
                onToggleWorkspaceExpand?.(false);
              }}
              className="px-4 py-2 rounded-md bg-[#3b82f6] hover:bg-[#2563eb] text-white font-sans text-[12px] font-medium cursor-pointer"
            >
              Load Setup
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER: 4 CLEAN SEGMENTED WORKSPACE TABS + STAGE STEPPER + ACTIVE VIEW
  // ============================================================================
  const isAnalysisFlowActive =
    (viewMode === 'GUIDED' && activeStage <= 5) || viewMode === 'COMPACT_ALL';
  const isPlaybooksActive = viewMode === 'PLAYBOOKS';
  const isExecuteActive = viewMode === 'GUIDED' && activeStage === 6;
  const isCodexActive = viewMode === 'CODEX';

  return (
    <div className="flex flex-col w-full">
      {renderStrategyAssessmentModal()}

      {/* Sticky Top Navigation Header */}
      <div className="sticky top-0 z-30 flex flex-col bg-[#09090b] border-b border-white/[0.07] p-2.5 gap-2">
        {/* Rule A: Primary Top Navigation (Recessed Zinc Track with Elevated Pill Tabs) */}
        <div className="bg-[#0c0c0f] p-1 rounded-xl border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-1">
          {/* 1. Analysis Flow */}
          <button
            type="button"
            onClick={() => {
              setViewMode('GUIDED');
              if (activeStage === 6) handleStageSelect(1);
              onToggleWorkspaceExpand?.(false);
            }}
            className={`relative overflow-hidden flex flex-col items-start justify-between text-left rounded-lg px-3 py-2 border transition-colors cursor-pointer ${
              isAnalysisFlowActive
                ? 'bg-[#1c1c22] text-white border-white/[0.1] shadow-sm'
                : 'border-transparent hover:bg-white/[0.03] text-[#a1a1aa]'
            }`}
          >
            <div className="relative z-10 flex items-center justify-between w-full gap-1">
              <span className="flex items-center gap-1.5 font-sans text-[12.5px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                <span>Analysis Flow</span>
              </span>
              <span className="font-mono text-[10px] text-[#38bdf8]">
                {stageEvaluations[activeStage <= 5 ? activeStage : 1].score}%
              </span>
            </div>
            <span className="relative z-10 font-sans text-[11px] text-[#71717a] truncate w-full">
              The 6 Stages
            </span>
          </button>

          {/* 2. Playbooks */}
          <button
            type="button"
            onClick={() => {
              setViewMode('PLAYBOOKS');
              onToggleWorkspaceExpand?.(true);
            }}
            className={`relative overflow-hidden flex flex-col items-start justify-between text-left rounded-lg px-3 py-2 border transition-colors cursor-pointer ${
              isPlaybooksActive
                ? 'bg-[#1c1c22] text-white border-white/[0.1] shadow-sm'
                : 'border-transparent hover:bg-white/[0.03] text-[#a1a1aa]'
            }`}
          >
            <div className="relative z-10 flex items-center justify-between w-full gap-1">
              <span className="flex items-center gap-1.5 font-sans text-[12.5px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                <span>Playbook Hub &amp; Crane Strike</span>
              </span>
              <span className="font-mono text-[10px] text-[#10b981]">
                {readyPlaybooksCount} Ready
              </span>
            </div>
            <span className="relative z-10 font-sans text-[11px] text-[#71717a] truncate w-full">
              5-Gate Veto • 6-Setup Podium • 14 Models
            </span>
          </button>

          {/* 3. Execute & Size */}
          <button
            type="button"
            onClick={() => {
              setViewMode('GUIDED');
              handleStageSelect(6);
              onToggleWorkspaceExpand?.(false);
            }}
            className={`relative overflow-hidden flex flex-col items-start justify-between text-left rounded-lg px-3 py-2 border transition-colors cursor-pointer ${
              isExecuteActive
                ? 'bg-[#1c1c22] text-white border-white/[0.1] shadow-sm'
                : 'border-transparent hover:bg-white/[0.03] text-[#a1a1aa]'
            }`}
          >
            <div className="relative z-10 flex items-center justify-between w-full gap-1">
              <span className="flex items-center gap-1.5 font-sans text-[12.5px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                <span>Execute &amp; Size</span>
              </span>
              <span className="font-mono text-[10px] text-[#a1a1aa]">
                {stageEvaluations[6].score}%
              </span>
            </div>
            <span className="relative z-10 font-sans text-[11px] text-[#71717a] truncate w-full">
              Pre-Flight &amp; Position Calculator
            </span>
          </button>

          {/* 4. Learn & X-Ray */}
          <button
            type="button"
            onClick={() => {
              setViewMode('CODEX');
              onToggleWorkspaceExpand?.(true);
            }}
            className={`relative overflow-hidden flex flex-col items-start justify-between text-left rounded-lg px-3 py-2 border transition-colors cursor-pointer ${
              isCodexActive
                ? 'bg-[#1c1c22] text-white border-white/[0.1] shadow-sm'
                : 'border-transparent hover:bg-white/[0.03] text-[#a1a1aa]'
            }`}
          >
            <div className="relative z-10 flex items-center justify-between w-full gap-1">
              <span className="flex items-center gap-1.5 font-sans text-[12.5px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                <span>Learn &amp; X-Ray</span>
              </span>
              <span className="font-mono text-[10px] text-[#a5b4fc]">Codex</span>
            </div>
            <span className="relative z-10 font-sans text-[11px] text-[#71717a] truncate w-full">
              Codex, Rookie Guides &amp; Signal X-Ray
            </span>
          </button>
        </div>

        {/* Sub-Bar: Stage Stepper Pills (Recessed Zinc Track) + View Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {viewMode === 'GUIDED' || viewMode === 'COMPACT_ALL' ? (
            <div className="bg-[#0c0c0f] p-1 rounded-xl border border-white/[0.06] flex items-center gap-1 overflow-x-auto no-scrollbar">
              {STAGES.map((stage) => {
                const isActive = viewMode === 'GUIDED' && activeStage === stage.id;
                const evalData = stageEvaluations[stage.id];
                const dotColor = isActive ? '#38bdf8' : getReadableStatusColor(evalData.dotColor);

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => {
                      setViewMode('GUIDED');
                      handleStageSelect(stage.id);
                      if (stage.id === 6) {
                        onToggleWorkspaceExpand?.(false);
                      }
                    }}
                    className={`relative px-2.5 py-1.5 rounded-lg font-sans text-[12px] font-medium transition-colors shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                      isActive
                        ? 'bg-[#1c1c22] text-white border-white/[0.1] shadow-sm'
                        : 'border-transparent text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span>{stage.stepperLabel}</span>
                    <span className="font-mono text-[10px] text-[#71717a]">
                      {evalData.score}%
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="font-sans text-[12px] font-medium text-[#a1a1aa] px-1">
              {viewMode === 'PLAYBOOKS'
                ? `Playbooks (14) — ${readyPlaybooksCount} Ready on ${symbol}`
                : 'Learn & X-Ray — Visual Element Atlas, 14 Masterclasses & Signal X-Ray'}
            </span>
          )}

          {/* Right View Mode & Split/Full Width Controls */}
          <div className="flex items-center gap-2 ml-auto">
            {(viewMode === 'GUIDED' || viewMode === 'COMPACT_ALL') && (
              <div className="flex items-center bg-[#0c0c0f] p-1 rounded-xl border border-white/[0.06] font-sans text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('GUIDED')}
                  className={`px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                    viewMode === 'GUIDED'
                      ? 'bg-[#1c1c22] text-white border-white/[0.1] shadow-sm'
                      : 'border-transparent text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  Paged
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('COMPACT_ALL')}
                  className={`px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                    viewMode === 'COMPACT_ALL'
                      ? 'bg-[#1c1c22] text-white border-white/[0.1] shadow-sm'
                      : 'border-transparent text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  All 6
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onToggleWorkspaceExpand?.(!isWorkspaceExpanded)}
              className="hidden lg:inline-flex items-center px-3 py-1.5 bg-[#6366f1]/15 hover:bg-[#6366f1]/25 text-[#a5b4fc] border border-[#6366f1]/30 rounded-lg font-sans text-[11px] font-medium cursor-pointer transition-colors"
            >
              {isWorkspaceExpanded ? 'Split with Chart' : 'Full Width'}
            </button>
          </div>
        </div>
      </div>

      {/* Active Workspace Body */}
      <AnimatePresence mode="wait">
        {viewMode === 'CODEX' ? (
          <motion.div
            key="inferno-codex-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <InfernoCodexHub
              symbol={symbol}
              currentPrice={currentPrice}
              klines={klines}
              volumeProfile={volumeProfile}
              bullOB={bullOB}
              bearOB={bearOB}
              optionsData={optionsData}
              liquidity={liquidity}
              telemetry={telemetry}
              confluence={confluence}
              amdPhase={amdPhase}
              calcResult={calcResult}
              candlestickResult={candlestickResult}
              maResult={maResult}
              sharpeSortino={sharpeSortino}
              isLight={isLight}
              highlightedLevel={highlightedLevel}
              onHoverLevel={onHoverLevel}
              onSelectStage={(stageId) => {
                setViewMode('GUIDED');
                handleStageSelect(stageId);
              }}
              onLoadSetup={(entry, stop, tp1, tp2) => {
                onLoadSetup(entry, stop, tp1 ?? entry, tp2 ?? entry);
                setViewMode('GUIDED');
                handleStageSelect(6);
              }}
              onProgressChange={setAcademyProgress}
              focusXRaySignal={externalDeckRequest?.ts}
            />
          </motion.div>
        ) : viewMode === 'PLAYBOOKS' ? (
          <motion.div
            key="playbooks-gann-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            {renderPlaybooksAndGannHub()}
          </motion.div>
        ) : viewMode === 'COMPACT_ALL' ? (
          <motion.div
            key="compact-all-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            {renderCompactAllStack()}
          </motion.div>
        ) : (
          <motion.div
            key={`guided-stage-${activeStage}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            {activeStage === 1 && renderStage01Price()}
            {activeStage === 2 && renderStage02Volume()}
            {activeStage === 3 && renderStage03Trend()}
            {activeStage === 4 && renderStage04Orderflow()}
            {activeStage === 5 && renderStage05Quant()}
            {activeStage === 6 && renderStage06Execute()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
