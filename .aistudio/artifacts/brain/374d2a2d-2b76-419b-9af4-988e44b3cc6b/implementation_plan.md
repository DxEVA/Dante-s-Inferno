# Obsidian Glass Visual System, Mobile Ergonomics & Inferno Codex Hub

This upgrade elevates **Project Inferno** with a 2026 Obsidian Glassmorphic surface system, a swipeable single-row mobile Stage 01–06 carousel, touch-friendly mobile chart layer chips, a frosted-glass bottom-left collapsible mobile command pill, and a standalone 3-tab **Inferno Codex Hub** (`Visual Element Atlas`, `Strategy Masterclass Archive`, and `Live Reverse Signal X-Ray & Quiz`)—while maintaining a strict 100% read-only lock on all quantitative math, strategy engines, and existing stage views.

## User Review & Critical Decisions

> [!IMPORTANT]
> The interactive layout and navigation preferences have been confirmed:

- **Confirmed Decision 1 (Mobile Bottom Navigation Layout)**: Preserve the **collapsible bottom-left command pill** so it never collides with bottom-right preview badges, upgraded with frosted-glass Obsidian styling (`rounded-2xl bg-[#0b101b]/90 backdrop-blur-xl border border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.85)]`) and active cyan highlights (`rounded-xl bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/35`).
- **Confirmed Decision 2 (Visual Element Atlas Chart Spotlight Behavior)**: Clicking `[ 🎯 SPOTLIGHT ON CHART ]` on any of the 12 indicator cards spotlights the live price level directly on the candlestick chart while keeping the Codex open, paired with a quick action to jump to its corresponding Stage (`01`–`06`).

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Obsidian Glassmorphic Card System**: Upgrades `.cyber-panel` and `.cyber-panel-tracked` globally with `12px` rounded corners, subtle top-edge specular highlights, deep ambient shadows, and cyan hover/tracked states while preserving high-contrast light mode compatibility.
  2. **Mobile Touch Ergonomics**:
     - Converts the 6-Stage Stepper Bar on mobile screens into a single-row horizontal snap-scroll carousel (`STAGE 01` through `STAGE 06`) while remaining a 6-column grid on desktop.
     - Adds a mobile-only horizontal touch pill strip directly above the Chart Status Strip for 1-tap toggling of `VP`, `OB + MT`, `S/R`, `Δ BUBBLES`, `OPTIONS + 0Γ`, `EMA + VWAP`, `R:R BOX`, and `AUTO-SYNC`.
     - Upgrades the bottom-left collapsible mobile command pill with frosted-glass styling and routes the 5th item (`CODEX / X-RAY`) directly into the new Codex view.
  3. **Standalone 3-Tab Inferno Codex Hub**:
     - **Tab 1 — `🔬 VISUAL ELEMENT ATLAS (ALL 12 TERMINAL INDICATORS)`**: 12 interactive cards with custom inline `<svg>` vector diagrams, live readings on the active symbol, equilibrium vs. extreme benchmarks, plain-English analogies, pro action rules (`Do / Avoid`), `[ 🎯 SPOTLIGHT ON CHART ]` buttons, and external study links.
     - **Tab 2 — `🏛️ STRATEGY MASTERCLASS ARCHIVE (ALL 14 MODELS EXPLAINED)`**: Deep-dive cards for all 14 multi-era strategies powered by live telemetry and 250-bar walk-forward backtests, featuring a 3-step execution blueprint (`1. Setup` ➔ `2. Trigger` ➔ `3. Invalidation & Target`), market psychology rationale, regime trap warnings, and 1-click `[ ⚡ LOAD INTO SIZER ]`.
     - **Tab 3 — `🔍 LIVE REVERSE SIGNAL X-RAY & SPOT-CHECK QUIZ`**: Embeds the live Reverse Signal Deconstructor and interactive 5-level spot-check quiz deck.
