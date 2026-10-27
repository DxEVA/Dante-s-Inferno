import React from 'react';
import { TelemetryMetrics } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { getRookieMentorGuide } from '../utils/metricBenchmarks';

interface TelemetryCardsProps {
  metrics: TelemetryMetrics;
  symbol?: string;
  experienceMode?: 'rookie' | 'pro';
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  metrics,
  symbol = 'BTCUSDT',
  experienceMode = 'rookie',
}) => {
  const sharpe = metrics.sharpeRatio ?? 1.15;
  const sortino = metrics.sortinoRatio ?? 1.48;
  const efficiency = metrics.returnEfficiency ?? 0.62;
  const regime = metrics.sharpeRegime ?? 'Moderate Bullish Drift';

  const sharpeColor =
    sharpe >= 1.0 ? 'text-[#4edea3]' : sharpe >= 0 ? 'text-[#f59e0b]' : 'text-[#ffb4ab]';

  // Helper to clamp 0-100% for the 4px horizontal range track
  const clampPct = (val: number) => Math.max(4, Math.min(96, val));

  const fundingTrackPct = clampPct(50 + (metrics.fundingRate / 0.0005) * 40);
  const oiTrackPct = clampPct(50 + (metrics.oi4hDelta / 10) * 45);
  const sharpeTrackPct = clampPct(50 + (sharpe / 3.0) * 45);
  const zScoreTrackPct = clampPct(50 + (metrics.zScore / 3.0) * 45);
  const rsiTrackPct = clampPct(metrics.rsi14);
  const gexTrackPct = clampPct(50 + (metrics.netGex / 300) * 45);
  const skewTrackPct = clampPct(50 + (metrics.skew25d / 10) * 45);

  const renderRangeTrack = (pct: number, colorHex: string) => (
    <div className="w-full flex flex-col gap-1 pt-1">
      <div className="relative w-full h-[4px] rounded-full bg-gradient-to-r from-[#f43f5e]/40 via-[#849495]/25 to-[#10b981]/40">
        <span
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-white transition-all duration-500"
          style={{
            left: `${pct}%`,
            backgroundColor: colorHex,
            boxShadow: `0 0 8px ${colorHex}`,
          }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[8px] text-[#849495]">
        <span>BEAR EXTREME</span>
        <span>NEUTRAL</span>
        <span>BULL EXTREME</span>
      </div>
    </div>
  );

  const renderRookieCardFooter = (metricKey: string) => {
    if (experienceMode !== 'rookie') return null;
    const mentor = getRookieMentorGuide(metricKey, symbol);
    const primaryResource = mentor.resources[0];
    const videoResource = mentor.resources.find((r) => r.type === 'VIDEO') || mentor.resources[1];

    return (
      <div className="flex flex-col gap-1.5 pt-2 mt-1 border-t border-[#1e2433] text-left">
        <p className="font-sans text-[9.5px] text-[#b9cacb] leading-snug line-clamp-2">
          <strong className="text-[#fcd34d] font-mono">🔗 Bridge:</strong> {mentor.familiarBridge}
        </p>
        <div className="font-mono text-[8.5px] text-[#00f0ff] bg-[#0b0e14] px-1.5 py-0.5 rounded border border-[#1e2433] truncate">
          Normal: {mentor.standardRangeGuide.normal}
        </div>
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {primaryResource && (
            <a
              href={primaryResource.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/30 font-mono text-[8px] font-bold transition-colors"
              title={primaryResource.title}
            >
              📖 READ GUIDE ↗
            </a>
          )}
          {videoResource && (
            <a
              href={videoResource.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 rounded bg-[#f59e0b]/10 hover:bg-[#f59e0b]/25 text-[#fcd34d] border border-[#f59e0b]/30 font-mono text-[8px] font-bold transition-colors"
              title={videoResource.title}
            >
              ▶ WATCH VIDEO ↗
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col px-3 py-3 gap-2.5 bg-[#10131a] border-b border-[#272a31]">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">
            DERIVATIVES TELEMETRY &amp; QUANT ENGINE
          </span>
          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
            {symbol}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <InfoTooltip
            content={{
              title: 'TELEMETRY & DERIVATIVES ENGINE',
              metricKey: 'funding_rate',
              symbol,
              categoryBadge: 'QUANTITATIVE OVERVIEW',
              badgeColor: '#00f0ff',
              whatItIs: 'Real-time multi-source derivatives feed monitoring perpetual funding, open interest flows, statistical deviations, orderflow divergence, and options market maker positioning.',
              liveRead: `Telemetry active for ${symbol}. Funding is ${(metrics.fundingRate * 100).toFixed(4)}%, 4H OI Delta is ${metrics.oi4hDelta >= 0 ? '+' : ''}${metrics.oi4hDelta.toFixed(2)}%, and Rolling Sharpe is ${sharpe.toFixed(2)}.`,
              actionability: 'Synthesize these cards to identify whether retail or institutional smart money is driving the tape before committing risk.',
            }}
            inlineBadgeText={`ⓘ Guide For ${symbol}`}
          />
          <span className="font-mono text-[10px] text-[#849495]">UPDATED LIVE</span>
        </div>
      </div>

      {/* Rookie Plain-English Takeaway Banner for Telemetry */}
      {experienceMode === 'rookie' && (
        <div className="p-2.5 rounded-lg bg-[#141821]/95 border border-[#00f0ff]/30 flex items-start gap-2.5 shadow-[0_4px_20px_rgba(0,240,255,0.06)]">
          <span className="text-[15px] shrink-0">🎓</span>
          <div className="font-sans text-[11px] text-[#dbfcff] leading-relaxed">
            <strong className="text-[#00f0ff] font-mono uppercase">What this means in plain English: </strong>
            {sharpe >= 0.8
              ? `${symbol} is moving in a clean, profitable trend (Sharpe ${sharpe.toFixed(2)}) with ${metrics.oiBias.toLowerCase()} flow. Trend-following setups have the highest probability right now.`
              : Math.abs(sharpe) < 0.4
              ? `${symbol} is in a choppy back-and-forth range (Sharpe ${sharpe.toFixed(2)}). Avoid chasing breakouts—wait for price to dip to support or spike into resistance before acting.`
              : `${symbol} shows steady momentum with ${metrics.fundingBias.toLowerCase()} positioning and ${metrics.gexBias}. Use the 4px gauge dots below to see if any metric is stretched to an extreme.`}
          </div>
        </div>
      )}

      {/* Responsive Quant & Options Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {/* Card 1: FUNDING RATE */}
        <InfoTooltip
          content={{
            title: 'PERPETUAL FUNDING RATE',
            metricKey: 'funding_rate',
            symbol,
            categoryBadge: 'DERIVATIVES FLOW',
            badgeColor: '#4edea3',
            whatItIs: 'Periodic 8-hour payments exchanged between long and short perpetual futures traders to anchor perpetual price to spot index.',
            liveRead: `${symbol} funding is ${(metrics.fundingRate * 100).toFixed(4)}% per 8h (${metrics.fundingAnnualized.toFixed(2)}% APR) with ${metrics.fundingCountdown} until settlement. Bias: ${metrics.fundingBias}.`,
            actionability:
              metrics.fundingRate >= 0.0003
                ? 'High positive funding warns of crowded long leverage vulnerable to cascade long squeezes.'
                : metrics.fundingRate <= -0.0002
                ? 'Negative funding indicates crowded short positioning vulnerable to short squeezes.'
                : 'Neutral funding indicates balanced inventory; ideal condition for directional expansion.',
          }}
          className="w-full"
        >
          <div className="p-3 rounded-xl bg-[#141821]/90 backdrop-blur-md hover:bg-[#191e29] border border-white/[0.07] hover:border-[#00f0ff]/40 flex flex-col justify-between gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all cursor-pointer w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
                FUNDING RATE
              </span>
              <span className="material-symbols-outlined text-[#849495] text-[14px]">schedule</span>
            </div>

            <div className="flex flex-col tabular-nums">
              <div className="font-mono text-[16px] font-bold text-[#4edea3]">
                {metrics.fundingRate >= 0 ? '+' : ''}
                {(metrics.fundingRate * 100).toFixed(4)}%{' '}
                <span className="text-[10px] text-[#849495] font-normal">/8h</span>
              </div>
              <div className="font-mono text-[11px] text-[#b9cacb]">
                {metrics.fundingAnnualized.toFixed(2)}% Ann. • CD: {metrics.fundingCountdown}
              </div>
            </div>

            {renderRangeTrack(fundingTrackPct, '#4edea3')}

            <div className="flex items-center justify-between gap-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#f59e0b]/20 border border-[#f59e0b]/30 text-[#fcd34d] font-mono text-[9px] uppercase font-bold">
                {metrics.fundingBias}
              </span>
              {experienceMode === 'rookie' && (
                <span className="font-sans text-[9px] text-[#849495] truncate">
                  {metrics.fundingRate > 0.0002 ? 'Longs pay shorts' : 'Healthy fee balance'}
                </span>
              )}
            </div>

            {renderRookieCardFooter('funding_rate')}
          </div>
        </InfoTooltip>

        {/* Card 2: OI 4H DELTA */}
        <InfoTooltip
          content={{
            title: '4-HOUR OPEN INTEREST DELTA',
            metricKey: 'oi_delta',
            symbol,
            categoryBadge: 'LEVERAGE FLOW',
            badgeColor: '#4edea3',
            whatItIs: 'The percentage change in total open perpetual contracts alongside price delta over the last 4 hours.',
            liveRead: `${symbol} OI has changed ${metrics.oi4hDelta >= 0 ? '+' : ''}${metrics.oi4hDelta.toFixed(2)}% while price shifted ${metrics.price4hDelta >= 0 ? '+' : ''}${metrics.price4hDelta.toFixed(2)}% (${metrics.oiBias}).`,
            actionability:
              metrics.oiBias === 'Long Build'
                ? 'Fresh capital entering long; healthy institutional accumulation backing the uptrend.'
                : metrics.oiBias === 'Short Cover'
                ? 'Price rising while OI drops; gains are driven by short covering rather than aggressive organic buying.'
                : metrics.oiBias === 'Short Build'
                ? 'Fresh aggressive short positions opening; expect resistance at swing highs.'
                : 'Long positions liquidating; caution against buying falling knives.',
          }}
          className="w-full"
        >
          <div className="p-3 rounded-xl bg-[#141821]/90 backdrop-blur-md hover:bg-[#191e29] border border-white/[0.07] hover:border-[#00f0ff]/40 flex flex-col justify-between gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all cursor-pointer w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
                OI 4H DELTA
              </span>
              <span className="material-symbols-outlined text-[#4edea3] text-[14px]">
                stacked_line_chart
              </span>
            </div>

            <div className="flex flex-col tabular-nums">
              <div
                className={`font-mono text-[16px] font-bold ${
                  metrics.oi4hDelta >= 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
                }`}
              >
                {metrics.oi4hDelta >= 0 ? '+' : ''}
                {metrics.oi4hDelta.toFixed(2)}% OI Δ
              </div>
              <div className="font-mono text-[11px] text-[#b9cacb]">
                {metrics.price4hDelta >= 0 ? '+' : ''}
                {metrics.price4hDelta.toFixed(2)}% Price Δ (Co-Trend)
              </div>
            </div>

            {renderRangeTrack(oiTrackPct, metrics.oi4hDelta >= 0 ? '#4edea3' : '#f43f5e')}

            <div className="flex items-center justify-between gap-1">
              <span
                className={`inline-block px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold border ${
                  metrics.oiBias === 'Long Build' || metrics.oiBias === 'Short Cover'
                    ? 'bg-[#00a572]/20 border-[#00a572]/40 text-[#4edea3]'
                    : 'bg-[#93000a]/20 border-[#93000a]/40 text-[#ffb4ab]'
                }`}
              >
                {metrics.oiBias}
              </span>
              {experienceMode === 'rookie' && (
                <span className="font-sans text-[9px] text-[#849495] truncate">
                  {metrics.oi4hDelta >= 0 ? 'New money entering' : 'Positions closing'}
                </span>
              )}
            </div>

            {renderRookieCardFooter('oi_delta')}
          </div>
        </InfoTooltip>

        {/* Card 3: ROLLING SHARPE & SORTINO RATIO */}
        <InfoTooltip
          content={{
            title: 'ROLLING SHARPE & SORTINO RATIO',
            metricKey: 'sharpe_sortino',
            symbol,
            categoryBadge: 'QUANTITATIVE RISK',
            badgeColor: '#00f0ff',
            whatItIs: 'Risk-adjusted return metrics measuring return per unit of total risk (Sharpe), downside risk only (Sortino), and directional trend efficiency (Kaufman).',
            liveRead: `${symbol} Rolling Sharpe is ${sharpe.toFixed(2)} (${regime}), Sortino Ratio is ${sortino.toFixed(2)}, and Kaufman Trend Efficiency is ${(efficiency * 100).toFixed(0)}%.`,
            actionability:
              sharpe >= 1.0
                ? `${symbol} volatility strongly rewards trend-following and momentum expansion strategies (High Risk-Adjusted Edge).`
                : Math.abs(sharpe) < 0.5
                ? `${symbol} is in a low-efficiency chop regime; strictly favor mean-reversion range fading into key S/R rather than breakout chasing.`
                : `${symbol} is exhibiting steady directional drift; size positions cautiously on pullbacks.`,
          }}
          className="w-full"
        >
          <div className="p-3 rounded-xl bg-[#141821]/90 backdrop-blur-md hover:bg-[#191e29] border border-[#00f0ff]/30 hover:border-[#00f0ff] flex flex-col justify-between gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all cursor-pointer w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">
                SHARPE &amp; SORTINO
              </span>
              <span className="material-symbols-outlined text-[#00f0ff] text-[14px]">
                monitoring
              </span>
            </div>

            <div className="flex flex-col tabular-nums">
              <div className={`font-mono text-[16px] font-bold ${sharpeColor}`}>
                {sharpe >= 0 ? '+' : ''}
                {sharpe.toFixed(2)} <span className="text-[10px] text-[#849495] font-normal">Sharpe</span>
              </div>
              <div className="font-mono text-[11px] text-[#b9cacb]">
                Sortino: <strong className="text-[#dbfcff]">{sortino.toFixed(2)}</strong> • Eff: <strong className="text-[#4edea3]">{(efficiency * 100).toFixed(0)}%</strong>
              </div>
            </div>

            {renderRangeTrack(sharpeTrackPct, sharpe >= 1.0 ? '#4edea3' : sharpe >= 0 ? '#f59e0b' : '#f43f5e')}

            <div className="flex items-center justify-between gap-1">
              <span
                className={`inline-block px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold border truncate max-w-full ${
                  sharpe >= 1.0
                    ? 'bg-[#00a572]/20 border-[#00a572]/40 text-[#4edea3]'
                    : sharpe >= 0.5
                    ? 'bg-[#f59e0b]/20 border-[#f59e0b]/40 text-[#fcd34d]'
                    : Math.abs(sharpe) < 0.5
                    ? 'bg-[#00f0ff]/15 border-[#00f0ff]/30 text-[#00f0ff]'
                    : 'bg-[#93000a]/20 border-[#93000a]/40 text-[#ffb4ab]'
                }`}
              >
                {regime.split('(')[0].trim()}
              </span>
            </div>

            {renderRookieCardFooter('sharpe_sortino')}
          </div>
        </InfoTooltip>

        {/* Card 4: STATISTICAL Z-SCORE */}
        <InfoTooltip
          content={{
            title: 'STATISTICAL Z-SCORE (50-VWMA)',
            metricKey: 'z_score',
            symbol,
            categoryBadge: 'STATISTICAL ARBITRAGE',
            badgeColor: '#f59e0b',
            whatItIs: 'Standard deviation measure of current spot price displacement away from its 50-period Volume-Weighted Moving Average baseline.',
            liveRead: `${symbol} is currently ${metrics.zScore >= 0 ? '+' : ''}${metrics.zScore.toFixed(2)} σ away from VWMA50 ($${metrics.vwma50.toFixed(2)}). Status: ${metrics.zScoreBias}.`,
            actionability:
              Math.abs(metrics.zScore) >= 2.0
                ? 'Extreme ±2.0σ statistical overextension; high probability of aggressive mean-reversion snapback.'
                : 'Normal distribution range; trend continuation has room to run before hitting statistical exhaustion.',
          }}
          className="w-full"
        >
          <div className="p-3 rounded-xl bg-[#141821]/90 backdrop-blur-md hover:bg-[#191e29] border border-white/[0.07] hover:border-[#00f0ff]/40 flex flex-col justify-between gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all cursor-pointer w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
                STATISTICAL Z-SCORE
              </span>
              <span className="material-symbols-outlined text-[#849495] text-[14px]">tune</span>
            </div>

            <div className="flex flex-col tabular-nums">
              <div
                className={`font-mono text-[16px] font-bold ${
                  Math.abs(metrics.zScore) >= 1.5 ? 'text-[#fcd34d]' : 'text-[#dbfcff]'
                }`}
              >
                {metrics.zScore >= 0 ? '+' : ''}
                {metrics.zScore.toFixed(2)} σ
              </div>
              <div className="font-mono text-[11px] text-[#b9cacb]">
                from VWMA50 ($
                {metrics.vwma50 >= 1000
                  ? metrics.vwma50.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : metrics.vwma50.toFixed(2)}
                )
              </div>
            </div>

            {renderRangeTrack(zScoreTrackPct, '#f59e0b')}

            <div className="flex items-center justify-between gap-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#f59e0b]/20 border border-[#f59e0b]/30 text-[#fcd34d] font-mono text-[9px] uppercase font-bold truncate">
                {metrics.zScoreBias}
              </span>
            </div>

            {renderRookieCardFooter('z_score')}
          </div>
        </InfoTooltip>

        {/* Card 5: DIVERGENCE SCAN */}
        <InfoTooltip
          content={{
            title: 'MOMENTUM & CVD DIVERGENCE',
            metricKey: 'cvd_delta',
            symbol,
            categoryBadge: 'ORDERFLOW MOMENTUM',
            badgeColor: '#4edea3',
            whatItIs: 'Cross-examination of 14-period RSI price momentum vs Cumulative Volume Delta (CVD) market order aggression.',
            liveRead: `RSI 14 is at ${metrics.rsi14.toFixed(1)} with recent CVD taker delta of ${metrics.cvdDelta >= 0 ? '+' : ''}${metrics.cvdDelta.toFixed(0)} contracts. Regime: ${metrics.divergenceBias}.`,
            actionability:
              metrics.divergenceBias.includes('Absorption')
                ? 'Passive limit buyers are absorbing retail market dumps; prime reversal territory.'
                : metrics.divergenceBias.includes('Squeeze')
                ? 'Strong buyer momentum confirmed by rising taker CVD; ride momentum.'
                : 'Monitor for divergence at key structural support and resistance levels.',
          }}
          className="w-full"
        >
          <div className="p-3 rounded-xl bg-[#141821]/90 backdrop-blur-md hover:bg-[#191e29] border border-white/[0.07] hover:border-[#00f0ff]/40 flex flex-col justify-between gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all cursor-pointer w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
                DIVERGENCE SCAN
              </span>
              <span className="material-symbols-outlined text-[#4edea3] text-[14px]">
                compare_arrows
              </span>
            </div>

            <div className="flex flex-col tabular-nums">
              <div className="font-mono text-[16px] font-bold text-[#e1e2eb]">
                RSI 14: {metrics.rsi14.toFixed(1)}
              </div>
              <div className="font-mono text-[11px] text-[#4edea3]">
                CVD Delta: {metrics.cvdDelta >= 0 ? '+' : ''}
                {Math.abs(metrics.cvdDelta) >= 1000
                  ? `${(metrics.cvdDelta / 1000).toFixed(1)}K`
                  : metrics.cvdDelta.toFixed(0)}
              </div>
            </div>

            {renderRangeTrack(rsiTrackPct, '#4edea3')}

            <div className="flex items-center justify-between gap-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#00a572]/20 border border-[#00a572]/40 text-[#4edea3] font-mono text-[9px] uppercase font-bold truncate">
                {metrics.divergenceBias}
              </span>
            </div>

            {renderRookieCardFooter('cvd_delta')}
          </div>
        </InfoTooltip>

        {/* Card 6: DEALER GAMMA REGIME */}
        <InfoTooltip
          content={{
            title: 'OPTIONS DEALER GAMMA REGIME (NET GEX)',
            metricKey: 'gex_gamma',
            symbol,
            categoryBadge: 'OPTIONS MARKET MAKING',
            badgeColor: '#ddb7ff',
            whatItIs: 'Total net gamma exposure across active options strikes revealing whether market makers must trade against volatility (pinning) or with it (acceleration).',
            liveRead: `Net GEX stands at ${metrics.netGex >= 0 ? '+' : ''}$${metrics.netGex}M (${metrics.gexBias}) with ${metrics.gexExpiry}.`,
            actionability:
              metrics.netGex >= 0
                ? '+GEX regime: Dealers buy dips and sell rips to stay delta-neutral, dampening volatility and pinning price toward Max Pain.'
                : '-GEX regime: Dealers sell breakdowns and buy breakouts, magnifying volatility and triggering violent moves.',
          }}
          className="w-full"
        >
          <div className="p-3 rounded-xl bg-[#141821]/90 backdrop-blur-md hover:bg-[#191e29] border border-white/[0.07] hover:border-[#00f0ff]/40 flex flex-col justify-between gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all cursor-pointer w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#ddb7ff] uppercase font-semibold">
                GAMMA REGIME
              </span>
              <span className="material-symbols-outlined text-[#ddb7ff] text-[14px]">radar</span>
            </div>

            <div className="flex flex-col tabular-nums">
              <div className="font-mono text-[16px] font-bold text-[#fdf2ff]">
                {metrics.netGex >= 0 ? '+' : ''}${metrics.netGex}M Net GEX
              </div>
              <div className="font-mono text-[11px] text-[#b9cacb]">
                {metrics.gexExpiry}
              </div>
            </div>

            {renderRangeTrack(gexTrackPct, '#ddb7ff')}

            <div className="flex items-center justify-between gap-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#842bd2]/25 border border-[#842bd2]/40 text-[#f0dbff] font-mono text-[9px] uppercase font-bold truncate">
                {metrics.gexBias}
              </span>
            </div>

            {renderRookieCardFooter('gex_gamma')}
          </div>
        </InfoTooltip>

        {/* Card 7: OPTIONS FLOW & SKEW */}
        <InfoTooltip
          content={{
            title: 'OPTIONS SKEW & PUT/CALL RATIO',
            metricKey: 'options_skew',
            symbol,
            categoryBadge: 'DERIBIT OPTIONS FLOW',
            badgeColor: '#842bd2',
            whatItIs: '25-delta risk reversal skew measuring the implied volatility premium of out-of-the-money Calls vs Puts alongside Put/Call OI ratio.',
            liveRead: `Put/Call Ratio is ${metrics.pcRatio.toFixed(2)} with 25Δ Skew at ${metrics.skew25d >= 0 ? '+' : ''}${metrics.skew25d.toFixed(1)}% (${metrics.skewBias}).`,
            actionability:
              metrics.skew25d >= 0
                ? 'Positive call skew indicates heavy institutional upside speculation and demand for upside tail risk.'
                : 'Negative put skew indicates elevated fear and hedging demand against market crash.',
          }}
          className="w-full"
        >
          <div className="p-3 rounded-xl bg-[#141821]/90 backdrop-blur-md hover:bg-[#191e29] border border-white/[0.07] hover:border-[#00f0ff]/40 flex flex-col justify-between gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all cursor-pointer w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#849495] uppercase font-semibold">
                OPTIONS SKEW
              </span>
              <span className="material-symbols-outlined text-[#849495] text-[14px]">swap_horiz</span>
            </div>

            <div className="flex flex-col tabular-nums">
              <div className="font-mono text-[16px] font-bold text-[#e1e2eb]">
                P/C Ratio: {metrics.pcRatio.toFixed(2)}
              </div>
              <div className="font-mono text-[11px] text-[#ddb7ff]">
                25Δ Skew: {metrics.skew25d >= 0 ? '+' : ''}
                {metrics.skew25d.toFixed(1)}% Call Prem
              </div>
            </div>

            {renderRangeTrack(skewTrackPct, '#842bd2')}

            <div className="flex items-center justify-between gap-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#842bd2]/20 border border-[#842bd2]/30 text-[#f0dbff] font-mono text-[9px] uppercase font-bold truncate">
                {metrics.skewBias}
              </span>
            </div>

            {renderRookieCardFooter('options_skew')}
          </div>
        </InfoTooltip>

        {/* Card 8: ZERO-GAMMA FLIP & SPOT/PERP BASIS */}
        <InfoTooltip
          content={{
            title: 'BLACK-SCHOLES ZERO-GAMMA FLIP & SPOT/PERP BASIS',
            metricKey: 'session_rvol',
            symbol,
            categoryBadge: 'GAMMA & BASIS MICROSTRUCTURE',
            badgeColor: '#00f0ff',
            whatItIs:
              'Black-Scholes Zero-Gamma strike where dealer hedging flips from volatility-suppressing (+GEX) to volatility-amplifying (-GEX), paired with Spot vs. Perpetual futures basis.',
            liveRead: `Zero-Gamma Flip is at $${(metrics.zeroGammaLevel || metrics.vwma50).toLocaleString(undefined, { maximumFractionDigits: 2 })} with Perp Basis at ${(metrics.basisBps ?? 1.5).toFixed(1)} bps (${metrics.spotPerpDivergence?.headline || 'Balanced Flow'}).`,
            actionability:
              'Above Zero-Gamma Flip, dealers dampen volatility (fade extremes); below Zero-Gamma Flip, dealer hedging accelerates directional breakouts.',
          }}
          className="w-full"
        >
          <div className="p-3 rounded-xl bg-[#141821]/90 backdrop-blur-md hover:bg-[#191e29] border border-white/[0.07] hover:border-[#00f0ff]/40 flex flex-col justify-between gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all cursor-pointer w-full">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#00f0ff] uppercase font-semibold">
                0-Γ FLIP &amp; BASIS
              </span>
              <span className="material-symbols-outlined text-[#00f0ff] text-[14px]">balance</span>
            </div>

            <div className="flex flex-col tabular-nums">
              <div className="font-mono text-[16px] font-bold text-[#00f0ff]">
                0-Γ: $
                {(metrics.zeroGammaLevel || metrics.vwma50) >= 1000
                  ? (metrics.zeroGammaLevel || metrics.vwma50).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })
                  : (metrics.zeroGammaLevel || metrics.vwma50).toFixed(2)}
              </div>
              <div className="font-mono text-[11px] text-[#b9cacb]">
                Basis: {(metrics.basisBps ?? 1.2) >= 0 ? '+' : ''}
                {(metrics.basisBps ?? 1.2).toFixed(1)} bps • RVOL:{' '}
                {(metrics.sessionRvol ?? 1.0).toFixed(2)}x
              </div>
            </div>

            {renderRangeTrack(
              clampPct(50 + ((metrics.basisBps ?? 0) / 25) * 40),
              '#00f0ff'
            )}

            <div className="flex items-center justify-between gap-1">
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#00f0ff]/15 border border-[#00f0ff]/35 text-[#00f0ff] font-mono text-[9px] uppercase font-bold truncate">
                {metrics.spotPerpDivergence?.headline || 'Spot/Perp Sync'}
              </span>
            </div>

            {renderRookieCardFooter('session_rvol')}
          </div>
        </InfoTooltip>
      </div>
    </div>
  );
};

