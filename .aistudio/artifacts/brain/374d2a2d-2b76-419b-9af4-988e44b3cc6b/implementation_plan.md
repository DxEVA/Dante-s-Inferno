# Playbook & Gann/Lunar Scanner Surgical Audit Fixes Plan

## 1. Strict LONG / SHORT Trade Plan Geometry (`src/utils/famousStrategiesEngine.ts`)
- Add `sanitizeTradePlan(direction: 'LONG' | 'SHORT', rawEntry: number, rawStop: number, rawTp1: number, rawTp2: number, atr: number, triggerNote: string)` and wrap every strategy's `tradePlan` through it:
  - `safeAtr = Math.max(atr || rawEntry * 0.008, rawEntry * 0.004)`.
  - **`direction === 'LONG'`**:
    - Ensure `stopLoss < entryPrice` (`if (rawStop >= entryPrice * 0.997) stopLoss = entryPrice - 1.25 * safeAtr`).
    - `riskDist = Math.max(entryPrice - stopLoss, rawEntry * 0.004)`.
    - Ensure `tp1Price > entryPrice` (`if (rawTp1 <= entryPrice + riskDist * 1.1) tp1Price = entryPrice + riskDist * 1.8`).
    - Ensure `tp2Price > tp1Price` (`if (rawTp2 <= tp1Price) tp2Price = entryPrice + riskDist * 3.0`).
  - **`direction === 'SHORT'`**:
    - Ensure `stopLoss > entryPrice` (`if (rawStop <= entryPrice * 1.003) stopLoss = entryPrice + 1.25 * safeAtr`).
    - `riskDist = Math.max(stopLoss - entryPrice, rawEntry * 0.004)`.
    - Ensure `tp1Price < entryPrice` (`if (rawTp1 >= entryPrice - riskDist * 1.1) tp1Price = entryPrice - riskDist * 1.8`).
    - Ensure `tp2Price < tp1Price` (`if (rawTp2 >= tp1Price) tp2Price = entryPrice - riskDist * 3.0`).
- Fix `gann_sq9_cardinal_harmonic`:
  - When price is closer to `+90° Cardinal Resistance` (`res90`) than `-90° Cardinal Support` (`sup90`) and fading resistance downward, set `direction = 'SHORT'` with `entryPrice = res90`, `stopLoss = res180`, `tp1Price = sup90`, `tp2Price = sup180`.
  - When closer to `-90° Cardinal Support` (`sup90`), set `direction = 'LONG'` targeting `res90` and `res180`.
- Fix `deribit_gex_zero_gamma`:
  - Guarantee `putWall < currentPrice` (downside support) and `callWall > currentPrice` (overhead resistance).
  - When `direction === 'SHORT'`, target downside `putWall` (or `currentPrice - 2 * ATR`), never an overhead strike above entry.

---

## 2. Fix False-Positive `✓ PASS` Orderflow / CVD Checks (`src/utils/famousStrategiesEngine.ts`)
- Audit all 14 strategies in `famousStrategiesEngine.ts` (including `wyckoff_spring_judas_ob` and `ssrn_yuan_lunar_funding_cycle`) so any rule checking CVD Delta or Spot-vs-Perp Orderflow strictly validates directional alignment:
  - For a `LONG` setup: `passed` is `true` ONLY when `spotDeltaPct > 0` OR `cvdDelta > 0` (and never when Perp Sell Pressure is dominant).
  - For a `SHORT` setup: `passed` is `true` ONLY when `spotDeltaPct < 0` OR `cvdDelta < 0` (and never when Perp Buy Pressure is dominant).

---

## 3. Fix `raschke_holy_grail` Backtest & Composite Podium Ranking (`src/utils/famousStrategiesEngine.ts` & `src/components/StrategyTabs.tsx`)
- **Linda Raschke Holy Grail 250-Bar Walk-Forward Backtest**:
  - Trigger historical `LONG` only when `ema21 > ema50 && adx >= 22 && low <= ema21 * 1.004 && close >= ema21` with `stop = Math.min(ema50, low - 0.8 * atr)` and `target = close + 1.8 * (close - stop)` (and exact inverse for `SHORT`).
- **Composite Podium Edge Score (`compositeScore`)**:
  - Compute:
    ```ts
    const expectancyBonus = Math.max(-25, Math.min(25, backtest250Bars.avgRealizedR * 25));
    const winRateScore = backtest250Bars.signalsCount >= 3 ? backtest250Bars.winRatePct : 50;
    const lowWinPenalty = backtest250Bars.winRatePct < 42 || backtest250Bars.avgRealizedR < 0 ? -18 : 0;
    const compositeEdgeScore = Math.round(
      possibilityScore * 0.55 + winRateScore * 0.45 + expectancyBonus + lowWinPenalty
    );
    ```
  - Filter the **Top 3 Best Available Setups Podium** in `StrategyTabs.tsx` to prioritize setups with `backtest250Bars.winRatePct >= 40 && backtest250Bars.avgRealizedR >= 0` (whenever at least 3 setups qualify) sorted descending by `compositeScore`.

---

## 4. Fix Text Overflow in the Top 4 Gann / Lunar / Seasonal Cards (`src/components/StrategyTabs.tsx`)
- **Card 3 (`GANN SQUARE OF 9 HARMONICS`)**:
  - Change the 4 harmonic buttons (`-90° SUP`, `+90° RES`, `-180° SUP`, `+180° RES`) to a vertical stacked layout (`flex flex-col items-start p-2 gap-0.5 overflow-hidden`) with the degree label on the top row (`text-[8.5px]`) and the price on the bottom row (`text-[11.5px] font-bold tabular-nums truncate w-full`).
- **Card 1 & Card 2 (`LUNAR SYNODIC` & `GANN SOLAR SEASONAL`)**:
  - Replace `truncate` on the seasonal quadrant title, cardinal date, and bottom notes with clean 2-line wrapping (`text-[10px] leading-snug break-words`).
