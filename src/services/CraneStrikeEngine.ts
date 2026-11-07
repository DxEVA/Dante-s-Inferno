// src/services/CraneStrikeEngine.ts

export interface InfernoCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Index 9 from Binance klines: Taker buy base asset volume (optional fallback included) */
  takerBuyVolume?: number;
}

export interface OrderBlockZone {
  id?: string;
  top: number;
  bottom: number;
  type: 'BULL' | 'BEAR';
  mitigated: boolean;
  isDisplacement?: boolean;
}

export interface VolumeProfileSnapshot {
  poc: number;
  vah: number;
  val: number;
  hvns: number[]; // High Volume Node prices (obstacles/targets)
  lvns: number[]; // Low Volume Node prices (rejection ledges)
}

export type CraneState = 'DORMANT' | 'STALKING' | 'ARMED' | 'STRIKE';
export type MarketRegime = 'PERSISTENT_TREND' | 'MEAN_REVERTING' | 'RANDOM_WALK_NOISE';

export interface GannHarmonicLevel {
  degree: number;
  type: 'CARDINAL' | 'ORDINAL';
  supportPrice: number;
  resistancePrice: number;
}

export interface GannSquareOf9Result {
  anchorPrice: number;
  currentPrice: number;
  nearestLevel: number;
  nearestDegree: number;
  distancePct: number;
  levels: GannHarmonicLevel[];
}

export interface Gate1RegimeResult {
  hurst: number;
  atr: number;
  volatilityZScore: number;
  regime: MarketRegime;
  passed: boolean;
}

export interface Gate4MicrostructureResult {
  absorptionIndex: number;
  cvdScore: number;
  isAbsorbing: boolean;
  mssConfirmed: boolean;
  fvgZone: { top: number; bottom: number; ce50: number; direction: 'BULL' | 'BEAR' } | null;
}

export interface ExternalConfluenceInputs {
  inHtfKillzone: boolean;
  lvnAligned: boolean;
  gannDistancePct: number;
  htfScore: number;
  fundingRateZScore: number;
  oiDeltaFlushPct: number;
  firstObstaclePrice: number;
  feeBufferPct?: number;
}

export interface CraneStrikeEvaluation {
  state: CraneState;
  craneScore: number;
  vetoReason: string | null;
  gates: {
    g1Regime: Gate1RegimeResult;
    g2Structure: { passed: boolean; gannScore: number; htfScore: number };
    g3Derivatives: { passed: boolean; liqScore: number };
    g4Microstructure: Gate4MicrostructureResult;
    g5Geometry: {
      passed: boolean;
      netRR: number;
      entry: number;
      stopLoss: number;
      tp1Poc: number;
      direction: 'LONG' | 'SHORT';
    } | null;
  };
}

export interface PlaybookSetupRank {
  id: string;
  rank: number;
  name: string;
  mechanism: string;
  score: number;
  status: 'READY' | 'STALKING' | 'INACTIVE';
  rrProfile: string;
  triggerNote: string;
}

/**
 * 1. GANN SQUARE OF 9 PRICE HARMONIC CALCULATOR
 * Uses square-root spiral geometry: Price_deg = (sqrt(Anchor) +/- (deg / 180))^2
 */
export function calculateGannSquareOf9(
  anchorPrice: number,
  currentPrice: number
): GannSquareOf9Result {
  const safeAnchor = anchorPrice > 0 ? anchorPrice : currentPrice || 1;
  // Scale factor keeps small-price tokens (e.g. $0.15) accurate on the root spiral
  const scale = safeAnchor < 1 ? 10000 : safeAnchor < 10 ? 100 : 1;
  const scaledRoot = Math.sqrt(safeAnchor * scale);

  const degrees = [45, 90, 135, 180, 225, 270, 315, 360];
  const levels: GannHarmonicLevel[] = [];

  let nearestLevel = safeAnchor;
  let nearestDegree = 0;
  let minDistancePct = Infinity;

  for (const deg of degrees) {
    const step = deg / 180;
    const resPrice = Number((Math.pow(scaledRoot + step, 2) / scale).toFixed(4));
    const supPrice = Number((Math.pow(Math.max(0.0001, scaledRoot - step), 2) / scale).toFixed(4));
    const type: 'CARDINAL' | 'ORDINAL' = deg % 90 === 0 ? 'CARDINAL' : 'ORDINAL';

    levels.push({
      degree: deg,
      type,
      supportPrice: supPrice,
      resistancePrice: resPrice,
    });

    for (const candidate of [resPrice, supPrice]) {
      const distPct = Math.abs((currentPrice - candidate) / currentPrice) * 100;
      if (distPct < minDistancePct) {
        minDistancePct = distPct;
        nearestLevel = candidate;
        nearestDegree = deg;
      }
    }
  }

  return {
    anchorPrice: safeAnchor,
    currentPrice,
    nearestLevel,
    nearestDegree,
    distancePct: Number(minDistancePct.toFixed(3)),
    levels,
  };
}

