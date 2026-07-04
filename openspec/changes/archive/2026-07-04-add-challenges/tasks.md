## 1. Data layer (Dexie v4)

- [x] 1.1 Add `src/types/activity.ts` (`ActivityType`, `ManualActivity`)
- [x] 1.2 Add `src/types/challenge.ts` (`ChallengeMetric`, `ChallengeWindow`, `ChallengeDefinition`, `ChallengeStatus`, `AcceptedChallenge`)
- [x] 1.3 Bump `PersonalTrainerDB` to `version(4)` in `src/db/index.ts`, adding `manualActivities` and `acceptedChallenges` tables (additive, no data migration); declare the `Table<>` fields on the class
- [x] 1.4 Sanity-check the upgrade path from an existing v3 database (additive v4 repeats v3 stores unchanged — no migration needed); also extended per-user cleanup (`deleteUser`) and backup export/import (v2, back-compatible) to the new tables

## 2. Exercise-day derivation (shared)

- [x] 2.1 Extract a shared `exerciseDays(sessions, activities, window?)` util returning a `Set<YYYY-MM-DD>`, and a `longestStreak` reused from the achievement checker (`src/composables/useExerciseDays.ts`)
- [x] 2.2 Refactor `useAchievementChecker.ts` to consume the shared util (behavior-preserving)
- [x] 2.3 Unit-test dedup (session + activity same day = 1), activity-only day counts, and window filtering (`test/unit/exercise-days.test.ts`)

## 3. Activity log

- [x] 3.1 Add `src/stores/activities.ts` (load per-user, add, edit, delete) mirroring `stores/achievements.ts`
- [x] 3.2 Build the add/edit activity UI (`ActivityLogPage.vue`): date, type picker, optional distance (km for running/cycling/hiking, meters for swimming) and `durationMin`, note
- [x] 3.3 List + delete history for the current user
- [x] 3.4 On add/edit/delete, trigger `checkChallenges()` (from the activity page, mirroring how achievements are checked from pages)
- [x] 3.5 Unit-test the store (per-user isolation, CRUD) (`test/unit/activities-store.test.ts`)

## 4. Challenge catalog + store

- [x] 4.1 Author `src/data/challenges.json` starter catalog: 200 exercise days / year, 20 exercise days / month ("Mes activo"), 30-day streak, 500 kg / month, squat 100 kg (`single_lift_kg`), 50 km running / month (`activity_distance` + `activityType: running`), 12 sessions / 30 days
- [x] 4.2 Add `src/stores/challenges.ts`: load definitions + user's accepted records, `accept(challengeId, baseline)`, `abandon(id)`, selectors for active/history
- [x] 4.3 Implement window resolution at acceptance (calendar_year / calendar_month / rolling_days / fixed_from_accept) per the design table
- [x] 4.4 Enforce: single active acceptance per definition; baseline only when `allowsBaseline`; baseline fixed after acceptance (no edit path exposed)
- [x] 4.5 Unit-test acceptance + window resolution (incl. mid-year calendar_year) and baseline rules (`test/unit/challenges.test.ts`)

## 5. Progress + status checker

- [x] 5.1 Add `src/composables/useChallengeChecker.ts` computing `progress = baseline + metricSinceAcceptance(max(windowStart, acceptedAt), windowEnd)` per metric (see design table), including `single_lift_kg` (max set weight) and `activity_distance` (type-filtered sum, meters normalized to km)
- [x] 5.2 Resolve status: `completed` when `progress >= target`; `failed` when `windowEnd` past and below target; persist `resolvedAt`
- [x] 5.3 Return newly completed challenges for a celebratory toast
- [x] 5.4 Wire triggers: `SessionCompletePage.vue` (alongside `checkAchievements`), activity page mutations, and `onMounted` of Dashboard + Challenges pages (resolves silent deadlines)
- [x] 5.5 Unit-test: baseline+events, no double count of pre-acceptance events, `countsExternal=false` ignores activities, deadline-past failure, single-lift max (`test/unit/challenges.test.ts`)

## 6. UI surfaces

- [x] 6.1 Add a "Retos" tile (and "Actividad" tile) to the `DashboardPage.vue` quick-access grid → `/challenges`, `/activity`
- [x] 6.2 Render active accepted challenges as progress cards on the dashboard (name, current/target, time remaining), sorted by nearest `windowEnd`
- [x] 6.3 Build `src/pages/ChallengesPage.vue`: Catálogo (accept + baseline input), Activos, Historial
- [x] 6.4 Add routes for `/challenges` (and activity log) in `src/router/index.ts`
- [x] 6.5 Empty states: no active challenges on Home (cards hidden, tile still available); empty history section hidden

## 7. Tie-in with achievements

- [x] 7.1 On challenge completion, unlock achievements — both generic count-based (`challenges_completed`: 1/5/10 challenges) and challenge-specific (`challenge_specific` for the 200-day, 30-day streak, and squat-100kg challenges). New condition types in `useAchievementChecker` reading `acceptedChallenges` with `status='completed'`; triggered after `checkChallenges()` at every wiring site (session complete, activity log, challenges page, dashboard); covered by `test/unit/challenge-achievements.test.ts`

## 8. Validation

- [x] 8.1 Run `openspec validate add-challenges --strict` — valid
- [x] 8.2 Run `vitest`; confirm exercise-day, activity store, challenge acceptance, and progress/status tests pass — 92 pass (incl. new exercise-days, activities-store, challenges suites); vue-tsc clean on all new files; production build (`quasar build`) succeeds
- [x] 8.3 Manual end-to-end in the running app: verified by the user — accept a challenge, register a manual exercise day from the Retos page, and confirm progress updates. (Also added a "Registrar día de ejercicio" entry point on the challenges page for discoverability.)
