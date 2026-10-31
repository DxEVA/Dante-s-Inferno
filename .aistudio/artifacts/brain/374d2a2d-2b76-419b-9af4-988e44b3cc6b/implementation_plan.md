# Mobile Floating Collapsible Command Pill Navigation Plan

## 1. Objective
Replace the full-width mobile bottom dock (`left-2 right-2 bottom-2`) in `src/App.tsx` with a sleek, modern **Floating Collapsible Command Pill & Radial/Vertical Popover Dock** anchored on the **bottom-left edge** (`bottom-4 left-3`) so that it stays completely clear of the bottom-right Netlify / preview badge while giving 1-tap access to all 5 mobile views (`CHART`, `6 STAGES`, `RADAR`, `EXECUTE`, `X-RAY`) and preserving all existing functionality.

---

## 2. UX & Interaction Design (`src/App.tsx` Only)

1. **Collision-Free Bottom-Left Anchor (`lg:hidden fixed bottom-4 left-3 z-[9999]`)**:
   - The right side of the bottom viewport is left 100% open so floating third-party badges (such as Netlify or host overlays in the bottom-right corner) never cover any controls.
2. **Compact Active Command Pill + Quick-Expand Trigger**:
   - **Collapsed State**: Displays a compact, high-contrast chamfered pill on the bottom-left showing:
     - Hamburger / Command icon (`widgets` / `close`)
     - Current active view icon, label, and live telemetry badge (e.g., `CHART • 15M`, `6 STAGES • S01`, `RADAR • 82%`, `EXECUTE • S06`, `X-RAY • LEARN`)
     - A quick-toggle button right beside it to jump directly back to `CHART` (when viewing Stages/Execute) or `6 STAGES` (when viewing Chart) in 1 tap without even opening the menu.
   - **Expanded State (Vertical / Compact Fan-Out Command Stack on Bottom-Left)**:
     - Tapping the command pill smoothly expands a vertical/grid cyber-brutalist command menu directly above the bottom-left pill (`bottom-16 left-3 w-64`), listing all 5 terminal workspaces (`CHART`, `6 STAGES`, `RADAR`, `EXECUTE`, `X-RAY`) with their live badges, active cyan/sky indicator bar, and full light/dark theme contrast support.
     - Selecting any item switches the mobile page and automatically collapses the menu.
     - Includes a subtle backdrop tap catcher when open so tapping anywhere outside closes the menu cleanly.

---

## 3. Scope Constraint
- **Zero Impact on Other Elements**: Only the mobile navigation block in `src/App.tsx` is updated. All chart overlays, 6-stage pipeline logic, Playbooks & Gann Hub, and desktop layouts remain untouched.
