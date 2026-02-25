# UI System Guide

## Design Tokens

Main tokens live in `src/app/globals.css`.

- Color:
  - `--background`, `--surface`, `--surface-strong`
  - `--foreground`, `--muted`
  - `--primary`, `--primary-strong`, `--accent`
  - `--success`, `--warning`, `--danger`, `--border`
- Radius:
  - `--ui-radius-sm` (12px), `--ui-radius-md` (16px), `--ui-radius-lg` (22px), `--ui-radius-xl` (28px)
- Shadow:
  - `--ui-shadow-xs`, `--ui-shadow-sm`, `--ui-shadow-md`, `--ui-shadow-lg`
- Motion:
  - `--ui-motion-fast` (150ms), `--ui-motion-base` (200ms), `--ui-motion-panel` (250ms)
  - `--ui-ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`)
- iOS viewport:
  - `--todo-shell-vh` with `100vh` fallback + `100svh`/`100dvh` when supported

## Reusable UI Classes

- Cards: `ui-card`, `ui-card--hero`
- Buttons: `ui-btn` + variants:
  - `ui-btn--primary`, `ui-btn--secondary`, `ui-btn--ghost`, `ui-btn--accent`, `ui-btn--destructive`
- Inputs: `ui-field`
- Chips/pills: `ui-chip`, `ui-chip--meta`, `ui-pill`
- Alerts: `ui-alert`, `ui-alert--info`, `ui-alert--success`, `ui-alert--danger`
- Typography helpers: `ui-kicker`, `ui-title-xl`, `ui-title-lg`, `ui-subtle`
- States:
  - Empty: `ui-empty`
  - Skeleton: `ui-skeleton`

## Motion Rules

- Hover: small lift (`translateY(-1px)`) + subtle shadow
- Active/press: scale between `0.99` and `1`
- Focus: always use visible focus ring (`focus-visible`)
- Panels (drawer/sheet): slide + fade transitions, no bounce
- Respect reduced motion:
  - `@media (prefers-reduced-motion: reduce)` disables transitions/animations

## Responsive Rules

- Desktop/Laptop: tasks workspace in multi-column shell
- Tablet: compact shell + detail as overlay
- Mobile portrait: single-column main + drawer/sheet
- Mobile landscape:
  - compact topbar
  - reduced paddings
  - full usable width

## iOS/Safari Safety

- Safe-area utilities:
  - `.safe-px`, `.safe-pt`, `.safe-pb`
- Task shell and drawers use safe-area paddings for top/bottom and side notches
- Use `min-w-0` on flex/grid children to avoid overflow
- Keep wrapper `overflow-x-hidden` to prevent accidental horizontal scroll
