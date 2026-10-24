# Cyber-Brutalist Split-Screen Workstation & 3-Deck Command Architecture Plan

## 1. Architectural Objective
Reorganize **Project Inferno (Vertex Quant Companion Radar)** from a single-column `max-w-7xl` vertical stack (~3,500px tall) into a **full-viewport (`w-full max-w-[1920px] mx-auto`) Cyber-Brutalist Split-Screen Workstation** with snappy mechanical transitions (`motion/react`), keeping the live chart and R:R projection box permanently anchored on the left while compartmentalizing the right-hand strategy and execution deck into 3 focused workspace modes.

**Zero Feature Loss Guarantee:** Every existing calculation, prop, tooltip, Rookie/Pro mode toggle, Paper Journal workflow, and Glossary modal remains 100% intact.

---

## 2. Full-Viewport Split-Screen Cockpit (`src/App.tsx`)

1. **Top Command Bar & Full-Width Ticker Strip**:
   - Keep `Header.tsx` fixed at the top (`h-14`) and `TickerBar.tsx` spanning full width directly underneath with crisp `1px solid #1e2433` brutalist grid borders and zero wasted horizontal margin.
2. **Main 12-Column Split Grid (`grid grid-cols-1 lg:grid-cols-12 border-b border-[#1e2433]`)**:
   - **Left Pane — Live Chart & Actionability Cockpit (`lg:col-span-7 xl:col-span-7 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto no-scrollbar border-r border-[#1e2433] bg-[#0b0e14]`)**:
     - Houses `FloatingLevels`, `QuantChart`, and `TrafficLightBanner`.
     - Remains sticky on desktop viewports so the interactive candlestick/orderflow canvas and R:R projection overlay stay visible at all times while inspecting strategy lenses, MTF matrices, or position sizing on the right.
   - **Right Pane — Modular Tactical Command Deck (`lg:col-span-5 xl:col-span-5 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto bg-[#10131a]`)**:
     - Houses the refactored `StrategyTabs` 3-Deck Command Architecture with independent scrolling.

---

## 3. 3-Deck Command Architecture (`src/components/StrategyTabs.tsx`)

### Top Cyber-Brutalist Deck Switcher Bar
A high-contrast, sharp-edged 3-mode command bar pinned at the top of `StrategyTabs.tsx`:
1. **`[ SYS.01 // STRATEGY LENSES (5) ]`** *(Default active deck — shows active lens confidence badge)*
2. **`[ SYS.02 // MTF RADAR & AI BRIEF ]`** *(Shows live Bayesian `CONFLUENCE: XX%` badge)*
3. **`[ SYS.03 // PRE-FLIGHT & SIZER ]`** *(Shows live `X/5 PASSED` checklist badge + `RISK READY` status indicator)*

### Deck 1: `[ SYS.01 // STRATEGY LENSES ]`
- **5 Strategy Lens Selector Bar**:
  - `1. CANDLES & PA`, `2. MA & TREND`, `3. SMC, VP & AMD`, `4. ORDERFLOW & VDU`, `5. QUANT & OPTIONS`, each displaying its live Bayesian confidence percentage (`tabular-nums`).
- **Compact Confidence HUD Header**:
  - High-density brutalist header displaying the circular SVG Confidence Gauge, the 4 Bayesian Pillar bars (`Structure`, `Orderflow`, `Derivatives`, `Cross-TF`), and the Rookie/Pro Plain-English takeaway strip.
