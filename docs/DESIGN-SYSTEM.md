# FORGE Design System — The Visual Contract

This document is binding. Every pixel added to FORGE must derive from it.
If a change can't be expressed through these tokens and recipes, the
tokens get extended deliberately (here + `src/index.css`) — never ad-hoc
values sprinkled in components. This is how the app stays looking like
one person designed it, forever.

## 1 · Identity

Dark OLED "green glow" instrumentation. The app should feel like premium
gym equipment in a dark room: near-black surfaces, one lime accent that
*glows*, condensed athletic type, glassy cards. Calm everywhere, bright
exactly where progress happens.

## 2 · Color tokens (defined in `src/index.css` `@theme`)

| Token | Value | Use |
|---|---|---|
| `--color-bg0` | `#050705` | Page background. Never pure black. |
| `--color-bg1` | `#0A0F0A` | Sheets, raised zones |
| `--color-glass` | `rgba(255,255,255,0.035)` | Card fill |
| `--color-glass-hi` | `rgba(255,255,255,0.06)` | Hover/active card fill, icon wells |
| `--color-edge` | `rgba(174,255,102,0.10)` | Card borders |
| `--color-edge-hi` | `rgba(174,255,102,0.28)` | Active/selected borders |
| `--color-lime` | `#A8E063` | THE accent. Progress, primary buttons, active nav |
| `--color-lime-hi` | `#CDFF7A` | Hover state of lime, bright text accents |
| `--color-lime-deep` | `#5C8F33` | Rarely — pressed states |
| `--color-lime-dim` | `rgba(168,224,99,0.14)` | Selected chip/segment fills |
| `--color-ink` | `#F1F5EC` | Primary text |
| `--color-ink-dim` | `#93A08D` | Secondary text |
| `--color-ink-faint` | `#566050` | Tertiary/disabled text |
| `--color-ember` | `#E0745C` | Missed days, destructive. Nothing else. |
| `--color-gold` | `#FFD66B` | PR celebrations ONLY |
| `--color-rest` | `#6B7A94` | Rest-day identity |
| `--color-alarm` / `-hi` | `#FF5040` / `#FF7A6B` | THE RED ZONE rest timer ONLY — the app's single red takeover. Never reuse for errors (that's ember). |

**Glow recipe** (the signature): lime elements that represent progress get
`box-shadow: var(--shadow-glow)` (`0 0 24px rgba(168,224,99,0.35)`) or
`filter: drop-shadow(0 0 6-8px rgba(168,224,99,0.6-0.8))` for icons/strokes.
Do not glow gray things. Glow = earned.

## 3 · Chart colors (validated — do not eyeball replacements)

Single-series charts (volume, strength): always `#A8E063` stroke, gradient
fill `#A8E063` 35% → 0%. No legend for single series.

Categorical (muscle-balance donut) — **fixed order, never cycled, never
reassigned when filtering**; validated with the dataviz six-checks
validator against surface `#0A0F0A` (all PASS):

1. Chest `#6FA83C` · 2. Back `#C05E8A` · 3. Arms & Shoulders `#4F7FD9` ·
4. Legs `#BE8A3A` · 5. Abs `#2F9E8F`

Rules: segments carry 2–3px surface gaps; identity is always doubled by
a direct label list (color is never the only channel); values/labels use
ink tokens, never the series color. If you ever add a 6th category, fold
into "Other" — do not invent a hue. Re-validate any palette change with
the `dataviz` skill's `validate_palette.js` before shipping.

## 4 · Typography

| Role | Face | Rules |
|---|---|---|
| Display (`.display`) | **Barlow Condensed** 700 | ALWAYS uppercase, line-height 0.95, used for screen titles, day names, big numbers |
| Body | **Barlow** 400/500/600 | Sentence case, 16px base |
| Eyebrow (`.eyebrow`) | Barlow 600 | 0.7rem, uppercase, letter-spacing 0.18em, `--color-ink-dim` |
| Stats (`.stat`) | Barlow Condensed 700 | tabular-nums, line-height 1 |

Loaded via Google Fonts in `index.html`. Do not add faces. Hierarchy comes
from size/weight/tokens, not new fonts.

## 5 · Shape, space, surfaces

- Cards: `.card` class only (glass fill + edge border + `--radius-card`
  1.25rem + 14px backdrop blur). Active/glowing: add `.card-active`.
  **There is no other container style.**
- Inner elements (chips, rows, icon wells): `rounded-xl` (0.75rem).
- Screen padding: `px-4`; content max width `max-w-107` (428px) centered.
- Touch targets ≥ 44×44 (`w-11 h-11` minimum for tap controls).
- iOS safe areas via `.pt-safe` / `.pb-safe`.

