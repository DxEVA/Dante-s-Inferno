import React, { useState, useMemo } from 'react';
import {
  KlineData,
  VolumeProfile,
  OrderBlock,
  DeribitOptionsData,
  LiquidityLevels,
  TelemetryMetrics,
  ConfluenceOverview,
  AMDPhaseResult,
  ExecutionCalculation,
  CandlestickAnalysisResult,
  MovingAverageAnalysisResult,
  SharpeSortinoMetrics,
} from '../types';
import {
  evaluateFamousStrategies,
  calculateGannAndCyclesTelemetry,
  FamousStrategyEvaluation,
} from '../utils/famousStrategiesEngine';
import { getRookieMentorGuide } from '../utils/metricBenchmarks';
import { ReverseAcademyDeck } from './ReverseAcademyDeck';
import { AcademyProgressState } from '../utils/reverseAcademyEngine';

export interface InfernoCodexHubProps {
  symbol: string;
  currentPrice: number;
  klines: KlineData[];
  volumeProfile: VolumeProfile;
  bullOB: OrderBlock | null;
  bearOB: OrderBlock | null;
  optionsData: DeribitOptionsData;
  liquidity?: LiquidityLevels;
  telemetry: TelemetryMetrics;
  confluence: ConfluenceOverview;
  amdPhase: AMDPhaseResult;
  calcResult: ExecutionCalculation;
  candlestickResult: CandlestickAnalysisResult;
  maResult: MovingAverageAnalysisResult;
  sharpeSortino?: SharpeSortinoMetrics;
  isLight?: boolean;
  highlightedLevel?: { label: string; price: number } | null;
  onHoverLevel?: (level: { label: string; price: number } | null) => void;
  onSelectStage?: (stageId: 1 | 2 | 3 | 4 | 5 | 6) => void;
  onLoadSetup: (entry: number, stop: number, tp1?: number, tp2?: number) => void;
  onProgressChange?: (progress: AcademyProgressState) => void;
  focusXRaySignal?: number;
}

type CodexSubTab = 'ATLAS' | 'MASTERCLASS' | 'XRAY_QUIZ';

interface IndicatorAtlasCardSpec {
  id: string;
  numberBadge: string;
  stageId: 1 | 2 | 3 | 4 | 5 | 6;
  stageLabel: string;
  title: string;
  subtitle: string;
  liveBadge: string;
  spotlightPrice: number;
  spotlightLabel: string;
  equilibriumNorm: string;
  extremeAlert: string;
  analogy: string;
  doRule: string;
  avoidRule: string;
  studyTitle: string;
  studySource: string;
  studyUrl: string;
  renderSvg: () => React.ReactNode;
}

interface StrategyMasterclassMeta {
  setupStep: string;
  triggerStep: string;
  invalidationStep: string;
  psychologyWhy: string;
  regimeTrapWarning: string;
}

