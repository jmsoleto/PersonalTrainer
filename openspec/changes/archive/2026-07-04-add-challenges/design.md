# Design — Challenges & Activity Log

## Context

The app is Quasar/Vue 3 + Pinia + Dexie (IndexedDB), fully offline, per-user. It already has an **achievements** subsystem that is the structural template for challenges:

- `src/data/achievements.json` — static declarative definitions.
- `src/stores/achievements.ts` — loads definitions, tracks unlocked records, persists to Dexie.
- `src/composables/useAchievementChecker.ts` — pulls the user's `completedSessions`, computes stats (`totalSessions`, `totalReps`, `totalWeight`, `maxStreak`, `weeksCompleted`) and unlocks definitions whose threshold is met. Invoked from `SessionCompletePage.vue` and `MeasurementsPage.vue`.

Challenges reuse this shape but add four things achievements lack: **user acceptance**, a **time window**, **stateful progress with a baseline**, and **external-activity counting**.

## Goals / Non-goals

**Goals**
- A manual activity log with per-type magnitude, useful on its own and as a challenge input.
- A derived "exercise day" concept unifying plan sessions and manual activities, deduped by date.
- Declarative, data-driven challenge catalog with per-challenge time windows and baselines.
- Progress + status lifecycle resolved by a checker that also handles silent deadlines.

**Non-goals**
- No social/leaderboard/multiplayer challenges.
- No push notifications or background jobs (resolution happens on app open / relevant events).
- No AI or network calls; everything is computed locally.
- No retroactive scan of pre-acceptance history — the manual baseline replaces it (see below).

## Data model (Dexie v4)

Bump `PersonalTrainerDB` to `version(4)`, adding two tables. No changes to existing tables, so the upgrade is additive (no data migration needed).

```
this.version(4).stores({
  // ...existing v3 tables unchanged...
  manualActivities:   '++id, userId, date, type',
  acceptedChallenges: '++id, userId, challengeId, [challengeId+userId], status, windowEnd',
})
```

### `manualActivities` — `src/types/activity.ts`
```
type ActivityType = 'running' | 'cycling' | 'swimming' | 'hiking' | 'other'

interface ManualActivity {
  id?: number
  userId: string
  date: string        // YYYY-MM-DD (local calendar day)
  type: ActivityType
  distanceKm?: number    // running / cycling / hiking — entered and stored in km
  distanceM?: number     // swimming — entered and stored in meters
  durationMin?: number
  note?: string
  createdAt: string   // ISO
}
```

### `acceptedChallenges` — `src/types/challenge.ts`
```
type ChallengeMetric =
  | 'exercise_days' | 'sessions' | 'total_reps' | 'total_weight'
  | 'streak_days'   | 'single_lift_kg' | 'activity_distance'

type ChallengeWindowType =
  | 'calendar_year' | 'calendar_month' | 'rolling_days' | 'fixed_from_accept'

interface ChallengeWindow {
  type: ChallengeWindowType
  lengthDays?: number   // for rolling_days / fixed_from_accept
}

interface ChallengeDefinition {   // challenges.json
  id: string
  name: string
  description: string
  icon: string
  category: 'frequency' | 'volume' | 'strength' | 'endurance' | 'consistency'
  metric: ChallengeMetric
  target: number
  window: ChallengeWindow
  allowsBaseline: boolean
  countsExternal: boolean
  activityType?: ActivityType   // filter for activity_distance (e.g. running only)
}

type ChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned'

interface AcceptedChallenge {   // Dexie
  id?: number
  challengeId: string
  userId: string
  acceptedAt: string   // ISO
  windowStart: string  // YYYY-MM-DD (resolved at acceptance)
  windowEnd: string    // YYYY-MM-DD
  baseline: number     // 0 unless allowsBaseline
  status: ChallengeStatus
  resolvedAt?: string  // when it became completed/failed/abandoned
}
```

## Key derivation: "exercise day"

Central helper (extracted so both the checker and the activity store can use it):

```
exerciseDays(sessions, activities, [start, end]) -> Set<YYYY-MM-DD>
  = distinct(
      sessions.map(s => s.completedAt.slice(0,10)),
      activities.map(a => a.date),
    ).filter(d => start <= d <= end)
```

`useAchievementChecker` already derives session dates this way for its streak calc; factor that logic into a shared module (`src/composables/useExerciseDays.ts` or a plain util) and have both checkers consume it.

## Window resolution (at acceptance)

