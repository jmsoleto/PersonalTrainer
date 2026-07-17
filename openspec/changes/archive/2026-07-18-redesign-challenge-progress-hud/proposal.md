## Why

Challenges already work end-to-end (catalog, acceptance with baseline, live progress, deadline resolution — see `openspec/specs/challenges/spec.md`), but the progress is rendered with a thin, flat bar (6–8px) and small text on both the Home dashboard and the challenges page. The goal here is **purely presentational**: make progress feel dramatic and achievement-like — a giant `current / target` number, a thick progress bar with an animated shimmer and milestone marks at 25/50/75%, and a pulsing **urgency chip** when little time remains. No data, store, metric, window, or checker logic changes.

The underlying data is already available: `getActiveProgress()` (in `useChallengeChecker.ts`) returns `{ accepted, def, current, target, ratio }` per active challenge, sorted by nearest deadline. The redesign consumes exactly this — the only new computation is two pure, derived helpers (`daysRemaining`, `isUrgent`).

## What Changes

- **Redesign the active-challenge cards on Home** (`DashboardPage.vue`, `.db-challenge-card`): replace the icon + thin bar with a vertical HUD card — challenge name (+ animated fire icon for `streak_days`), an urgency chip when applicable, a giant `current / target` number, and a thick progress bar with milestone marks and an animated shimmer.
- **Redesign the "En curso" cards on the challenges page** (`ChallengesPage.vue`, `.ch-active-card`) with the same HUD treatment. The existing "Abandonar" button keeps its position and behavior.
- **Add a "hero" panel to the challenges page** — a new block between the header and the "Registrar día de ejercicio" button, shown only when there is ≥1 active challenge, featuring the active challenge with the **highest `ratio`** (closest to its target): an overline label, a 64px number, the thick milestone bar, "% completado", and the urgency chip when applicable.
- **Add a pulsing urgency chip** shown on Home, hero, and "En curso" cards when `daysRemaining ≤ 3 || ratio ≥ 0.85`. It does not rely on color alone: `bolt` icon + "Quedan N días" text.
- **Extract two shared pure helpers** into `useChallengeChecker.ts`: `daysRemaining(windowEnd)` (de-duplicating the byte-identical `remainingLabel`/`challengeRemaining` day math already in both pages) and `isUrgent(daysRemaining, ratio)`.
- **Respect `prefers-reduced-motion: reduce`** for the three new animations (`shimmerSweep`, `urgentPulse`, `flicker`).

## Capabilities

### Modified Capabilities
- `challenges`: The progress presentation for active challenges (on Home and on the challenges page) is upgraded to a high-impact "HUD" treatment and gains a time-urgency indicator and a featured/hero panel. No change to progress computation, status lifecycle, checker triggers, catalog, or acceptance.

## Impact

- **No changes** to `stores/challenges.ts`, `useChallengeChecker.ts` *computation* (only two additive pure helpers), `types/challenge.ts`, `challenges.json`, or the Dexie schema.
- **`useChallengeChecker.ts`**: add exported pure helpers `daysRemaining(windowEnd: string): number` and `isUrgent(daysRemaining: number, ratio: number): boolean`.
- **`DashboardPage.vue`**: replace `.db-challenge-card` markup + scoped styles; `challengeRemaining` re-expressed via the shared `daysRemaining` helper; add `shimmerSweep`/`urgentPulse`/`flicker` scoped keyframes.
- **`ChallengesPage.vue`**: replace `.ch-active-card` markup + scoped styles; add the conditional hero block and its highest-ratio selection (a derived `computed`, no new data call); `remainingLabel` re-expressed via the shared helper; add the same scoped keyframes.
- **Design tokens**: reuse existing `--k-*` tokens in `src/css/app.scss`. One genuinely new value — the urgency orange `#ff8a65` and its `rgba(255,138,101,0.18)` chip background — is introduced (see design.md for whether it becomes a token). The streak-bar gradient uses `#ffb4a2 → #ffd166`.
- **Assets/deps**: none added. Only Material Symbols already in the project (`bolt`, `local_fire_department`, plus each `def.icon`).
- **Tests**: no existing test touches these views; `vitest` and `vue-tsc` stay green. New pure helpers (`daysRemaining`, `isUrgent`) are unit-testable and get coverage.
