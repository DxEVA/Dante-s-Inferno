import React, { useState, useEffect, useRef } from 'react';

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BLOCK_LEVELS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const CIPHER_CHARS = '01X#ΔΣΓ';

interface AsciiOrderflowBarProps {
  buyRatio: number; // 0 to 1 (e.g. 0.64 = 64% buy pressure)
  width?: number;
  compact?: boolean;
}

/**
 * 16-character live ASCII orderflow pressure bar (`█`, `▓`, `▒`, `░`)
 * showing Bid vs. Ask dominance with a pulsing center collision glyph.
 */
export const AsciiOrderflowBar: React.FC<AsciiOrderflowBarProps> = ({
  buyRatio,
  width = 16,
  compact = false,
}) => {
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((t) => (t + 1) % 2);
    }, 480);
    return () => clearInterval(timer);
  }, []);

  const clamped = Math.max(0.05, Math.min(0.95, Number.isFinite(buyRatio) ? buyRatio : 0.5));
  const bidCells = Math.max(1, Math.min(width - 1, Math.round(clamped * width)));
  const askCells = Math.max(1, width - bidCells);

  const bidStr =
    bidCells >= 2
      ? '█'.repeat(Math.max(0, bidCells - 2)) + '▓▒'.slice(0, Math.min(2, bidCells))
      : '█'.repeat(bidCells);
  const askStr = '░'.repeat(askCells);
  const isBullDominant = clamped >= 0.5;
  const glyph = pulseTick === 0 ? '⚡' : '◈';

  return (
    <div
      className="inline-flex items-center gap-1 font-mono text-[9px] sm:text-[10px] tracking-tight select-none tabular-nums"
      title={`Live Orderflow Tape Pressure: ${(clamped * 100).toFixed(0)}% Bid / ${((1 - clamped) * 100).toFixed(0)}% Ask`}
    >
      {!compact && <span className="text-[#4edea3] font-bold">BID</span>}
      <span className="inline-flex items-center bg-[#06080d] px-1 py-0.5 border border-[#1e2636]">
        <span className="text-[#4edea3]">{bidStr}</span>
        <span
          className={`mx-0.5 font-bold transition-colors ${
            isBullDominant ? 'text-[#4edea3]' : 'text-[#ffb4ab]'
          }`}
        >
          {glyph}
        </span>
        <span className="text-[#ffb4ab]/75">{askStr}</span>
      </span>
      {!compact && <span className="text-[#ffb4ab] font-bold">ASK</span>}
    </div>
  );
};

interface AsciiWaveSparklineProps {
  values: number[];
  isStreaming?: boolean;
  barsCount?: number;
  colorClass?: string;
}

/**
 * Animated Unicode/ASCII block waveform (`▁▂▃▄▅▆▇█`) with a rotating
 * Braille high-frequency tick spinner (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) when streaming.
 */
export const AsciiWaveSparkline: React.FC<AsciiWaveSparklineProps> = ({
  values,
  isStreaming = true,
  barsCount = 10,
  colorClass = 'text-[#00f0ff]',
}) => {
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % BRAILLE_FRAMES.length);
    }, 140);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const slice =
    values && values.length > 0
      ? values.slice(-barsCount)
      : [0.35, 0.5, 0.75, 0.9, 0.65, 0.4, 0.8, 1.0, 0.7, 0.55].slice(0, barsCount);

  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const span = max - min > 1e-9 ? max - min : 1;

  const waveChars = slice
    .map((v, i) => {
      const norm = (v - min) / span;
      // Add subtle live harmonic ripple on the last 2 bars when streaming
      const jitter = isStreaming && i >= slice.length - 2 ? ((frameIdx + i) % 3) * 0.08 - 0.08 : 0;
      const idx = Math.max(
        0,
        Math.min(
          BLOCK_LEVELS.length - 1,
          Math.round(Math.max(0, Math.min(1, norm + jitter)) * (BLOCK_LEVELS.length - 1))
        )
      );
      return BLOCK_LEVELS[idx];
    })
    .join('');

  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] leading-none select-none tabular-nums">
      <span className={`${colorClass} tracking-[0.5px]`}>{waveChars}</span>
      {isStreaming && (
        <span className="text-[#4edea3] font-bold text-[11px]" title="WebSocket Tick Feed Active">
          {BRAILLE_FRAMES[frameIdx]}
        </span>
      )}
    </span>
  );
};

interface ScrambleValueProps {
  text: string;
  className?: string;
  durationMs?: number;
}

/**
 * 160ms cyber-cipher decode animation that cycles through `01X#ΔΣΓ`
 * before locking onto the real value whenever `text` changes.
 */
export const ScrambleValue: React.FC<ScrambleValueProps> = ({
  text,
  className = '',
  durationMs = 160,
}) => {
  const [display, setDisplay] = useState(text);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (prevTextRef.current === text) {
      setDisplay(text);
      return;
    }
    prevTextRef.current = text;

    let step = 0;
    const totalSteps = 4;
    const stepMs = Math.max(25, Math.floor(durationMs / totalSteps));

    const timer = setInterval(() => {
      step += 1;
      if (step >= totalSteps) {
        setDisplay(text);
        clearInterval(timer);
        return;
      }
      const revealRatio = step / totalSteps;
      const scrambled = text
        .split('')
        .map((ch, idx) => {
          if (ch === ' ' || ch === '$' || ch === '%' || ch === '.' || ch === '+' || ch === '-') {
            return ch;
          }
          if (idx / Math.max(1, text.length) < revealRatio) {
            return ch;
          }
          return CIPHER_CHARS[(idx + step * 3) % CIPHER_CHARS.length];
        })
        .join('');
      setDisplay(scrambled);
    }, stepMs);

    return () => clearInterval(timer);
  }, [text, durationMs]);

  return <span className={className}>{display}</span>;
};