- **Internal Sub-View Segmented Toggle (`[ A // DEEP DIAGNOSTICS ]` vs `[ B // ACTIONABLE SETUP ]`)**:
  - **`[ A // DEEP DIAGNOSTICS ]`**: Renders the active lens's quantitative diagnostic modules:
    - *Tab 1*: Hurst Exponent & ADX Regime Classifier + Candlestick Pattern Scanner + 3 Structural Pillars.
    - *Tab 2*: EMA Ribbon Alignment + Spot-vs-Perp CVD Flow & Basis Banner + VWMA Z-Score & Dynamic Pivot Matrix.
    - *Tab 3*: Institutional AMD Phase Engine + Volume Profile & Order Block Mitigation Progress Cards.
    - *Tab 4*: Spot-vs-Perp CVD Flow Banner + Volume Dry-Up (VDU) / Ignition / Absorption Scanner + 500-Depth Bid/Ask Liquidity Walls.
    - *Tab 5*: Black-Scholes GEX / Zero-Gamma Flip / Max Pain & 25D Skew + 6 Derivatives Telemetry Cards.
  - **`[ B // ACTIONABLE SETUP ]`**: Renders the lens-specific **Potential Setup Speculation Card** (`renderSetupSpeculationCard`) with Reaction Zone, Entry Trigger, Invalidation, Targets, **"LOAD SETUP INTO CALCULATOR"**, and **"LOG PAPER TRADE"**.
  - **Auto-Jump Workflow**: Clicking **"LOAD SETUP INTO CALCULATOR"** or **"LOG PAPER TRADE"** loads the entry/stop prices into the execution engine and automatically transitions `activeDeck` to **`[ SYS.03 // PRE-FLIGHT & SIZER ]`** so the trader can immediately verify the 5-point checklist and size their order while watching the R:R box update on the left chart pane.

### Deck 2: `[ SYS.02 // MTF RADAR & AI BRIEF ]`
- **Multi-Timeframe Confluence Matrix (`ConfluenceMatrix.tsx`)**: Full `15m / 1H / 4H / 1D` structural matrix, Bayesian Confluence Gauge, and Market Regime / Mean Volatility tags.
- **AI Quant Synthesis Brief (`SpeculationBrief.tsx`)**: Interactive **`RUN QUANT`** button, Confidence, Execution Zone, Liquidity Trap Alert, and Invalidation brief.
- **3x2 Derivatives & Skew Telemetry Grid (`TelemetryCards.tsx`)**: Rolling Sharpe/Sortino, Funding/OI Regime, CVD Delta, RSI-14, Liquidation Cluster, and Spot-vs-Perp Basis telemetry.

### Deck 3: `[ SYS.03 // PRE-FLIGHT & SIZER ]`
- **5-Point Auto-Graded Pre-Flight Checklist (`PreFlightChecklist.tsx`)**: Live `X/5` institutional criteria evaluation, Leverage Safety Cap guardrail, Maker Limit vs. Taker Market toggle, and 1-Click Paper Trade Logger.
- **Microstructure Execution Calculator (`ExecutionHelper.tsx`)**: Risk USDT, Entry Price, Stop Loss inputs, Fee + Orderbook Slippage Drag adjustment, Net Effective R:R, and 50/30/20 scale-out targets (`TP1`, `TP2`, `TP3`).

---

## 4. Cyber-Brutalist Visual Language & Mechanical Animations (`motion/react`)

- **Hard-Edged Terminal Geometry**:
  - Crisp `1px solid #1e2433` structural borders, `rounded-none` / `rounded-[2px]` brutalist module framing, left-edge status accent bars (`border-l-2`), and monospace index tags (`SYS.01`, `SYS.02`, `SYS.03`, `DIAG_A`, `EXEC_B`).
  - Subtle `tabular-nums` alignment across all prices, percentages, and R:R metrics.
- **Mechanical `motion/react` Transitions**:
  - Wrap Deck transitions (`SYS.01` / `SYS.02` / `SYS.03`), Strategy Lens switches (`1`–`5`), and Sub-View switches (`DIAGNOSTICS` / `SETUP`) in `<AnimatePresence mode="wait">` with `140ms` snappy cubic-bezier slide-and-fade transitions (`initial={{ opacity: 0, y: 6 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -6 }}`, `transition={{ duration: 0.14, ease: 'easeOut' }}`).
  - Animate the 4 Bayesian Pillar bars and AMD progress meters with smooth `motion.div` spring width transitions.

---

## 5. Verification Plan
1. Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript or prop errors across `src/App.tsx` and `src/components/StrategyTabs.tsx`.
2. Run `compile_applet` (`npm run build`) to confirm a clean production bundle.
