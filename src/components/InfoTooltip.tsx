import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  getRookieMentorGuide,
  getMetricLearningResources,
  RookieMentorGuide,
  ExternalLearningLink,
} from '../utils/metricBenchmarks';

export interface InfoExplainerContent {
  title: string;
  symbol: string;
  whatItIs: string;
  liveRead: string;
  actionability: string;
  categoryBadge?: string;
  badgeColor?: string; // hex or tailwind text color
  metricKey?: string;
  rookieMentor?: RookieMentorGuide;
  resources?: ExternalLearningLink[];
  experienceMode?: 'rookie' | 'pro';
}

interface InfoTooltipProps {
  content: InfoExplainerContent;
  children?: React.ReactNode;
  inlineBadgeText?: string;
  className?: string;
  placement?: 'top' | 'bottom' | 'auto';
  experienceMode?: 'rookie' | 'pro';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  children,
  inlineBadgeText,
  className = '',
  placement = 'auto',
  experienceMode: propExperienceMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [syncedMode, setSyncedMode] = useState<'rookie' | 'pro'>(() => {
    try {
      const saved = localStorage.getItem('vertex_experience_mode');
      return saved === 'pro' ? 'pro' : 'rookie';
    } catch {
      return 'rookie';
    }
  });
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 390,
    placeAbove: true,
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    const handleModeChange = (e: Event) => {
      const detail = (e as CustomEvent<'rookie' | 'pro'>).detail;
      if (detail === 'rookie' || detail === 'pro') {
        setSyncedMode(detail);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('vertex:experience-mode-change', handleModeChange);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('vertex:experience-mode-change', handleModeChange);
    };
  }, []);

  const activeExperienceMode: 'rookie' | 'pro' =
    propExperienceMode || content.experienceMode || syncedMode;

  const updateCoordinates = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(400, window.innerWidth - 24);
    const tooltipHeight = activeExperienceMode === 'rookie' ? 380 : 240;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Clamp to viewport
    if (left < 12) left = 12;
    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - tooltipWidth - 12;
    }

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    let placeAbove = placement === 'top' || (placement === 'auto' && spaceAbove > tooltipHeight);
    if (placement === 'bottom') placeAbove = false;
    if (placeAbove && spaceAbove < 240 && spaceBelow > spaceAbove) {
      placeAbove = false;
    }

    const top = placeAbove
      ? Math.max(12, rect.top - 8)
      : Math.min(window.innerHeight - 60, rect.bottom + 8);

    setCoords({
      top,
      left,
      width: tooltipWidth,
      placeAbove,
    });
  }, [placement, activeExperienceMode]);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      updateCoordinates();
      setIsOpen(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateCoordinates();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (!isMobile) updateCoordinates();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isMobile, updateCoordinates]);

  const lookupKey = content.metricKey || content.title;
  const resolvedMentor =
    content.rookieMentor ||
    getRookieMentorGuide(lookupKey, content.symbol, '', content.liveRead);
  const resolvedResources =
    content.resources || getMetricLearningResources(lookupKey, content.symbol);

  const renderResourceBadge = (type: ExternalLearningLink['type']) => {
    switch (type) {
      case 'VIDEO':
        return {
          label: '▶ VIDEO',
          className: 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40',
        };
      case 'INTERACTIVE':
        return {
          label: '⚡ INTERACTIVE',
          className: 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40',
        };
      case 'COURSE':
        return {
          label: '🎓 COURSE',
          className: 'bg-[#c084fc]/15 text-[#e9d5ff] border-[#c084fc]/40',
        };
      case 'ARTICLE':
      default:
        return {
          label: '📖 ARTICLE',
          className: 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40',
        };
    }
  };

  const renderPopoverBody = () => (
    <div className="flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#272a31]">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {content.categoryBadge && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[#1d2026] border border-[#272a31]"
              style={{ color: content.badgeColor || '#00f0ff' }}
            >
              {content.categoryBadge}
            </span>
          )}
          <span className="font-mono text-[12px] font-bold text-[#dbfcff] truncate">
            {content.title}
          </span>
          <span className="text-[10px] font-mono text-[#849495] font-semibold">
            • {content.symbol}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="text-[#849495] hover:text-[#e1e2eb] p-1 rounded transition-colors cursor-pointer"
          aria-label="Close explainer"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      {/* Row 1: WHAT IT IS */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#849495]"></span>
          <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-[#849495]">
            1. WHAT IT IS
          </span>
        </div>
        <p className="font-sans text-[11px] text-[#dbfcff] leading-relaxed pl-2.5">
          {content.whatItIs}
        </p>
      </div>

      {/* Row 2: LIVE READ FOR {SYMBOL} */}
      <div className="flex flex-col gap-0.5 bg-[#0b0e14]/60 p-2 rounded-lg border border-[#00f0ff]/20">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse"></span>
          <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-[#00f0ff]">
            2. LIVE READ FOR {content.symbol}
          </span>
        </div>
        <p className="font-sans text-[11px] text-[#ffffff] font-medium leading-relaxed pl-2.5">
          {content.liveRead}
        </p>
      </div>

      {/* Row 3: TRADER ACTIONABILITY */}
      <div className="flex flex-col gap-0.5 bg-[#00a572]/10 p-2 rounded-lg border border-[#00a572]/30">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
          <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-[#4edea3]">
            3. TRADER ACTIONABILITY
          </span>
        </div>
        <p className="font-sans text-[11px] text-[#b9cacb] leading-relaxed pl-2.5">
          {content.actionability}
        </p>
      </div>

      {/* ROOKIE MODE ONLY: Row 4 (Familiar Indicator Bridge) & Row 5 (Full Educational Resource Cards) */}
      {activeExperienceMode === 'rookie' && (
        <>
          {/* Row 4: ROOKIE MENTOR BRIDGE (Familiar Indicator Comparison + Range Cheat Sheet) */}
          <div className="flex flex-col gap-1.5 bg-[#141821] p-2.5 rounded-lg border border-[#1e2433]">
            <div className="flex items-center gap-1">
              <span className="text-[11px]">🔗</span>
              <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-[#fcd34d]">
                4. FAMILIAR INDICATOR BRIDGE (ROOKIE CHEAT SHEET)
              </span>
            </div>
            <p className="font-sans text-[10.5px] text-[#e1e2eb] leading-snug">
              {resolvedMentor.familiarBridge}
            </p>

            {/* Normal / Too High / Too Low Strip */}
            <div className="grid grid-cols-1 gap-1 pt-1 font-mono text-[9px] tabular-nums">
              <div className="px-2 py-1 bg-[#0b0e14] border border-[#1e2433] text-[#00f0ff]">
                <strong>NORMAL:</strong> {resolvedMentor.standardRangeGuide.normal}
              </div>
              <div className="px-2 py-1 bg-[#0b0e14] border border-[#1e2433] text-[#fcd34d]">
                <strong>HIGH / BULL EXTREME:</strong> {resolvedMentor.standardRangeGuide.tooHigh}
              </div>
              <div className="px-2 py-1 bg-[#0b0e14] border border-[#1e2433] text-[#ffb4ab]">
                <strong>LOW / BEAR EXTREME:</strong> {resolvedMentor.standardRangeGuide.tooLow}
              </div>
            </div>

            {/* Do / Avoid Rules */}
            <div className="grid grid-cols-1 gap-1 pt-0.5 font-sans text-[10px]">
              <div className="px-2 py-1 bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3]">
                <strong>✓ DO:</strong> {resolvedMentor.rookieActionRule.doThis}
              </div>
              <div className="px-2 py-1 bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#ffb4ab]">
                <strong>✕ AVOID:</strong> {resolvedMentor.rookieActionRule.avoidTrap}
              </div>
            </div>
          </div>

          {/* Row 5: FULL RESOURCE CARDS (3-Link Triad: Article, Video, Interactive/Course) */}
          {resolvedResources && resolvedResources.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#272a31]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-[#00f0ff]">
                  5. STUDY ONLINE (ARTICLE · VIDEO · INTERACTIVE)
                </span>
                <span className="font-mono text-[8px] text-[#849495]">OPENS IN NEW TAB ↗</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {resolvedResources.map((link, idx) => {
                  const badge = renderResourceBadge(link.type);
                  return (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col gap-1 p-2 rounded-lg bg-[#0b0e14] hover:bg-[#141821] border border-[#1e2433] hover:border-[#00f0ff]/60 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded border font-mono text-[8px] font-bold shrink-0 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span className="font-mono text-[8.5px] text-[#849495] group-hover:text-[#00f0ff] shrink-0">
                          {link.sourceName} · {link.durationOrLevel} ↗
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] font-semibold text-[#dbfcff] group-hover:text-[#00f0ff] leading-snug">
                        {link.title}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`inline-flex items-center cursor-pointer select-none ${className}`}
      >
        {children ? (
          children
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 text-[10px] font-mono font-semibold transition-all shadow-[0_0_8px_rgba(0,240,255,0.1)]"
          >
            <span className="material-symbols-outlined text-[13px]">info</span>
            <span>{inlineBadgeText || `ⓘ What This Means For ${content.symbol}`}</span>
          </button>
        )}
      </div>

      {/* Portal Popover for Desktop or Bottom Sheet for Mobile */}
      {isOpen &&
        createPortal(
          isMobile ? (
            /* Mobile Bottom Sheet Drawer */
            <div
              className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-fadeIn"
              onClick={() => setIsOpen(false)}
            >
              <div
                ref={popoverRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[#12161f] border-t border-[#00f0ff]/30 rounded-t-2xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto animate-slideUp"
              >
                {/* Drawer handle */}
                <div className="w-10 h-1 bg-[#272a31] rounded-full mx-auto mb-3" />
                {renderPopoverBody()}
              </div>
            </div>
          ) : (
            /* Desktop Floating Popover */
            <div
              ref={popoverRef}
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              }}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'fixed',
                top: coords.placeAbove ? 'auto' : `${coords.top}px`,
                bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 9999,
              }}
              className="bg-[#0e121a]/95 border border-[#00f0ff]/40 rounded-xl p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-fadeIn transition-all max-h-[82vh] overflow-y-auto no-scrollbar"
            >
              {renderPopoverBody()}
            </div>
          ),
          document.body
        )}
    </>
  );
};


