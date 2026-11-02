# Playbook Scanner Session RVOL, Bayesian Shrinkage & Podium Alignment

This update resolves four live edge cases discovered on `XAGUSDT` in the Multi-Era Quantitative Playbook & Gann/Lunar Scanner: eliminating unfinished-candle `0.07x` Session RVOL readings, applying Bayesian sample-size shrinkage and a strict `>= 50%` regime gate to the Top 3 Podium, fixing false-positive `EMA COMPRESSION COIL` passes in the Barbon Donchian Ensemble model, and unifying the Podium and Strategy Card score badges.

## User Review & Critical Decisions

> [!IMPORTANT]
> Both interactive design choices were confirmed and are incorporated into this plan:

- **Confirmed Decision 1 (Unified Score Badge Display)**: Display a unified Live Match percentage badge (`${possibilityScore}% MATCH`) on both the Top 3 Podium cards and the 14-model library cards below so a strategy never displays two different percentage numbers across the two views.
- **Confirmed Decision 2 (Unfinished Candle Session RVOL Normalization)**: Whenever the active forming candle produces a raw RVOL reading below `0.20x` (or is less than 40% elapsed), evaluate Session RVOL using the last completed candle (`klines[klines.length - 2]`) so playbook rules always reflect true closed-bar participation (`>= 0.20x`).

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Closed-Bar Session RVOL Guard**: Prevents brand-new forming candles from reporting `0.07x–0.10x` Session RVOL in `crabel_nr7_volatility_coil`, `raschke_holy_grail`, `williams_smash_day_reversal`, and `ssrn_zarattini_orb` by falling back to the last completed bar whenever the active bar is under 40% elapsed or reads `< 0.20x`.
  2. **Bayesian Sample-Size Shrinkage & Strict Podium Regime Gate**: Shrinks small-sample 250-bar backtests toward a neutral prior (`5` virtual trades at `50%` win rate and `0.0R`), relaxes the `ssrn_barbon_donchian_trend` historical walk-forward detector to capture a statistically meaningful sample (`8–25` signals over 250 bars), and blocks `WRONG_REGIME` (`< 50%` match) setups from appearing on the Top 3 Podium when `STALKING_SETUP` or `TRIGGER_ACTIVE` setups exist.
  3. **Strict EMA 9/21/50 Ribbon Stack Check**: Ensures `ssrn_barbon_donchian_trend` Rule 1 only passes when `EMA 9 > EMA 21 > EMA 50` (for `LONG`) or `EMA 9 < EMA 21 < EMA 50` (for `SHORT`) and never when `ribbonAlignment` is `"COMPRESSION"`, updating the trigger note when compressed to state `"Awaiting EMA 9/21/50 expansion out of compression coil"`.
  4. **Unified Podium & Library Score Badges**: Harmonizes the Top 3 Podium badge and the 14-model library card badge to display the exact same `possibilityScore` (`% MATCH`).
- **Target Audience / Persona**: Quantitative crypto & commodities traders scanning multi-era playbooks across live pairs like `XAGUSDT` and `BTCUSDT`.
- **Key Value**: Eliminates early-candle RVOL distortion, prevents `N=1` backtest outliers or `WRONG_REGIME` setups from outranking high-sample setups like Linda Raschke's Holy Grail, and ensures 100% visual consistency between Podium and Library cards.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Inspecting Top 3 Podium**: Traders immediately see the top 3 eligible setups (`possibilityScore >= 50` and positive expectancy) ranked by Bayesian-shrunk Composite Edge, with each card showing its unified `${possibilityScore}% MATCH` badge matching the library card below.
  2. **Auditing RVOL & EMA Ribbon Rules**: Every RVOL rule (`Crabel NR7`, `Raschke Holy Grail`, `Zarattini ORB`, `Williams Smash Day`) displays a realistic closed-bar Session RVOL (`>= 0.20x`), and `Barbon Ensemble Donchian Trend` accurately flags `EMA COMPRESSION COIL` as an unpassed filter (`✗`) until the 9/21/50 ribbon expands.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-density quantitative terminal with crisp dual-theme (dark/light) contrast.
  - *Color Palette & Mood*: Preserves the obsidian slate (`#090c12`) and daylight (`#f8fafc`) surfaces with semantic emerald (`#4edea3` / `#047857`), cyan (`#00f0ff` / `#0284c7`), amber (`#f59e0b` / `#b45309`), and coral (`#ffb4ab` / `#b91c1c`) accents.
  - *Typography & Hierarchy*: Monospace tabular numerals (`font-mono tabular-nums`) across all RVOL, backtest sample counts (`N=...`), and match score badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Bayesian Empirical Shrinkage for 250-Bar Walk-Forward Backtests**
  - *Chosen Approach*: Blend each strategy's observed 250-bar win rate and average R with a conjugate prior of `5` virtual trades at `50%` win rate and `0.0R`:
    $$\text{shrunkWinRate} = \frac{\text{winRatePct} \cdot n + 50 \cdot 5}{n + 5}, \quad \text{shrunkAvgR} = \frac{\text{avgRealizedR} \cdot n}{n + 5}$$
  - *Why*: A single lucky trade (`N=1, 100% Win Rate, 1.95R`) shrinks to `58.3%` and `0.33R`, preventing tiny samples from eclipsing robust 30-trade setups (`N=30, 56.7% Win Rate, +0.52R`).
- **Decision 2: Strict Podium Regime Gate (`possibilityScore >= 50`)**
  - *Chosen Approach*: Filter Podium candidates for `s.possibilityScore >= 50` (`STALKING_SETUP` or `TRIGGER_ACTIVE`) and `s.backtest250Bars.avgRealizedR >= 0` before sorting by `compositeScore` descending, falling back to the broader pool only if fewer than 3 strategies meet the threshold.
  - *Why*: Ensures a `42% (WRONG REGIME)` setup never appears on the Podium ahead of a `64% (STALKING SETUP)` strategy.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────────────────┐
│                CLOSED-BAR SESSION RVOL & PLAYBOOK ENGINE                │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Closed-Bar Session RVOL Normalizer                             │  │
│  │    • If current bar < 40% elapsed OR raw RVOL < 0.20x:            │  │
│  │      evaluate klines.slice(0, -1) (last completed bar)            │  │
│  │    • Guarantees liveSessionRvol >= 0.20x across all 14 playbooks  │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 2. Barbon Donchian Ribbon & Walk-Forward Detector                 │  │
│  │    • Rule 1 requires strict EMA9 > EMA21 > EMA50 (or inverse)     │  │
│  │      and maResult.ribbonAlignment !== 'COMPRESSION'               │  │
│  │    • Backtest detector triggers on 12-bar channel breakout or     │  │
│  │      EMA9/21/50 trend continuation pullback (8–25 signals/250b)   │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 3. Bayesian Shrinkage & Top 3 Podium Selector                     │  │
│  │    • Prior: 5 virtual trades @ 50% WR, 0.0R                       │  │
│  │    • compositeEdgeScore = round(score*0.65 + shrunkWR*0.35        │  │
│  │      + clamp(shrunkAvgR * 20, -15, 20))                           │  │
│  │    • Podium filters possibilityScore >= 50 && avgRealizedR >= 0   │  │
│  │    • Unified "${possibilityScore}% MATCH" badge on Podium & Cards │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```