/**
 * 2. HELPER: 14-Period Average True Range (ATR)
 */
export function calculateATR(candles: InfernoCandle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  let sumTR = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const cur = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prevClose),
      Math.abs(cur.low - prevClose)
    );
    sumTR += tr;
  }
  return sumTR / period;
}

/**
 * 3. GATE 1: Multi-Scale Rescaled Range (R/S) Rolling Hurst Exponent
 */
export function evaluateGate1Regime(candles: InfernoCandle[]): Gate1RegimeResult {
  const windowSize = 96;
  if (candles.length < windowSize + 1) {
    return { hurst: 0.5, atr: 0, volatilityZScore: 0, regime: 'RANDOM_WALK_NOISE', passed: false };
  }

  const slice = candles.slice(-(windowSize + 1));
  const logReturns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    logReturns.push(Math.log(slice[i].close / slice[i - 1].close));
  }

  const scales = [12, 24, 48, 96];
  const logN: number[] = [];
  const logRS: number[] = [];

  for (const n of scales) {
    const numBlocks = Math.floor(windowSize / n);
    let rsSum = 0;
    let validBlocks = 0;

    for (let b = 0; b < numBlocks; b++) {
      const sub = logReturns.slice(b * n, (b + 1) * n);
      const mean = sub.reduce((acc, v) => acc + v, 0) / n;

      let cumDev = 0;
      let maxDev = -Infinity;
      let minDev = Infinity;
      let varianceSum = 0;

      for (let k = 0; k < n; k++) {
        const dev = sub[k] - mean;
        cumDev += dev;
        if (cumDev > maxDev) maxDev = cumDev;
        if (cumDev < minDev) minDev = cumDev;
        varianceSum += dev * dev;
      }

      const range = maxDev - minDev;
      const stdDev = Math.sqrt(varianceSum / n);

      if (stdDev > 1e-10 && range > 0) {
        rsSum += range / stdDev;
        validBlocks++;
      }
    }

    if (validBlocks > 0) {
      logN.push(Math.log(n));
      logRS.push(Math.log(rsSum / validBlocks));
    }
  }

  const kCount = logN.length;
  const meanX = logN.reduce((a, b) => a + b, 0) / kCount;
  const meanY = logRS.reduce((a, b) => a + b, 0) / kCount;

  let num = 0;
  let den = 0;
  for (let i = 0; i < kCount; i++) {
    num += (logN[i] - meanX) * (logRS[i] - meanY);
    den += (logN[i] - meanX) ** 2;
  }

  const rawHurst = den > 0 ? num / den : 0.5;
  const hurst = Math.max(0.1, Math.min(0.9, Number(rawHurst.toFixed(3))));

  const atr = calculateATR(candles, 14);
  const historicalATRs: number[] = [];
  for (let i = Math.max(15, candles.length - 60); i <= candles.length; i++) {
    historicalATRs.push(calculateATR(candles.slice(0, i), 14));
  }
  const atrMean = historicalATRs.reduce((a, b) => a + b, 0) / Math.max(1, historicalATRs.length);
  const atrStd = Math.sqrt(
    historicalATRs.reduce((acc, v) => acc + (v - atrMean) ** 2, 0) / Math.max(1, historicalATRs.length)
  );
  const volatilityZScore = atrStd > 0 ? Number(((atr - atrMean) / atrStd).toFixed(2)) : 0;

  let regime: MarketRegime = 'RANDOM_WALK_NOISE';
  if (hurst > 0.55) regime = 'PERSISTENT_TREND';
  else if (hurst < 0.45) regime = 'MEAN_REVERTING';

  return {
    hurst,
    atr,
    volatilityZScore,
    regime,
    passed: regime !== 'RANDOM_WALK_NOISE',
  };
}

