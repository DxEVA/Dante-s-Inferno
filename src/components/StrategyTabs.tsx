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
export type StageId = 1 | 2 | 3 | 4 | 5 | 6;
type FlowViewMode = 'GUIDED' | 'COMPACT_ALL';

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
  activeTab?: StageId;
  onTabChange?: (tab: StageId) => void;
  externalDeckRequest?: { deck: TacticalDeckMode; ts: number } | null;
  onNavigateMobilePage?: (page: 'CHART' | 'RADAR' | 'LENSES' | 'EXECUTE' | 'ACADEMY') => void;
  onHoverLevel?: (level: { label: string; price: number } | null) => void;
  highlightedLevel?: { label: string; price: number } | null;
}

interface StageDefinition {
  id: StageId;
  stepCode: string;
  shortTitle: string;
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
    shortTitle: 'PRICE',
    fullTitle: 'STAGE 01 // PRICE & STRUCTURE',
    subtitle: 'Candles, Wicks & S/R',
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
    shortTitle: 'VOLUME',
    fullTitle: 'STAGE 02 // VOLUME & VALUE AREA',
    subtitle: 'POC, VAH/VAL & Session RVOL',
    question: 'Is price at a cheap/expensive auction zone with real volume participation?',
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
    shortTitle: 'TREND & MA',
    fullTitle: 'STAGE 03 // MOVING AVERAGES & TREND',
    subtitle: 'EMA Ribbon, VWAP, Stretch & MTF',
    question: 'Is the multi-timeframe trend aligned, or is price over-stretched like a rubber band?',
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
    shortTitle: 'ORDERFLOW',
    fullTitle: 'STAGE 04 // ORDERFLOW & SMART MONEY',
    subtitle: 'Order Blocks, AMD, CVD & Spot vs Perp',
    question: 'Are institutional Spot buyers stepping in at unmitigated Order Blocks, or is it a Perp trap?',
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
    shortTitle: 'QUANT & GEX',
    fullTitle: 'STAGE 05 // QUANT & DERIVATIVES',
    subtitle: 'Hurst, ADX, Z-Score, Options GEX & Funding/OI',
    question: 'What do statistical math and options market-makers say about volatility and traps?',
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
    shortTitle: 'EXECUTE',
    fullTitle: 'STAGE 06 // VERDICT & EXECUTION SIZER',
    subtitle: 'Funnel Scorecard, Pre-Flight & Position Sizer',
    question: 'Do all 5 stages align for execution, and what is our exact fee-adjusted position size?',
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
  const [internalStage, setInternalStage] = useState<StageId>(1);
  const activeStage: StageId = controlledActiveTab !== undefined ? controlledActiveTab : internalStage;

  const [viewMode, setViewMode] = useState<FlowViewMode>('GUIDED');
  const [showReverseXRay, setShowReverseXRay] = useState<boolean>(false);
  const [showFullPatternScanner, setShowFullPatternScanner] = useState<boolean>(false);
  const [ showAiBriefInStage5, setShowAiBriefInStage5] = useState<boolean>(false);
  const [filterOnlyKeyLevels, setFilterOnlyKeyLevels] = useState<boolean>(false);
  const [selectedSetupLensId, setSelectedSetupLensId] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [, setAcademyProgress] = useState<AcademyProgressState>(() => loadAcademyProgress());
  const [openLearnStages, setOpenLearnStages] = useState<Record<number, boolean>>({});

  const symbol = activeSymbol || (baseAsset ? `${baseAsset}USDT` : 'BTCUSDT');

  const handleStageSelect = (stageId: StageId) => {
    setInternalStage(stageId);
    onTabChange?.(stageId);
    if (stageId <= 5) {
      // Map stage 1..5 to corresponding lensSetup id
      const lensMap: Record<number, 1 | 2 | 3 | 4 | 5> = {
        1: 1,
        2: 3,
        3: 2,
        4: 4,
        5: 5,
      };
      setSelectedSetupLensId(lensMap[stageId] || 1);
    }
  };

