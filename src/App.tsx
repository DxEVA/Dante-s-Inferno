/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  PairItem,
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
  SharpeSortinoMetrics,
  SpotPerpDivergenceData,
} from './types';
import {
  DEFAULT_PAIRS,
  fetchTopPairs,
  fetchAllPerpPairs,
  fetchKlines,
  fetchFundingRate,
  fetch4hOIDelta,
  fetchOptionsSummary,
  fetchOrderbookLiquidity,
  fetchSpotVsPerpDivergence,
  BinanceKlineSocket,
} from './services/marketData';
import {
  calculateVolumeProfile,
  calculateOrderBlocks,
  calculateSupportResistance,
  calculateVWMAAndZScore,
  calculateCVDAndDivergence,
  generateMTFMatrix,
  calculateExecution,
  analyzeAMDPhase,
  analyzeCandlestickPatterns,
  analyzeMovingAverages,
  generateLensSetups,
  calculateSharpeAndSortino,
  calculateSessionNormalizedRVOL,
} from './utils/quantEngine';

import { Header } from './components/Header';
import { TickerBar } from './components/TickerBar';
import { FloatingLevels } from './components/FloatingLevels';
import { QuantChart, ChartLayers, DEFAULT_CHART_LAYERS } from './components/QuantChart';
import { TrafficLightBanner } from './components/TrafficLightBanner';
import { StrategyTabs, TacticalDeckMode } from './components/StrategyTabs';
import { PaperTradeEntry } from './components/PreFlightChecklist';
import { AssetSelectorScreen } from './components/AssetSelectorScreen';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { PaperJournalModal } from './components/PaperJournalModal';
import { GlossaryModal } from './components/GlossaryModal';
import { AsciiRadarHeader } from './components/AsciiTelemetry';
import {
  loadPaperTrades,
  addPaperTrade as addJournalPaperTrade,
  deletePaperTrade,
  evaluateOpenTrade,
  gradeOpenTradesWithKlines,
  savePaperTrades,
  PaperTrade,
} from './utils/paperJournal';