/**
 * 4. HELPER: Single-Candle Volume Delta Extraction
 */
function getCandleDelta(c: InfernoCandle): number {
  if (typeof c.takerBuyVolume === 'number') {
    const buyVol = c.takerBuyVolume;
    const sellVol = Math.max(0, c.volume - buyVol);
    return buyVol - sellVol;
  }
  const range = c.high - c.low;
  if (range <= 0) return 0;
  const clv = (c.close - c.low - (c.high - c.close)) / range;
  return c.volume * clv;
}

/**
 * 5. GATE 4: Microstructural CVD Absorption Index + LTF Displacement FVG
 */
export function evaluateGate4Microstructure(
  candles: InfernoCandle[],
  atr: number
): Gate4MicrostructureResult {
  if (candles.length < 50 || atr <= 0) {
    return {
      absorptionIndex: 0,
      cvdScore: 0,
      isAbsorbing: false,
      mssConfirmed: false,
      fvgZone: null,
    };
  }

  const lookback = 3;
  const rollingDeltas: number[] = [];
  for (let i = candles.length - 45; i <= candles.length - lookback; i++) {
    let sumD = 0;
    for (let j = i; j < i + lookback; j++) {
      sumD += Math.abs(getCandleDelta(candles[j]));
    }
    rollingDeltas.push(sumD);
  }

  const meanDelta = rollingDeltas.reduce((a, b) => a + b, 0) / rollingDeltas.length;
  const stdDelta = Math.sqrt(
    rollingDeltas.reduce((acc, v) => acc + (v - meanDelta) ** 2, 0) / rollingDeltas.length
  );

  const recentWindow = candles.slice(-4, -1);
  const recentAbsDelta = recentWindow.reduce((acc, c) => acc + Math.abs(getCandleDelta(c)), 0);
  const deltaZ = stdDelta > 0 ? Math.max(0, (recentAbsDelta - meanDelta) / stdDelta) : 0;

  const netPriceMove = Math.abs(
    recentWindow[recentWindow.length - 1].close - recentWindow[0].open
  );
  const normalizedPriceProgress = Math.max(0.2, netPriceMove / atr);

  const absorptionIndex = Number((deltaZ / normalizedPriceProgress).toFixed(2));
  const isAbsorbing = absorptionIndex >= 2.0;
  const cvdScore = Math.min(100, Math.round((absorptionIndex / 3.5) * 100));

  const c0 = candles[candles.length - 3];
  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 1];

  const impulseBody = Math.abs(c1.close - c1.open);
  const isDisplacement = impulseBody >= 1.25 * atr;

  const priorSwingSlice = candles.slice(-14, -3);
  const microSwingHigh = Math.max(...priorSwingSlice.map((c) => c.high));
  const microSwingLow = Math.min(...priorSwingSlice.map((c) => c.low));

  let fvgZone: Gate4MicrostructureResult['fvgZone'] = null;
  let mssConfirmed = false;

  if (isDisplacement && c1.close > c1.open && c2.low > c0.high && c2.close > microSwingHigh) {
    mssConfirmed = true;
    fvgZone = {
      bottom: c0.high,
      top: c2.low,
      ce50: Number(((c0.high + c2.low) / 2).toFixed(4)),
      direction: 'BULL',
    };
  } else if (isDisplacement && c1.close < c1.open && c2.high < c0.low && c2.close < microSwingLow) {
    mssConfirmed = true;
    fvgZone = {
      bottom: c2.high,
      top: c0.low,
      ce50: Number(((c2.high + c0.low) / 2).toFixed(4)),
      direction: 'BEAR',
    };
  }

  return {
    absorptionIndex,
    cvdScore,
    isAbsorbing,
    mssConfirmed,
    fvgZone,
  };
}

/**
 * 6. AUTOMATIC INDICATOR BRIDGE HELPER
 * Connects Inferno's existing candles, Order Blocks, and Volume Profile into Gate 2, 3, and 5.
 */
