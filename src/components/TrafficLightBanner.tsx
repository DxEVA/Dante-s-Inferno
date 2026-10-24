import React, { useState, useMemo } from 'react';
import {
  VolumeProfile,
  OrderBlock,
  DeribitOptionsData,
  SharpeSortinoMetrics,
  PotentialSetupSpeculation,
  KlineData,
  LiquidityLevels,
  CandlestickAnalysisResult,
  MovingAverageAnalysisResult,
  AMDPhaseResult,
  TelemetryMetrics,
  ConfluenceOverview,
} from '../types';
import { calculateStrategyConfidence } from '../utils/quantEngine';

interface TrafficLightBannerProps {
  symbol: string;
  currentPrice: number;
  klines: KlineData[];
  volumeProfile: VolumeProfile;
  bullOB: OrderBlock | null;
  bearOB: OrderBlock | null;
  optionsData: DeribitOptionsData;
  liquidity?: LiquidityLevels;
  candlestickResult: CandlestickAnalysisResult;
  maResult: MovingAverageAnalysisResult;
  amdPhase: AMDPhaseResult;
  telemetry: TelemetryMetrics;
  confluence: ConfluenceOverview;
  sharpeSortino: SharpeSortinoMetrics;
  lensSetups: Record<number, PotentialSetupSpeculation>;
  experienceMode: 'rookie' | 'pro';
  showGlossaryModal: boolean;
  onToggleGlossaryModal: (open: boolean) => void;
}

