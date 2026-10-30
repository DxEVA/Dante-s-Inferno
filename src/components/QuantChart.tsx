import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  LineStyle,
  CrosshairMode,
} from 'lightweight-charts';
import { KlineData, VolumeProfile, OrderBlock, DeribitOptionsData, LiquidityLevels } from '../types';
import { calculateRVOL, calculateSessionNormalizedRVOL } from '../utils/quantEngine';

export interface ChartLayers {
  vp: boolean;
  ob: boolean;
  sr: boolean;
  bubbles: boolean;
  options: boolean;
  rrBox: boolean;
  ma?: boolean;
}

export const DEFAULT_CHART_LAYERS: ChartLayers = {
  vp: false,
  ob: false,
  sr: true,
  bubbles: false,
  options: false,
  rrBox: false,
  ma: false,
};

interface QuantChartProps {
  klines: KlineData[];
  symbol: string;
  timeframe: string;
  volumeProfile: VolumeProfile;
  bullOB: OrderBlock | null;
  bearOB: OrderBlock | null;
  optionsData: DeribitOptionsData;
  liquidity?: LiquidityLevels;
  isStreaming: boolean;
  onVisibleKlinesChange?: (visibleSlice: KlineData[]) => void;
  entryPrice?: number;
  stopLoss?: number;
  tp1Price?: number;
  showSetupOnChart?: boolean;
  onToggleSetupOnChart?: (next: boolean) => void;
  highlightedLevel?: { label: string; price: number } | null;
  activeStrategyTab?: number;
  activeLayers?: ChartLayers;
  onLayersChange?: (layers: ChartLayers) => void;
  floatingLevelsNode?: React.ReactNode;
}

