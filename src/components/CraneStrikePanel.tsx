// src/components/CraneStrikePanel.tsx
import React, { useState } from 'react';
import { CraneStrikeEvaluation, CraneState } from '../services/CraneStrikeEngine';

interface CraneStrikePanelProps {
  symbol: string;
  evaluation: CraneStrikeEvaluation;
  currentPrice: number;
  onPlotExecution?: (geometry: {
    entry: number;
    stopLoss: number;
    tp1: number;
    direction: 'LONG' | 'SHORT';
  }) => void;
}

const STATE_THEMES: Record<
  CraneState,
  { border: string; badge: string; dot: string; label: string }
> = {
  DORMANT: {
    border: 'border-slate-800 bg-slate-950/90',
    badge: 'bg-slate-800/80 text-slate-400 border-slate-700',
    dot: 'bg-slate-500',
    label: '1. DORMANT // NOISE VETO',
  },
  STALKING: {
    border: 'border-amber-500/40 bg-slate-950/95 shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400 animate-pulse',
    label: '2. STALKING // HTF KILLZONE LOCK',
  },
  ARMED: {
    border: 'border-rose-500/50 bg-slate-950/95 shadow-[0_0_25px_rgba(244,63,94,0.12)]',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    dot: 'bg-rose-500 animate-ping',
    label: '3. ARMED // CVD ABSORPTION DETECTED',
  },
  STRIKE: {
    border: 'border-emerald-500/60 bg-slate-950/95 shadow-[0_0_30px_rgba(16,185,129,0.18)]',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
    dot: 'bg-emerald-400 animate-pulse',
    label: '4. CRANE STRIKE // 5-GATE LOCK',
  },
};

export const CraneStrikePanel: React.FC<CraneStrikePanelProps> = ({
  symbol,
  evaluation,
  currentPrice,
  onPlotExecution,
}) => {
  // Optional Test Mode override so you can test STRIKE UI & canvas plotting any time
  const [simStrike, setSimStrike] = useState(false);

  const activeState: CraneState = simStrike ? 'STRIKE' : evaluation.state;
  const activeScore = simStrike ? 92 : evaluation.craneScore;
  const theme = STATE_THEMES[activeState];

  const { gates } = evaluation;

  const activeGeometry = simStrike
    ? {
        passed: true,
        netRR: 3.85,
        entry: Number((currentPrice * 0.9985).toFixed(4)),
        stopLoss: Number((currentPrice * 0.9935).toFixed(4)),
        tp1Poc: Number((currentPrice * 1.0185).toFixed(4)),
        direction: 'LONG' as const,
      }
    : gates.g5Geometry;

  const gateStatusList = [
    {
      id: 'G1',
      name: 'REGIME',
      passed: simStrike || gates.g1Regime.passed,
      val: `H: ${gates.g1Regime.hurst}`,
    },
    {
      id: 'G2',
      name: 'TOPOLOGY',
      passed: simStrike || gates.g2Structure.passed,
      val: `Gann: ${gates.g2Structure.gannScore}%`,
    },
    {
      id: 'G3',
      name: 'LIQ FUEL',
      passed: simStrike || gates.g3Derivatives.passed,
      val: `Score: ${gates.g3Derivatives.liqScore}`,
    },
    {
      id: 'G4',
      name: 'CVD FLOW',
      passed: simStrike || gates.g4Microstructure.isAbsorbing,
      val: `${gates.g4Microstructure.absorptionIndex}σ`,
    },
    {
      id: 'G5',
      name: 'EV AUDIT',
      passed: simStrike || Boolean(gates.g5Geometry?.passed),
      val: activeGeometry ? `${activeGeometry.netRR}R` : '--',
    },
  ];

  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 transition-all duration-300 text-slate-100 font-mono ${theme.border}`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
          <span className="text-xs font-bold tracking-wider text-slate-300">{symbol}</span>
          <span className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 rounded border font-semibold ${theme.badge}`}>
            {theme.label}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSimStrike((prev) => !prev)}
            className={`text-[9px] sm:text-[10px] px-2 py-1 rounded border transition cursor-pointer font-medium ${
              simStrike
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {simStrike ? 'TEST STRIKE: ON' : 'SIMULATE STRIKE'}
          </button>

          <div className="text-right">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 block">
              Crane Score
            </span>
            <span
              className={`text-base sm:text-lg font-extrabold ${
                activeState === 'STRIKE'
                  ? 'text-emerald-400'
                  : activeState === 'ARMED'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {activeScore}
              <span className="text-[10px] sm:text-xs text-slate-500 font-normal">/100</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5-Gate Sequential Veto Cascade Strip */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 my-2.5 sm:my-3">
        {gateStatusList.map((g) => (
          <div
            key={g.id}
            className={`rounded-lg p-1 sm:p-2 border text-center transition-colors ${
              g.passed
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/70 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-bold">
              <span>{g.id}</span>
              <span className={g.passed ? 'text-emerald-400' : 'text-slate-500'}>
                {g.passed ? 'PASS' : 'VETO'}
              </span>
            </div>
            <div className="text-[9px] sm:text-[11px] font-semibold mt-0.5 truncate">{g.name}</div>
            <div className="text-[8.5px] sm:text-[10px] opacity-80 mt-0.5 truncate">{g.val}</div>
          </div>
        ))}
      </div>

      {/* Telemetry Diagnostic Banner */}
      {!simStrike && evaluation.vetoReason && (
        <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs text-slate-300 flex items-center justify-between gap-2">
          <span className="truncate">{evaluation.vetoReason}</span>
          <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase shrink-0">
            {gates.g1Regime.regime.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Execution Geometry Drawer (Unlocked on STRIKE or Test Mode) */}
      {activeState === 'STRIKE' && activeGeometry && (
        <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-emerald-500/30 bg-emerald-950/15 rounded-lg p-2.5 sm:p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-400 tracking-wide truncate">
              EXECUTION GEOMETRY ({activeGeometry.direction} FVG CE 50%)
            </span>
            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
              NET {activeGeometry.netRR}R
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 text-xs my-2">
            <div className="bg-slate-900/80 p-1.5 sm:p-2 rounded border border-slate-800 flex sm:flex-col justify-between items-center sm:items-start">
              <span className="text-[9px] sm:text-[10px] text-slate-400">LIMIT ENTRY (CE)</span>
              <span className="font-bold text-slate-100">{activeGeometry.entry}</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 sm:p-2 rounded border border-rose-500/30 flex sm:flex-col justify-between items-center sm:items-start">
              <span className="text-[9px] sm:text-[10px] text-rose-400">HARD INVALIDATION</span>
              <span className="font-bold text-rose-300">{activeGeometry.stopLoss}</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 sm:p-2 rounded border border-emerald-500/30 flex sm:flex-col justify-between items-center sm:items-start">
              <span className="text-[9px] sm:text-[10px] text-emerald-400">TP1 (FIRST HVN/POC)</span>
              <span className="font-bold text-emerald-300">{activeGeometry.tp1Poc}</span>
            </div>
          </div>

          {onPlotExecution && (
            <button
              type="button"
              onClick={() =>
                onPlotExecution({
                  entry: activeGeometry.entry,
                  stopLoss: activeGeometry.stopLoss,
                  tp1: activeGeometry.tp1Poc,
                  direction: activeGeometry.direction,
                })
              }
              className="w-full mt-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition cursor-pointer"
            >
              Plot Crane Strike Geometry on Canvas
            </button>
          )}
        </div>
      )}
    </div>
  );
};
