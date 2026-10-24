export type Timeframe = '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '12h' | '1d' | '1w';
export type OBMode = 'strict' | 'loose';
export type VPMode = 'vrvp' | 'session';
export type ViewMode = 'selector' | 'terminal';
export type ExperienceMode = 'rookie' | 'pro';
export type StrategyTabId = 1 | 2 | 3 | 4 | 5;

export interface PairItem {
  symbol: string;
  baseAsset: string;
  name: string;
  price: number;
  change24h: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  rank?: number;
  isUp?: boolean;
  delta?: string;
  vol?: string;
  quoteVolume?: number;
}

export interface KlineData {
  time: number; // Unix timestamp in seconds (UTCTimestamp)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyVolume?: number; // True ask-lifted volume from Binance d[9] or aggTrade stream
  takerSellVolume?: number; // True bid-hit volume (volume - takerBuyVolume)
  barDelta?: number; // takerBuyVolume - takerSellVolume
  cvd?: number; // Cumulative Volume Delta across window
  liquidationBuyUsd?: number; // Short liquidations (forced market buys)
  liquidationSellUsd?: number; // Long liquidations (forced market sells)
  liquidationsBuy?: number;
  liquidationsSell?: number;
  liquidationBuyVol?: number;
  liquidationSellVol?: number;
}

export interface VolumeProfileBucket {
  price: number;
  volume: number;
  isPOC: boolean;
  isValueArea: boolean;
  low?: number;
  high?: number;
  pctOfMax?: number;
  isHVN?: boolean;
  isLVN?: boolean;
  bidVolume?: number; // True market sell / passive bid hit volume
  askVolume?: number; // True market buy / passive ask lifted volume
  delta?: number; // askVolume - bidVolume
}

export interface VolumeProfile {
  poc: number;
  vah: number;
  val: number;
  totalVolume: number;
  buckets: VolumeProfileBucket[];
  hvnZones?: { low: number; high: number; price: number }[];
  lvnZones?: { low: number; high: number; price: number }[];
  mode?: VPMode;
  totalBidVolume?: number;
  totalAskVolume?: number;
  sessionRvol?: number;
  sessionName?: 'ASIAN' | 'LONDON' | 'NY_OVERLAP' | 'NY_AFTERNOON';
}

export type OrderBlockMitigationStatus = 'UNMITIGATED' | 'PARTIAL' | 'INVALIDATED';

export interface OrderBlock {
  type: 'bull' | 'bear';
  low: number;
  high: number;
  midpoint: number;
  time: number;
  candleIndex: number;
  status?: OrderBlockMitigationStatus;
  mitigationStatus?: OrderBlockMitigationStatus;
  mitigationPct?: number; // 0 to 100%
  originalHigh?: number;
  originalLow?: number;
  meanThreshold?: number; // 50% equilibrium of original zone
  qualityScore?: number; // 0-100 institutional quality score
  footprintScore?: number; // 0-100 institutional quality score
  impulseAtrMultiple?: number;
  displacementAtrRatio?: number; // Impulse magnitude vs 14-period ATR
  hasFvg?: boolean; // Leaves a 3-candle Fair Value Gap
  fvgHigh?: number;
  fvgLow?: number;
  deltaSpikeRatio?: number; // Impulse delta vs 20-bar mean
}

export interface LiquidityLevels {
  srHigh: number;
  srLow: number;
  askLiquidityPrice: number;
  askLiquidityQty: number;
  bidLiquidityPrice: number;
  bidLiquidityQty: number;
}

export interface DeribitOptionsData {
  currency: string;
  symbol?: string;
  maxPain: number;
  callWall: number;
  putWall: number;
  netGex: number; // in millions $
  pcRatio: number;
  skew25d: number;
  expiryHours: number;
  totalCallOi: number;
  totalPutOi: number;
  isDeribitNative: boolean;
  zeroGammaLevel?: number; // True Black-Scholes Zero-Gamma Flip Price
  gammaRegime?: 'POSITIVE_PINNING' | 'NEGATIVE_ACCELERATION';
  nearTermGexWeightPct?: number; // % of GEX concentrated in <= 7d expiries
  otmPutIv?: number;
  otmCallIv?: number;
}

