# Famous Trader, SSRN, Gann & Classical Playbook Scanner

This upgrade equips **Project Inferno** with a deterministic astronomical, cyclical, and classical quantitative engine that evaluates **14 world-renowned trading frameworks across 4 eras** (`GANN & CYCLICAL`, `CLASSICAL LEGENDS`, `SSRN ACADEMIC`, and `OPTIONS & DEALER`) against live orderflow, derivatives telemetry, and 250-bar historical klines. It introduces a **"🎯 BEST AVAILABLE SETUPS TO ASSESS"** command hub with a Top 3 composite-edge podium, interactive Gann Square of 9 chart-level spotlighting, a dedicated Strategy Assessment Modal, and 1-click loading into the Stage 06 Execution Sizer and chart R:R box.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices incorporate your confirmed selections from Phase 1 while preserving 100% of existing Stages 01–06, chart layers, and light/dark theme readability.

- **Confirmed Decision 1 (Dedicated Strategy Assessment Modal)**: Clicking **`[ 🔍 ASSESS RULES ]`** on any of the Top 3 Podium cards (or any strategy card in the 14-model library) opens a high-contrast **Strategy Assessment Modal Overlay** displaying the complete 4-rule mathematical diagnostic breakdown, live Gann/Lunar/Classical readings, 250-bar walk-forward backtest expectancy, Rookie & Pro thesis breakdown, external SSRN/Book citation link, interactive chart level spotlight buttons, and 1-click execution sizer loading.
- **Confirmed Decision 2 (Interactive Chart Level Spotlighting & Sizer Loading)**: Clicking any Gann Square of 9 harmonic pill (`-180°`, `-90° SUP`, `+90° RES`, `+180°`) or strategy trade level (`Entry`, `Stop`, `TP1`, `TP2`) spotlights that exact price line on the live candlestick chart via `onHoverLevel`, while clicking **`[ ⚡ APPLY TO CHART & SIZER ]`** populates `ExecutionHelper`, transitions to Stage 06, and renders the live `R:R BOX` on `QuantChart`.
- **Confirmed Decision 3 (250-Bar 20-Candle Forward Lookahead Backtest)**: Every strategy is evaluated across the active asset's 250 historical klines using a deterministic 20-bar forward lookahead window that checks whether `TP1` (`1.5R–2.0R`) is reached before `Stop Loss`, computing authentic `Signals Found`, `Win Rate %`, `Avg Realized R`, and `Expectancy R`.

---

### 1. Overview & Core Concept

- **What It Does**: Synthesizes astronomical lunar synodic cycles, W.D. Gann solar seasonal cardinal dates, Square of 9 square-root price harmonics, classical tape counters (Tom DeMark TD Sequential 9, Toby Crabel NR7/NR4, Richard Dennis 20-bar Donchian, Larry Williams %R), and SSRN academic microstructure models into a unified live strategy scanner.
- **Target Audience / Persona**: Both Rookie traders (who need clear plain-English analogies, ranked best setups, and step-by-step checklists) and Institutional/Pro quant traders (who want instant verification of multi-factor rules, historical expectancy over the last 250 bars, and harmonic price targets).
- **Key Value**: Eliminates analysis paralysis by automatically surfacing the **Top 3 highest-probability setups right now** on the active symbol (`Possibility Score × 0.65 + Backtest Win Rate × 0.35`) and bridging research directly to chart visualization and position sizing.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Top View Switcher & Stage 06 Banner**: Users can switch to **`[ 🏆 BEST SETUPS & PLAYBOOKS (X READY) ]`** directly from the top pinned pipeline bar or from a prominent shortcut banner inside Stage 06 (`EXECUTE`).
  2. **Section 1 — 🌙 Gann Astro-Geometric, Lunar & Classical Telemetry Bar**: A 4-card telemetry strip displaying:
     - *Card 1 (Lunar Synodic Phase — SSRN)*: Live moon phase emoji & name, illumination %, synodic age (`XX.Xd / 29.5d`), inflection window status, and Yuan, Zheng & Zhu (2006) behavioral note.
     - *Card 2 (Gann Solar Seasonal Cycle)*: Ecliptic solar longitude (`0°–360°`), active seasonal quadrant, countdown to the next Gann Cardinal / Cross-Quarter inflection date, and seasonal bias.
     - *Card 3 (Gann Square of 9 Harmonics)*: Interactive buttons for `-180°`, `-90° SUP`, `+90° RES`, and `+180°` harmonic levels that lock/spotlight the price level on `QuantChart`.
     - *Card 4 (Classical Tape Counters)*: Live TD Sequential count (`1–9` Buy/Sell exhaustion), Toby Crabel `NR7 / NR4` volatility compression status, 20-bar Donchian channel width, and 14-bar Williams `%R`.
  3. **Section 2 — 🎯 Top 3 Best Available Setups Podium**: A 3-column podium highlighting `#1 BEST EDGE NOW`, `#2 RUNNER-UP`, and `#3 ALTERNATIVE` with Era badge, Direction (`LONG` / `SHORT`), Match Score (`XX%`), 250-bar Win Rate & Avg R, **`[ 🔍 ASSESS RULES ]`** modal trigger, and **`[ ⚡ LOAD INTO SIZER → ]`**.
  4. **Section 3 — Full 14-Model Research Library with Era Filters**: Interactive filter bar (`ALL (14)`, `🟢 READY TO TRADE (>=70%)`, `🌙 GANN & CYCLICAL`, `🏛️ CLASSICAL LEGENDS`, `📄 SSRN ACADEMIC`, `⚡ OPTIONS & ORDERFLOW`) displaying each strategy card with its 4-rule live checklist, 250-bar backtest strip, Rookie/Pro explanation, citation link, chart level trackers, and sizer loader.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast Cyber-Brutalist quantitative terminal with full dual-theme (`dark` and `light` mode) support.
  - *Color Palette & Mood*: Deep obsidian (`#0b0e14`, `#10131a`) in dark mode and crisp slate/white (`#ffffff`, `#f8fafc`, `#0f172a`) in light mode, accented with semantic cyan (`#00f0ff` / `#0284c7`), emerald (`#4edea3` / `#047857`), amber (`#f59e0b` / `#b45309`), and coral (`#ffb4ab` / `#b91c1c`).
  - *Typography & Hierarchy*: `JetBrains Mono` with strict `tabular-nums` for all prices, degrees, scores, and backtest metrics, paired with clean sans-serif prose for Rookie/Pro explanations.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Deterministic Local Astronomical & Square-of-9 Engine**
  - *Chosen Approach*: Compute synodic lunar age from the J2000.0 astronomical epoch (`2000-01-06T18:14:00Z`, synodic period `29.530588853` days), solar ecliptic longitude anchored to the Vernal Equinox, and radix-normalized Gann Square of 9 square-root steps (`±0.25`, `±0.50`, `±1.00` root increments) directly in TypeScript.
  - *Why*: Zero external API latency, 100% deterministic accuracy across any asset price scale (from `$0.00001` meme coins to `$100,000` BTC), and instant reactivity on symbol switches.