## 6 · Icons — ONE language (`src/components/icons.tsx`)

Never import an icon pack. Every icon is hand-drawn in that one file:

- 24×24 viewBox, stroke `1.75`, `round` caps + joins, `currentColor`,
  fills only for micro accent dots.
- Geometry stays inside a 1.5px margin (coords 2.5–21.5).
- Active/glowing icons get the drop-shadow glow recipe (see §2).

**Worked example — adding a "kettlebell" icon:**
```tsx
export const IconKettlebell = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 8.5V6a3 3 0 0 1 6 0v2.5" />          {/* handle */}
    <path d="M7.5 8.5h9l1.5 6a6 6 0 1 1-12 0l1.5-6Z" /> {/* bell */}
  </Base>
)
```
Register exercise icons in `EXERCISE_ICONS` so `icon` keys on exercise
rows resolve. That's the entire process.

## 6b · Glow techniques (learned the hard way)

- **Never use SVG `drop-shadow` filters for glow** — iOS Safari silently
  drops them and cards clip them. The house technique (see `StatRing`,
  `RestTimer`): render a **blurred duplicate** of the stroke (`filter:
  blur(6-8px)` on a second SVG) with `overflow: visible` everywhere.
- **Card breathe**: every `.card` carries a `::before` pseudo-element with
  a pre-rendered lime shadow whose **opacity only** animates (6s loop,
  0.35→0.85). Cheap to paint; `card-active` versions glow stronger. Don't
  animate box-shadow directly.
- **Flame flicker** (`.flame-flicker`): 2.6s scale/rotate micro-noise,
  transform-origin at the flame base.
- **Living stats** (`.icon-live` / `.stat-live`): the stat-tile treatment —
  lime icon with drop-shadow glow + 3.2s opacity/scale pulse; numbers get
  a matching text-shadow pulse. Used on Home's StatTile grid and the
  lifetime Total-lbs hero. Icons `IconReps` (repeat cycle) and `IconBars`
  (ascending bars) were drawn for these tiles per the §6 contract.

## 7 · Motion

- Entrances: fade-up 14px, 0.3–0.4s, stagger 0.05–0.08s between siblings.
- Rings/charts draw in ~0.9–1.1s with ease `[0.22, 1, 0.36, 1]`.
- Sheets: spring (damping 28, stiffness 300) from bottom, via portal.
- Presses: `active:scale-95..98`, transitions 150–300ms.
- PR celebration: gold trophy pops in (`scale 0→1`, slight rotate) + gold glow.
- **RED ZONE rest timer** (`RestTimer.tsx`): full-screen portal takeover.
  Escalating pulse phases — calm >30s (3s pulse), warning 10–30s (1.4s),
  critical <10s (0.55s + number thump per second + brighter `-hi` red).
  Ring drains via stroke-dashoffset with 0.9s linear transitions. Tap
  anywhere skips; +30s extends. Duration from `settings.restTimerSec`
  (0 disables). Reduced motion: no pulse, static states.
- Everything respects `prefers-reduced-motion` (global kill in index.css).
- Motion conveys state change; no decorative loops except the ambient
  `.glow-orb` breathe.

## 8 · Voice (words are design material)

The coach is firm, honest, economical. Rules in `src/lib/trainer.ts`:
direct sentences, no exclamation spam, no empty hype, credit only when
earned, always respects that Palmer is 42 and busy. Buttons say exactly
what they do ("Start workout", "Save as partial"). Empty states instruct
("Two sessions in the range draws the first trend line."), never apologize.

## 9 · Component primitives (`src/components/ui.tsx`)

`Card`, `GlowButton` (primary/ghost/danger), `StatRing` (the signature
glow ring), `Stepper`, `Segmented`, `Sheet` (portal bottom sheet),
`EmptyState`. Screens compose these; change a primitive and the whole app
follows. New UI = new composition of primitives first, new primitive
second, one-off markup never.

## 10 · Pre-ship checklist (run every visual change)

- [ ] Colors/typography derive from tokens (grep your diff for raw hex — only tokens files may contain them)
- [ ] Icons from `icons.tsx` only, same stroke/grid
- [ ] Touch targets ≥ 44px, `cursor-pointer` on clickables
- [ ] Focus visible (global `:focus-visible` covers standard elements)
- [ ] Reduced motion respected (no inline animations that bypass the global kill)
- [ ] Charts: single-series lime OR the validated 5-color set, labels in ink tokens
- [ ] Looks right at 375px and desktop; no horizontal page scroll
