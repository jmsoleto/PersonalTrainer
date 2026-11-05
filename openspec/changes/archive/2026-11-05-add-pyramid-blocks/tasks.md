## 1. Types and generator

- [x] 1.1 Add `PyramidVariant`, the three param interfaces, `PyramidConfig` and `TemplateBlock.pyramid?` to `src/types/workout-template.ts`. Add `PlannedSet`, `PlannedExercise.setDetails?` and `PlannedExercise.technique?` to `src/types/plan.ts`. Verify that `vue-tsc --noEmit` shows no new errors.
- [x] 1.2 Implement `src/workout-editor/pyramid.ts`:
  - rounding helpers: 2.5 kg, integer reps, 5 s;
  - `generatePyramidSets` for linear, triangle and drop;
  - `defaultPyramidConfig(variant, mode, fromSets)`.
  
  Verify with a new `test/unit/workout-pyramid.test.ts` that covers every generation scenario in the pyramid-blocks spec: ascending 12×40…6×55, the 40→50 rounding, bodyweight 15→8, time 30→60, triangle 3 steps → 5 sets, drop 60 kg/2×20 % → 60/47.5/37.5 with rests 0/0/120, and straight → ascending defaults.

## 2. Validation and compiler

- [x] 2.1 Replace `straightOnly` in `validation.ts` with per-section rules: pyramids allowed in main only, supersets always rejected. Add the issue codes `pyramid_outside_main`, `pyramid_set_count`, `pyramid_missing_config`, `drop_requires_weight` and `drop_not_decreasing`. Verify with unit tests for each code, including the "5 kg with 3 drops of 10 %" rejection and the no-weight drop set.
- [x] 2.2 Update `compileBlocks` in `compiler.ts`. A pyramid becomes a `PlannedExercise` with summary fields taken from `sets[0]`, plus `setDetails` (one per set) and `technique`. Supersets keep throwing. Verify with a compiler test for the "Activating a pyramid" scenario, and confirm that the existing straight-block tests still pass unchanged.

## 3. Session runner

- [x] 3.1 Extract `buildSetSkeleton(planned)` in `session.ts` and use it in both `startSession` and `replaceExercise`. It uses `setDetails` when present. Verify with a unit test that a pyramid session starts with the per-set reps and weights, and that a plan without `setDetails` builds the same skeleton as before.
- [x] 3.2 Add `formatPlannedPrescription(planned)` to `labels.ts` and extend `formatPrescription(mode, sets, pyramid?)` for pyramids and drop sets. Use a comma decimal. Verify with unit tests for "12/10/8/6 reps · 40→55 kg", "30/45/60 s", "Drop set · 10/10/10 · 60→37,5 kg" and a straight block (output unchanged).
- [x] 3.3 Update `SessionPage.vue`:
  - the header uses `formatPlannedPrescription`;
  - the kg column shows when any set has a target weight;
  - drop-set rows with 0 s rest show "sin descanso";
  - `buildReplacement` copies `setDetails`/`technique` and removes per-set weights for non-weighted alternatives.
  
  Verify in the dev server with a pyramid and a drop set that the rows are pre-filled and the marks are shown.

## 4. Day editor

- [x] 4.1 Create `src/components/workout-editor/PyramidBlockEditor.vue` with:
  - the variant chooser;
  - the parameter fields for each variant;
  - the reps/time toggle (hidden for drop sets);
  - the editable set table with add and remove;
  - the "Ajustada a mano" chip and the "Regenerar" action.
  
  Invalid values must be rejected and the previous value kept. Verify in the dev server that every variant generates the sets shown in the spec.
- [x] 4.2 Integrate the editor into `DayEditorPage.vue`:
  - a block kind selector on main-workout rows only;
  - straight → pyramid conversion seeded from the current values;
  - pyramid → straight with a confirmation that keeps `sets[0]`;
  - a confirmation before regenerating a pyramid marked manual, and the parameter restored if the user cancels;
  - the variant label on the row.
  
  Verify in the dev server that a saved pyramid reopens with the same variant, params and sets, and that warm-up rows show no kind selector.

## 5. Presets

- [x] 5.1 Add "Fuerza en pirámide" and "Pirámide con mancuernas" to `src/data/workout-presets.json` (group `category`, no weights, no drop sets), using the catalog ids listed in design D7. Extend `test/unit/workout-presets.test.ts`:
  - every pyramid block's sets equal `generatePyramidSets(config)`;
  - no preset has a weight;
  - no preset has a drop set;
  - every id is in the catalog;
  - the barbell preset requires `barbell`.
- [x] 5.2 Update the `WorkoutPresetsPage.vue` preview to show the variant and the per-set values, for example "Triángulo · 12/10/8/10/12". Verify in the dev server, and confirm that duplicating the preset then entering a weight range in the editor regenerates the sets with those weights.

## 6. Verification

- [x] 6.1 Run the whole flow in the dev server at mobile size:
  - duplicate "Fuerza en pirámide";
  - add weights;
  - add a drop set to a curl;
  - build a 1-week plan and activate it;
  - run the session (rows pre-filled, "sin descanso" marks, swap an exercise for a bodyweight alternative) and complete it;
  - confirm that the `CompletedSession` has one set row per stage.
- [x] 6.2 Final checks:
  - `npx vitest run` passes;
  - `vue-tsc --noEmit` shows only the 3 errors that were already there;
  - `openspec validate add-pyramid-blocks --strict` passes.