| window.type        | windowStart                    | windowEnd                         |
|--------------------|--------------------------------|-----------------------------------|
| `calendar_year`    | Jan 1 of accept year           | Dec 31 of accept year             |
| `calendar_month`   | 1st of accept month            | last day of accept month          |
| `rolling_days`     | acceptedAt date                | acceptedAt + lengthDays           |
| `fixed_from_accept`| acceptedAt date                | acceptedAt + lengthDays           |

`rolling_days` vs `fixed_from_accept` are computed identically today; they are kept distinct so future semantics (e.g. auto-renewing rolling windows) can diverge without a data migration.

## Progress & baseline semantics

**Decision: the manual baseline REPLACES pre-acceptance history; automatic counting starts at the acceptance date.**

```
progress = baseline + metricSinceAcceptance(windowStart' = max(windowStart, acceptedAt), windowEnd)
```

Rationale: avoids double counting and avoids scanning historical data. For a user accepting "200 days/year" on March 1 with baseline 60, the 60 stands in for Jan–Feb, and the app only counts exercise days from March 1 onward. Events strictly before `acceptedAt` never add on top of the baseline.

Per-metric computation (all restricted to `[max(windowStart, acceptedAt), windowEnd]`):

| metric            | computation                                                             |
|-------------------|-------------------------------------------------------------------------|
| `exercise_days`   | `exerciseDays(...).size`                                                 |
| `sessions`        | count of `completedSessions` in window                                  |
| `total_reps`      | sum of completed set reps                                               |
| `total_weight`    | sum of `reps * weightKg` over completed sets                            |
| `streak_days`     | longest consecutive-day run of exercise days (reuse `computeStreak`)     |
| `single_lift_kg`  | **max** single `CompletedSet.weightKg` (not accumulated)                 |
| `activity_distance`| sum of `distanceKm` over manual activities (filtered by `activityType`) |

`countsExternal = false` metrics ignore `manualActivities`. `single_lift_kg` is a new computation not present in the achievement checker.

## Checker: `useChallengeChecker.ts`

Mirrors `useAchievementChecker`. Signature `checkChallenges(): Promise<...>`:
1. Load the user's active `acceptedChallenges`, `completedSessions` (via user plans, as the achievement checker does), and `manualActivities`.
2. For each active challenge: resolve `progress`.
   - If `progress >= target` → set `completed`, `resolvedAt = now`.
   - Else if `windowEnd < today` → set `failed`, `resolvedAt = now`.
3. Persist status changes; return newly completed challenges (for a celebratory toast, like achievements).

**Trigger points** (reuse existing wiring):
- `SessionCompletePage.vue` — already calls `checkAchievements()`; add `checkChallenges()` alongside.
- After create/edit/delete in the activity store.
- On mount of `DashboardPage.vue` and `ChallengesPage.vue` — this is what resolves silent deadlines (a year-end failure with no user event).

## UI

- **Quick-access tile** "Retos" in `DashboardPage.vue` grid (alongside Medidas/Logros/Ejercicios/Stats) → `/challenges`. Bottom nav untouched (already 5 tabs).
- **Home cards**: active challenges rendered as progress cards (name, `current / target`, time remaining). Default sort: nearest `windowEnd` first (surfaces urgency); revisit if it feels wrong.
- **`/challenges` (`ChallengesPage.vue`)**: tabs/sections for *Catálogo* (accept, with baseline input when `allowsBaseline`), *Activos*, *Historial* (completed/failed/abandoned).
- **Activity log**: `/activity` page or a dialog to add/edit/delete `manualActivities`, with type picker and optional km/min fields. Reachable from Home quick-access and/or the challenges page.

## Tie-in with achievements

Completing a challenge unlocks achievements, via two new achievement condition types (in `useAchievementChecker`, reading `acceptedChallenges` with `status='completed'`):

- `challenges_completed` (threshold) — generic count-based milestones: 1, 5, 10 challenges completed.
- `challenge_specific` (with `challengeId`) — a dedicated achievement per emblematic challenge (200-day year, 30-day streak, squat 100 kg).

Achievements are re-checked right after `checkChallenges()` at every wiring site (session complete, activity log, challenges page; quietly on dashboard mount). Ordering matters: challenges resolve to `completed` first, so the achievement pass sees them in the same interaction.

## Open questions (non-blocking)

- Initial catalog contents (starter list proposed in tasks).
- Swimming magnitude is entered and stored in meters (`distanceM`); running/cycling/hiking use km (`distanceKm`). `activity_distance` challenges normalize both to a common unit when summing.
- Home active-challenge ordering: nearest deadline vs highest progress — going with nearest deadline as default.
