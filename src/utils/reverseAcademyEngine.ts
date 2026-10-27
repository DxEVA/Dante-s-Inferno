import {
  VolumeProfile,
  OrderBlock,
  DeribitOptionsData,
  LiquidityLevels,
  TelemetryMetrics,
  ExecutionCalculation,
  AMDPhaseResult,
  CandlestickAnalysisResult,
  MovingAverageAnalysisResult,
  SharpeSortinoMetrics,
  ConfluenceOverview,
} from '../types';

export interface ReverseSignalDeconstruction {
  symbol: string;
  currentPrice: number;
  lightStatus: 'GREEN' | 'YELLOW' | 'RED';
  node1_verdict: {
    title: string;
    badge: string;
    summary: string;
  };
  node2_triggers: {
    label: string;
    liveValue: string;
    impact: 'BULLISH' | 'BEARISH' | 'WARNING' | 'NEUTRAL';
    explanation: string;
  }[];
  node3_psychology: {
    whoIsInControl: string;
    whoIsTrapped: string;
    plainEnglishNarrative: string;
  };
  node4_whatToWatch: {
    bullishFlipCondition: string;
    bearishFlipCondition: string;
    actionableRule: string;
  };
}

export interface IndicatorThresholdScale {
  minLabel: string;
  midLabel: string;
  maxLabel: string;
  currentZone: 'BEARISH_OR_DANGER' | 'NEUTRAL' | 'BULLISH_OR_EDGE';
  activeBox?: 'A' | 'B' | 'C';
}

export interface CurriculumIndicatorItem {
  id: string;
  name: string;
  shortTag: string;
  liveValueFormatted: string;
  reverseRead: string;
  thresholdScale: IndicatorThresholdScale;
  mentalModel: string;
  formulaPlain: string;
}

export interface LiveQuizQuestion {
  levelId: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanationRight: string;
  explanationWrong: string;
}

export interface CurriculumLevelModule {
  level: 1 | 2 | 3 | 4 | 5;
  tierBadge: string;
  title: string;
  subtitle: string;
  objective: string;
  indicators: CurriculumIndicatorItem[];
  liveQuiz: LiveQuizQuestion;
}

export interface AcademyProgressState {
  completedLevels: number[];
  quizScores: Record<number, boolean>;
  lastUpdated: string;
}

const ACADEMY_STORAGE_KEY = 'vertex_academy_progress_v1';

