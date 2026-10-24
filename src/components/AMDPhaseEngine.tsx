import React from 'react';
import { motion } from 'motion/react';
import { AMDPhaseResult } from '../types';
import { Activity, ShieldAlert, ArrowRight, Zap, Droplets, Target, Eye } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface AMDPhaseEngineProps {
  amdPhase: AMDPhaseResult;
  symbol?: string;
}

export const AMDPhaseEngine: React.FC<AMDPhaseEngineProps> = ({
  amdPhase,
  symbol = 'BTCUSDT',
}) => {
  const {
    phase,
    stageName,
    confidence,
    scores,
    effortVsResult,
    volumeAnomaly,
    liquidityTrapStatus,
    institutionalRead,
    activeStageIndex,
  } = amdPhase;

  // Phase Styling Themes
  const getPhaseColor = () => {
    switch (phase) {
      case 'ACCUMULATION':
        return {
          badge: 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/30',
          dot: 'bg-[#00f0ff]',
          glow: 'shadow-[0_0_12px_rgba(0,240,255,0.25)]',
        };
      case 'MANIPULATION':
        return {
          badge: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30',
          dot: 'bg-[#f59e0b]',
          glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
        };
      case 'DISTRIBUTION':
        return {
          badge: 'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/30',
          dot: 'bg-[#f43f5e]',
          glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
        };
      case 'EXPANSION':
        return {
          badge: 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30',
          dot: 'bg-[#4edea3]',
          glow: 'shadow-[0_0_12px_rgba(78,222,163,0.25)]',
        };
      default:
        return {
          badge: 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/30',
          dot: 'bg-[#00f0ff]',
          glow: '',
        };
    }
  };

  const theme = getPhaseColor();

  const stages = [
    {
      id: 0,
      name: '1. ACCUMULATION',
      subtitle: 'Absorption & Compression',
      score: scores.accumulation,
      active: activeStageIndex === 0,
      activeColor: 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff]',
    },
    {
      id: 1,
      name: '2. MANIPULATION',
      subtitle: 'Judas Swing / Liquidity Hunt',
      score: scores.manipulation,
      active: activeStageIndex === 1,
      activeColor: 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]',
    },
    {
      id: 2,
      name: phase === 'DISTRIBUTION' ? '3. DISTRIBUTION' : '3. EXPANSION',
      subtitle: phase === 'DISTRIBUTION' ? 'Wyckoff Spread / Reversal' : 'Directional Trend Run',
      score: phase === 'DISTRIBUTION' ? scores.distribution : scores.expansion,
      active: activeStageIndex === 2,
      activeColor:
        phase === 'DISTRIBUTION'
          ? 'border-[#f43f5e] bg-[#f43f5e]/10 text-[#f43f5e]'
          : 'border-[#4edea3] bg-[#4edea3]/10 text-[#4edea3]',
    },
  ];

  return (
    <div className="bg-[#141821] border border-[#1e2433] border-l-2 border-l-[#00f0ff] rounded-none p-3 flex flex-col gap-3">
      {/* Header with Phase Badge and Confidence */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-none bg-[#202530] border border-[#2e3442] flex items-center justify-center text-[#00f0ff]">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-bold text-[#e1e2eb] tracking-wider uppercase">
                INSTITUTIONAL MARKET CYCLE // AMD + WYCKOFF VSA
              </span>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded-none border font-semibold flex items-center gap-1.5 ${theme.badge} ${theme.glow}`}
              >
                <span className={`w-1.5 h-1.5 rounded-none ${theme.dot}`} />
                {stageName}
              </span>
            </div>
            <span className="text-[10px] text-[#849495] font-mono">
              Deterministic orderflow absorption, volatility spread &amp; liquidity hunt scanner
            </span>
          </div>
        </div>

        {/* Confidence Dial Badge & Info Explainer */}
        <div className="flex items-center gap-2">
          <InfoTooltip
            content={{
              title: 'INSTITUTIONAL AMD MARKET CYCLE',
              symbol,
              categoryBadge: 'WYCKOFF ACCUMULATION',
              badgeColor: '#00f0ff',
              whatItIs:
                'Smart money 3-phase structural sequence: Accumulation (volatility compression), Manipulation (Judas stop sweep of resting liquidity), and Distribution/Expansion (markup or markdown).',
              liveRead: `${symbol} is identified in ${phase} stage (${confidence}% algorithmic confidence). ${effortVsResult}.`,
              actionability: institutionalRead,
            }}
            inlineBadgeText={`ⓘ What This Means For ${symbol}`}
          />
          <div className="flex items-center gap-2 bg-[#0b0e14] px-2.5 py-1 rounded-none border border-[#1e2433] tabular-nums">
            <span className="text-[10px] font-mono text-[#849495]">CYCLE CONFIDENCE:</span>
            <span className="font-mono text-xs font-bold text-[#4edea3]">{confidence}%</span>
          </div>
        </div>
      </div>

      {/* 3-Stage Visual Pipeline Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {stages.map((stg) => {
          return (
            <div
              key={stg.id}
              className={`p-2.5 rounded-none border transition-all flex flex-col justify-between gap-1.5 tabular-nums ${
                stg.active
                  ? `${stg.activeColor} shadow-md`
                  : 'bg-[#0b0e14] border-[#1e2433] text-[#849495] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold tracking-wider">{stg.name}</span>
                <span className="text-[10px] font-mono font-bold">{stg.score}% Match</span>
              </div>
              <span className="text-[10px] font-mono text-[#a6b4c9]">{stg.subtitle}</span>

              {/* Mechanical Spring Progress Bar */}
              <div className="w-full bg-[#191c22] h-1.5 rounded-none overflow-hidden mt-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stg.score}%` }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  className={`h-full ${
                    stg.active
                      ? stg.id === 0
                        ? 'bg-[#00f0ff]'
                        : stg.id === 1
                        ? 'bg-[#f59e0b]'
                        : phase === 'DISTRIBUTION'
                        ? 'bg-[#f43f5e]'
                        : 'bg-[#4edea3]'
                      : 'bg-[#374158]'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Wyckoff & Orderflow Telemetry Strip (3 Metric Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        {/* Metric 1: Effort vs Result */}
        <div className="bg-[#141822] p-2.5 rounded border border-[#222838] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[#00f0ff]">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#849495]">
              Effort vs Result (VSA)
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#e1e2eb] leading-relaxed">
            {effortVsResult}
          </p>
        </div>

        {/* Metric 2: Volume Anomaly */}
        <div className="bg-[#141822] p-2.5 rounded border border-[#222838] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[#f59e0b]">
            <Droplets className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#849495]">
              Volume Anomaly / VDU
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#e1e2eb] leading-relaxed">
            {volumeAnomaly}
          </p>
        </div>

        {/* Metric 3: Liquidity Sweep / Trap Status */}
        <div className="bg-[#141822] p-2.5 rounded border border-[#222838] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[#f43f5e]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#849495]">
              Liquidity Sweep / Trap Status
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#e1e2eb] leading-relaxed">
            {liquidityTrapStatus}
          </p>
        </div>
      </div>

      {/* Metric 4: Educated Institutional Read */}
      <div className="bg-[#141822] p-2.5 rounded border border-[#2b3345] flex items-start gap-2.5">
        <div className="p-1 rounded bg-[#00f0ff]/10 text-[#00f0ff] shrink-0 mt-0.5">
          <Eye className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#00f0ff]">
            EDUCATED INSTITUTIONAL SYNTHESIS
          </span>
          <p className="text-[11px] font-mono text-[#cfd7e6] leading-relaxed">
            {institutionalRead}
          </p>
        </div>
      </div>
    </div>
  );
};