export const TrafficLightBanner: React.FC<TrafficLightBannerProps> = ({
  symbol,
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
  lensSetups,
  experienceMode,
  showGlossaryModal,
  onToggleGlossaryModal,
}) => {
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfOffsetPct, setWhatIfOffsetPct] = useState<number>(0);

  const simulatedPrice = useMemo(() => {
    if (!showWhatIf || whatIfOffsetPct === 0) return currentPrice;
    return currentPrice * (1 + whatIfOffsetPct / 100);
  }, [currentPrice, showWhatIf, whatIfOffsetPct]);

  const formatP = (p: number) => {
    if (!p) return '0';
    if (p < 0.001) return p.toFixed(7);
    if (p < 0.1) return p.toFixed(5);
    if (p < 10) return p.toFixed(4);
    if (p < 1000) return p.toFixed(2);
    return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  // Compute all 5 tabs' confidence scores dynamically at simulatedPrice
  const tabConfidences = useMemo(() => {
    return [1, 2, 3, 4, 5].map((id) =>
      calculateStrategyConfidence(
        id as 1 | 2 | 3 | 4 | 5,
        simulatedPrice,
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
      )
    );
  }, [
    simulatedPrice,
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

  // Evaluate Traffic Light State
  const trafficState = useMemo(() => {
    const bullHighTabs = tabConfidences.filter((c) => c.score >= 70 && c.bias === 'BULLISH');
    const bearHighTabs = tabConfidences.filter((c) => c.score >= 70 && c.bias === 'BEARISH');
    const formingTabs = tabConfidences.filter((c) => c.score >= 50);

    const bullCount = tabConfidences.filter((c) => c.bias === 'BULLISH').length;
    const bearCount = tabConfidences.filter((c) => c.bias === 'BEARISH').length;
    const isConflicting = bullCount >= 2 && bearCount >= 2;

    const absSharpe = Math.abs(sharpeSortino.sharpeRatio || 0);

    // Nearest structural level check (within 1.2%)
    const levels: { name: string; price: number }[] = [
      { name: 'POC', price: volumeProfile.poc },
      { name: 'VAH', price: volumeProfile.vah },
      { name: 'VAL', price: volumeProfile.val },
    ];
    if (bullOB) levels.push({ name: 'Bull OB', price: bullOB.midpoint });
    if (bearOB) levels.push({ name: 'Bear OB', price: bearOB.midpoint });
    if (optionsData.callWall) levels.push({ name: 'Call Wall', price: optionsData.callWall });
    if (optionsData.putWall) levels.push({ name: 'Put Wall', price: optionsData.putWall });

    const validLevels = levels.filter((l) => l.price > 0);
    let nearestLevel = { name: 'VAL', price: volumeProfile.val || simulatedPrice * 0.99, distPct: 1.0 };

    if (validLevels.length > 0 && simulatedPrice > 0) {
      for (const lvl of validLevels) {
        const distPct = (Math.abs(simulatedPrice - lvl.price) / simulatedPrice) * 100;
        if (distPct < nearestLevel.distPct || nearestLevel.price === 0) {
          nearestLevel = { name: lvl.name, price: lvl.price, distPct };
        }
      }
    }

    const isAtKeyLevel = nearestLevel.distPct <= 1.2;
    const isMidValueArea =
      simulatedPrice > volumeProfile.val * 1.005 &&
      simulatedPrice < volumeProfile.vah * 0.995 &&
      !isAtKeyLevel;

    const primarySetup = lensSetups[1] || {
      reactionZoneLow: volumeProfile.val,
      reactionZoneHigh: volumeProfile.poc,
    };

    const alignedHighCount = Math.max(bullHighTabs.length, bearHighTabs.length);
    const dominantDirection =
      bullHighTabs.length >= bearHighTabs.length
        ? 'BULLISH'
        : bearHighTabs.length > bullHighTabs.length
        ? 'BEARISH'
        : bullCount >= bearCount
        ? 'BULLISH'
        : 'BEARISH';

    // GREEN LIGHT: >= 3 Strategy Tabs score >= 70% in same direction AND (|Sharpe| >= 0.8 or at key level)
    if (alignedHighCount >= 3 && (absSharpe >= 0.8 || isAtKeyLevel)) {
      return {
        light: 'GREEN' as const,
        headline: `GREEN LIGHT — HIGH-CONFLUENCE ${dominantDirection} WINDOW`,
        subtext: `${alignedHighCount}/5 Strategy Lenses score ≥70% ${dominantDirection} while ${symbol} trades ${
          isAtKeyLevel ? `directly at ${nearestLevel.name} ($${formatP(nearestLevel.price)})` : `with strong ${sharpeSortino.sharpeRatio.toFixed(2)} Sharpe momentum`
        }. Verify the 5-Point Pre-Flight Checklist below and size risk carefully.`,
        badgeText: `${alignedHighCount}/5 TABS ≥70% • HIGH EDGE`,
        nearestLevel,
      };
    }

    // RED LIGHT: Strongly conflicting tabs OR |Sharpe| < 0.35 in middle of Value Area
    if ((isConflicting && alignedHighCount <= 1) || (absSharpe < 0.35 && isMidValueArea)) {
      return {
        light: 'RED' as const,
        headline: 'RED LIGHT — CHOP / NO-EDGE ZONE (PROTECT CAPITAL)',
        subtext: `Institutional models show noisy 50/50 chop right now (Rolling Sharpe ${sharpeSortino.sharpeRatio.toFixed(
          2
        )} inside mid-range). Best move for a disciplined trader is to wait for price to test $${formatP(
          nearestLevel.price
        )} (${nearestLevel.name}).`,
        badgeText: 'NO-EDGE CHOP • PROTECT CAPITAL',
        nearestLevel,
      };
    }

    // YELLOW LIGHT: Stalking / Patience required
    return {
      light: 'YELLOW' as const,
      headline: 'YELLOW LIGHT — STALKING / PATIENCE REQUIRED',
      subtext: `Setups are forming (${formingTabs.length}/5 tabs ≥50% confidence). Wait for ${symbol} to reach the Key Reaction Zone ($${formatP(
        primarySetup.reactionZoneLow
      )} – $${formatP(primarySetup.reactionZoneHigh)}) or print a high-volume confirmation candle.`,
      badgeText: `${formingTabs.length}/5 TABS FORMING • STALK ZONE`,
      nearestLevel,
    };
  }, [
    tabConfidences,
    sharpeSortino,
    volumeProfile,
    bullOB,
    bearOB,
    optionsData,
    simulatedPrice,
    lensSetups,
    symbol,
  ]);

  return (
    <div className="flex flex-col bg-[#10131a] border-b border-[#272a31] px-3 py-2.5 gap-2">
      {/* Rookie Mode Step-by-Step Workflow Bar */}
      {experienceMode === 'rookie' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#141821]/95 border border-[#00f0ff]/30 shadow-[0_4px_20px_rgba(0,240,255,0.08)]">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-[#00f0ff]/15 text-[#00f0ff] font-bold uppercase tracking-wider border border-[#00f0ff]/30">
              🎓 ROOKIE WORKFLOW
            </span>
            <span className="text-[#e1e2eb] font-semibold">Step 1: Check Traffic Light</span>
            <span className="text-[#00f0ff]">➔</span>
            <span className="text-[#e1e2eb] font-semibold">Step 2: Review Green Tabs (&gt;70%)</span>
            <span className="text-[#00f0ff]">➔</span>
            <span className="text-[#e1e2eb] font-semibold">Step 3: Verify Pre-Flight Checklist</span>
            <span className="text-[#00f0ff]">➔</span>
            <span className="text-[#4edea3] font-bold">Step 4: Size Risk in Calculator</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowWhatIf((prev) => !prev)}
              className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showWhatIf
                  ? 'bg-[#f59e0b]/20 text-[#fcd34d] border-[#f59e0b]/50'
                  : 'bg-[#191c22] text-[#b9cacb] border-[#272a31] hover:border-[#00f0ff]/40 hover:text-[#00f0ff]'
              }`}
            >
              <span>🎛️ WHAT-IF PRICE SLIDER</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleGlossaryModal(true)}
              className="px-2.5 py-1 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>📖 JARGON GLOSSARY &amp; TOUR</span>
            </button>
          </div>
        </div>
      )}

      {/* Traffic Light Actionability Banner */}
      <div
        className={`relative overflow-hidden rounded-xl p-3.5 border backdrop-blur-md transition-all shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
          trafficState.light === 'GREEN'
            ? 'bg-gradient-to-r from-[#00a572]/20 via-[#141821]/95 to-[#141821]/95 border-[#4edea3]/40'
            : trafficState.light === 'YELLOW'
            ? 'bg-gradient-to-r from-[#f59e0b]/20 via-[#141821]/95 to-[#141821]/95 border-[#f59e0b]/40'
            : 'bg-gradient-to-r from-[#f43f5e]/20 via-[#141821]/95 to-[#141821]/95 border-[#ffb4ab]/40'
        }`}
      >
        {/* Left Traffic Light Housing + Dynamic Readout */}
        <div className="flex items-start sm:items-center gap-3.5">
          {/* 3-Lens Traffic Light Pod */}
          <div className="flex flex-col items-center gap-1.5 p-1.5 rounded-lg bg-[#0b0e14] border border-white/10 shrink-0 shadow-inner">
            <span
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                trafficState.light === 'RED'
                  ? 'bg-[#f43f5e] shadow-[0_0_12px_#f43f5e] scale-110'
                  : 'bg-[#f43f5e]/20'
              }`}
            />
            <span
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                trafficState.light === 'YELLOW'
                  ? 'bg-[#f59e0b] shadow-[0_0_12px_#f59e0b] scale-110'
                  : 'bg-[#f59e0b]/20'
              }`}
            />
            <span
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                trafficState.light === 'GREEN'
                  ? 'bg-[#10b981] shadow-[0_0_12px_#10b981] scale-110'
                  : 'bg-[#10b981]/20'
              }`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-mono text-[13px] sm:text-[14px] font-bold tracking-tight ${
                  trafficState.light === 'GREEN'
                    ? 'text-[#4edea3]'
                    : trafficState.light === 'YELLOW'
                    ? 'text-[#fcd34d]'
                    : 'text-[#ffb4ab]'
                }`}
              >
                {trafficState.light === 'GREEN'
                  ? '🟢 '
                  : trafficState.light === 'YELLOW'
                  ? '🟡 '
                  : '🔴 '}
                {trafficState.headline}
              </span>

              <span
                className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border tabular-nums ${
                  trafficState.light === 'GREEN'
                    ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                    : trafficState.light === 'YELLOW'
                    ? 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40'
                    : 'bg-[#f43f5e]/15 text-[#ffb4ab] border-[#f43f5e]/40'
                }`}
              >
                {trafficState.badgeText}
              </span>

              {showWhatIf && whatIfOffsetPct !== 0 && (
                <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 tabular-nums">
                  SIMULATING {whatIfOffsetPct > 0 ? `+${whatIfOffsetPct.toFixed(1)}%` : `${whatIfOffsetPct.toFixed(1)}%`} (${formatP(simulatedPrice)})
                </span>
              )}
            </div>

            <p className="font-sans text-[12px] text-[#e1e2eb] leading-relaxed max-w-3xl">
              {trafficState.subtext}
            </p>
          </div>
        </div>

        {/* Right Quick Summary Pill */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <div className="flex flex-col items-end px-2.5 py-1.5 rounded-lg bg-[#0b0e14]/90 border border-white/[0.07] font-mono">
            <span className="text-[9px] text-[#849495] uppercase">NEAREST KEY LEVEL</span>
            <span className="text-[12px] font-bold text-[#00f0ff] tabular-nums">
              {trafficState.nearestLevel.name}: ${formatP(trafficState.nearestLevel.price)}
            </span>
            <span className="text-[9px] text-[#b9cacb] tabular-nums">
              {trafficState.nearestLevel.distPct.toFixed(2)}% away
            </span>
          </div>

          {experienceMode === 'pro' && (
            <button
              type="button"
              onClick={() => setShowWhatIf((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0b0e14] hover:bg-[#191c22] text-[#00f0ff] border border-[#272a31] font-mono text-[10px] font-bold cursor-pointer"
              title="Test What-If Price Scenarios"
            >
              🎛️ WHAT-IF
            </button>
          )}
        </div>
      </div>

      {/* Interactive What-If Scenario Price Slider Drawer */}
      {showWhatIf && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#141821] border border-[#f59e0b]/40 font-mono text-[11px]">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[#fcd34d] font-bold uppercase">
                🎛️ WHAT-IF SCENARIO PRICE TESTER ({symbol})
              </span>
              <span className="text-[10px] text-[#849495]">
                Drag slider to see how Traffic Light &amp; Tab Confluence react at different prices
              </span>
            </div>
            <div className="text-[#e1e2eb] tabular-nums">
              Live Price: <strong>${formatP(currentPrice)}</strong> ➔ Simulated Price:{' '}
              <strong className="text-[#00f0ff]">${formatP(simulatedPrice)}</strong> (
              {whatIfOffsetPct >= 0 ? `+${whatIfOffsetPct.toFixed(1)}%` : `${whatIfOffsetPct.toFixed(1)}%`})
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#ffb4ab]">-5%</span>
            <input
              type="range"
              min={-5}
              max={5}
              step={0.2}
              value={whatIfOffsetPct}
              onChange={(e) => setWhatIfOffsetPct(parseFloat(e.target.value))}
              className="w-36 sm:w-48 accent-[#00f0ff] cursor-pointer"
            />
            <span className="text-[10px] text-[#4edea3]">+5%</span>
            <button
              type="button"
              onClick={() => setWhatIfOffsetPct(0)}
              className="px-2 py-1 rounded bg-[#191c22] hover:bg-[#272a31] text-[#e1e2eb] border border-[#272a31] text-[10px] cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Interactive Jargon Glossary & Rookie Onboarding Modal */}
      {showGlossaryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => onToggleGlossaryModal(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#121620] border border-[#00f0ff]/40 shadow-[0_16px_50px_rgba(0,0,0,0.8)] p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#272a31] pb-3">
              <div>
                <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">
                  🎓 VERTEX QUANT ROOKIE ACADEMY // LIVE ASSET: {symbol}
                </span>
                <h3 className="font-sans text-[18px] font-bold text-[#e1e2eb]">
                  Interactive Institutional Jargon Glossary &amp; Workflow Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onToggleGlossaryModal(false)}
                className="px-3 py-1 rounded-lg bg-[#191c22] hover:bg-[#272a31] text-[#e1e2eb] border border-[#272a31] font-mono text-[11px] font-bold cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* 4-Step Quick Onboarding Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-[#0b0e14] p-3 rounded-xl border border-[#272a31]">
              <div className="p-2 rounded bg-[#141821] border border-white/[0.05]">
                <div className="font-mono text-[10px] text-[#00f0ff] font-bold">1. TRAFFIC LIGHT</div>
                <p className="font-sans text-[11px] text-[#b9cacb] mt-1">
                  Only look for trades when the banner is <strong>Green</strong> or approaching a <strong>Yellow</strong> reaction zone.
                </p>
              </div>
              <div className="p-2 rounded bg-[#141821] border border-white/[0.05]">
                <div className="font-mono text-[10px] text-[#4edea3] font-bold">2. TAB BADGES</div>
                <p className="font-sans text-[11px] text-[#b9cacb] mt-1">
                  Check the 5 Strategy Tab buttons. Green badges (<strong>≥70%</strong>) show where institutional edge is strongest.
                </p>
              </div>
              <div className="p-2 rounded bg-[#141821] border border-white/[0.05]">
                <div className="font-mono text-[10px] text-[#fcd34d] font-bold">3. PRE-FLIGHT 5/5</div>
                <p className="font-sans text-[11px] text-[#b9cacb] mt-1">
                  Scroll to the 5-Point Pre-Flight Checklist above the calculator. Aim for at least <strong>4/5 ✓</strong> checks.
                </p>
              </div>
              <div className="p-2 rounded bg-[#141821] border border-white/[0.05]">
                <div className="font-mono text-[10px] text-[#e879f9] font-bold">4. R:R BOX &amp; PAPER LOG</div>
                <p className="font-sans text-[11px] text-[#b9cacb] mt-1">
                  Inspect the green/red R:R box on the chart and click <strong>Log Paper Trade</strong> to test risk-free!
                </p>
              </div>
            </div>

            {/* Live Glossary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  term: 'POC (Point of Control)',
                  live: `$${formatP(volumeProfile.poc)}`,
                  meaning:
                    'The single price level with the most traded volume. Acts like a giant magnet pulling price back toward fair value.',
                },
                {
                  term: 'VAH & VAL (Value Area High / Low)',
                  live: `$${formatP(volumeProfile.vah)} / $${formatP(volumeProfile.val)}`,
                  meaning:
                    'The upper and lower boundaries where 70% of volume took place. Institutions buy near VAL and take profit near VAH.',
                },
                {
                  term: 'Order Block (Bull OB / Bear OB)',
                  live: bullOB ? `Bull OB $${formatP(bullOB.midpoint)}` : 'Scanning...',
                  meaning:
                    'Footprint zones where institutional whales placed massive buy or sell orders before a big move. Price often bounces when revisiting them.',
                },
                {
                  term: '💧 VDU (Volume Dry-Up)',
                  live: 'RVOL ≤ 0.45x',
                  meaning:
                    'When volume drops below 45% of average during a pullback, it means sellers are exhausted—setting up a spring-loaded bounce.',
                },
                {
                  term: 'Rolling Sharpe & Sortino Ratio',
                  live: `${sharpeSortino.sharpeRatio.toFixed(2)} / ${sharpeSortino.sortinoRatio.toFixed(2)}`,
                  meaning:
                    'Measures return vs. volatility. Sharpe ≥ 1.0 means clean trend; Sharpe near 0 means noisy chop where breakouts fail.',
                },
                {
                  term: 'Net GEX & Max Pain (Options)',
                  live: `${telemetry.netGex >= 0 ? '+' : ''}$${telemetry.netGex}M / MP $${formatP(optionsData.maxPain)}`,
                  meaning:
                    'Positive GEX means options dealers dampen volatility and pin price toward Max Pain. Negative GEX means explosive moves.',
                },
              ].map((item) => (
                <div
                  key={item.term}
                  className="p-3 rounded-xl bg-[#191c22] border border-[#272a31] flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#00f0ff]">
                      {item.term}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#0b0e14] text-[#4edea3] border border-[#272a31] tabular-nums">
                      {symbol}: {item.live}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-[#b9cacb] leading-relaxed">
                    {item.meaning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
