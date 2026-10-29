# Implementation Plan: 6-Stage Progressive Trader Flow & Auto Chart Layer Sync

## 1. Overview & Product Architecture
We will refactor **`src/components/StrategyTabs.tsx`**, **`src/components/QuantChart.tsx`**, and **`src/App.tsx`** into a sequential, clutter-free **6-Stage Progressive Trader Pipeline** (`01. PRICE` ➔ `02. VOLUME` ➔ `03. TREND & MA` ➔ `04. ORDERFLOW` ➔ `05. QUANT & GEX` ➔ `06. EXECUTE`), while preserving 100% of existing math utilities (`quantEngine.ts`, `metricBenchmarks.ts`, `reverseAcademyEngine.ts`), Rookie/Pro modes, Reverse Signal X-Ray, and Paper Journal functionality.

---

## 2. Top 6-Stage Progressive Stepper Bar (`src/components/StrategyTabs.tsx`)
* **Connected 6-Stage Pipeline Bar**:
  * **`STAGE 01 // PRICE`** *(Candles, Wicks & S/R)*
  * **`STAGE 02 // VOLUME`** *(POC, VAH/VAL & Session RVOL)*
  * **`STAGE 03 // TREND & MA`** *(EMA Ribbon, VWAP, Stretch & MTF)*
  * **`STAGE 04 // ORDERFLOW`** *(Order Blocks, AMD, CVD & Spot vs Perp)*
  * **`STAGE 05 // QUANT & GEX`** *(Hurst, ADX, Z-Score, Options GEX & Funding/OI)*
  * **`STAGE 06 // EXECUTE`** *(Funnel Scorecard, Pre-Flight & Position Sizer)*
* **Stage Status Dots**:
  * Each stage pill computes and renders a live status indicator dot:
    * `#4edea3` (Emerald) — Stage supports the directional setup (`score >= 68`)
    * `#f59e0b` (Amber) — Neutral / mid-range / waiting (`45 <= score < 68`)
    * `#ffb4ab` (Coral) — Conflicting / caution (`score < 45`)
* **View Mode Toggle (`[ 👁️ VIEW: GUIDED FLOW | COMPACT ALL ]`)**:
  * **GUIDED FLOW (Default)**: Renders one focused stage at a time with generous spacing (`p-4 gap-4`) and automatic chart layer synchronization.
  * **COMPACT ALL**: Renders a clean single-page vertical stack summarizing all 6 stages with live scores, key takeaways, and 1-click `[ JUMP TO STAGE 0X → ]` buttons.

---

## 3. Automatic Chart Layer Synchronization & Lock Override (`src/components/QuantChart.tsx` & `src/components/StrategyTabs.tsx`)
* **Stage-to-Canvas Progressive Disclosure**:
  * Stepping through Stages `01` to `06` in `GUIDED FLOW` mode automatically updates `onLayersChange` unless the user has engaged the **`[ 🔒 LOCK LAYERS ]`** override toggle on the chart toolbar:
    * **Stage 01 (Price & S/R):** `{ vp: false, ob: false, sr: true, bubbles: false, options: false, rrBox: false }`
    * **Stage 02 (Volume & Value):** `{ vp: true, ob: false, sr: true, bubbles: false, options: false, rrBox: false }`
    * **Stage 03 (Trend & MA):** `{ vp: true, ob: false, sr: true, bubbles: false, options: false, rrBox: false }`
    * **Stage 04 (Orderflow & SMC):** `{ vp: true, ob: true, sr: false, bubbles: true, options: false, rrBox: false }`
    * **Stage 05 (Quant & Options):** `{ vp: true, ob: false, sr: false, bubbles: false, options: true, rrBox: false }`
    * **Stage 06 (Execute & Size):** `{ vp: true, ob: true, sr: false, bubbles: false, options: false, rrBox: true }`
* **Chart Toolbar Lock Toggle (`QuantChart.tsx`)**:
  * Upgrade the chart layer bar with a clear `[ 🔓 AUTO-SYNC STAGE | 🔒 LOCK LAYERS ]` toggle so users can either let the 6-stage funnel drive the canvas overlays automatically or lock their custom layer combination.

---

## 4. Spacious 3-Block Layout Inside Each Stage (`01`–`05`)
Every stage (`01` through `05`) follows a disciplined 3-block vertical rhythm (`p-4 gap-4`):

### Block A: Stage Verdict Banner (Top Card)
* Displays the **Stage Question** in plain English, the **Live Stage Score & Bias Badge** (e.g., `84% BULLISH ALIGNMENT` or `52% MID-RANGE CHOP — WAIT`), and a **1-Sentence Plain-English Takeaway** tailored to `activeSymbol`.

