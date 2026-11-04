import React from 'react';

export type SignalBiasDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

interface SignalBiasPillProps {
  bias: SignalBiasDirection;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const SignalBiasPill: React.FC<SignalBiasPillProps> = ({
  bias,
  label,
  size = 'sm',
  className = '',
}) => {
  const icon = bias === 'BULLISH' ? '▲' : bias === 'BEARISH' ? '▼' : '◆';
  const defaultText =
    bias === 'BULLISH' ? 'BULLISH' : bias === 'BEARISH' ? 'BEARISH' : 'NEUTRAL / WAIT';
  const rawText = label ? label.trim() : defaultText;
  const hasPrefix =
    rawText.startsWith('▲') || rawText.startsWith('▼') || rawText.startsWith('◆');
  const displayText = hasPrefix ? rawText : `${icon} ${rawText}`;

  const colorClasses =
    bias === 'BULLISH'
      ? 'bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/40 shadow-[0_0_10px_rgba(78,222,163,0.15)]'
      : bias === 'BEARISH'
      ? 'bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/40 shadow-[0_0_10px_rgba(255,180,171,0.15)]'
      : 'bg-[#f59e0b]/12 text-[#fcd34d] border border-[#f59e0b]/35';

  const sizeClasses =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[8px] rounded'
      : size === 'md'
      ? 'px-2.5 py-1 text-[10px] rounded-md'
      : 'px-2 py-0.5 text-[9px] rounded-md';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wider shrink-0 tabular-nums ${colorClasses} ${sizeClasses} ${className}`}
    >
      {displayText}
    </span>
  );
};