export function buildCraneConfluenceInputs(params: {
  htfCandles: InfernoCandle[];
  ltfCandles: InfernoCandle[];
  orderBlocks?: OrderBlockZone[];
  volumeProfile?: VolumeProfileSnapshot;
  fundingRateZScore?: number;
  oiDeltaFlushPct?: number;
}): { confluence: ExternalConfluenceInputs; gann: GannSquareOf9Result } {
  const { htfCandles, ltfCandles, orderBlocks = [], volumeProfile } = params;
  const currentPrice = ltfCandles[ltfCandles.length - 1]?.close ?? 100;
  const htfAtr = calculateATR(htfCandles, 14) || currentPrice * 0.01;

  // Macro swing anchor for Gann Square of 9 (last 120 HTF bars)
  const macroSlice = htfCandles.slice(-120);
  const macroLow = macroSlice.length > 0 ? Math.min(...macroSlice.map((c) => c.low)) : currentPrice * 0.9;
  const gann = calculateGannSquareOf9(macroLow, currentPrice);

  // Check if price is inside or within 0.5 ATR of an unmitigated Order Block
  const unmitigatedOBs = orderBlocks.filter((ob) => !ob.mitigated);
  let inHtfKillzone = false;
  for (const ob of unmitigatedOBs) {
    if (currentPrice >= ob.bottom - 0.5 * htfAtr && currentPrice <= ob.top + 0.5 * htfAtr) {
      inHtfKillzone = true;
      break;
    }
  }
  // Fallback if OrderBlock array is not passed: check 4H/HTF swing extreme proximity
  if (unmitigatedOBs.length === 0 && macroSlice.length >= 20) {
    const recentLow = Math.min(...macroSlice.slice(-25).map((c) => c.low));
    const recentHigh = Math.max(...macroSlice.slice(-25).map((c) => c.high));
    inHtfKillzone =
      Math.abs(currentPrice - recentLow) <= 1.2 * htfAtr ||
      Math.abs(currentPrice - recentHigh) <= 1.2 * htfAtr;
  }

  // Volume Profile LVN / Value Area alignment
  let lvnAligned = true;
  let firstObstaclePrice = currentPrice + 3.8 * calculateATR(ltfCandles, 14);
  if (volumeProfile) {
    const nearLvn = volumeProfile.lvns.some(
      (lvn) => Math.abs(currentPrice - lvn) / currentPrice <= 0.004
    );
    const outsideValueArea =
      currentPrice <= volumeProfile.val * 1.002 || currentPrice >= volumeProfile.vah * 0.998;
    lvnAligned = nearLvn || outsideValueArea;
    firstObstaclePrice = volumeProfile.poc;
  }

  // Offline liquidity sweep synthesis if live Binance derivatives aren't passed
  let fundingZ = params.fundingRateZScore ?? 0;
  let oiFlush = params.oiDeltaFlushPct ?? 0;
  if (params.fundingRateZScore === undefined && ltfCandles.length >= 25) {
    const prior20 = ltfCandles.slice(-25, -3);
    const swingL = Math.min(...prior20.map((c) => c.low));
    const swingH = Math.max(...prior20.map((c) => c.high));
    const recent3 = ltfCandles.slice(-3);
    const sweptLow = recent3.some((c) => c.low < swingL && c.close > swingL);
    const sweptHigh = recent3.some((c) => c.high > swingH && c.close < swingH);
    if (sweptLow || sweptHigh) {
      fundingZ = sweptLow ? -2.2 : 2.2;
      oiFlush = -3.5;
    }
  }

  return {
    gann,
    confluence: {
      inHtfKillzone,
      lvnAligned,
      gannDistancePct: gann.distancePct,
      htfScore: inHtfKillzone ? 90 : 55,
      fundingRateZScore: fundingZ,
      oiDeltaFlushPct: oiFlush,
      firstObstaclePrice: Number(firstObstaclePrice.toFixed(4)),
      feeBufferPct: 0.0008,
    },
  };
}

/**
 * 7. FULL 5-GATE SEQUENTIAL VETO CASCADE ORCHESTRATOR
 */
