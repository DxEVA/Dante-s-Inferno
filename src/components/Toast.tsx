import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-[#00f0ff] text-[#00363a] font-mono text-[11px] font-semibold tracking-wider shadow-[0_0_16px_rgba(0,240,255,0.4)] z-50 flex items-center gap-2 animate-in fade-in duration-200 uppercase">
      <span className="material-symbols-outlined text-[16px]">check_circle</span>
      <span>{message}</span>
    </div>
  );
};