interface AsciiRadarHeaderProps {
  symbol: string;
  regime: string;
  rvol: number;
  cvdDelta: number;
  isStreaming?: boolean;
  volumeSeries?: number[];
  trackedLevel?: { label: string; price: number } | null;
  onClearTrackedLevel?: () => void;
  onJumpToChart?: () => void;
}

/**
 * Compact Cyber-Brutalist ASCII status strip placed above the main chart and strategy workspace:
 * `[ SYS.RADAR ⠋ ] ── [ REGIME: MEAN_REV ] ── [ FLOW: ████▓▒░░ +64% ] ── [ VOL: ▂▄▆█▃ 1.42x ]`
 */
export const AsciiRadarHeader: React.FC<AsciiRadarHeaderProps> = ({
  symbol,
  regime,
  rvol,
  cvdDelta,
  isStreaming = true,
  volumeSeries,
  trackedLevel,
  onClearTrackedLevel,
  onJumpToChart,
}) => {
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % BRAILLE_FRAMES.length);
    }, 140);
    return () => clearInterval(interval);
  }, []);

  // Derive normalized buy ratio [0.15 .. 0.85] from cvdDelta sign/magnitude
  const buyRatio = Math.max(
    0.15,
    Math.min(0.85, 0.5 + Math.tanh((cvdDelta || 0) / 2500) * 0.35)
  );
  const flowPct = Math.round(buyRatio * 100);
  const shortRegime = regime
    ? regime
        .replace('MEAN_REVERTING', 'MEAN_REV')
        .replace('TREND_EXPANSION', 'TREND_EXP')
        .replace('VOLATILITY_EXPANSION', 'VOL_EXP')
        .slice(0, 14)
    : 'MEAN_REV';

  return (
    <div className="w-full bg-[#07090e] border-b border-[#1e2636] px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar whitespace-nowrap font-mono text-[10px] tabular-nums">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="px-1.5 py-0.5 bg-[#00f0ff]/10 border border-[#00f0ff]/40 text-[#00f0ff] font-bold">
          [ SYS.RADAR {isStreaming ? BRAILLE_FRAMES[frameIdx] : '●'} ]
        </span>
        <span className="text-[#3b494b] hidden sm:inline">──</span>
        <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#e1e2eb]">
          ASSET: <strong className="text-[#00f0ff]">{symbol}</strong>
        </span>
        <span className="text-[#3b494b] hidden md:inline">──</span>
        <span className="px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636] text-[#b9cacb]">
          [ REGIME: <ScrambleValue text={shortRegime} className="text-[#dbfcff] font-bold" /> ]
        </span>
        <span className="text-[#3b494b] hidden lg:inline">──</span>
        <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636]">
          <span className="text-[#849495]">FLOW:</span>
          <AsciiOrderflowBar buyRatio={buyRatio} width={10} compact />
          <span className={buyRatio >= 0.5 ? 'text-[#4edea3] font-bold' : 'text-[#ffb4ab] font-bold'}>
            {flowPct}% B
          </span>
        </div>
        <span className="text-[#3b494b] hidden xl:inline">──</span>
        <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-[#0b0e14] border border-[#1e2636]">
          <span className="text-[#849495]">VOL:</span>
          <AsciiWaveSparkline values={volumeSeries || [0.5, 0.8, 0.6, 1.1, 0.9, rvol]} isStreaming={isStreaming} barsCount={7} />
          <span
            className={`font-bold ${
              rvol >= 1.5 ? 'text-[#f59e0b]' : rvol <= 0.5 ? 'text-[#00f0ff]' : 'text-[#e1e2eb]'
            }`}
          >
            {(rvol || 1.0).toFixed(2)}x
          </span>
        </div>
      </div>

      {/* Active Chart Level Tracker Badge */}
      {trackedLevel ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 bg-[#00f0ff]/15 border border-[#00f0ff] text-[#00f0ff] font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            <span>🎯 TRACKING ON CHART:</span>
            <span className="text-[#dbfcff]">{trackedLevel.label}</span>
            <span>(${trackedLevel.price.toLocaleString()})</span>
          </span>
          {onJumpToChart && (
            <button
              type="button"
              onClick={onJumpToChart}
              className="lg:hidden px-2 py-0.5 bg-[#4edea3]/20 border border-[#4edea3] text-[#4edea3] font-bold cursor-pointer"
            >
              VIEW CHART →
            </button>
          )}
          {onClearTrackedLevel && (
            <button
              type="button"
              onClick={onClearTrackedLevel}
              className="px-1.5 py-0.5 bg-[#141821] hover:bg-[#1e2636] border border-[#272a31] text-[#849495] hover:text-[#e1e2eb] cursor-pointer"
              title="Clear locked chart level"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-1 text-[9px] text-[#849495]">
          <span className="text-[#00f0ff]">🎯 TIP:</span>
          <span>Click any level card to lock &amp; track on chart</span>
        </div>
      )}
    </div>
  );
};
