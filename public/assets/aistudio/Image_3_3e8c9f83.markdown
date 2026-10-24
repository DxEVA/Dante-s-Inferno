---
name: Institutional Quant Terminal
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#fdf2ff'
  on-tertiary: '#490080'
  tertiary-container: '#eacfff'
  on-tertiary-container: '#842bd2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  matrix-display:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.02em
  matrix-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: -0.01em
  matrix-compact:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.5rem
  margin: 0.75rem
  space-xs: 0.125rem
  space-sm: 0.25rem
  space-md: 0.5rem
  space-lg: 0.75rem
  space-xl: 1rem
---

## Brand & Style

This design system targets quantitative cryptocurrency traders, proprietary trading desks, and institutional portfolio managers who operate in high-volatility, low-latency environments. The emotional posture is calculated, calm under pressure, and unapologetically technical. The visual language rejects retail gamification in favor of extreme data density, optical legibility, and ruthless precision.

The aesthetic fuses **Modern Financial Brutalism** with **Engineered Minimalism**. Interfaces are structured as modular computational workspaces: surfaces utilize deep obsidian tones, crisp 1px hair lines for matrix separation, and high-frequency data streams styled with targeted luminous accents. Color is never decorative; it functions strictly as semantic telemetry indicating order flow imbalance, liquidation risk, and directional delta.

## Colors

The palette is engineered for prolonged operational focus in low-light environments, maximizing luminance contrast without causing optical fatigue.

- **Background & Canvas (`#0B0E14`)**: Deep obsidian base substrate, absorbing ambient glare and maximizing contrast for chromatic telemetry.
- **Surfaces & Cards (`#12161F`)**: Low-reflectance secondary container layer, visually elevating execution panels and matrix feeds.
- **Structural Dividers (`#1E2433`)**: Structural sub-layer lines used for non-distracting 1px component boundaries and ledger grids.
- **Electric Cyan (`#00F0FF`)**: Primary accent indicating user focus, active order entry, selected states, and algorithmic execution routes. Accompanied by low-spread, low-opacity diffuse glow layers on primary triggers.
- **Emerald (`#10B981`)**: Bullish delta, bids, long positioning, call contracts, and dynamic volume shelf support.
- **Coral Red (`#F43F5E`)**: Bearish delta, asks, short exposure, put contracts, and stop-loss invalidations.
- **Amber Gold (`#F59E0B`)**: Point of Control (POC), delta traps, liquidity cliffs, and margin threshold warnings.
- **Institutional Purple (`#A855F7`)**: Gamma exposure (GEX), implied volatility skews, and institutional flow anomalies.
- **Text & Telemetry Neutral**: `#F1F5F9` (Primary Values), `#94A3B8` (Secondary Metrics), `#475569` (Tertiary / Column Labels).

## Typography

The typography implements a dual-typeface engine: **Inter** handles structural navigation, window management, and narrative metrics, while **JetBrains Mono** governs the high-frequency tabular runtime, depth ladders, order books, and matrix coordinates.

All numeric readouts in **JetBrains Mono** must use fixed-width tabular figures (`font-variant-numeric: tabular-nums lining-nums`) to prevent horizontal jitter during millisecond-frequency price updates. 

Hierarchy rules:
- **`headline-xl` through `headline-md`**: System monitoring bars, asset tickers, and top-level portfolio valuation aggregates.
- **`matrix-display`**: Real-time ticker feeds, index benchmarks, and dynamic mark prices.
- **`matrix-data` & `matrix-compact`**: Order book depth bids/asks, trade print lists, gamma curves, and funding rate matrices.
- **`label-caps`**: Always rendered in uppercase for table header classifications, parameter tags, and execution status states.

## Layout & Spacing

The terminal operates on an ultra-compact, data-dense spacing model optimized for multi-monitor setups and widescreen trading workstations. Spacing is strictly controlled through a 4px/8px micro-grid to preserve vertical screen real estate.

- **Workspace Engine**: A 24-column fluid dock layout where viewports (DOM, Chart, Tape, Risk Engine, Position Matrix) are resizable and collapsible panes separated by precise zero-margin gutter boundaries.
- **Gutters & Dividers**: Internal panes share a single contiguous 1px border grid (`#1E2433`) rather than decoupled margins, preventing visual fragmentation.
- **Reflow Architecture**:
  - **Desktop (Multi-pane / Ultrawide)**: Full 24-column layout supporting simultaneous Level 3 order books, correlation matrix, execution blotter, and charting canvases.
  - **Tablet (Inspection Mode)**: Reflows into a 12-column dual-tier split: primary charting/blotter above, tabbed analytics below.
  - **Mobile (Emergency Execution)**: 4-column stacked single-metric focus; deep matrices yield to focused execution triggers and high-priority liquidation alerts.

