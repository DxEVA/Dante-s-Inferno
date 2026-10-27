# Cyber-Brutalist Chart De-Cluttering & Pre-Flight Directional Barrier Polish

This update resolves four high-impact visual and quantitative accuracy issues observed on live `XAUUSDT` and multi-asset sessions: eliminating "Bubble Soup" on the candlestick overlay canvas, preventing right-axis price scale label collisions, keeping the 4-Deck Tactical Command Bar sticky with translucent backdrop blur while scrolling, and fixing the directional barrier math in Pre-Flight Check #4 so behind-entry Call/Put walls never trigger false path warnings.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> All four engineering specifications, statistical thresholds, and directional barrier formulas were explicitly defined in the request and require no additional clarification before review:

- **Confirmed Decision 1 — Strict Outlier Delta Bubbles (`>= 1.85σ`)**: Footprint bubbles will only render when `deltaSigma >= 1.85`, when passive limit absorption (`hasAbsorption`) is confirmed, or when forced liquidations (`totalLiqUsd > 0`) occur. Maximum radius is reduced (`10px` mobile / `14px` desktop) with translucent fills (`0.22` standard, `0.34` for `>= 2.2σ`) so price wicks and candle bodies remain crisp.
- **Confirmed Decision 2 — Priority Right-Axis Label De-Cluttering (`0.28%` Minimum Separation) & Native Deribit Gating**: Price lines are evaluated in institutional priority order (`POC` → `VAH/VAL` → `S/R & Liquidity` → `0-Γ & Options`). Any line within `0.28%` (`Math.abs(price - existing) / price < 0.0028`) of an already-labeled level still renders its horizontal guide across the canvas but suppresses its right-axis badge (`axisLabelVisible: false`). Furthermore, non-Deribit assets (`optionsData.isDeribitNative === false`, such as `XAUUSDT`) will hide synthetic `0-GAMMA FLIP`, `MP`, `CW`, and `PW` overlays by default unless the user explicitly toggles the `OPTIONS + 0Γ` layer button.
- **Confirmed Decision 3 — Sticky Translucent 4-Deck Switcher Bar**: The top Tactical Deck Switcher (`SYS.01` through `SYS.04`) is pinned with `sticky top-0 z-30 bg-[#0b0e14]/95 backdrop-blur-md border-b border-[#1e2433]` so switching decks remains effortless even when scrolled deep into the Execution Calculator or Paper Trade Journal.
- **Confirmed Decision 4 — Directional Pre-Flight Check #4 Barrier Validation**: Opposing barriers (`callWall` / `srHigh` for Longs; `putWall` / `srLow` for Shorts) only flag a blocked path to `TP1` if the barrier strictly sits *between* `entryPrice` and `tp1Price` (`barrierPrice > entryPrice * 1.001 && barrierPrice < tp1Price * 0.999` for Longs; `barrierPrice < entryPrice * 0.999 && barrierPrice > tp1Price * 1.001` for Shorts).

---

### 1. Overview & Core Concept

- **What It Does**: Refines the visual signal-to-noise ratio of the primary institutional chart and sharpens the spatial accuracy of the 5-Point Pre-Flight Gate.
- **Target Audience / Persona**: Quantitative and discretionary crypto/commodities traders operating the split-screen workstation who need unobstructed candlestick price action, readable right-axis price tags during tight volatility compression, and mathematically sound pre-trade path validation.
- **Key Value**: Prevents visual occlusion on tight-range instruments like `XAUUSDT`, eliminates synthetic options clutter on non-Deribit pairs unless explicitly requested, and ensures pre-flight execution grading never penalizes a trade for levels located behind the entry price.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Unobstructed Price & Orderflow Inspection**: When viewing `XAUUSDT` or any streaming ticker, routine candles display clean wicks and bodies without overlapping circles. Only true statistical anomalies (`>= 1.85σ`), passive limit absorption rings (`ABS`), or liquidation spikes (`⚡LIQ`) appear with subtle translucent fills (`0.22` / `0.34`).
  2. **Clean Right-Axis Scale & On-Demand Synthetic Options**: Horizontal reference lines (`POC`, `VAH`, `VAL`, `RES`, `SUP`, `ASK`, `BID`) never stack illegible overlapping price tags on the right axis. When switching to a non-Deribit asset (`XAUUSDT`, `SOLUSDT`, etc.), synthetic options lines stay hidden until the user manually clicks `OPTIONS + 0Γ` in the chart toolbar.
  3. **Persistent Tactical Deck Switching**: As the user scrolls down inside the right-hand command pane to adjust position sizing or inspect the Paper Trade Journal, the 4-Deck Command Switcher remains anchored at the top with a blurred dark-glass backdrop.
  4. **Accurate Pre-Flight Path Check**: Loading a Long or Short setup into the Pre-Flight Checklist and Execution Sizer evaluates only overhead barriers located strictly between Entry and TP1 (for Longs) or floor barriers located strictly between Entry and TP1 (for Shorts).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Cyber-Brutalist Institutional Financial Terminal.
  - *Color Palette & Mood*: Deep obsidian canvas (`#0b0e14`), structural slate surfaces (`#10131a`, `#141821`), crisp `#1e2433` 1px grid hairlines, emerald (`#4edea3`) and rose (`#ffb4ab`) translucent orderflow footprints, amber (`#f59e0b`) POC & absorption rings, and electric cyan (`#00f0ff`) zero-gamma accents.
  - *Typography & Hierarchy*: `JetBrains Mono` with `tabular-nums` for all axis coordinates, sigma readouts, and pre-flight metrics.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Priority-Ordered Axis Collision Suppression (`0.28%` Threshold)**
  - *Chosen Approach*: Evaluate price lines in strict institutional hierarchy (`POC` → `VAH`/`VAL` → `S/R` (`RES`/`SUP`/`ASK`/`BID`) → `0-Γ` → `CW`/`PW`/`MP`) against `placedAxisPrices: number[]`. If `Math.abs(price - existing) / price < 0.0028`, keep the horizontal line on the chart canvas for visual confluence but set `axisLabelVisible: false`.
  - *Why*: Preserves the exact visual confluence of clustered levels on the chart while guaranteeing every visible price tag on the right-hand scale is legible.