const MASTERCLASS_META_MAP: Record<string, StrategyMasterclassMeta> = {
  gann_sq9_cardinal_harmonic: {
    setupStep: 'Normalize anchor price into a 3–4 digit Square of 9 root and project ±90° Cardinal & ±180° Opposition harmonics.',
    triggerStep: 'Wait for price to test a ±90° or ±180° Gann harmonic inside a Solar Cardinal window or with a ≥45% rejection wick.',
    invalidationStep: 'Place hard stop at the adjacent 180° Opposition harmonic; scale TP1 at the opposite 90° Cardinal level.',
    psychologyWhy: 'Institutional execution algorithms and CTA grid models cluster limit orders around square-root price increments (Δ√P = 0.50 and 1.00).',
    regimeTrapWarning: 'Fails during unanchored parabolic news breakouts when Hurst H > 0.62 and price slices through 90° levels without wick absorption.',
  },
  ssrn_yuan_lunar_funding_cycle: {
    setupStep: 'Track astronomical synodic moon age (0–29.53d) and identify ±2.5d New Moon or Full Moon inflection windows.',
    triggerStep: 'Pair New Moon optimism/accumulation or Full Moon exhaustion with a stretched perpetual funding rate or ±1σ Z-Score.',
    invalidationStep: 'Stop beyond Value Area boundary (VAL/VAH) or 1.4x ATR; target 1.8R–3.0R mean rotation.',
    psychologyWhy: 'Yuan, Zheng & Zhu (2006 JFE) documented a 3.3%–5.2% annualized return spread between New and Full Moon windows driven by biological risk-aversion shifts.',
    regimeTrapWarning: 'Never trade lunar dates in isolation—if Spot CVD and Perp CVD are strongly trending against the lunar bias, stand aside.',
  },
  demark_td9_sequential_exhaustion: {
    setupStep: 'Count 9 consecutive bars closing higher or lower than the close 4 bars earlier (close[i] vs close[i-4]).',
    triggerStep: 'Require TD Setup count ≥6/9 paired with a ≥1.35σ statistical stretch from the 50-VWMA and a rejection wick.',
    invalidationStep: 'Place stop 1.25x ATR beyond the TD8/TD9 exhaustion spike; target snapback to the 50-VWMA and POC.',
    psychologyWhy: 'Late-stage momentum chasers exhaust their buying/selling power after 8–9 consecutive directional closes, leaving a vacuum back to fair value.',
    regimeTrapWarning: 'In runaway macro breakouts (ADX > 35), a TD9 count can extend into a 13-bar TD Countdown—always demand wick rejection before fading.',
  },
  crabel_nr7_volatility_coil: {
    setupStep: 'Scan for an NR7 or NR4 bar (narrowest high-low range of the last 7 or 4 candles) showing coiled volatility compression.',
    triggerStep: 'Enter on a directional breakout above the coil high (or below the coil low) backed by rising Session RVOL and 21 EMA alignment.',
    invalidationStep: 'Set a tight mechanical stop at the opposite extreme of the NR7/NR4 coil bar; ride expansion to 1.8R and 3.0R.',
    psychologyWhy: 'Volatility is mean-reverting: extreme range contraction stores kinetic energy as both bulls and bears build tight stop clusters outside the coil.',
    regimeTrapWarning: 'Avoid trading breakouts during dead Asian-session VDU (RVOL < 0.45x) without taker delta follow-through, which produces head-fake wicks.',
  },
  dennis_turtle_20b_breakout: {
    setupStep: 'Plot the 20-bar Donchian Channel high and low alongside Wilder’s 14-period ATR (N).',
    triggerStep: 'Enter immediately when price pierces or closes near the 20-bar high/low with Hurst H ≥ 0.51 and aligned Taker Delta.',
    invalidationStep: 'Enforce the classic Turtle 2N mechanical stop (2.0 × ATR14 from entry) and trail winners toward 3.6N–6.0N.',
    psychologyWhy: 'True fat-tail crypto trends generate massive asymmetric payoffs that pay for small false-breakout scratches many times over.',
    regimeTrapWarning: 'Whipsaws heavily in choppy, mean-reverting ranges (Hurst H < 0.46 and ADX < 20)—filter out low-Hurst environments.',
  },
  williams_smash_day_reversal: {
    setupStep: 'Identify a 14-period Williams %R stretch beyond -68 (oversold) or -32 (overbought) near fractal S/R or an Order Block.',
    triggerStep: 'Look for a "Smash Day" sweep of prior lows/highs that reverses intra-bar with strong Close Location Value (CLV ≥ 58% or ≤ 42%).',
    invalidationStep: 'Hide stop loss just beyond the swept Smash-Day wick tail; target 1.8R and 3.0R as trapped breakout traders cover.',
    psychologyWhy: 'Stop-runs below obvious multi-bar lows flush weak retail hands directly into institutional limit bids, fueling violent V-reversals.',
    regimeTrapWarning: 'Fails if the breakdown candle closes at the dead bottom of its range (CLV < 15%) on heavy Spot selling.',
  },
  ssrn_zarattini_orb: {
    setupStep: 'Filter strictly for an "Asset in Play" experiencing abnormal Session-Normalized RVOL (≥ 1.35x) and momentum persistence.',
    triggerStep: 'Enter in the direction of a wide-body range expansion candle (Body ≥ 0.85x ATR) confirmed by positive/negative BarDelta.',
    invalidationStep: 'Stop at 1.25x ATR behind the breakout bar; scale out at 1.8R and 3.0R.',
    psychologyWhy: 'Zarattini & Barbon (2024 SSRN) proved that Opening Range Breakouts only generate high Sharpe ratios when relative volume confirms institutional participation.',
    regimeTrapWarning: 'Never apply ORB rules to quiet, low-RVOL coins (< 0.85x RVOL), where breakouts almost universally mean-revert.',
  },
  ssrn_cont_ofi_absorption: {
    setupStep: 'Wait for price to auction within 1.25% of Value Area Low (VAL) or Value Area High (VAH).',
    triggerStep: 'Confirm Passive Limit Absorption: heavy Taker BarDelta slams into the level but fails to break through, leaving a ≥45% rejection wick.',
    invalidationStep: 'Place stop 1.15x ATR outside VAL/VAH; target rotation back to Point of Control (POC) and the opposite Value Area edge.',
    psychologyWhy: 'Cont, Kukanov & Stoikov (SSRN) showed that when aggressive market orders fail to move price, deep passive limit walls are absorbing flow.',
    regimeTrapWarning: 'If Spot CVD accelerates through VAL/VAH with a full-body Marubozu candle, passive liquidity has been exhausted—abort the fade.',
  },
  ssrn_barbon_donchian_trend: {
    setupStep: 'Verify a clean institutional EMA 9 > 21 > 50 bull stack (or 9 < 21 < 50 bear stack) free of EMA compression coils.',
    triggerStep: 'Enter on a trend continuation pullback or 12-bar channel breakout while Hurst H ≥ 0.51 and ATR Stretch ≤ 2.15x.',
    invalidationStep: 'Trail stop behind the 21 EMA (or 1.35x ATR); target 1.8R and 3.0R volatility-targeted extensions.',
    psychologyWhy: 'Combining multi-horizon moving average stacks with volatility sizing captures sustained institutional markups while avoiding blow-off tops.',
    regimeTrapWarning: 'Strictly avoid when the EMA ribbon is tangled in a COMPRESSION COIL or when ATR Stretch exceeds 2.5x ATR.',
  },
  ssrn_wen_bouri_zscore_rev: {
    setupStep: 'Measure the volume-weighted standard deviation stretch (Z-Score) of price from its 50-period VWMA.',
    triggerStep: 'Trigger contrarian mean-reversion when |Z-Score| ≥ 1.65σ inside a low-Hurst regime (H < 0.51) with supportive CLV.',
    invalidationStep: 'Place stop 1.25x ATR beyond the extreme excursion; target the 50-VWMA magnet first and POC second.',
    psychologyWhy: 'Wen, Bouri & Dobrynskaya (2022) demonstrated that intraday crypto overreactions beyond ±1.75σ reliably snap back once retail leverage exhausts.',
    regimeTrapWarning: 'Fatal in high-Hurst trend regimes (H > 0.55 or ADX ≥ 26) where price "walks the band" rather than reverting.',
  },
  raschke_holy_grail: {
    setupStep: 'Confirm a locked-in institutional trend using Wilder’s ADX(14) ≥ 24 with 21 EMA stacked above/below 50 EMA.',
    triggerStep: 'Wait for a quiet, low-volume (VDU RVOL ≤ 1.05x) pullback within 0.85% of the 21 EMA that prints a rejection wick.',
    invalidationStep: 'Place stop beyond the 50 EMA or 1.15x ATR; target a retest of the 20-bar Donchian swing high/low.',
    psychologyWhy: 'After a high-ADX impulse, institutional desks reload on the first quiet pullback to the 20/21 EMA while retail traders fear a trend reversal.',
    regimeTrapWarning: 'Do not buy a 21 EMA pullback if ADX isbelow 20 (trendless chop) or if pullback volume spikes above 1.8x RVOL (institutional distribution).',
  },
  steidlmayer_amt_80pct_rule: {
    setupStep: 'Monitor price when it auctions outside the 70% Value Area (above VAH or below VAL) and fails to find acceptance.',
    triggerStep: 'Trigger when price re-enters the Value Area box (between VAL and VAH) in a balanced/rotational regime (Hurst ≤ 0.52).',
    invalidationStep: 'Place stop 0.95x ATR outside the rejected Value Area edge; target POC (TP1) and the opposite Value Area boundary (TP2).',
    psychologyWhy: 'CBOT Auction Market Theory proves that rejected breakouts outside Value Area trigger an 80% probability rotation across the entire bell curve.',
    regimeTrapWarning: 'Invalidated if price holds outside VAH/VAL on expanding RVOL (> 1.5x), signaling a true Value Area migration.',
  },
  wyckoff_spring_judas_ob: {
    setupStep: 'Locate an unmitigated institutional Bullish or Bearish Order Block and mark its exact 50% Mean Threshold (MT) line.',
    triggerStep: 'Wait for a Wyckoff "Spring" / Judas manipulation sweep into the 50% MT accompanied by Spot whale accumulation and a ≥45% pinbar wick.',
    invalidationStep: 'Hard invalidation if a candle body closes beyond the 50% Mean Threshold (stop 0.85x ATR past distal OB edge); target POC and VAH/VAL.',
    psychologyWhy: 'Composite operators engineer fake breakdowns into unmitigated Order Blocks to harvest retail stop-loss liquidity before marking price up.',
    regimeTrapWarning: 'Never catch a falling knife inside an Order Block if Spot CVD is dumping harder than Perp CVD—wait for the 50% MT rejection wick.',
  },
  deribit_gex_zero_gamma: {
    setupStep: 'Map Deribit Net Dealer Gamma Exposure (GEX), the Black-Scholes Zero-Gamma (0-Γ) flip strike, Max Pain, and Call/Put Walls.',
    triggerStep: 'In +GEX (Spot > 0-Γ), fade extremes back toward Max Pain; in -GEX (Spot < 0-Γ), trade momentum breakouts toward the Put/Call Wall.',
    invalidationStep: 'Stop at 1.3x ATR from entry; target the active Call Wall (for LONG) or downside Put Wall (for SHORT).',
    psychologyWhy: 'In +GEX, options market-makers must sell rips and buy dips to stay delta-neutral; in -GEX, dealers are forced to hedge in the direction of the move.',
    regimeTrapWarning: 'Within 2 hours of the 08:00 UTC Deribit options expiry, gamma pin effects decay rapidly as contracts settle.',
  },
};

