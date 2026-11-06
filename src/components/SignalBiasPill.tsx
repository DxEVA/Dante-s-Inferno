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
      ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/25'
      : bias === 'BEARISH'
      ? 'bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/25'
      : 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25';

  const sizeClasses =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[9px] rounded'
      : size === 'md'
      ? 'px-2.5 py-1 text-[10.5px] rounded-md'
      : 'px-2 py-0.5 text-[9.5px] rounded';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-semibold tracking-tight shrink-0 tabular-nums ${colorClasses} ${sizeClasses} ${className}`}
    >
      {displayText}
    </span>
  );
};