- **Decision 2: Manual Opt-In for Non-Deribit Synthetic Options Layers**
  - *Chosen Approach*: Track whether the user has manually opted into the `OPTIONS + 0Γ` layer on non-Deribit symbols (`optionsData.isDeribitNative === false`). By default, non-native symbols suppress synthetic `0-GAMMA FLIP`, `MP`, `CW`, and `PW` lines unless the user explicitly clicks `OPTIONS + 0Γ`.
  - *Why*: Gold (`XAUUSDT`) and altcoins use BSM proxy strikes that can crowd intraday price action unless the trader specifically wants to inspect synthetic gamma levels.
- **Decision 3: Synchronized Directional Barrier Logic Across Deck Badge & Checklist Card**
  - *Chosen Approach*: Apply the exact bounded interval test (`barrier > entry * 1.001 && barrier < tp1 * 0.999` for Longs; `barrier < entry * 0.999 && barrier > tp1 * 1.001` for Shorts) across both `callWall`/`putWall` and `srHigh`/`srLow` in the Pre-Flight Checklist component and the top Deck 3 `PASS` summary badge.
  - *Why*: Ensures the `[ SYS.03 // SIZER ] X/5 PASS` badge in the sticky header always matches the 5-card breakdown inside the checklist.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   SPLIT-SCREEN CYBER-BRUTALIST WORKSTATION                 │
├─────────────────────────────────────┬──────────────────────────────────────┤
│ LEFT PANE: QUANT CHART COCKPIT      │ RIGHT PANE: TACTICAL COMMAND DECK    │
│                                     │                                      │
│ ┌─────────────────────────────────┐ │ ┌──────────────────────────────────┐ │
│ │ Chart Layer Toolbar             │ │ │ Sticky 4-Deck Switcher Bar       │ │
│ │ [VP] [OB] [S/R] [Δ] [OPT*] [RR] │ │ │ sticky top-0 z-30 backdrop-blur  │ │
│ └───────────────┬─────────────────┘ │ └────────────────┬─────────────────┘ │
│                 ▼                   │                  ▼                   │
│ ┌─────────────────────────────────┐ │ ┌──────────────────────────────────┐ │
│ │ 60FPS Canvas Overlay            │ │ │ Pre-Flight Check #4 Gate         │ │
│ │ • Filter: σ >= 1.85 | ABS | LIQ │ │ │ • LONG:  Entry*1.001 < B < TP1   │ │
│ │ • Radius: max 10px/14px         │ │ │ • SHORT: TP1 < B < Entry*0.999   │ │
│ │ • Alpha:  0.22 std / 0.34 >=2.2σ│ │ │ • Evaluates Call/Put Wall & S/R  │ │
│ └───────────────┬─────────────────┘ │ └──────────────────────────────────┘ │
│                 ▼                   │                                      │
│ ┌─────────────────────────────────┐ │                                      │
│ │ Right-Axis Price Line Sync      │ │                                      │
│ │ • Priority: POC>VA>SR>0Γ>CW/PW  │ │                                      │
│ │ • Collision Gate: Δp/p < 0.0028 │ │                                      │
│ │ • Native Deribit / Manual Gate  │ │                                      │
│ └─────────────────────────────────┘ │                                      │
└─────────────────────────────────────┴──────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **Delta Bubble Canvas Pass**: Iterates visible bars in `drawOverlayCanvas`, computing `deltaSigma`, `hasAbsorption`, and `totalLiqUsd`. Skips rendering unless `deltaSigma >= 1.85 || hasAbsorption || totalLiqUsd > 0`. Applies `maxBubbleR = isMobile ? 10 : 14` and fill alpha `0.34` when `deltaSigma >= 2.2`, else `0.22`.
  - **Native Options Manual Override State**: Tracks a `manualOptionsOverride` state in the chart component (resetting to `false` when `symbol` changes). Effective options visibility is `layers.options && (optionsData.isDeribitNative !== false || manualOptionsOverride)`. Clicking the `OPTIONS + 0Γ` toolbar button toggles the layer and enables the manual override when on a non-native asset.
  - **Axis Collision Resolver**: `addLine` in `syncPriceLines` checks `placedAxisPrices.some((existing) => Math.abs(price - existing) / price < 0.0028)`. If true, `axisLabelVisible` is set to `false`; otherwise `true` and `price` is pushed to `placedAxisPrices`. Execution order inside `syncPriceLines` is updated to: `POC` → `VAH` / `VAL` → `S/R & Liquidity` (`RES`, `SUP`, `ASK`, `BID`) → `0-Γ` → `CW`, `PW`, `MP`.
  - **Pre-Flight Check #4 Directional Interval Evaluator**: Checks both the options barrier (`callWall` for Long, `putWall` for Short) and structural S/R barrier (`liquidity?.srHigh` for Long, `liquidity?.srLow` for Short) against the strict directional interval between `entryPrice` and `tp1Price`, reporting the specific blocking barrier and price if one sits inside the path, or confirming a clear path to `TP1`.