export const InfernoCodexHub: React.FC<InfernoCodexHubProps> = ({
  symbol,
  currentPrice,
  klines,
  volumeProfile,
  bullOB,
  bearOB,
  optionsData,
  liquidity,
  telemetry,
  confluence,
  amdPhase,
  calcResult,
  candlestickResult,
  maResult,
  sharpeSortino,
  isLight = false,
  highlightedLevel,
  onHoverLevel,
  onSelectStage,
  onLoadSetup,
  onProgressChange,
  focusXRaySignal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<CodexSubTab>('ATLAS');
  const [selectedEraFilter, setSelectedEraFilter] = useState<string>('ALL');

  const safePrice = currentPrice > 0 ? currentPrice : 1000;
  const formatP = (p: number) => {
    if (!p || !Number.isFinite(p)) return '0';
    if (p < 0.001) return p.toFixed(7);
    if (p < 0.1) return p.toFixed(5);
    if (p < 10) return p.toFixed(4);
    if (p < 1000) return p.toFixed(2);
    return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const gannCycles = useMemo(
    () =>
      calculateGannAndCyclesTelemetry(
        safePrice,
        volumeProfile.poc || safePrice,
        Date.now(),
        klines
      ),
    [safePrice, volumeProfile.poc, klines]
  );

  const famousStrategies = useMemo<FamousStrategyEvaluation[]>(
    () =>
      evaluateFamousStrategies({
        symbol,
        currentPrice: safePrice,
        klines,
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
      }),
    [
      symbol,
      safePrice,
      klines,
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
    ]
  );

  const isPriceSpotlit = (price: number) =>
    Boolean(
      highlightedLevel &&
        price > 0 &&
        Math.abs(highlightedLevel.price - price) / price < 0.0003
    );

  const handleSpotlightPrice = (label: string, price: number) => {
    if (!onHoverLevel || price <= 0) return;
    if (isPriceSpotlit(price)) {
      onHoverLevel(null);
    } else {
      onHoverLevel({ label, price });
    }
  };

  // ============================================================================
  // 12 TERMINAL INDICATORS FOR TAB 1: VISUAL ELEMENT ATLAS
  // ============================================================================
  const atlasCards = useMemo<IndicatorAtlasCardSpec[]>(() => {
    const wickRatioPct = Math.round((candlestickResult.anatomy?.wickRejectionRatio ?? 0.45) * 100);
    const clvPct = Math.round(candlestickResult.anatomy?.clvPct ?? 52);
    const srLow = liquidity?.srLow || volumeProfile.val || safePrice * 0.985;
    const srHigh = liquidity?.srHigh || volumeProfile.vah || safePrice * 1.015;
    const poc = volumeProfile.poc || safePrice;
    const vah = volumeProfile.vah || safePrice * 1.015;
    const val = volumeProfile.val || safePrice * 0.985;
    const sessionRvol = telemetry.sessionRvol ?? volumeProfile.sessionRvol ?? 1.0;
    const sessionName = telemetry.sessionName || volumeProfile.sessionName || 'NY';
    const e21 = maResult.mas.ema21.price || safePrice;
    const obMid =
      bullOB?.meanThreshold ||
      bullOB?.midpoint ||
      bearOB?.meanThreshold ||
      bearOB?.midpoint ||
      val;
    const obQual = bullOB?.qualityScore || bearOB?.qualityScore || 75;
    const lastDelta =
      (klines.length > 0 ? klines[klines.length - 1]?.barDelta : undefined) ??
      telemetry.cvdDelta ??
      0;
    const spotCvd = telemetry.spotPerpDivergence?.spotCvd20 ?? telemetry.spotCvdDelta ?? 0;
    const perpCvd = telemetry.spotPerpDivergence?.perpCvd20 ?? telemetry.cvdDelta ?? 0;
    const basisBps = telemetry.basisBps ?? 1.5;
    const hurst = telemetry.hurstExponent ?? telemetry.marketRegime?.hurstExponent ?? 0.51;
    const adx = telemetry.adx14 ?? telemetry.marketRegime?.adx14 ?? 24.0;
    const zScore = telemetry.zScore ?? 0;
    const sharpe = sharpeSortino?.sharpeRatio ?? telemetry.sharpeRatio ?? 0.85;
    const zeroGamma = optionsData.zeroGammaLevel || telemetry.zeroGammaLevel || poc;

    const wickMentor = getRookieMentorGuide('wick_rejection', symbol);
    const vpMentor = getRookieMentorGuide('volume_profile', symbol);
    const rvolMentor = getRookieMentorGuide('session_rvol', symbol);
    const stretchMentor = getRookieMentorGuide('atr_stretch', symbol);
    const obMentor = getRookieMentorGuide('order_blocks', symbol);
    const cvdMentor = getRookieMentorGuide('cvd_delta', symbol);
    const hurstMentor = getRookieMentorGuide('hurst_adx', symbol);
    const zMentor = getRookieMentorGuide('vwma_zscore', symbol);
    const gexMentor = getRookieMentorGuide('net_gex', symbol);

    return [
      {
        id: 'candlestick_wicks_clv',
        numberBadge: '01',
        stageId: 1,
        stageLabel: 'STAGE 01 // PRICE',
        title: 'Candlestick Wicks & Close Location Value (CLV %)',
        subtitle: 'Intra-Bar Liquidity Sweep & Rejection Anatomy',
        liveBadge: `Wick ${wickRatioPct}% • CLV ${clvPct}% (${candlestickResult.primaryPattern?.name || 'Neutral Bar'})`,
        spotlightPrice: safePrice,
        spotlightLabel: `${symbol} ACTIVE CANDLE CLOSE ($${formatP(safePrice)})`,
        equilibriumNorm: 'Wick 20%–40% • CLV 35%–65% (Balanced 2-way auction)',
        extremeAlert: 'Wick ≥ 50% = Institutional Sweep Rejection • CLV ≥ 75% Bull Thrust',
        analogy:
          wickMentor.familiarBridge ||
          'A long bottom wick with high CLV (>70%) is a springboard: sellers pushed price down intra-bar, but limit buyers slammed the door shut before the close.',
        doRule: 'Enter in the direction of ≥45% rejection wicks when they form directly at S/R, VAL/VAH, or a 50% Order Block.',
        avoidRule: 'Never fade a wide-body Marubozu candle with <15% wicks—momentum is still accelerating.',
        studyTitle: 'Candlestick Wick Rejection & Pinbar Anatomy',
        studySource: 'Investopedia',
        studyUrl: 'https://www.investopedia.com/terms/c/candlestick.asp',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <line x1="20" y1="52" x2="220" y2="52" stroke="#1e2636" strokeDasharray="3 3" strokeWidth="1" />
            <text x="24" y="48" fill="#4edea3" fontSize="8" fontFamily="monospace">SWEEP LEVEL</text>
            {/* Bullish Pinbar */}
            <line x1="85" y1="12" x2="85" y2="58" stroke="#4edea3" strokeWidth="2" />
            <rect x="77" y="16" width="16" height="14" rx="2" fill="#4edea3" />
            <text x="108" y="24" fill="#dbfcff" fontSize="8.5" fontFamily="monospace">CLV 82% (CLOSE HIGH)</text>
            <text x="108" y="42" fill="#849495" fontSize="8" fontFamily="monospace">58% Rejection Tail</text>
          </svg>
        ),
      },
      {
        id: 'fractal_sr_pivots',
        numberBadge: '02',
        stageId: 1,
        stageLabel: 'STAGE 01 // PRICE',
        title: 'Fractal S/R Pivots (SR_LOW / SR_HIGH & Depth Walls)',
        subtitle: 'Multi-Bar Swing Floors, Ceilings & Resting Limit Book',
        liveBadge: `SUP $${formatP(srLow)} • RES $${formatP(srHigh)}`,
        spotlightPrice: srLow,
        spotlightLabel: `${symbol} FRACTAL SUPPORT ($${formatP(srLow)})`,
        equilibriumNorm: 'Spot trading mid-channel between SR_LOW and SR_HIGH',
        extremeAlert: 'Within ≤0.6% of SR_LOW / SR_HIGH = High-gamma inflection test',
        analogy:
          'Fractal Support and Resistance act as the concrete floor and ceiling of the current room—price either bounces off them or smashes through to the next floor.',
        doRule: 'Anchor your Stop Loss just outside SR_LOW (for Longs) or SR_HIGH (for Shorts) rather than inside the noise zone.',
        avoidRule: 'Never initiate a fresh trade dead in the middle of the S/R range where Risk:Reward is 1:1.',
        studyTitle: 'Support & Resistance Fractal Pivot Structure',
        studySource: 'TradingView',
        studyUrl: 'https://www.tradingview.com/support/solutions/43000502023-support-and-resistance/',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <line x1="16" y1="14" x2="224" y2="14" stroke="#ffb4ab" strokeDasharray="4 2" strokeWidth="1.5" />
            <text x="20" y="11" fill="#ffb4ab" fontSize="7.5" fontFamily="monospace">SR_HIGH RESISTANCE</text>
            <line x1="16" y1="52" x2="224" y2="52" stroke="#4edea3" strokeDasharray="4 2" strokeWidth="1.5" />
            <text x="20" y="61" fill="#4edea3" fontSize="7.5" fontFamily="monospace">SR_LOW SUPPORT</text>
            <polyline
              fill="none"
              stroke="#00f0ff"
              strokeWidth="2"
              points="24,38 55,51 90,26 125,15 160,40 192,51 218,28"
            />
            <circle cx="55" cy="51" r="3" fill="#4edea3" />
            <circle cx="125" cy="15" r="3" fill="#ffb4ab" />
            <circle cx="192" cy="51" r="3" fill="#4edea3" />
          </svg>
        ),
      },
      {
        id: 'volume_profile_bell_curve',
        numberBadge: '03',
        stageId: 2,
        stageLabel: 'STAGE 02 // VOLUME',
        title: 'Volume Profile (POC, 70% VAH & VAL)',
        subtitle: '60-Bucket Auction Market Theory Bell Curve',
        liveBadge: `POC $${formatP(poc)} • VAL $${formatP(val)} – VAH $${formatP(vah)}`,
        spotlightPrice: poc,
        spotlightLabel: `${symbol} POINT OF CONTROL POC ($${formatP(poc)})`,
        equilibriumNorm: '70% of all volume transacts between VAL and VAH around POC',
        extremeAlert: 'Below VAL = Institutional Wholesale Discount • Above VAH = Premium',
        analogy:
          vpMentor.familiarBridge ||
          'Standard volume shows WHEN people traded; Volume Profile shows the exact PRICES where whales accumulated the most coins (POC magnet).',
        doRule: 'Buy rejections at VAL targeting POC, or trade Steidlmayer’s 80% Rule when price re-enters the Value Area box.',
        avoidRule: 'Avoid opening new positions right at the Point of Control (POC)—that is peak chop where bulls and bears agree on fair value.',
        studyTitle: 'Volume Profile Indicators: POC, VAH & VAL',
        studySource: 'TradingView',
        studyUrl: 'https://www.tradingview.com/support/solutions/43000502040-volume-profile-indicators-basic-concepts/',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <rect x="16" y="10" width="36" height="6" fill="#3b494b" rx="1" />
            <rect x="16" y="19" width="68" height="6" fill="#00f0ff" fillOpacity="0.45" rx="1" />
            <rect x="16" y="28" width="115" height="7" fill="#f59e0b" rx="1" />
            <rect x="16" y="38" width="76" height="6" fill="#00f0ff" fillOpacity="0.45" rx="1" />
            <rect x="16" y="47" width="42" height="6" fill="#3b494b" rx="1" />
            <line x1="16" y1="31.5" x2="224" y2="31.5" stroke="#f59e0b" strokeDasharray="3 2" strokeWidth="1.2" />
            <text x="138" y="23" fill="#00f0ff" fontSize="7.5" fontFamily="monospace">VAH (70% Upper)</text>
            <text x="138" y="34" fill="#fcd34d" fontSize="8" fontFamily="monospace" fontWeight="bold">POC FAIR VALUE</text>
            <text x="138" y="45" fill="#4edea3" fontSize="7.5" fontFamily="monospace">VAL (70% Lower)</text>
          </svg>
        ),
      },
      {
        id: 'session_normalized_rvol',
        numberBadge: '04',
        stageId: 2,
        stageLabel: 'STAGE 02 // VOLUME',
        title: 'Session-Normalized RVOL (💧 VDU vs 🔥 Ignition)',
        subtitle: 'UTC Session-Adjusted Relative Volume Participation',
        liveBadge: `Session RVOL ${sessionRvol.toFixed(2)}x (${sessionName})`,
        spotlightPrice: safePrice,
        spotlightLabel: `${symbol} SESSION RVOL (${sessionRvol.toFixed(2)}x)`,
        equilibriumNorm: rvolMentor.standardRangeGuide.normal,
        extremeAlert: '≤ 0.48x = 💧 VDU Seller Exhaustion • ≥ 1.85x = 🔥 Institutional Ignition',
        analogy:
          rvolMentor.familiarBridge ||
          'Compares current volume only against historical candles from the exact same UTC session (Asian, London, or NY Overlap) so quiet Asian hours are judged fairly.',
        doRule: rvolMentor.rookieActionRule.doThis,
        avoidRule: rvolMentor.rookieActionRule.avoidTrap,
        studyTitle: 'Relative Volume (RVOL) & Volume Dry-Up (VDU)',
        studySource: 'Investopedia',
        studyUrl: 'https://www.investopedia.com/terms/v/volumeoftrade.asp',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <line x1="16" y1="36" x2="224" y2="36" stroke="#849495" strokeDasharray="3 3" strokeWidth="1" />
            <text x="172" y="33" fill="#849495" fontSize="7.5" fontFamily="monospace">1.0x NORM</text>
            <rect x="28" y="34" width="14" height="22" fill="#3b494b" rx="1" />
            <rect x="52" y="37" width="14" height="19" fill="#3b494b" rx="1" />
            <rect x="76" y="47" width="14" height="9" fill="#00f0ff" rx="1" />
            <rect x="100" y="49" width="14" height="7" fill="#00f0ff" rx="1" />
            <rect x="128" y="12" width="16" height="44" fill="#f59e0b" rx="1" />
            <text x="72" y="44" fill="#00f0ff" fontSize="7.5" fontFamily="monospace">💧VDU</text>
            <text x="150" y="24" fill="#fcd34d" fontSize="8" fontFamily="monospace">🔥 2.1x IGNITION</text>
          </svg>
        ),
      },
      {
        id: 'ema_ribbon_vwap_stretch',
        numberBadge: '05',
        stageId: 3,
        stageLabel: 'STAGE 03 // TREND & MA',
        title: 'EMA Ribbon (9/21/50/200), Session VWAP & ATR Stretch',
        subtitle: 'Institutional Trend Stack & Rubber-Band Overextension',
        liveBadge: `${maResult.ribbonAlignment} • Stretch ${maResult.stretchScoreAtr.toFixed(2)}x ATR`,
        spotlightPrice: e21,
        spotlightLabel: `${symbol} 21 EMA DYNAMIC PIVOT ($${formatP(e21)})`,
        equilibriumNorm: stretchMentor.standardRangeGuide.normal,
        extremeAlert: 'Stretch ≥ 2.2x ATR from 21 EMA = Rubber-band snapback risk',
        analogy:
          stretchMentor.familiarBridge ||
          'The 21 EMA is the institutional home base and ATR Stretch measures how far price has stretched the rubber band away from that home base.',
        doRule: 'Buy low-volume pullbacks within 0.85% of the 21 EMA when the 9/21/50 ribbon is cleanly stacked.',
        avoidRule: 'Never chase a breakout when price is already stretched >2.2x ATR above the 21 EMA.',
        studyTitle: 'Exponential Moving Average Ribbons & VWAP',
        studySource: 'TradingView',
        studyUrl: 'https://www.tradingview.com/support/solutions/43000502018-volume-weighted-average-price-vwap/',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <path d="M16 52 Q 90 46, 220 28" fill="none" stroke="#c084fc" strokeWidth="1.5" />
            <path d="M16 44 Q 90 36, 220 20" fill="none" stroke="#00f0ff" strokeWidth="2" />
            <path d="M16 36 Q 90 28, 220 12" fill="none" stroke="#4edea3" strokeWidth="1.5" />
            <text x="158" y="13" fill="#4edea3" fontSize="7.5" fontFamily="monospace">EMA 9</text>
            <text x="158" y="23" fill="#00f0ff" fontSize="7.5" fontFamily="monospace">EMA 21 (PULLBACK)</text>
            <text x="158" y="34" fill="#c084fc" fontSize="7.5" fontFamily="monospace">EMA 50</text>
          </svg>
        ),
      },
      {
        id: 'order_blocks_50_mt',
        numberBadge: '06',
        stageId: 4,
        stageLabel: 'STAGE 04 // ORDERFLOW',
        title: 'Institutional Order Blocks & 50% Mean Threshold (MT)',
        subtitle: 'Unmitigated Whale Footprints & Halfway Invalidation Line',
        liveBadge: `50% MT $${formatP(obMid)} • Footprint Quality ${obQual}%`,
        spotlightPrice: obMid,
        spotlightLabel: `${symbol} ORDER BLOCK 50% MT ($${formatP(obMid)})`,
        equilibriumNorm: obMentor.standardRangeGuide.normal,
        extremeAlert: 'Candle body close beyond 50% MT = Institutional Order Block invalidated',
        analogy:
          obMentor.familiarBridge ||
          'An Order Block is the exact price box where whales left unfilled limit orders before a violent displacement impulse; the dashed 50% line is its spine.',
        doRule: 'Place sniper limit entries at the top edge or 50% Mean Threshold (MT) of an unmitigated Order Block.',
        avoidRule: 'Never hold a trade if a full candle body closes past the 50% Mean Threshold line.',
        studyTitle: 'Institutional Order Blocks & Mitigation Structure',
        studySource: 'Bookmap',
        studyUrl: 'https://bookmap.com/blog/order-flow-trading-guide/',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <rect x="20" y="30" width="200" height="24" fill="#4edea3" fillOpacity="0.14" stroke="#4edea3" strokeWidth="1" />
            <line x1="20" y1="42" x2="220" y2="42" stroke="#00f0ff" strokeDasharray="4 2" strokeWidth="1.5" />
            <text x="26" y="40" fill="#00f0ff" fontSize="7.5" fontFamily="monospace">50% MEAN THRESHOLD (MT)</text>
            <polyline fill="none" stroke="#dbfcff" strokeWidth="2" points="40,14 95,41 145,12" />
            <circle cx="95" cy="41" r="3.5" fill="#00f0ff" />
          </svg>
        ),
      },
      {
        id: 'wyckoff_amd_cycle',
        numberBadge: '07',
        stageId: 4,
        stageLabel: 'STAGE 04 // ORDERFLOW',
        title: 'Wyckoff AMD Cycle (Accumulation, Manipulation, Distribution)',
        subtitle: 'Power-of-3 Institutional Liquidity Harvesting Sequence',
        liveBadge: `Phase: ${amdPhase.phase} (${amdPhase.confidence}% Confidence)`,
        spotlightPrice: val,
        spotlightLabel: `${symbol} WYCKOFF MANIPULATION ZONE ($${formatP(val)})`,
        equilibriumNorm: 'Accumulation (Range Coil) ➔ Manipulation (Judas Sweep) ➔ Distribution (Markup)',
        extremeAlert: 'Manipulation Score ≥ 35% = Stop-hunt Judas swing underway',
        analogy:
          'Smart money builds a tight box (Accumulation), fakes a breakdown below the box to steal retail stop-losses (Manipulation), and then rockets price in the true direction (Distribution).',
        doRule: 'Wait for the Manipulation stop-hunt wick to reclaim the Accumulation range low before entering.',
        avoidRule: 'Never sell a breakdown right at the bottom of an Accumulation range—that is the Judas trap.',
        studyTitle: 'Making Money the Wyckoff Way (AMD Cycle)',
        studySource: 'Investopedia',
        studyUrl: 'https://www.investopedia.com/articles/active-trading/070715/making-money-wyckoff-way.asp',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <rect x="18" y="24" width="66" height="18" fill="#1e2636" stroke="#849495" strokeDasharray="2 2" />
            <text x="22" y="21" fill="#849495" fontSize="7" fontFamily="monospace">1. ACCUM</text>
            <polyline fill="none" stroke="#00f0ff" strokeWidth="2" points="22,33 42,28 62,38 82,32 108,56 132,26 198,10" />
            <circle cx="108" cy="56" r="3.5" fill="#ffb4ab" />
            <text x="86" y="62" fill="#ffb4ab" fontSize="7" fontFamily="monospace">2. JUDAS SWEEP</text>
            <text x="148" y="18" fill="#4edea3" fontSize="7.5" fontFamily="monospace">3. EXPANSION</text>
          </svg>
        ),
      },
      {
        id: 'taker_cvd_bubbles_abs',
        numberBadge: '08',
        stageId: 4,
        stageLabel: 'STAGE 04 // ORDERFLOW',
        title: 'Taker CVD Delta, ±2σ Footprint Bubbles & ABS Rings',
        subtitle: 'Aggressive Market Orders vs. Passive Limit Wall Absorption',
        liveBadge: `Bar Δ ${lastDelta >= 0 ? '+' : ''}${lastDelta.toFixed(0)} • CVD ${telemetry.divergenceBias}`,
        spotlightPrice: safePrice,
        spotlightLabel: `${symbol} ACTIVE BAR DELTA (${lastDelta >= 0 ? '+' : ''}${lastDelta.toFixed(0)})`,
        equilibriumNorm: cvdMentor.standardRangeGuide.normal,
        extremeAlert: '±2.0σ Delta Bubble + Compressed Body/Wick = Passive Limit Absorption Ring (ABS)',
        analogy:
          cvdMentor.familiarBridge ||
          'When huge market sell orders (-2σ red bubble) slam into support but price refuses to drop, a glowing ABS ring marks where whale limit bids absorbed the panic.',
        doRule: 'Trade alongside Bullish/Bearish Absorption Rings (ABS) when they print at VAL, VAH, or Order Blocks.',
        avoidRule: 'Do not buy a bounce if CVD Delta is deeply negative and making lower lows without an absorption wick.',
        studyTitle: 'Cumulative Volume Delta (CVD) & Limit Absorption',
        studySource: 'Bookmap',
        studyUrl: 'https://bookmap.com/blog/cumulative-volume-delta-cvd-in-trading/',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <line x1="20" y1="48" x2="220" y2="48" stroke="#4edea3" strokeDasharray="3 3" strokeWidth="1" />
            <circle cx="78" cy="48" r="11" fill="#ffb4ab" fillOpacity="0.2" stroke="#00f0ff" strokeWidth="2" />
            <circle cx="78" cy="48" r="4" fill="#4edea3" />
            <text x="96" y="44" fill="#00f0ff" fontSize="8" fontFamily="monospace" fontWeight="bold">ABS RING (-2.3σ Absorbed)</text>
            <text x="96" y="55" fill="#4edea3" fontSize="7.5" fontFamily="monospace">Limit Whales Held Floor</text>
          </svg>
        ),
      },
      {
        id: 'spot_vs_perp_cvd_basis',
        numberBadge: '09',
        stageId: 4,
        stageLabel: 'STAGE 04 // ORDERFLOW',
        title: 'Spot CVD vs. Perpetual CVD & Futures Basis Spread',
        subtitle: 'Unleveraged Cash Accumulation vs. Speculative Perp Leverage',
        liveBadge: `Spot ${spotCvd >= 0 ? '+' : ''}${spotCvd.toFixed(0)} vs Perp ${perpCvd >= 0 ? '+' : ''}${perpCvd.toFixed(0)} • Basis ${basisBps.toFixed(1)} bps`,
        spotlightPrice: safePrice,
        spotlightLabel: `${symbol} SPOT VS PERP BASIS (${basisBps.toFixed(1)} bps)`,
        equilibriumNorm: 'Spot CVD & Perp CVD rising/falling in sync • Basis -2 to +8 bps',
        extremeAlert: 'Perp CVD surging + Spot CVD dumping = Retail Leverage Trap',
        analogy:
          'Spot buyers must put up 100% real cash to own the asset; Perpetual traders use 20x–50x borrowed leverage. Always follow the real cash (Spot CVD).',
        doRule: 'Highest-conviction Longs occur when Spot CVD climbs steadily while Perp traders are skeptical or shorting.',
        avoidRule: 'Never trust a green pump driven solely by Perp buying while Spot whales are net sellers.',
        studyTitle: 'Spot vs. Perpetual Futures Basis & Orderflow',
        studySource: 'Binance Academy',
        studyUrl: 'https://academy.binance.com/en/articles/what-are-perpetual-futures-contracts',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <polyline fill="none" stroke="#4edea3" strokeWidth="2.2" points="20,48 70,38 120,26 170,18 218,12" />
            <polyline fill="none" stroke="#ffb4ab" strokeDasharray="3 2" strokeWidth="1.5" points="20,34 70,40 120,46 170,50 218,54" />
            <text x="135" y="16" fill="#4edea3" fontSize="8" fontFamily="monospace">SPOT CVD ↑ (WHALES)</text>
            <text x="135" y="58" fill="#ffb4ab" fontSize="8" fontFamily="monospace">PERP CVD ↓ (SHORTS TRAPPED)</text>
          </svg>
        ),
      },
      {
        id: 'hurst_exponent_adx_regime',
        numberBadge: '10',
        stageId: 5,
        stageLabel: 'STAGE 05 // QUANT & GEX',
        title: 'Hurst Exponent (H) & Wilder’s ADX(14) Regime Gate',
        subtitle: 'Fractal Trend Persistence vs. Mean-Reverting Rotation',
        liveBadge: `Hurst H = ${hurst.toFixed(2)} • ADX(14) = ${adx.toFixed(1)}`,
        spotlightPrice: safePrice,
        spotlightLabel: `${symbol} REGIME (H=${hurst.toFixed(2)}, ADX=${adx.toFixed(1)})`,
        equilibriumNorm: hurstMentor.standardRangeGuide.normal,
        extremeAlert: 'H > 0.55 or ADX ≥ 26 = Momentum Breakout • H < 0.46 = Mean Reversion',
        analogy:
          hurstMentor.familiarBridge ||
          'Hurst H tells you whether the market is playing a trending highway game (H > 0.55) or a ping-pong table range game (H < 0.46).',
        doRule: hurstMentor.rookieActionRule.doThis,
        avoidRule: hurstMentor.rookieActionRule.avoidTrap,
        studyTitle: 'Wilder ADX & Fractal Market Regime Persistence',
        studySource: 'Investopedia',
        studyUrl: 'https://www.investopedia.com/articles/trading/07/adx-trend-indicator.asp',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <rect x="18" y="22" width="64" height="22" fill="#00f0ff" fillOpacity="0.15" stroke="#00f0ff" rx="3" />
            <text x="24" y="32" fill="#00f0ff" fontSize="7.5" fontFamily="monospace">H &lt; 0.46</text>
            <text x="24" y="41" fill="#dbfcff" fontSize="7" fontFamily="monospace">PING-PONG</text>
            <rect x="88" y="22" width="64" height="22" fill="#1e2636" stroke="#849495" rx="3" />
            <text x="96" y="36" fill="#849495" fontSize="7.5" fontFamily="monospace">0.50 WALK</text>
            <rect x="158" y="22" width="64" height="22" fill="#4edea3" fillOpacity="0.18" stroke="#4edea3" rx="3" />
            <text x="164" y="32" fill="#4edea3" fontSize="7.5" fontFamily="monospace">H &gt; 0.55</text>
            <text x="164" y="41" fill="#dbfcff" fontSize="7" fontFamily="monospace">TREND WAVE</text>
          </svg>
        ),
      },
      {
        id: 'vwma_zscore_sharpe',
        numberBadge: '11',
        stageId: 5,
        stageLabel: 'STAGE 05 // QUANT & GEX',
        title: '50-VWMA Statistical Z-Score (±2σ) & Rolling Sharpe',
        subtitle: 'Volume-Weighted Bell Curve Stretch & Risk-Adjusted Efficiency',
        liveBadge: `Z-Score ${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}σ • Sharpe ${sharpe.toFixed(2)}`,
        spotlightPrice: telemetry.vwma50 || poc,
        spotlightLabel: `${symbol} 50-VWMA MEAN ($${formatP(telemetry.vwma50 || poc)})`,
        equilibriumNorm: zMentor.standardRangeGuide.normal,
        extremeAlert: '|Z-Score| ≥ 2.0σ (95.4% Bell-Curve Tail) = Exhaustion Snapback Zone',
        analogy:
          zMentor.familiarBridge ||
          'Measures how many standard deviations (σ) price has stretched from its 50-bar Volume-Weighted Mean—at ±2σ, 95% of historical observations snap back.',
        doRule: zMentor.rookieActionRule.doThis,
        avoidRule: zMentor.rookieActionRule.avoidTrap,
        studyTitle: 'Z-Score Standard Deviation & Sharpe Ratio',
        studySource: 'Investopedia',
        studyUrl: 'https://www.investopedia.com/terms/z/zscore.asp',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <path d="M 20 52 C 65 52, 95 10, 120 10 C 145 10, 175 52, 220 52" fill="none" stroke="#00f0ff" strokeWidth="2" />
            <line x1="120" y1="10" x2="120" y2="54" stroke="#849495" strokeDasharray="2 2" />
            <line x1="65" y1="36" x2="65" y2="54" stroke="#4edea3" strokeDasharray="2 2" />
            <line x1="175" y1="36" x2="175" y2="54" stroke="#ffb4ab" strokeDasharray="2 2" />
            <text x="44" y="61" fill="#4edea3" fontSize="7.5" fontFamily="monospace">-2σ BUY</text>
            <text x="104" y="61" fill="#dbfcff" fontSize="7.5" fontFamily="monospace">VWMA50</text>
            <text x="165" y="61" fill="#ffb4ab" fontSize="7.5" fontFamily="monospace">+2σ FADE</text>
          </svg>
        ),
      },
      {
        id: 'deribit_gex_zero_gamma_kelly',
        numberBadge: '12',
        stageId: 6,
        stageLabel: 'STAGE 05–06 // GEX & KELLY',
        title: 'Deribit Net GEX, Zero-Gamma (0-Γ) Flip & Half-Kelly Sizer',
        subtitle: 'Options Dealer Delta-Hedging & Fee-Adjusted Position Sizing',
        liveBadge: `Net GEX ${optionsData.netGex >= 0 ? '+' : ''}$${optionsData.netGex}M • 0-Γ $${formatP(zeroGamma)}`,
        spotlightPrice: zeroGamma,
        spotlightLabel: `${symbol} ZERO-GAMMA 0-Γ FLIP ($${formatP(zeroGamma)})`,
        equilibriumNorm: gexMentor.standardRangeGuide.normal,
        extremeAlert: 'Spot < 0-Γ (-GEX) = Dealer Volatility Squeeze • Spot > 0-Γ (+GEX) = Max Pain Pin',
        analogy:
          gexMentor.familiarBridge ||
          'Above Zero-Gamma (0-Γ), options dealers act like shock absorbers pinning price to Max Pain; below 0-Γ, dealers pour gasoline on directional breakouts.',
        doRule: 'Size every trade using Stage 06 Half-Kelly with Net R:R ≥ 1.5x after Maker/Taker fee drag.',
        avoidRule: 'Never risk >2% of account equity or take <1.2x Net R:R setups where exchange fees eat your statistical edge.',
        studyTitle: 'Options Gamma Exposure (GEX) & Zero-Gamma Flip',
        studySource: 'SpotGamma / Deribit',
        studyUrl: 'https://spotgamma.com/options-education/gamma-exposure-gex/',
        renderSvg: () => (
          <svg viewBox="0 0 240 64" className="h-20 w-full rounded-lg bg-[#070a10] border border-white/5 p-2">
            <line x1="120" y1="8" x2="120" y2="56" stroke="#00f0ff" strokeDasharray="3 2" strokeWidth="1.5" />
            <text x="96" y="16" fill="#00f0ff" fontSize="7.5" fontFamily="monospace" fontWeight="bold">0-Γ FLIP</text>
            <rect x="22" y="28" width="86" height="20" fill="#ffb4ab" fillOpacity="0.15" stroke="#ffb4ab" rx="2" />
            <text x="28" y="41" fill="#ffb4ab" fontSize="7.5" fontFamily="monospace">-GEX VOL SQUEEZE</text>
            <rect x="132" y="28" width="86" height="20" fill="#4edea3" fillOpacity="0.15" stroke="#4edea3" rx="2" />
            <text x="138" y="41" fill="#4edea3" fontSize="7.5" fontFamily="monospace">+GEX PINNING</text>
          </svg>
        ),
      },
    ];
  }, [
    symbol,
    safePrice,
    candlestickResult,
    liquidity,
    volumeProfile,
    telemetry,
    maResult,
    bullOB,
    bearOB,
    amdPhase,
    klines,
    sharpeSortino,
    optionsData,
  ]);

  const filteredMasterclassModels = useMemo(() => {
    if (selectedEraFilter === 'ALL') return famousStrategies;
    return famousStrategies.filter((m) => m.era === selectedEraFilter);
  }, [famousStrategies, selectedEraFilter]);

  return (
    <div className="flex flex-col p-4 gap-4 tabular-nums">
      {/* ==================================================================== */}
      {/* TOP CODEX HEADER & 3-TAB SEGMENTED SWITCHER                          */}
      {/* ==================================================================== */}
      <div className="cyber-panel p-4 flex flex-col gap-3 border-l-2 border-l-[#00f0ff]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md border font-mono text-[9.5px] font-bold uppercase ${
                  isLight
                    ? 'bg-[#0284c7]/15 text-[#0284c7] border-[#0284c7]/40'
                    : 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40'
                }`}
              >
                📚 INFERNO CODEX &amp; QUANT MASTERCLASS HUB
              </span>
              <span
                className={`font-mono text-[10px] font-bold ${
                  isLight ? 'text-[#047857]' : 'text-[#4edea3]'
                }`}
              >
                LIVE TELEMETRY SYNCED ON {symbol} (${formatP(safePrice)})
              </span>
            </div>
            <p
              className={`font-sans text-[11.5px] leading-relaxed ${
                isLight ? 'text-[#334155]' : 'text-[#b9cacb]'
              }`}
            >
              Interactive visual encyclopedia of all 12 terminal indicators, 14 institutional &amp; historical strategy masterclasses, and live Reverse Signal X-Ray deconstruction.
            </p>
          </div>

          {/* 3-Tab Segmented Switcher */}
          <div
            className={`flex items-center gap-1.5 p-1 rounded-xl border font-mono text-[9.5px] flex-wrap ${
              isLight ? 'bg-[#f1f5f9] border-[#cbd5e1]' : 'bg-[#070a10] border-white/10'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveSubTab('ATLAS')}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                activeSubTab === 'ATLAS'
                  ? isLight
                    ? 'bg-[#0284c7] text-white shadow-sm'
                    : 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                  : isLight
                  ? 'text-[#475569] hover:text-[#0f172a]'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              🔬 VISUAL ELEMENT ATLAS (12)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('MASTERCLASS')}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                activeSubTab === 'MASTERCLASS'
                  ? isLight
                    ? 'bg-[#d97706] text-white shadow-sm'
                    : 'bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/50'
                  : isLight
                  ? 'text-[#475569] hover:text-[#0f172a]'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              🏛️ STRATEGY MASTERCLASS (14)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('XRAY_QUIZ')}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                activeSubTab === 'XRAY_QUIZ'
                  ? isLight
                    ? 'bg-[#059669] text-white shadow-sm'
                    : 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/50'
                  : isLight
                  ? 'text-[#475569] hover:text-[#0f172a]'
                  : 'text-[#849495] hover:text-[#e1e2eb]'
              }`}
            >
              🔍 LIVE X-RAY &amp; QUIZ
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: 🔬 VISUAL ELEMENT ATLAS (ALL 12 TERMINAL INDICATORS)          */}
      {/* ==================================================================== */}
      {activeSubTab === 'ATLAS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {atlasCards.map((card) => {
            const spotlit = isPriceSpotlit(card.spotlightPrice);
            return (
              <div
                key={card.id}
                className={`cyber-panel p-4 flex flex-col justify-between gap-3 ${
                  spotlit ? 'cyber-panel-tracked' : ''
                }`}
              >
                <div className="flex flex-col gap-2.5">
                  {/* Top Kicker: Indicator Number + Stage Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-[9px] font-bold uppercase tracking-wider ${
                        isLight ? 'text-[#0284c7]' : 'text-[#00f0ff]'
                      }`}
                    >
                      #{card.numberBadge} • {card.stageLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectStage?.(card.stageId)}
                      className={`px-2 py-0.5 rounded border font-mono text-[8.5px] font-bold uppercase cursor-pointer transition-colors ${
                        isLight
                          ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] border-[#cbd5e1]'
                          : 'bg-[#141821] hover:bg-[#1d2330] text-[#b9cacb] border-white/10'
                      }`}
                      title={`Jump directly to ${card.stageLabel}`}
                    >
                      OPEN STAGE 0{card.stageId} ↗
                    </button>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3
                      className={`font-mono text-[12.5px] font-bold leading-snug ${
                        isLight ? 'text-[#0f172a]' : 'text-[#dbfcff]'
                      }`}
                    >
                      {card.title}
                    </h3>
                    <p
                      className={`font-mono text-[9.5px] mt-0.5 ${
                        isLight ? 'text-[#475569]' : 'text-[#849495]'
                      }`}
                    >
                      {card.subtitle}
                    </p>
                  </div>

                  {/* Inline SVG Schematic Diagram */}
                  {card.renderSvg()}

                  {/* Live Coin Reading Badge */}
                  <div
                    className={`p-2 rounded-lg border font-mono text-[9.5px] flex items-center justify-between gap-2 ${
                      isLight
                        ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a]'
                        : 'bg-[#070a10] border-white/10 text-[#e1e2eb]'
                    }`}
                  >
                    <span className="text-[8.5px] uppercase opacity-75">LIVE {symbol}:</span>
                    <strong
                      className={`truncate ${
                        isLight ? 'text-[#047857]' : 'text-[#4edea3]'
                      }`}
                    >
                      {card.liveBadge}
                    </strong>
                  </div>

                  {/* Standard Equilibrium Norm vs. Extreme Guide */}
                  <div
                    className={`p-2.5 rounded-lg border font-mono text-[9px] flex flex-col gap-1 ${
                      isLight
                        ? 'bg-[#f1f5f9]/70 border-[#cbd5e1]'
                        : 'bg-[#090d15] border-white/5'
                    }`}
                  >
                    <div>
                      <span className="opacity-70">⚖️ EQUILIBRIUM NORM: </span>
                      <span className={isLight ? 'text-[#1e293b]' : 'text-[#b9cacb]'}>
                        {card.equilibriumNorm}
                      </span>
                    </div>
                    <div>
                      <span className={isLight ? 'text-[#b45309]' : 'text-[#fcd34d]'}>
                        ⚡ EXTREME SIGNAL:{' '}
                      </span>
                      <span className={isLight ? 'text-[#0f172a]' : 'text-[#e1e2eb]'}>
                        {card.extremeAlert}
                      </span>
                    </div>
                  </div>

                  {/* Plain-English Analogy */}
                  <p
                    className={`font-sans text-[11px] leading-relaxed ${
                      isLight ? 'text-[#1e293b]' : 'text-[#b9cacb]'
                    }`}
                  >
                    {card.analogy}
                  </p>

                  {/* Pro Action Rules (Do / Avoid) */}
                  <div className="grid grid-cols-1 gap-1.5 font-sans text-[10.5px]">
                    <div
                      className={`p-2 rounded-lg border ${
                        isLight
                          ? 'bg-[#059669]/10 border-[#059669]/30 text-[#065f46]'
                          : 'bg-[#4edea3]/10 border-[#4edea3]/25 text-[#d1fae5]'
                      }`}
                    >
                      <strong className="font-mono text-[9px] uppercase block">
                        ✓ PRO ACTION RULE (DO):
                      </strong>
                      {card.doRule}
                    </div>
                    <div
                      className={`p-2 rounded-lg border ${
                        isLight
                          ? 'bg-[#dc2626]/10 border-[#dc2626]/30 text-[#991b1b]'
                          : 'bg-[#ffb4ab]/10 border-[#ffb4ab]/25 text-[#ffe4e6]'
                      }`}
                    >
                      <strong className="font-mono text-[9px] uppercase block">
                        ✗ RETAIL TRAP (AVOID):
                      </strong>
                      {card.avoidRule}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer: Spotlight on Chart + External Study Link */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() =>
                      handleSpotlightPrice(card.spotlightLabel, card.spotlightPrice)
                    }
                    className={`flex-1 px-2.5 py-1.5 rounded-lg border font-mono text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      spotlit
                        ? 'bg-[#00f0ff]/25 text-[#00f0ff] border-[#00f0ff]'
                        : isLight
                        ? 'bg-[#0284c7]/15 hover:bg-[#0284c7]/25 text-[#0284c7] border-[#0284c7]/40'
                        : 'bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border-[#00f0ff]/40'
                    }`}
                  >
                    {spotlit ? '🎯 SPOTLIT ON CHART' : '🎯 SPOTLIGHT ON CHART'}
                  </button>

                  <a
                    href={card.studyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-2.5 py-1.5 rounded-lg border font-mono text-[9px] font-bold uppercase transition-colors ${
                      isLight
                        ? 'bg-[#f8fafc] hover:bg-[#e2e8f0] text-[#334155] border-[#cbd5e1]'
                        : 'bg-[#141821] hover:bg-[#1d2330] text-[#b9cacb] border-white/10'
                    }`}
                    title={card.studyTitle}
                  >
                    📖 {card.studySource} ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: 🏛️ STRATEGY MASTERCLASS ARCHIVE (ALL 14 MODELS EXPLAINED)     */}
      {/* ==================================================================== */}
      {activeSubTab === 'MASTERCLASS' && (
        <div className="flex flex-col gap-3.5">
          {/* Gann Solar Seasonal & Synodic Lunar Live Context Banner */}
          <div className="cyber-panel p-3.5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-l-[#f59e0b]">
            <div className="flex items-center gap-2.5 flex-wrap font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/40 font-bold">
                ☀️ GANN SEASONAL: {gannCycles.solarLongitudeDeg}° ({gannCycles.activeQuadrant})
              </span>
              <span className="px-2 py-0.5 rounded bg-[#c084fc]/20 text-[#c084fc] border border-[#c084fc]/40 font-bold">
                {gannCycles.phaseEmoji} {gannCycles.phaseName} ({gannCycles.illuminationPct}% ILLUM)
              </span>
              <span className={isLight ? 'text-[#334155]' : 'text-[#b9cacb]'}>
                Next Cardinal Pivot: <strong>{gannCycles.nearestCardinalLabel}</strong> (in{' '}
                {gannCycles.daysToCardinalDate}d)
              </span>
            </div>

            {/* Era Filter Buttons */}
            <div className="flex items-center gap-1 flex-wrap font-mono text-[9px]">
              {(['ALL', 'GANN & CYCLICAL', 'CLASSICAL LEGENDS', 'SSRN ACADEMIC', 'OPTIONS & DEALER'] as const).map(
                (era) => (
                  <button
                    key={era}
                    type="button"
                    onClick={() => setSelectedEraFilter(era)}
                    className={`px-2.5 py-1 rounded-lg border font-bold uppercase cursor-pointer transition-colors ${
                      selectedEraFilter === era
                        ? isLight
                          ? 'bg-[#0284c7] text-white border-[#0284c7]'
                          : 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]'
                        : isLight
                        ? 'bg-[#ffffff] text-[#475569] border-[#cbd5e1]'
                        : 'bg-[#090c12] text-[#849495] border-white/10'
                    }`}
                  >
                    {era}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 14-Model Masterclass Deep-Dive Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            {filteredMasterclassModels.map((strat, index) => {
              const meta = MASTERCLASS_META_MAP[strat.id] || {
                setupStep: strat.corePhilosophy,
                triggerStep: strat.tradePlan.triggerNote,
                invalidationStep: `Stop at $${formatP(strat.tradePlan.stopLoss)}; target TP1 $${formatP(strat.tradePlan.tp1Price)} & TP2 $${formatP(strat.tradePlan.tp2Price)}.`,
                psychologyWhy: strat.rookieExplanation,
                regimeTrapWarning: 'Stand aside when live multi-timeframe confluence conflicts with the entry trigger.',
              };

              return (
                <div
                  key={strat.id}
                  className="cyber-panel p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Header Row: Era + Pedigree + Live Match % */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/35 font-mono text-[8.5px] font-bold uppercase">
                          MODEL #{String(index + 1).padStart(2, '0')} • {strat.era}
                        </span>
                        <span
                          className={`font-mono text-[9.5px] ${
                            isLight ? 'text-[#475569]' : 'text-[#849495]'
                          }`}
                        >
                          {strat.authorOrPaper}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            strat.direction === 'LONG'
                              ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                              : 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/40'
                          }`}
                        >
                          {strat.direction}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#f59e0b]/15 text-[#fcd34d] border border-[#f59e0b]/40">
                          {strat.possibilityScore}% MATCH • {strat.backtest250Bars.winRatePct}% WR (N={strat.backtest250Bars.signalsCount})
                        </span>
                      </div>
                    </div>

                    {/* Title & Core Philosophy */}
                    <div>
                      <h4
                        className={`font-mono text-[13px] font-bold ${
                          isLight ? 'text-[#0f172a]' : 'text-[#dbfcff]'
                        }`}
                      >
                        {strat.name}
                      </h4>
                      <p
                        className={`font-sans text-[11px] mt-1 leading-relaxed ${
                          isLight ? 'text-[#334155]' : 'text-[#b9cacb]'
                        }`}
                      >
                        {strat.corePhilosophy}
                      </p>
                    </div>

                    {/* Visual 3-Step Execution Blueprint (1. Setup -> 2. Trigger -> 3. Invalidation & Target) */}
                    <div
                      className={`p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-2 font-sans text-[10.5px] ${
                        isLight
                          ? 'bg-[#f8fafc] border-[#cbd5e1]'
                          : 'bg-[#070a10] border-white/10'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[8.5px] font-bold uppercase text-[#00f0ff]">
                          1. SETUP CONDITION ➔
                        </span>
                        <p className={isLight ? 'text-[#1e293b]' : 'text-[#e1e2eb]'}>
                          {meta.setupStep}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 sm:border-l sm:pl-2 border-white/10">
                        <span className="font-mono text-[8.5px] font-bold uppercase text-[#fcd34d]">
                          2. EXECUTION TRIGGER ➔
                        </span>
                        <p className={isLight ? 'text-[#1e293b]' : 'text-[#e1e2eb]'}>
                          {meta.triggerStep}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 sm:border-l sm:pl-2 border-white/10">
                        <span className="font-mono text-[8.5px] font-bold uppercase text-[#4edea3]">
                          3. STOP &amp; TARGET
                        </span>
                        <p className={isLight ? 'text-[#1e293b]' : 'text-[#e1e2eb]'}>
                          {meta.invalidationStep}
                        </p>
                      </div>
                    </div>

                    {/* Why It Works (Market Psychology) & When It Fails (Regime Trap Warning) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans text-[10.5px]">
                      <div
                        className={`p-2.5 rounded-lg border ${
                          isLight
                            ? 'bg-[#059669]/10 border-[#059669]/30 text-[#065f46]'
                            : 'bg-[#4edea3]/10 border-[#4edea3]/25 text-[#d1fae5]'
                        }`}
                      >
                        <strong className="font-mono text-[8.5px] uppercase block mb-0.5">
                          🧠 WHY IT WORKS (MARKET PSYCHOLOGY):
                        </strong>
                        {meta.psychologyWhy}
                      </div>
                      <div
                        className={`p-2.5 rounded-lg border ${
                          isLight
                            ? 'bg-[#dc2626]/10 border-[#dc2626]/30 text-[#991b1b]'
                            : 'bg-[#ffb4ab]/10 border-[#ffb4ab]/25 text-[#ffe4e6]'
                        }`}
                      >
                        <strong className="font-mono text-[8.5px] uppercase block mb-0.5">
                          ⚠️ WHEN IT FAILS (REGIME TRAP WARNING):
                        </strong>
                        {meta.regimeTrapWarning}
                      </div>
                    </div>
                  </div>

                  {/* Action Footer: Live Trade Geometry + Load into Sizer + Reference Paper Link */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 flex-wrap font-mono text-[9px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        ENTRY: <strong className="text-[#00f0ff]">${formatP(strat.tradePlan.entryPrice)}</strong>
                      </span>
                      <span>
                        STOP: <strong className="text-[#ffb4ab]">${formatP(strat.tradePlan.stopLoss)}</strong>
                      </span>
                      <span>
                        TP1: <strong className="text-[#4edea3]">${formatP(strat.tradePlan.tp1Price)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={strat.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-2.5 py-1.5 rounded-lg border font-bold uppercase ${
                          isLight
                            ? 'bg-[#f8fafc] text-[#334155] border-[#cbd5e1]'
                            : 'bg-[#141821] text-[#b9cacb] border-white/10'
                        }`}
                      >
                        📄 {strat.referenceSourceLabel} ↗
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          onLoadSetup(
                            strat.tradePlan.entryPrice,
                            strat.tradePlan.stopLoss,
                            strat.tradePlan.tp1Price,
                            strat.tradePlan.tp2Price
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg border font-bold uppercase cursor-pointer transition-colors ${
                          isLight
                            ? 'bg-[#059669] text-white border-[#059669]'
                            : 'bg-[#4edea3]/20 hover:bg-[#4edea3]/30 text-[#4edea3] border-[#4edea3]/50'
                        }`}
                      >
                        ⚡ LOAD INTO SIZER →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: 🔍 LIVE REVERSE SIGNAL X-RAY & SPOT-CHECK QUIZ                */}
      {/* ==================================================================== */}
      {activeSubTab === 'XRAY_QUIZ' && (
        <ReverseAcademyDeck
          symbol={symbol}
          currentPrice={safePrice}
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
          onProgressChange={onProgressChange}
          focusXRaySignal={focusXRaySignal}
        />
      )}
    </div>
  );
};
