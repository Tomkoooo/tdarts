# tDarts UI Design System

_Last updated: 2025-11-09_

This document captures the visual rules that govern every new surface we build. Keep these guardrails close when designing or reviewing new components.

## Color Language

- **Core palette** – We keep the existing oklch-derived brand colors (`--primary`, `--secondary`, `--accent`, `--destructive`) and use them sparingly for emphasis only.
- **Surface stack** – App backgrounds sit on `bg-background`. Cards use one of:
  - `bg-card/95` for primary containers (modals, dashboards)
  - `bg-card/85` or `bg-muted/30` for secondary surfaces
  - `bg-muted/20` for supporting blocks (stats, empty states)
- **Type** – High contrast text stays on `text-foreground`. Secondary information uses `text-muted-foreground`. Never render important copy on saturated brand backgrounds.

## Spacing & Rhythm

- Base unit: **4px**. Standard component paddings: `px-4 py-3` (compact), `px-5 py-5` (cards), `px-6 py-6` (dialogs/sections).
- Provide breathing room between stacked blocks using `space-y-3` or `space-y-4` (desktop). On mobile collapse horizontal gutters to `px-4`.

## Shadow & Layering

- No hard borders. We create hierarchy with directional shadows:
  - **Primary surface**: `shadow-[12px_13px_0px_-4px_rgba(0,0,0,0.45)]`
  - **Secondary blocks**: `shadow-[8px_9px_0px_-4px_rgba(0,0,0,0.45)]`
- Hover treatments adjust color (`hover:bg-muted/20`) or scale (`group-hover:scale-105` max). Never animate box-shadow blur.

## Component Patterns

### Cards
- Rounded (`rounded-2xl`) with one of the surface colors above.
- Internal layout: `flex flex-col gap-4` or `grid gap-3`.
- When cards embed buttons, use `Button variant="ghost"` or `variant="outline"` to maintain contrast.

### Tabs
- Container: translucent surface with directional shadow.
- `TabsTrigger` states: inactive `text-muted-foreground`, active `bg-primary/15 text-primary` + directional shadow.

### Data Blocks
- Stats/Key metrics use `bg-muted/25` or `bg-gradient-to-br from-muted/25 to-muted/10` with subtle text accents.
- Inline value pairs sit inside `flex justify-between gap-2 rounded-md bg-card/75 px-3 py-2`.

### Lists & Collections
- Apply `space-y-3` for vertical stacks and `gap-4` for grids.
- Each list item should be a full-width surface with consistent padding, no default borders.

### Empty States & Alerts
- Use the secondary shadow (`shadow-[8px_9px_0px_-4px_rgba(0,0,0,0.45)]`) if elevation is needed.
- Centered copy, icon with reduced opacity, and call-to-action button (`variant="default"`).

## Responsive Rules

- Mobile-first layout uses single column with `gap-3` and condensed paddings (`px-4`).
- On tablets, promote grids to two columns when possible.
- Keep interactive hit areas at least `44px` high.

## Interaction & Motion

- Transition timing: `transition-all duration-200` for hover/toggle.
- Avoid rotation or blur animations. Focus states rely on `ring-primary/60`.

Following these principles keeps the refreshed UI cohesive and premium, across both the legacy pages we are modernising and every new screen that ships next.