## Elevation & Depth

Visual depth is achieved through **Tonal Boundary Layering** combined with targeted **Chromatic Glow**, entirely avoiding blurred drop shadows that muddy dense numeric arrays.

- **Level 0 (Canvas Base - `#0B0E14`)**: Workspace foundation and terminal backdrop.
- **Level 1 (Dock Panes - `#12161F`)**: Chart containers, book ladders, and analytical matrices. Framed with a 1px solid border of `#1E2433`.
- **Level 2 (Active Focus & Headers - `#181E2B`)**: Column headers, selected tab strips, and pinned table rows.
- **Level 3 (Overlays & Modals - `#1A202E`)**: Liquidity depth filters, execution confirmations, and algorithmic script editors. Framed by a 1px `#2B354C` border.
- **Luminous Focus**: Primary interactive states (e.g., active order trigger, focused input) project a controlled sub-surface glow: `box-shadow: 0 0 12px rgba(0, 240, 255, 0.25)`.
- **System States**: Invalidation lines and critical margin triggers apply a subtle pulsing boundary glow in their respective chromatic hues (`#F43F5E` or `#F59E0B`).

## Shapes

The design uses a restrained, micro-radii shape language (`Soft` - level 1). Extreme rounding is prohibited because curved corners waste pixel surface area in dense tabular grids.

- **Panes, Modules, and Modals**: Radii fixed to `0.25rem` (4px).
- **Buttons, Numeric Inputs, and Tabs**: Radii fixed to `0.125rem` (2px) to maintain a mechanical, terminal-grade precision.
- **Badges, Tags, and Status Dots**: Radii fixed to `0.125rem` (2px); never full pills.
- **Execution Ladders**: 0px radius along joined boundaries to produce contiguous data strips.

## Components

### Buttons & Order Triggers
- **Primary Execution (Cyan)**: `#00F0FF` background, `#0B0E14` typography (Inter, Semi-bold 12px), 2px radius, height 28px. Low-spread Cyan glow on hover.
- **Directional Buy/Long (Emerald)**: `#10B981` background, `#0B0E14` typography. Compact height (28px). Hover state brightens saturation.
- **Directional Sell/Short (Coral Red)**: `#F43F5E` background, `#FFFFFF` typography.
- **Ghost/Utility**: Transparent background, 1px `#1E2433` border, `#94A3B8` text. Hover transitions border to `#00F0FF` and text to `#F1F5F9`.

### Numeric Inputs & Parameter Controls
- Height 26px, `#0B0E14` interior, 1px `#1E2433` border.
- Text rendered in `JetBrains Mono` 12px with right-aligned numeric entry. Left-aligned label in `Inter` 10px `#475569`.
- Stepper arrows integrated as flush 12px micro-buttons. Active focus ring: 1px `#00F0FF`.

### Depth Ladders & Order Books
- Contiguous rows (18px row height) rendered in `JetBrains Mono` 11px.
- Dynamic depth bars rendered as horizontal visual histograms behind text using 12% opacity overlays (`#10B981` for bids, `#F43F5E` for asks).
- Highlight flashes for new executions: 150ms instant flash fading to transparent over 350ms.

### Tables & Data Blotters
- Fixed 24px header height with uppercase `label-caps` (`#475569`).
- Zebra striping is avoided; rows are partitioned via 1px border bottom (`#151A24`).
- PnL metrics display explicit signs (`+` / `-`) paired with `#10B981` or `#F43F5E`.

### Telemetry Badges & Chips
- Padding: 1px 4px. Font: `JetBrains Mono` 10px uppercase.
- Neutral Chip: Background `#181E2B`, border 1px `#1E2433`, text `#94A3B8`.
- Options/Gamma Chip: Background `rgba(168, 85, 247, 0.1)`, border 1px `rgba(168, 85, 247, 0.3)`, text `#A855F7`.
- POC / Warning Chip: Background `rgba(245, 158, 11, 0.1)`, border 1px `rgba(245, 158, 11, 0.3)`, text `#F59E0B`.

### Matrix Heatmaps & Correlation Views
- Squared cell displays with continuous color-ramps between `#10B981` (positive correlation) and `#F43F5E` (negative correlation).
- Cell data displayed using `matrix-compact` centered within each node.