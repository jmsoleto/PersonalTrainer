## Context

The app (Quasar/Vue + TypeScript + Capacitor) generates training plans with Claude from a local catalog of ~273 exercises (`src/data/exercises.json`). Plans are stored in IndexedDB via `src/db`. During a session (`SessionPage.vue`) the user can already skip exercises (`session.ts:skipExercise`) but cannot replace one.

Two coupled problems, discovered during exploration:

1. **Vocabulary mismatch (latent bug).** The catalog stores `equipment`, `muscleGroups`, `primaryMuscle`, `category`, and `difficulty` in Spanish (`mancuernas`, `pecho`, `fuerza`, `principiante`), while the rest of the app uses the English enum values from `src/types/enums.ts`. The user profile (`user.equipment: Equipment[]`) and injury zones (`InjuryZone.muscleGroup: MuscleGroup`) are English. Consequently `filterByEquipment(user.equipment)` in `plan.ts` compares `['dumbbells']` against `['mancuernas']`, matches nothing, and drops all 121 equipment exercises before the AI sees them. The catalog also has duplicate equipment vocabulary (`banco`/`bench`, `banda_elástica`/`resistance_bands`, `pull_up_bar`/`barra_dominadas`).

2. **No swap capability.** The feature the user actually asked for depends on the very filter that is broken, so the cleanup is a prerequisite.

Constraints: alternatives must work offline (no AI call); the catalog is the source of truth for exercise metadata; swaps must persist into the stored plan.

## Goals / Non-Goals

**Goals:**
- Normalize the catalog to the canonical English enum vocabulary and remove duplicate equipment values, fixing the equipment-filter bug.
- Keep `ExerciseLibraryPage.vue` working (it hardcodes the Spanish values) by migrating it to the same canon in lockstep.
- Provide a local `findAlternatives` heuristic anchored on `primaryMuscle`, filtered by equipment + injuries, ranked by category/compound/difficulty.
- Add a "swap" action in the active session that persists the replacement into the plan for that specific week/day.

**Non-Goals:**
- Changing the user-facing display language. Spanish labels in the UI stay; only the stored/enum values become canonical (label maps translate for display, as `EQUIPMENT_LABELS` already does).
- Global "never show me this exercise again" or cross-plan exclusion. Out of scope; swap is per day/week.
- Capturing or acting on the *reason* for a swap (user confirmed it does not matter).
- AI-assisted alternative selection or AI re-generation of the plan on swap.
- "Swap for today only" (transient) semantics — the user chose persistent swaps.

## Decisions

### Decision 1: Canon = English enum values in the catalog
Normalize the catalog rather than translating enums/UI to Spanish. Rationale: the enums, user profile, injury zones, `EQUIPMENT_LABELS`, and `filterBy*` functions already speak English; the catalog is the sole outlier. Aligning muscle values also fixes AI injury avoidance (injuries are already English). Alternative considered: canon = Spanish everywhere — rejected, far larger blast radius (enums, user stored data, injuries, all filters).

Full mapping:
- equipment: `mancuernas→dumbbells`, `barra→barbell`, `banco|bench→bench`, `banda_elástica|resistance_bands→resistance_bands`, `pull_up_bar|barra_dominadas→pull_up_bar`, `kettlebell→kettlebell`, `yoga_mat→yoga_mat`.
- muscle: `pecho→chest`, `espalda→back`, `hombros→shoulders`, `bíceps→biceps`, `tríceps→triceps`, `antebrazos→forearms`, `core→core`, `cuádriceps→quads`, `isquiotibiales→hamstrings`, `glúteos→glutes`, `gemelos→calves`, `cuerpo_completo→full_body`.
- category: `fuerza→strength`, `flexibilidad→flexibility`, `pliométrico→plyometric`, `equilibrio→balance`, `cardio→cardio`, `warmup→warmup`, `cooldown→cooldown`.
- difficulty: `principiante→beginner`, `intermedio→intermediate`, `avanzado→advanced`.

### Decision 2: Normalize via a script, verify against the enums
Apply the mapping with a one-off transform (Node/Python over the JSON) rather than by hand across 273 rows. After transforming, assert that every `equipment`/`primaryMuscle`/`muscleGroups`/`category`/`difficulty` value is a member of the corresponding enum; fail loudly on any unmapped value so no Spanish residue slips through. Keep the mapping table in the task notes for auditability.