export function evaluateCraneStrike(
  htfCandles: InfernoCandle[],
  ltfCandles: InfernoCandle[],
  ext: ExternalConfluenceInputs
): CraneStrikeEvaluation {
  const g1 = evaluateGate1Regime(htfCandles);
  const ltfAtr = calculateATR(ltfCandles, 14);

  const gannScore = Math.max(0, Math.min(100, Math.round((1 - ext.gannDistancePct / 0.5) * 100)));
  const bStructure = ext.inHtfKillzone && ext.lvnAligned && ext.gannDistancePct <= 0.25;

  const fundingTrapScore = Math.min(100, Math.round((Math.abs(ext.fundingRateZScore) / 2.5) * 60));
  const oiFlushScore =
    ext.oiDeltaFlushPct < 0 ? Math.min(40, Math.round(Math.abs(ext.oiDeltaFlushPct) * 8)) : 0;
  const liqScore = Math.min(100, fundingTrapScore + oiFlushScore);
  const g3Passed = liqScore >= 60;

  const g4 = evaluateGate4Microstructure(ltfCandles, ltfAtr);

  let g5: CraneStrikeEvaluation['gates']['g5Geometry'] = null;
  let bEV = false;

  if (g4.fvgZone) {
    const entry = g4.fvgZone.ce50;
    const recentSweepExtreme =
      g4.fvgZone.direction === 'BULL'
        ? Math.min(...ltfCandles.slice(-6).map((c) => c.low))
        : Math.max(...ltfCandles.slice(-6).map((c) => c.high));

    const stopLoss =
      g4.fvgZone.direction === 'BULL'
        ? Number((recentSweepExtreme - 0.2 * ltfAtr).toFixed(4))
        : Number((recentSweepExtreme + 0.2 * ltfAtr).toFixed(4));

    const riskDistance = Math.abs(entry - stopLoss);
    const rewardDistance = Math.abs(ext.firstObstaclePrice - entry);
    const feeCost = entry * (ext.feeBufferPct ?? 0.0008);

    const netRR =
      riskDistance > 0
        ? Number(((rewardDistance - feeCost) / (riskDistance + feeCost)).toFixed(2))
        : 0;

    bEV = netRR >= 3.0;
    g5 = {
      passed: bEV,
      netRR,
      entry,
      stopLoss,
      tp1Poc: ext.firstObstaclePrice,
      direction: g4.fvgZone.direction === 'BULL' ? 'LONG' : 'SHORT',
    };
  }

  const weightedSubScore =
    0.25 * gannScore + 0.3 * liqScore + 0.3 * g4.cvdScore + 0.15 * ext.htfScore;

  let state: CraneState = 'DORMANT';
  let vetoReason: string | null = null;
  let finalScore = 0;

  if (!g1.passed) {
    state = 'DORMANT';
    vetoReason = `GATE 1 VETO: Hurst (${g1.hurst}) inside Random Walk Noise [0.45 - 0.55].`;
  } else if (!bStructure) {
    state = 'DORMANT';
    vetoReason = 'GATE 2 VETO: Price outside HTF Killzone / Gann Cardinal harmonic.';
  } else if (!g4.isAbsorbing || !g3Passed) {
    state = 'STALKING';
    finalScore = Math.round(weightedSubScore * 0.65);
    vetoReason = 'STALKING: Awaiting liquidity sweep & CVD passive limit absorption (>2.0σ).';
  } else if (!g4.mssConfirmed) {
    state = 'ARMED';
    finalScore = Math.round(weightedSubScore * 0.85);
    vetoReason = 'ARMED: CVD absorption locked. Awaiting LTF Displacement MSS + FVG close.';
  } else if (!bEV) {
    state = 'ARMED';
    finalScore = 0;
    vetoReason = `GATE 5 VETO: First opposing HVN restricts Net R:R to ${g5?.netRR ?? 0}R (needs >= 3.0R).`;
  } else {
    state = 'STRIKE';
    finalScore = Math.round(weightedSubScore);
    vetoReason = null;
  }

  return {
    state,
    craneScore: finalScore,
    vetoReason,
    gates: {
      g1Regime: g1,
      g2Structure: { passed: bStructure, gannScore, htfScore: ext.htfScore },
      g3Derivatives: { passed: g3Passed, liqScore },
      g4Microstructure: g4,
      g5Geometry: g5,
    },
  };
}

