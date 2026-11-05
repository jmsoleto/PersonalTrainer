## Why

The workout editor only builds straight sets: every set of an exercise has the same reps, time and weight. Pyramids and drop sets are among the most common ways to structure strength work, and users cannot express them today. The template model already stores one prescription per set, so this is the natural next step. The gap is in the editor, the compiler and the session runner.

## What Changes

- **New block kind in the day editor: pyramid**, with its own editor and four variants:
  - **Ascending**: load goes up and reps go down set by set (e.g. 12×40 → 6×55).
  - **Descending**: the reverse; the heaviest set comes first.
  - **Triangle**: goes up to a peak set and back down symmetrically.
  - **Drop set**: one start weight, then 1–4 drops of a given percentage with no rest between stages.
- **Generator plus editable table.** The user sets a few parameters (number of sets, start and end reps or time, start and end weight, rest). The editor generates the sets and shows them as a table. Each set can then be adjusted by hand. A pyramid that was adjusted by hand is marked as such and is not regenerated without asking.
- **Weights are rounded to 2.5 kg** when generated. Reps are rounded to whole numbers and times to 5 s.
- **Weight rules.** Weight is optional in ascending, descending and triangle pyramids, so bodyweight pyramids such as push-ups 15/12/10/8 work. A drop set requires a start weight.
- **Time pyramids.** Ascending, descending and triangle pyramids also work in time mode (e.g. plank 30/45/60 s). Drop sets are reps only.
- **Pyramids are only offered in the main workout.** Warm-up and cool-down stay straight.
- **Switching block kind.**
  - Straight → pyramid starts from the block's current values.
  - Pyramid → straight keeps the first set, after a warning.
- **Activation supports pyramids.** The active plan carries the target of each set. Plans from AI generation and external import are not affected.
- **Session runner (minimal changes).**
  - Each set row starts with its own target.
  - The exercise header shows a summary such as "12/10/8/6 reps · 40→55 kg".
  - Drop-set stages are marked "sin descanso".
  - Swapping an exercise for an alternative keeps the per-set targets. As today, weight is kept only if the alternative uses weight.
- **Two new day presets with pyramids**, with reps and no weights. Drop sets need a weight and presets never prescribe one, so these presets do not include drop sets.
  - "Fuerza en pirámide" (barbell).
  - "Pirámide con mancuernas", with a bodyweight pyramid and a time pyramid.
- Supersets stay blocked. The editor does not offer them, and validation and activation still reject them.

Out of scope: supersets; AI-generated pyramids; a grouped drop-set view in the runner; automatic progression between weeks.

## Capabilities

### New Capabilities
- `pyramid-blocks`: Pyramid block kind in day templates. Covers the four variants, set generation and rounding, manual adjustment, weight and mode rules, conversion to and from straight blocks, and how pyramids appear in the active plan and in a session.

### Modified Capabilities
- `workout-templates`: The "Straight sets in the first version" requirement changes. The editor now offers straight and pyramid blocks (pyramids only in the main workout); supersets are still not offered.
- `workout-presets`: Adds the two pyramid day presets to the built-in catalog.

## Impact

- **Types**:
  - `src/types/workout-template.ts`: adds the optional `pyramid` config on `TemplateBlock`.
  - `src/types/plan.ts`: adds the optional per-set details and the technique label on `PlannedExercise`.
- **Editor logic**:
  - New pyramid generator module in `src/workout-editor/`.
  - Changes to `validation.ts`, `compiler.ts` and `labels.ts` (prescription summary).
- **UI**:
  - `DayEditorPage.vue`: block kind selector and pyramid editor component.
  - `SessionPage.vue`: summary line, per-set targets, "sin descanso" mark, alternatives.
  - `WorkoutPresetsPage.vue`: preview of per-set values.
- **Stores**: `session.ts` (set skeletons from per-set targets, both on session start and when swapping an exercise).
- **Data**: `src/data/workout-presets.json` gains two presets.
- No Dexie schema change and no backup format change. Both new fields are optional and not indexed, so data that is already stored stays valid.
- **Tests**: generator, validation, compiler, session skeleton, presets integrity.
