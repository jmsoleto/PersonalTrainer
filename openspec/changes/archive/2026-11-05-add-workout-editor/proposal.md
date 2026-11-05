## Why

Today every training plan comes from the AI generator or from an imported external JSON. Users who know what they want to train (or who follow a coach's routine) cannot build their own sessions, reuse them across weeks, or assemble a multi-week plan from those pieces. There is also no quick starting point for common sessions ("pierna", "core", "HIIT") without generating a whole plan.

## What Changes

- **Add a local, per-user workout library** with three composable template levels:
  - **Day template**: optional warm-up, a main workout and optional cool-down/stretching. Each section is a list of exercise **blocks**. Each block holds catalog exercises, and each exercise has a per-set prescription (reps or time, weight, rest).
  - **Week template**: seven slots (Monday–Sunday). Each slot is a training day (references a day template), an active-rest day (optionally references a day template) or a rest day.
  - **Plan template**: an ordered list of week templates. The same week may appear several times.
- **Ship v1 with "straight sets" only** (N identical sets per exercise). The block model already carries a `kind` so **pyramids** (sets that differ from each other) and **supersets** (several exercises sharing rounds) can be added later without migrating stored data.
- **Exercises come only from the existing catalog.** Pickers filter by muscle group and category. Warm-up and cool-down pickers default to the `warmup` and `cooldown`/`flexibility` categories.
- **Activate a plan template as the user's active plan.** Activation compiles a self-contained snapshot into a normal `TrainingPlan` marked as user-created. Session runner, timer, history, achievements and challenges work unchanged. Editing templates later does not alter a plan already in progress.
- **AI recalculation is not offered for user-created plans.** Recalculation would overwrite the user's own design.
- **Referential safety**: a day or week template that is used elsewhere cannot be deleted. The UI shows where it is used.
- **Read-only presets**: 10 day presets grouped by muscle group (Pecho y tríceps, Espalda y bíceps, Pierna, Hombros, Core exprés, Cuerpo completo) and by category (Cardio HIIT, Pliometría, Movilidad y flexibilidad, Equilibrio), plus 3 week presets built from them. Users "duplicate and edit" a preset into their library. Presets leave weights empty and show the equipment they need.
- **Backups include the library.** Export/import covers the new template tables. The data only lives on the device, so the backup is the only safety net.
- **Fix the 12-week cap** on the current-week computation so plans longer than 12 weeks progress correctly.

## Capabilities

### New Capabilities
- `workout-templates`: User-owned, device-local library of day, week and plan templates. Covers the block/set prescription model, catalog-only exercise selection, referential integrity on delete, activation of a plan template into the active training plan, and inclusion in backups.
- `workout-presets`: Built-in, read-only day and week presets (by muscle group and by exercise category) that users can browse, preview and duplicate into their own library. Every preset references only existing catalog exercises.

### Modified Capabilities
<!-- None: plan lifecycle, recalculation and export/import have no existing specs; requirements for custom plans are expressed in workout-templates. -->

## Impact

- **Data (Dexie)**: new schema **version 5** adding `dayTemplates`, `weekTemplates` and `planTemplates` (indexed by `userId`). Additive, no migration of existing tables. `TrainingPlan` gains an optional `source` (`'ai' | 'import' | 'custom'`). Existing plans without it are treated as AI/import.
- **Data (static)**: new `src/data/workout-presets.json`.
- **Types**: new `src/types/workout-template.ts`. Optional `source` on `TrainingPlan` in `src/types/plan.ts`.
- **Stores/logic**: new `src/stores/workoutTemplates.ts`. New compiler module (template → `TrainingPlan`). `src/stores/plan.ts` gains plan activation for custom plans, and `getCurrentWeekNumber` uses `totalWeeks` instead of a hard-coded 12.
- **UI**: new editor pages under `/plan/editor` (library tabs Días / Semanas / Planes, day editor, week editor, plan editor, presets browser) and an entry point from the plan overview/dashboard. Recalculation actions (`EquipmentPage`, `InjuryPage`, `SessionCompletePage`) are hidden for custom plans.
- **Backup**: `src/db/export-import.ts` export format v3 with the optional template tables. v1/v2 backups still import.
- **Tests**: unit tests for the compiler, the template store (incl. delete protection), preset integrity against the catalog, and export/import round-trip.
- **No new dependencies, no network calls.**
