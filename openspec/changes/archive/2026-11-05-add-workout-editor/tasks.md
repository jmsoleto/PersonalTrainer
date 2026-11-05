## 1. Types and storage

- [x] 1.1 Create `src/types/workout-template.ts` with `BlockKind`, `ExerciseMode`, `SetSpec`, `BlockItem`, `TemplateBlock`, `DayTemplate`, `WeekSlot`, `WeekTemplate`, `PlanTemplate`, `DayPreset` and `WeekPreset` (design D2/D7). Re-export from `src/types/index.ts`. Verify with `npx vue-tsc --noEmit`.
- [x] 1.2 Add optional `source?: 'ai' | 'import' | 'custom'` and `planTemplateId?: string` to `TrainingPlan`. Set `source: 'ai'` in `generatePlan` and `source: 'import'` in `importExternalPlan`. Verify the type check passes and `test/unit/stores.test.ts` still passes.
- [x] 1.3 Add Dexie schema v5 with `dayTemplates`, `weekTemplates` and `planTemplates` (`'id, userId, updatedAt'`) in `src/db/index.ts`. Verify with a unit test that opens the DB (fake-indexeddb) and writes and reads one record per table.

## 2. Compiler (template → TrainingPlan)

- [x] 2.1 Implement `src/workout-editor/validation.ts`: validate a day (non-empty name, at least one main item, known exercise ids, positive values), a week (7 slots, at least 1 training slot, existing day refs) and a plan (1–52 weeks, existing week refs). It returns typed errors with the offending template id. Verify with unit tests covering each error case from the `workout-templates` spec.
- [x] 2.2 Implement `src/workout-editor/duration.ts` with the estimate rule (reps × 3 s, or `durationSeconds`, plus rests). Verify with unit tests.
- [x] 2.3 Implement `compilePlanTemplate()` in `src/workout-editor/compiler.ts` following the mapping table in design D3: dayNumber Mon=1, unique session ids per occurrence, names resolved from the catalog, straight → `PlannedExercise`, a typed error for non-straight blocks, and `source: 'custom'`. Verify with unit tests covering: repeated weeks, rest/active-rest slots, empty warm-up/cool-down, reps vs time items, weight and rest mapping, snapshot independence (mutating templates after compile leaves the plan unchanged) and session id uniqueness.
- [x] 2.4 Implement `mondayOf(date)` and the "esta semana" / "próximo lunes" start-date helper. Verify with unit tests for each weekday, including Sunday.

## 3. Plan store integration

- [x] 3.1 Change `getCurrentWeekNumber()` to clamp to `activePlan.totalWeeks` instead of 12. Verify with a unit test of a 24-week plan started 19 weeks ago returning 20, and a 12-week AI plan keeping its previous behavior.
- [x] 3.2 Add `planStore.activateCustomPlan(planTemplateId, startOption)`: load the templates, validate, compile, abandon other active plans, persist and set `activePlan`. Verify with a store unit test that it creates an active plan with `source: 'custom'` and abandons the previous one.
- [x] 3.3 Add the `planStore.canRecalculate` computed and an early return in `recalculatePlan` for custom plans. Gate the recalculation prompts in `EquipmentPage.vue`, `InjuryPage.vue` and `SessionCompletePage.vue`. Verify with a unit test that `recalculatePlan` makes no AI call for a custom plan, and manually check that no "Recalcular" action appears with a custom plan active.

## 4. Template store

- [x] 4.1 Create `src/stores/workoutTemplates.ts`: load the current user's day/week/plan templates, and provide create/update with validation and timestamps, plus `duplicateDay/Week/Plan` with the "(copia)" suffix. Reload when the current user changes. Verify with unit tests for CRUD, duplication and per-user isolation (user B does not see user A's templates).
- [x] 4.2 Add `usagesOfDay(id)` and `usagesOfWeek(id)`, and delete operations that reject when usages exist and return the users of the template. Verify with unit tests for delete-in-use refused, delete-unused succeeds, and deleting a plan template not affecting an activated plan.

