## Why

Sometimes the AI-generated plan includes an exercise the user can't or doesn't want to do at that moment (no equipment, discomfort, preference). Today the only escape is skipping it, which leaves a hole in the session. Users need to swap an exercise for a similar one and keep the plan intact.

While investigating, we found a latent bug that blocks this: the exercise catalog (`src/data/exercises.json`) uses Spanish values for `equipment`, `muscleGroups`, `primaryMuscle`, `category`, and `difficulty`, but the rest of the app (enums, user profile, filters, injury zones) uses the English enum values. As a result `filterByEquipment()` silently drops every equipment-based exercise before the AI sees it — users with dumbbells/barbell/bench currently get bodyweight-only plans. The catalog also contains duplicate equipment vocabulary (`banco`/`bench`, `banda_elástica`/`resistance_bands`, `pull_up_bar`/`barra_dominadas`). This must be fixed first, because the same filter is the foundation of finding valid alternatives.

## What Changes

- **Normalize the exercise catalog to the English enum vocabulary** (`equipment`, `muscleGroups`, `primaryMuscle`, `category`, `difficulty`), deduplicating the three equipment synonym pairs. This fixes the equipment-filter bug and improves AI injury avoidance.
- **BREAKING (internal)**: `ExerciseLibraryPage.vue` hardcodes the Spanish values (filter buttons, difficulty labels/classes, category icons) and must be updated to the English canon in the same change, or its filters break.
- **Add exercise alternatives**: a local, offline heuristic (`findAlternatives`) that, given a planned exercise, returns similar exercises anchored on `primaryMuscle`, filtered by the user's available equipment and injuries, and ranked by category / compound / difficulty proximity.
- **Add a "swap" action** in the active session (`SessionPage.vue`), alongside info/skip, that lets the user replace an exercise with a suggested alternative.
- **Persist the swap** into the `TrainingPlan`: the swap rewrites the `PlannedExercise` for that specific day of that week in IndexedDB, inheriting the original sets/reps/rest prescription.

## Capabilities

### New Capabilities
- `exercise-catalog-normalization`: The exercise catalog stores equipment, muscle, category, and difficulty values using the canonical English enum vocabulary, with no duplicate/synonym values, so that equipment and muscle filters work correctly.
- `exercise-alternatives`: Users can replace a planned exercise with a similar one that fits their equipment and injuries; the replacement is persisted into the plan for that day and week.

### Modified Capabilities
<!-- None: no existing specs in openspec/specs/. -->

## Impact

- **Data**: `src/data/exercises.json` — normalize ~273 rows across `equipment`, `muscleGroups`, `primaryMuscle`, `category`, `difficulty`.
- **Code (fix)**: `src/pages/ExerciseLibraryPage.vue` — filter values, label maps, `difficultyClass`, category icon map updated to English canon. `src/stores/exercises.ts` — `filterByEquipment`/`filterByMuscle` become functional (no code change required, but now exercised).
- **Code (feature)**: new `findAlternatives` helper (exercises store or dedicated module); `src/pages/SessionPage.vue` swap UI; `src/stores/plan.ts` (and/or `session.ts`) to persist the swapped `PlannedExercise` into the stored plan via `src/db`.
- **AI**: unblocking the equipment filter means the phase generator now receives equipment exercises; the normalized muscle vocabulary aligns with `InjuryZone.muscleGroup` (English), improving injury avoidance.
- **No external dependencies added.** Alternatives are computed locally; no AI call.