export function loadAcademyProgress(): AcademyProgressState {
  try {
    const raw = localStorage.getItem(ACADEMY_STORAGE_KEY);
    if (!raw) {
      return { completedLevels: [], quizScores: {}, lastUpdated: new Date().toISOString() };
    }
    const parsed = JSON.parse(raw);
    return {
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
      quizScores: parsed.quizScores && typeof parsed.quizScores === 'object' ? parsed.quizScores : {},
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch {
    return { completedLevels: [], quizScores: {}, lastUpdated: new Date().toISOString() };
  }
}

export function saveAcademyProgress(level: number, passed: boolean): AcademyProgressState {
  const current = loadAcademyProgress();
  const nextScores = { ...current.quizScores, [level]: passed };
  const nextCompleted = passed
    ? Array.from(new Set([...current.completedLevels, level])).sort((a, b) => a - b)
    : current.completedLevels;
  const nextState: AcademyProgressState = {
    completedLevels: nextCompleted,
    quizScores: nextScores,
    lastUpdated: new Date().toISOString(),
  };
  try {
    localStorage.setItem(ACADEMY_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // ignore storage errors
  }
  return nextState;
}

function formatPrice(p: number): string {
  if (!p || isNaN(p)) return '0';
  if (p < 0.001) return p.toFixed(7);
  if (p < 0.1) return p.toFixed(5);
  if (p < 10) return p.toFixed(4);
  if (p < 1000) return p.toFixed(2);
  return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

export interface ReverseAcademyInput {
  symbol: string;
  currentPrice: number;
  telemetry: TelemetryMetrics;
  volumeProfile: VolumeProfile;
  bullOB: OrderBlock | null;
  bearOB: OrderBlock | null;
  optionsData: DeribitOptionsData;
  liquidity?: LiquidityLevels;
  candlestickResult: CandlestickAnalysisResult;
  maResult: MovingAverageAnalysisResult;
  amdPhase: AMDPhaseResult;
  calcResult: ExecutionCalculation;
  sharpeSortino?: SharpeSortinoMetrics;
  confluence?: ConfluenceOverview;
}

/**
 * 1. Top-Down Live Signal Reverse Deconstruction Tree
 */
export function deconstructLiveSignal(input: ReverseAcademyInput): ReverseSignalDeconstruction {
  const {
    symbol,
    currentPrice,
    telemetry,
    volumeProfile,
    bullOB,
    bearOB,
    optionsData,
    candlestickResult,
    maResult,
    amdPhase,
    calcResult,
    sharpeSortino,
    confluence,
  } = input;

  const hurst = candlestickResult.marketRegime?.hurstExponent ?? telemetry.hurstExponent ?? 0.48;
  const adx = candlestickResult.marketRegime?.adx14 ?? telemetry.adx14 ?? 20;
  const sharpe = sharpeSortino?.sharpeRatio ?? telemetry.sharpeRatio ?? 0.85;
  const sessionRvol = telemetry.sessionRvol ?? volumeProfile.sessionRvol ?? 1.0;
  const spotDeltaPct = telemetry.spotPerpDivergence?.spotDeltaPct ?? 0;
  const perpDeltaPct = telemetry.spotPerpDivergence?.perpDeltaPct ?? 0;
  const flowRegime = telemetry.spotPerpDivergence?.flowRegime ?? 'NEUTRAL_SYNC';
  const confScore = confluence?.score ?? 58;

  const pocDistPct =
    volumeProfile.poc > 0 && currentPrice > 0
      ? ((currentPrice - volumeProfile.poc) / currentPrice) * 100
      : 0;
  const valDistPct =
    volumeProfile.val > 0 && currentPrice > 0
      ? (Math.abs(currentPrice - volumeProfile.val) / currentPrice) * 100
      : 1.5;
  const vahDistPct =
    volumeProfile.vah > 0 && currentPrice > 0
      ? (Math.abs(currentPrice - volumeProfile.vah) / currentPrice) * 100
      : 1.5;

  const levelCandidates: { name: string; price: number }[] = [
    { name: 'POC', price: volumeProfile.poc },
    { name: 'VAL', price: volumeProfile.val },
    { name: 'VAH', price: volumeProfile.vah },
  ];
  if (bullOB && bullOB.midpoint > 0) {
    levelCandidates.push({ name: 'Bull OB', price: bullOB.midpoint });
  }
  if (bearOB && bearOB.midpoint > 0) {
    levelCandidates.push({ name: 'Bear OB', price: bearOB.midpoint });
  }

  let nearestNodeName = 'POC';
  let nearestNodePrice = volumeProfile.poc || currentPrice;
  let minKeyDist = 99;
  for (const cand of levelCandidates) {
    if (cand.price > 0 && currentPrice > 0) {
      const dPct = (Math.abs(currentPrice - cand.price) / currentPrice) * 100;
      if (dPct < minKeyDist) {
        minKeyDist = dPct;
        nearestNodeName = cand.name;
        nearestNodePrice = cand.price;
      }
    }
  }
  if (minKeyDist === 99) minKeyDist = 0;
  const isAtKeyLevel = minKeyDist <= 1.2;

  const isHardGated =
    flowRegime === 'LEVERAGE_TRAP_LONG' ||
    flowRegime === 'LEVERAGE_TRAP_SHORT' ||
    Math.abs(maResult.stretchScoreAtr) >= 2.5;

  const isBullSetup = confScore >= 50;
  const isSharpeAlignedWithBias = (isBullSetup && sharpe >= 0.65) || (!isBullSetup && sharpe <= -0.65);

  let lightStatus: 'GREEN' | 'YELLOW' | 'RED' = 'YELLOW';
  if (isHardGated || (Math.abs(sharpe) < 0.35 && !isAtKeyLevel)) {
    lightStatus = 'RED';
  } else if (confScore >= 65 && (isSharpeAlignedWithBias || isAtKeyLevel)) {
    lightStatus = 'GREEN';
  }

  const verdictTitle =
    lightStatus === 'GREEN'
      ? `HIGH-CONFLUENCE ${isBullSetup ? 'BULLISH' : 'BEARISH'} EXECUTION WINDOW`
      : lightStatus === 'RED'
      ? isHardGated
        ? 'HARD-GATE CONFLICT CAP ACTIVE (STAND DOWN)'
        : 'LOW-EDGE MID-RANGE CHOP (PROTECT CAPITAL)'
      : 'STALKING INSTITUTIONAL REACTION ZONE (WAIT FOR TRIGGER)';

  const sharpeVerdictClause =
    isBullSetup && sharpe < 0
      ? `a counter-trend mean-reversion setup at structural support despite ${sharpe.toFixed(2)} prior drawdown Sharpe`
      : !isBullSetup && sharpe > 0
      ? `a counter-trend mean-reversion short at overhead resistance despite +${sharpe.toFixed(2)} prior uptrend Sharpe`
      : `supportive orderflow and a ${sharpe >= 0 ? '+' : ''}${sharpe.toFixed(2)} Rolling Sharpe`;

  const verdictSummary =
    lightStatus === 'GREEN'
      ? `${symbol} aligns structural location (within ${minKeyDist.toFixed(2)}% of ${nearestNodeName} $${formatPrice(nearestNodePrice)}) with ${sharpeVerdictClause}.`
      : lightStatus === 'RED'
      ? isHardGated
        ? `Cross-market flow or volatility stretch triggered an institutional safety gate (${flowRegime.replace(/_/g, ' ')} • Stretch ${maResult.stretchScoreAtr.toFixed(2)}x ATR).`
        : `${symbol} is floating in low-efficiency noise (Sharpe ${sharpe.toFixed(2)}, Hurst H=${hurst.toFixed(2)}) away from major institutional walls.`
      : `${symbol} is building structure in the ${amdPhase.phase} phase (${
          isBullSetup && sharpe < 0
            ? `counter-trend mean-reversion setup at structural support despite ${sharpe.toFixed(2)} prior drawdown Sharpe`
            : `Rolling Sharpe ${sharpe >= 0 ? '+' : ''}${sharpe.toFixed(2)}`
        }), requiring closer proximity to $${formatPrice(volumeProfile.val)}–$${formatPrice(volumeProfile.poc)} or a ≥1.5x Session RVOL ignition candle.`;

  const trigger1Impact: 'BULLISH' | 'BEARISH' | 'WARNING' | 'NEUTRAL' =
    hurst > 0.55 && adx >= 25
      ? 'BULLISH'
      : hurst <= 0.55 && adx >= 25
      ? 'WARNING'
      : hurst < 0.45 && adx < 25
      ? 'NEUTRAL'
      : 'WARNING';

  const trigger1Explanation =
    hurst > 0.55 && adx >= 25
      ? `Persistent trend memory & strong directional momentum confirmed (H=${hurst.toFixed(2)} > 0.55 & ADX=${adx.toFixed(1)} >= 25).`
      : hurst <= 0.55 && adx >= 25
      ? `Directional ADX expansion (ADX=${adx.toFixed(1)} >= 25), but sub-0.55 Hurst (H=${hurst.toFixed(2)}) warns of mean-reverting pullbacks—do not chase breakouts.`
      : hurst < 0.45 && adx < 25
      ? `Mean-reverting rotational regime active (H=${hurst.toFixed(2)} < 0.45 & ADX=${adx.toFixed(1)} < 25). Fade extremes back toward POC.`
      : `Transitional / balanced regime (H=${hurst.toFixed(2)} • ADX=${adx.toFixed(1)}). Wait for key-level reactions.`;

  const basisBps = telemetry.spotPerpDivergence?.basisBps ?? 0;
  const spotPerpGap = spotDeltaPct - perpDeltaPct;
  const hasSpotPerpImbalance =
    Math.abs(spotPerpGap) >= 3.5 || Math.abs(spotDeltaPct) >= 5.0 || Math.abs(basisBps) >= 10;

  let trigger2Impact: 'BULLISH' | 'BEARISH' | 'WARNING' | 'NEUTRAL' = 'NEUTRAL';
  let trigger2Explanation = `Spot (${spotDeltaPct >= 0 ? '+' : ''}${spotDeltaPct.toFixed(1)}%) and Perpetual (${perpDeltaPct >= 0 ? '+' : ''}${perpDeltaPct.toFixed(1)}%) orderflow deltas are balanced (${basisBps >= 0 ? '+' : ''}${basisBps.toFixed(1)} bps basis).`;

  if (flowRegime === 'LEVERAGE_TRAP_LONG' || (spotPerpGap <= -3.5 && perpDeltaPct > 2.0)) {
    trigger2Impact = 'WARNING';
    trigger2Explanation = `Perp Leverage Chase detected: Perpetual buyers (${perpDeltaPct >= 0 ? '+' : ''}${perpDeltaPct.toFixed(1)}%) are outpacing Spot flow (${spotDeltaPct >= 0 ? '+' : ''}${spotDeltaPct.toFixed(1)}% • ${basisBps >= 0 ? '+' : ''}${basisBps.toFixed(1)} bps basis) — elevated long-squeeze risk.`;
  } else if (
    flowRegime === 'SPOT_ABSORPTION_ACCUMULATION' ||
    (spotPerpGap >= 3.5 && spotDeltaPct > 0)
  ) {
    trigger2Impact = 'BULLISH';
    trigger2Explanation = `Spot Whale Accumulation active: unleveraged Spot demand (${spotDeltaPct >= 0 ? '+' : ''}${spotDeltaPct.toFixed(1)}%) is outpacing Perpetual flow (${perpDeltaPct >= 0 ? '+' : ''}${perpDeltaPct.toFixed(1)}% • ${basisBps >= 0 ? '+' : ''}${basisBps.toFixed(1)} bps basis).`;
  } else if (
    flowRegime === 'SPOT_DRIVEN_EXPANSION' ||
    (spotDeltaPct >= 5.0 && perpDeltaPct >= 3.5)
  ) {
    trigger2Impact = 'BULLISH';
    trigger2Explanation = `Spot-Driven Expansion confirmed: Spot (+${spotDeltaPct.toFixed(1)}%) and Perpetual (+${perpDeltaPct.toFixed(1)}%) buyers are expanding in sync (${basisBps >= 0 ? '+' : ''}${basisBps.toFixed(1)} bps basis).`;
  } else if (flowRegime === 'LEVERAGE_TRAP_SHORT' || (spotPerpGap >= 3.5 && perpDeltaPct < -2.0)) {
    trigger2Impact = 'BULLISH';
    trigger2Explanation = `Aggressive Perp shorts (${perpDeltaPct.toFixed(1)}%) are selling into passive Spot accumulation (${spotDeltaPct >= 0 ? '+' : ''}${spotDeltaPct.toFixed(1)}% • ${basisBps >= 0 ? '+' : ''}${basisBps.toFixed(1)} bps basis) — short-squeeze fuel.`;
  } else if (hasSpotPerpImbalance) {
    trigger2Impact = spotDeltaPct < -5.0 ? 'WARNING' : 'NEUTRAL';
    trigger2Explanation =
      spotDeltaPct <= -5.0
        ? `Spot distribution flow (${spotDeltaPct.toFixed(1)}% Spot vs ${perpDeltaPct >= 0 ? '+' : ''}${perpDeltaPct.toFixed(1)}% Perp • ${basisBps >= 0 ? '+' : ''}${basisBps.toFixed(1)} bps basis) signals unleveraged supply overhead.`
        : `Cross-market basis divergence active: Spot ${spotDeltaPct >= 0 ? '+' : ''}${spotDeltaPct.toFixed(1)}% vs Perp ${perpDeltaPct >= 0 ? '+' : ''}${perpDeltaPct.toFixed(1)}% (${basisBps >= 0 ? '+' : ''}${basisBps.toFixed(1)} bps basis).`;
  }

  const node2_triggers: ReverseSignalDeconstruction['node2_triggers'] = [
    {
      label: '1. Statistical Regime (Hurst + ADX)',
      liveValue: `H = ${hurst.toFixed(2)} • ADX = ${adx.toFixed(1)}`,
      impact: trigger1Impact,
      explanation: trigger1Explanation,
    },
    {
      label: '2. Spot vs. Perpetual CVD Flow',
      liveValue: `Spot ${spotDeltaPct >= 0 ? '+' : ''}${spotDeltaPct.toFixed(1)}% vs Perp ${perpDeltaPct >= 0 ? '+' : ''}${perpDeltaPct.toFixed(1)}%`,
      impact: trigger2Impact,
      explanation: trigger2Explanation,
    },
    {
      label: '3. Auction Location & Session RVOL',
      liveValue: `${minKeyDist.toFixed(2)}% from ${nearestNodeName} • ${sessionRvol.toFixed(2)}x RVOL`,
      impact: isAtKeyLevel ? 'BULLISH' : sessionRvol <= 0.48 ? 'NEUTRAL' : 'WARNING',
      explanation: isAtKeyLevel
        ? `Price ($${formatPrice(currentPrice)}) sits ${minKeyDist.toFixed(2)}% from ${nearestNodeName} ($${formatPrice(nearestNodePrice)}) — inside the 1.2% institutional reaction zone with ${sessionRvol.toFixed(2)}x Session RVOL.`
        : `Price ($${formatPrice(currentPrice)}) is ${minKeyDist.toFixed(2)}% away from the nearest key level (${nearestNodeName} $${formatPrice(nearestNodePrice)}) with ${sessionRvol.toFixed(2)}x Session RVOL.`,
    },
  ];

  const whoIsInControl =
    telemetry.cvdDelta >= 0 && currentPrice >= volumeProfile.poc
      ? `Aggressive Taker Buyers & Passive Spot Accumulators above $${formatPrice(volumeProfile.poc)} POC`
      : telemetry.cvdDelta < 0 && currentPrice < volumeProfile.poc
      ? `Aggressive Taker Sellers pressing below $${formatPrice(volumeProfile.poc)} POC`
      : `Passive Limit Market Makers & Options Dealers pinning price near $${formatPrice(optionsData.maxPain)} Max Pain`;

  const whoIsTrapped =
    flowRegime === 'LEVERAGE_TRAP_LONG'
      ? `Late Leveraged Perp Longs chasing above $${formatPrice(maResult.mas.ema21.price)} without Spot backing`
      : flowRegime === 'SPOT_ABSORPTION_ACCUMULATION' || (telemetry.cvdDelta < 0 && currentPrice >= volumeProfile.poc)
      ? `Aggressive Perp Shorts selling into passive institutional Bid Walls ($${formatPrice(bullOB?.midpoint || volumeProfile.val)})`
      : currentPrice > volumeProfile.vah
      ? `Breakout chasers buying ${maResult.stretchScoreAtr.toFixed(2)}x ATR above the 21 EMA`
      : `Impatient mid-range scalpers getting chopped inside the Value Area ($${formatPrice(volumeProfile.val)}–$${formatPrice(volumeProfile.vah)})`;

  const plainEnglishNarrative = `Right now on ${symbol}, the market is in the ${amdPhase.phase} stage (${amdPhase.confidence}% cycle match). ${
    telemetry.netGex >= 0
      ? `Options dealers hold +$${telemetry.netGex}M Positive Gamma, meaning they systematically sell rallies and buy dips to pin price toward $${formatPrice(optionsData.maxPain)}.`
      : `Options dealers hold -$${Math.abs(telemetry.netGex)}M Negative Gamma, meaning they must hedge IN the direction of price moves, amplifying breakout velocity.`
  } ${whoIsTrapped} are vulnerable if price sweeps ${
    bullOB ? `the Bullish Order Block at $${formatPrice(bullOB.midpoint)}` : `Value Area Low at $${formatPrice(volumeProfile.val)}`
  }.`;

  const node4_whatToWatch = {
    bullishFlipCondition: `Reclaim & close above $${formatPrice(Math.max(volumeProfile.poc, maResult.mas.ema21.price))} with Session RVOL ≥ 1.50x (currently ${sessionRvol.toFixed(2)}x) and positive Spot CVD delta.`,
    bearishFlipCondition: `Lose Value Area Low ($${formatPrice(volumeProfile.val)}) or break below ${bullOB ? `$${formatPrice(bullOB.low)} Bull OB base` : `$${formatPrice(currentPrice * 0.985)}`} on negative Taker BarDelta.`,
    actionableRule:
      lightStatus === 'GREEN'
        ? `Execute limit entries inside $${formatPrice(bullOB?.midpoint || volumeProfile.val)}–$${formatPrice(volumeProfile.poc)} with strict stop at $${formatPrice(calcResult.stopLoss)}.`
        : `Hold fire in mid-range. Set price alerts at $${formatPrice(volumeProfile.val)} (VAL) and $${formatPrice(volumeProfile.vah)} (VAH) and wait for a ±2σ Delta Bubble or VDU (<0.45x RVOL) candle.`,
  };

  return {
    symbol,
    currentPrice,
    lightStatus,
    node1_verdict: {
      title: verdictTitle,
      badge: `${lightStatus} SIGNAL • ${confScore}% MTF CONFLUENCE`,
      summary: verdictSummary,
    },
    node2_triggers,
    node3_psychology: {
      whoIsInControl,
      whoIsTrapped,
      plainEnglishNarrative,
    },
    node4_whatToWatch,
  };
}

/**
 * 2. The 5-Level Progressive Mastery Curriculum + Dynamic Live Quizzes
 */
export function generateCurriculumModules(input: ReverseAcademyInput): CurriculumLevelModule[] {
  const {
    symbol,
    currentPrice,
    telemetry,
    volumeProfile,
    bullOB,
    bearOB,
    optionsData,
    liquidity,
    candlestickResult,
    maResult,
    amdPhase,
    calcResult,
    sharpeSortino,
  } = input;

  const stopDistPct = calcResult.stopDistPct || 1.2;
  const effNetRR = calcResult.effectiveNetRR2 ?? 2.1;
  const feeDragPct = calcResult.feeDragPctOfRisk ?? 8.5;
  const halfKelly = calcResult.halfKellyRiskPct ?? 1.25;

  const hurst = candlestickResult.marketRegime?.hurstExponent ?? telemetry.hurstExponent ?? 0.48;
  const adx = candlestickResult.marketRegime?.adx14 ?? telemetry.adx14 ?? 20;
  const sharpe = sharpeSortino?.sharpeRatio ?? telemetry.sharpeRatio ?? 1.1;
  const sortino = sharpeSortino?.sortinoRatio ?? telemetry.sortinoRatio ?? 1.4;
  const kaufmanEff = (sharpeSortino?.returnEfficiency ?? telemetry.returnEfficiency ?? 0.55) * 100;
  const sessionRvol = telemetry.sessionRvol ?? volumeProfile.sessionRvol ?? 1.0;
  const spotDelta = telemetry.spotPerpDivergence?.spotDeltaPct ?? 0;
  const perpDelta = telemetry.spotPerpDivergence?.perpDeltaPct ?? 0;
  const zeroGamma = optionsData.zeroGammaLevel ?? optionsData.maxPain;

  // ============================================================================
  // LEVEL 1: SURVIVAL, SIZING & EXECUTION DRAG (BEGINNER)
  // ============================================================================
  const level1: CurriculumLevelModule = {
    level: 1,
    tierBadge: 'LEVEL 1 // BEGINNER',
    title: 'Survival, Position Sizing & Execution Drag',
    subtitle: 'Why 90% of retail traders blow up on fees, stop distance, and leverage before indicators even matter.',
    objective: 'Master how Risk USDT, Stop Distance %, Maker vs. Taker fee drag, and Half-Kelly sizing protect your equity curve on live setups.',
    indicators: [
      {
        id: 'risk_stop_dist',
        name: 'Risk Capital ($) & Stop Distance (%)',
        shortTag: 'RISK_ANCHOR',
        liveValueFormatted: `$${calcResult.riskUsdt} Risk • ${stopDistPct.toFixed(2)}% Stop Dist`,
        reverseRead: `Because your stop on ${symbol} is ${stopDistPct.toFixed(2)}% away ($${formatPrice(calcResult.stopLoss)} vs Entry $${formatPrice(calcResult.entryPrice)}), your position size is automatically locked to ${calcResult.positionSize.toFixed(4)} units so a stop-out loses exactly $${calcResult.riskUsdt}.`,
        thresholdScale: {
          minLabel: '< 0.35% (Noise/Fee Bleed)',
          midLabel: '0.5% – 2.5% (Institutional Sweet Spot)',
          maxLabel: '> 5.0% (Wide Macro Stop)',
          currentZone: stopDistPct >= 0.4 && stopDistPct <= 3.5 ? 'BULLISH_OR_EDGE' : 'BEARISH_OR_DANGER',
          activeBox: stopDistPct < 0.4 ? 'A' : stopDistPct <= 3.5 ? 'B' : 'C',
        },
        mentalModel: 'Think of Risk ($) as your airbag and Stop Distance (%) as how close you follow the car ahead. If you tailgate (<0.35% stop), normal market braking triggers a crash and fees eat your account.',
        formulaPlain: 'Position Size (Coins) = Risk Capital ($) ÷ |Entry Price - Stop Loss Price|',
      },
      {
        id: 'notional_leverage',
        name: 'Notional Value & Effective Leverage',
        shortTag: 'LEV_GUARD',
        liveValueFormatted: `$${Math.round(calcResult.notionalValue).toLocaleString()} Notional (${calcResult.leverageEq.toFixed(1)}x)`,
        reverseRead: `Because your stop distance is ${stopDistPct.toFixed(2)}%, the terminal caps safe effective leverage around ${Math.min(20, Math.max(1, Math.floor(85 / Math.max(stopDistPct, 0.25))))}x so your liquidation price sits safely beyond your structural invalidation stop.`,
        thresholdScale: {
          minLabel: '1x – 5x (Low Ruin Risk)',
          midLabel: '5x – 12x (Tactical Perp)',
          maxLabel: '> 20x (Liquidation Danger)',
          currentZone: calcResult.leverageEq <= 12 ? 'BULLISH_OR_EDGE' : calcResult.leverageEq <= 18 ? 'NEUTRAL' : 'BEARISH_OR_DANGER',
          activeBox: calcResult.leverageEq <= 5 ? 'A' : calcResult.leverageEq <= 15 ? 'B' : 'C',
        },
        mentalModel: 'Leverage does NOT change your dollar profit when sizing by fixed risk—it only moves the exchange liquidation guillotine closer to your entry.',
        formulaPlain: 'Notional Value = Position Size × Entry Price; Safe Max Leverage ≈ 85% ÷ Stop Distance %',
      },
      {
        id: 'maker_taker_drag',
        name: 'Maker (2 bps) vs. Taker (5 bps + Slippage) Drag',
        shortTag: 'FEE_DRAG',
        liveValueFormatted: `${feeDragPct.toFixed(1)}% of 1R ($${(calcResult.takerFeeAndSlippageUsdt ?? 2.4).toFixed(2)} Taker vs $${(calcResult.makerFeeUsdt ?? 0.8).toFixed(2)} Maker)`,
        reverseRead: `Because ${symbol} has a ${stopDistPct.toFixed(2)}% stop distance, hitting Market (Taker) consumes ${feeDragPct.toFixed(1)}% of your entire 1R risk budget in round-trip fees and book slippage before price even moves.`,
        thresholdScale: {
          minLabel: '< 8% of 1R (Clean Edge)',
          midLabel: '8% – 18% of 1R (Moderate Drag)',
          maxLabel: '> 20% of 1R (Edge Eroded)',
          currentZone: feeDragPct <= 10 ? 'BULLISH_OR_EDGE' : feeDragPct <= 18 ? 'NEUTRAL' : 'BEARISH_OR_DANGER',
          activeBox: feeDragPct < 8 ? 'A' : feeDragPct <= 18 ? 'B' : 'C',
        },
        mentalModel: 'Market orders (Taker) pay a toll tax to cross the bridge immediately; Limit orders (Maker) rest on the orderbook wall and let impatient traders pay you liquidity rebates.',
        formulaPlain: 'Round-Trip Taker Drag = Notional × (0.05% Open + 0.05% Close + Orderbook Impact Slippage)',
      },
      {
        id: 'net_rr_kelly',
        name: 'Effective Net R:R & Half-Kelly Risk %',
        shortTag: 'KELLY_EDGE',
        liveValueFormatted: `+${effNetRR.toFixed(2)}R Net • ${halfKelly.toFixed(2)}% Half-Kelly`,
        reverseRead: `After subtracting exchange fees and slippage on ${symbol}, your true reward-to-risk to TP2 is +${effNetRR.toFixed(2)}R, justifying an optimal Half-Kelly account risk of ${halfKelly.toFixed(2)}% per trade.`,
        thresholdScale: {
          minLabel: '< 1.5R Net (Negative EV)',
          midLabel: '1.8R – 2.5R Net (Solid Institutional)',
          maxLabel: '> 2.5R Net (Asymmetric Home Run)',
          currentZone: effNetRR >= 1.8 ? 'BULLISH_OR_EDGE' : effNetRR >= 1.5 ? 'NEUTRAL' : 'BEARISH_OR_DANGER',
          activeBox: effNetRR < 1.6 ? 'A' : effNetRR <= 2.5 ? 'B' : 'C',
        },
      mentalModel: 'Gross R:R is sticker price; Net R:R is take-home pay after taxes. Half-Kelly tells you the mathematically optimal bet size to grow wealth without risking a drawdown spiral.',
        formulaPlain: 'Half-Kelly % = 0.5 × [ WinProb - (1 - WinProb) ÷ Effective_Net_RR ]',
      },
    ],
    liveQuiz: {
      levelId: 1,
      question: `On ${symbol} right now, your Stop Distance is ${stopDistPct.toFixed(2)}% and Round-Trip Taker Fee Drag is ${feeDragPct.toFixed(1)}% of 1R. If you tighten your stop to 0.15% while keeping the same $50 risk, what happens to your fee drag?`,
      options: [
        'Position notional explodes 8x larger, causing Taker fees + slippage to eat >40% of your $50 risk before price moves.',
        'Fee drag drops to zero because tighter stops require fewer coins.',
        'Nothing changes because exchange fees are charged on Risk USDT, not Notional Value.',
      ],
      correctIndex: 0,
      explanationRight: `Spot on! Exchange fees are charged on Notional Value (Position Size × Price). A tiny 0.15% stop forces massive notional size for the same $50 risk, multiplying fee drag.`,
      explanationWrong: `Remember: Exchange fees are charged on total Notional Value, not Risk ($). Tightening your stop forces a much larger position size, causing fees to eat your risk budget.`,
    },
  };

  // ============================================================================
  // LEVEL 2: AUCTION GEOMETRY & TREND STRUCTURE (BEGINNER+)
  // ============================================================================
  const wickRatioPct = Math.round((candlestickResult.anatomy?.wickRejectionRatio ?? 0.45) * 100);
  const clvPct = Math.round(candlestickResult.anatomy?.clvPct ?? 50);
  const bodyAtr = candlestickResult.anatomy?.bodyToAtrRatio ?? 0.85;
  const ema21Slope = maResult.mas.ema21.slopeBpsPerBar ?? 1.8;

  const level2: CurriculumLevelModule = {
    level: 2,
    tierBadge: 'LEVEL 2 // BEGINNER+',
    title: 'Auction Geometry, Candle Anatomy & Trend Ribbons',
    subtitle: 'Stop memorizing 50 cartoon candle names—read the raw auction physics of Wicks, CLV, ATR, and EMA Slopes.',
    objective: 'Decode buyer/seller rejection velocity inside every bar and measure whether the trend ribbon is expanding or overextended.',
    indicators: [
      {
        id: 'candle_anatomy',
        name: 'Wick Rejection Ratio & Close Location Value (CLV %)',
        shortTag: 'BAR_PHYSICS',
        liveValueFormatted: `${wickRatioPct}% Wick Ratio • ${clvPct}% CLV`,
        reverseRead: `Because ${symbol}'s latest bar has a ${wickRatioPct}% wick ratio and closes at ${clvPct}% of its low-to-high range, ${
          clvPct >= 65
            ? 'buyers aggressively swept intrabar lows and closed near the high of the bar.'
            : clvPct <= 35
            ? 'sellers rejected upper prices and forced the close near the bottom of the bar.'
            : 'buyers and sellers are in mid-bar equilibrium.'
        }`,
        thresholdScale: {
          minLabel: 'CLV < 25% (Bearish Close)',
          midLabel: 'CLV 35%–65% (In-Balance)',
          maxLabel: 'CLV > 75% + Wick > 50% (Strong Rejection)',
          currentZone: clvPct >= 65 || wickRatioPct >= 55 ? 'BULLISH_OR_EDGE' : clvPct <= 35 ? 'BEARISH_OR_DANGER' : 'NEUTRAL',
          activeBox: clvPct < 35 ? 'A' : clvPct <= 65 ? 'B' : 'C',
        },
        mentalModel: 'A candle wick is a failed invasion. A long lower wick with a high CLV (>75%) means sellers marched down, ran into a wall of limit buyers, and got pushed all the way back up before the bell.',
        formulaPlain: 'CLV % = ((Close - Low) ÷ (High - Low)) × 100; Wick Ratio = Max(UpperWick, LowerWick) ÷ TotalRange',
      },
      {
        id: 'atr_displacement',
        name: '14-Period ATR & Body-to-ATR Displacement',
        shortTag: 'ATR_VELOCITY',
        liveValueFormatted: `${bodyAtr.toFixed(2)}x Body/ATR (${candlestickResult.anatomy?.nearestSrName || 'POC'} ${candlestickResult.anatomy?.nearestSrDistancePct?.toFixed(2) ?? '0.50'}% away)`,
        reverseRead: `Because the current candle body is ${bodyAtr.toFixed(2)}x of ${symbol}'s 14-bar Average True Range, ${
          bodyAtr >= 1.3
            ? 'institutional displacement is expanding range faster than normal noise.'
            : 'price is moving within normal baseline volatility.'
        }`,
        thresholdScale: {
          minLabel: '< 0.5x ATR (Compression / Doji)',
          midLabel: '0.6x – 1.2x ATR (Normal Bar)',
          maxLabel: '> 1.5x ATR (Institutional Displacement)',
          currentZone: bodyAtr >= 0.55 ? 'BULLISH_OR_EDGE' : 'NEUTRAL',
          activeBox: bodyAtr < 0.55 ? 'A' : bodyAtr <= 1.35 ? 'B' : 'C',
        },
        mentalModel: 'ATR is the asset’s normal stride length. When a candle prints 1.8x ATR, the market just sprinted nearly two full strides in a single bar—only big money can move the tape that far.',
        formulaPlain: 'TR = Max(High-Low, |High-PrevClose|, |Low-PrevClose|); ATR(14) = Wilder Smoothing of TR over 14 bars',
      },
      {
        id: 'ema_ribbon_slope',
        name: 'EMA Ribbon Stack (9/21/50/200) & Slope Velocity',
        shortTag: 'EMA_STACK',
        liveValueFormatted: `${maResult.ribbonBias} (${ema21Slope >= 0 ? '+' : ''}${ema21Slope.toFixed(1)} bps/bar 21-EMA slope)`,
        reverseRead: `Because ${symbol} prints "${maResult.ribbonAlignment}" with the 21 EMA ($${formatPrice(maResult.mas.ema21.price)}) sloping at ${ema21Slope >= 0 ? '+' : ''}${ema21Slope.toFixed(1)} bps/bar, dynamic trend support is ${maResult.ribbonBias.toLowerCase()}.`,
        thresholdScale: {
          minLabel: 'Bear Stack (9 < 21 < 50 < 200)',
          midLabel: 'Coiled / Compression',
          maxLabel: 'Bull Stack (9 > 21 > 50 > 200)',
          currentZone: maResult.ribbonBias === 'BULLISH' ? 'BULLISH_OR_EDGE' : maResult.ribbonBias === 'BEARISH' ? 'BEARISH_OR_DANGER' : 'NEUTRAL',
          activeBox: maResult.ribbonBias === 'BEARISH' ? 'A' : maResult.ribbonBias === 'BULLISH' ? 'C' : 'B',
        },
        mentalModel: 'The EMA Ribbon is a 4-lane highway: 9 EMA is fast motorcycles, 21 EMA is institutional trend-followers, 50 EMA is swing funds, and 200 EMA is macro pension traffic. When all 4 lanes flow in parallel, pullbacks to the 21 EMA act like a trampoline.',
        formulaPlain: 'EMA_t = Price_t × k + EMA_(t-1) × (1 - k), where k = 2 ÷ (Period + 1)',
      },
      {
        id: 'atr_stretch_score',
        name: 'ATR Stretch Score (Mean-Reversion Rubberband)',
        shortTag: 'RUBBERBAND',
        liveValueFormatted: `${maResult.stretchScoreAtr >= 0 ? '+' : ''}${maResult.stretchScoreAtr.toFixed(2)} σ ATR (${maResult.overextensionStatus})`,
        reverseRead: `Because ${symbol} is ${maResult.stretchScoreAtr >= 0 ? '+' : ''}${maResult.stretchScoreAtr.toFixed(2)} ATRs away from its 21 EMA ($${formatPrice(maResult.mas.ema21.price)}), ${
          Math.abs(maResult.stretchScoreAtr) >= 2.2
            ? 'the rubberband is stretched to extremes—chasing here carries high snap-back risk.'
            : 'price is tracking comfortably near its moving average equilibrium.'
        }`,
        thresholdScale: {
          minLabel: 'Within ±1.2 ATR (Healthy Trend)',
          midLabel: '±1.5 to ±2.2 ATR (Extended)',
          maxLabel: 'Beyond ±2.5 ATR (Snap-Back Danger)',
          currentZone: Math.abs(maResult.stretchScoreAtr) <= 1.6 ? 'BULLISH_OR_EDGE' : Math.abs(maResult.stretchScoreAtr) <= 2.3 ? 'NEUTRAL' : 'BEARISH_OR_DANGER',
          activeBox: Math.abs(maResult.stretchScoreAtr) <= 1.35 ? 'A' : Math.abs(maResult.stretchScoreAtr) <= 2.3 ? 'B' : 'C',
        },
        mentalModel: 'Imagine walking a dog on a stretchy leash where you are the 21 EMA and the dog is spot price. Once the dog sprints >2.5 leash-lengths away, it physically has to pause or trot back toward you.',
        formulaPlain: 'ATR Stretch Score = (Current Close - 21 EMA) ÷ 14-Period ATR',
      },
    ],
    liveQuiz: {
      levelId: 2,
      question: `Right now on ${symbol}, the 21 EMA sits at $${formatPrice(maResult.mas.ema21.price)} and the ATR Stretch Score is ${maResult.stretchScoreAtr.toFixed(2)}x ATR. What does an ATR Stretch Score above +2.50x warn you NOT to do?`,
      options: [
        'Do not market-buy the breakout high; price is stretched 2.5+ ATRs above its 21 EMA and is prone to a mean-reversion snap-back.',
        'Do not place limit buy orders at the 21 EMA.',
        'It means volatility is dead and a squeeze is about to start.',
      ],
      correctIndex: 0,
      explanationRight: `Correct! When price stretches ≥2.5 ATRs away from the 21 EMA, institutional algorithms take profit and wait for a pullback toward the 21 EMA ($${formatPrice(maResult.mas.ema21.price)}).`,
      explanationWrong: `Check the ATR Stretch formula: (Close - 21 EMA) / ATR. A reading above +2.5x means price is severely overextended above its trend average.`,
    },
  };

  // ============================================================================
  // LEVEL 3: INSTITUTIONAL FOOTPRINTS & VALUE AREA (TRANSITION)
  // ============================================================================
  const level3: CurriculumLevelModule = {
    level: 3,
    tierBadge: 'LEVEL 3 // TRANSITION',
    title: 'Volume Profile Auction Theory, Order Blocks & Wyckoff AMD',
    subtitle: 'Transition from retail trendlines to horizontal volume nodes, unmitigated institutional footprints, and 3-phase liquidity cycles.',
    objective: 'Locate fair value (POC), the 70% Value Area boundaries (VAH/VAL), 50% Order Block mean thresholds, and the current Wyckoff AMD stage.',
    indicators: [
      {
        id: 'vp_poc_va',
        name: 'Volume Profile: POC & 70% Value Area (VAH / VAL)',
        shortTag: 'VP_AUCTION',
        liveValueFormatted: `POC $${formatPrice(volumeProfile.poc)} • VAL $${formatPrice(volumeProfile.val)} – VAH $${formatPrice(volumeProfile.vah)}`,
        reverseRead: `Because ${symbol} ($${formatPrice(currentPrice)}) is trading ${
          currentPrice >= volumeProfile.val && currentPrice <= volumeProfile.vah
            ? `inside the 70% Value Area between VAL ($${formatPrice(volumeProfile.val)}) and VAH ($${formatPrice(volumeProfile.vah)}), institutions treat POC ($${formatPrice(volumeProfile.poc)}) as the fair-value magnet.`
            : `outside the 70% Value Area, the market is in an imbalanced directional discovery state.`
        }`,
        thresholdScale: {
          minLabel: 'Below VAL (Discount / Imbalance)',
          midLabel: 'Inside VAL–VAH (70% Balance Bell Curve)',
          maxLabel: 'Above VAH (Premium / Breakout)',
          currentZone:
            currentPrice >= volumeProfile.val && currentPrice <= volumeProfile.vah
              ? 'BULLISH_OR_EDGE'
              : 'NEUTRAL',
          activeBox:
            currentPrice < volumeProfile.val
              ? 'A'
              : currentPrice <= volumeProfile.vah
              ? 'B'
              : 'C',
        },
        mentalModel: 'Standard volume bars tell you WHEN trading happened; Volume Profile turns the histogram sideways to show you WHERE (at which exact price) 70% of all coins changed hands. POC is the crowded town square; LVNs (Low Volume Nodes) are empty highways where price zips through fast.',
        formulaPlain: 'Bucket volume across 24 price rows; expand outward from the highest-volume row (POC) until ≥70% of total session volume is enclosed (VAL to VAH).',
      },
      {
        id: 'order_blocks_fvg',
        name: 'Order Blocks (50% Mean Threshold, Mitigation % & FVG)',
        shortTag: 'SMC_OB',
        liveValueFormatted: bullOB
          ? `Bull OB $${formatPrice(bullOB.low)}–$${formatPrice(bullOB.high)} (50% Mean $${formatPrice(bullOB.midpoint)} • Q:${bullOB.qualityScore ?? 80})`
          : `Bear OB $${formatPrice(bearOB?.low || currentPrice * 1.01)}–$${formatPrice(bearOB?.high || currentPrice * 1.02)}`,
        reverseRead: bullOB
          ? `Because this Bullish Order Block (${bullOB.mitigationStatus || 'UNMITIGATED'}, ${Math.round(bullOB.mitigationPct || 0)}% mitigated) launched an impulse move, resting institutional buy limits defend the 50% Mean Threshold at $${formatPrice(bullOB.midpoint)}.`
          : `Because no unmitigated Bull OB sits immediately below, watch Value Area Low ($${formatPrice(volumeProfile.val)}) as primary structural demand.`,
        thresholdScale: {
          minLabel: 'Invalidated (Close Beyond 50% Mean)',
          midLabel: 'Partial Mitigation (Testing Zone)',
          maxLabel: 'Unmitigated + FVG Aligned (High Edge)',
          currentZone: bullOB?.mitigationStatus === 'UNMITIGATED' ? 'BULLISH_OR_EDGE' : 'NEUTRAL',
          activeBox: !bullOB
            ? 'A'
            : bullOB.mitigationStatus === 'PARTIAL'
            ? 'B'
            : 'C',
        },
        mentalModel: 'Before an institutional whale can launch a massive rally, they must accumulate a huge position inside a quiet base candle (the Order Block). When price returns to that base later, they defend their average entry price (the 50% Mean Threshold).',
        formulaPlain: 'Last opposing candle before a ≥1.5x ATR displacement impulse leaving a 3-bar Fair Value Gap; invalidated if candle closes beyond 50% midpoint.',
      },
      {
        id: 'wyckoff_amd',
        name: 'Institutional AMD Cycle (Accumulation → Manipulation → Expansion)',
        shortTag: 'WYCKOFF_AMD',
        liveValueFormatted: `${amdPhase.stageName} (${amdPhase.confidence}% Match)`,
        reverseRead: `Because ${symbol} scores ${amdPhase.scores.accumulation}% Accumulation, ${amdPhase.scores.manipulation}% Manipulation, and ${Math.max(amdPhase.scores.distribution, amdPhase.scores.expansion)}% Expansion/Distribution, ${amdPhase.institutionalRead}`,
        thresholdScale: {
          minLabel: '1. Accumulation (Compression)',
          midLabel: '2. Manipulation (Judas Stop Sweep)',
          maxLabel: '3. Expansion / Markup (Trend Run)',
          currentZone: amdPhase.phase === 'MANIPULATION' || amdPhase.phase === 'EXPANSION' ? 'BULLISH_OR_EDGE' : 'NEUTRAL',
          activeBox:
            amdPhase.phase === 'ACCUMULATION'
              ? 'A'
              : amdPhase.phase === 'MANIPULATION'
              ? 'B'
              : 'C',
        },
        mentalModel: 'Smart money rarely moves in a straight line: First they build a quiet box (Accumulation), then they fake a breakout the wrong way to trigger retail stop-losses and fill their own limit orders (Manipulation / Judas Swing), and finally they drive the true trend (Expansion).',
        formulaPlain: 'Multi-factor state machine scoring range compression (ATR ratio), wick liquidity sweeps of swing highs/lows, and directional CVD displacement.',
      },
    ],
    liveQuiz: {
      levelId: 3,
      question: `On ${symbol} right now, Point of Control (POC) is $${formatPrice(volumeProfile.poc)} and the 70% Value Area spans $${formatPrice(volumeProfile.val)} (VAL) to $${formatPrice(volumeProfile.vah)} (VAH). In a balanced market, how do institutional mean-reversion desks use VAL and POC?`,
      options: [
        `They accumulate long limit positions near VAL ($${formatPrice(volumeProfile.val)}) after a stop-sweep and target rotation back to the POC fair-value magnet ($${formatPrice(volumeProfile.poc)}).`,
        `They market-short VAL and buy VAH hoping for a 10x breakout every time.`,
        `They ignore POC because it has the lowest traded volume on the chart.`,
      ],
      correctIndex: 0,
      explanationRight: `Exactly right! 70% of all volume transacts inside VAL–VAH, so extremes at VAL ($${formatPrice(volumeProfile.val)}) offer high-probability rotations back toward the POC ($${formatPrice(volumeProfile.poc)}) magnet.`,
      explanationWrong: `Remember: POC is the highest-volume fair value node on the chart, and 70% of volume stays inside VAL–VAH during balanced auctions.`,
    },
  };

  // ============================================================================
  // LEVEL 4: TRUE ORDERFLOW, ABSORPTION & CROSS-MARKET TRAPS (INTERMEDIATE)
  // ============================================================================
  const level4: CurriculumLevelModule = {
    level: 4,
    tierBadge: 'LEVEL 4 // INTERMEDIATE',
    title: 'True Taker Orderflow, Absorption Rings & Spot-vs-Perp Traps',
    subtitle: 'Look inside the candle: see whether aggressive market buyers are lifting the ask or getting trapped by passive limit walls.',
    objective: 'Distinguish genuine Spot-backed expansion from leveraged Perpetual futures bull/bear traps and spot Volume Dry-Up (VDU) exhaustion.',
    indicators: [
      {
        id: 'taker_delta_cvd',
        name: 'True Taker BarDelta & Cumulative Volume Delta (CVD)',
        shortTag: 'TAKER_CVD',
        liveValueFormatted: `${telemetry.cvdDelta >= 0 ? '+' : ''}${Math.round(telemetry.cvdDelta)} CVD (${telemetry.divergenceBias})`,
        reverseRead: `Because ${symbol}'s 20-bar Cumulative Volume Delta is ${telemetry.cvdDelta >= 0 ? '+' : ''}${Math.round(telemetry.cvdDelta)} (${telemetry.divergenceBias}), aggressive market orders crossing the bid-ask spread are net ${telemetry.cvdDelta >= 0 ? 'buying (lifting the ask)' : 'selling (hitting the bid)'}.`,
        thresholdScale: {
          minLabel: 'Heavy Negative CVD (Seller Aggression)',
          midLabel: 'Balanced Tape',
          maxLabel: 'Positive CVD + Absorption (Buyer Aggression)',
          currentZone: telemetry.cvdDelta > 0 ? 'BULLISH_OR_EDGE' : telemetry.cvdDelta < -50 ? 'BEARISH_OR_DANGER' : 'NEUTRAL',
          activeBox: telemetry.cvdDelta < -50 ? 'A' : telemetry.cvdDelta <= 50 ? 'B' : 'C',
        },
        mentalModel: 'Every trade has a patient limit order (Maker) and an impatient market order (Taker). BarDelta = Market Buy Volume minus Market Sell Volume. It reveals who is urgently crossing the spread right now.',
        formulaPlain: 'BarDelta = TakerBuyBaseVolume - (TotalVolume - TakerBuyBaseVolume); CVD = Cumulative Sum of BarDelta',
      },
      {
        id: 'absorption_bubbles',
        name: '±2σ Delta Bubbles & Gold Passive Absorption Rings',
        shortTag: 'ABSORPTION',
        liveValueFormatted: `Bid Wall $${formatPrice(liquidity?.bidLiquidityPrice || currentPrice * 0.985)} • Ask Wall $${formatPrice(liquidity?.askLiquidityPrice || currentPrice * 1.015)}`,
        reverseRead: `When a cyan/red ±2σ Delta Bubble prints on ${symbol}'s chart with a Gold Absorption Ring, it means market orders hammered the tape at >2 standard deviations above normal, yet passive limit walls at $${formatPrice(liquidity?.bidLiquidityPrice || volumeProfile.val)} absorbed every coin without letting price break.`,
        thresholdScale: {
          minLabel: 'Unabsorbed Impulse Breakdown',
          midLabel: 'Normal Orderflow (< 1.85σ Delta)',
          maxLabel: '≥ 1.85σ Delta + Gold Ring (Limit Wall Absorption)',
          currentZone: 'BULLISH_OR_EDGE',
          activeBox:
            telemetry.divergenceBias.toLowerCase().includes('absorption') ||
            telemetry.divergenceBias.toLowerCase().includes('squeeze')
              ? 'C'
              : 'B',
        },
        mentalModel: 'Imagine a battering ram (market sellers) slamming into a castle gate (passive limit buy wall). If the ram hits with 3x normal force (±2σ Delta) but the gate doesn’t budge (candle closes high), the attackers are exhausted and trapped.',
        formulaPlain: 'Delta Sigma = |BarDelta| ÷ StdDev(BarDelta, 20); Absorption = |DeltaSigma| ≥ 1.85 while candle closes against the delta direction',
      },
      {
        id: 'session_rvol_vdu',
        name: 'UTC Session-Normalized RVOL (💧 VDU vs. ⚡ Ignition)',
        shortTag: 'SESSION_RVOL',
        liveValueFormatted: `${sessionRvol.toFixed(2)}x RVOL (${telemetry.sessionName || 'ACTIVE'} Session)`,
        reverseRead: `Because ${symbol} is trading at ${sessionRvol.toFixed(2)}x of its historical ${telemetry.sessionName || 'current UTC'} session average, volume is ${
          sessionRvol <= 0.45
            ? 'in Volume Dry-Up (💧 VDU < 0.45x)—signaling complete seller exhaustion on the pullback.'
            : sessionRvol >= 2.0
            ? 'in Volume Ignition (⚡ > 2.0x)—institutional capital is actively displacing price.'
            : 'within normal time-of-day participation.'
        }`,
        thresholdScale: {
          minLabel: '💧 VDU ≤ 0.45x (Seller Exhaustion)',
          midLabel: '0.6x – 1.5x (Normal Session Flow)',
          maxLabel: '⚡ Ignition ≥ 2.0x (Institutional Surge)',
          currentZone: sessionRvol <= 0.48 || sessionRvol >= 0.8 ? 'BULLISH_OR_EDGE' : 'NEUTRAL',
          activeBox: sessionRvol <= 0.48 ? 'A' : sessionRvol < 1.6 ? 'B' : 'C',
        },
        mentalModel: 'Comparing Asian session volume at 03:00 UTC to New York Overlap volume at 14:30 UTC is an apples-to-oranges mistake. Session-Normalized RVOL compares current volume strictly against the same UTC session bucket.',
        formulaPlain: 'Session RVOL = Current Bar Volume ÷ Mean Volume of matching UTC Session bars (Asian / London / NY Overlap / NY Afternoon)',
      },
      {
        id: 'spot_perp_divergence',
        name: 'Spot vs. Perpetual CVD Flow & OI Basis Divergence',
        shortTag: 'SPOT_VS_PERP',
        liveValueFormatted: `Spot ${spotDelta >= 0 ? '+' : ''}${spotDelta.toFixed(1)}% • Perp ${perpDelta >= 0 ? '+' : ''}${perpDelta.toFixed(1)}% (${(telemetry.spotPerpDivergence?.basisBps ?? 0).toFixed(1)} bps)`,
        reverseRead: `${telemetry.spotPerpDivergence?.description || `Spot delta (${spotDelta.toFixed(1)}%) and Perpetual delta (${perpDelta.toFixed(1)}%) track whether real unleveraged capital supports the move.`}`,
        thresholdScale: {
          minLabel: 'Perp Up + Spot Down (Leverage Trap)',
          midLabel: 'Neutral / Synchronized',
          maxLabel: 'Spot Up + Perp Down (Short Squeeze Fuel)',
          currentZone:
            telemetry.spotPerpDivergence?.flowRegime === 'SPOT_DRIVEN_EXPANSION' ||
            telemetry.spotPerpDivergence?.flowRegime === 'SPOT_ABSORPTION_ACCUMULATION' ||
            spotDelta - perpDelta >= 3.5
              ? 'BULLISH_OR_EDGE'
              : telemetry.spotPerpDivergence?.flowRegime.includes('TRAP')
              ? 'BEARISH_OR_DANGER'
              : 'NEUTRAL',
          activeBox: telemetry.spotPerpDivergence?.flowRegime.includes('TRAP')
            ? 'A'
            : telemetry.spotPerpDivergence?.flowRegime === 'SPOT_DRIVEN_EXPANSION' ||
              telemetry.spotPerpDivergence?.flowRegime === 'SPOT_ABSORPTION_ACCUMULATION' ||
              spotDelta - perpDelta >= 3.5
            ? 'C'
            : 'B',
        },
        mentalModel: 'Spot buyers must put up 100% cash and cannot be liquidated; Perpetual traders use up to 50x borrowed money. When Perp CVD rockets up while Spot CVD is negative, retail gamblers are building a house of cards that market makers will sweep.',
        formulaPlain: 'SpotDelta% = 20-bar Net Spot Taker Delta ÷ Total Spot Vol; PerpDelta% = 20-bar Net Perp Taker Delta ÷ Total Perp Vol',
      },
    ],
    liveQuiz: {
      levelId: 4,
      question: `On ${symbol}, suppose Perpetual CVD Delta surges to +28% with rising Open Interest, while Spot CVD Delta drops to -14% as price approaches resistance. What institutional regime does this signal?`,
      options: [
        'LEVERAGE TRAP LONG: Retail perp longs are chasing with borrowed money while Spot whales distribute—high risk of a long liquidation flush.',
        'SPOT DRIVEN EXPANSION: Unleveraged institutional cash is leading a sustainable breakout.',
        'VOLUME DRY-UP: Neither Spot nor Perp traders are active.',
      ],
      correctIndex: 0,
      explanationRight: `Nailed it! When Perp CVD and OI surge without Spot buying (Spot CVD negative), leveraged longs are walking into passive Spot distribution.`,
      explanationWrong: `Look at who is buying: Perp is leveraged derivatives (+28%), while Spot is real unleveraged coins (-14%). When Spot sells into Perp buying, it's a Leverage Trap Long.`,
    },
  };

  // ============================================================================
  // LEVEL 5: STATISTICAL REGIMES & OPTIONS DEALER HEDGING (INTERMEDIATE+)
  // ============================================================================
  const level5: CurriculumLevelModule = {
    level: 5,
    tierBadge: 'LEVEL 5 // INTERMEDIATE+',
    title: 'Statistical Regimes (Hurst/Sharpe) & Black-Scholes Dealer Gamma',
    subtitle: 'Combine quantitative time-series statistics with Deribit options market-maker hedging flows (GEX, 0-Gamma Flip, Max Pain, 25Δ Skew).',
    objective: 'Know mathematically when to trade mean-reversion vs. momentum breakouts, and map where options dealers are forced to buy or sell underlying futures.',
    indicators: [
      {
        id: 'hurst_adx_gate',
        name: 'Rescaled-Range Hurst Exponent (H) & Wilder ADX(14)',
        shortTag: 'HURST_GATE',
        liveValueFormatted: `H = ${hurst.toFixed(2)} • ADX = ${adx.toFixed(1)} (${candlestickResult.marketRegime?.regime || 'MEAN_REVERTING'})`,
        reverseRead: `Because ${symbol} prints Hurst H = ${hurst.toFixed(2)} and ADX = ${adx.toFixed(1)}, ${
          hurst > 0.55 && adx >= 25
            ? 'both fractal trend memory (H > 0.55) and directional momentum (ADX ≥ 25) are active—counter-trend reversal fades are suppressed!'
            : hurst <= 0.55 && adx >= 25
            ? 'directional ADX is elevated (ADX ≥ 25), but sub-0.55 Hurst warns of mean-reverting pullbacks—do not chase extended breakouts.'
            : hurst < 0.45 && adx < 25
            ? 'the time-series is statistically mean-reverting (anti-persistent)—range fades at VAL/VAH have high edge.'
            : 'the market is in a transitional regime—wait for key-level confirmation.'
        }`,
        thresholdScale: {
          minLabel: 'H < 0.45 & ADX < 25 (Mean-Reverting)',
          midLabel: 'H ≈ 0.50 or Mixed (Transitional)',
          maxLabel: 'H > 0.55 & ADX ≥ 25 (Momentum Trend)',
          currentZone: (hurst > 0.55 && adx >= 25) || (hurst < 0.45 && adx < 25) ? 'BULLISH_OR_EDGE' : 'NEUTRAL',
          activeBox: hurst < 0.45 && adx < 25 ? 'A' : hurst > 0.55 && adx >= 25 ? 'C' : 'B',
        },
        mentalModel: 'Most traders lose because they use a trend strategy in a sideways chop market, or fade a freight-train breakout. Hurst (H) measures fractal memory: H < 0.45 is a pendulum swinging back to center; H > 0.55 is a snowball rolling downhill.',
        formulaPlain: 'H = log(R/S) ÷ log(N) across multi-scale lag windows, where R is cumulative deviation range and S is standard deviation.',
      },
      {
        id: 'vwma_zscore_sharpe',
        name: 'VWMA50 Statistical Z-Score & Rolling Sharpe / Sortino',
        shortTag: 'QUANT_EDGE',
        liveValueFormatted: `Z = ${telemetry.zScore >= 0 ? '+' : ''}${telemetry.zScore.toFixed(2)}σ • Sharpe ${sharpe >= 0 ? '+' : ''}${sharpe.toFixed(2)} / Sortino ${sortino.toFixed(2)}`,
        reverseRead: `Because ${symbol} sits at ${telemetry.zScore >= 0 ? '+' : ''}${telemetry.zScore.toFixed(2)}σ from its 50-bar Volume-Weighted Moving Average ($${formatPrice(telemetry.vwma50)}) with a ${kaufmanEff.toFixed(0)}% Kaufman Trend Efficiency, ${telemetry.zScoreBias}.`,
        thresholdScale: {
          minLabel: '|Sharpe| < 0.4 (Noisy Chop)',
          midLabel: '|Sharpe| 0.5 – 1.2 (Steady Drift)',
          maxLabel: '|Sharpe| > 1.2 + High Sortino (Clean Trend)',
          currentZone: Math.abs(sharpe) >= 0.5 ? 'BULLISH_OR_EDGE' : 'BEARISH_OR_DANGER',
          activeBox: Math.abs(sharpe) < 0.45 ? 'A' : Math.abs(sharpe) <= 1.2 ? 'B' : 'C',
        },
        mentalModel: 'Sharpe penalizes all volatility equally; Sortino only penalizes downside crashes (bad volatility), letting upside parabolic rockets score high. VWMA Z-Score tells you how many volume-weighted standard deviations price is stretched from fair value.',
        formulaPlain: 'Z = (Close - VWMA50) ÷ VolumeWeightedStdDev(50); Sortino = (MeanReturn × AnnualFactor) ÷ DownsideStdDev',
      },
      {
        id: 'gex_zerogamma',
        name: 'Black-Scholes Net GEX & Zero-Gamma Flip Level (0-Γ)',
        shortTag: 'DEALER_GEX',
        liveValueFormatted: `${telemetry.netGex >= 0 ? '+' : ''}$${telemetry.netGex}M GEX • 0-Γ Flip $${formatPrice(zeroGamma)}`,
        reverseRead: `Because ${symbol} trades ${currentPrice >= zeroGamma ? 'ABOVE' : 'BELOW'} the Zero-Gamma Flip level ($${formatPrice(zeroGamma)}) with ${telemetry.netGex >= 0 ? '+' : ''}$${telemetry.netGex}M Net GEX, options market makers are in ${
          telemetry.netGex >= 0
            ? 'Positive Gamma—they hedge by selling rips and buying dips, acting as shock absorbers that pin price toward Max Pain.'
            : 'Negative Gamma—they must sell as price falls and buy as price rises, pouring gasoline on directional breakouts.'
        }`,
        thresholdScale: {
          minLabel: 'Negative GEX (< $0M: Volatility Accelerator)',
          midLabel: 'Near 0-Γ Flip ($' + formatPrice(zeroGamma) + ')',
          maxLabel: 'Positive GEX (> $0M: Mean-Reversion Pinning)',
          currentZone: telemetry.netGex >= 0 ? 'BULLISH_OR_EDGE' : 'BEARISH_OR_DANGER',
          activeBox:
            Math.abs(currentPrice - zeroGamma) / Math.max(1, currentPrice) <= 0.004
              ? 'B'
              : telemetry.netGex < 0
              ? 'A'
              : 'C',
        },
        mentalModel: 'Options dealers don’t want directional risk—they delta-hedge continuously. Above the Zero-Gamma Flip (Positive GEX), dealers act like brakes on a car. Below the Zero-Gamma Flip (Negative GEX), dealers’ brakes fail and they press the gas pedal in whichever direction price moves.',
        formulaPlain: 'Strike GEX = OpenInterest × BS_Gamma(S, K, T, σ) × Spot² × 0.01 × (+1 for Calls, -1 for Puts); 0-Γ is the spot price where Σ(GEX) = 0.',
      },
      {
        id: 'maxpain_walls_skew',
        name: 'Call/Put Gamma Walls, True Max Pain & 25-Delta IV Skew',
        shortTag: 'SKEW_WALLS',
        liveValueFormatted: `MP $${formatPrice(optionsData.maxPain)} • Put Wall $${formatPrice(optionsData.putWall)} / Call Wall $${formatPrice(optionsData.callWall)} • 25Δ Skew ${optionsData.skew25d >= 0 ? '+' : ''}${optionsData.skew25d.toFixed(1)}%`,
        reverseRead: `Because 25-Delta Skew is ${optionsData.skew25d >= 0 ? '+' : ''}${optionsData.skew25d.toFixed(1)}% (${telemetry.skewBias}) and Put/Call walls sit at $${formatPrice(optionsData.putWall)} / $${formatPrice(optionsData.callWall)}, options hedging creates heavy structural resistance at the Call Wall and floor support at the Put Wall.`,
        thresholdScale: {
          minLabel: 'Skew > +5% (Expensive Put Downside Fear)',
          midLabel: 'Skew -2% to +3.5% (Balanced)',
          maxLabel: 'Skew < -3% (Aggressive Call Demand)',
          currentZone: Math.abs(optionsData.skew25d) <= 4 ? 'BULLISH_OR_EDGE' : 'NEUTRAL',
          activeBox: optionsData.skew25d > 3.5 ? 'A' : optionsData.skew25d >= -2.5 ? 'B' : 'C',
        },
        mentalModel: 'Max Pain is the exact strike where options buyers lose the most money and option sellers (institutions) keep the most premium at expiry. 25-Delta Skew compares the price of crash-insurance Puts vs. moon-shot Calls.',
        formulaPlain: 'Max Pain = argmin_S Σ [ CallOI × max(0, S - K) + PutOI × max(0, K - S) ]; 25Δ Skew = IV(25Δ Put) - IV(25Δ Call)',
      },
    ],
    liveQuiz: {
      levelId: 5,
      question: `On ${symbol} right now, Net GEX is ${telemetry.netGex >= 0 ? '+' : ''}$${telemetry.netGex}M and the Zero-Gamma Flip level sits at $${formatPrice(zeroGamma)}. If spot price drops below the Zero-Gamma Flip into deep Negative Gamma (-GEX), how do options dealers hedge as price falls further?`,
      options: [
        'Dealers are forced to SELL underlying futures into the drop to stay delta-neutral, accelerating the downward cascade.',
        'Dealers automatically buy the dip and pin price back to Max Pain.',
        'Dealers stop hedging completely until monthly expiry.',
      ],
      correctIndex: 0,
      explanationRight: `Master-level answer! In Negative Gamma (below the $${formatPrice(zeroGamma)} 0-Γ Flip), dealer delta-hedging flows WITH price—they must sell as price drops and buy as price rises, creating explosive volatility cascades.`,
      explanationWrong: `Remember the difference: Positive GEX dampens moves (buy dips/sell rips), whereas Negative GEX (below Zero-Gamma Flip) forces dealers to hedge IN the direction of the move (sell drops/buy rallies).`,
    },
  };

  return [level1, level2, level3, level4, level5];
}