- **Decision 2: Walk-Forward 250-Bar Backtest with 20-Bar Horizon**
  - *Chosen Approach*: Evaluate each strategy's entry trigger across bars `25` to `klines.length - 2` and inspect the subsequent 20 bars to determine whether `TP1` or `Stop Loss` is hit first (or mark-to-market at bar +20).
  - *Why*: Provides realistic, asset-specific empirical validation without UI frame drops.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     Famous Strategies & Gann Engine                        │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │ calculateGannAndCyclesTelemetry()  │  │ evaluateFamousStrategies()   │  │
│  │ • Synodic Lunar Age & Illumination │  │ • 14 Models across 4 Eras    │  │
│  │ • Solar Longitude & Cardinal Dates │  │ • 4 Live Mathematical Rules  │  │
│  │ • Square of 9 (±45°, ±90°, ±180°)  │  │ • 250-Bar 20-Candle Backtest │  │
│  │ • TD9, NR7/NR4, Donchian20, %R(14) │  │ • Composite Edge Ranking     │  │
│  └─────────────────┬──────────────────┘  └──────────────┬───────────────┘  │
└────────────────────┼────────────────────────────────────┼──────────────────┘
                     ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│             StrategyTabs View: BEST SETUPS & PLAYBOOKS (14)                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Section 1: 4-Card Gann, Lunar, Solar & Classical Telemetry Strip     │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ Section 2: Top 3 Best Available Setups Podium + Assessment Modal     │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ Section 3: 14-Model Filterable Research Library                      │  │
│  └─────────────────┬────────────────────────────────────┬───────────────┘  │
└────────────────────┼────────────────────────────────────┼──────────────────┘
                     ▼                                    ▼
       [QuantChart: onHoverLevel]           [Stage 06 Sizer: onLoadSetup]
```

- **Data Model & State**:
  - `GannCyclesTelemetry`: Stores lunar synodic metrics, solar seasonal longitude & cardinal countdown, `sq9Levels` (`sup180`, `sup90`, `sup45`, `res45`, `res90`, `res180`), and classical bar counters (`tdSequentialCount`, `tdSetupDirection`, `isNR7`, `isNR4`, `donchian20High`, `donchian20Low`, `williamsR14`).
  - `FamousStrategyEvaluation`: Stores `id`, `name`, `era` (`GANN_CYCLICAL` | `CLASSICAL_LEGENDS` | `SSRN_ACADEMIC` | `OPTIONS_DEALER`), `category`, `authorOrPaper`, `referenceUrl`, `possibilityScore`, `compositeScore`, `status`, `direction`, `rules` (4 items), `backtest250Bars`, and `tradePlan` (`entryPrice`, `stopLoss`, `tp1Price`, `tp2Price`, `triggerNote`).
- **Interactive Component & State Mapping**:
  - `FlowViewMode` in `StrategyTabs` expands to `'GUIDED' | 'COMPACT_ALL' | 'PLAYBOOKS'`.
  - `playbookFilter` state controls era filtering (`ALL`, `READY`, `GANN_CYCLICAL`, `CLASSICAL_LEGENDS`, `SSRN_ACADEMIC`, `OPTIONS_DEALER`).
  - `assessedStrategyId` state opens/closes the dedicated Strategy Assessment Modal overlay for deep rule inspection and 1-click chart/sizer actions.