export type StatisticalRegimeType =
  | 'MEAN_REVERTING'
  | 'MOMENTUM_BREAKOUT'
  | 'VOLATILITY_EXPANSION'
  | 'RANDOM_WALK';

export interface MarketRegimeAnalysis {
  regime: StatisticalRegimeType;
  hurstExponent: number; // H < 0.45 mean reverting, H > 0.55 trending/momentum
  adx14: number; // Wilder's 14-period ADX (> 25 trend, < 20 range)
  plusDi: number;
  minusDi: number;
  volPercentile: number; // 0-100th realized volatility percentile
  isMeanReversionAllowed: boolean; // True only when H < 0.48 and ADX < 25
  isBreakoutActive: boolean; // True when H > 0.55 or ADX >= 25
  regimeHeadline: string;
  fadeWarning?: string;
}

export type SpotPerpFlowRegime =
  | 'SPOT_DRIVEN_EXPANSION'
  | 'LEVERAGE_TRAP_LONG'
  | 'SPOT_ABSORPTION_ACCUMULATION'
  | 'LEVERAGE_TRAP_SHORT'
  | 'NEUTRAL_SYNC';

export interface SpotPerpDivergenceData {
  spotCvd20: number;
  perpCvd20: number;
  spotDeltaPct: number;
  perpDeltaPct: number;
  basisBps: number; // (Perp - Spot) / Spot * 10000
  flowRegime: SpotPerpFlowRegime;
  headline: string;
  description: string;
  isLive: boolean;
}

export interface OrderflowAnomaly {
  time: number;
  price: number;
  type:
    | 'DELTA_BUY_BUBBLE'
    | 'DELTA_SELL_BUBBLE'
    | 'BULL_ABSORPTION'
    | 'BEAR_ABSORPTION'
    | 'VDU_EXHAUSTION';
  deltaValue: number;
  zScore: number;
  label: string;
}

export interface SessionRvolResult {
  sessionRvol: number;
  rawRvol20: number;
  sessionName: 'ASIAN' | 'LONDON' | 'NY_OVERLAP' | 'NY_AFTERNOON';
  isVduActive: boolean;
  isIgnitionActive: boolean;
  sessionAvgVolume: number;
}

export interface SharpeSortinoMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  returnEfficiency: number;
  sharpeRegime: string;
  meanReturn: number;
  stdDev: number;
  downsideStdDev: number;
  periodsPerYear: number;
}

export interface TelemetryMetrics {
  fundingRate: number;
  fundingAnnualized: number;
  fundingCountdown: string;
  fundingBias: string;
  oi4hDelta: number;
  price4hDelta: number;
  oiBias: string;
  zScore: number;
  vwma50: number;
  zScoreBias: string;
  rsi14: number;
  cvdDelta: number;
  divergenceBias: string;
  netGex: number;
  gexExpiry: string;
  gexBias: string;
  pcRatio: number;
  skew25d: number;
  skewBias: string;
  sharpeRatio?: number;
  sortinoRatio?: number;
  returnEfficiency?: number;
  sharpeRegime?: string;
  sharpeSortino?: SharpeSortinoMetrics;
  // Pass 1 Institutional Telemetry Additions
  hurstExponent?: number;
  adx14?: number;
  volPercentile?: number;
  marketRegime?: MarketRegimeAnalysis;
  spotCvdDelta?: number;
  spotPerpDivergence?: SpotPerpDivergenceData;
  basisBps?: number;
  sessionRvol?: number;
  sessionName?: 'ASIAN' | 'LONDON' | 'NY_OVERLAP' | 'NY_AFTERNOON';
  zeroGammaLevel?: number;
}

export interface MTFMatrixCell {
  text: string;
  color: string;
  bold?: boolean;
}

export interface MTFMatrixRow {
  layer: string;
  tf15m: MTFMatrixCell;
  tf1h: MTFMatrixCell;
  tf4h: MTFMatrixCell;
  tf1d: MTFMatrixCell;
}