export default function App() {
  // Screen View Mode: 'selector' (Pre-Chart Top 50 Launchpad) vs 'terminal' (Full Chart & Strategy Workspace)
  const [viewMode, setViewMode] = useState<'selector' | 'terminal'>('selector');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(true);

  // Global Rookie Guide vs Pro Terminal Experience Mode (default 'rookie')
  const [experienceMode, setExperienceMode] = useState<'rookie' | 'pro'>('rookie');

  useEffect(() => {
    try {
      localStorage.setItem('vertex_experience_mode', experienceMode);
      window.dispatchEvent(
        new CustomEvent('vertex:experience-mode-change', { detail: experienceMode })
      );
    } catch {
      // ignore storage errors
    }
  }, [experienceMode]);

  const [showSetupOnChart, setShowSetupOnChart] = useState<boolean>(true);
  const [highlightedLevel, setHighlightedLevel] = useState<{ label: string; price: number } | null>(null);
  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);
  const [showJournalModal, setShowJournalModal] = useState<boolean>(false);
  const [paperTradesList, setPaperTradesList] = useState<PaperTrade[]>(() => loadPaperTrades());
  const [chartLayers, setChartLayers] = useState<ChartLayers>(DEFAULT_CHART_LAYERS);
  const [activeStrategyTab, setActiveStrategyTab] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [externalDeckRequest, setExternalDeckRequest] = useState<{
    deck: TacticalDeckMode;
    ts: number;
  } | null>(null);
  const [mobilePage, setMobilePage] = useState<'CHART' | 'RADAR' | 'LENSES' | 'EXECUTE' | 'ACADEMY'>('CHART');

  const handleNavigateMobilePage = useCallback(
    (page: 'CHART' | 'RADAR' | 'LENSES' | 'EXECUTE' | 'ACADEMY') => {
      setMobilePage(page);
      if (page === 'RADAR') {
        setExternalDeckRequest({ deck: 'MTF_RADAR', ts: Date.now() });
      } else if (page === 'LENSES') {
        setExternalDeckRequest({ deck: 'LENSES', ts: Date.now() });
      } else if (page === 'EXECUTE') {
        setExternalDeckRequest({ deck: 'PREFLIGHT_SIZER', ts: Date.now() });
      } else if (page === 'ACADEMY') {
        setExternalDeckRequest({ deck: 'REVERSE_ACADEMY', ts: Date.now() });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const openTradesCount = useMemo(
    () => paperTradesList.filter((t) => t.status === 'OPEN' || t.status === 'PENDING').length,
    [paperTradesList]
  );

  const [spotPerpDivergence, setSpotPerpDivergence] = useState<SpotPerpDivergenceData | undefined>(
    undefined
  );

  // Pairs & Selection
  const [topPairs, setTopPairs] = useState<PairItem[]>(DEFAULT_PAIRS);
  const [allPairs, setAllPairs] = useState<PairItem[]>([]);
  const [activePair, setActivePair] = useState<PairItem>(DEFAULT_PAIRS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTf, setSelectedTf] = useState('1h');
  const [obMode, setObMode] = useState<'strict' | 'loose'>('strict');
  const [vpMode, setVpMode] = useState<'vrvp' | 'session'>('vrvp');

  // Chart & Kline Data
  const [klines, setKlines] = useState<KlineData[]>([]);
  const latestKlinesRef = useRef<KlineData[]>([]);
  latestKlinesRef.current = klines;
  const lastWsStateUpdateRef = useRef<number>(0);
  const lastWsBarTimeRef = useRef<number>(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const socketRef = useRef<BinanceKlineSocket | null>(null);

  // Structural Levels
  const [volumeProfile, setVolumeProfile] = useState<VolumeProfile>({
    poc: 89150,
    vah: 91240,
    val: 87600,
    totalVolume: 0,
    buckets: [],
  });
  const [bullOB, setBullOB] = useState<OrderBlock | null>({
    type: 'bull',
    low: 88200,
    high: 88800,
    midpoint: 88500,
    time: Date.now(),
    candleIndex: 0,
  });
  const [bearOB, setBearOB] = useState<OrderBlock | null>({
    type: 'bear',
    low: 92000,
    high: 92600,
    midpoint: 92300,
    time: Date.now(),
    candleIndex: 0,
  });

  // Support / Resistance & Orderbook Liquidity Depth
  const [liquidity, setLiquidity] = useState<LiquidityLevels>({
    srHigh: 0,
    srLow: 0,
    askLiquidityPrice: 0,
    askLiquidityQty: 0,
    bidLiquidityPrice: 0,
    bidLiquidityQty: 0,
  });

  // Options & Derivatives
  const [optionsData, setOptionsData] = useState<DeribitOptionsData>({
    currency: 'BTC',
    maxPain: 89000,
    callWall: 92000,
    putWall: 86500,
    netGex: 142,
    pcRatio: 0.68,
    skew25d: 3.2,
    expiryHours: 18,
    totalCallOi: 14200,
    totalPutOi: 9650,
    isDeribitNative: true,
  });

  // Telemetry Cards
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>({
    fundingRate: 0.0001,
    fundingAnnualized: 10.95,
    fundingCountdown: '03:42:15',
    fundingBias: 'Crowded Longs',
    oi4hDelta: 4.82,
    price4hDelta: 1.15,
    oiBias: 'Long Build',
    zScore: 1.84,
    vwma50: 87790,
    zScoreBias: 'Approaching +2.0σ Overbought',
    rsi14: 64.2,
    cvdDelta: 1480,
    divergenceBias: 'Bullish RSI + CVD Squeeze',
    netGex: 142,
    gexExpiry: '18h to 08:00 UTC Expiry',
    gexBias: '+GEX (Pinning / Mean-Rev)',
    pcRatio: 0.68,
    skew25d: 3.2,
    skewBias: 'Upside Speculation',
  });

  // MTF Matrix & Confluence
  const [matrix, setMatrix] = useState<MTFMatrixRow[]>([]);
  const [confluence, setConfluence] = useState<ConfluenceOverview>({
    score: 82,
    bias: 'BULL BIAS (EXPANSION)',
    corridor: '$88.2K – $91.2K',
    regime: 'RANGE ROTATION',
    meanVol: 'Low',
  });

  // AMD Institutional Phase State
  const [amdPhase, setAmdPhase] = useState<AMDPhaseResult>(() =>
    analyzeAMDPhase([], { poc: 0, vah: 0, val: 0, totalVolume: 0, buckets: [] }, null, null, {
      currency: 'BTC',
      maxPain: 0,
      callWall: 0,
      putWall: 0,
      netGex: 0,
      pcRatio: 0.68,
      skew25d: 0,
      expiryHours: 8,
      totalCallOi: 0,
      totalPutOi: 0,
      isDeribitNative: true,
    })
  );

  // Speculation Brief
  const [brief, setBrief] = useState<SpeculationBriefType>({
    confidence:
      '82% Bullish confluence across 1H/4H timeframes. BTC holds cleanly above the High Volume Node ($89,150 POC) with +GEX dealer positioning actively damping volatility toward the $89,000 Max Pain strike.',
    zone: 'Key reaction demand zone: $88,250 – $88,800 (1H Bullish Order Block + Value Area Low confluence overlap).',
    trap: 'Perp open interest increased +4.82% with positive CVD absorption while spot delta remains flat; dealer gamma will aggressively squeeze short scalpers if $90,200 breaks with volume.',
    invalidation:
      'Daily candle-close below $87,450 (invalidates 4H market structure shift & deeply penetrates Value Area Low).',
    suggestedEntry: 88525,
    suggestedStop: 87450,
  });
  const [isBriefLoading, setIsBriefLoading] = useState(false);

  // Sizing & Execution Calculator
  const [riskUsdt, setRiskUsdt] = useState<number>(50);
  const [entryPrice, setEntryPrice] = useState<number>(88525);
  const [stopLoss, setStopLoss] = useState<number>(87450);
  const [calcResult, setCalcResult] = useState<ExecutionCalculation>(() =>
    calculateExecution(50, 88525, 87450)
  );

  // UI Toast & Ping
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pingMs, setPingMs] = useState(28);
  const toastTimeoutRef = useRef<any>(null);

  // PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  const handleCopyText = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text).then(
        () => showToast(`COPIED: ${text} (${label})`),
        () => showToast(`COPIED: ${text}`)
      );
    },
    [showToast]
  );

  // Strategy Analysis Calculations across the 5 Institutional Lenses
  const candlestickResult = useMemo(
    () =>
      analyzeCandlestickPatterns(
        klines,
        volumeProfile,
        bullOB,
        bearOB,
        liquidity,
        optionsData
      ),
    [klines, volumeProfile, bullOB, bearOB, liquidity, optionsData]
  );

  const maResult = useMemo(
    () => analyzeMovingAverages(klines, spotPerpDivergence),
    [klines, spotPerpDivergence]
  );

  const sharpeSortino = useMemo(
    () => calculateSharpeAndSortino(klines, selectedTf),
    [klines, selectedTf]
  );

  const lensSetups = useMemo(
    () => ({
      1: generateLensSetups(
        1,
        activePair.price,
        klines,
        volumeProfile,
        bullOB,
        bearOB,
        optionsData,
        liquidity,
        candlestickResult,
        maResult,
        amdPhase,
        sharpeSortino
      ),
      2: generateLensSetups(
        2,
        activePair.price,
        klines,
        volumeProfile,
        bullOB,
        bearOB,
        optionsData,
        liquidity,
        candlestickResult,
        maResult,
        amdPhase,
        sharpeSortino
      ),
      3: generateLensSetups(
        3,
        activePair.price,
        klines,
        volumeProfile,
        bullOB,
        bearOB,
        optionsData,
        liquidity,
        candlestickResult,
        maResult,
        amdPhase,
        sharpeSortino
      ),
      4: generateLensSetups(
        4,
        activePair.price,
        klines,
        volumeProfile,
        bullOB,
        bearOB,
        optionsData,
        liquidity,
        candlestickResult,
        maResult,
        amdPhase,
        sharpeSortino
      ),
      5: generateLensSetups(
        5,
        activePair.price,
        klines,
        volumeProfile,
        bullOB,
        bearOB,
        optionsData,
        liquidity,
        candlestickResult,
        maResult,
        amdPhase,
        sharpeSortino
      ),
    }),
    [
      activePair.price,
      klines,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      candlestickResult,
      maResult,
      amdPhase,
      sharpeSortino,
    ]
  );

  const handleLoadSetup = useCallback(
    (entry: number, stop: number, tp1: number, tp2: number) => {
      setEntryPrice(entry);
      setStopLoss(stop);
      const newCalc = calculateExecution(riskUsdt, entry, stop, tp1, tp2);
      setCalcResult(newCalc);
      showToast(`SETUP LOADED: ENTRY $${entry} • STOP $${stop}`);
    },
    [riskUsdt, showToast]
  );

  // PWA Install listener
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(() => setInstallPrompt(null));
    }
  };

  // Recalculate execution helper whenever inputs change
  useEffect(() => {
    const res = calculateExecution(riskUsdt, entryPrice, stopLoss);
    setCalcResult(res);
  }, [riskUsdt, entryPrice, stopLoss]);

  // Load all Binance USDT perpetual pairs in background for full catalog search
  useEffect(() => {
    fetchAllPerpPairs()
      .then((pairs) => {
        if (pairs && pairs.length > 0) {
          setAllPairs(pairs);
        }
      })
      .finally(() => {
        setIsCatalogLoading(false);
      });
  }, []);

  // Periodic ticker & ping update
  useEffect(() => {
    const fetchTickers = async () => {
      const start = performance.now();
      const updated = await fetchTopPairs();
      const latency = Math.round(performance.now() - start);
      setPingMs(Math.max(14, Math.min(latency, 85)));

      setTopPairs(updated);
      const match = updated.find((p) => p.symbol === activePair.symbol);
      if (match) {
        setActivePair((prev) => ({ ...prev, ...match }));
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 5000);
    return () => clearInterval(interval);
  }, [activePair.symbol]);

  // Load Full Multi-Timeframe Data (250 candles, no activePair.price in deps)
  const loadMarketData = useCallback(async (targetPair?: PairItem) => {
    try {
      setIsInitialLoading(true);
      const pair = targetPair || activePair;
      const currentSymbol = pair.symbol;

      // Parallel MTF fetches with 250 lookback depth across matrix + active timeframe
      const isCustomTf = !['15m', '1h', '4h', '1d'].includes(selectedTf);
      const activeTfFetch = isCustomTf
        ? fetchKlines(currentSymbol, selectedTf, 250)
        : Promise.resolve<KlineData[] | null>(null);

      const [data15m, data1h, data4h, data1d, customActiveData, funding, oiDelta] =
        await Promise.all([
          fetchKlines(currentSymbol, '15m', 250),
          fetchKlines(currentSymbol, '1h', 250),
          fetchKlines(currentSymbol, '4h', 250),
          fetchKlines(currentSymbol, '1d', 250),
          activeTfFetch,
          fetchFundingRate(currentSymbol),
          fetch4hOIDelta(currentSymbol),
        ]);

      // Active timeframe klines for chart
      const activeKlines =
        customActiveData && customActiveData.length > 0
          ? customActiveData
          : selectedTf === '15m'
          ? data15m
          : selectedTf === '4h'
          ? data4h
          : selectedTf === '1d'
          ? data1d
          : data1h;

      setKlines(activeKlines);
      latestKlinesRef.current = activeKlines;

      // Grade any open/pending paper trades against newly fetched historical candles
      const graded = gradeOpenTradesWithKlines(loadPaperTrades(), currentSymbol, activeKlines);
      if (graded.closedCount > 0) {
        setPaperTradesList(graded.updatedTrades);
      }

      // Derive current price from latest fetched klines close
      const currentPrice =
        activeKlines[activeKlines.length - 1]?.close ||
        data15m[data15m.length - 1]?.close ||
        pair.price;

      // Parallel options, depth orderbook liquidity, and Spot-vs-Perp CVD divergence fetching
      const [options, depthLiq, spotPerp] = await Promise.all([
        fetchOptionsSummary(currentSymbol, currentPrice),
        fetchOrderbookLiquidity(currentSymbol, currentPrice),
        fetchSpotVsPerpDivergence(currentSymbol, selectedTf, activeKlines),
      ]);
      setSpotPerpDivergence(spotPerp);

      // Calculate S/R from fractal pivot highs/lows
      const sr = calculateSupportResistance(activeKlines);
      const currentLiq: LiquidityLevels = {
        srHigh: sr.srHigh,
        srLow: sr.srLow,
        askLiquidityPrice: depthLiq.askLiquidityPrice,
        askLiquidityQty: depthLiq.askLiquidityQty,
        bidLiquidityPrice: depthLiq.bidLiquidityPrice,
        bidLiquidityQty: depthLiq.bidLiquidityQty,
      };
      setLiquidity(currentLiq);

      // Session vs VRVP Volume Profile calculation
      const sessionBars =
        selectedTf === '5m'
          ? 288
          : selectedTf === '15m'
          ? 96
          : selectedTf === '30m'
          ? 48
          : selectedTf === '1h'
          ? 24
          : selectedTf === '2h'
          ? 12
          : selectedTf === '4h'
          ? 6
          : selectedTf === '12h'
          ? 2
          : selectedTf === '1d'
          ? 30
          : 52;

      const vp = calculateVolumeProfile(
        activeKlines,
        vpMode,
        vpMode === 'session' ? sessionBars : 60
      );
      setVolumeProfile(vp);

      // Order Blocks on active timeframe
      const obs = calculateOrderBlocks(activeKlines, obMode);
      setBullOB(obs.bullOB);
      setBearOB(obs.bearOB);

      // Options Data
      setOptionsData(options);

      // 50-VWMA and Regime-Gated Z-Score
      const { vwma50, zScore, zScoreBias, marketRegime } = calculateVWMAAndZScore(activeKlines);

      // CVD and RSI Divergence
      const { rsi14, cvdDelta, divergenceBias } = calculateCVDAndDivergence(activeKlines);

      // Session-Normalized RVOL
      const sessionRvolInfo = calculateSessionNormalizedRVOL(activeKlines);

      // Assemble Telemetry
      const fundingBias =
        funding.fundingRate >= 0.0003
          ? 'Crowded Longs'
          : funding.fundingRate <= -0.0002
          ? 'Crowded Shorts'
          : 'Neutral';

      const oiBias =
        oiDelta.oi4hDeltaPct > 0 && oiDelta.price4hDeltaPct >= 0
          ? 'Long Build'
          : oiDelta.oi4hDeltaPct > 0 && oiDelta.price4hDeltaPct < 0
          ? 'Short Build'
          : oiDelta.oi4hDeltaPct < 0 && oiDelta.price4hDeltaPct >= 0
          ? 'Short Cover'
          : 'Long Squeeze';

      // Rolling Sharpe & Sortino Ratio
      const sharpe = calculateSharpeAndSortino(activeKlines, selectedTf);

      const updatedTelemetry: TelemetryMetrics = {
        fundingRate: funding.fundingRate,
        fundingAnnualized: funding.fundingAnnPct,
        fundingCountdown: funding.countdown,
        fundingBias,
        oi4hDelta: oiDelta.oi4hDeltaPct,
        price4hDelta: oiDelta.price4hDeltaPct,
        oiBias,
        zScore,
        vwma50,
        zScoreBias,
        rsi14,
        cvdDelta,
        divergenceBias,
        netGex: options.netGex,
        gexExpiry: `${options.expiryHours}h to 08:00 UTC Expiry`,
        gexBias: options.netGex >= 0 ? '+GEX (Pinning / Mean-Rev)' : '-GEX (Volatile / Expansion)',
        pcRatio: options.pcRatio,
        skew25d: options.skew25d,
        skewBias: options.pcRatio < 0.75 ? 'Upside Speculation' : 'Downside Hedging',
        sharpeRatio: sharpe.sharpeRatio,
        sortinoRatio: sharpe.sortinoRatio,
        returnEfficiency: sharpe.returnEfficiency,
        sharpeRegime: sharpe.sharpeRegime,
        sharpeSortino: sharpe,
        hurstExponent: marketRegime?.hurstExponent,
        adx14: marketRegime?.adx14,
        volPercentile: marketRegime?.volPercentile,
        marketRegime,
        spotCvdDelta: spotPerp.spotCvd20,
        spotPerpDivergence: spotPerp,
        basisBps: spotPerp.basisBps,
        sessionRvol: sessionRvolInfo.sessionRvol,
        sessionName: sessionRvolInfo.sessionName,
        zeroGammaLevel: options.zeroGammaLevel,
      };
      setTelemetry(updatedTelemetry);

      // Generate MTF Matrix & Confluence
      const { matrix: mtfRows, confluence: conf } = generateMTFMatrix(
        data15m,
        data1h,
        data4h,
        data1d,
        currentPrice,
        options
      );
      setMatrix(mtfRows);
      setConfluence(conf);

      // Analyze Institutional AMD Phase (Accumulation / Manipulation / Distribution / Expansion)
      const amdResult = analyzeAMDPhase(
        activeKlines,
        vp,
        obs.bullOB,
        obs.bearOB,
        options,
        updatedTelemetry,
        currentLiq
      );
      setAmdPhase(amdResult);
    } catch (err) {
      console.warn('Error loading quant market data:', err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [activePair.symbol, selectedTf, obMode, vpMode]);

  // Run loadMarketData ONLY when symbol, tf, obMode, or vpMode changes in terminal view
  useEffect(() => {
    if (viewMode === 'terminal') {
      loadMarketData();
      const refreshInterval = setInterval(loadMarketData, 60000);
      return () => clearInterval(refreshInterval);
    }
  }, [loadMarketData, viewMode]);

  // Dynamic VRVP on chart Pan / Zoom
  const handleVisibleKlinesChange = useCallback(
    (visibleSlice: KlineData[]) => {
      if (vpMode === 'vrvp' && visibleSlice.length >= 5) {
        const vp = calculateVolumeProfile(visibleSlice, 'vrvp', 60);
        setVolumeProfile((prev) => {
          if (
            Math.abs(prev.poc - vp.poc) <= 1e-6 &&
            Math.abs(prev.vah - vp.vah) <= 1e-6 &&
            Math.abs(prev.val - vp.val) <= 1e-6
          ) {
            return prev;
          }
          return vp;
        });
      }
    },
    [vpMode]
  );

  // FIX 1: Safe Live WebSocket Tick Streaming (active in terminal mode)
  useEffect(() => {
    if (viewMode !== 'terminal') return;

    if (!socketRef.current) {
      socketRef.current = new BinanceKlineSocket();
    }

    setIsStreaming(true);
    const initialCvd =
      latestKlinesRef.current.length > 0
        ? latestKlinesRef.current[latestKlinesRef.current.length - 1]?.cvd || 0
        : 0;
    socketRef.current.connect(
      activePair.symbol,
      selectedTf,
      (tickCandle) => {
        // Auto-evaluate PENDING (Maker Limit) and OPEN paper trades on live ticks
        setPaperTradesList((prev) => {
          const hasActive = prev.some(
            (t) => (t.status === 'OPEN' || t.status === 'PENDING') && t.symbol === activePair.symbol
          );
          if (!hasActive) return prev;
          let stateChanged = false;
          const evaluated = prev.map((trade) => {
            if (
              (trade.status !== 'OPEN' && trade.status !== 'PENDING') ||
              trade.symbol !== activePair.symbol
            ) {
              return trade;
            }
            const prevStatus = trade.status;
            const res = evaluateOpenTrade(
              trade,
              tickCandle.high,
              tickCandle.low,
              tickCandle.close,
              Date.now()
            );
            if (res.status !== prevStatus) {
              stateChanged = true;
              if (prevStatus === 'PENDING' && res.status === 'OPEN') {
                showToast(`⚡ LIMIT ORDER FILLED: ${trade.symbol} ${trade.direction} @ $${res.filledEntryPrice}`);
              } else if (res.status !== 'OPEN') {
                showToast(`🔔 PAPER TRADE RESOLVED: ${trade.symbol} ${res.status} (${res.exitReason})`);
              }
            }
            return res;
          });
          if (stateChanged) {
            savePaperTrades(evaluated);
          }
          return evaluated;
        });

        const tickTime =
          tickCandle.time > 1e11 ? Math.floor(tickCandle.time / 1000) : Math.floor(tickCandle.time);
        const nowMs = performance.now();
        const isNewBar = tickTime !== lastWsBarTimeRef.current;

        if (!isNewBar && nowMs - lastWsStateUpdateRef.current < 400) {
          return;
        }
        lastWsStateUpdateRef.current = nowMs;
        lastWsBarTimeRef.current = tickTime;

        setKlines((prev) => {
          if (prev.length < 20) return prev; // NEVER overwrite or append until the 250 historical REST candles are loaded!
          const last = prev[prev.length - 1];
          const lastTime = last.time > 1e11 ? Math.floor(last.time / 1000) : Math.floor(last.time);
          const prevClosedCvd = prev.length >= 2 ? prev[prev.length - 2].cvd ?? 0 : 0;
          const computedCvd =
            tickCandle.cvd !== undefined
              ? tickCandle.cvd
              : tickTime === lastTime
              ? prevClosedCvd + (tickCandle.barDelta ?? 0)
              : (last.cvd ?? 0) + (tickCandle.barDelta ?? 0);

          const normalizedTick: KlineData = {
            ...tickCandle,
            time: tickTime,
            cvd: computedCvd,
          };

          if (tickTime === lastTime) {
            const copy = [...prev];
            copy[copy.length - 1] = normalizedTick;
            return copy;
          } else if (tickTime > lastTime && tickTime - lastTime <= 86400 * 14) {
            return [...prev.slice(1), normalizedTick];
          }
          return prev;
        });

        // Update active pair price smoothly
        setActivePair((prev) => ({
          ...prev,
          price: tickCandle.close,
        }));
      },
      undefined,
      initialCvd
    );

    return () => {
      socketRef.current?.disconnect();
      setIsStreaming(false);
    };
  }, [activePair.symbol, selectedTf, viewMode, showToast]);

  // Handle Ticker Selection from Launchpad Screen
  const handleSelectPairFromLaunchpad = async (pair: PairItem) => {
    setKlines([]);
    setIsInitialLoading(true);
    setActivePair(pair);
    setViewMode('terminal');

    // Pre-populate execution calculator with sensible offsets for the selected coin
    const estEntry = Math.round(pair.price * 0.99 * 100) / 100;
    const estStop = Math.round(pair.price * 0.978 * 100) / 100;
    setEntryPrice(estEntry);
    setStopLoss(estStop);
    showToast(`LAUNCHING TERMINAL: ${pair.symbol}`);

    await loadMarketData(pair);
  };

  // Handle Ticker Selection inside Terminal
  const handleSelectPair = async (symbol: string) => {
    const pool = allPairs.length > 0 ? allPairs : topPairs;
    const pair = pool.find((p) => p.symbol === symbol) || topPairs.find((p) => p.symbol === symbol);
    if (!pair) return;

    setKlines([]);
    setIsInitialLoading(true);
    setActivePair(pair);
    setSearchQuery('');

    // Pre-populate execution calculator with sensible offsets for the selected coin
    const estEntry = Math.round(pair.price * 0.99 * 100) / 100;
    const estStop = Math.round(pair.price * 0.978 * 100) / 100;
    setEntryPrice(estEntry);
    setStopLoss(estStop);
    showToast(`ACTIVE ASSET: ${pair.symbol}`);

    await loadMarketData(pair);
  };

  // Deterministic Local Quant Synthesis Fallback
  const generateLocalQuantBrief = useCallback((): SpeculationBriefType => {
    const symbolClean = activePair.symbol.replace('USDT', '');
    const pocVal = Math.round(volumeProfile.poc);
    const maxPainVal = Math.round(optionsData.maxPain);
    const entryVal = bullOB ? Math.round(bullOB.midpoint * 100) / 100 : Math.round(volumeProfile.val * 100) / 100;
    const stopVal = bullOB
      ? Math.round(bullOB.low * 0.995 * 100) / 100
      : Math.round((optionsData.putWall || activePair.price * 0.98) * 100) / 100;

    const confScore = confluence.score || 82;
    const biasWord = confluence.bias.includes('BULL') ? 'Bullish' : confluence.bias.includes('BEAR') ? 'Bearish' : 'Neutral';

    return {
      confidence: `${confScore}% ${biasWord} confluence across 1H/4H timeframes. ${symbolClean} holds cleanly above the High Volume Node ($${pocVal.toLocaleString()} POC) with ${telemetry.gexBias} positioning actively damping volatility toward the $${maxPainVal.toLocaleString()} Max Pain strike.`,
      zone: `Key reaction demand zone: $${Math.round(bullOB?.low || volumeProfile.val).toLocaleString()} – $${Math.round(bullOB?.high || volumeProfile.poc).toLocaleString()} (1H Bullish Order Block + Value Area Low confluence overlap).`,
      trap: `Perp open interest shifted ${telemetry.oi4hDelta >= 0 ? '+' : ''}${telemetry.oi4hDelta.toFixed(2)}% with ${telemetry.divergenceBias.toLowerCase()} while spot delta remains flat; dealer gamma will aggressively squeeze short scalpers if $${Math.round(optionsData.callWall || activePair.price * 1.015).toLocaleString()} breaks with volume.`,
      invalidation: `Daily candle-close below $${Math.round(stopVal).toLocaleString()} (invalidates 4H market structure shift & deeply penetrates Value Area Low).`,
      suggestedEntry: entryVal,
      suggestedStop: stopVal,
    };
  }, [activePair, volumeProfile, optionsData, bullOB, confluence, telemetry]);

  // Run Quant AI Synthesis (Gemini 2.5 Flash via /api/run-quant with direct client fallback)
  const handleRunQuant = async () => {
    setIsBriefLoading(true);
    showToast('SYNTHESIZING LIVE DERIVATIVES TELEMETRY...');

    try {
      const payload = {
        symbol: activePair.symbol,
        price: activePair.price,
        telemetry,
        mtfMatrix: matrix,
        levels: {
          poc: volumeProfile.poc,
          vah: volumeProfile.vah,
          val: volumeProfile.val,
          bullObLow: bullOB?.low,
          bullObHigh: bullOB?.high,
          bearObLow: bearOB?.low,
          bearObHigh: bearOB?.high,
          maxPain: optionsData.maxPain,
          callWall: optionsData.callWall,
          putWall: optionsData.putWall,
        },
      };

      const res = await fetch('/api/run-quant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.confidence && data.zone) {
        setBrief({
          confidence: data.confidence,
          zone: data.zone,
          trap: data.trap,
          invalidation: data.invalidation,
          suggestedEntry: data.suggestedEntry || entryPrice,
          suggestedStop: data.suggestedStop || stopLoss,
        });

        if (data.suggestedEntry && data.suggestedStop) {
          setEntryPrice(data.suggestedEntry);
          setStopLoss(data.suggestedStop);
        }

        if (data.confluencePercent) {
          setConfluence((prev) => ({
            ...prev,
            score: data.confluencePercent,
            bias:
              data.confluencePercent >= 65
                ? 'BULL BIAS (EXPANSION)'
                : data.confluencePercent <= 35
                ? 'BEAR BIAS (BREAKDOWN)'
                : 'RANGE ROTATION',
          }));
        }

        showToast(`QUANT SYNTHESIS COMPLETE: ${data.confluencePercent || 82}% CONFLUENCE`);
        return;
      }

      throw new Error('Malformed AI response');
    } catch (err: any) {
      console.warn('Backend run-quant failed, using deterministic local engine fallback:', err);
      const fallbackBrief = generateLocalQuantBrief();
      setBrief(fallbackBrief);
      setEntryPrice(fallbackBrief.suggestedEntry);
      setStopLoss(fallbackBrief.suggestedStop);
      showToast(`QUANT ENGINE SYNCED: ${confluence.score}% CONFLUENCE`);
    } finally {
      setIsBriefLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#10131a] text-[#e1e2eb] font-sans select-none pb-24 lg:pb-10">
      {viewMode === 'selector' ? (
        <AssetSelectorScreen
          pairs={allPairs.length > 0 ? allPairs : topPairs}
          isLoading={isCatalogLoading}
          onSelectPair={handleSelectPairFromLaunchpad}
          activeSymbol={activePair.symbol}
          pingMs={pingMs}
        />
      ) : (
        <>
          {/* 1. Single Top Navigation Header with prominent SWITCH ASSET button, Journal & Glossary */}
          <Header
            topPairs={topPairs}
            activePair={activePair}
            pingMs={pingMs}
            onSelectPair={handleSelectPair}
            onSwitchAsset={() => setViewMode('selector')}
            installPrompt={installPrompt}
            onInstallPwa={handleInstallPwa}
            experienceMode={experienceMode}
            onToggleExperienceMode={(mode) => {
              setExperienceMode(mode);
              showToast(
                mode === 'rookie'
                  ? '🎓 ROOKIE GUIDE MODE: PLAIN-ENGLISH TAKEAWAYS ACTIVE'
                  : '⚡ PRO TERMINAL MODE: HIGH-DENSITY VIEW ACTIVE'
              );
            }}
            onOpenGlossary={() => setShowGlossaryModal(true)}
            onOpenJournal={() => setShowJournalModal(true)}
            activeJournalTradesCount={openTradesCount}
            obMode={obMode}
            onToggleObMode={(mode) => {
              setObMode(mode);
              showToast(`OB SENSITIVITY: ${mode.toUpperCase()}`);
            }}
            vpMode={vpMode}
            onToggleVpMode={(mode) => {
              setVpMode(mode);
              showToast(`VP PROFILE: ${mode.toUpperCase()}`);
            }}
          />

          {/* Main Full-Viewport Cyber-Brutalist Split-Screen Workstation */}
          <main className="flex flex-col w-full pt-12 sm:pt-14 pb-24 lg:pb-0 flex-1 max-w-[1920px] mx-auto border-x border-[#1e2433]">
            {/* Full-Width Active Asset Command & Ticker Strip */}
            <div className="w-full border-b border-[#1e2433] bg-[#0b0e14]">
              <TickerBar
                activePair={activePair}
                topPairs={topPairs}
                allPairs={allPairs}
                selectedTf={selectedTf}
                obMode={obMode}
                vpMode={vpMode}
                sharpeSortino={sharpeSortino}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectPair={handleSelectPair}
                onSelectTf={(tf) => {
                  setSelectedTf(tf);
                  showToast(`TIMEFRAME: ${tf.toUpperCase()}`);
                }}
                onToggleObMode={(mode) => {
                  setObMode(mode);
                  showToast(`OB SENSITIVITY: ${mode.toUpperCase()}`);
                }}
                onToggleVpMode={(mode) => {
                  setVpMode(mode);
                  showToast(`VP PROFILE: ${mode.toUpperCase()}`);
                }}
              />
            </div>

            {/* Live ASCII Radar Telemetry Strip (Directly above main Chart & Strategy Workspace) */}
            <AsciiRadarHeader
              symbol={activePair.symbol}
              regime={candlestickResult.marketRegime?.regime || confluence.regime}
              rvol={telemetry.sessionRvol || 1.0}
              cvdDelta={telemetry.cvdDelta}
              isStreaming={isStreaming}
              volumeSeries={klines.slice(-10).map((k) => k.volume)}
              trackedLevel={highlightedLevel}
              onClearTrackedLevel={() => setHighlightedLevel(null)}
              onJumpToChart={() => handleNavigateMobilePage('CHART')}
            />

            {/* Main 12-Column Split Cockpit */}
            <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#1e2433] items-start">
              {/* LEFT PANE — LIVE CHART & ACTIONABILITY COCKPIT (Sticky on Desktop; Page-Gated on Mobile) */}
              <div
                className={`${
                  mobilePage === 'CHART' || mobilePage === 'RADAR' ? 'flex' : 'hidden'
                } lg:flex lg:col-span-7 xl:col-span-7 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto no-scrollbar border-b lg:border-b-0 lg:border-r border-[#1e2433] bg-[#0b0e14] flex-col`}
              >
                {/* Brutalist Left Pane Header Bar (Desktop + Mobile Chart Page) */}
                <div
                  className={`${
                    mobilePage === 'CHART' ? 'flex' : 'hidden'
                  } lg:flex items-center justify-between px-3 py-1.5 bg-[#10131a] border-b border-[#1e2433] font-mono text-[10px]`}
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/40 font-bold tracking-wider">
                      VEC_01
                    </span>
                    <span className="text-[#e1e2eb] font-bold uppercase tracking-wider truncate">
                      LIVE CHART &amp; ORDERFLOW COCKPIT
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#849495] tabular-nums shrink-0">
                    <span>{activePair.symbol}</span>
                    <span>•</span>
                    <span className="text-[#00f0ff] font-bold">{selectedTf.toUpperCase()}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className={`hidden sm:inline ${showSetupOnChart ? 'text-[#4edea3]' : 'text-[#849495]'}`}>
                      R:R BOX {showSetupOnChart ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </div>
                </div>

                {/* Floating Structural Overlays & Chart Canvas (Shown on Desktop & Mobile CHART page) */}
                <div
                  className={`${
                    mobilePage === 'CHART' ? 'flex' : 'hidden'
                  } lg:flex flex-col bg-[#0b0e14] px-2 sm:px-3 py-1.5 sm:py-2 gap-1.5 sm:gap-2 border-b border-[#1e2433]`}
                >
                  {/* Desktop FloatingLevels Row (On mobile, rendered inside QuantChart toggleable HUD overlay) */}
                  <div className="hidden lg:block">
                    <FloatingLevels
                      vp={volumeProfile}
                      bullOB={bullOB}
                      bearOB={bearOB}
                      options={optionsData}
                      liquidity={liquidity}
                      symbol={activePair.symbol}
                      currentPrice={activePair.price}
                      onHoverLevel={setHighlightedLevel}
                      highlightedLevel={highlightedLevel}
                      activeLayers={chartLayers}
                    />
                  </div>

                  {isInitialLoading || klines.length === 0 ? (
                    <div className="w-full h-[calc(100dvh-14.5rem)] min-h-[360px] sm:h-[440px] lg:h-[460px] rounded-none bg-[#0b0e14] border border-[#1e2433] flex flex-col items-center justify-center gap-3">
                      <div className="w-9 h-9 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin"></div>
                      <div className="font-mono text-[13px] text-[#00f0ff] font-bold tracking-wider">
                        ● INITIALIZING {activePair.symbol} QUANT ENGINE ({selectedTf.toUpperCase()})...
                      </div>
                      <div className="font-mono text-[10px] text-[#849495]">
                        Fetching 250 klines &amp; computing Volume Profile, Order Blocks &amp; 5 Strategy Lenses
                      </div>
                    </div>
                  ) : (
                    <QuantChart
                      key={`${activePair.symbol}_${selectedTf}`}
                      klines={klines}
                      symbol={activePair.symbol}
                      timeframe={selectedTf}
                      volumeProfile={volumeProfile}
                      bullOB={bullOB}
                      bearOB={bearOB}
                      optionsData={optionsData}
                      liquidity={liquidity}
                      isStreaming={isStreaming}
                      onVisibleKlinesChange={handleVisibleKlinesChange}
                      entryPrice={entryPrice}
                      stopLoss={stopLoss}
                      tp1Price={calcResult.target1Price}
                      showSetupOnChart={showSetupOnChart}
                      onToggleSetupOnChart={(next) => {
                        setShowSetupOnChart(next);
                        showToast(`CHART R:R PROJECTION BOX: ${next ? 'ON' : 'OFF'}`);
                      }}
                      highlightedLevel={highlightedLevel}
                      activeLayers={chartLayers}
                      onLayersChange={setChartLayers}
                      activeStrategyTab={activeStrategyTab}
                      floatingLevelsNode={
                        <FloatingLevels
                          vp={volumeProfile}
                          bullOB={bullOB}
                          bearOB={bearOB}
                          options={optionsData}
                          liquidity={liquidity}
                          symbol={activePair.symbol}
                          currentPrice={activePair.price}
                          onHoverLevel={setHighlightedLevel}
                          highlightedLevel={highlightedLevel}
                          activeLayers={chartLayers}
                        />
                      }
                    />
                  )}

                  {/* Compact 1-Line Mobile Verdict Bar on Chart Page (Jumps to RADAR or LENSES) */}
                  <div className="flex lg:hidden items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#141821] border border-[#272a31] font-mono text-[10px]">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          confluence.score >= 65
                            ? 'bg-[#4edea3]'
                            : confluence.score <= 35
                            ? 'bg-[#f43f5e]'
                            : 'bg-[#f59e0b]'
                        }`}
                      />
                      <span className="text-[#dbfcff] font-bold truncate">
                        {confluence.score}% {confluence.bias}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleNavigateMobilePage('RADAR')}
                        className="px-2 py-1 rounded bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/40 font-bold text-[9px] cursor-pointer"
                      >
                        RADAR →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNavigateMobilePage('LENSES')}
                        className="px-2 py-1 rounded bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/40 font-bold text-[9px] cursor-pointer"
                      >
                        5 LENSES →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Market Actionability Traffic Light Banner & Rookie Workflow (Desktop + Mobile RADAR Page) */}
                <div className={`${mobilePage === 'RADAR' ? 'block' : 'hidden'} lg:block`}>
                  <TrafficLightBanner
                    symbol={activePair.symbol}
                    currentPrice={activePair.price}
                    klines={klines}
                    volumeProfile={volumeProfile}
                    bullOB={bullOB}
                    bearOB={bearOB}
                    optionsData={optionsData}
                    liquidity={liquidity}
                    candlestickResult={candlestickResult}
                    maResult={maResult}
                    amdPhase={amdPhase}
                    telemetry={telemetry}
                    confluence={confluence}
                    sharpeSortino={sharpeSortino}
                    lensSetups={lensSetups}
                    experienceMode={experienceMode}
                    showGlossaryModal={showGlossaryModal}
                    onToggleGlossaryModal={setShowGlossaryModal}
                    onDeconstructSignal={() => {
                      setExternalDeckRequest({ deck: 'REVERSE_ACADEMY', ts: Date.now() });
                      setMobilePage('ACADEMY');
                      showToast(`🔬 REVERSE SIGNAL X-RAY OPENED FOR ${activePair.symbol} (SYS.04)`);
                    }}
                  />
                </div>
              </div>

              {/* RIGHT PANE — MODULAR TACTICAL COMMAND DECK (Always visible on Desktop; visible on Mobile RADAR, LENSES, EXECUTE, ACADEMY pages) */}
              <div
                className={`${
                  mobilePage !== 'CHART' ? 'flex' : 'hidden'
                } lg:flex lg:col-span-5 xl:col-span-5 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto bg-[#10131a] flex-col`}
              >
                <StrategyTabs
                  currentPrice={activePair.price}
                  baseAsset={activePair.baseAsset}
                  activeSymbol={activePair.symbol}
                  klines={klines}
                  volumeProfile={volumeProfile}
                  bullOB={bullOB}
                  bearOB={bearOB}
                  optionsData={optionsData}
                  liquidity={liquidity}
                  telemetry={telemetry}
                  matrix={matrix}
                  confluence={confluence}
                  amdPhase={amdPhase}
                  brief={brief}
                  isBriefLoading={isBriefLoading}
                  onRunQuant={handleRunQuant}
                  calcResult={calcResult}
                  onRiskChange={(r) => {
                    setRiskUsdt(r);
                    setCalcResult(calculateExecution(r, entryPrice, stopLoss));
                  }}
                  onEntryChange={(e) => {
                    setEntryPrice(e);
                    setCalcResult(calculateExecution(riskUsdt, e, stopLoss));
                  }}
                  onStopChange={(s) => {
                    setStopLoss(s);
                    setCalcResult(calculateExecution(riskUsdt, entryPrice, s));
                  }}
                  onCopyText={handleCopyText}
                  onLoadSetup={handleLoadSetup}
                  candlestickResult={candlestickResult}
                  maResult={maResult}
                  lensSetups={lensSetups}
                  sharpeSortino={sharpeSortino}
                  experienceMode={experienceMode}
                  activeTab={activeStrategyTab}
                  onTabChange={setActiveStrategyTab}
                  externalDeckRequest={externalDeckRequest}
                  onNavigateMobilePage={handleNavigateMobilePage}
                  onHoverLevel={(lvl) => {
                    setHighlightedLevel(lvl);
                    if (lvl) {
                      showToast(`🎯 TRACKING ON CHART: ${lvl.label} ($${lvl.price.toLocaleString()})`);
                    }
                  }}
                  highlightedLevel={highlightedLevel}
                  paperTrades={paperTradesList as any}
                  onAddPaperTrade={(trade) => {
                    const isLimitOrder =
                      activePair.price > 0 &&
                      Math.abs(trade.entryPrice - activePair.price) / activePair.price > 0.002;
                    const orderType = (trade as any).orderType || (isLimitOrder ? 'MAKER_LIMIT' : 'TAKER_MARKET');
                    const initialStatus = orderType === 'MAKER_LIMIT' && isLimitOrder ? 'PENDING' : 'OPEN';
                    const logged = addJournalPaperTrade({
                      symbol: trade.symbol,
                      direction: trade.direction,
                      entryPrice: trade.entryPrice,
                      stopLoss: trade.stopLoss,
                      tp1Price: trade.tp1Price,
                      riskUsdt: trade.riskUsdt,
                      positionSizeCoins: trade.positionSizeCoins,
                      orderType,
                      status: initialStatus,
                      timestamp: new Date().toISOString(),
                      strategyLensId: (trade as any).strategyLensId || activeStrategyTab,
                      strategyLensName: (trade as any).strategyLensName || `Tab ${activeStrategyTab}`,
                      confidenceScore: (trade as any).confidenceScore || 75,
                      notes: (trade as any).notes || `Logged from terminal (${orderType})`,
                      telemetrySnapshot: {
                        rsi: telemetry.rsi14,
                        fundingRate: telemetry.fundingRate,
                        oiDelta: telemetry.oi4hDelta,
                        rvol: telemetry.sessionRvol || 1.0,
                        sharpe: sharpeSortino.sharpeRatio,
                        regime: candlestickResult.marketRegime?.regime || 'MEAN_REVERTING',
                        hurst: candlestickResult.marketRegime?.hurstExponent,
                        adx: candlestickResult.marketRegime?.adx14,
                      },
                    });
                    setPaperTradesList(loadPaperTrades());
                    showToast(
                      `📝 ${orderType === 'MAKER_LIMIT' ? 'LIMIT' : 'MARKET'} TRADE LOGGED (${logged.status}): ${logged.symbol} ${logged.direction} @ $${logged.entryPrice}`
                    );
                  }}
                  onRemovePaperTrade={(id) => {
                    const updated = deletePaperTrade(id);
                    setPaperTradesList(updated);
                    showToast('PAPER TRADE REMOVED');
                  }}
                />
              </div>
            </div>
          </main>

          {/* Floating Chamfered 5-Tab Mobile Bottom Dock (< 1024px) */}
          <nav
            aria-label="Mobile Terminal Pages"
            className="lg:hidden fixed bottom-2 left-2 right-2 z-[9999] bg-[#07090e]/95 backdrop-blur-xl border border-[#00f0ff]/35 shadow-[0_8px_32px_rgba(0,0,0,0.9)] grid grid-cols-5 h-14 px-1 pb-[env(safe-area-inset-bottom,4px)]"
          >
            {(
              [
                { id: 'CHART', label: 'CHART', icon: 'candlestick_chart', badge: selectedTf.toUpperCase() },
                { id: 'RADAR', label: 'RADAR', icon: 'radar', badge: `${confluence.score}%` },
                { id: 'LENSES', label: '5 LENSES', icon: 'layers', badge: `T${activeStrategyTab}` },
                { id: 'EXECUTE', label: 'EXECUTE', icon: 'calculate', badge: 'SIZER' },
                { id: 'ACADEMY', label: 'ACADEMY', icon: 'school', badge: 'X-RAY' },
              ] as const
            ).map((item) => {
              const isActive = mobilePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigateMobilePage(item.id)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 font-mono transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#00f0ff] bg-[#141821]'
                      : 'text-[#849495] hover:text-[#e1e2eb]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-2 right-2 h-0.5 bg-[#00f0ff]" />
                  )}
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                    <span
                      className={`text-[8px] px-1 font-bold tabular-nums ${
                        isActive
                          ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                          : 'bg-[#191c22] text-[#849495]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Global Status Footer (Hidden on mobile where bottom nav bar is fixed) */}
          <div className="hidden lg:block">
            <Footer latencyMs={pingMs} />
          </div>

          {/* Paper Trade Journal & Strategy Tester Modal */}
          <PaperJournalModal
            isOpen={showJournalModal}
            onClose={() => setShowJournalModal(false)}
            onRefreshTrades={() => setPaperTradesList(loadPaperTrades())}
            onShowToast={showToast}
          />

          {/* Interactive Institutional Jargon & Quant Glossary Modal */}
          <GlossaryModal
            isOpen={showGlossaryModal}
            onClose={() => setShowGlossaryModal(false)}
          />
        </>
      )}

      {/* Clipboard & Notification Toast */}
      <Toast message={toastMessage} />
    </div>
  );
}