/**
 * 8. PLAYBOOK HUB 6-SETUP PODIUM RANKING EVALUATOR
 * Scores and ranks the 6 Institutional Setups from #1 Gold to #6.
 */
export function evaluatePlaybookPodium(evalResult: CraneStrikeEvaluation): PlaybookSetupRank[] {
  const { gates } = evalResult;
  const g1Factor = gates.g1Regime.passed ? 1 : 0.4;

  const setups: Omit<PlaybookSetupRank, 'rank'>[] = [
    {
      id: 'sweep-fvg',
      name: '1. Liquidity Sweep + Displacement FVG',
      mechanism: 'Stop-hunt raid + MSS repricing gap',
      score: Math.round(
        g1Factor * (0.45 * gates.g3Derivatives.liqScore + 0.55 * (gates.g4Microstructure.mssConfirmed ? 95 : 50))
      ),
      status: gates.g4Microstructure.mssConfirmed && gates.g3Derivatives.passed ? 'READY' : 'STALKING',
      rrProfile: '1:3.5 to 1:5.0',
      triggerNote: gates.g4Microstructure.fvgZone
        ? `${gates.g4Microstructure.fvgZone.direction} FVG @ ${gates.g4Microstructure.fvgZone.ce50}`
        : 'Awaiting sweep wick + 3-candle FVG',
    },
    {
      id: 'ob-fvg-overlap',
      name: '2. Displacement OB + FVG Overlap',
      mechanism: 'Institutional footprint + Gann harmonic defense',
      score: Math.round(
        g1Factor * (0.5 * gates.g2Structure.htfScore + 0.5 * gates.g2Structure.gannScore)
      ),
      status: gates.g2Structure.passed ? 'READY' : 'STALKING',
      rrProfile: '1:3.0 to 1:4.5',
      triggerNote: `Gann Confluence: ${gates.g2Structure.gannScore}%`,
    },
    {
      id: 'cvd-absorption',
      name: '3. CVD Absorption Divergence Trap',
      mechanism: 'Passive limit wall soaking aggressive market orders',
      score: Math.round(g1Factor * gates.g4Microstructure.cvdScore),
      status: gates.g4Microstructure.isAbsorbing ? 'READY' : 'STALKING',
      rrProfile: '1:2.5 to 1:3.5',
      triggerNote: `Absorption Index: ${gates.g4Microstructure.absorptionIndex}σ`,
    },
    {
      id: 'lvn-snapback',
      name: '4. Volume Profile LVN / POC Snapback',
      mechanism: 'Auction theory vacuum rejection toward POC',
      score: Math.round(
        g1Factor * (gates.g1Regime.regime === 'MEAN_REVERTING' ? 88 : 64)
      ),
      status: gates.g1Regime.regime === 'MEAN_REVERTING' ? 'READY' : 'INACTIVE',
      rrProfile: '1:2.5 to 1:3.2',
      triggerNote: `Regime H: ${gates.g1Regime.hurst}`,
    },
    {
      id: 'breaker-ifvg',
      name: '5. Breaker Block / iFVG Polarity Flip',
      mechanism: 'Trapped counter-trend liquidation retest',
      score: Math.round(
        g1Factor * (gates.g1Regime.regime === 'PERSISTENT_TREND' ? 86 : 58)
      ),
      status: gates.g1Regime.regime === 'PERSISTENT_TREND' ? 'STALKING' : 'INACTIVE',
      rrProfile: '1:3.0 to 1:4.0',
      triggerNote: 'Requires full-body OB mitigation flip',
    },
    {
      id: 'funding-oi-squeeze',
      name: '6. Perpetual Funding + OI Liquidation Squeeze',
      mechanism: 'Crowded retail leverage cascade into HTF zone',
      score: Math.round(g1Factor * gates.g3Derivatives.liqScore),
      status: gates.g3Derivatives.passed ? 'READY' : 'INACTIVE',
      rrProfile: '1:3.5 to 1:6.0',
      triggerNote: `Liq Fuel Score: ${gates.g3Derivatives.liqScore}/100`,
    },
  ];

  return setups
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}
