import React from 'react';
import { SpeculationBrief as SpeculationBriefType } from '../types';

interface SpeculationBriefProps {
  brief: SpeculationBriefType;
  isLoading: boolean;
  onRunQuant: () => void;
  onCopyText: (text: string, label: string) => void;
}

export const SpeculationBrief: React.FC<SpeculationBriefProps> = ({
  brief,
  isLoading,
  onRunQuant,
  onCopyText,
}) => {
  return (
    <div className="flex flex-col px-3 py-3 gap-2 bg-[#10131a] border-b border-[#272a31]">
      {/* Header & Run Quant Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse"></span>
          <h3 className="font-mono text-[10px] text-[#00f0ff] tracking-wider uppercase font-bold">
            OBJECTIVE SPECULATION BRIEF
          </h3>
        </div>

        <button
          onClick={onRunQuant}
          disabled={isLoading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded bg-[#dbfcff] text-[#00363a] font-mono text-[10px] font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer ${
            isLoading ? 'opacity-80 animate-pulse' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[13px]">
            {isLoading ? 'autorenew' : 'bolt'}
          </span>
          <span>{isLoading ? 'SYNTHESIZING...' : 'RUN QUANT'}</span>
        </button>
      </div>

      {/* Institutional Bullets Strip */}
      <div className="flex flex-col gap-1.5">
        {/* Bullet 1: CONFIDENCE */}
        <div className="p-2.5 rounded bg-[#191c22] border border-[#272a31] flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
            <span className="font-mono text-[10px] text-[#4edea3] font-bold uppercase">
              ● CONFIDENCE (CONFLUENCE ENGINE)
            </span>
          </div>
          <p className="font-sans text-[13px] text-[#e1e2eb] leading-snug">
            {brief.confidence}
          </p>
        </div>

        {/* Bullet 2: ZONE */}
        <div className="p-2.5 rounded bg-[#191c22] border border-[#272a31] flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]"></span>
              <span className="font-mono text-[10px] text-[#00f0ff] font-bold uppercase">
                ● ZONE (EXECUTION CORRIDOR)
              </span>
            </div>
            <button
              onClick={() => onCopyText(brief.suggestedEntry.toString(), 'Zone Entry')}
              className="px-2 py-0.5 rounded bg-[#272a31] hover:bg-[#00f0ff] text-[#00f0ff] hover:text-[#00363a] font-mono text-[9px] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[11px]">content_copy</span>
              <span>Copy Zone</span>
            </button>
          </div>
          <p className="font-sans text-[13px] text-[#e1e2eb] leading-snug">
            {brief.zone}
          </p>
        </div>

        {/* Bullet 3: TRAP */}
        <div className="p-2.5 rounded bg-[#191c22] border border-[#272a31] flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
            <span className="font-mono text-[10px] text-[#fcd34d] font-bold uppercase">
              ● TRAP (LIQUIDITY HUNT WARNING)
            </span>
          </div>
          <p className="font-sans text-[13px] text-[#e1e2eb] leading-snug">
            {brief.trap}
          </p>
        </div>

        {/* Bullet 4: INVALIDATION */}
        <div className="p-2.5 rounded bg-[#191c22] border border-[#272a31] flex flex-col gap-1 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]"></span>
              <span className="font-mono text-[10px] text-[#ffb4ab] font-bold uppercase">
                ● INVALIDATION (STRUCTURAL FAILURE)
              </span>
            </div>
            <button
              onClick={() => onCopyText(brief.suggestedStop.toString(), 'Stop Loss')}
              className="px-2 py-0.5 rounded bg-[#272a31] hover:bg-[#ffb4ab] text-[#ffb4ab] hover:text-[#690005] font-mono text-[9px] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[11px]">content_copy</span>
              <span>Copy Stop</span>
            </button>
          </div>
          <p className="font-sans text-[13px] text-[#e1e2eb] leading-snug">
            {brief.invalidation}
          </p>
        </div>
      </div>
    </div>
  );
};
