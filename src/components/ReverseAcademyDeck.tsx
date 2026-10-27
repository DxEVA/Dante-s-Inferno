import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ReverseAcademyInput,
  deconstructLiveSignal,
  generateCurriculumModules,
  loadAcademyProgress,
  saveAcademyProgress,
  AcademyProgressState,
} from '../utils/reverseAcademyEngine';
import { getRookieMentorGuide } from '../utils/metricBenchmarks';

interface ReverseAcademyDeckProps extends ReverseAcademyInput {
  onProgressChange?: (progress: AcademyProgressState) => void;
  focusXRaySignal?: number;
}

export const ReverseAcademyDeck: React.FC<ReverseAcademyDeckProps> = ({
  symbol,
  currentPrice,
  telemetry,
  volumeProfile,
  bullOB,
  bearOB,
  optionsData,
  liquidity,
  candlestickResult,
  maResult,
  amdPhase,
  calcResult,
  sharpeSortino,
  confluence,
  onProgressChange,
  focusXRaySignal,
}) => {
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [expandedIndicatorId, setExpandedIndicatorId] = useState<string>('risk_stop_dist');
  const [progress, setProgress] = useState<AcademyProgressState>(() => loadAcademyProgress());
  const [selectedQuizOption, setSelectedQuizOption] = useState<Record<number, number | null>>({});
  const [submittedQuizLevel, setSubmittedQuizLevel] = useState<Record<number, boolean>>({});
  const [xrayExpanded, setXrayExpanded] = useState<boolean>(true);

  useEffect(() => {
    if (focusXRaySignal) {
      setXrayExpanded(true);
    }
  }, [focusXRaySignal]);

  const engineInput: ReverseAcademyInput = useMemo(
    () => ({
      symbol,
      currentPrice,
      telemetry,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      candlestickResult,
      maResult,
      amdPhase,
      calcResult,
      sharpeSortino,
      confluence,
    }),
    [
      symbol,
      currentPrice,
      telemetry,
      volumeProfile,
      bullOB,
      bearOB,
      optionsData,
      liquidity,
      candlestickResult,
      maResult,
      amdPhase,
      calcResult,
      sharpeSortino,
      confluence,
    ]
  );

  const signalTree = useMemo(() => deconstructLiveSignal(engineInput), [engineInput]);
  const curriculum = useMemo(() => generateCurriculumModules(engineInput), [engineInput]);

  const currentModule = useMemo(
    () => curriculum.find((m) => m.level === activeLevel) || curriculum[0],
    [curriculum, activeLevel]
  );

  const handleSelectLevel = (lvl: 1 | 2 | 3 | 4 | 5) => {
    setActiveLevel(lvl);
    const mod = curriculum.find((m) => m.level === lvl);
    if (mod && mod.indicators.length > 0) {
      setExpandedIndicatorId(mod.indicators[0].id);
    }
  };

  const handleQuizSubmit = (levelId: number, optionIndex: number, correctIndex: number) => {
    setSelectedQuizOption((prev) => ({ ...prev, [levelId]: optionIndex }));
    setSubmittedQuizLevel((prev) => ({ ...prev, [levelId]: true }));
    const passed = optionIndex === correctIndex;
    if (passed) {
      const updated = saveAcademyProgress(levelId, true);
      setProgress(updated);
      onProgressChange?.(updated);
    }
  };

  const masteryPct = Math.round((progress.completedLevels.length / 5) * 100);

  const lightAccentColor =
    signalTree.lightStatus === 'GREEN'
      ? '#4edea3'
      : signalTree.lightStatus === 'YELLOW'
      ? '#f59e0b'
      : '#f43f5e';

  return (
    <div className="flex flex-col p-3 gap-3.5 font-sans">
      {/* ===================================================================== */}
      {/* TOP PANEL: REVERSE SIGNAL X-RAY (TOP-DOWN 4-NODE DECONSTRUCTOR)       */}
      {/* ===================================================================== */}
      <div
        className="flex flex-col bg-[#0b0e14] border border-[#1e2433] border-l-2 rounded-none overflow-hidden"
        style={{ borderLeftColor: lightAccentColor }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2.5 bg-[#141821] border-b border-[#1e2433]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-1.5 py-0.5 bg-[#0b0e14] text-[#00f0ff] border border-[#00f0ff]/40 font-mono text-[9px] font-bold">
              SYS.04 // X-RAY
            </span>
            <span className="font-mono text-[11px] font-bold text-[#e1e2eb] uppercase tracking-wider">
              🔬 REVERSE SIGNAL X-RAY (TOP-DOWN LIVE DECONSTRUCTOR)
            </span>
            <span
              className={`font-mono text-[9px] font-bold px-2 py-0.5 border tabular-nums ${
                signalTree.lightStatus === 'GREEN'
                  ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                  : signalTree.lightStatus === 'YELLOW'
                  ? 'bg-[#f59e0b]/15 text-[#fcd34d] border-[#f59e0b]/40'
                  : 'bg-[#f43f5e]/15 text-[#ffb4ab] border-[#f43f5e]/40'
              }`}
            >
              {signalTree.node1_verdict.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setXrayExpanded((prev) => !prev)}
            className="px-2 py-0.5 bg-[#0b0e14] hover:bg-[#191c22] text-[#00f0ff] border border-[#1e2433] font-mono text-[9px] font-bold uppercase cursor-pointer"
          >
            {xrayExpanded ? '▲ COLLAPSE X-RAY' : '▼ EXPAND X-RAY'}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {xrayExpanded && (
            <motion.div
              key="xray-body"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="flex flex-col p-3 gap-2.5"
            >
              {/* NODE 1: LIVE VERDICT */}
              <div className="p-2.5 bg-[#141821] border border-[#1e2433] flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-[9px] text-[#00f0ff] font-bold uppercase tracking-wider">
                    NODE 01 // TOP-LEVEL ACTIONABILITY VERDICT ({symbol})
                  </span>
                  <span className="font-mono text-[9px] text-[#849495]">
                    STEP 1 OF 4: START AT THE CONCLUSION
                  </span>
                </div>
                <div className="font-mono text-[13px] font-bold text-[#dbfcff]">
                  {signalTree.node1_verdict.title}
                </div>
                <p className="text-[11px] text-[#b9cacb] leading-relaxed">
                  {signalTree.node1_verdict.summary}
                </p>
              </div>

              {/* CONNECTOR ARROW */}
              <div className="flex items-center justify-center font-mono text-[9px] text-[#00f0ff] tracking-widest">
                ↓ WHY IS THE TERMINAL SAYING THIS? (3 LIVE TRIGGER NUMBERS) ↓
              </div>

              {/* NODE 2: 3 TRIGGERING METRICS */}
              <div className="grid grid-cols-1 gap-2">
                {signalTree.node2_triggers.map((trig, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#141821] border border-[#1e2433] flex flex-col gap-1 tabular-nums"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-[#e1e2eb]">
                        {trig.label}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 border ${
                          trig.impact === 'BULLISH'
                            ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                            : trig.impact === 'WARNING'
                            ? 'bg-[#f59e0b]/10 text-[#fcd34d] border-[#f59e0b]/30'
                            : 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/30'
                        }`}
                      >
                        {trig.liveValue}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#b9cacb] leading-snug">{trig.explanation}</p>
                  </div>
                ))}
              </div>

              {/* CONNECTOR ARROW */}
              <div className="flex items-center justify-center font-mono text-[9px] text-[#fcd34d] tracking-widest">
                ↓ WHO IS IN CONTROL VS. WHO IS TRAPPED? (MARKET PSYCHOLOGY) ↓
              </div>

              {/* NODE 3: MARKET PSYCHOLOGY */}
              <div className="p-2.5 bg-[#141821] border border-[#1e2433] flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2 bg-[#0b0e14] border border-[#1e2433]">
                    <span className="font-mono text-[8px] text-[#4edea3] uppercase font-bold block">
                      🏛️ IN CONTROL RIGHT NOW
                    </span>
                    <span className="font-mono text-[10px] text-[#e1e2eb] font-semibold mt-0.5 block">
                      {signalTree.node3_psychology.whoIsInControl}
                    </span>
                  </div>
                  <div className="p-2 bg-[#0b0e14] border border-[#1e2433]">
                    <span className="font-mono text-[8px] text-[#ffb4ab] uppercase font-bold block">
                      🪤 VULNERABLE / TRAPPED OFFSIDE
                    </span>
                    <span className="font-mono text-[10px] text-[#e1e2eb] font-semibold mt-0.5 block">
                      {signalTree.node3_psychology.whoIsTrapped}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#dbfcff] leading-relaxed bg-[#0b0e14] p-2 border border-[#1e2433]">
                  <strong className="font-mono text-[#00f0ff] uppercase text-[10px]">
                    Plain-English Tape Read:{' '}
                  </strong>
                  {signalTree.node3_psychology.plainEnglishNarrative}
                </p>
              </div>

              {/* CONNECTOR ARROW */}
              <div className="flex items-center justify-center font-mono text-[9px] text-[#4edea3] tracking-widest">
                ↓ WHAT EXACT NUMBER FLIPS OR TRIGGERS THIS SETUP? ↓
              </div>

              {/* NODE 4: WHAT TO WATCH NEXT */}
              <div className="p-2.5 bg-[#141821] border border-[#1e2433] flex flex-col gap-1.5 tabular-nums">
                <span className="font-mono text-[9px] text-[#4edea3] font-bold uppercase tracking-wider">
                  NODE 04 // EXACT NUMERICAL FLIP THRESHOLDS TO WATCH ON {symbol}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-[#0b0e14] border border-[#4edea3]/30">
                    <span className="font-mono text-[9px] text-[#4edea3] font-bold block">
                      ▲ BULLISH CONFIRMATION TRIGGER
                    </span>
                    <span className="text-[#b9cacb] mt-0.5 block leading-snug">
                      {signalTree.node4_whatToWatch.bullishFlipCondition}
                    </span>
                  </div>
                  <div className="p-2 bg-[#0b0e14] border border-[#f43f5e]/30">
                    <span className="font-mono text-[9px] text-[#ffb4ab] font-bold block">
                      ▼ BEARISH BREAKDOWN / INVALIDATION
                    </span>
                    <span className="text-[#b9cacb] mt-0.5 block leading-snug">
                      {signalTree.node4_whatToWatch.bearishFlipCondition}
                    </span>
                  </div>
                </div>
                <div className="mt-1 px-2.5 py-1.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 font-mono text-[10px] text-[#dbfcff]">
                  <strong>EXECUTION RULE:</strong> {signalTree.node4_whatToWatch.actionableRule}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===================================================================== */}
      {/* MIDDLE PANEL: 5-LEVEL PROGRESSIVE MASTERY CURRICULUM                  */}
      {/* ===================================================================== */}
      <div className="flex flex-col bg-[#0b0e14] border border-[#1e2433] rounded-none">
        {/* Curriculum Header & Mastery Progress Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2.5 bg-[#141821] border-b border-[#1e2433]">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              🎓 5-LEVEL QUANTITATIVE MASTERY CURRICULUM (LIVE {symbol} VALUES)
            </span>
            <span className="font-mono text-[9px] text-[#849495]">
              Every indicator in the terminal taught through your live streaming chart
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums">
            <span className="text-[#849495]">MASTERY:</span>
            <span className="px-2 py-0.5 bg-[#0b0e14] border border-[#4edea3]/40 text-[#4edea3] font-bold">
              {progress.completedLevels.length}/5 LEVELS ({masteryPct}%)
            </span>
          </div>
        </div>

        {/* 5 Level Selector Buttons */}
        <div className="grid grid-cols-5 bg-[#0b0e14] border-b border-[#1e2433]">
          {curriculum.map((mod) => {
            const isActive = activeLevel === mod.level;
            const isCompleted = progress.completedLevels.includes(mod.level);
            return (
              <button
                key={mod.level}
                type="button"
                onClick={() => handleSelectLevel(mod.level)}
                className={`flex flex-col items-start justify-between p-2 border-r last:border-r-0 border-[#1e2433] font-mono text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#191c22] text-[#00f0ff] border-b-2 border-b-[#00f0ff]'
                    : 'bg-[#0b0e14] text-[#849495] hover:bg-[#141821] hover:text-[#e1e2eb]'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="text-[9px] font-bold">LVL 0{mod.level}</span>
                  {isCompleted && (
                    <span className="text-[9px] px-1 bg-[#4edea3]/20 text-[#4edea3] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-[8px] text-[#b9cacb] truncate w-full mt-0.5">
                  {mod.level === 1
                    ? 'Sizing & Drag'
                    : mod.level === 2
                    ? 'Auction & EMAs'
                    : mod.level === 3
                    ? 'VP, OB & AMD'
                    : mod.level === 4
                    ? 'Orderflow & CVD'
                    : 'Hurst & GEX'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Level Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`academy-level-${currentModule.level}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="flex flex-col p-3 gap-3"
          >
            {/* Level Banner */}
            <div className="p-2.5 bg-[#141821] border border-[#1e2433] border-l-2 border-l-[#00f0ff] flex flex-col gap-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#0b0e14] text-[#00f0ff] border border-[#1e2433] font-bold">
                  {currentModule.tierBadge}
                </span>
                <span className="font-mono text-[9px] text-[#849495]">
                  CLICK ANY INDICATOR BELOW TO INSPECT LIVE FORMULA &amp; MENTAL MODEL
                </span>
              </div>
              <h4 className="font-mono text-[14px] font-bold text-[#e1e2eb] mt-0.5">
                {currentModule.title}
              </h4>
              <p className="text-[11px] text-[#b9cacb] leading-snug">{currentModule.subtitle}</p>
            </div>

            {/* Indicator Accordion Cards with Live Value Gauges */}
            <div className="flex flex-col gap-2">
              {currentModule.indicators.map((ind, idx) => {
                const isExpanded = expandedIndicatorId === ind.id;
                const zoneBadgeClass =
                  ind.thresholdScale.currentZone === 'BULLISH_OR_EDGE'
                    ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                    : ind.thresholdScale.currentZone === 'BEARISH_OR_DANGER'
                    ? 'bg-[#f43f5e]/15 text-[#ffb4ab] border-[#f43f5e]/40'
                    : 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40';

                const mentor = getRookieMentorGuide(
                  ind.id || ind.name,
                  symbol,
                  ind.liveValueFormatted,
                  ind.reverseRead
                );

                return (
                  <div
                    key={ind.id}
                    className={`border transition-colors ${
                      isExpanded
                        ? 'bg-[#141821] border-[#00f0ff]/60'
                        : 'bg-[#10131a] border-[#1e2433] hover:border-[#3b494b]'
                    }`}
                  >
                    {/* Clickable Card Header */}
                    <button
                      type="button"
                      onClick={() => setExpandedIndicatorId(isExpanded ? '' : ind.id)}
                      className="w-full flex items-center justify-between gap-2 p-2.5 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#0b0e14] text-[#849495] border border-[#1e2433] shrink-0">
                          {currentModule.level}.{idx + 1}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[#e1e2eb] truncate">
                          {ind.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 border ${zoneBadgeClass}`}
                        >
                          {ind.liveValueFormatted}
                        </span>
                        <span className="font-mono text-[10px] text-[#00f0ff]">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Reverse Deconstruction Drawer */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="p-3 pt-0 flex flex-col gap-2.5 border-t border-[#1e2433]"
                        >
                          {/* 1. Reverse Read: What This Live Number Means Right Now */}
                          <div className="mt-2.5 p-2.5 bg-[#0b0e14] border border-[#1e2433] border-l-2 border-l-[#00f0ff]">
                            <span className="font-mono text-[9px] text-[#00f0ff] uppercase font-bold block">
                              1. LIVE REVERSE READ ON {symbol} RIGHT NOW:
                            </span>
                            <p className="text-[12px] text-[#dbfcff] leading-relaxed mt-1">
                              {ind.reverseRead}
                            </p>
                          </div>

                          {/* 2. 3-Zone Threshold Scale Bar */}
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[9px] text-[#849495] uppercase font-bold">
                              2. INSTITUTIONAL THRESHOLD SCALE:
                            </span>
                            {(() => {
                              const activeBox =
                                ind.thresholdScale.activeBox ||
                                (ind.thresholdScale.currentZone === 'BEARISH_OR_DANGER'
                                  ? 'A'
                                  : ind.thresholdScale.currentZone === 'NEUTRAL'
                                  ? 'B'
                                  : 'C');
                              const activeHighlightClass =
                                ind.thresholdScale.currentZone === 'BULLISH_OR_EDGE'
                                  ? 'bg-[#4edea3]/15 border-[#4edea3] text-[#4edea3] font-bold'
                                  : ind.thresholdScale.currentZone === 'BEARISH_OR_DANGER'
                                  ? 'bg-[#f43f5e]/15 border-[#f43f5e] text-[#ffb4ab] font-bold'
                                  : 'bg-[#00f0ff]/15 border-[#00f0ff] text-[#00f0ff] font-bold';
                              const inactiveClass = 'bg-[#0b0e14] border-[#1e2433] text-[#849495]';

                              return (
                                <div className="grid grid-cols-3 gap-1.5 font-mono text-[9px] tabular-nums">
                                  <div
                                    className={`p-2 border ${
                                      activeBox === 'A' ? activeHighlightClass : inactiveClass
                                    }`}
                                  >
                                    <span className="block text-[8px] uppercase opacity-75">
                                      ZONE A {activeBox === 'A' ? '• ACTIVE' : ''}
                                    </span>
                                    {ind.thresholdScale.minLabel}
                                  </div>
                                  <div
                                    className={`p-2 border ${
                                      activeBox === 'B' ? activeHighlightClass : inactiveClass
                                    }`}
                                  >
                                    <span className="block text-[8px] uppercase opacity-75">
                                      ZONE B {activeBox === 'B' ? '• ACTIVE' : ''}
                                    </span>
                                    {ind.thresholdScale.midLabel}
                                  </div>
                                  <div
                                    className={`p-2 border ${
                                      activeBox === 'C' ? activeHighlightClass : inactiveClass
                                    }`}
                                  >
                                    <span className="block text-[8px] uppercase opacity-75">
                                      ZONE C {activeBox === 'C' ? '• ACTIVE' : ''}
                                    </span>
                                    {ind.thresholdScale.maxLabel}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* 3. Mental Model Analogy & 4. Formula */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-2.5 bg-[#0b0e14] border border-[#1e2433]">
                              <span className="font-mono text-[9px] text-[#fcd34d] uppercase font-bold block">
                                🧠 ZERO-JARGON MENTAL MODEL
                              </span>
                              <p className="text-[11px] text-[#b9cacb] leading-relaxed mt-1">
                                {ind.mentalModel}
                              </p>
                            </div>
                            <div className="p-2.5 bg-[#0b0e14] border border-[#1e2433]">
                              <span className="font-mono text-[9px] text-[#ddb7ff] uppercase font-bold block">
                                🧮 UNDER-THE-HOOD QUANT FORMULA
                              </span>
                              <p className="font-mono text-[10px] text-[#e1e2eb] leading-relaxed mt-1">
                                {ind.formulaPlain}
                              </p>
                            </div>
                          </div>

                          {/* 5. Familiar Basic Indicator Bridge + Do / Don't Cheat Sheet */}
                          <div className="p-2.5 bg-[#0b0e14] border border-[#1e2433] flex flex-col gap-2">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="font-mono text-[9px] text-[#00f0ff] uppercase font-bold">
                                🔗 BRIDGE FROM BASIC INDICATORS (RSI / EMA / S&amp;R / VOLUME)
                              </span>
                              <span className="font-mono text-[8.5px] text-[#849495]">
                                Normal: {mentor.standardRangeGuide.normal}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#dbfcff] leading-relaxed">
                              {mentor.familiarBridge}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                              <div className="p-2 bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3]">
                                <strong className="font-mono uppercase block text-[9px]">
                                  ✓ ROOKIE DO RULE:
                                </strong>
                                {mentor.rookieActionRule.doThis}
                              </div>
                              <div className="p-2 bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#ffb4ab]">
                                <strong className="font-mono uppercase block text-[9px]">
                                  ✕ ROOKIE AVOID TRAP:
                                </strong>
                                {mentor.rookieActionRule.avoidTrap}
                              </div>
                            </div>
                          </div>

                          {/* 6. Direct Clickable Online Learning Resources */}
                          {mentor.resources.length > 0 && (
                            <div className="p-2.5 bg-[#0b0e14] border border-[#1e2433] flex flex-col gap-1.5">
                              <span className="font-mono text-[9px] text-[#fcd34d] uppercase font-bold">
                                🌐 STUDY THIS CONCEPT ONLINE (FREE TRUSTED RESOURCES)
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                {mentor.resources.map((link, lIdx) => (
                                  <a
                                    key={lIdx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-[#141821] hover:bg-[#191c22] border border-[#1e2433] hover:border-[#00f0ff] transition-colors flex flex-col justify-between gap-1 group"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="px-1.5 py-0.5 bg-[#00f0ff]/15 text-[#00f0ff] font-mono text-[8px] font-bold">
                                        {link.type === 'VIDEO'
                                          ? '▶ WATCH VIDEO'
                                          : link.type === 'INTERACTIVE'
                                          ? '⚡ INTERACTIVE'
                                          : '📖 READ GUIDE'}
                                      </span>
                                      <span className="font-mono text-[8px] text-[#849495]">
                                        {link.sourceName} ↗
                                      </span>
                                    </div>
                                    <span className="font-mono text-[10px] font-semibold text-[#e1e2eb] group-hover:text-[#00f0ff] line-clamp-2">
                                      {link.title}
                                    </span>
                                    <span className="font-mono text-[8px] text-[#849495]">
                                      {link.durationOrLevel}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>


            {/* ================================================================= */}
            {/* BOTTOM PANEL: LIVE CHART SPOT-CHECK CHALLENGE QUIZ                */}
            {/* ================================================================= */}
            <div className="mt-1 p-3 bg-[#141821] border border-[#1e2433] border-l-2 border-l-[#fcd34d] flex flex-col gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/40 font-mono text-[9px] font-bold">
                    LIVE SPOT-CHECK // LVL 0{currentModule.level}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#e1e2eb] uppercase">
                    VERIFY YOUR READ ON LIVE {symbol} TELEMETRY
                  </span>
                </div>
                {progress.completedLevels.includes(currentModule.level) && (
                  <span className="px-2 py-0.5 bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/40 font-mono text-[9px] font-bold">
                    ✓ LEVEL {currentModule.level} MASTERED
                  </span>
                )}
              </div>

              <p className="text-[12px] text-[#dbfcff] font-medium leading-relaxed">
                {currentModule.liveQuiz.question}
              </p>

              <div className="flex flex-col gap-1.5">
                {currentModule.liveQuiz.options.map((opt, oIdx) => {
                  const chosen = selectedQuizOption[currentModule.level];
                  const isSubmitted = submittedQuizLevel[currentModule.level];
                  const isCorrect = oIdx === currentModule.liveQuiz.correctIndex;
                  const isSelected = chosen === oIdx;

                  let btnClass =
                    'bg-[#0b0e14] border-[#1e2433] text-[#b9cacb] hover:border-[#00f0ff]/50 hover:text-[#e1e2eb]';
                  if (isSubmitted) {
                    if (isCorrect) {
                      btnClass = 'bg-[#4edea3]/15 border-[#4edea3] text-[#4edea3] font-semibold';
                    } else if (isSelected && !isCorrect) {
                      btnClass = 'bg-[#f43f5e]/15 border-[#f43f5e] text-[#ffb4ab]';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() =>
                        handleQuizSubmit(
                          currentModule.level,
                          oIdx,
                          currentModule.liveQuiz.correctIndex
                        )
                      }
                      className={`p-2.5 border text-left font-sans text-[11px] transition-all cursor-pointer flex items-start gap-2 ${btnClass}`}
                    >
                      <span className="font-mono text-[10px] font-bold shrink-0">
                        [{String.fromCharCode(65 + oIdx)}]
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {submittedQuizLevel[currentModule.level] && (
                <div
                  className={`p-2.5 border font-sans text-[11px] leading-relaxed ${
                    selectedQuizOption[currentModule.level] === currentModule.liveQuiz.correctIndex
                      ? 'bg-[#4edea3]/10 border-[#4edea3]/40 text-[#4edea3]'
                      : 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#fcd34d]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span>
                      {selectedQuizOption[currentModule.level] ===
                      currentModule.liveQuiz.correctIndex
                        ? `✓ CORRECT: ${currentModule.liveQuiz.explanationRight}`
                        : `↺ TRY AGAIN: ${currentModule.liveQuiz.explanationWrong}`}
                    </span>
                    {selectedQuizOption[currentModule.level] ===
                      currentModule.liveQuiz.correctIndex &&
                      currentModule.level < 5 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectLevel((currentModule.level + 1) as 1 | 2 | 3 | 4 | 5)
                          }
                          className="px-2.5 py-1 bg-[#0b0e14] text-[#00f0ff] border border-[#00f0ff] font-mono text-[9px] font-bold uppercase cursor-pointer shrink-0"
                        >
                          ADVANCE TO LEVEL {currentModule.level + 1} →
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
