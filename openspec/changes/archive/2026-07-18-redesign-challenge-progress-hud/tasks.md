## 1. Shared helpers (pure, additive)

- [x] 1.1 Add exported `daysRemaining(windowEnd: string): number` to `src/composables/useChallengeChecker.ts` (extract the day math duplicated in `remainingLabel`/`challengeRemaining`)
- [x] 1.2 Add exported `isUrgent(days: number, ratio: number): boolean` (`days <= 3 || ratio >= 0.85`) to the same file
- [x] 1.3 Re-express `remainingLabel` (`ChallengesPage.vue`) and `challengeRemaining` (`DashboardPage.vue`) in terms of `daysRemaining` — behavior-preserving, same strings
- [x] 1.4 Unit-test `daysRemaining` (past/today/1-day/N-day) and `isUrgent` (both thresholds, boundaries `days=3`, `ratio=0.85`) in `test/unit/`

## 2. Design tokens

- [x] 2.1 Add `--k-urgent: #ff8a65;` and `--k-urgent-bg: rgba(255,138,101,0.18);` to `src/css/app.scss` (the only new tokens)

## 3. Shared HUD visual pieces (per SFC, scoped)

- [x] 3.1 Thick progress bar: container (`--k-surface-high`, radius = half height), fill (`width: ratio*100%`, `--k-gradient-cta`; streak → `linear-gradient(90deg,#ffb4a2,#ffd166)`), inner shimmer strip, 3 milestone lines at 25/50/75% over the fill
- [x] 3.2 `@keyframes shimmerSweep` (2.2–2.6s linear infinite) and the shimmer element
- [x] 3.3 Urgency chip: `bolt` icon + "Quedan N días", `--k-urgent` on `--k-urgent-bg`, `@keyframes urgentPulse` (opacity 1↔0.55, 1.6s)
- [x] 3.4 Animated fire for streak: `local_fire_department` in `#ffd166`, `@keyframes flicker` (subtle scale/rotate, ~1.8s)
- [x] 3.5 `@media (prefers-reduced-motion: reduce)` block disabling shimmer/pulse/flicker in each SFC

## 4. Dashboard — "Mis retos" (`DashboardPage.vue`)

- [x] 4.1 Replace `.db-challenge-card` markup: name (+ fire if `streak_days`) + urgency chip in header, giant `current / target` number (~44px), thick milestone bar with shimmer
- [x] 4.2 Show urgency chip when `isUrgent(daysRemaining(p.accepted.windowEnd), p.ratio)`
- [x] 4.3 Replace/extend scoped styles; keep the `router-link` to `/challenges` and nearest-deadline order

## 5. Challenges page — hero (`ChallengesPage.vue`)

- [x] 5.1 Add a `computed` selecting the highest-`ratio` active challenge (strict `>` reduce over `activeProgress`; tie-break = nearest deadline via source order)
- [x] 5.2 Render the hero block between header and "Registrar día de ejercicio", only when `activeProgress.length > 0`: overline label, ~64px `current / target`, thick milestone bar, "% completado", urgency chip when urgent

## 6. Challenges page — "En curso" cards (`ChallengesPage.vue`)

- [x] 6.1 Replace `.ch-active-card` markup with the same HUD treatment (giant number + thick milestone bar/shimmer + conditional urgency chip); no hero styling on these
- [x] 6.2 Keep the "Abandonar" button in its current position and behavior

## 7. Verification

- [x] 7.1 `vue-tsc` clean, `vitest run` green (incl. new helper tests)
- [x] 7.2 Manual QA: 0 / 1 / 3+ active challenges; a challenge with `daysRemaining ≤ 3`; a challenge with `ratio ≥ 0.85`; a `streak_days` challenge shows the fire; hero picks the highest ratio
- [x] 7.3 Verify reduced-motion (system setting on) disables all three animations while keeping values/chip/fire visible
- [x] 7.4 Confirm no regression in Catálogo / Historial / accept dialog
