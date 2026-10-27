# Inferno Quant Terminal — Mobile Multi-Page Architecture & Decluttering Plan

Re-architect the mobile viewport (`< 1024px`) from a single crowded vertical scroll into a dedicated **5-Page Mobile Workstation** anchored by a fixed bottom navigation bar, a compact header with a slide-out quick-action drawer, and a full-screen mobile chart experience with a toggleable HUD overlay — while keeping the desktop (`lg:`) split-screen workstation, quantitative math, and live telemetry 100% unchanged.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural choices were confirmed and govern the mobile responsiveness upgrade:

- **Confirmed Decision 1 (Mobile Page Division)**: **Bottom tab bar with 5 dedicated pages** (`CHART`, `RADAR`, `LENSES`, `EXECUTE`, `ACADEMY`) so each mobile screen focuses on a single job without vertical overcrowding or overlapping panels.
- **Confirmed Decision 2 (Header & Ticker Decluttering)**: **Compact single-row mobile header with a slide-out drawer for extra actions**. On mobile (`< lg`), the top bar displays only the active symbol/price badge, live connection latency, and a drawer menu button (`☰`) that houses the Rookie/Pro mode switch, Paper Trade Journal, Institutional Glossary, Top 50 Asset Switcher, and OB/VP sensitivity settings.
- **Confirmed Decision 3 (Mobile Chart & Level Pills)**: **Full-screen chart page with toggleable HUD overlay**. On the mobile `CHART` page, the candlestick + orderflow canvas expands to fill the available viewport height, and the structural level pills (`VAH`, `POC`, `VAL`, `Bull/Bear OB`, `0-Γ Flip`, `Call/Put Walls`) and layer toggles are accessed via a non-overlapping toggleable HUD overlay bar (`[ HUD LEVELS ]` & `[ LAYERS ]`).

---

## 1. Overview & Core Concept

- **What It Does**: Eliminates overlapping badges, cramped multi-row toolbars, and endless vertical scrolling on mobile screens (`375px–768px`) by partitioning the terminal into 5 purpose-built mobile views controlled by a thumb-friendly bottom navigation bar.
- **Target Audience / Persona**: Mobile crypto and derivatives traders monitoring live Binance and Deribit orderflow who need clean, one-handed navigation between price action, multi-timeframe regime radar, strategy lenses, position sizing, and the reverse-learning academy.
- **Key Value**: Zero feature loss and zero math changes — every existing indicator, tooltip, modal, and calculation remains intact on both mobile and desktop, with desktop (`lg:grid-cols-12`) preserving its side-by-side split cockpit.

---

## 2. User Experience & Visual Design

### Key User Flows on Mobile (`< 1024px`)

1. **Page 1 — `CHART` (Full-Screen HFT Chart + Toggleable HUD)**:
   - Displays a compact timeframe selector strip (`5m` to `1w`) at the top of the chart frame.
   - Expands the interactive `QuantChart` canvas to fill the mobile viewport between the top bar and bottom navigation bar (`calc(100dvh - 150px)`), eliminating scroll-trapping.
   - Provides two floating HUD toggle buttons in the top-left of the chart (`[ LEVELS HUD ]` and `[ LAYERS ]`) that reveal or hide the `FloatingLevels` pills and the 6 chart layer toggles as a clean translucent backdrop overlay without squishing the candlesticks.
   - Includes a compact 1-line live Traffic Light status pill at the bottom of the chart that jumps directly to `RADAR` or `ACADEMY` when tapped.

2. **Page 2 — `RADAR` (Traffic Light Verdict + Telemetry + MTF Matrix + AI Brief)**:
   - Houses the full `TrafficLightBanner` (Actionability Verdict, Rookie 4-Step Workflow, What-If Price Slider, and 3-column summary) followed by the 8 Institutional Telemetry Cards, AMD Phase Engine, Multi-Timeframe Confluence Matrix, and AI Speculation Brief.

3. **Page 3 — `LENSES` (5 Institutional Strategy Lenses)**:
   - Dedicated full-height page for the 5 Strategy Tabs (`1. Candles & PA`, `2. MA & Trend`, `3. SMC, VP & AMD`, `4. Orderflow & VDU`, `5. Quant & Options`) with clean horizontal swipeable/scrollable tab pills and the `Diagnostics` vs. `Setup & R:R` sub-view switcher.
   - Tapping **"Load Setup to Calculator & Chart"** automatically loads the levels and offers a 1-tap jump to the `CHART` or `EXECUTE` mobile page.

4. **Page 4 — `EXECUTE` (5-Point Pre-Flight Checklist + Position Sizer)**:
   - Dedicated execution page containing the `PreFlightChecklist` (5-point institutional gatekeeper + 1-click Paper Trade logger) and the `ExecutionHelper` position-sizing calculator.

5. **Page 5 — `ACADEMY` (Reverse Signal X-Ray + 5-Level Curriculum + Live Quiz)**:
   - Dedicated learning page rendering the `ReverseAcademyDeck` (4-Node Live Signal Deconstruction X-Ray Tree, 5-Level Curriculum Cards with 3-Zone Threshold Scales, and Live Market Quiz).