## 5. Presets

- [x] 5.1 Author `src/data/workout-presets.json` with the 10 day presets and 3 week presets exactly as listed in design D7 (straight blocks, no weights, ids `preset_day_*` / `preset_week_*`). Verify that it parses as `{ dayPresets, weekPresets }` in the integrity test (5.2).
- [x] 5.2 Add `test/unit/workout-presets.test.ts` that checks: every exerciseId exists in `exercises.json`; warm-up items are `warmup` category; cool-down items are `cooldown` or `flexibility`; every main section is non-empty; no preset prescribes weight; every week preset has 7 slots with known `dayPresetId`s; and every preset passes `validation.ts`. Verify with `npx vitest run test/unit/workout-presets.test.ts`.
- [x] 5.3 Add a helper that derives required equipment from a preset's exercises and compares it with the user profile's `equipment`. Add `duplicateFromPreset()` in the template store (a day preset becomes one day template; a week preset becomes fresh day copies plus a week with remapped ids). Verify with unit tests: "Espalda y bíceps" requires dumbbells and bench; duplicating "Split 4 días" creates 6 day templates and 1 week whose slots reference them.

## 6. Backup

- [x] 6.1 Extend `src/db/export-import.ts` to format v3 with optional `dayTemplates`, `weekTemplates` and `planTemplates`, which are cleared and restored on import. Accept versions 1–3. Verify with tests in `test/unit/export-import.test.ts`: v3 round-trip restores templates with their references intact, and a v2 backup imports with an empty library.

## 7. Editor UI

- [x] 7.1 Add routes under `/plan/editor` (library, day/:id, week/:id, plan/:id, presets) in `src/router/index.ts`, plus entry points "Crear mi plan" in `PlanOverviewPage.vue` and on the dashboard plan card. Verify the app runs and each route renders.
- [x] 7.2 Build the library page (tabs Días / Semanas / Planes; list with name, summary and actions: edit, duplicate, delete). Delete-in-use shows the list of templates using it. Verify manually against the "Deleting a template that is in use" scenarios.
- [x] 7.3 Build the exercise picker dialog (search, muscle group and category filters, section-specific category defaults that can be cleared, multi-select) by reusing the filtering from `ExerciseLibraryPage`. Verify manually that the warm-up picker opens filtered to `warmup` and that the "Espalda" filter only lists back exercises.
- [x] 7.4 Build the day editor: name, collapsible warm-up/main/stretching sections, straight-set row (sets × reps|time toggle · kg · rest) with positive-value validation, reorder, remove, unavailable-exercise marker, approximate duration, explicit save and an unsaved-changes guard. Verify manually by creating "Pierna A" with an optional warm-up and checking it persists after reload.
- [x] 7.5 Build the week editor (7 rows Mon–Sun, each training/active rest/rest with a day selector). Verify manually: a week with no training day is refused, and an edited day shows its updated content in the week.
- [x] 7.6 Build the plan editor (ordered weeks: add, duplicate, reorder, remove; 52 max) and the activation dialog ("esta semana" / "próximo lunes", with a warning that the current active plan will be replaced). Show validation errors that name the template to fix. Verify manually: activating a 2-week plan makes today's session appear on the dashboard and it can be started and completed.
- [x] 7.7 Build the presets browser (groups "Por grupo muscular", "Por categoría", "Semanas"; read-only preview; missing-equipment notice; "Duplicar y editar" opens the new copy in the editor). Verify manually with a user without dumbbells viewing "Espalda y bíceps".

## 8. Final verification

- [x] 8.1 Run `npx vitest run` and `npx vue-tsc --noEmit`. Both must pass.
- [x] 8.2 End-to-end manual pass in the dev app. Duplicate the "Full body 3 días" preset, edit a day, build a 4-week plan, activate it from next Monday, complete a session, and check the history, achievements and challenges update. Then export, clear and import, and confirm the library and active plan are restored.
