# Crane Strike 5-Gate UI Visibility & Direct Terminal Architecture

This plan establishes instant visibility for the **Crane Strike 5-Gate Sequential Veto System** by opening the active trading terminal on launch, embedding a persistent Crane Strike HUD card directly above the live candlestick chart, adding a 1-click trigger in the top ticker bar, and ensuring clean TypeScript/React prop bindings in the Playbook Hub.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were confirmed via clarifying questions and govern the implementation:
> - **Persistent Card Above Chart**: A dedicated, collapsible Crane Strike card will sit directly above the live chart in the left pane, giving traders instant real-time gate telemetry without having to navigate away.
> - **Direct Terminal Launch**: The application will default directly to the active trading terminal (`viewMode: 'terminal'`), eliminating the onboarding barrier while retaining full access to the Briefing and Mode Portal screens via header buttons.
> - **1-Click Ticker Bar Trigger**: A dedicated `[⚡ CRANE STRIKE]` action button in the top ticker bar will allow 1-click navigation and synchronization to the Crane Strike workspace.

---

## 1. Overview & Core Experience

- **Instant Actionability**: Traders open the terminal and immediately see the live chart, order flow metrics, and the real-time Crane Strike 5-Gate status (Hurst Regime, Gann Topology, Liquidity Fuel, CVD Flow, and Expected Value net R:R).
- **Two Cohesive Views**:
  1. *Cockpit Card (Above Chart)*: Ultra-responsive 5-gate strip, state badge, score, and instant "Plot on Canvas" button.
  2. *Full Playbook Hub (Right Pane / Dedicated Tab)*: Deep 6-setup institutional podium ranking, Gann Square of 9 harmonic grid, and interactive trade plan risk/size calculator.
- **Immediate Chart Canvas Plotting**: Clicking "Plot Crane Strike Geometry on Canvas" from either view immediately activates the HTML5 canvas overlay in the chart, painting the Entry, Hard Stop-Loss, and TP1 target zones with zero lag.

---

## 2. User Experience & Visual Design

- **Zinc Lumina Aesthetic**: Built on obsidian/zinc foundations (`#09090b` canvas, `#121215` surface, `#18181c` elevated) with 1px top specular highlights (`rgba(255, 255, 255, 0.07)`), whisper-quiet borders, and zero GPU blur cost for locked 60 FPS scrolling.
- **4-State DFA Visual Feedback**:
  - `1. DORMANT`: Slate border and muted telemetry (Noise veto).
  - `2. STALKING`: Amber pulse border and HTF killzone lock.
  - `3. ARMED`: Rose ping indicator with CVD passive limit absorption.
  - `4. STRIKE`: Emerald glowing border with full 5-gate lock and unlocked execution geometry.
- **Top Ticker Bar Integration**: A single-line `[⚡ CRANE STRIKE]` button with high-contrast text and a subtle emerald dot, positioned alongside the timeframe and depth selectors.

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TOP HEADER & TICKER BAR                         │
│  [Symbol / Price]   [TF: 15m]   [Depth: 1K]   [⚡ CRANE STRIKE]        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 1-Click Toggle & Focus
                                    ▼
┌───────────────────────────────────┴────────────────────────────────────┐
│                    TERMINAL MAIN 12-COLUMN COCKPIT                     │
│                                                                        │
│  ┌──────────────────────────────┐   ┌──────────────────────────────┐  │
│  │   LEFT PANE (Chart Cockpit)  │   │  RIGHT PANE (Tactical Deck)  │  │
│  │                              │   │                              │  │
│  │  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │  │
│  │  │ PERSISTENT CRANE CARD  │  │   │  │ WORKSPACE SWITCHER     │  │  │
│  │  │ 4-State DFA + 5 Gates  │  │   │  │ 6-Stage Flow | Playbook│  │  │
│  │  │ [Plot Geometry Canvas] │  │   │  └────────────────────────┘  │  │
│  │  └────────────────────────┘  │   │                              │  │
│  │                              │   │  ┌────────────────────────┐  │  │
│  │  ┌────────────────────────┐  │   │  │ FULL PLAYBOOK HUB      │  │  │
│  │  │ LIVE QUANT CHART       │  │   │  │ 1. Crane Strike Panel  │  │  │
│  │  │ 1000-Bar Candlesticks  │  │   │  │ 2. 6-Setup Podium Rank │  │  │
│  │  │ Canvas Geometry Overlay│  │   │  │ 3. Gann Square of 9    │  │  │
│  │  └────────────────────────┘  │   │  │ 4. Trade Plan Sizer    │  │  │
│  │                              │   │  └────────────────────────┘  │  │
│  └──────────────────────────────┘   └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Prop Binding & State Integrity**:
  - `PlaybookHub` binds `symbol`, `evaluation`, `currentPrice`, and `onPlotExecution` using native TypeScript object and callback expressions.
  - Shared `handlePlotTradeGeometry` updates `entryPrice`, `stopLoss`, `customTargets.tp1`, turns on `chartLayers.rrBox`, and recalculates execution metrics.
  - Slices from 1000-candle buffer are routed into `evaluateGate1Regime` (rolling 96-bar Hurst window) and `evaluateGate4Microstructure` (rolling delta Z-score).

---

## 4. Step-by-Step Implementation Strategy

1. **Terminal Default Landing**: Update initial state in the root application so the app lands directly on the trading terminal while preserving the briefing modal option.
2. **Persistent Crane Strike Card Above Chart**: Place the card in the chart cockpit column with real-time evaluation data and direct canvas geometry plotting.
3. **Top Ticker Bar Trigger**: Add the `[⚡ CRANE STRIKE]` button to the control strip with active visual state and quick jump to the Playbook Hub.
4. **Prop Binding Verification**: Confirm and format all JSX props in `PlaybookHub.tsx` and `CraneStrikePanel.tsx` without string literal escaping.
5. **Compilation & Lint Verification**: Run the build verification suite to ensure zero type errors or regressions.