### Visual Identity & Theme
- **Aesthetic Direction**: High-contrast institutional dark terminal (`#0b0e14` primary canvas, `#10131a` / `#141821` structural cards, `#1e2433` hairline borders).
- **Color Palette & Accents**: `#00f0ff` (cyan primary accent), `#4edea3` (emerald bullish/pass), `#f59e0b` (amber POC/warning), `#ffb4ab` (rose bearish/invalidation).
- **Touch Ergonomics & Sticky Cap**:
  - All mobile interactive buttons, drawer rows, and bottom nav items enforce a minimum `44px` touch target height.
  - Compact mobile top bar (`48px`) + compact bottom tab bar (`56px`) respect the mobile viewport budget so over 85% of the screen is dedicated to active content.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Responsive Viewport Partitioning vs. Separate Mobile Codebase**
  - *Chosen Approach*: Drive mobile page visibility via a shared `mobilePage` state (`'CHART' | 'RADAR' | 'LENSES' | 'EXECUTE' | 'ACADEMY'`) that applies responsive visibility classes (`hidden lg:flex` / `flex`) on mobile while keeping the exact same `lg:grid-cols-12` split-screen layout on desktop (`>= 1024px`).
  - *Why*: Preserves a single unified state tree (live WebSocket ticks, options GEX, calculator inputs, and paper trades stay instantaneously synced across all tabs) without duplicating logic or risking regressions on desktop.

- **Decision 2: Slide-Out Mobile Command Drawer**
  - *Chosen Approach*: Consolidate secondary header & ticker controls (`Rookie / Pro` toggle, `Paper Journal`, `Glossary`, `Top 50 Assets`, `Strict / Loose OB`, and `VRVP / Session VP`) into a slide-out right-hand drawer on mobile screens, while keeping a fast 1-tap coin switcher and timeframe bar accessible on the main header/chart strip.
  - *Why*: Prevents horizontal button wrapping and overlapping text on `360px–414px` phone screens while keeping every control 1 tap away.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       App.tsx (Unified State Core)                      │
│  • mobilePage: 'CHART' | 'RADAR' | 'LENSES' | 'EXECUTE' | 'ACADEMY'     │
│  • mobileDrawerOpen: boolean                                            │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │ (< 1024px Mobile View)                  │ (>= 1024px Desktop View)
                ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│   Compact Header + Slide-Out Drawer   │ │   Full Desktop Header +       │
│   (Symbol, Live Price, ☰ Menu Drawer) │ │   Full TickerBar Strip        │
├───────────────────────────────────────┤ ├───────────────┬───────────────┤
│   Active Mobile Page Viewport:        │ │ Left Cockpit  │ Right Deck    │
│   [1] CHART: Full-Screen QuantChart   │ │ (7 Columns)   │ (5 Columns)   │
│       + Toggleable HUD (Levels/Layers)│ │ • Levels      │ • 4 Tactical  │
│   [2] RADAR: TrafficLight + Telemetry │ │ • QuantChart  │   Decks       │
│       + MTF Matrix + SpeculationBrief │ │ • Traffic     │ • 5 Strategy  │
│   [3] LENSES: 5 Strategy Lenses       │ │   Light       │   Lenses      │
│   [4] EXECUTE: PreFlight + Sizer      │ │               │               │
│   [5] ACADEMY: Reverse X-Ray + Quiz   │ │               │               │
├───────────────────────────────────────┤ └───────────────┴───────────────┘
│   Fixed 5-Tab Bottom Navigation Bar   │
│  [Chart] [Radar] [Lenses] [Exec] [Edu]│
└───────────────────────────────────────┘
```

### Interactive Component & State Mapping
- **Compact Header & Slide-Out Drawer (`Header.tsx` & `TickerBar.tsx`)**:
  - On mobile (`< md`), `Header` displays the brand mark, active pair price/delta pill (tapping opens the Top 50 quick switcher), live latency indicator, and a `44x44px` menu trigger button that opens the slide-out command drawer.
  - Inside the slide-out drawer, users can switch `Rookie / Pro` mode, open the `Paper Trade Journal` (with active trade count badge), open the `Institutional Glossary`, toggle `Strict / Loose OB` and `VRVP / Session VP` modes, or jump to the full Top 50 Launchpad.
- **Full-Screen Mobile Chart & Toggleable HUD (`QuantChart.tsx` & `FloatingLevels.tsx`)**:
  - On mobile, `QuantChart` uses a responsive height (`h-[calc(100dvh-11.5rem)] min-h-[360px] lg:h-[460px]`) so it fills the `CHART` page cleanly.
  - Two floating HUD buttons (`HUD LEVELS` and `CHART LAYERS`) toggle translucent overlay panels over the top of the chart canvas on mobile so level pills and layer toggles never crowd or overlap the price scale.
- **Synchronized Cross-Page Actions (`App.tsx` & `StrategyTabs.tsx`)**:
  - Tapping `"Deconstruct Live Signal"` on the `TrafficLightBanner` automatically switches `mobilePage` to `'ACADEMY'` on mobile (and `REVERSE_ACADEMY` deck on desktop).
  - Tapping `"Load Setup to Calculator & Chart"` inside any Strategy Lens loads the entry/stop/TP levels and provides a quick toast action to view on `CHART` or `EXECUTE`.
