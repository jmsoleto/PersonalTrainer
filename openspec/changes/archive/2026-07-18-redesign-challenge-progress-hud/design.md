# Design — Retos épicos: HUD de Impacto

Presentation-only redesign of challenge progress. This document records how the PRD's design intent maps onto the **actual** codebase, and resolves the mismatches found while grounding the PRD.

## Context

- Progress data comes from `getActiveProgress()` in `src/composables/useChallengeChecker.ts` (an async function, **not** a store getter as the PRD phrasing "expone `getActiveProgress()`" might suggest). It returns `ChallengeProgress[]` = `{ accepted, def, current, raw, target, ratio }`, sorted by nearest `windowEnd`.
- Both pages already hold the result in a ref: `activeProgress` in `ChallengesPage.vue`, `activeChallenges` in `DashboardPage.vue`.
- Current markup: `.db-challenge-card` (Dashboard, `DashboardPage.vue:181`) and `.ch-active-card` (`ChallengesPage.vue:22`). Both render a thin `height: 6–8px` bar.

## Data flow (unchanged)

```
completedSessions ┐
manualActivities  ┼─► computeProgressSinceAcceptance ─► getActiveProgress()
baseline          ┘                                          │
                                                             ▼
                                    ChallengeProgress[] { current, target, ratio,
                                                          def, accepted.windowEnd }
                                                             │
                       ┌─────────────────────────────────────┼────────────────────────┐
                       ▼                                     ▼                          ▼
              Dashboard "Mis retos"          Challenges "hero" (max ratio)   Challenges "En curso"
              (HUD card per challenge)        (single featured card)          (HUD card per challenge)
```

The redesign only re-renders the boxed outputs. No new query, store field, or checker path.

## Decisions

### 1. Where the shared helpers live
`remainingLabel` (`ChallengesPage.vue:195`) and `challengeRemaining` (`DashboardPage.vue:281`) are **byte-identical** day-math duplicates. Extract the numeric core once:

```ts
// src/composables/useChallengeChecker.ts (additive, pure)
export function daysRemaining(windowEnd: string): number {
  const end = new Date(windowEnd + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - now.getTime()) / 86_400_000)
}
export function isUrgent(days: number, ratio: number): boolean {
  return days <= 3 || ratio >= 0.85
}
```

Both pages keep their own **label** function (the `< 0 → "Finalizado"`, `0 → "Último día"`, `1 → "Queda 1 día"`, `n → "Quedan n días"` formatting) but derive `days` from the shared helper. `useChallengeChecker.ts` is the natural home — both pages already import from it. **Chosen over** a new `src/utils/` file to avoid introducing a new module for two tiny functions.

### 2. Hero selection = max ratio, tie-break by nearest deadline
`getActiveProgress()` already returns the array sorted by nearest `windowEnd`. The hero is `activeProgress.reduce((best, p) => p.ratio > best.ratio ? p : best)`. Because the source array is deadline-sorted, an explicit `>` (strict) comparison keeps the earliest-deadline challenge on ties — a sensible "most urgent among the most-complete" tiebreak. Rendered only when `activeProgress.length > 0`.

**The hero challenge is excluded from the "En curso" list** (via a `restActive` computed that filters it out by `accepted.id`) so it is not shown twice — once as the hero and again as a card. This surfaced during QA with 5 active challenges. When only one challenge is active it becomes the hero and "En curso" is empty (label hidden).

### 3. Urgency orange — literal vs token
The PRD introduces `#ff8a65` (urgency text/icon) and `rgba(255,138,101,0.18)` (chip bg), acknowledged as the one genuinely new color. **Decision: add two tokens** to `src/css/app.scss` rather than scatter literals across two SFCs:

```
--k-urgent:        #ff8a65;
--k-urgent-bg:     rgba(255, 138, 101, 0.18);
```

Rationale: the value appears in ≥3 places (Dashboard chip, hero chip, "En curso" chip) across two files; a token keeps it single-sourced and consistent with the existing `--k-*` system. This is the **only** token addition.

### 4. Bar fill gradient — reuse `--k-gradient-cta`, don't invent a new CTA gradient
The PRD text says fill = `linear-gradient(90deg, #FF562C, #ff8a65)`, but the existing token is `--k-gradient-cta: linear-gradient(135deg, #ffb4a2, #FF562C)`. **Decision: use `--k-gradient-cta` as-is** for the standard fill (honoring the PRD's own token table, which maps "Relleno de barra (CTA)" → `--k-gradient-cta`). The prose `90deg/#ff8a65` variant is treated as illustrative, not authoritative — the token table wins. For **streak challenges** (`metric === 'streak_days'`) use the PRD's streak gradient `linear-gradient(90deg, #ffb4a2, #ffd166)` (a local value, tied to the `#ffd166` streak/fire color already used in history icons at `ChallengesPage.vue:317`).

### 5. Secondary text token
The PRD maps "texto secundario `#8a8a8a`" to `--k-on-surface-variant or similar`, but in this codebase `--k-on-surface-variant` is `#e8bdb3` (a coral), and these cards already use **`--k-secondary` (`#c1c7cf`)** for secondary text (`.ch-active-remaining`, `.db-challenge-remaining`). **Decision: keep `--k-secondary`** for the `/ target` denominator and remaining text — do not introduce a `#8a8a8a` literal. Matches existing card styling and avoids a new gray.

### 6. Milestone marks + shimmer structure
Bar = positioned container (`--k-surface-high` bg) → fill (`width: ratio*100%`, gradient) → shimmer strip inside the fill (`overflow: hidden` on fill) → 3 absolutely-positioned 1px milestone lines at 25/50/75% over the fill (`z-index: 2`). Milestones sit on the **bar**, not the fill, so they stay fixed as the fill grows.

```
┌───────────────────────────────────────────────┐  bar (surface-high)
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░│░░░░░░░│░░░░░░░│             │
│ fill (gradient) ▓ │       │       │  ← 25/50/75 milestone lines
│  ⤴ shimmer sweep  │                             │
└───────────────────────────────────────────────┘
```

### 7. Reduced motion
`shimmerSweep`, `urgentPulse`, `flicker` are scoped per SFC. Each SFC wraps them:
```css
@media (prefers-reduced-motion: reduce) {
  .hud-shimmer, .hud-chip, .hud-fire { animation: none; }
}
```
Static fallback: shimmer hidden/parked, chip at full opacity, fire icon at rest. The chip stays legible without motion (icon + text carry the meaning).

## Risks / notes

- **Cosmetic-only**: no unit test exercises these views, so acceptance is manual QA (0 / 1 / 3+ active challenges, near-expiry, streak type) plus `vue-tsc` + `vitest` green. The two new pure helpers get unit tests — cheap and stable.
- **Keyframes duplicated across two SFCs** (scoped styles can't be shared without a global stylesheet). Accepted: the PRD explicitly says scoped keyframes per SFC; duplication is ~15 lines and keeps each page self-contained.
- The hero's giant 64px number and the 44px Dashboard number rely on `--k-font-headline` (Space Grotesk) already loaded — no new font.