  // Sync external deck requests (from Mobile bottom nav or TrafficLightBanner X-Ray button)
  useEffect(() => {
    if (!externalDeckRequest?.deck) return;
    if (externalDeckRequest.deck === 'PREFLIGHT_SIZER') {
      setViewMode('GUIDED');
      setShowReverseXRay(false);
      handleStageSelect(6);
    } else if (externalDeckRequest.deck === 'REVERSE_ACADEMY') {
      setViewMode('GUIDED');
      setShowReverseXRay(true);
      handleStageSelect(6);
    } else if (externalDeckRequest.deck === 'MTF_RADAR') {
      setViewMode('GUIDED');
      setShowReverseXRay(false);
      handleStageSelect(5);
    } else if (externalDeckRequest.deck === 'LENSES') {
      setViewMode('GUIDED');
      setShowReverseXRay(false);
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
      ? 'DISCOUNT (< VAL)'
      : isPremium
      ? 'PREMIUM (> VAH)'
      : 'FAIR VALUE (INSIDE VA)';

    // Stage 01: Price & Structure (Lens 1)
    const s1Conf = lensConfidences[1];
    const patName = candlestickResult.primaryPattern?.name || 'Neutral Bar Structure';
    const srLow = liquidity?.srLow || volumeProfile.val || currentPrice * 0.985;
    const srHigh = liquidity?.srHigh || volumeProfile.vah || currentPrice * 1.015;
    const distSrLowPct = currentPrice > 0 ? ((currentPrice - srLow) / currentPrice) * 100 : 1.2;
    const distSrHighPct = currentPrice > 0 ? ((srHigh - currentPrice) / currentPrice) * 100 : 1.2;

    // Stage 02: Volume & Value Area (Auction Location + Session RVOL)
    const vpScore = Math.round((lensConfidences[3].score * 0.55 + lensConfidences[4].score * 0.45));
    const vpBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      isDiscount || (currentPrice >= volumeProfile.poc && telemetry.cvdDelta >= 0)
        ? 'BULLISH'
        : isPremium && telemetry.cvdDelta < 0
        ? 'BEARISH'
        : lensConfidences[3].bias;

    // Stage 03: Moving Averages & Trend (Lens 2)
    const s3Conf = lensConfidences[2];

    // Stage 04: Orderflow & Smart Money (Order Blocks + AMD + CVD + Spot vs Perp)
    const s4Score = Math.round((lensConfidences[3].score * 0.45 + lensConfidences[4].score * 0.55));
    const s4Bias =
      lensConfidences[4].score >= lensConfidences[3].score
        ? lensConfidences[4].bias
        : lensConfidences[3].bias;

    // Stage 05: Quant & Derivatives (Lens 5)
    const s5Conf = lensConfidences[5];

    // Stage 06: Verdict & Execution
    const avgFunnelScore = Math.round(
      (s1Conf.score + vpScore + s3Conf.score + s4Score + s5Conf.score) / 5
    );
    const s6Bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      confluence.score >= 60 ? 'BULLISH' : confluence.score <= 40 ? 'BEARISH' : s1Conf.bias;

    const getStatusColor = (score: number): string =>
      score >= 65 ? '#4edea3' : score >= 45 ? '#f59e0b' : '#ffb4ab';

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
        )}% wick rejection. Price sits ${distSrLowPct.toFixed(2)}% above SR_LOW support ($${formatP(
          srLow
        )}) and ${distSrHighPct.toFixed(2)}% below SR_HIGH resistance ($${formatP(srHigh)}).`,
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
        headline: `${maResult.ribbonAlignment} • STRETCH ${maResult.stretchScoreAtr >= 0 ? '+' : ''}${maResult.stretchScoreAtr.toFixed(2)} ATR`,
        takeaway: `Moving averages show ${maResult.ribbonAlignment} with Session VWAP at $${formatP(
          maResult.mas.vwap.price
        )}. ATR Rubber-Band Stretch is ${maResult.stretchScoreAtr.toFixed(2)} ATR (${
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
        headline: `HURST ${(candlestickResult.marketRegime?.hurstExponent ?? 0.5).toFixed(
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
        headline: `${avgFunnelScore}% 5-STAGE FUNNEL CONFLUENCE (${s6Bias})`,
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
      <div className="flex flex-col gap-1 pt-2 mt-1 border-t border-[#1e2636]/80">
        <div className="relative w-full h-1.5 bg-[#090c12] border border-[#1e2636] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 opacity-25"
            style={{
              width: `${clampedPct}%`,
              backgroundColor: markerColor,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-1.5 -ml-0.5 shadow-[0_0_8px_#00f0ff]"
            style={{
              left: `${clampedPct}%`,
              backgroundColor: markerColor,
            }}
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[8.5px] text-[#849495] tabular-nums">
          <span>{leftLabel}</span>
          <span className="text-[#b9cacb] font-semibold">{centerLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
    );
  };

  // Block A: Stage Verdict Banner (Used in Stages 01–05)
  const renderStageVerdictBanner = (stageDef: StageDefinition) => {
    const evalData = stageEvaluations[stageDef.id as 1 | 2 | 3 | 4 | 5];
    const borderAccent =
      evalData.bias === 'BULLISH'
        ? 'border-l-[#4edea3]'
        : evalData.bias === 'BEARISH'
        ? 'border-l-[#ffb4ab]'
        : 'border-l-[#00f0ff]';

    return (
      <div
        className={`cyber-panel cyber-scan-active border-l-2 ${borderAccent} p-4 flex flex-col gap-3`}
      >
        {/* Top Row: Stage Badge + Question + Live Stage Score & Bias Pill */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#00f0ff]/40 font-mono text-[10px] font-bold text-[#00f0ff] tracking-wider">
                {stageDef.fullTitle}
              </span>
              <span className="font-mono text-[10px] text-[#849495] uppercase">
                {stageDef.subtitle}
              </span>
            </div>
            <h3 className="font-sans text-[13px] sm:text-[14px] font-semibold text-[#e1e2eb] leading-snug pt-0.5">
              “{stageDef.question}”
            </h3>
          </div>

          {/* Live Stage Score & Bias Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`px-2.5 py-1.5 border font-mono text-[11px] font-bold tabular-nums flex items-center gap-2 ${
                evalData.bias === 'BULLISH'
                  ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/40'
                  : evalData.bias === 'BEARISH'
                  ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/40'
                  : 'bg-[#f59e0b]/10 text-[#fcd34d] border-[#f59e0b]/40'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: evalData.dotColor }}
              />
              <span>
                <ScrambleValue text={`${evalData.score}%`} /> {evalData.bias} ALIGNMENT
              </span>
            </div>
          </div>
        </div>

        {/* 1-Sentence Plain-English Takeaway */}
        <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="font-sans text-[12px] text-[#dbfcff] leading-relaxed flex-1">
            <strong className="text-[#00f0ff] font-mono uppercase text-[10px] mr-1.5">
              STAGE {stageDef.stepCode} VERDICT:
            </strong>
            {evalData.takeaway}
          </p>

          {/* Quick Action Buttons to Track Stage Entry or Load into Sizer */}
          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
            <button
              type="button"
              onClick={(e) =>
                toggleTrackPrice(
                  e,
                  `STAGE ${stageDef.stepCode} ENTRY`,
                  evalData.setup.suggestedEntry
                )
              }
              className={`px-2.5 py-1.5 border font-bold uppercase transition-colors cursor-pointer ${
                isPriceTracked(evalData.setup.suggestedEntry)
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]'
                  : 'bg-[#141821] hover:bg-[#191c22] text-[#b9cacb] border-[#1e2636]'
              }`}
            >
              {isPriceTracked(evalData.setup.suggestedEntry)
                ? '🎯 TRACKING ZONE'
                : `🎯 TRACK $${formatP(evalData.setup.suggestedEntry)}`}
            </button>
            <button
              type="button"
              onClick={() => {
                onLoadSetup(
                  evalData.setup.suggestedEntry,
                  evalData.setup.invalidationPrice,
                  evalData.setup.target1Price,
                  evalData.setup.target2Price
                );
              }}
              className="px-2.5 py-1.5 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 font-bold uppercase transition-colors cursor-pointer"
              title="Load this stage's entry, stop loss, and targets into the Execution Sizer"
            >
              ⚡ LOAD SETUP
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Block C: Bottom Stage Navigation & Inline Learn Accordion
  const renderStageFooterAndLearn = (stageDef: StageDefinition) => {
    const learnOpen = isStageLearnOpen(stageDef.id);
    const prevStage = stageDef.id > 1 ? STAGES[stageDef.id - 2] : null;
    const nextStage = stageDef.id < 6 ? STAGES[stageDef.id] : null;

    return (
      <div className="flex flex-col gap-3 pt-1">
        {/* Collapsible Learn This Layer & Study Links Accordion */}
        <div className="cyber-panel border border-[#1e2636] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleStageLearn(stageDef.id)}
            className="w-full px-4 py-2.5 bg-[#0b0e14] hover:bg-[#141821] flex items-center justify-between gap-2 font-mono text-[10px] text-[#00f0ff] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>🎓 LEARN STAGE {stageDef.stepCode} ({stageDef.shortTitle}) &amp; STUDY LINKS</span>
              {experienceMode === 'rookie' && (
                <span className="px-1.5 py-0.5 bg-[#00f0ff]/15 border border-[#00f0ff]/40 text-[8px] text-[#dbfcff]">
                  ROOKIE GUIDE
                </span>
              )}
            </span>
            <span>{learnOpen ? 'HIDE ▴' : 'EXPAND ▾'}</span>
          </button>

          <AnimatePresence initial={false}>
            {learnOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden border-t border-[#1e2636] bg-[#090c12] p-4 flex flex-col gap-3"
              >
                <div className="grid grid-cols-1 gap-3">
                  {stageDef.mentorKeys.map((mKey) => {
                    const mentor = getRookieMentorGuide(mKey, symbol);
                    return (
                      <div
                        key={mKey}
                        className="p-3 bg-[#10141d] border border-[#1e2636] flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-[#00f0ff] uppercase">
                            🧠 {mKey.replace(/_/g, ' ')} — MENTAL MODEL
                          </span>
                          <span className="font-mono text-[9px] text-[#849495]">
                            STD NORM: {mentor.standardRangeGuide.normal}
                          </span>
                        </div>
                        <p className="font-sans text-[11px] text-[#b9cacb] leading-relaxed">
                          <strong className="text-[#fcd34d] font-mono">Analogy: </strong>
                          {mentor.familiarBridge}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans text-[10.5px] pt-1">
                          <div className="p-2 bg-[#0b0e14] border-l-2 border-l-[#4edea3] text-[#dbfcff]">
                            <strong className="text-[#4edea3] font-mono">✓ DO THIS: </strong>
                            {mentor.rookieActionRule.doThis}
                          </div>
                          <div className="p-2 bg-[#0b0e14] border-l-2 border-l-[#ffb4ab] text-[#dbfcff]">
                            <strong className="text-[#ffb4ab] font-mono">✕ AVOID TRAP: </strong>
                            {mentor.rookieActionRule.avoidTrap}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Curated External Study Links + Interactive Reverse X-Ray Quiz Shortcut */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[#1e2636]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[9px] text-[#849495] uppercase">
                      EXTERNAL STUDY REFERENCES:
                    </span>
                    {stageDef.studyLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-[#141821] hover:bg-[#191c22] border border-[#00f0ff]/30 text-[#00f0ff] font-mono text-[9px] font-bold transition-colors"
                      >
                        📖 {link.label} ({link.source}) ↗
                      </a>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowReverseXRay(true);
                      handleStageSelect(6);
                    }}
                    className="px-2.5 py-1 bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 border border-[#f59e0b]/40 text-[#fcd34d] font-mono text-[9px] font-bold uppercase cursor-pointer"
                  >
                    🔍 OPEN REVERSE X-RAY &amp; QUIZ →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sequential Stage Stepper Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap bg-[#0b0e14] border border-[#1e2636] p-3 font-mono text-[10px]">
          <div>
            {prevStage ? (
              <button
                type="button"
                onClick={() => handleStageSelect(prevStage.id)}
                className="px-3 py-2 bg-[#141821] hover:bg-[#191c22] text-[#b9cacb] hover:text-[#e1e2eb] border border-[#1e2636] font-bold uppercase transition-colors cursor-pointer"
              >
                ← PREV: {prevStage.stepCode} {prevStage.shortTitle}
              </button>
            ) : (
              <span className="text-[#849495] px-2">FUNNEL START // STAGE 01</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stageDef.id < 6 && (
              <button
                type="button"
                onClick={() => {
                  setShowReverseXRay(false);
                  handleStageSelect(6);
                }}
                className="px-3 py-2 bg-[#141821] hover:bg-[#191c22] text-[#4edea3] border border-[#4edea3]/40 font-bold uppercase transition-colors cursor-pointer"
              >
                ⚡ JUMP TO EXECUTION SIZER
              </button>
            )}

            {nextStage && (
              <button
                type="button"
                onClick={() => handleStageSelect(nextStage.id)}
                className="px-4 py-2 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/50 font-bold uppercase tracking-wider shadow-[0_0_14px_rgba(0,240,255,0.18)] transition-all cursor-pointer"
              >
                NEXT: STAGE {nextStage.stepCode} ({nextStage.shortTitle}) →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // STAGE 01 CONTENT: PRICE & STRUCTURE (Candles, Wicks & S/R)
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

    return (
      <div className="flex flex-col p-4 gap-4">
        {renderStageVerdictBanner(STAGES[0])}

        {/* CARD 1: Primary Candlestick Pattern & Wick Anatomy Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🕯️</span>
              <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
                CARD 1A // PRIMARY CANDLESTICK PATTERN &amp; WICK ANATOMY
              </span>
            </div>
            {candlestickResult.primaryPattern && (
              <div className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums">
                <span
                  className={`px-2 py-0.5 font-bold border ${
                    candlestickResult.primaryPattern.bias === 'BULLISH'
                      ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                      : candlestickResult.primaryPattern.bias === 'BEARISH'
                      ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                      : 'bg-[#849495]/10 text-[#849495] border-[#849495]/30'
                  }`}
                >
                  {candlestickResult.primaryPattern.bias}
                </span>
                <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#00f0ff] font-bold">
                  QUALITY: {candlestickResult.primaryPattern.quality}%
                </span>
              </div>
            )}
          </div>

          {candlestickResult.primaryPattern ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-mono text-[15px] font-bold text-[#dbfcff]">
                  {candlestickResult.primaryPattern.name}
                </h4>
                <span className="font-mono text-[10px] text-[#849495] tabular-nums">
                  {candlestickResult.primaryPattern.barsAgo === 0
                    ? 'Active Bar'
                    : `${candlestickResult.primaryPattern.barsAgo} Bars Ago`}{' '}
                  • RVOL {candlestickResult.primaryPattern.rvol.toFixed(2)}x • Tested:{' '}
                  <strong className="text-[#00f0ff]">
                    {candlestickResult.primaryPattern.testedLevelName || 'Intraday S/R'}
                  </strong>
                </span>
              </div>
              <p className="font-sans text-[12px] text-[#b9cacb] leading-relaxed">
                {candlestickResult.primaryPattern.description}
              </p>
            </div>
          ) : (
            <div className="font-mono text-[11px] text-[#849495]">
              No high-conviction candlestick reversal or continuation pattern on the immediate bar.
            </div>
          )}

          {/* 3-Metric Wick Anatomy Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 tabular-nums">
            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#849495] uppercase">
                  WICK REJECTION RATIO
                </span>
                <span className="font-mono text-[14px] font-bold text-[#4edea3]">{wickPct}%</span>
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-1">
                {wickPct >= 55
                  ? 'Strong liquidity sweep & rejection tail'
                  : 'Standard intrabar shadow proportion'}
              </span>
            </div>

            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#849495] uppercase">
                  CLOSE LOCATION (CLV)
                </span>
                <span className="font-mono text-[14px] font-bold text-[#dbfcff]">{clvPct}%</span>
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-1">
                {clvPct >= 70
                  ? 'Buyers closed near bar high'
                  : clvPct <= 30
                  ? 'Sellers closed near bar low'
                  : 'Balanced mid-bar close'}
              </span>
            </div>

            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#849495] uppercase">
                  BODY / 14-BAR ATR
                </span>
                <span className="font-mono text-[14px] font-bold text-[#f59e0b]">
                  {bodyAtr.toFixed(2)}x
                </span>
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-1">
                {bodyAtr >= 1.35
                  ? 'Expansion displacement candle'
                  : bodyAtr <= 0.4
                  ? 'Indecision / Doji compression'
                  : 'Normal bar body range'}
              </span>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            wickPct,
            wickPct >= 55 ? '#4edea3' : '#00f0ff',
            '0% (Full Body)',
            'STD NORM: 25%–55% Wick',
            '85%+ (Pinbar Sweep)'
          )}

          {/* Optional Toggle to View All 22 Scanned Candlestick Patterns */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowFullPatternScanner((prev) => !prev)}
              className="font-mono text-[9.5px] text-[#00f0ff] hover:underline uppercase font-bold cursor-pointer"
            >
              {showFullPatternScanner
                ? '▴ HIDE 22-PATTERN MULTI-BAR SCANNER'
                : `▾ VIEW 22-PATTERN SCANNER LOG (${candlestickResult.recentPatterns.length} SIGNALS)`}
            </button>
            {showFullPatternScanner && (
              <div className="mt-2 p-2.5 bg-[#090c12] border border-[#1e2636] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-[#849495] uppercase">
                    RECENT FORMATIONS ACROSS LAST 25 BARS
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterOnlyKeyLevels((p) => !p)}
                    className="px-2 py-0.5 bg-[#141821] border border-[#1e2636] font-mono text-[8.5px] text-[#00f0ff] cursor-pointer"
                  >
                    {filterOnlyKeyLevels ? '● KEY S/R ONLY' : '○ SHOW ALL'}
                  </button>
                </div>
                <div className="overflow-x-auto no-scrollbar max-h-48">
                  <table className="w-full text-left font-mono text-[9.5px] tabular-nums">
                    <thead>
                      <tr className="text-[#849495] border-b border-[#1e2636]">
                        <th className="py-1 pr-2">BAR</th>
                        <th className="py-1 pr-2">PATTERN</th>
                        <th className="py-1 pr-2">BIAS</th>
                        <th className="py-1 pr-2">LEVEL</th>
                        <th className="py-1 text-right">QUAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2636]/60">
                      {visiblePatterns.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[#141821]">
                          <td className="py-1 pr-2 text-[#849495]">
                            {p.barsAgo === 0 ? 'Now' : `${p.barsAgo}b`}
                          </td>
                          <td className="py-1 pr-2 font-bold text-[#dbfcff]">{p.name}</td>
                          <td
                            className={`py-1 pr-2 font-bold ${
                              p.bias === 'BULLISH' ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
                            }`}
                          >
                            {p.bias}
                          </td>
                          <td className="py-1 pr-2 text-[#00f0ff]">
                            {p.testedLevelName || 'Mid'}
                          </td>
                          <td className="py-1 text-right text-[#e1e2eb] font-bold">{p.quality}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Key Support & Resistance Proximity Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              CARD 1B // KEY SUPPORT &amp; RESISTANCE PROXIMITY (CLICK TO SPOTLIGHT)
            </span>
            <span className="font-mono text-[10px] text-[#849495] tabular-nums">
              NEAREST: <strong className="text-[#dbfcff]">{candlestickResult.anatomy?.nearestSrName || 'S/R Pivot'}</strong> (
              {(candlestickResult.anatomy?.nearestSrDistancePct || 0.45).toFixed(2)}% away)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 tabular-nums">
            {/* SR_LOW Support Floor */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'SR_LOW (PIVOT SUPPORT)', srLow)}
              className={`cyber-panel border-l-2 border-l-[#4edea3] p-3.5 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(srLow) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold text-[#4edea3] uppercase">
                  SR_LOW // STRUCTURAL SUPPORT
                </span>
                <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#4edea3]/40 font-mono text-[8.5px] text-[#4edea3] font-bold">
                  {isPriceTracked(srLow) ? '🎯 TRACKING ON CHART' : '🎯 TRACK ON CHART'}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-mono text-[18px] font-bold text-[#4edea3]">
                  ${formatP(srLow)}
                </span>
                <span className="font-mono text-[11px] text-[#b9cacb]">
                  -{distLowPct.toFixed(2)}% below spot
                </span>
              </div>
              <span className="font-mono text-[9px] text-[#849495] mt-1">
                Fractal swing demand floor — primary invalidation anchor for longs
              </span>
            </div>

            {/* SR_HIGH Resistance Ceiling */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'SR_HIGH (PIVOT RESISTANCE)', srHigh)}
              className={`cyber-panel border-l-2 border-l-[#ffb4ab] p-3.5 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(srHigh) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold text-[#ffb4ab] uppercase">
                  SR_HIGH // STRUCTURAL RESISTANCE
                </span>
                <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#ffb4ab]/40 font-mono text-[8.5px] text-[#ffb4ab] font-bold">
                  {isPriceTracked(srHigh) ? '🎯 TRACKING ON CHART' : '🎯 TRACK ON CHART'}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-mono text-[18px] font-bold text-[#ffb4ab]">
                  ${formatP(srHigh)}
                </span>
                <span className="font-mono text-[11px] text-[#b9cacb]">
                  +{distHighPct.toFixed(2)}% above spot
                </span>
              </div>
              <span className="font-mono text-[9px] text-[#849495] mt-1">
                Fractal swing supply ceiling — primary take-profit or short rejection zone
              </span>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            rangePositionPct,
            rangePositionPct <= 25 ? '#4edea3' : rangePositionPct >= 75 ? '#ffb4ab' : '#00f0ff',
            `SR_LOW ($${formatP(srLow)})`,
            `Spot Position: ${Math.round(rangePositionPct)}% of S/R Corridor`,
            `SR_HIGH ($${formatP(srHigh)})`
          )}
        </div>

        {renderStageFooterAndLearn(STAGES[0])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 02 CONTENT: VOLUME & VALUE AREA (POC, VAH/VAL & Session RVOL)
  // ============================================================================
  const renderStage02Volume = () => {
    const rvols = calculateRVOL(klines);
    const sesRvol = telemetry.sessionRvol || rvols[rvols.length - 1] || 1.0;
    const isDiscount = currentPrice < volumeProfile.val;
    const isPremium = currentPrice > volumeProfile.vah;
    const auctionState = isDiscount
      ? 'DISCOUNT (< VAL — BUYER VALUE ZONE)'
      : isPremium
      ? 'PREMIUM (> VAH — OVEREXTENDED)'
      : 'FAIR VALUE (INSIDE 70% VALUE AREA)';

    // Find POC bucket bid vs ask split if available
    const pocBucket =
      volumeProfile.buckets && volumeProfile.buckets.length > 0
        ? volumeProfile.buckets.reduce(
            (best, b) => (b.volume > (best?.volume || 0) ? b : best),
            volumeProfile.buckets[0]
          )
        : null;

    const pocBuyPct =
      pocBucket && pocBucket.volume > 0
        ? Math.round(
            ((((pocBucket as any).upVolume ?? pocBucket.volume * 0.52) as number) /
              pocBucket.volume) *
              100
          )
        : 52;

    const vaRangePct =
      volumeProfile.vah > volumeProfile.val
        ? ((currentPrice - volumeProfile.val) / (volumeProfile.vah - volumeProfile.val)) * 100
        : 50;

    return (
      <div className="flex flex-col p-4 gap-4">
        {renderStageVerdictBanner(STAGES[1])}

        {/* CARD 1: Volume Profile Auction Map Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              CARD 2A // VOLUME PROFILE 70% AUCTION MAP (CLICK TO SPOTLIGHT)
            </span>
            <span
              className={`px-2 py-0.5 font-mono text-[9.5px] font-bold border ${
                isDiscount
                  ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                  : isPremium
                  ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                  : 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/30'
              }`}
            >
              {auctionState}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
            {/* VAH */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'VAH (70% Value Area High)', volumeProfile.vah)}
              className={`cyber-panel border-l-2 border-l-[#00dbe9] p-3.5 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(volumeProfile.vah) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#00dbe9]">
                  VAH // VALUE HIGH
                </span>
                <span className="font-mono text-[8.5px] text-[#00dbe9]">
                  {isPriceTracked(volumeProfile.vah) ? '🎯 TRACKING' : '🎯 TRACK'}
                </span>
              </div>
              <div className="font-mono text-[17px] font-bold text-[#dbfcff] mt-1.5">
                ${formatP(volumeProfile.vah)}
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-1">
                Upper 70% institutional bell-curve boundary
              </span>
            </div>

            {/* POC */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'POC (Point of Control)', volumeProfile.poc)}
              className={`cyber-panel border-l-2 border-l-[#f59e0b] p-3.5 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(volumeProfile.poc) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#f59e0b]">
                  POC // FAIR VALUE MAGNET
                </span>
                <span className="font-mono text-[8.5px] text-[#f59e0b]">
                  {isPriceTracked(volumeProfile.poc) ? '🎯 TRACKING' : '🎯 TRACK'}
                </span>
              </div>
              <div className="font-mono text-[17px] font-bold text-[#fcd34d] mt-1.5">
                ${formatP(volumeProfile.poc)}
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-1">
                Highest transacted node ({pocBuyPct}% Bid / {100 - pocBuyPct}% Ask)
              </span>
            </div>

            {/* VAL */}
            <div
              onClick={(e) => toggleTrackPrice(e, 'VAL (70% Value Area Low)', volumeProfile.val)}
              className={`cyber-panel border-l-2 border-l-[#4edea3] p-3.5 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(volumeProfile.val) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#4edea3]">
                  VAL // VALUE LOW
                </span>
                <span className="font-mono text-[8.5px] text-[#4edea3]">
                  {isPriceTracked(volumeProfile.val) ? '🎯 TRACKING' : '🎯 TRACK'}
                </span>
              </div>
              <div className="font-mono text-[17px] font-bold text-[#4edea3] mt-1.5">
                ${formatP(volumeProfile.val)}
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-1">
                Lower 70% institutional discount boundary
              </span>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            vaRangePct,
            isDiscount ? '#4edea3' : isPremium ? '#ffb4ab' : '#f59e0b',
            `DISCOUNT < $${formatP(volumeProfile.val)}`,
            `POC FAIR VALUE $${formatP(volumeProfile.poc)}`,
            `PREMIUM > $${formatP(volumeProfile.vah)}`
          )}
        </div>

        {/* CARD 2: Session-Normalized RVOL Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              CARD 2B // SESSION-NORMALIZED RELATIVE VOLUME (SES-RVOL)
            </span>
            <span
              className={`px-2 py-0.5 font-mono text-[10px] font-bold border ${
                sesRvol <= 0.45
                  ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40'
                  : sesRvol >= 2.0
                  ? 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40'
                  : 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
              }`}
            >
              {sesRvol <= 0.45
                ? '💧 VDU EXHAUSTION (<= 0.45x)'
                : sesRvol >= 2.0
                ? '🔥 VOLUME IGNITION (>= 2.0x)'
                : 'NORMAL SESSION FLOW (0.8x–1.5x)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center tabular-nums">
            <div className="p-3.5 bg-[#090c12] border border-[#1e2636] flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[9px] text-[#849495] uppercase">
                  LIVE SESSION RVOL MULTIPLIER
                </span>
                <div className="font-mono text-[22px] font-bold text-[#dbfcff]">
                  <ScrambleValue text={`${sesRvol.toFixed(2)}x`} />
                </div>
                <span className="font-mono text-[9px] text-[#849495]">
                  Normalized against active UTC session baseline
                </span>
              </div>
              <AsciiWaveSparkline
                values={klines.slice(-10).map((k) => k.volume)}
                isStreaming={true}
                barsCount={8}
              />
            </div>

            <div className="p-3.5 bg-[#090c12] border border-[#1e2636] flex flex-col gap-1.5 font-sans text-[11.5px] text-[#b9cacb]">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-[#00f0ff] font-bold">💧 VDU (&le; 0.45x):</span>
                <span>Seller exhaustion at pullbacks (Spring setup)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-[#fcd34d] font-bold">🔥 IGNITION (&ge; 2.0x):</span>
                <span>Institutional breakout displacement</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-[#849495] font-bold">NORMAL (0.8x–1.5x):</span>
                <span>Standard two-sided rotation</span>
              </div>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            Math.min(96, (sesRvol / 2.5) * 100),
            sesRvol <= 0.45 ? '#00f0ff' : sesRvol >= 2.0 ? '#f59e0b' : '#4edea3',
            '0.0x (💧 VDU <= 0.45x)',
            'STD NORM: 0.80x – 1.50x',
            '2.5x+ (🔥 Ignition >= 2.0x)'
          )}
        </div>

        {renderStageFooterAndLearn(STAGES[1])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 03 CONTENT: MOVING AVERAGES & TREND (EMA Ribbon, VWAP, Stretch & MTF)
  // ============================================================================
  const renderStage03Trend = () => {
    const stretch = maResult.stretchScoreAtr;
    const absStretch = Math.abs(stretch);
    const stretchPct = ((stretch + 3.0) / 6.0) * 100;

    const maList = [
      maResult.mas.ema9,
      maResult.mas.ema21,
      maResult.mas.ema50,
      maResult.mas.ema200,
      maResult.mas.sma200,
      maResult.mas.vwap,
    ];

    return (
      <div className="flex flex-col p-4 gap-4">
        {renderStageVerdictBanner(STAGES[2])}

        {/* CARD 1: EMA Ribbon & VWAP Stack Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
                CARD 3A // EMA RIBBON &amp; SESSION VWAP STACK (CLICK TO SPOTLIGHT)
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
              <span
                className={`px-2 py-0.5 font-bold border ${
                  maResult.ribbonBias === 'BULLISH'
                    ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                    : maResult.ribbonBias === 'BEARISH'
                    ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                    : 'bg-[#849495]/10 text-[#849495] border-[#849495]/30'
                }`}
              >
                {maResult.ribbonBias} STACK
              </span>
              <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#b9cacb]">
                {maResult.emaCross50200}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 tabular-nums">
            {maList.map((ma) => (
              <div
                key={ma.name}
                onClick={(e) => toggleTrackPrice(e, `${ma.name} LEVEL`, ma.price)}
                className={`cyber-panel p-3 flex flex-col justify-between cursor-pointer ${
                  isPriceTracked(ma.price) ? 'cyber-panel-tracked' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] font-bold text-[#dbfcff] uppercase">
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
                <div className="font-mono text-[15px] font-bold text-[#e1e2eb] mt-1.5">
                  ${formatP(ma.price)}
                </div>
                <div className="flex items-center justify-between mt-1 font-mono text-[8.5px] text-[#849495]">
                  <span>
                    {ma.distancePct >= 0 ? '+' : ''}
                    {ma.distancePct.toFixed(2)}%
                    {ma.slopeBpsPerBar !== undefined &&
                      ` • ${ma.slopeBpsPerBar >= 0 ? '+' : ''}${ma.slopeBpsPerBar.toFixed(1)} bps/b`}
                  </span>
                  <span className="text-[#00f0ff]">
                    {isPriceTracked(ma.price) ? '🎯 ON' : '🎯'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 2: ATR Rubber-Band Stretch & 4-Timeframe Trend Alignment Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              CARD 3B // ATR RUBBER-BAND STRETCH &amp; 4-TIMEFRAME (15M/1H/4H/1D) ALIGNMENT
            </span>
            <span
              className={`px-2 py-0.5 font-mono text-[10px] font-bold border ${
                absStretch >= 2.2
                  ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/40'
                  : 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
              }`}
            >
              STRETCH: {stretch >= 0 ? '+' : ''}
              {stretch.toFixed(2)} ATR ({maResult.overextensionStatus})
            </span>
          </div>

          {renderBenchmarkRangeStrip(
            stretchPct,
            absStretch >= 2.2 ? '#ffb4ab' : '#4edea3',
            '-3.0 ATR (Oversold Snap)',
            'STD NORM: -1.5 to +1.5 ATR (Safe Pullback Zone)',
            '+3.0 ATR (Overbought Exhaustion)'
          )}

          {/* Multi-Timeframe Confluence Matrix */}
          <div className="pt-1">
            <ConfluenceMatrix confluence={confluence} matrix={matrix} symbol={symbol} />
          </div>
        </div>

        {renderStageFooterAndLearn(STAGES[2])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 04 CONTENT: ORDERFLOW & SMART MONEY (Order Blocks, AMD, CVD & Spot vs Perp)
  // ============================================================================
  const renderStage04Orderflow = () => {
    const spotDelta = telemetry.spotPerpDivergence?.spotDeltaPct ?? 0;
    const perpDelta = telemetry.spotPerpDivergence?.perpDeltaPct ?? 0;
    const basisBps = telemetry.spotPerpDivergence?.basisBps ?? 0;
    const bidWallPrice = liquidity?.bidLiquidityPrice || currentPrice * 0.985;
    const askWallPrice = liquidity?.askLiquidityPrice || currentPrice * 1.015;

    return (
      <div className="flex flex-col p-4 gap-4">
        {renderStageVerdictBanner(STAGES[3])}

        {/* CARD 1: Order Block Mitigation & Wyckoff AMD Cycle Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              CARD 4A // ORDER BLOCK MITIGATION &amp; WYCKOFF AMD CYCLE
            </span>
            <span className="font-mono text-[10px] text-[#00f0ff] font-bold">
              PHASE: {amdPhase.phase}
            </span>
          </div>

          {/* Bull & Bear Order Block Cards (Click to spotlight 50% Mean Threshold on chart) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 tabular-nums">
            <div
              onClick={(e) =>
                bullOB &&
                toggleTrackPrice(
                  e,
                  `BULL OB 50% MT (Q:${bullOB.qualityScore ?? 80})`,
                  bullOB.midpoint
                )
              }
              className={`cyber-panel border-l-2 border-l-[#4edea3] p-3.5 flex flex-col justify-between cursor-pointer ${
                bullOB && isPriceTracked(bullOB.midpoint) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#4edea3] uppercase">
                  BULL OB // INSTITUTIONAL DEMAND
                </span>
                <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#4edea3]/40 font-mono text-[8.5px] text-[#4edea3] font-bold">
                  {bullOB && isPriceTracked(bullOB.midpoint)
                    ? '🎯 TRACKING 50% MT'
                    : `Q:${bullOB?.qualityScore ?? 80}/100 • 🎯 TRACK`}
                </span>
              </div>
              {bullOB ? (
                <>
                  <div className="font-mono text-[16px] font-bold text-[#4edea3] mt-1.5">
                    50% Mean: ${formatP(bullOB.midpoint)}
                  </div>
                  <div className="flex items-center justify-between font-mono text-[9.5px] text-[#b9cacb] mt-1">
                    <span>
                      Zone: ${formatP(bullOB.low)} – ${formatP(bullOB.high)}
                    </span>
                    <span className="text-[#849495]">
                      {bullOB.mitigationStatus || 'FRESH'} ({Math.round(bullOB.mitigationPct || 0)}% mit)
                    </span>
                  </div>
                </>
              ) : (
                <span className="font-mono text-[11px] text-[#849495] mt-2">
                  No active unmitigated Bullish Order Block in scan window
                </span>
              )}
            </div>

            <div
              onClick={(e) =>
                bearOB &&
                toggleTrackPrice(
                  e,
                  `BEAR OB 50% MT (Q:${bearOB.qualityScore ?? 80})`,
                  bearOB.midpoint
                )
              }
              className={`cyber-panel border-l-2 border-l-[#ffb4ab] p-3.5 flex flex-col justify-between cursor-pointer ${
                bearOB && isPriceTracked(bearOB.midpoint) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#ffb4ab] uppercase">
                  BEAR OB // INSTITUTIONAL SUPPLY
                </span>
                <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#ffb4ab]/40 font-mono text-[8.5px] text-[#ffb4ab] font-bold">
                  {bearOB && isPriceTracked(bearOB.midpoint)
                    ? '🎯 TRACKING 50% MT'
                    : `Q:${bearOB?.qualityScore ?? 80}/100 • 🎯 TRACK`}
                </span>
              </div>
              {bearOB ? (
                <>
                  <div className="font-mono text-[16px] font-bold text-[#ffb4ab] mt-1.5">
                    50% Mean: ${formatP(bearOB.midpoint)}
                  </div>
                  <div className="flex items-center justify-between font-mono text-[9.5px] text-[#b9cacb] mt-1">
                    <span>
                      Zone: ${formatP(bearOB.low)} – ${formatP(bearOB.high)}
                    </span>
                    <span className="text-[#849495]">
                      {bearOB.mitigationStatus || 'FRESH'} ({Math.round(bearOB.mitigationPct || 0)}% mit)
                    </span>
                  </div>
                </>
              ) : (
                <span className="font-mono text-[11px] text-[#849495] mt-2">
                  No active unmitigated Bearish Order Block in scan window
                </span>
              )}
            </div>
          </div>

          {/* Wyckoff AMD Cycle Engine */}
          <div className="pt-1">
            <AMDPhaseEngine amdPhase={amdPhase} symbol={symbol} />
          </div>
        </div>

        {/* CARD 2: True Taker CVD Delta, Absorption & Spot-vs-Perp Flow Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              CARD 4B // TRUE TAKER CVD DELTA, ABSORPTION &amp; SPOT-VS-PERP FLOW
            </span>
            <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#00f0ff]/40 font-mono text-[9.5px] text-[#00f0ff] font-bold">
              {telemetry.spotPerpDivergence?.headline || telemetry.divergenceBias}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <span className="font-mono text-[9px] text-[#849495] uppercase">
                CUMULATIVE VOLUME DELTA (CVD)
              </span>
              <div
                className={`font-mono text-[17px] font-bold mt-1 ${
                  telemetry.cvdDelta >= 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
                }`}
              >
                {telemetry.cvdDelta >= 0 ? '+' : ''}
                {Math.round(telemetry.cvdDelta).toLocaleString()}
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-0.5">
                {telemetry.divergenceBias}
              </span>
            </div>

            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <span className="font-mono text-[9px] text-[#849495] uppercase">
                SPOT Δ VS PERP Δ FLOW
              </span>
              <div className="font-mono text-[13px] font-bold text-[#dbfcff] mt-1 flex items-center gap-2">
                <span className="text-[#4edea3]">
                  Spot: {spotDelta >= 0 ? '+' : ''}
                  {spotDelta.toFixed(1)}%
                </span>
                <span>•</span>
                <span className="text-[#00f0ff]">
                  Perp: {perpDelta >= 0 ? '+' : ''}
                  {perpDelta.toFixed(1)}%
                </span>
              </div>
              <span className="font-mono text-[8.5px] text-[#fcd34d] mt-0.5">
                Perp-Spot Basis: {basisBps >= 0 ? '+' : ''}
                {basisBps.toFixed(1)} bps
              </span>
            </div>

            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <span className="font-mono text-[9px] text-[#849495] uppercase">
                LIVE ORDERBOOK TUG-OF-WAR
              </span>
              <div className="mt-1.5">
                <AsciiOrderflowBar
                  buyRatio={Math.max(0.15, Math.min(0.85, 0.5 + spotDelta / 100))}
                  width={14}
                />
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-1">
                500-Depth Bid vs Ask Resting Walls
              </span>
            </div>
          </div>

          {/* Clickable 500-Depth Bid & Ask Limit Walls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 tabular-nums">
            <div
              onClick={(e) => toggleTrackPrice(e, 'ORDERBOOK BID WALL', bidWallPrice)}
              className={`p-3 bg-[#090c12] border border-[#1e2636] border-l-2 border-l-[#4edea3] flex items-center justify-between cursor-pointer ${
                isPriceTracked(bidWallPrice) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div>
                <span className="font-mono text-[9px] text-[#4edea3] font-bold uppercase block">
                  500-DEPTH BID WALL (SUPPORT)
                </span>
                <span className="font-mono text-[14px] font-bold text-[#dbfcff]">
                  ${formatP(bidWallPrice)}
                </span>
              </div>
              <span className="font-mono text-[9px] text-[#4edea3] font-bold">
                {liquidity?.bidLiquidityQty
                  ? `${liquidity.bidLiquidityQty.toFixed(1)} ${baseAsset} 🎯`
                  : '🎯 TRACK'}
              </span>
            </div>

            <div
              onClick={(e) => toggleTrackPrice(e, 'ORDERBOOK ASK WALL', askWallPrice)}
              className={`p-3 bg-[#090c12] border border-[#1e2636] border-l-2 border-l-[#ffb4ab] flex items-center justify-between cursor-pointer ${
                isPriceTracked(askWallPrice) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div>
                <span className="font-mono text-[9px] text-[#ffb4ab] font-bold uppercase block">
                  500-DEPTH ASK WALL (SUPPLY)
                </span>
                <span className="font-mono text-[14px] font-bold text-[#dbfcff]">
                  ${formatP(askWallPrice)}
                </span>
              </div>
              <span className="font-mono text-[9px] text-[#ffb4ab] font-bold">
                {liquidity?.askLiquidityQty
                  ? `${liquidity.askLiquidityQty.toFixed(1)} ${baseAsset} 🎯`
                  : '🎯 TRACK'}
              </span>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            50 + spotDelta * 1.5,
            spotDelta >= 0 ? '#4edea3' : '#ffb4ab',
            'PERP-ONLY CHASE TRAP',
            'BALANCED SPOT & PERP FLOW',
            'INSTITUTIONAL SPOT ACCUMULATION'
          )}
        </div>

        {renderStageFooterAndLearn(STAGES[3])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 05 CONTENT: QUANT & DERIVATIVES (Hurst, ADX, Z-Score, Options GEX & Funding/OI)
  // ============================================================================
  const renderStage05Quant = () => {
    const hurst = candlestickResult.marketRegime?.hurstExponent ?? 0.5;
    const adx = candlestickResult.marketRegime?.adx14 ?? 20;
    const sharpe = sharpeSortino?.sharpeRatio ?? 1.0;
    const sortino = sharpeSortino?.sortinoRatio ?? 1.3;
    const zeroGamma = optionsData.zeroGammaLevel || optionsData.maxPain;

    return (
      <div className="flex flex-col p-4 gap-4">
        {renderStageVerdictBanner(STAGES[4])}

        {/* CARD 1: Statistical Regime Gate Card (Hurst, ADX, Z-Score, Sharpe/Sortino) */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              CARD 5A // STATISTICAL REGIME GATE (HURST, ADX, Z-SCORE &amp; SHARPE)
            </span>
            <span
              className={`px-2 py-0.5 font-mono text-[9.5px] font-bold border ${
                candlestickResult.marketRegime?.isBreakoutActive
                  ? 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40'
                  : 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
              }`}
            >
              {candlestickResult.marketRegime?.regimeHeadline || 'MEAN-REVERTING ROTATION'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <span className="font-mono text-[9px] text-[#849495] uppercase">
                HURST EXPONENT (H)
              </span>
              <div className="font-mono text-[17px] font-bold text-[#00f0ff] mt-1">
                {hurst.toFixed(2)}
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-0.5">
                {hurst < 0.48
                  ? 'H < 0.48: Mean-Reverting'
                  : hurst > 0.55
                  ? 'H > 0.55: Persistent Trend'
                  : 'Random Walk Transition'}
              </span>
            </div>

            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <span className="font-mono text-[9px] text-[#849495] uppercase">
                WILDER&apos;S ADX(14)
              </span>
              <div className="font-mono text-[17px] font-bold text-[#dbfcff] mt-1">
                {adx.toFixed(1)}
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-0.5">
                {adx >= 25 ? 'ADX >= 25: Active Trend' : 'ADX < 25: Range Bound'}
              </span>
            </div>

            <div
              onClick={(e) => toggleTrackPrice(e, '50-VWMA FAIR VALUE', telemetry.vwma50)}
              className={`p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between cursor-pointer ${
                isPriceTracked(telemetry.vwma50) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#849495] uppercase">
                  50-VWMA Z-SCORE
                </span>
                <span className="font-mono text-[8px] text-[#00f0ff]">🎯</span>
              </div>
              <div className="font-mono text-[17px] font-bold text-[#fcd34d] mt-1">
                {telemetry.zScore >= 0 ? '+' : ''}
                {telemetry.zScore.toFixed(2)}σ
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-0.5">
                VWMA: ${formatP(telemetry.vwma50)}
              </span>
            </div>

            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col justify-between">
              <span className="font-mono text-[9px] text-[#849495] uppercase">
                SHARPE / SORTINO
              </span>
              <div
                className={`font-mono text-[17px] font-bold mt-1 ${
                  sharpe >= 0.75 ? 'text-[#4edea3]' : sharpe <= -0.5 ? 'text-[#ffb4ab]' : 'text-[#fcd34d]'
                }`}
              >
                {sharpe >= 0 ? '+' : ''}
                {sharpe.toFixed(2)} / {sortino.toFixed(2)}
              </div>
              <span className="font-mono text-[8.5px] text-[#849495] mt-0.5 truncate">
                {sharpeSortino?.sharpeRegime || 'Dampened Intraday Scaling'}
              </span>
            </div>
          </div>

          {renderBenchmarkRangeStrip(
            hurst * 100,
            hurst > 0.55 ? '#f59e0b' : '#4edea3',
            'H < 0.45 (Fade Extremes)',
            'H = 0.50 (Random Walk)',
            'H > 0.55 (Follow Breakouts)'
          )}
        </div>

        {/* CARD 2: Deribit Options GEX & Perpetual Positioning Card */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1e2636] pb-2.5">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              CARD 5B // DERIBIT OPTIONS GEX &amp; PERPETUAL POSITIONING (CLICK STRIKES TO TRACK)
            </span>
            <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#ddb7ff]/40 font-mono text-[9.5px] text-[#ddb7ff] font-bold">
              NET GEX: {telemetry.netGex >= 0 ? '+' : ''}${telemetry.netGex}M ({telemetry.gexBias})
            </span>
          </div>

          {/* 4 Clickable Options Strikes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
            <div
              onClick={(e) => toggleTrackPrice(e, 'ZERO-GAMMA FLIP (0-Γ)', zeroGamma)}
              className={`cyber-panel p-3 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(zeroGamma) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#00f0ff] font-bold">
                  0-Γ FLIP LEVEL
                </span>
                <span className="font-mono text-[8px] text-[#00f0ff]">🎯</span>
              </div>
              <div className="font-mono text-[15px] font-bold text-[#dbfcff] mt-1">
                ${formatP(zeroGamma)}
              </div>
              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                Dealer hedging pivot
              </span>
            </div>

            <div
              onClick={(e) => toggleTrackPrice(e, 'MAX PAIN STRIKE', optionsData.maxPain)}
              className={`cyber-panel p-3 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(optionsData.maxPain) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#ddb7ff] font-bold">
                  MAX PAIN STRIKE
                </span>
                <span className="font-mono text-[8px] text-[#ddb7ff]">🎯</span>
              </div>
              <div className="font-mono text-[15px] font-bold text-[#ddb7ff] mt-1">
                ${formatP(optionsData.maxPain)}
              </div>
              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                08:00 UTC Expiry Pin
              </span>
            </div>

            <div
              onClick={(e) => toggleTrackPrice(e, 'CALL WALL STRIKE', optionsData.callWall)}
              className={`cyber-panel p-3 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(optionsData.callWall) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#ffb4ab] font-bold">
                  CALL WALL CEILING
                </span>
                <span className="font-mono text-[8px] text-[#ffb4ab]">🎯</span>
              </div>
              <div className="font-mono text-[15px] font-bold text-[#ffb4ab] mt-1">
                ${formatP(optionsData.callWall)}
              </div>
              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                Major overhead call OI
              </span>
            </div>

            <div
              onClick={(e) => toggleTrackPrice(e, 'PUT WALL STRIKE', optionsData.putWall)}
              className={`cyber-panel p-3 flex flex-col justify-between cursor-pointer ${
                isPriceTracked(optionsData.putWall) ? 'cyber-panel-tracked' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[#4edea3] font-bold">
                  PUT WALL FLOOR
                </span>
                <span className="font-mono text-[8px] text-[#4edea3]">🎯</span>
              </div>
              <div className="font-mono text-[15px] font-bold text-[#4edea3] mt-1">
                ${formatP(optionsData.putWall)}
              </div>
              <span className="font-mono text-[8px] text-[#849495] mt-0.5">
                Major downside put OI
              </span>
            </div>
          </div>

          {/* 3x2 Interactive Telemetry Cards (Funding, 4H OI, Z-Score, RSI/CVD, Net GEX, 25d Skew) */}
          <TelemetryCards
            metrics={telemetry}
            symbol={symbol}
            experienceMode={experienceMode}
            onHoverLevel={onHoverLevel}
            highlightedLevel={highlightedLevel}
            onNavigateMobilePage={onNavigateMobilePage}
          />

          {/* Collapsible AI Quant Speculation Brief inside Stage 05 */}
          <div className="pt-1 border-t border-[#1e2636]">
            <button
              type="button"
              onClick={() => setShowAiBriefInStage5((p) => !p)}
              className="font-mono text-[9.5px] text-[#00f0ff] hover:underline uppercase font-bold cursor-pointer"
            >
              {showAiBriefInStage5
                ? '▴ HIDE QUANT AI SYNTHESIS BRIEF'
                : '▾ OPEN QUANT AI SYNTHESIS BRIEF & RUN QUANT ENGINE'}
            </button>
            {showAiBriefInStage5 && (
              <div className="mt-2">
                <SpeculationBrief
                  brief={brief}
                  isLoading={isBriefLoading}
                  onRunQuant={onRunQuant}
                  onCopyText={onCopyText}
                />
              </div>
            )}
          </div>
        </div>

        {renderStageFooterAndLearn(STAGES[4])}
      </div>
    );
  };

  // ============================================================================
  // STAGE 06 CONTENT: VERDICT & EXECUTION SIZER
  // ============================================================================
  const renderStage06Execute = () => {
    const activeSetup = lensSetups[selectedSetupLensId] || lensSetups[1];

    return (
      <div className="flex flex-col p-4 gap-4">
        {/* 5-Stage Funnel Alignment Summary Bar */}
        <div className="cyber-panel cyber-scan-active border-l-2 border-l-[#00f0ff] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#00f0ff]/40 font-mono text-[10px] font-bold text-[#00f0ff]">
                STAGE 06 // FINAL FUNNEL SCORECARD &amp; EXECUTION
              </span>
              <span className="font-mono text-[11px] font-bold text-[#dbfcff]">
                <ScrambleValue text={`${stageEvaluations[6].score}%`} /> FUNNEL CONFLUENCE
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowReverseXRay((prev) => !prev)}
              className={`px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase border transition-all cursor-pointer ${
                showReverseXRay
                  ? 'bg-[#f59e0b]/20 text-[#fcd34d] border-[#f59e0b]'
                  : 'bg-[#141821] hover:bg-[#191c22] text-[#00f0ff] border-[#00f0ff]/40'
              }`}
            >
              🔍 {showReverseXRay ? 'HIDE REVERSE X-RAY DECONSTRUCTOR ▴' : 'REVERSE X-RAY DECONSTRUCTOR ▾'}
            </button>
          </div>

          {/* Visual Row of Stages 1 to 5 with Pass/Wait Status */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 tabular-nums">
            {([1, 2, 3, 4, 5] as const).map((sId) => {
              const st = STAGES[sId - 1];
              const ev = stageEvaluations[sId];
              return (
                <button
                  key={sId}
                  type="button"
                  onClick={() => handleStageSelect(sId)}
                  className="p-2.5 bg-[#090c12] hover:bg-[#141821] border border-[#1e2636] flex flex-col gap-1 text-left transition-colors cursor-pointer"
                  title={`Click to inspect Stage 0${sId} (${st.shortTitle})`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[9px] text-[#849495] font-bold">
                      {st.stepCode}. {st.shortTitle}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ev.dotColor }}
                    />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span
                      className="font-mono text-[13px] font-bold"
                      style={{ color: ev.dotColor }}
                    >
                      {ev.score}%
                    </span>
                    <span className="font-mono text-[8px] text-[#b9cacb] uppercase">
                      {ev.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Collapsible Reverse X-Ray Deconstructor & Academy Deck */}
          <AnimatePresence initial={false}>
            {showReverseXRay && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden pt-2 border-t border-[#1e2636]"
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

        {/* Lens Setup Selector Pill — 1-Click Load Entry, Stop Loss & Targets from any Stage */}
        <div className="cyber-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider">
              🎯 1-CLICK STAGE SETUP LOADER (SELECT STAGE THESIS TO POPULATE SIZER)
            </span>
            <button
              type="button"
              onClick={() =>
                onLoadSetup(
                  activeSetup.suggestedEntry,
                  activeSetup.invalidationPrice,
                  activeSetup.target1Price,
                  activeSetup.target2Price
                )
              }
              className="px-3 py-1 bg-[#4edea3]/15 hover:bg-[#4edea3]/25 text-[#4edea3] border border-[#4edea3]/40 font-mono text-[9.5px] font-bold uppercase cursor-pointer"
            >
              ⚡ LOAD {activeSetup.lensTitle} INTO SIZER
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[9px]">
            {(
              [
                { lensId: 1, label: '01 PRICE & S/R' },
                { lensId: 3, label: '02 VOLUME & VA' },
                { lensId: 2, label: '03 TREND & MA' },
                { lensId: 4, label: '04 ORDERFLOW' },
                { lensId: 5, label: '05 QUANT & GEX' },
              ] as const
            ).map((item) => {
              const s = lensSetups[item.lensId];
              const isSel = selectedSetupLensId === item.lensId;
              return (
                <button
                  key={item.lensId}
                  type="button"
                  onClick={() => {
                    setSelectedSetupLensId(item.lensId);
                    if (s) {
                      onLoadSetup(
                        s.suggestedEntry,
                        s.invalidationPrice,
                        s.target1Price,
                        s.target2Price
                      );
                    }
                  }}
                  className={`px-2.5 py-2 border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                    isSel
                      ? 'bg-[#00f0ff]/15 border-[#00f0ff] text-[#dbfcff]'
                      : 'bg-[#090c12] hover:bg-[#141821] border-[#1e2636] text-[#849495]'
                  }`}
                >
                  <span className="font-bold text-[#00f0ff]">{item.label}</span>
                  <span className="text-[8.5px] truncate">
                    Entry ${formatP(s?.suggestedEntry || currentPrice)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Stage Setup Summary Strip */}
          {activeSetup && (
            <div className="p-3 bg-[#090c12] border border-[#1e2636] flex flex-col gap-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-[11px] font-bold text-[#dbfcff]">
                  {activeSetup.setupType} ({activeSetup.bias})
                </span>
                <span className="font-mono text-[9.5px] text-[#849495] tabular-nums">
                  Entry: <strong className="text-[#00f0ff]">${formatP(activeSetup.suggestedEntry)}</strong> • Stop:{' '}
                  <strong className="text-[#ffb4ab]">${formatP(activeSetup.invalidationPrice)}</strong> • TP1:{' '}
                  <strong className="text-[#4edea3]">${formatP(activeSetup.target1Price)}</strong> • TP2:{' '}
                  <strong className="text-[#4edea3]">${formatP(activeSetup.target2Price)}</strong>
                </span>
              </div>
              <p className="font-sans text-[11.5px] text-[#b9cacb] leading-snug">
                {activeSetup.thesis}
              </p>
            </div>
          )}
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
          currentSetup={activeSetup}
          experienceMode={experienceMode}
          paperTrades={paperTrades}
          onAddPaperTrade={onAddPaperTrade}
          onRemovePaperTrade={onRemovePaperTrade}
        />

        {/* Position Size Calculator */}
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

        {renderStageFooterAndLearn(STAGES[5])}
      </div>
    );
  };

  // ============================================================================
  // COMPACT ALL VIEW: Clean Single-Page Vertical Stack of All 6 Stage Summaries
  // ============================================================================
  const renderCompactAllStack = () => {
    return (
      <div className="flex flex-col p-4 gap-4">
        <div className="cyber-panel border-l-2 border-l-[#00f0ff] p-3.5 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="font-mono text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider block">
              👁️ COMPACT ALL // 6-STAGE PROGRESSIVE FUNNEL OVERVIEW
            </span>
            <span className="font-sans text-[11.5px] text-[#b9cacb]">
              Scan all 6 institutional layers in sequence or click any stage to open its full interactive workspace and sync chart layers.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('GUIDED')}
            className="px-3 py-1.5 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 font-mono text-[9.5px] font-bold uppercase cursor-pointer"
          >
            RETURN TO GUIDED FLOW →
          </button>
        </div>

        {STAGES.map((st) => {
          const ev = stageEvaluations[st.id];
          return (
            <div
              key={st.id}
              className="cyber-panel p-4 flex flex-col gap-2.5 border-l-2"
              style={{ borderLeftColor: ev.dotColor }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ev.dotColor }}
                  />
                  <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase">
                    {st.fullTitle}
                  </span>
                  <span className="font-mono text-[9.5px] text-[#849495]">({st.subtitle})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 bg-[#090c12] border border-[#1e2636] font-mono text-[10px] font-bold tabular-nums"
                    style={{ color: ev.dotColor }}
                  >
                    {ev.score}% {ev.bias}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('GUIDED');
                      handleStageSelect(st.id);
                    }}
                    className="px-2.5 py-1 bg-[#141821] hover:bg-[#191c22] text-[#00f0ff] border border-[#00f0ff]/40 font-mono text-[9px] font-bold uppercase cursor-pointer"
                  >
                    JUMP TO STAGE {st.stepCode} →
                  </button>
                </div>
              </div>

              <div className="font-mono text-[11px] font-bold text-[#dbfcff]">{ev.headline}</div>
              <p className="font-sans text-[11.5px] text-[#b9cacb] leading-relaxed">
                {ev.takeaway}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full bg-[#10131a]">
      {/* ========================================================================= */}
      {/* TOP PINNED 6-STAGE PROGRESSIVE TRADER PIPELINE STEPPER BAR                */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 bg-[#0b0e14]/95 backdrop-blur-md border-b border-[#1e2636] flex flex-col">
        {/* Stepper Top Sub-Bar: Pipeline Title + View Mode Toggle (GUIDED FLOW | COMPACT ALL) */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2636]/80 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/40 font-mono text-[9px] font-bold tracking-wider">
              6-STAGE FUNNEL
            </span>
            <span className="font-mono text-[10px] text-[#e1e2eb] font-bold uppercase tracking-wider">
              PROGRESSIVE TRADER WORKFLOW
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#10141d] p-0.5 border border-[#1e2636] font-mono text-[9px]">
            <span className="px-1.5 text-[#849495] hidden sm:inline">👁️ VIEW:</span>
            <button
              type="button"
              onClick={() => setViewMode('GUIDED')}
              className={`px-2 py-1 font-bold uppercase transition-colors cursor-pointer ${
                viewMode === 'GUIDED'
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              GUIDED FLOW
            </button>
            <button
              type="button"
              onClick={() => setViewMode('COMPACT_ALL')}
              className={`px-2 py-1 font-bold uppercase transition-colors cursor-pointer ${
                viewMode === 'COMPACT_ALL'
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              COMPACT ALL
            </button>
          </div>
        </div>

        {/* 6 Connected Sequential Stage Pills */}
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-[#1e2636]">
          {STAGES.map((stage) => {
            const isActive = viewMode === 'GUIDED' && activeStage === stage.id;
            const evalData = stageEvaluations[stage.id];
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  setViewMode('GUIDED');
                  handleStageSelect(stage.id);
                }}
                className={`relative flex flex-col justify-between p-2.5 text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#141821] text-[#00f0ff]'
                    : 'bg-[#0b0e14] hover:bg-[#11151f] text-[#849495] hover:text-[#e1e2eb]'
                }`}
              >
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]" />
                )}
                <div className="flex items-center justify-between gap-1 w-full">
                  <span
                    className={`font-mono text-[9px] font-bold tracking-wider ${
                      isActive ? 'text-[#00f0ff]' : 'text-[#849495]'
                    }`}
                  >
                    STAGE {stage.stepCode}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: evalData.dotColor,
                      boxShadow: isActive ? `0 0 8px ${evalData.dotColor}` : 'none',
                    }}
                    title={`Stage ${stage.stepCode}: ${evalData.score}% (${evalData.status})`}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-1 mt-1 w-full">
                  <span
                    className={`font-mono text-[10.5px] font-bold truncate ${
                      isActive ? 'text-[#dbfcff]' : 'text-[#e1e2eb]'
                    }`}
                  >
                    {stage.shortTitle}
                  </span>
                  <span
                    className="font-mono text-[9px] font-bold tabular-nums"
                    style={{ color: evalData.dotColor }}
                  >
                    {evalData.score}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE STAGE BODY OR COMPACT ALL VERTICAL STACK                           */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {viewMode === 'COMPACT_ALL' ? (
          <motion.div
            key="compact-all-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {renderCompactAllStack()}
          </motion.div>
        ) : (
          <motion.div
            key={`guided-stage-${activeStage}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
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
