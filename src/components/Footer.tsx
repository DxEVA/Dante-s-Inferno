import React from 'react';

interface FooterProps {
  latencyMs: number;
}

export const Footer: React.FC<FooterProps> = ({ latencyMs }) => {
  return (
    <footer className="w-full bg-[#0b0e14]/95 backdrop-blur-xl border-t border-[#1e2433] py-2 px-3 flex items-center justify-between font-mono text-[10px] text-[#849495] tracking-wider z-40">
      <div className="flex items-center gap-2 truncate">
        <span className="text-[#00f0ff] font-semibold">INFERNO // TERMINAL</span>
        <span className="truncate">
          STATISTICAL &amp; STRUCTURAL COMPANION • READ-ONLY • NO FINANCIAL ADVICE
        </span>
      </div>
      <span className="shrink-0 text-[#b9cacb] font-mono text-[11px] ml-2">
        LATENCY: {latencyMs}ms
      </span>
    </footer>
  );
};
