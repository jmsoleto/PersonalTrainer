## 1. Catalog normalization (Fase 0 — blocking)

- [x] 1.1 Write the normalization mapping (equipment, muscle, category, difficulty → English enum values) as a reusable table
- [x] 1.2 Transform `src/data/exercises.json` with a one-off script applying the mapping to `equipment`, `primaryMuscle`, `muscleGroups`, `category`, `difficulty`
- [x] 1.3 Collapse the three equipment synonym pairs (`banco|bench→bench`, `banda_elástica|resistance_bands→resistance_bands`, `pull_up_bar|barra_dominadas→pull_up_bar`)
- [x] 1.4 Add an enum-membership assertion/unit test that scans the catalog and fails on any value not in `Equipment`/`MuscleGroup`/`ExerciseCategory`/`ExerciseDifficulty`
- [x] 1.5 Verify `filterByEquipment(user.equipment)` now returns equipment-based exercises (unit test in `test/unit/stores.test.ts` style)

## 2. Exercise library page migration (Fase 0 — blocking)

- [x] 2.1 Update `ExerciseLibraryPage.vue` muscle/category filter `value`s to the canonical English values (keep Spanish display labels)
- [x] 2.2 Update difficulty filter values, label map, and `difficultyClass` logic to key off `beginner`/`intermediate`/`advanced`
- [x] 2.3 Update the category icon map keys to canonical category values (`strength`, `flexibility`, `plyometric`, `balance`, ...)
- [x] 2.4 Manually verify each library filter (muscle, category, difficulty) returns matching exercises

## 3. Find alternatives (Fase 1)

- [x] 3.1 Implement `findAlternatives(exerciseId, { equipment, injuries })` in `stores/exercises.ts` (or a helper it delegates to): anchor on `primaryMuscle`, exclude source id
- [x] 3.2 Apply hard filters — `equipment ⊆ user equipment` and exclude candidates whose `muscleGroups` intersect an injured zone
- [x] 3.3 Rank candidates by same `category`, same `isCompound`, nearest `difficulty`; return top N (default 4–5)
- [x] 3.4 Unit-test `findAlternatives`: same-muscle, equipment-respecting, injury-respecting, ranking order, and empty-result cases

## 4. Swap during session (Fase 1)

- [x] 4.1 Add a "swap" control per main-workout exercise in `SessionPage.vue`, alongside info/skip
- [x] 4.2 Build a swap dialog listing alternatives from `findAlternatives` (empty-state handled gracefully)
- [x] 4.3 On selection, construct the replacement `PlannedExercise` inheriting sets/reps/rest/target weight, adapting modality (rep- vs time-based) where needed

## 5. Persist swap into the plan (Fase 1)

- [x] 5.1 Add a `plan.ts` action `swapPlannedExercise(sessionId, originalExerciseId, replacement)` that rewrites `weeks[N].days[M].session.mainWorkout[i]` and persists via `src/db` (keyed by sessionId, which uniquely identifies the week/day)
- [x] 5.2 Refresh the in-memory `currentSession` so the set-logging UI reflects the new exercise (reset that entry's logged sets to the new prescription) — `session.replaceExercise`
- [x] 5.3 Verify the swap persists: `plan-swap.test.ts` reloads the plan from IndexedDB and confirms the day/week shows the alternative, and other days/weeks are unchanged

## 6. Validation

- [x] 6.1 Run `openspec validate exercise-alternatives`
- [x] 6.2 Run unit tests (`vitest`) and confirm catalog assertion + alternatives + filter tests pass — 65 pass
- [ ] 6.3 Manual end-to-end in the running app: generate a plan with equipment selected, start a session, swap an exercise, confirm persistence (left for the user — needs a live AI-generated plan; persistence path is covered by `plan-swap.test.ts`)