- **Target Audience / Persona**: Quantitative traders and learners who want institutional-grade execution tools paired with visual, interactive explanations of every chart overlay and quantitative model.
- **Key Value**: Unifies all visual education, live indicator deconstruction, and 14-model masterclasses into a single zero-friction hub without altering a single line of underlying math or data fetching.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Swiping Stages & Toggling Layers on Mobile**: On mobile viewports, the trader swipes horizontally across the compact Stage 01–06 pill carousel and taps layer chips directly beneath the candlestick canvas without opening nested menus.
  2. **Exploring the Visual Element Atlas**: Clicking `[ 📚 CODEX & LEARN ]` in the top view switcher (or `CODEX / X-RAY` from the mobile command pill / Traffic Light banner) opens the 12-indicator Visual Element Atlas, where each card displays an SVG schematic, live coin telemetry, and a 1-click chart spotlight button.
  3. **Studying & Loading a Masterclass Strategy**: Switching to the Strategy Masterclass Archive tab lets the user inspect the 3-step blueprint and regime trap warning for any of the 14 strategies and load its live Entry, Stop, TP1, and TP2 directly into the Stage 06 Position Sizer.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: 2026 Obsidian Glassmorphism with crisp 1px specular borders, monospace tabular metrics (`JetBrains Mono`), and high-contrast light/dark adaptability.
  - *Color Palette & Mood*: Deep obsidian gradient (`rgba(18, 24, 36, 0.82)` to `rgba(10, 14, 22, 0.92)`), electric cyan (`#00f0ff`), emerald (`#4edea3`), amber (`#f59e0b`), and coral (`#ffb4ab`), with clean slate/white overrides when light theme is active.
  - *Typography & Hierarchy*: `JetBrains Mono` (`tabular-nums`) for all live readings, backtest metrics, and badges; clean sans-serif body copy for analogies and psychological explanations.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Strict Read-Only Lock on All Quantitative & Strategy Engines**
  - *Chosen Approach*: Consume existing calculated props and pure read-only helper functions (`evaluateFamousStrategies`, `calculateGannAndCyclesTelemetry`, `getRookieMentorGuide`, and `ReverseAcademyDeck`) without touching any calculation files or React state hooks.
  - *Why*: Guarantees zero regressions in live pricing, orderflow, options GEX, Gann harmonics, or 250-bar backtests.
- **Decision 2: Collapsible Frosted-Glass Bottom-Left Mobile Command Pill**
  - *Chosen Approach*: Retain the bottom-left collapsible command pill and 1-tap quick-flip button while upgrading their surfaces to frosted Obsidian glass (`backdrop-blur-xl`, `rounded-2xl`, `border-white/12`).
  - *Why*: Keeps the bottom-right corner completely clear on mobile screens while delivering a modern frosted-glass feel.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   OBSIDIAN GLASS & INFERNO CODEX ARCHITECTURE               │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Read-Only Quantitative & Strategy Engines (100% Untouched)            │  │
│  │  • Live Telemetry, Volume Profile, Order Blocks, Options GEX, MAs     │  │
│  │  • 14-Model Playbook Engine & Gann / Lunar / Seasonal Telemetry       │  │
│  │  • Rookie Mentor Benchmarks & Reverse Signal X-Ray Engine             │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Top Workflow Switcher & Mobile Snap-Scroll Stage Carousel             │  │
│  │  • View Modes: [GUIDED FLOW] [COMPACT ALL] [PLAYBOOKS] [CODEX & LEARN]│  │
│  │  • Mobile Stage Bar: Horizontal snap-x pill carousel (Stages 01–06)   │  │
│  │  • Mobile Chart Strip: Touch-friendly layer chips above status bar    │  │
│  │  • Mobile Command Pill: Frosted-glass bottom-left fan-out menu        │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Standalone Inferno Codex Hub (3 Segmented Sub-Views)                  │  │
│  │  ├─ 1. 🔬 Visual Element Atlas (12 Indicators + Inline SVG Diagrams   │  │
│  │  │      + Live Reading + Equilibrium Norms + Chart Spotlight)         │  │
│  │  ├─ 2. 🏛️ Strategy Masterclass Archive (14 Models + 3-Step Blueprint  │  │
│  │  │      + Market Psychology + Regime Trap Warning + Load into Sizer)  │  │
│  │  └─ 3. 🔍 Live Reverse Signal X-Ray & Interactive Spot-Check Quiz     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```
