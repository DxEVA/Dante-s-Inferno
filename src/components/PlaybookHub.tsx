// src/components/PlaybookHub.tsx
import React, { useMemo, useState } from 'react';
import {
  InfernoCandle,
  OrderBlockZone,
  VolumeProfileSnapshot,
  buildCraneConfluenceInputs,
  evaluateCraneStrike,
  evaluatePlaybookPodium,
} from '../services/CraneStrikeEngine';
import { CraneStrikePanel } from './CraneStrikePanel';

export interface PlaybookHubProps {
  symbol: string;
  htfCandles: InfernoCandle[];
  ltfCandles: InfernoCandle[];
  orderBlocks?: OrderBlockZone[];
  volumeProfile?: VolumeProfileSnapshot;
  fundingRateZScore?: number;
  oiDeltaFlushPct?: number;
  onPlotTradeGeometry?: (plan: {
    entry: number;
    stopLoss: number;
    tp1: number;
    direction: 'LONG' | 'SHORT';
    rr: number;
  }) => void;
}

export const PlaybookHub: React.FC<PlaybookHubProps> = ({
  symbol,
  htfCandles,
  ltfCandles,
  orderBlocks,
  volumeProfile,
  fundingRateZScore,
  oiDeltaFlushPct,
  onPlotTradeGeometry,
}) => {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPct, setRiskPct] = useState<number>(1.0);

  const currentPrice =
    ltfCandles[ltfCandles.length - 1]?.close ??
    htfCandles[htfCandles.length - 1]?.close ??
    100;

  // 1. Memoized Confluence, Gann Square of 9, 5-Gate Evaluation, and Podium Ranking
  const { gann, evaluation, podium } = useMemo(() => {
    const { confluence, gann: gannRes } = buildCraneConfluenceInputs({
      htfCandles,
      ltfCandles,
      orderBlocks,
      volumeProfile,
      fundingRateZScore,
      oiDeltaFlushPct,
    });
    const evalRes = evaluateCraneStrike(htfCandles, ltfCandles, confluence);
    const podiumRanks = evaluatePlaybookPodium(evalRes);
    return { gann: gannRes, evaluation: evalRes, podium: podiumRanks };
  }, [htfCandles, ltfCandles, orderBlocks, volumeProfile, fundingRateZScore, oiDeltaFlushPct]);

  // 2. Trade Plan Geometry Risk/Position Calculator
  const activeEntry = evaluation.gates.g5Geometry?.entry ?? Number((currentPrice * 0.998).toFixed(4));
  const activeSL =
    evaluation.gates.g5Geometry?.stopLoss ?? Number((currentPrice * 0.992).toFixed(4));
  const activeTP1 =
    evaluation.gates.g5Geometry?.tp1Poc ?? Number((currentPrice * 1.02).toFixed(4));
  const activeDir = evaluation.gates.g5Geometry?.direction ?? 'LONG';

  const riskCapital = (accountBalance * riskPct) / 100;
  const stopDistancePct = Math.max(0.0001, Math.abs(activeEntry - activeSL) / activeEntry);
  const positionNotional = Math.round(riskCapital / stopDistancePct);
  const netRR =
    Math.abs(activeEntry - activeSL) > 0
      ? Number((Math.abs(activeTP1 - activeEntry) / Math.abs(activeEntry - activeSL)).toFixed(2))
      : 0;

  return (
    <div className="space-y-4 text-slate-100 font-mono">
      {/* SECTION 1: CRANE STRIKE 5-GATE SNIPER ENGINE */}
      <CraneStrikePanel
        currentPrice={currentPrice}
        evaluation={evaluation}
        symbol={symbol}
        onPlotExecution={(geo) =>
          onPlotTradeGeometry?.({
            ...geo,
            rr: netRR,
          })
        }
      />

      {/* SECTION 2: 6-SETUP PODIUM RANKING LEADERBOARD */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Institutional Setup Podium Ranking
            </h3>
            <p className="text-[11px] text-slate-400">
              Real-time feasibility ranking across top 6 quant setups
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
            Top 3 Highlighted
          </span>
        </div>

        {/* Top 3 Podium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 my-3">
          {podium.slice(0, 3).map((setup) => {
            const medalStyle =
              setup.rank === 1
                ? 'border-amber-400/50 bg-amber-950/20 text-amber-300'
                : setup.rank === 2
                ? 'border-slate-400/40 bg-slate-900/70 text-slate-200'
                : 'border-amber-700/50 bg-amber-950/10 text-amber-500';

            return (
              <div key={setup.id} className={`rounded-lg border p-3 ${medalStyle}`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>#{setup.rank} PODIUM</span>
                  <span className="text-sm">{setup.score}/100</span>
                </div>
                <div className="text-xs font-bold text-slate-100 mt-1">{setup.name}</div>
                <div className="text-[10px] text-slate-400 mt-1">{setup.mechanism}</div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-300">{setup.triggerNote}</span>
                  <span className="font-bold">{setup.rrProfile}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Runners-Up (#4 - #6) */}
        <div className="space-y-1.5 mt-2">
          {podium.slice(3).map((setup) => (
            <div
              key={setup.id}
              className="flex items-center justify-between rounded bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">#{setup.rank}</span>
                <span className="text-slate-200 font-medium">{setup.name}</span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  ({setup.triggerNote})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400">{setup.rrProfile}</span>
                <span className="font-bold text-slate-300">{setup.score}/100</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: GANN SQUARE OF 9 & TRADE PLAN GEOMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gann Square of 9 Cardinal/Ordinal Matrix */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Gann Square of 9 Harmonic Matrix
              </h3>
              <p className="text-[10px] text-slate-400">
                Anchor: {gann.anchorPrice} | Nearest: {gann.nearestDegree}° ({gann.distancePct}% away)
              </p>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                gann.distancePct <= 0.25
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {gann.distancePct <= 0.25 ? 'HARMONIC LOCK' : 'SCANNING'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-3 text-[11px]">
            {gann.levels.map((lvl) => (
              <div
                key={lvl.degree}
                className={`p-2 rounded border ${
                  lvl.type === 'CARDINAL'
                    ? 'bg-slate-900/90 border-indigo-500/30'
                    : 'bg-slate-900/40 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-300">{lvl.degree}°</span>
                  <span>{lvl.type === 'CARDINAL' ? 'CARD' : 'ORD'}</span>
                </div>
                <div className="mt-1 text-emerald-300 font-semibold">R: {lvl.resistancePrice}</div>
                <div className="text-rose-300 font-semibold">S: {lvl.supportPrice}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Plan Risk-Reward & Position Geometry */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Trade Plan Risk & Position Geometry
                </h3>
                <p className="text-[10px] text-slate-400">
                  Auto-synced with Gate 5 First-Obstacle HVN/POC Audit
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400">{netRR}R NET</span>
            </div>

            <div className="grid grid-cols-2 gap-2 my-3 text-xs">
              <label className="bg-slate-900 p-2 rounded border border-slate-800 block">
                <span className="text-[10px] text-slate-400 block">ACCOUNT EQUITY ($)</span>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Math.max(100, Number(e.target.value)))}
                  className="w-full bg-transparent text-slate-100 font-bold focus:outline-none mt-0.5"
                />
              </label>
              <label className="bg-slate-900 p-2 rounded border border-slate-800 block">
                <span className="text-[10px] text-slate-400 block">RISK PER STRIKE (%)</span>
                <input
                  type="number"
                  step="0.25"
                  value={riskPct}
                  onChange={(e) => setRiskPct(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-transparent text-slate-100 font-bold focus:outline-none mt-0.5"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">RISK CAPITAL</span>
                <span className="font-bold text-rose-300">${riskCapital.toFixed(2)}</span>
              </div>
              <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">STOP DISTANCE</span>
                <span className="font-bold text-slate-200">
                  {(stopDistancePct * 100).toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-emerald-400 block">POSITION SIZE</span>
                <span className="font-bold text-emerald-300">${positionNotional}</span>
              </div>
            </div>
          </div>

          {onPlotTradeGeometry && (
            <button
              type="button"
              onClick={() =>
                onPlotTradeGeometry({
                  entry: activeEntry,
                  stopLoss: activeSL,
                  tp1: activeTP1,
                  direction: activeDir,
                  rr: netRR,
                })
              }
              className="w-full mt-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Sync Trade Plan Geometry to Chart Canvas
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