export const QuantChart: React.FC<QuantChartProps> = ({
  klines,
  symbol,
  timeframe,
  volumeProfile,
  bullOB,
  bearOB,
  optionsData,
  liquidity,
  isStreaming,
  onVisibleKlinesChange,
  entryPrice = 0,
  stopLoss = 0,
  tp1Price = 0,
  showSetupOnChart = true,
  onToggleSetupOnChart,
  highlightedLevel = null,
  activeStrategyTab = 1,
  activeLayers: controlledLayers,
  onLayersChange,
  floatingLevelsNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  // Robust tracking for dataset vs live tick updates to prevent out-of-order crashes
  const lastLoadedKeyRef = useRef<string>('');
  const lastSeriesTimeRef = useRef<number>(0);
  const lastFirstTimeRef = useRef<number>(0);
  const lastCountRef = useRef<number>(0);

  const vpRef = useRef<VolumeProfile>(volumeProfile);
  vpRef.current = volumeProfile;
  const bullOBRef = useRef<OrderBlock | null>(bullOB);
  bullOBRef.current = bullOB;
  const bearOBRef = useRef<OrderBlock | null>(bearOB);
  bearOBRef.current = bearOB;
  const liquidityRef = useRef<LiquidityLevels | undefined>(liquidity);
  liquidityRef.current = liquidity;
  const optionsRef = useRef<DeribitOptionsData>(optionsData);
  optionsRef.current = optionsData;

  const klinesRef = useRef<KlineData[]>(klines);
  klinesRef.current = klines;

  const onVisibleKlinesChangeRef = useRef(onVisibleKlinesChange);
  onVisibleKlinesChangeRef.current = onVisibleKlinesChange;

  const debounceTimerRef = useRef<any>(null);

  // Indicator Layers State & Ref (layersRef ensures toggling never triggers chart.remove())
  const [internalLayers, setInternalLayers] = useState<ChartLayers>(DEFAULT_CHART_LAYERS);
  const layers = controlledLayers || internalLayers;
  const layersRef = useRef<ChartLayers>(layers);
  layersRef.current = layers;

  const [autoSyncTab, setAutoSyncTab] = useState<boolean>(true);
  const [manualOptionsOverride, setManualOptionsOverride] = useState<boolean>(false);
  const manualOptionsOverrideRef = useRef<boolean>(false);
  manualOptionsOverrideRef.current = manualOptionsOverride;
  const [mobileHudMode, setMobileHudMode] = useState<'NONE' | 'LEVELS' | 'LAYERS'>('NONE');

  const activeStrategyTabRef = useRef<number>(activeStrategyTab);
  activeStrategyTabRef.current = activeStrategyTab;

  // Store R:R box and highlighted level in refs so updates never recreate chart instance
  const setupBoxRef = useRef({
    entryPrice,
    stopLoss,
    tp1Price,
    showSetupOnChart,
  });
  setupBoxRef.current = {
    entryPrice,
    stopLoss,
    tp1Price,
    showSetupOnChart,
  };

  const highlightRef = useRef<{ label: string; price: number } | null>(highlightedLevel);
  highlightRef.current = highlightedLevel;

  const [volMetrics, setVolMetrics] = useState({
    totalVol: '142.8K',
    ma20: '128.4K',
    rvol: 1.0,
    sessionRvol: 1.0,
    sessionName: 'NY_OVERLAP',
    barDeltaStr: '+0.0',
    barDeltaPositive: true,
    rvolStatus: 'NORMAL FLOW',
  });

  const getPricePrecision = (price: number) => {
    const p = Math.abs(price) || 1;
    if (p < 0.001) return { precision: 7, minMove: 0.0000001 };
    if (p < 0.1) return { precision: 5, minMove: 0.00001 };
    if (p < 10) return { precision: 4, minMove: 0.0001 };
    if (p < 1000) return { precision: 2, minMove: 0.01 };
    return { precision: 1, minMove: 0.1 };
  };

  const formatPrice = (p: number) => {
    if (!p) return '0';
    if (p < 0.001) return p.toFixed(7);
    if (p < 0.1) return p.toFixed(5);
    if (p < 10) return p.toFixed(4);
    if (p < 1000) return p.toFixed(2);
    return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const formatCompactVolume = (val: number) => {
    const abs = Math.abs(val);
    const sign = val >= 0 ? '+' : '-';
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}k`;
    if (abs >= 10) return `${sign}${Math.round(abs)}`;
    return `${sign}${abs.toFixed(1)}`;
  };

  const lastVolMetricsUpdateRef = useRef<number>(0);

  // Pre-calculate 20-bar rolling delta statistics map in O(N) to ensure 60 FPS canvas overlay rendering
  const deltaStatsMap = React.useMemo(() => {
    const map = new Map<
      number,
      { meanAbs: number; stdAbs: number; deltaSigma: number; absDelta: number; netDelta: number }
    >();
    if (!klines || klines.length === 0) return map;

    const absDeltas: number[] = [];
    const netDeltas: number[] = [];
    for (let i = 0; i < klines.length; i++) {
      const k = klines[i];
      const buyVol = k.takerBuyVolume ?? k.volume * 0.5;
      const sellVol = k.takerSellVolume ?? Math.max(0, k.volume - buyVol);
      const d = k.barDelta !== undefined ? k.barDelta : buyVol - sellVol;
      netDeltas.push(d);
      absDeltas.push(Math.abs(d));
    }

    let windowSum = 0;
    for (let i = 0; i < klines.length; i++) {
      windowSum += absDeltas[i];
      if (i >= 20) windowSum -= absDeltas[i - 20];
      const count = Math.min(i + 1, 20);
      const meanAbs = count > 0 ? windowSum / count : 1;

      let sumSq = 0;
      const start = Math.max(0, i - 19);
      for (let j = start; j <= i; j++) {
        sumSq += Math.pow(absDeltas[j] - meanAbs, 2);
      }
      const stdAbs = Math.sqrt(sumSq / Math.max(1, count));
      const absD = absDeltas[i];
      const deltaSigma = stdAbs > 0 ? (absD - meanAbs) / stdAbs : absD / Math.max(1, meanAbs);
      const rawT = klines[i].time;
      const normTime = rawT > 1e11 ? Math.floor(rawT / 1000) : Math.floor(rawT);
      map.set(normTime, {
        meanAbs,
        stdAbs,
        deltaSigma,
        absDelta: absD,
        netDelta: netDeltas[i],
      });
    }
    return map;
  }, [klines]);

  const deltaStatsMapRef = useRef(deltaStatsMap);
  deltaStatsMapRef.current = deltaStatsMap;

  // Pre-calculate EMA 21, EMA 50, EMA 200 & Session VWAP series in O(N) for Stage 03 Trend & MA Overlay
  const maSeriesMap = useMemo(() => {
    const map = new Map<number, { ema21: number; ema50: number; ema200: number; vwap: number }>();
    if (!klines || klines.length === 0) return map;

    const k21 = 2 / (21 + 1);
    const k50 = 2 / (50 + 1);
    const k200 = 2 / (200 + 1);

    let ema21 = klines[0].close;
    let ema50 = klines[0].close;
    let ema200 = klines[0].close;
    let cumTypVol = 0;
    let cumVol = 0;
    const vwapResetWindow = Math.min(klines.length, 48);
    const vwapStartIdx = Math.max(0, klines.length - vwapResetWindow);

    for (let i = 0; i < klines.length; i++) {
      const bar = klines[i];
      const c = bar.close;
      if (i === 0) {
        ema21 = c;
        ema50 = c;
        ema200 = c;
      } else {
        ema21 = c * k21 + ema21 * (1 - k21);
        ema50 = c * k50 + ema50 * (1 - k50);
        ema200 = c * k200 + ema200 * (1 - k200);
      }

      if (i === vwapStartIdx) {
        cumTypVol = 0;
        cumVol = 0;
      }
      const typ = (bar.high + bar.low + bar.close) / 3;
      const v = Math.max(bar.volume, 0.00001);
      cumTypVol += typ * v;
      cumVol += v;
      const vwap = cumVol > 0 ? cumTypVol / cumVol : c;

      const rawT = bar.time;
      const normTime = rawT > 1e11 ? Math.floor(rawT / 1000) : Math.floor(rawT);
      map.set(normTime, { ema21, ema50, ema200, vwap });
    }
    return map;
  }, [klines]);

  const maSeriesMapRef = useRef(maSeriesMap);
  maSeriesMapRef.current = maSeriesMap;

  // Synchronized 60 FPS Canvas Overlay (Bid/Ask Split VP, Mitigated OBs, 2-Sigma Delta Bubbles & Absorption Rings)
  const drawOverlayCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const series = candleSeriesRef.current;
    const chart = chartRef.current;
    if (!canvas || !container || !series || !chart) return;

    const vp = vpRef.current;
    const bullOB = bullOBRef.current;
    const bearOB = bearOBRef.current;
    const currentOptions = optionsRef.current;
    const currentLayers = layersRef.current;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const isMobile = w < 640;

    ctx.clearRect(0, 0, w, h);

    const rootStyles = getComputedStyle(document.documentElement);
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const cssCyan = rootStyles.getPropertyValue('--chart-cyan').trim() || (isLightMode ? '#0284c7' : '#00f0ff');
    const cssEmerald = rootStyles.getPropertyValue('--chart-emerald').trim() || (isLightMode ? '#047857' : '#4edea3');
    const cssCoral = rootStyles.getPropertyValue('--chart-coral').trim() || (isLightMode ? '#b91c1c' : '#ffb4ab');
    const cssAmber = rootStyles.getPropertyValue('--chart-amber').trim() || (isLightMode ? '#b45309' : '#f59e0b');
    const cssPurple = rootStyles.getPropertyValue('--chart-purple').trim() || (isLightMode ? '#6d28d9' : '#c084fc');
    const cssPillBg = rootStyles.getPropertyValue('--chart-pill-bg').trim() || (isLightMode ? 'rgba(255, 255, 255, 0.94)' : 'rgba(11, 14, 20, 0.88)');
    const cssLabelText = rootStyles.getPropertyValue('--chart-label-text').trim() || (isLightMode ? '#0f172a' : '#ffffff');

    const timeScale = chart.timeScale();

    // Helper to render an institutional Order Block (Bullish or Bearish) with live mitigation state
    const drawOrderBlockZone = (ob: OrderBlock, isBull: boolean) => {
      const isInvalidated =
        ob.status === 'INVALIDATED' || ob.mitigationStatus === 'INVALIDATED';
      if (!ob || ob.low <= 0 || ob.high <= 0 || isInvalidated) return;

      const yLow = series.priceToCoordinate(ob.low);
      const yHigh = series.priceToCoordinate(ob.high);
      const yMid = series.priceToCoordinate(ob.midpoint);
      if (yLow === null || yHigh === null) return;

      let startX = 0;
      if (ob.time > 0) {
        const coordTime = ob.time > 1e11 ? Math.floor(ob.time / 1000) : Math.floor(ob.time);
        const timeX = timeScale.timeToCoordinate(coordTime as any);
        if (timeX !== null && Number.isFinite(timeX)) {
          startX = Math.max(0, Math.min(w - 24, timeX));
        }
      }

      const zoneWidth = Math.max(48, w - startX);
      const isPartial =
        (ob.status === 'PARTIAL' || ob.mitigationStatus === 'PARTIAL') &&
        (ob.mitigationPct || 0) > 0;

      // 1a. If partially mitigated, render the original pre-mitigation ghost footprint first
      if (isPartial && ob.originalLow && ob.originalHigh) {
        const yOrigLow = series.priceToCoordinate(ob.originalLow);
        const yOrigHigh = series.priceToCoordinate(ob.originalHigh);
        if (yOrigLow !== null && yOrigHigh !== null) {
          const origTop = Math.min(yOrigLow, yOrigHigh);
          const origHeight = Math.max(Math.abs(yOrigLow - yOrigHigh), 4);
          ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.06)';
          ctx.fillRect(startX, origTop, zoneWidth, origHeight);

          ctx.strokeStyle = isBull ? cssEmerald : cssCoral;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.strokeRect(startX, origTop, zoneWidth, origHeight);
        }
      }

      // 1b. Render active unmitigated Order Block zone
      const top = Math.min(yLow, yHigh);
      const height = Math.max(Math.abs(yLow - yHigh), 6);

      if (isBull) {
        ctx.fillStyle = isPartial ? 'rgba(16, 185, 129, 0.13)' : 'rgba(16, 185, 129, 0.18)';
        ctx.strokeStyle = cssEmerald;
      } else {
        ctx.fillStyle = isPartial ? 'rgba(244, 63, 94, 0.13)' : 'rgba(244, 63, 94, 0.18)';
        ctx.strokeStyle = cssCoral;
      }

      ctx.fillRect(startX, top, zoneWidth, height);

      ctx.lineWidth = isPartial ? 1.25 : 1.5;
      ctx.setLineDash(isPartial ? [6, 3] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, top);
      ctx.lineTo(w, top);
      ctx.moveTo(startX, top + height);
      ctx.lineTo(w, top + height);
      ctx.stroke();

      // 50% Mean Threshold (Institutional Equilibrium)
      if (yMid !== null) {
        ctx.beginPath();
        ctx.strokeStyle = isBull ? cssEmerald : cssCoral;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.moveTo(startX, yMid);
        ctx.lineTo(w, yMid);
        ctx.stroke();
      }

      ctx.setLineDash([]);
      const qScore = ob.qualityScore ?? ob.footprintScore ?? 78;
      const statusText = isPartial
        ? `PARTIAL ${ob.mitigationPct}%`
        : 'UNMITIGATED';
      const fvgBadge = ob.hasFvg ? ' • FVG' : '';
      const prefix = isBull ? '✦ BULL OB' : '✦ BEAR OB';

      const labelText = isMobile
        ? `${prefix} [${isPartial ? `${ob.mitigationPct}% MIT` : 'UNMIT'} • Q:${qScore}] $${formatPrice(ob.midpoint)}`
        : `${prefix} [${statusText} • Q:${qScore}/100${fvgBadge}] 50% MT: $${formatPrice(ob.midpoint)}`;

      const labelX = Math.max(12, startX + 6);
      const labelY = Math.max(14, top + 11);

      // High-contrast pill behind label for legibility
      ctx.font = '700 9px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = cssPillBg;
      ctx.fillRect(labelX - 3, labelY - 9, textWidth + 6, 12);
      if (isLightMode) {
        ctx.strokeStyle = isBull ? cssEmerald : cssCoral;
        ctx.lineWidth = 0.75;
        ctx.strokeRect(labelX - 3, labelY - 9, textWidth + 6, 12);
      }

      ctx.fillStyle = isBull ? cssEmerald : cssCoral;
      ctx.fillText(labelText, labelX, labelY);
    };

    // 1 & 2. Draw Bullish & Bearish Mitigated Order Blocks (Only if OB layer is active)
    if (currentLayers.ob) {
      if (bullOB) drawOrderBlockZone(bullOB, true);
      if (bearOB) drawOrderBlockZone(bearOB, false);
    }

    // 3. Draw Bid/Ask Split Volume Profile Histogram on Left Margin (Only if VP layer is active)
    if (currentLayers.vp && vp && vp.buckets && vp.buckets.length > 0) {
      const maxVol = Math.max(...vp.buckets.map((b) => b.volume), 1);
      const maxVpWidth = isMobile ? Math.min(92, w * 0.2) : Math.min(156, w * 0.23);

      let vahY: number | null = null;
      let valY: number | null = null;

      vp.buckets.forEach((bucket) => {
        const yCoord = series.priceToCoordinate(bucket.price);
        if (yCoord === null) return;

        const bHeight = Math.max(3, Math.min(8, h / vp.buckets.length - 0.5));
        const bTop = yCoord - bHeight / 2;
        const totalWidth = (bucket.volume / maxVol) * maxVpWidth;

        const bidVol = bucket.bidVolume ?? bucket.volume * 0.5;
        const askVol = bucket.askVolume ?? Math.max(0, bucket.volume - bidVol);
        const bidRatio = bucket.volume > 0 ? Math.max(0, Math.min(1, bidVol / bucket.volume)) : 0.5;

        const bidWidth = totalWidth * bidRatio;
        const askWidth = Math.max(0, totalWidth - bidWidth);

        if (bucket.isPOC) {
          // High-contrast POC split bar (Aggressive Sell/Bid on left, Aggressive Buy/Ask on right)
          ctx.fillStyle = 'rgba(244, 63, 94, 0.78)';
          ctx.fillRect(0, bTop, bidWidth, bHeight);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
          ctx.fillRect(bidWidth, bTop, askWidth, bHeight);

          ctx.strokeStyle = cssAmber;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0.5, bTop, Math.max(2, totalWidth), bHeight);

          // POC Net Delta callout pill at the right tip of the POC bar
          if (!isMobile && totalWidth > 20) {
            const pocDelta = bucket.delta ?? askVol - bidVol;
            const pocTag = `POC Δ ${formatCompactVolume(pocDelta)}`;
            ctx.font = '700 8px "JetBrains Mono", monospace';
            const tagW = ctx.measureText(pocTag).width + 6;
            const tagX = Math.min(w - tagW - 60, totalWidth + 4);
            ctx.fillStyle = cssPillBg;
            ctx.fillRect(tagX, bTop - 2, tagW, bHeight + 4);
            ctx.strokeStyle = cssAmber;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(tagX, bTop - 2, tagW, bHeight + 4);
            ctx.fillStyle = pocDelta >= 0 ? cssEmerald : cssCoral;
            ctx.fillText(pocTag, tagX + 3, yCoord + 2.5);
          }
        } else if (bucket.isValueArea) {
          // 70% Gaussian Value Area: vivid Bid (rose) + Ask (emerald/cyan) split
          ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
          ctx.fillRect(0, bTop, bidWidth, bHeight);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.48)';
          ctx.fillRect(bidWidth, bTop, askWidth, bHeight);
        } else {
          // Low-Volume Nodes / Outside Value Area: muted institutional split
          ctx.fillStyle = 'rgba(244, 63, 94, 0.18)';
          ctx.fillRect(0, bTop, bidWidth, bHeight);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.20)';
          ctx.fillRect(bidWidth, bTop, askWidth, bHeight);
        }
      });

      // Draw subtle Value Area vertical bracket on left edge
      if (vp.vah > 0 && vp.val > 0) {
        vahY = series.priceToCoordinate(vp.vah);
        valY = series.priceToCoordinate(vp.val);
        if (vahY !== null && valY !== null) {
          const topVa = Math.min(vahY, valY);
          const botVa = Math.max(vahY, valY);
          ctx.strokeStyle = cssCyan;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(1.5, topVa);
          ctx.lineTo(1.5, botVa);
          ctx.stroke();
        }
      }
    }

    // 3b. Draw Zero-Gamma Flip Regime Band (Only if Options layer is active and native Deribit or manually toggled)
    const shouldDrawOptionsOverlay =
      currentLayers.options &&
      (currentOptions?.isDeribitNative !== false || manualOptionsOverrideRef.current);
    if (shouldDrawOptionsOverlay && currentOptions && currentOptions.zeroGammaLevel && currentOptions.zeroGammaLevel > 0) {
      const yZeroGamma = series.priceToCoordinate(currentOptions.zeroGammaLevel);
      if (yZeroGamma !== null && yZeroGamma >= 10 && yZeroGamma <= h - 20) {
        ctx.fillStyle = isLightMode ? 'rgba(2, 132, 199, 0.08)' : 'rgba(0, 240, 255, 0.07)';
        ctx.fillRect(0, yZeroGamma - 5, w, 10);

        ctx.beginPath();
        ctx.strokeStyle = cssCyan;
        ctx.lineWidth = 1.25;
        ctx.setLineDash([6, 4]);
        ctx.moveTo(0, yZeroGamma);
        ctx.lineTo(w, yZeroGamma);
        ctx.stroke();
        ctx.setLineDash([]);

        if (!isMobile) {
          const zgLabel = `⚡ 0-GAMMA FLIP ($${formatPrice(currentOptions.zeroGammaLevel)})`;
          ctx.font = '700 8px "JetBrains Mono", monospace';
          const zgW = ctx.measureText(zgLabel).width + 8;
          const zgX = Math.max(120, w * 0.36);
          ctx.fillStyle = cssPillBg;
          ctx.fillRect(zgX, yZeroGamma - 11, zgW, 11);
          if (isLightMode) {
            ctx.strokeStyle = cssCyan;
            ctx.lineWidth = 0.75;
            ctx.strokeRect(zgX, yZeroGamma - 11, zgW, 11);
          }
          ctx.fillStyle = cssCyan;
          ctx.fillText(zgLabel, zgX + 4, yZeroGamma - 3);
        }
      }
    }

    // 4. Draw Statistical ±2.0σ Delta Footprint Bubbles & Passive Limit Absorption Rings (Only if Bubbles layer is active)
    const currentKlines = klinesRef.current;
    if (currentLayers.bubbles && currentKlines && currentKlines.length > 0) {
      const visibleRange = timeScale.getVisibleLogicalRange();
      const fromIdx = visibleRange ? Math.max(0, Math.floor(visibleRange.from)) : 0;
      const toIdx = visibleRange ? Math.min(currentKlines.length - 1, Math.ceil(visibleRange.to)) : currentKlines.length - 1;

      for (let i = fromIdx; i <= toIdx; i++) {
        const k = currentKlines[i];
        if (!k) continue;

        const timeCoord = k.time > 1e11 ? Math.floor(k.time / 1000) : Math.floor(k.time);
        const x = timeScale.timeToCoordinate(timeCoord as any);
        if (x === null || x < 0 || x > w) continue;

        const stats = deltaStatsMapRef.current.get(timeCoord);
        const buyVol = k.takerBuyVolume ?? k.volume * 0.5;
        const sellVol = k.takerSellVolume ?? Math.max(0, k.volume - buyVol);
        const netDelta = stats ? stats.netDelta : (k.barDelta !== undefined ? k.barDelta : buyVol - sellVol);
        const absDelta = stats ? stats.absDelta : Math.abs(netDelta);
        const meanAbs = stats ? stats.meanAbs : 1;
        const deltaSigma = stats ? stats.deltaSigma : 0;

        // Passive Limit Absorption Detection (Divergence between aggressive Taker Delta and candle close/wick rejection)
        const range = Math.max(k.high - k.low, 0.0000001);
        const lowerWick = (Math.min(k.open, k.close) - k.low) / range;
        const upperWick = (k.high - Math.max(k.open, k.close)) / range;

        const isBullBidAbsorption =
          netDelta < 0 &&
          (deltaSigma >= 0.85 || absDelta >= meanAbs * 1.35) &&
          (k.close > k.open || lowerWick >= 0.42);
        const isBearAskAbsorption =
          netDelta > 0 &&
          (deltaSigma >= 0.85 || absDelta >= meanAbs * 1.35) &&
          (k.close < k.open || upperWick >= 0.42);
        const hasAbsorption = isBullBidAbsorption || isBearAskAbsorption;

        const isStatSignificant = deltaSigma >= 1.85;
        const isTwoSigmaAnomaly = deltaSigma >= 2.0;
        const totalLiqUsd =
          (k.liquidationBuyUsd || (k as any).liquidationsBuy || (k as any).liqBuyUsd || 0) +
          (k.liquidationSellUsd || (k as any).liquidationsSell || (k as any).liqSellUsd || 0);

        // Filter out routine low-sigma noise: ONLY draw when deltaSigma >= 1.85 OR hasAbsorption === true OR totalLiqUsd > 0
        if (!isStatSignificant && !hasAbsorption && totalLiqUsd <= 0) {
          continue;
        }

        // Anchor Y at wick extreme for absorption or close price for directional delta impulse
        const anchorPrice = isBullBidAbsorption
          ? k.low
          : isBearAskAbsorption
          ? k.high
          : k.close;
        const y = series.priceToCoordinate(anchorPrice);
        if (y === null || y < 0 || y > h) continue;

        const sigmaNormalized = Math.max(0.15, Math.min(1, (deltaSigma + 0.5) / 3.2));
        const maxBubbleR = isMobile ? 9 : 13;
        const minBubbleR = isMobile ? 4.5 : 6.0;
        const r = minBubbleR + sigmaNormalized * (maxBubbleR - minBubbleR);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        if (netDelta >= 0) {
          ctx.fillStyle = isTwoSigmaAnomaly ? 'rgba(16, 185, 129, 0.32)' : 'rgba(16, 185, 129, 0.20)';
          ctx.fill();
          ctx.strokeStyle = cssEmerald;
          ctx.lineWidth = isTwoSigmaAnomaly ? 2 : 1.25;
          ctx.setLineDash([]);
          ctx.stroke();
        } else {
          ctx.fillStyle = isTwoSigmaAnomaly ? 'rgba(244, 63, 94, 0.32)' : 'rgba(244, 63, 94, 0.20)';
          ctx.fill();
          ctx.strokeStyle = cssCoral;
          ctx.lineWidth = isTwoSigmaAnomaly ? 2 : 1.25;
          ctx.setLineDash([]);
          ctx.stroke();
        }

        // Passive Limit Absorption Outer Ring (Amber for Passive Bid Absorption, Cyan for Passive Ask Absorption)
        if (hasAbsorption) {
          const ringColor = isBullBidAbsorption ? cssAmber : cssCyan;
          ctx.beginPath();
          ctx.arc(x, y, r + (isMobile ? 2.5 : 3.5), 0, Math.PI * 2);
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = isMobile ? 1.5 : 2;
          ctx.setLineDash([]);
          ctx.stroke();

          if (!isMobile || deltaSigma >= 1.5) {
            ctx.font = '700 7.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = ringColor;
            const absY = isBullBidAbsorption ? y + r + 11 : y - r - 6;
            ctx.fillText('ABS', x, absY);
            ctx.textAlign = 'start';
          }
        }

        // Real-time forceOrder Liquidation Marker
        if (totalLiqUsd > 0) {
          ctx.font = '700 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = cssAmber;
          ctx.fillText('⚡LIQ', x, y - r - 8);
          ctx.textAlign = 'start';
        }

        // Delta + Sigma readout inside significant footprint bubbles
        if ((!isMobile && r >= 10) || (isMobile && r >= 8.5)) {
          ctx.font = '700 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = cssLabelText;

          const deltaStr = formatCompactVolume(netDelta);
          ctx.fillText(deltaStr, x, isTwoSigmaAnomaly && !isMobile ? y - 2.5 : y);

          if (isTwoSigmaAnomaly && !isMobile) {
            ctx.font = '700 6.5px "JetBrains Mono", monospace';
            ctx.fillStyle = cssCyan;
            ctx.fillText(`${deltaSigma.toFixed(1)}σ`, x, y + 5.5);
          }

          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    // 4b. Draw Stage 03 Live EMA 21, EMA 50, and Session VWAP Curves (When MA layer or Stage 03 is active)
    if (
      (currentLayers.ma || activeStrategyTabRef.current === 3) &&
      currentKlines &&
      currentKlines.length > 1
    ) {
      const visibleRange = timeScale.getVisibleLogicalRange();
      const fromIdx = visibleRange ? Math.max(0, Math.floor(visibleRange.from)) : 0;
      const toIdx = visibleRange
        ? Math.min(currentKlines.length - 1, Math.ceil(visibleRange.to))
        : currentKlines.length - 1;

      const drawMaCurve = (
        getter: (pt: { ema21: number; ema50: number; ema200: number; vwap: number }) => number,
        color: string,
        lineWidth: number,
        dashed: boolean,
        tagLabel: string
      ) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dashed ? [4, 4] : []);
        let started = false;
        let lastX = 0;
        let lastY = 0;

        for (let i = fromIdx; i <= toIdx; i++) {
          const k = currentKlines[i];
          if (!k) continue;
          const normT = k.time > 1e11 ? Math.floor(k.time / 1000) : Math.floor(k.time);
          const maPt = maSeriesMapRef.current.get(normT);
          if (!maPt) continue;
          const x = timeScale.timeToCoordinate(normT as any);
          const y = series.priceToCoordinate(getter(maPt));
          if (x === null || y === null || y < 4 || y > h - 16) continue;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
          lastX = x;
          lastY = y;
        }
        if (started) {
          ctx.stroke();
          ctx.setLineDash([]);
          if (lastX > 36) {
            ctx.font = '700 8px "JetBrains Mono", monospace';
            const tagW = ctx.measureText(tagLabel).width + 6;
            const tagX = Math.min(w - tagW - (isMobile ? 48 : 56), lastX + 5);
            ctx.fillStyle = cssPillBg;
            ctx.fillRect(tagX, lastY - 6, tagW, 11);
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.85;
            ctx.strokeRect(tagX, lastY - 6, tagW, 11);
            ctx.fillStyle = color;
            ctx.fillText(tagLabel, tagX + 3, lastY + 2);
          }
        }
      };

      drawMaCurve((p) => p.ema50, cssAmber, 1.75, false, 'EMA50');
      drawMaCurve((p) => p.ema21, cssCyan, 1.75, false, 'EMA21');
      drawMaCurve((p) => p.vwap, cssPurple, 1.5, true, 'VWAP');
    }

    // 5. Draw Visual Long/Short Risk-Reward Projection Box (Only if rrBox is active)
    const setup = setupBoxRef.current;
    if (
      currentLayers.rrBox &&
      (setup.showSetupOnChart || activeStrategyTabRef.current === 6) &&
      setup.entryPrice > 0 &&
      setup.stopLoss > 0 &&
      setup.tp1Price > 0
    ) {
      const yEntry = series.priceToCoordinate(setup.entryPrice);
      const yStop = series.priceToCoordinate(setup.stopLoss);
      const yTp1 = series.priceToCoordinate(setup.tp1Price);

      if (yEntry !== null && yStop !== null && yTp1 !== null) {
        const clampedEntry = Math.max(8, Math.min(h - 24, yEntry));
        const clampedStop = Math.max(8, Math.min(h - 24, yStop));
        const clampedTp1 = Math.max(8, Math.min(h - 24, yTp1));

        const boxWidth = isMobile ? Math.max(120, w * 0.28) : Math.max(160, w * 0.22);
        const boxX = Math.max(8, w - boxWidth - (isMobile ? 48 : 62));

        // Target Zone
        const tpTop = Math.min(clampedEntry, clampedTp1);
        const tpHeight = Math.max(Math.abs(clampedTp1 - clampedEntry), 14);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
        ctx.fillRect(boxX, tpTop, boxWidth, tpHeight);

        ctx.beginPath();
        ctx.strokeStyle = cssEmerald;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        const targetBorderY = clampedTp1 < clampedEntry ? tpTop : tpTop + tpHeight;
        ctx.moveTo(boxX, targetBorderY);
        ctx.lineTo(boxX + boxWidth, targetBorderY);
        ctx.stroke();

        // Risk / Stop Zone
        const stopTop = Math.min(clampedEntry, clampedStop);
        const stopHeight = Math.max(Math.abs(clampedStop - clampedEntry), 14);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.14)';
        ctx.fillRect(boxX, stopTop, boxWidth, stopHeight);

        ctx.beginPath();
        ctx.strokeStyle = cssCoral;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        const stopBorderY = clampedStop > clampedEntry ? stopTop + stopHeight : stopTop;
        ctx.moveTo(boxX, stopBorderY);
        ctx.lineTo(boxX + boxWidth, stopBorderY);
        ctx.stroke();

        // Entry Line
        ctx.beginPath();
        ctx.strokeStyle = cssCyan;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.moveTo(boxX, clampedEntry);
        ctx.lineTo(boxX + boxWidth, clampedEntry);
        ctx.stroke();
        ctx.setLineDash([]);

        // Labels inside R:R Box
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';

        ctx.fillStyle = cssEmerald;
        ctx.fillText(
          `🎯 TP1: $${formatPrice(setup.tp1Price)}`,
          boxX + 5,
          clampedTp1 < clampedEntry ? tpTop + 10 : tpTop + tpHeight - 4
        );

        ctx.fillStyle = cssCyan;
        ctx.fillText(
          `⚡ ENTRY: $${formatPrice(setup.entryPrice)}`,
          boxX + 5,
          clampedEntry - 4
        );

        ctx.fillStyle = cssCoral;
        ctx.fillText(
          `🛑 SL: $${formatPrice(setup.stopLoss)}`,
          boxX + 5,
          clampedStop > clampedEntry ? stopTop + stopHeight - 4 : stopTop + 10
        );
      }
    }

    // 6. Interactive Level-to-Chart Hover Spotlighting
    const hovered = highlightRef.current;
    if (hovered && hovered.price > 0) {
      const yHover = series.priceToCoordinate(hovered.price);
      if (yHover !== null && yHover >= 0 && yHover <= h) {
        ctx.fillStyle = isLightMode ? 'rgba(2, 132, 199, 0.14)' : 'rgba(0, 240, 255, 0.14)';
        ctx.fillRect(0, yHover - 8, w, 16);

        ctx.beginPath();
        ctx.strokeStyle = cssCyan;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.moveTo(0, yHover);
        ctx.lineTo(w, yHover);
        ctx.stroke();

        ctx.fillStyle = cssPillBg;
        const spotWidth = isMobile ? 180 : 230;
        ctx.fillRect(w * 0.25, Math.max(4, yHover - 18), spotWidth, 16);
        ctx.strokeStyle = cssCyan;
        ctx.lineWidth = 1;
        ctx.strokeRect(w * 0.25, Math.max(4, yHover - 18), spotWidth, 16);

        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillStyle = cssCyan;
        ctx.fillText(
          `✦ SPOTLIGHT: ${hovered.label} ($${formatPrice(hovered.price)})`,
          w * 0.25 + 6,
          Math.max(15, yHover - 7)
        );
      }
    }
  }, []);

  // Sync price lines based on active layers (sr, vp, options)
  const syncPriceLines = useCallback(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    // Clear existing price lines
    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line);
      } catch {}
    });
    priceLinesRef.current = [];

    const currentLayers = layersRef.current;
    const currentLiquidity = liquidityRef.current;
    const currentOptions = optionsRef.current;
    const currentVp = vpRef.current;

    const formatPriceShort = (p: number) => {
      if (!p || p <= 0) return '$0';
      if (p < 0.001) return `$${p.toFixed(6)}`;
      if (p < 0.1) return `$${p.toFixed(4)}`;
      if (p < 10) return `$${p.toFixed(3)}`;
      if (p < 1000) return `$${p.toFixed(2)}`;
      return `$${(p / 1000).toFixed(1)}K`;
    };

    const currentKlines = klinesRef.current;
    let minAllowed = 0;
    let maxAllowed = Infinity;
    if (currentKlines && currentKlines.length > 0) {
      const lows = currentKlines.map((k) => k.low).filter((l) => l > 0);
      const highs = currentKlines.map((k) => k.high).filter((h) => h > 0);
      if (lows.length > 0 && highs.length > 0) {
        const minLow = Math.min(...lows);
        const maxHigh = Math.max(...highs);
        minAllowed = minLow * 0.85;
        maxAllowed = maxHigh * 1.15;
      }
    }

    const placedAxisPrices: number[] = [];

    const addLine = (price: number, title: string, color: string, style: LineStyle, width: 1 | 2 = 1) => {
      if (!price || price <= 0) return;
      if (price < minAllowed || price > maxAllowed) return;
      const isTooClose = placedAxisPrices.some(
        (existing) => Math.abs(price - existing) / price < 0.0028
      );
      const showAxisLabel = !isTooClose;
      if (showAxisLabel) {
        placedAxisPrices.push(price);
      }
      try {
        const line = series.createPriceLine({
          price,
          color,
          lineWidth: width,
          lineStyle: style,
          axisLabelVisible: showAxisLabel,
          title: showAxisLabel ? title : '',
        });
        priceLinesRef.current.push(line);
      } catch {}
    };

    const rootStyles = getComputedStyle(document.documentElement);
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const cssCyan = rootStyles.getPropertyValue('--chart-cyan').trim() || (isLightMode ? '#0284c7' : '#00f0ff');
    const cssEmerald = rootStyles.getPropertyValue('--chart-emerald').trim() || (isLightMode ? '#047857' : '#4edea3');
    const cssCoral = rootStyles.getPropertyValue('--chart-coral').trim() || (isLightMode ? '#b91c1c' : '#ffb4ab');
    const cssAmber = rootStyles.getPropertyValue('--chart-amber').trim() || (isLightMode ? '#b45309' : '#f59e0b');
    const cssPurple = rootStyles.getPropertyValue('--chart-purple').trim() || (isLightMode ? '#6d28d9' : '#c084fc');

    // 1. Volume Profile Price Lines (Prioritize POC first, then VAH & VAL)
    if (currentLayers.vp && currentVp) {
      if (currentVp.poc) {
        addLine(currentVp.poc, `POC ${formatPriceShort(currentVp.poc)}`, cssAmber, LineStyle.Solid, 2);
      }
      if (currentVp.vah) {
        addLine(currentVp.vah, `VAH ${formatPriceShort(currentVp.vah)}`, cssCyan, LineStyle.Dashed);
      }
      if (currentVp.val) {
        addLine(currentVp.val, `VAL ${formatPriceShort(currentVp.val)}`, cssCyan, LineStyle.Dashed);
      }
    }

    // 2. S/R & Liquidity Price Lines (Prioritize S/R pivots then Resting Depth Walls)
    if (currentLayers.sr && currentLiquidity) {
      if (currentLiquidity.srHigh > 0) {
        addLine(currentLiquidity.srHigh, `RES ${formatPriceShort(currentLiquidity.srHigh)}`, cssCoral, LineStyle.Dotted, 1);
      }
      if (currentLiquidity.srLow > 0) {
        addLine(currentLiquidity.srLow, `SUP ${formatPriceShort(currentLiquidity.srLow)}`, cssEmerald, LineStyle.Dotted, 1);
      }
      if (currentLiquidity.askLiquidityPrice > 0) {
        addLine(currentLiquidity.askLiquidityPrice, `ASK ${formatPriceShort(currentLiquidity.askLiquidityPrice)}`, cssCoral, LineStyle.Dashed, 1);
      }
      if (currentLiquidity.bidLiquidityPrice > 0) {
        addLine(currentLiquidity.bidLiquidityPrice, `BID ${formatPriceShort(currentLiquidity.bidLiquidityPrice)}`, cssEmerald, LineStyle.Dashed, 1);
      }
    }

    // 3. Options Price Lines (Prioritize 0-Γ first, then CW, PW, MP; skip synthetic non-Deribit unless manually clicked)
    const shouldDrawOptionsLines =
      currentLayers.options &&
      (currentOptions?.isDeribitNative !== false || manualOptionsOverrideRef.current);
    if (shouldDrawOptionsLines && currentOptions) {
      if (currentOptions.zeroGammaLevel && currentOptions.zeroGammaLevel > 0) {
        addLine(currentOptions.zeroGammaLevel, `0-Γ ${formatPriceShort(currentOptions.zeroGammaLevel)}`, cssCyan, LineStyle.Dashed, 2);
      }
      if (currentOptions.callWall) {
        addLine(currentOptions.callWall, `CW ${formatPriceShort(currentOptions.callWall)}`, cssPurple, LineStyle.Dashed);
      }
      if (currentOptions.putWall) {
        addLine(currentOptions.putWall, `PW ${formatPriceShort(currentOptions.putWall)}`, cssEmerald, LineStyle.Dashed);
      }
      if (currentOptions.maxPain) {
        addLine(currentOptions.maxPain, `MP ${formatPriceShort(currentOptions.maxPain)}`, cssPurple, LineStyle.Dotted);
      }
    }
  }, []);

  // Sync whenever parent controlledLayers changes
  useEffect(() => {
    if (!controlledLayers) return;
    layersRef.current = controlledLayers;
    setInternalLayers(controlledLayers);
    syncPriceLines();
    requestAnimationFrame(drawOverlayCanvas);
  }, [controlledLayers, syncPriceLines, drawOverlayCanvas]);

  // Auto-Sync to 6-Stage Progressive Trader Pipeline (Stages 1 to 6)
  useEffect(() => {
    if (!autoSyncTab) return;

    let targetLayers: ChartLayers = { ...DEFAULT_CHART_LAYERS };
    if (activeStrategyTab === 1) {
      // Stage 01 (Price & S/R): Pure candlesticks + clean Support/Resistance lines
      targetLayers = { vp: false, ob: false, sr: true, bubbles: false, options: false, rrBox: false, ma: false };
    } else if (activeStrategyTab === 2) {
      // Stage 02 (Volume & Value): Fades in Bid/Ask Volume Profile (POC, VAH, VAL) + S/R
      targetLayers = { vp: true, ob: false, sr: true, bubbles: false, options: false, rrBox: false, ma: false };
    } else if (activeStrategyTab === 3) {
      // Stage 03 (Trend & MA): Live EMA Ribbon (21/50/200) & Session VWAP curves + VP
      targetLayers = { vp: true, ob: false, sr: false, bubbles: false, options: false, rrBox: false, ma: true };
    } else if (activeStrategyTab === 4) {
      // Stage 04 (Orderflow & SMC): Mitigated Order Blocks (50% MT) + Delta Bubbles / ABS Rings
      targetLayers = { vp: true, ob: true, sr: false, bubbles: true, options: false, rrBox: false, ma: false };
    } else if (activeStrategyTab === 5) {
      // Stage 05 (Quant & Options): Deribit Call Wall, Put Wall, 0-Gamma Flip, Max Pain
      targetLayers = { vp: true, ob: false, sr: false, bubbles: false, options: true, rrBox: false, ma: false };
    } else if (activeStrategyTab === 6) {
      // Stage 06 (Execute & Size): Visual R:R Projection Box (Entry, Stop, TP1) + VP + OB
      targetLayers = { vp: true, ob: true, sr: false, bubbles: false, options: false, rrBox: true, ma: false };
    }

    layersRef.current = targetLayers;
    setInternalLayers(targetLayers);
    onLayersChange?.(targetLayers);
    syncPriceLines();
    requestAnimationFrame(drawOverlayCanvas);
  }, [activeStrategyTab, autoSyncTab, onLayersChange, syncPriceLines, drawOverlayCanvas]);

  const handleToggleLayer = (key: keyof ChartLayers) => {
    let nextLayers = { ...layers, [key]: !layers[key] };

    if (key === 'options' && optionsData.isDeribitNative === false) {
      const currentlyShowingSynthetic = layers.options && manualOptionsOverrideRef.current;
      const nextShowSynthetic = !currentlyShowingSynthetic;
      manualOptionsOverrideRef.current = nextShowSynthetic;
      setManualOptionsOverride(nextShowSynthetic);
      nextLayers = { ...layers, options: nextShowSynthetic };
    }

    layersRef.current = nextLayers;
    setInternalLayers(nextLayers);
    onLayersChange?.(nextLayers);

    if (key === 'rrBox' && onToggleSetupOnChart) {
      onToggleSetupOnChart(nextLayers.rrBox);
    }

    syncPriceLines();
    requestAnimationFrame(drawOverlayCanvas);
  };

  // Initialize Lightweight Charts & Dynamic CSS Variable Theme Synchronization
  useEffect(() => {
    if (!containerRef.current) return;

    const getChartThemeVars = () => {
      const styles = getComputedStyle(document.documentElement);
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      return {
        bg: styles.getPropertyValue('--chart-bg').trim() || (isLight ? '#ffffff' : '#0b0e14'),
        text: styles.getPropertyValue('--chart-text').trim() || (isLight ? '#334155' : '#849495'),
        grid: styles.getPropertyValue('--chart-grid').trim() || (isLight ? '#e2e8f0' : '#191c22'),
        border: styles.getPropertyValue('--chart-border').trim() || (isLight ? '#cbd5e1' : '#1e2433'),
        crosshair: styles.getPropertyValue('--chart-crosshair').trim() || (isLight ? '#0284c7' : '#00f0ff'),
        up: styles.getPropertyValue('--chart-up').trim() || (isLight ? '#059669' : '#4edea3'),
        down: styles.getPropertyValue('--chart-down').trim() || (isLight ? '#dc2626' : '#ffb4ab'),
      };
    };

    const initialTheme = getChartThemeVars();

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: initialTheme.bg },
        textColor: initialTheme.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: initialTheme.grid },
        horzLines: { color: initialTheme.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: initialTheme.crosshair, width: 1, style: LineStyle.Dashed },
        horzLine: { color: initialTheme.crosshair, width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: initialTheme.border,
        scaleMargins: { top: 0.1, bottom: 0.16 },
      },
      timeScale: {
        borderColor: initialTheme.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    });

    const initialSamplePrice = klines[klines.length - 1]?.close || 1;
    const initialPrecision = getPricePrecision(initialSamplePrice);

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: initialTheme.up,
      downColor: initialTheme.down,
      borderVisible: false,
      wickUpColor: initialTheme.up,
      wickDownColor: initialTheme.down,
      priceFormat: {
        type: 'price',
        precision: initialPrecision.precision,
        minMove: initialPrecision.minMove,
      },
    });

    // Pin volumeSeries strictly to bottom 12% with dedicated overlay scale 'volume_scale'
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: initialTheme.up,
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: {
        top: 0.88,
        bottom: 0,
      },
      visible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const applyDynamicChartTheme = () => {
      if (!chartRef.current || !candleSeriesRef.current) return;
      const t = getChartThemeVars();
      chartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: t.bg },
          textColor: t.text,
        },
        grid: {
          vertLines: { color: t.grid },
          horzLines: { color: t.grid },
        },
        crosshair: {
          vertLine: { color: t.crosshair, width: 1, style: LineStyle.Dashed },
          horzLine: { color: t.crosshair, width: 1, style: LineStyle.Dashed },
        },
        rightPriceScale: { borderColor: t.border },
        timeScale: { borderColor: t.border },
      });
      candleSeriesRef.current.applyOptions({
        upColor: t.up,
        downColor: t.down,
        wickUpColor: t.up,
        wickDownColor: t.down,
      });
      syncPriceLines();
      requestAnimationFrame(drawOverlayCanvas);
    };

    window.addEventListener('inferno:theme-change', applyDynamicChartTheme);
    let themeObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(() => {
        applyDynamicChartTheme();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    // Range Change Listener
    const handleRangeChange = (range: any) => {
      requestAnimationFrame(drawOverlayCanvas);

      if (!range || !onVisibleKlinesChangeRef.current) return;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const allKlines = klinesRef.current;
        if (!allKlines || allKlines.length === 0) return;

        const fromIdx = Math.max(0, Math.floor(range.from));
        const toIdx = Math.min(allKlines.length - 1, Math.ceil(range.to));

        if (fromIdx <= toIdx) {
          const slice = allKlines.slice(fromIdx, toIdx + 1);
          if (slice.length > 0 && onVisibleKlinesChangeRef.current) {
            onVisibleKlinesChangeRef.current(slice);
          }
        }
      }, 120);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      requestAnimationFrame(drawOverlayCanvas);
    });

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        requestAnimationFrame(drawOverlayCanvas);
      }
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('inferno:theme-change', applyDynamicChartTheme);
      if (themeObserver) {
        themeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      lastLoadedKeyRef.current = '';
      lastSeriesTimeRef.current = 0;
      lastFirstTimeRef.current = 0;
      lastCountRef.current = 0;
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Robust Historical Klines Loading & Zero-Re-Render Live Tick Streaming
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || klines.length === 0) return;

    const rawSorted = [...klines]
      .map((k) => ({
        ...k,
        time: k.time > 1e11 ? Math.floor(k.time / 1000) : Math.floor(k.time),
      }))
      .filter((k) => Number.isFinite(k.time) && k.open > 0 && k.high > 0 && k.low > 0 && k.close > 0)
      .sort((a, b) => a.time - b.time);

    const sorted: KlineData[] = [];
    for (const k of rawSorted) {
      if (sorted.length > 0 && sorted[sorted.length - 1].time === k.time) {
        sorted[sorted.length - 1] = k;
      } else {
        sorted.push(k);
      }
    }

    if (sorted.length === 0) return;
    klinesRef.current = sorted;

    const candleData = sorted.map((k) => ({
      time: k.time as any,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    const rvols = calculateRVOL(sorted);

    const volData = sorted.map((k, idx) => {
      const rvol = rvols[idx] || 1.0;
      let barColor = k.close >= k.open ? 'rgba(78, 222, 163, 0.22)' : 'rgba(255, 180, 171, 0.22)';

      if (rvol <= 0.45) {
        barColor = 'rgba(0, 240, 255, 0.35)';
      } else if (rvol >= 2.0) {
        barColor = 'rgba(245, 158, 11, 0.45)';
      }

      return {
        time: k.time as any,
        value: k.volume,
        color: barColor,
      };
    });

    const currentKey = `${symbol}_${timeframe}`;
    const symbolTfChanged = lastLoadedKeyRef.current !== currentKey;
    const lastBar = candleData[candleData.length - 1];
    const lastBarTime = Number(lastBar.time);

    const isLiveTick =
      !symbolTfChanged &&
      lastLoadedKeyRef.current === currentKey &&
      lastCountRef.current >= 20 &&
      lastSeriesTimeRef.current > 0 &&
      lastBarTime >= lastSeriesTimeRef.current &&
      lastBarTime - lastSeriesTimeRef.current <= 86400 * 14 &&
      Math.abs(sorted.length - lastCountRef.current) <= 2;

    if (isLiveTick) {
      try {
        candleSeriesRef.current.update(lastBar);
        const lastVolBar = volData[volData.length - 1];
        if (lastVolBar) {
          volumeSeriesRef.current.update(lastVolBar);
        }
        lastSeriesTimeRef.current = lastBarTime;
        lastCountRef.current = sorted.length;
        requestAnimationFrame(drawOverlayCanvas);
      } catch {
        candleSeriesRef.current.setData(candleData);
        volumeSeriesRef.current.setData(volData);
        lastSeriesTimeRef.current = lastBarTime;
        lastCountRef.current = sorted.length;
        requestAnimationFrame(drawOverlayCanvas);
      }
    } else {
      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volData);
      lastSeriesTimeRef.current = lastBarTime;
      lastFirstTimeRef.current = Number(candleData[0].time);
      lastCountRef.current = sorted.length;
      lastLoadedKeyRef.current = currentKey;

      if (symbolTfChanged || lastCountRef.current < 20) {
        candleSeriesRef.current?.priceScale().applyOptions({ autoScale: true });
        chartRef.current?.timeScale().fitContent();
      }
      requestAnimationFrame(() => {
        drawOverlayCanvas();
      });
    }

    // Volume 20-MA, Session-Normalized RVOL & live Bar Delta update (Throttled to 350ms to eliminate UI thrash)
    const nowMs = Date.now();
    if (symbolTfChanged || nowMs - lastVolMetricsUpdateRef.current > 350) {
      lastVolMetricsUpdateRef.current = nowMs;

      const recentVols = sorted.slice(-20).map((k) => k.volume);
      const sum20 = recentVols.reduce((acc, v) => acc + v, 0);
      const ma20 = recentVols.length > 0 ? sum20 / recentVols.length : 0;
      const lastKline = sorted[sorted.length - 1];
      const lastVolVal = lastKline?.volume || 0;
      const lastRvol = rvols[rvols.length - 1] || 1.0;

      const sessionInfo = calculateSessionNormalizedRVOL(sorted);
      const effectiveRvol = sessionInfo.sessionRvol || lastRvol;

      let rvolStatus = 'NORMAL FLOW';
      if (effectiveRvol <= 0.45) {
        rvolStatus = '💧 SESSION VDU (EXHAUSTION)';
      } else if (effectiveRvol >= 2.0) {
        rvolStatus = '🔥 SESSION IGNITION SURGE';
      }

      const baseAsset = symbol.replace('USDT', '');
      const formatVol = (v: number) => {
        if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M ${baseAsset}`;
        if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K ${baseAsset}`;
        return `${v.toFixed(1)} ${baseAsset}`;
      };

      const lastBuyVol = lastKline?.takerBuyVolume ?? lastVolVal * 0.5;
      const lastSellVol = lastKline?.takerSellVolume ?? Math.max(0, lastVolVal - lastBuyVol);
      const lastBarDelta = lastKline?.barDelta !== undefined ? lastKline.barDelta : lastBuyVol - lastSellVol;

      setVolMetrics({
        totalVol: formatVol(lastVolVal),
        ma20: formatVol(ma20),
        rvol: lastRvol,
        sessionRvol: sessionInfo.sessionRvol,
        sessionName: sessionInfo.sessionName,
        barDeltaStr: `${formatCompactVolume(lastBarDelta)} ${baseAsset}`,
        barDeltaPositive: lastBarDelta >= 0,
        rvolStatus,
      });
    }
  }, [klines, symbol, timeframe, drawOverlayCanvas]);

  // Recalibrate price scale & fit content immediately when symbol or timeframe changes
  useEffect(() => {
    manualOptionsOverrideRef.current = false;
    setManualOptionsOverride(false);
    candleSeriesRef.current?.priceScale().applyOptions({ autoScale: true });
    chartRef.current?.timeScale().fitContent();
  }, [symbol, timeframe]);

  // Sync Price Lines for Institutional Levels, S/R, and Liquidity Walls
  useEffect(() => {
    syncPriceLines();
    requestAnimationFrame(drawOverlayCanvas);
  }, [volumeProfile, bullOB, bearOB, optionsData, liquidity, syncPriceLines, drawOverlayCanvas]);

  // Redraw overlay canvas whenever R:R setup prices or hovered level changes
  useEffect(() => {
    requestAnimationFrame(drawOverlayCanvas);
  }, [entryPrice, stopLoss, tp1Price, highlightedLevel, drawOverlayCanvas]);

  return (
    <div className="flex flex-col bg-[#141821] px-2 sm:px-3 py-1.5 sm:py-2 gap-1.5 sm:gap-2 relative border-b border-[#272a31]">
      {/* Chart Canvas Container (Full-screen height on Mobile Chart Page, 460px on Desktop) */}
      <div className="relative w-full h-[calc(100dvh-14.5rem)] min-h-[360px] sm:h-[440px] lg:h-[460px] rounded-lg bg-[#0b0e14] overflow-hidden border border-[#272a31]">
        {/* Lightweight Charts mounting DOM node */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Synchronized Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none w-full h-full z-10"
        />

        {/* Mobile Toggleable HUD Overlay Controls (Top-Left of Chart Canvas on < lg) */}
        <div className="lg:hidden absolute top-2 left-2 right-14 z-30 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() =>
                setMobileHudMode((prev) => (prev === 'LEVELS' ? 'NONE' : 'LEVELS'))
              }
              className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold border backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shadow-md ${
                mobileHudMode === 'LEVELS'
                  ? 'bg-[#00f0ff]/25 text-[#00f0ff] border-[#00f0ff]'
                  : 'bg-[#0b0e14]/85 text-[#dbfcff] border-[#272a31]'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-[#00f0ff]">layers</span>
              <span>HUD LEVELS</span>
              <span className="text-[9px] text-[#849495]">
                {mobileHudMode === 'LEVELS' ? '▲' : '▼'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setMobileHudMode((prev) => (prev === 'LAYERS' ? 'NONE' : 'LAYERS'))
              }
              className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold border backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shadow-md ${
                mobileHudMode === 'LAYERS'
                  ? 'bg-[#4edea3]/25 text-[#4edea3] border-[#4edea3]'
                  : 'bg-[#0b0e14]/85 text-[#dbfcff] border-[#272a31]'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-[#4edea3]">tune</span>
              <span>LAYERS</span>
              <span className="text-[9px] text-[#849495]">
                {mobileHudMode === 'LAYERS' ? '▲' : '▼'}
              </span>
            </button>
          </div>

          {/* Mobile Floating HUD Panel: Structural Levels */}
          {mobileHudMode === 'LEVELS' && floatingLevelsNode && (
            <div className="pointer-events-auto p-2 rounded-lg bg-[#0b0e14]/95 backdrop-blur-xl border border-[#00f0ff]/40 shadow-[0_12px_32px_rgba(0,0,0,0.9)] max-w-full overflow-x-auto">
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#1e2433] font-mono text-[9px] text-[#849495]">
                <span className="text-[#00f0ff] font-bold uppercase">
                  STRUCTURAL PRICE LEVELS (TAP FOR MENTOR GUIDE)
                </span>
                <button
                  type="button"
                  onClick={() => setMobileHudMode('NONE')}
                  className="text-[#849495] hover:text-[#e1e2eb] px-1"
                >
                  ✕
                </button>
              </div>
              {floatingLevelsNode}
            </div>
          )}

          {/* Mobile Floating HUD Panel: 6 Chart Layer Toggles */}
          {mobileHudMode === 'LAYERS' && (
            <div className="pointer-events-auto p-2.5 rounded-lg bg-[#0b0e14]/95 backdrop-blur-xl border border-[#4edea3]/40 shadow-[0_12px_32px_rgba(0,0,0,0.9)] flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#1e2433] font-mono text-[9px] text-[#849495]">
                <span className="text-[#4edea3] font-bold uppercase">
                  SELECTIVE CHART OVERLAY LAYERS
                </span>
                <button
                  type="button"
                  onClick={() => setMobileHudMode('NONE')}
                  className="text-[#849495] hover:text-[#e1e2eb] px-1"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleLayer('vp')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    layers.vp
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50'
                      : 'bg-[#191c22] text-[#849495] border-[#272a31]'
                  }`}
                >
                  VP SPLIT
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayer('ob')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    layers.ob
                      ? 'bg-[#4edea3]/20 text-[#4edea3] border-[#4edea3]/50'
                      : 'bg-[#191c22] text-[#849495] border-[#272a31]'
                  }`}
                >
                  OB + MT
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayer('sr')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    layers.sr
                      ? 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/50'
                      : 'bg-[#191c22] text-[#849495] border-[#272a31]'
                  }`}
                >
                  S/R WALLS
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayer('bubbles')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    layers.bubbles
                      ? 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/50'
                      : 'bg-[#191c22] text-[#849495] border-[#272a31]'
                  }`}
                >
                  Δ BUBBLES
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayer('options')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    layers.options && (optionsData.isDeribitNative !== false || manualOptionsOverride)
                      ? 'bg-[#c084fc]/20 text-[#c084fc] border-[#c084fc]/50'
                      : 'bg-[#191c22] text-[#849495] border-[#272a31]'
                  }`}
                >
                  OPTIONS + 0Γ
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayer('rrBox')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    layers.rrBox
                      ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50'
                      : 'bg-[#191c22] text-[#849495] border-[#272a31]'
                  }`}
                >
                  R:R BOX
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAutoSyncTab(!autoSyncTab)}
                className={`w-full py-1.5 rounded font-mono text-[10px] font-semibold border flex items-center justify-center gap-1 cursor-pointer ${
                  autoSyncTab
                    ? 'bg-[#00f0ff]/20 border-[#00f0ff]/50 text-[#00f0ff]'
                    : 'bg-[#f59e0b]/20 border-[#f59e0b]/50 text-[#fcd34d]'
                }`}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {autoSyncTab ? 'sync' : 'lock'}
                </span>
                <span>
                  {autoSyncTab
                    ? '🔓 AUTO-SYNC TO STAGE (01–06): ON'
                    : '🔒 LAYERS LOCKED (MANUAL OVERRIDE)'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Watermark */}
        <div className="absolute bottom-2 right-2 pointer-events-none flex flex-col items-end z-20">
          <span className="font-mono text-[9px] text-[#849495]/50 tracking-wider">
            INFERNO // HFT ORDERFLOW
          </span>
        </div>
      </div>

      {/* Desktop Selective Chart Indicator Toggles Strip + Auto-Sync to Tab (Hidden on mobile where it lives in HUD) */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-1.5 py-1 px-1 bg-[#10131a] rounded-lg border border-[#272a31]">
        {/* Left: The 6 Selective Indicator Layer Toggles */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="font-mono text-[9px] text-[#849495] font-bold uppercase tracking-wider pl-1 pr-0.5">
            LAYERS:
          </span>

          {/* 1. Volume Profile */}
          <button
            type="button"
            onClick={() => handleToggleLayer('vp')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              layers.vp
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                : 'bg-[#191c22] text-[#849495] border-[#272a31] hover:text-[#e1e2eb]'
            }`}
            title="Toggle Bid/Ask Split Volume Profile histogram & VAH/POC/VAL levels"
          >
            VP SPLIT
          </button>

          {/* 2. Order Blocks */}
          <button
            type="button"
            onClick={() => handleToggleLayer('ob')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              layers.ob
                ? 'bg-[#4edea3]/20 text-[#4edea3] border-[#4edea3]/50 shadow-[0_0_8px_rgba(78,222,163,0.2)]'
                : 'bg-[#191c22] text-[#849495] border-[#272a31] hover:text-[#e1e2eb]'
            }`}
            title="Toggle Mitigated Bullish & Bearish Order Block zones & Footprint Quality Scores"
          >
            OB + MT
          </button>

          {/* 3. Support & Resistance */}
          <button
            type="button"
            onClick={() => handleToggleLayer('sr')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              layers.sr
                ? 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/50 shadow-[0_0_8px_rgba(255,180,171,0.2)]'
                : 'bg-[#191c22] text-[#849495] border-[#272a31] hover:text-[#e1e2eb]'
            }`}
            title="Toggle Orderbook Resting Bids/Asks and S/R levels"
          >
            S/R
          </button>

          {/* 4. Delta Bubbles */}
          <button
            type="button"
            onClick={() => handleToggleLayer('bubbles')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              layers.bubbles
                ? 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/50 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                : 'bg-[#191c22] text-[#849495] border-[#272a31] hover:text-[#e1e2eb]'
            }`}
            title="Toggle Statistical ±2σ Delta Footprint Bubbles & Passive Absorption Rings"
          >
            Δ BUBBLES
          </button>

          {/* 5. Options Walls & Max Pain */}
          <button
            type="button"
            onClick={() => handleToggleLayer('options')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              layers.options && (optionsData.isDeribitNative !== false || manualOptionsOverride)
                ? 'bg-[#c084fc]/20 text-[#c084fc] border-[#c084fc]/50 shadow-[0_0_8px_rgba(192,132,252,0.2)]'
                : 'bg-[#191c22] text-[#849495] border-[#272a31] hover:text-[#e1e2eb]'
            }`}
            title="Toggle Deribit Options Call Wall, Put Wall, Zero-Gamma Flip & Max Pain"
          >
            OPTIONS + 0Γ
          </button>

          {/* 6. EMA Ribbon & Session VWAP */}
          <button
            type="button"
            onClick={() => handleToggleLayer('ma')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              layers.ma
                ? 'bg-[#f59e0b]/20 text-[#fcd34d] border-[#f59e0b]/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                : 'bg-[#191c22] text-[#849495] border-[#272a31] hover:text-[#e1e2eb]'
            }`}
            title="Toggle EMA Ribbon (21/50/200) & Session VWAP curves"
          >
            EMA + VWAP
          </button>

          {/* 7. Risk-Reward Box */}
          <button
            type="button"
            onClick={() => handleToggleLayer('rrBox')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              layers.rrBox
                ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-[#191c22] text-[#849495] border-[#272a31] hover:text-[#e1e2eb]'
            }`}
            title="Toggle Long/Short Risk:Reward projection zone"
          >
            R:R BOX
          </button>
        </div>

        {/* Right: Auto-Sync to 6-Stage Pipeline or Lock Layers */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <button
            type="button"
            onClick={() => setAutoSyncTab(!autoSyncTab)}
            className={`px-2 py-0.5 rounded font-mono text-[9px] sm:text-[10px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
              autoSyncTab
                ? 'bg-[#00f0ff]/20 border-[#00f0ff]/50 text-[#00f0ff]'
                : 'bg-[#f59e0b]/20 border-[#f59e0b]/50 text-[#fcd34d]'
            }`}
            title="Toggle automatic chart layer synchronization with the 6-Stage Progressive Trader Pipeline or lock current layers"
          >
            <span className="material-symbols-outlined text-[12px]">
              {autoSyncTab ? 'sync' : 'lock'}
            </span>
            <span>
              {autoSyncTab ? '🔓 AUTO-SYNC STAGE (01–06)' : '🔒 LAYERS LOCKED'}
            </span>
          </button>
        </div>
      </div>

      {/* Chart Status Strip with Session-Normalized RVOL & Live Bar Delta */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#b9cacb] px-0.5 gap-2">
        <div className="flex flex-wrap items-center gap-3 truncate">
          <span>
            VOL: <strong className="text-[#e1e2eb] font-semibold">{volMetrics.totalVol}</strong>
          </span>
          <span>
            20-MA: <strong className="text-[#00f0ff] font-semibold">{volMetrics.ma20}</strong>
          </span>
          <span>
            BAR Δ:{' '}
            <strong
              className={`font-semibold ${
                volMetrics.barDeltaPositive ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
              }`}
            >
              {volMetrics.barDeltaStr}
            </strong>
          </span>
          <span className="flex items-center gap-1.5">
            SES-RVOL ({volMetrics.sessionName}):{' '}
            <strong className="text-[#e1e2eb] font-semibold">{volMetrics.sessionRvol.toFixed(2)}x</strong>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                volMetrics.sessionRvol <= 0.45
                  ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30'
                  : volMetrics.sessionRvol >= 2.0
                  ? 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30'
                  : 'bg-[#202530] text-[#849495]'
              }`}
            >
              {volMetrics.rvolStatus}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isStreaming ? 'bg-[#4edea3] animate-pulse' : 'bg-[#f59e0b]'
            }`}
          ></span>
          <span className="text-[#4edea3] font-semibold text-[10px] tracking-wider uppercase">
            {isStreaming ? 'LIVE AGGTRADE + KLINE' : 'CONNECTING...'}
          </span>
        </div>
      </div>
    </div>
  );
};