export interface ConfluenceOverview {
  score: number;
  bias: string;
  corridor: string;
  regime: string;
  meanVol: string;
}

export interface SpeculationBrief {
  confidence: string;
  zone: string;
  trap: string;
  invalidation: string;
  suggestedEntry: number;
  suggestedStop: number;
}

export type SpeculationBriefType = SpeculationBrief;

export interface ExecutionCalculation {
  riskUsdt: number;
  entryPrice: number;
  stopLoss: number;
  positionSize: number;
  notionalValue: number;
  leverageEq: number;
  stopDistPct: number;
  target1Price: number;
  target1RewardUsdt: number;
  target1Pct: number;
  target2Price: number;
  target2RewardUsdt: number;
  target2Pct: number;
  makerFeeUsdt?: number;
  takerFeeAndSlippageUsdt?: number;
  effectiveNetRR1?: number;
  effectiveNetRR2?: number;
  halfKellyRiskPct?: number;
  feeDragPctOfRisk?: number;
}

export type AMDPhaseType = 'ACCUMULATION' | 'MANIPULATION' | 'DISTRIBUTION' | 'EXPANSION';

export interface AMDPhaseResult {
  phase: AMDPhaseType;
  stageName: string;
  confidence: number;
  scores: {
    accumulation: number;
    manipulation: number;
    distribution: number;
    expansion: number;
  };
  effortVsResult: string;
  volumeAnomaly: string;
  liquidityTrapStatus: string;
  institutionalRead: string;
  activeStageIndex: 0 | 1 | 2;
}

export interface DetectedPattern {
  name: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  barsAgo: number;
  time: number;
  price: number;
  rvol: number;
  quality: number;
  testedLevelName?: string;
  testedLevelPrice?: number;
  isAtKeyLevel: boolean;
  description: string;
  isRegimeSuppressed?: boolean;
}

export interface CandleAnatomy {
  wickRejectionRatio: number;
  clvPct: number;
  bodyToAtrRatio: number;
  nearestSrDistancePct: number;
  nearestSrName: string;
  nearestSrPrice: number;
}

export interface CandlestickAnalysisResult {
  primaryPattern: DetectedPattern | null;
  recentPatterns: DetectedPattern[];
  anatomy: CandleAnatomy;
  marketRegime?: MarketRegimeAnalysis;
}

export interface MovingAverageData {
  name: string;
  period: number;
  price: number;
  distancePct: number;
  status: 'SUPPORT' | 'RESISTANCE' | 'CONFLUENCE';
  slopeBpsPerBar?: number;
}

export interface MovingAverageAnalysisResult {
  ribbonAlignment: string;
  ribbonBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'COMPRESSION';
  mas: {
    ema9: MovingAverageData;
    ema21: MovingAverageData;
    ema50: MovingAverageData;
    ema200: MovingAverageData;
    sma200: MovingAverageData;
    vwap: MovingAverageData;
  };
  stretchScoreAtr: number;
  isOverextended: boolean;
  overextensionStatus: string;
  emaCross921: string;
  emaCross50200: string;
  spotPerpDivergence?: SpotPerpDivergenceData;
}

export interface PotentialSetupSpeculation {
  lensTitle: string;
  setupType: string;
  bias: 'BULLISH' | 'BEARISH';
  thesis: string;
  reactionZoneLow: number;
  reactionZoneHigh: number;
  triggerCondition: string;
  invalidationPrice: number;
  target1Price: number;
  target2Price: number;
  suggestedEntry: number;
}

export interface StrategyConfidencePillar {
  label: string;
  weightPct: number;
  score: number;
  detail: string;
}

export interface StrategyConfidence {
  score: number;
  headline: string;
  bias: 'BULLISH' | 'BEARISH';
  pillars: StrategyConfidencePillar[];
  conflictWarning?: string;
  isHardGated?: boolean;
  bayesianBreakdown?: {
    structuralRegime: number;
    spotPerpFlow: number;
    optionsGamma: number;
    volatilityRvol: number;
  };
}

export type ExecutionOrderMode = 'MAKER_LIMIT' | 'TAKER_MARKET';
