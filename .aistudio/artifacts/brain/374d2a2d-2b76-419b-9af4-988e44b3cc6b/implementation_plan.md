# Implementation Plan: 4-Workspace Navigation, Full-Width Playbook/Codex Expansion & Rounded Obsidian Cards

## 1. Strict Read-Only Lock
- Zero modifications to:
  - `src/utils/quantEngine.ts`
  - `src/utils/famousStrategiesEngine.ts`
  - `src/utils/reverseAcademyEngine.ts`
  - `src/utils/metricBenchmarks.ts`
  - `src/utils/paperJournal.ts`
  - `src/services/marketData.ts`
  - `src/components/QuantChart.tsx`

## 2. Prominent 4-Workspace Top Navigation Dock (`src/components/StrategyTabs.tsx`)
- Replace the small view switcher buttons with a sticky, high-visibility **Primary Mode Dock** (`grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-[#090d16]/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40`):
  1. **`📊 6-STAGE MARKET FLOW`** (`Step-by-Step Analysis`) — Glowing Cyan gradient pill (`from-[#00f0ff]/20 to-[#00f0ff]/5 border-[#00f0ff]/60`). Renders the 6-Stage Progressive Stepper (`01 Price` ➔ `05 Quant`) + `Compact All` toggle alongside the Live Chart.
  2. **`🏆 14 PRO PLAYBOOKS`** (`Gann • Lunar • SSRN (${readyCount} Ready)`) — Glowing Amber/Gold gradient pill (`from-[#f59e0b]/25 to-[#f59e0b]/5 border-[#f59e0b]/60 text-[#fcd34d]`). Renders the Multi-Era Quantitative Playbook & Gann/Lunar Lab in a 2–3 column responsive grid.
  3. **`🎯 EXECUTE & SIZER`** (`Pre-Flight & Risk Calc`) — Glowing Emerald gradient pill (`from-[#4edea3]/20 to-[#4edea3]/5 border-[#4edea3]/60 text-[#4edea3]`). Renders Stage 06 Final Funnel Scorecard, 1-Click Stage Setup Loader, 5-Point Pre-Flight Checklist, and Position Size Calculator (`ExecutionHelper`), syncing the `R:R BOX` onto the chart.
  4. **`📚 CODEX & ACADEMY`** (`Learn All Elements & X-Ray`) — Glowing Purple/Indigo gradient pill (`from-[#c084fc]/25 to-[#c084fc]/5 border-[#c084fc]/60 text-[#e9d5ff]`). Renders `<InfernoCodexHub />`.

## 3. Auto-Expanding Full-Width Mode with Split View Toggle (`src/App.tsx` & `src/components/StrategyTabs.tsx`)
- Add `isRightWorkspaceExpanded` state in `src/App.tsx` and pass `isWorkspaceExpanded` and `onToggleWorkspaceExpand` to `StrategyTabs`.
- When switching to **`🏆 14 PRO PLAYBOOKS`** or **`📚 CODEX & ACADEMY`** on desktop, automatically expand the workspace to full width (`lg:col-span-12`) so the 14 Playbooks and Codex cards have breathing room across a 2–3 column grid.
- Render a prominent header toggle button `[ ◫ SPLIT WITH CHART | ⤢ EXPAND FULL SCREEN ]` so the user can view the chart alongside Playbooks/Codex at any time.
- Automatically snap back to the `7-col Chart / 5-col Deck` split view whenever the user clicks **`🎯 TRACK ON CHART`**, **`⚡ LOAD INTO SIZER`**, or selects **`📊 6-STAGE MARKET FLOW`** or **`🎯 EXECUTE & SIZER`**.

## 4. Modern Rounded Obsidian Glass Cards & Readable Typography (`src/index.css` & `src/components/StrategyTabs.tsx`)
- Update `.cyber-panel` in `src/index.css` with `!important` rules for `16px` border radius, deep obsidian glass gradient (`rgba(19, 25, 38, 0.88)` to `rgba(11, 15, 25, 0.95)`), `1px solid rgba(255, 255, 255, 0.09)`, and elevated inset/drop shadows.
- Replace hardcoded square `bg-[#090c12] border border-[#1e2636]` inner cards in `src/components/StrategyTabs.tsx` with `rounded-xl bg-[#0d121d]/90 border border-white/[0.08] p-4 shadow-lg`.
- Upgrade action buttons (`🎯 Track on Chart`, `⚡ Load into Sizer`, `🔍 Assess Rules`, `← Prev Stage`, `Next Stage →`) to `text-[11px] sm:text-[12px] font-semibold px-3.5 py-2 rounded-lg transition-all shadow-sm`.
- Upgrade Stage Titles to `text-[15px] sm:text-[16px] font-bold tracking-tight text-white` and body descriptions to `text-[13px] leading-relaxed text-[#cbd5e1]`.

## 5. Collapsible Mobile Floating Command Menu (`src/App.tsx`)
- Keep the collapsible bottom-left floating command menu on mobile and map its 5 buttons directly to:
  1. `📈 CHART` (Live Chart + 1-tap Layer Chips)
  2. `📊 6 STAGES` (`6-Stage Market Flow`)
  3. `🏆 PLAYBOOKS` (`14 Pro & Gann Playbooks`)
  4. `🎯 EXECUTE` (`Pre-Flight & Sizer`)
  5. `📚 CODEX` (`Inferno Codex & X-Ray Learn Hub`)
