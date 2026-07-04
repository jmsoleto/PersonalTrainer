## Why

The app already rewards users after the fact with **achievements** (`achievements.json` + `useAchievementChecker`), but they are automatic, timeless, and binary. Users have no way to *commit* to a concrete, time-boxed goal ("train 200 days this year", "lift 500 kg this month") and watch their progress toward it.

Two things are missing to make that possible:

1. **A way to count exercise that happens outside the app.** Today the only signal of "I trained" is a `CompletedSession` from the plan. Real users also hike, cycle, swim, and run, and those days should count. There is no place to record them.
2. **Stateful, user-accepted goals with a deadline, a progress bar, and a starting point.** A user who joins mid-year having already trained 60 days needs to declare that baseline so a "200 days/year" goal is meaningful.

## What Changes

- **Add a manual activity log** — a new per-user `manualActivities` table where the user records exercise done outside the plan (running, cycling, swimming, hiking, other) with an optional magnitude (distance in km and/or duration in minutes) and a note. This has standalone value and is the first building block for challenges.
- **Introduce the derived concept of an "exercise day"** — the distinct set of calendar dates on which the user either completed a plan session (`completedSessions`) **or** logged a manual activity. Two activities on the same day count as one exercise day.
- **Add challenges** — a declarative catalog (`challenges.json`, mirroring `achievements.json`) of time-boxed goals the user can **accept**. Each accepted challenge has a resolved time window, an optional **manual baseline** (the "I already have 60 done" starting point), computed progress, and a status lifecycle (`active → completed | failed | abandoned`).
- **Add a challenge checker** (`useChallengeChecker`, twin of `useAchievementChecker`) that recomputes progress and resolves status. It runs where achievements are already checked (on session completion and app/page mount) plus after a manual activity is logged, and it closes out challenges whose window has ended even if no event fired at the deadline.
- **Surface accepted challenges on the Home dashboard** as progress cards, and **add a "Retos" tile** to the Home quick-access grid that opens a new challenges page (catalog + active + history). The bottom navigation is unchanged (it is already full at 5 tabs).

## Capabilities

### New Capabilities
- `activity-log`: Users can record exercise done outside the plan (type, date, optional distance/duration, note), which contributes to the derived "exercise day" concept alongside completed plan sessions.
- `challenges`: Users can browse a catalog of time-boxed goals, accept one with an optional manual baseline, and track live progress on Home; the system resolves each challenge's window and marks it completed or failed at its deadline.

### Modified Capabilities
<!-- None: achievements has no existing spec in openspec/specs/; challenges is additive and does not alter achievement behavior. -->

## Impact

- **Data (Dexie)**: new schema **version 4** adding `manualActivities` and `acceptedChallenges` tables (per `userId`), following the existing versioned-migration pattern in `src/db/index.ts`. No changes to existing tables.
- **Data (catalog)**: new `src/data/challenges.json` static catalog.
- **Types**: new `src/types/activity.ts` and `src/types/challenge.ts`.
- **Stores**: new `src/stores/activities.ts` and `src/stores/challenges.ts` (mirroring `stores/achievements.ts`).
- **Logic**: new `src/composables/useChallengeChecker.ts`; reuses/extends the exercise-day and stats computation already prototyped in `useAchievementChecker.ts`.
- **UI**: new `src/pages/ChallengesPage.vue` and `src/pages/ActivityLogPage.vue` (or an activity dialog); a "Retos" tile in `DashboardPage.vue` quick-access grid; accepted-challenge progress cards on the dashboard; routes in `src/router/index.ts`.
- **Tie-in**: completing a challenge MAY unlock a related achievement (optional, decided in design).
- **No external dependencies added.** All computation is local/offline; no AI or network call.
