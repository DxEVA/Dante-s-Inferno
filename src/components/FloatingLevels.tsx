import React from 'react';
import { VolumeProfile, OrderBlock, DeribitOptionsData, LiquidityLevels } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { ChartLayers } from './QuantChart';

interface FloatingLevelsProps {
  vp: VolumeProfile;
  bullOB: OrderBlock | null;
  bearOB: OrderBlock | null;
  options: DeribitOptionsData;
  liquidity?: LiquidityLevels;
  symbol?: string;
  currentPrice?: number;
  onHoverLevel?: (level: { label: string; price: number } | null) => void;
  activeLayers?: ChartLayers;
}

export const FloatingLevels: React.FC<FloatingLevelsProps> = ({
  vp,
  bullOB,
  bearOB,
  options,
  liquidity,
  symbol = 'BTCUSDT',
  currentPrice = 89000,
  onHoverLevel,
  activeLayers,
}) => {
  const formatPrice = (p: number) => {
    if (!p) return '$0';
    if (p >= 1000) {
      return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    if (p >= 1) {
      return `$${p.toFixed(2)}`;
    }
    return `$${p.toFixed(4)}`;
  };

  const formatShortK = (p: number) => {
    if (!p) return '$0';
    if (p >= 1000) {
      return `$${(p / 1000).toFixed(1)}K`;
    }
    return `$${p.toFixed(2)}`;
  };

  const getDist = (target: number) => {
    if (!target || !currentPrice) return '0.00%';
    const pct = (Math.abs(currentPrice - target) / target) * 100;
    return `${pct.toFixed(2)}%`;
  };

  // Check if layers are enabled (default to true if no activeLayers prop provided)
  const showVp = activeLayers ? activeLayers.vp : true;
  const showOb = activeLayers ? activeLayers.ob : true;
  const showSr = activeLayers ? activeLayers.sr : true;
  const showOptions = activeLayers ? activeLayers.options : true;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap z-10">
      {/* 1. Volume Profile Pills */}
      {showVp && (
        <>
          {/* VAH */}
          <InfoTooltip
            content={{
              title: 'VAH (Value Area High)',
              metricKey: 'volume_profile',
              symbol,
              categoryBadge: 'VOLUME PROFILE',
              badgeColor: '#00f0ff',
              whatItIs: 'The upper boundary containing 70% of historical trading volume during the active session profile.',
              liveRead: `${symbol} is currently $${formatPrice(currentPrice)}, trading ${
                currentPrice > vp.vah ? 'ABOVE' : currentPrice < vp.vah ? 'BELOW' : 'DIRECTLY AT'
              } its $${formatPrice(vp.vah)} VAH (${getDist(vp.vah)} distance).`,
              actionability:
                currentPrice > vp.vah
                  ? 'Acceptance above VAH indicates bullish price discovery; look for retests of VAH to act as dynamic support.'
                  : 'Failure to accept above VAH indicates auction rejection; target rotation back toward the high-volume POC.',
            }}
          >
            <div
              onMouseEnter={() => onHoverLevel?.({ label: 'VAH (70% Value High)', price: vp.vah })}
              onMouseLeave={() => onHoverLevel?.(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0b0e14] hover:bg-[#121620] border border-[#272a31] hover:border-[#00f0ff]/50 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-0.5 bg-[#00f0ff]"></span>
              <span className="text-[#849495] text-[9px] uppercase font-semibold">VAH</span>
              <span className="text-[#00f0ff] font-medium">{formatPrice(vp.vah)}</span>
            </div>
          </InfoTooltip>

          {/* POC */}
          <InfoTooltip
            content={{
              title: 'POC (Point of Control)',
              metricKey: 'volume_profile',
              symbol,
              categoryBadge: 'VOLUME PROFILE',
              badgeColor: '#f59e0b',
              whatItIs: 'The exact price level where the highest volume was transacted, acting as fair-value equilibrium gravity.',
              liveRead: `${symbol} is currently $${formatPrice(currentPrice)}, trading ${
                currentPrice > vp.poc ? 'ABOVE' : currentPrice < vp.poc ? 'BELOW' : 'DIRECTLY ON'
              } its $${formatPrice(vp.poc)} POC (${getDist(vp.poc)} distance). ${
                currentPrice > vp.poc ? 'Buyers maintain upper-hand over fair value.' : 'Sellers maintain short-term control under fair value.'
              }`,
              actionability: `Use POC ($${formatPrice(vp.poc)}) as primary equilibrium magnetic pullback target or breakout confirmation pivot.`,
            }}
          >
            <div
              onMouseEnter={() => onHoverLevel?.({ label: 'POC (Point of Control)', price: vp.poc })}
              onMouseLeave={() => onHoverLevel?.(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0b0e14] hover:bg-[#121620] border border-[#f59e0b]/40 hover:border-[#f59e0b] font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.15)] transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-0.5 bg-[#f59e0b]"></span>
              <span className="text-[#f59e0b] text-[9px] uppercase font-semibold">POC</span>
              <span className="text-[#fcd34d] font-semibold">{formatPrice(vp.poc)}</span>
            </div>
          </InfoTooltip>

          {/* VAL */}
          <InfoTooltip
            content={{
              title: 'VAL (Value Area Low)',
              metricKey: 'volume_profile',
              symbol,
              categoryBadge: 'VOLUME PROFILE',
              badgeColor: '#00f0ff',
              whatItIs: 'The lower boundary containing 70% of historical trading volume during the active session profile.',
              liveRead: `${symbol} is currently $${formatPrice(currentPrice)}, trading ${
                currentPrice > vp.val ? 'ABOVE' : currentPrice < vp.val ? 'BELOW' : 'DIRECTLY AT'
              } its $${formatPrice(vp.val)} VAL (${getDist(vp.val)} distance).`,
              actionability:
                currentPrice > vp.val
                  ? 'Holding above VAL provides asymmetric risk/reward long entries targeting mean-reversion rotation toward POC.'
                  : 'Clean breakdown below VAL signals aggressive markdown; look for swift tests of deeper liquidity pools.',
            }}
          >
            <div
              onMouseEnter={() => onHoverLevel?.({ label: 'VAL (70% Value Low)', price: vp.val })}
              onMouseLeave={() => onHoverLevel?.(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0b0e14] hover:bg-[#121620] border border-[#272a31] hover:border-[#00f0ff]/50 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-0.5 bg-[#00f0ff]"></span>
              <span className="text-[#849495] text-[9px] uppercase font-semibold">VAL</span>
              <span className="text-[#00f0ff] font-medium">{formatPrice(vp.val)}</span>
            </div>
          </InfoTooltip>
        </>
      )}

      {/* 2. Order Block Pills */}
      {showOb && bullOB && (
        <InfoTooltip
          content={{
            title: `BULLISH OB [${bullOB.status || 'UNMITIGATED'} • Q:${bullOB.qualityScore ?? 80}/100]`,
            metricKey: 'order_blocks',
            symbol,
            categoryBadge: 'SMART MONEY CONCEPTS',
            badgeColor: '#4edea3',
            whatItIs: 'Institutional demand zone verified via ATR displacement, Fair Value Gap (FVG) creation, and Taker Delta footprint spike.',
            liveRead: `${bullOB.status === 'PARTIAL' ? `Partially mitigated (${bullOB.mitigationPct}% eaten)` : 'Unmitigated'} Bull OB spans $${formatPrice(bullOB.low)} – $${formatPrice(bullOB.high)} (50% Mean Threshold: $${formatPrice(bullOB.midpoint)}, Quality Score: ${bullOB.qualityScore ?? 80}/100).`,
            actionability: `Look for passive limit bid absorption inside $${formatPrice(bullOB.low)}–$${formatPrice(bullOB.midpoint)} with hard invalidation below $${formatPrice(bullOB.low)}.`,
          }}
        >
          <div
            onMouseEnter={() => onHoverLevel?.({ label: `BULL OB 50% MT (Q:${bullOB.qualityScore ?? 80})`, price: bullOB.midpoint })}
            onMouseLeave={() => onHoverLevel?.(null)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#00a572]/20 hover:bg-[#00a572]/30 border border-[#00a572]/40 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
            <span className="text-[#4edea3] text-[9px] font-bold uppercase">
              BULL OB {bullOB.status === 'PARTIAL' ? `(${bullOB.mitigationPct}% MIT)` : ''}
            </span>
            <span className="text-[#6ffbbe] font-medium">
              {formatShortK(bullOB.low)}–{formatShortK(bullOB.high)}
            </span>
            <span className="text-[9px] px-1 rounded bg-[#0b0e14]/70 text-[#4edea3] font-bold">
              Q:{bullOB.qualityScore ?? 80}
            </span>
          </div>
        </InfoTooltip>
      )}

      {showOb && bearOB && (
        <InfoTooltip
          content={{
            title: `BEARISH OB [${bearOB.status || 'UNMITIGATED'} • Q:${bearOB.qualityScore ?? 80}/100]`,
            metricKey: 'order_blocks',
            symbol,
            categoryBadge: 'SMART MONEY CONCEPTS',
            badgeColor: '#ffb4ab',
            whatItIs: 'Institutional supply zone verified via ATR markdown displacement, Fair Value Gap (FVG) creation, and Taker Sell footprint spike.',
            liveRead: `${bearOB.status === 'PARTIAL' ? `Partially mitigated (${bearOB.mitigationPct}% eaten)` : 'Unmitigated'} Bear OB spans $${formatPrice(bearOB.low)} – $${formatPrice(bearOB.high)} (50% Mean Threshold: $${formatPrice(bearOB.midpoint)}, Quality Score: ${bearOB.qualityScore ?? 80}/100).`,
            actionability: `Anticipate passive ask wall defense at the 50% Mean Threshold ($${formatPrice(bearOB.midpoint)}) with invalidation above $${formatPrice(bearOB.high)}.`,
          }}
        >
          <div
            onMouseEnter={() => onHoverLevel?.({ label: `BEAR OB 50% MT (Q:${bearOB.qualityScore ?? 80})`, price: bearOB.midpoint })}
            onMouseLeave={() => onHoverLevel?.(null)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#93000a]/30 hover:bg-[#93000a]/40 border border-[#93000a]/50 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]"></span>
            <span className="text-[#ffb4ab] text-[9px] font-bold uppercase">
              BEAR OB {bearOB.status === 'PARTIAL' ? `(${bearOB.mitigationPct}% MIT)` : ''}
            </span>
            <span className="text-[#ffb4ab] font-medium">
              {formatShortK(bearOB.low)}–{formatShortK(bearOB.high)}
            </span>
            <span className="text-[9px] px-1 rounded bg-[#0b0e14]/70 text-[#ffb4ab] font-bold">
              Q:{bearOB.qualityScore ?? 80}
            </span>
          </div>
        </InfoTooltip>
      )}

      {/* 3. Support & Resistance / Orderbook Liquidity Pills */}
      {showSr && liquidity && liquidity.askLiquidityPrice > 0 && (
        <InfoTooltip
          content={{
            title: 'RESISTANCE / ORDERBOOK ASKS',
            metricKey: 'cvd_divergence',
            symbol,
            categoryBadge: 'DEPTH ORDERBOOK',
            badgeColor: '#ffb4ab',
            whatItIs: 'Resting limit sell orders and macro swing fractal resistance detected from the 500-level orderbook.',
            liveRead: `Resting Ask Wall of ${liquidity.askLiquidityQty?.toFixed(1) || '1.8K'} contracts is stationed at $${formatPrice(liquidity.askLiquidityPrice)} (${getDist(liquidity.askLiquidityPrice)} overhead).`,
            actionability: `Overhead ceiling zone. A high-volume ignition surge (>= 2.0x RVOL) is required to break through resting asks.`,
          }}
        >
          <div
            onMouseEnter={() => onHoverLevel?.({ label: 'ORDERBOOK ASK WALL', price: liquidity.askLiquidityPrice })}
            onMouseLeave={() => onHoverLevel?.(null)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#ffb4ab]/10 hover:bg-[#ffb4ab]/20 border border-[#ffb4ab]/30 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]"></span>
            <span className="text-[#ffb4ab] text-[9px] font-bold uppercase">RES</span>
            <span className="text-[#e1e2eb] font-medium">{formatPrice(liquidity.askLiquidityPrice)}</span>
          </div>
        </InfoTooltip>
      )}

      {showSr && liquidity && liquidity.bidLiquidityPrice > 0 && (
        <InfoTooltip
          content={{
            title: 'SUPPORT / ORDERBOOK BIDS',
            metricKey: 'cvd_divergence',
            symbol,
            categoryBadge: 'DEPTH ORDERBOOK',
            badgeColor: '#4edea3',
            whatItIs: 'Resting limit buy orders and macro swing fractal support detected from the 500-level orderbook.',
            liveRead: `Resting Bid Wall of ${liquidity.bidLiquidityQty?.toFixed(1) || '1.2K'} contracts is placed at $${formatPrice(liquidity.bidLiquidityPrice)} (${getDist(liquidity.bidLiquidityPrice)} below spot).`,
            actionability: `Defensive floor zone. Resting bids absorb aggressive market sellers; failure of this wall triggers stop-runs.`,
          }}
        >
          <div
            onMouseEnter={() => onHoverLevel?.({ label: 'ORDERBOOK BID WALL', price: liquidity.bidLiquidityPrice })}
            onMouseLeave={() => onHoverLevel?.(null)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#4edea3]/10 hover:bg-[#4edea3]/20 border border-[#4edea3]/30 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
            <span className="text-[#4edea3] text-[9px] font-bold uppercase">SUP</span>
            <span className="text-[#e1e2eb] font-medium">{formatPrice(liquidity.bidLiquidityPrice)}</span>
          </div>
        </InfoTooltip>
      )}

      {/* 4. Options Derivatives Pills */}
      {showOptions && (
        <>
          {/* ZERO-GAMMA FLIP LEVEL */}
          {options.zeroGammaLevel && options.zeroGammaLevel > 0 && (
            <InfoTooltip
              content={{
                title: 'ZERO-GAMMA FLIP (0-Γ)',
                metricKey: 'zero_gamma_basis',
                symbol,
                categoryBadge: 'BLACK-SCHOLES GEX',
                badgeColor: '#00f0ff',
                whatItIs: 'The Black-Scholes strike transition where aggregate dealer Gamma Exposure (GEX) flips from positive (mean-reverting) to negative (volatility-amplifying).',
                liveRead: `${symbol} ($${formatPrice(currentPrice)}) is ${
                  currentPrice >= options.zeroGammaLevel ? 'ABOVE (+Γ Pinning Regime)' : 'BELOW (-Γ Acceleration Regime)'
                } the Zero-Gamma Flip at $${formatPrice(options.zeroGammaLevel)} (${getDist(options.zeroGammaLevel)} distance).`,
                actionability:
                  currentPrice >= options.zeroGammaLevel
                    ? 'Dealers are Long Gamma above 0-Γ and sell rips / buy dips, dampening volatility.'
                    : 'Dealers are Short Gamma below 0-Γ and hedge in the direction of price movement, amplifying directional breakouts.',
              }}
            >
              <div
                onMouseEnter={() => onHoverLevel?.({ label: 'ZERO-GAMMA FLIP (0-Γ)', price: options.zeroGammaLevel! })}
                onMouseLeave={() => onHoverLevel?.(null)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 border border-[#00f0ff]/40 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
              >
                <span className="text-[10px]">⚡</span>
                <span className="text-[#00f0ff] text-[9px] uppercase font-bold">0-Γ FLIP</span>
                <span className="text-[#e1e2eb] font-semibold">{formatPrice(options.zeroGammaLevel)}</span>
              </div>
            </InfoTooltip>
          )}

          {/* MAX PAIN */}
          <InfoTooltip
            content={{
              title: 'MAX PAIN STRIKE',
              metricKey: 'net_gex',
              symbol,
              categoryBadge: 'DERIBIT OPTIONS',
              badgeColor: '#ddb7ff',
              whatItIs: 'The options strike price at which options contracts expire with the highest financial loss to buyers, exerting gravitational pinning pull.',
              liveRead: `${symbol} is currently $${formatPrice(currentPrice)}, trading ${
                currentPrice > options.maxPain ? 'ABOVE' : currentPrice < options.maxPain ? 'BELOW' : 'AT'
              } Max Pain strike $${formatPrice(options.maxPain)} (${getDist(options.maxPain)} delta).`,
              actionability: `As weekly/monthly options expiry approaches (08:00 UTC), delta hedging by market makers pulls price gravitationally toward $${formatPrice(options.maxPain)}.`,
            }}
          >
            <div
              onMouseEnter={() => onHoverLevel?.({ label: 'MAX PAIN STRIKE', price: options.maxPain })}
              onMouseLeave={() => onHoverLevel?.(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#eacfff]/15 hover:bg-[#eacfff]/25 border border-[#842bd2]/40 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
            >
              <span className="text-[10px]">🧲</span>
              <span className="text-[#f0dbff] text-[9px] uppercase font-semibold">MAX PAIN</span>
              <span className="text-[#fdf2ff] font-medium">{formatPrice(options.maxPain)}</span>
            </div>
          </InfoTooltip>

          {/* CALL WALL */}
          <InfoTooltip
            content={{
              title: 'CALL WALL STRIKE',
              metricKey: 'net_gex',
              symbol,
              categoryBadge: 'DERIBIT OPTIONS',
              badgeColor: '#ffb4ab',
              whatItIs: 'The strike with the largest open Call Open Interest where market makers hold heavy short call delta and sell underlying spot to hedge.',
              liveRead: `Options Call Wall is established at $${formatPrice(options.callWall)} (${getDist(options.callWall)} above spot).`,
              actionability: `Acts as a formidable upside institutional resistance barrier. A breakout above requires violent short squeeze dynamics.`,
            }}
          >
            <div
              onMouseEnter={() => onHoverLevel?.({ label: 'CALL WALL STRIKE', price: options.callWall })}
              onMouseLeave={() => onHoverLevel?.(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0b0e14] hover:bg-[#121620] border border-[#272a31] hover:border-[#ffb4ab]/40 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
            >
              <span className="text-[10px]">🧱</span>
              <span className="text-[#ffb4ab] text-[9px] uppercase font-semibold">CALL WALL</span>
              <span className="text-[#e1e2eb] font-medium">{formatPrice(options.callWall)}</span>
            </div>
          </InfoTooltip>

          {/* PUT WALL */}
          <InfoTooltip
            content={{
              title: 'PUT WALL STRIKE',
              metricKey: 'net_gex',
              symbol,
              categoryBadge: 'DERIBIT OPTIONS',
              badgeColor: '#4edea3',
              whatItIs: 'The strike with the largest open Put Open Interest where market makers hold long delta and buy underlying spot to hedge on dips.',
              liveRead: `Options Put Wall is anchored at $${formatPrice(options.putWall)} (${getDist(options.putWall)} below spot).`,
              actionability: `Acts as a solid institutional downside floor. If Put Wall fails, dealers become short gamma and aggressive sell-offs accelerate.`,
            }}
          >
            <div
              onMouseEnter={() => onHoverLevel?.({ label: 'PUT WALL STRIKE', price: options.putWall })}
              onMouseLeave={() => onHoverLevel?.(null)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0b0e14] hover:bg-[#121620] border border-[#272a31] hover:border-[#4edea3]/40 font-mono text-[10px] sm:text-[11px] tabular-nums shrink-0 transition-colors cursor-pointer"
            >
              <span className="text-[10px]">🛡️</span>
              <span className="text-[#4edea3] text-[9px] uppercase font-semibold">PUT WALL</span>
              <span className="text-[#e1e2eb] font-medium">{formatPrice(options.putWall)}</span>
            </div>
          </InfoTooltip>
        </>
      )}
    </div>
  );
};