### Block B: Core Stage Metrics (Strictly 2 Focused Cards per Stage)
* **Stage 01 (Price & Structure)**:
  1. *Primary Candlestick Pattern & Wick Anatomy Card*: Pattern name, quality %, Wick Rejection Ratio, Close Location Value (`CLV %`), Body/ATR ratio, and a compact expandable pattern scan list.
  2. *Key Support & Resistance Proximity Card*: Distance % to `SR_LOW` Support and `SR_HIGH` Resistance with 1-click `[ 🎯 TRACK ON CHART ]` spotlighting.
* **Stage 02 (Volume & Value Area)**:
  1. *Volume Profile Auction Map Card*: `VAH`, `POC`, `VAL` prices (clickable to spotlight on chart), Discount/Fair-Value/Premium auction state, and Bid vs. Ask POC delta.
  2. *Session-Normalized RVOL Card*: `SES-RVOL` multiplier vs. UTC session baseline, flagging `💧 VDU Exhaustion <= 0.45x` or `🔥 Volume Ignition >= 2.0x` with a visual benchmark range strip.
* **Stage 03 (Moving Averages & Trend)**:
  1. *EMA Ribbon & VWAP Stack Card*: `EMA 9`, `EMA 21`, `EMA 50`, `EMA 200`, `SMA 200`, and `Session VWAP` with `bps/bar` slope, Support/Resistance badges, and 1-click chart tracking.
  2. *ATR Rubber-Band Stretch & 4-Timeframe (`15m/1H/4H/1D`) Trend Alignment Card*: Displays `stretchScoreAtr` with a visual benchmark strip alongside the `ConfluenceMatrix`.
* **Stage 04 (Orderflow & Smart Money)**:
  1. *Order Block Mitigation & Wyckoff AMD Cycle Card*: `Bull OB` & `Bear OB` `50% Mean Threshold` (trackable on chart), Mitigation %, `Q:Score/100`, and the live `AMDPhaseEngine` stage.
  2. *True Taker CVD Delta, Absorption & Spot-vs-Perp Flow Card*: Live `BarDelta`, `<AsciiOrderflowBar />`, `ABS` rings, `Spot CVD %` vs. `Perp CVD %`, and `Basis bps` with a visual benchmark strip.
* **Stage 05 (Quant & Derivatives)**:
  1. *Statistical Regime Gate Card*: `Hurst Exponent H`, `Wilder's ADX-14`, `50-VWMA Z-Score`, and `Rolling Sharpe / Sortino` with a visual benchmark strip indicating whether to Fade or Follow.
  2. *Deribit Options GEX & Perpetual Positioning Card*: `Net GEX`, `Zero-Gamma Flip 0-Γ`, `Call/Put Walls`, `Max Pain`, `25Δ Skew`, `8h Funding Rate`, `4H OI Delta` with benchmark strips + `SpeculationBrief` (`RUN QUANT` AI synthesis).

### Block C: Bottom Stage Navigation & Inline Learn Accordion
* **`[ 🎓 LEARN THIS LAYER & STUDY LINKS ▾ ]`**: Expands the Rookie Mentor guide, Standard Norm vs. Extremes, Familiar Indicator Analogy, Do/Avoid rule, and external study links (`Investopedia`, `TradingView`, `Binance Academy`, `Bookmap`, `Deribit`) for that stage, plus a 1-click button to open the full Interactive Reverse Academy / Spot-Check Quiz.
* **Stage Stepper Controls**: `[ ← PREV STAGE ]`, primary CTA `[ NEXT: STAGE 0X (TITLE) → ]`, and `[ ⚡ JUMP TO EXECUTION SIZER ]`.

---

## 5. Stage 06: Final Funnel Scorecard, Reverse X-Ray & Execution Sizer
* **5-Stage Funnel Alignment Summary Bar**:
  * Visual row of Stages `01`–`05` (`1. Price` • `2. Volume` • `3. Trend` • `4. Orderflow` • `5. Quant`) with individual pass/wait badges, overall Bayesian Confluence Score, and a **`[ 🔍 REVERSE X-RAY DECONSTRUCTOR ]`** toggle that expands `ReverseAcademyDeck` inline when requested.
* **Lens Setup Selector Strip**:
  * Allows 1-click loading of suggested Entry, Stop Loss, and TP1/TP2 from any of the 5 analytical lenses into the calculator (`onLoadSetup`).
* **5-Point Pre-Flight Checklist & Position Size Calculator**:
  * Stacks `PreFlightChecklist` (with `MAKER LIMIT` vs. `TAKER MARKET` toggle and 1-Click Paper Trade Logger) and `ExecutionHelper` (Half-Kelly sizing, fee/slippage drag guardrail, and trackable Entry/Stop/Target levels).

---

## 6. Mobile Bottom Navigation Synchronization (`src/App.tsx`)
* Sync the floating 5-tab mobile bottom dock (`CHART`, `PIPELINE`, `RADAR`, `EXECUTE`, `ACADEMY`) directly with the 6-Stage Progressive Trader Pipeline so mobile users can step seamlessly through Stages `01`–`06` or jump straight to the full-screen Chart, Stage 06 Execution Sizer, or Reverse X-Ray Academy.