### Decision 3: `ExerciseLibraryPage.vue` migrates in the same change
The page hardcodes Spanish filter values, difficulty label/class maps, and category icon keys. These must switch to the English canon simultaneously or the library filters silently return nothing. Treat it as part of the normalization task, not a follow-up. Display labels remain Spanish via label maps keyed by the canonical value.

### Decision 4: `findAlternatives` as a pure function in the exercises store
Place it next to `filterByEquipment`/`filterByMuscle` in `stores/exercises.ts` (or a small helper module it delegates to). Signature roughly: `findAlternatives(exerciseId, { equipment, injuries }): Exercise[]`.
Algorithm:
1. Look up the source exercise; take its `primaryMuscle` as the hard anchor.
2. Candidates = catalog with same `primaryMuscle`, excluding the source id.
3. Hard filters: `equipment ⊆ user equipment` (reuse `filterByEquipment` logic); drop candidates whose `muscleGroups` intersect an injured zone.
4. Score/rank by: same `category` (+), same `isCompound` (+), `|difficultyRank(candidate) − difficultyRank(source)|` (−). Return top N (e.g. 4–5).
Pure and synchronous; trivially unit-testable (mirrors the existing `test/unit/stores.test.ts` style).

### Decision 5: Swap rewrites the plan, then reloads the session from it
Persisting the swap is the source of truth; the active session is derived from the plan. Flow:
1. User picks an alternative in a swap dialog on `SessionPage.vue`.
2. Build a new `PlannedExercise`: `exerciseId`/`exerciseName` from the alternative, `sets`/`reps`/`restSeconds`/`targetWeightKg` inherited from the original; adapt modality only when needed (rep-based ↔ `durationSeconds`).
3. Update the `TrainingPlan` in IndexedDB at `weeks[N].days[M].session.mainWorkout[i]` and persist via `src/db` (add a `plan.ts` action, e.g. `swapPlannedExercise(planId, weekNumber, dayNumber, originalExerciseId, replacement)`).
4. Refresh the in-memory `currentSession` so the set-logging UI shows the new exercise. Since the session was started from the planned session, re-derive the affected entry (replace the matching `CompletedExercise` skeleton).
Rationale: matches the user's decision ("the swap is saved in the plan, that day, that week") and keeps a single source of truth. Alternative considered: mutate only `currentSession` and write the plan on completion — rejected, risks divergence if the session is abandoned.

## Risks / Trade-offs

- **Silent Spanish residue after normalization** → mitigate with the post-transform enum-membership assertion (Decision 2) and a unit test that scans the catalog.
- **`ExerciseLibraryPage.vue` drift** → the page and JSON must land together; covered by a scenario ("filtering by a muscle returns results"). Add a quick manual/e2e check of the library filters.
- **Existing users' stored plans/measurements** unaffected — the normalization only touches the static catalog and the profile already stores English enums. No data migration of user records needed.
- **Modality mismatch on swap** (e.g. plank `durationSeconds` → crunch `reps`) → the alternative defines its own format; inherit volume approximately, don't force reps onto a timed exercise.
- **Sparse alternatives for rare muscles/equipment** (e.g. `forearms` with limited gear) → `findAlternatives` may return few or none; UI must handle the empty case gracefully (spec'd).
- **In-progress session swap** (sets already logged on the original) → define behavior: replacing resets that exercise's logged sets to the new prescription. Acceptable; the user is explicitly changing the movement.

## Migration Plan

1. Land catalog normalization + `ExerciseLibraryPage.vue` together (Fase 0). Verify: equipment filter now yields equipment exercises; library filters work; catalog passes enum-membership assertion.
2. Add `findAlternatives` + unit tests.
3. Add swap UI + `plan.ts` persistence action + session refresh (Fase 1).
No rollback data concern: normalization is a static-asset edit; revert by reverting the commit. No user-record migration.

## Open Questions

- N for alternatives (default 4–5) — tune after seeing real distributions per muscle/equipment.
- Exact modality-inheritance rule when swapping between rep-based and time-based exercises — settle during implementation of `findAlternatives`/swap.
