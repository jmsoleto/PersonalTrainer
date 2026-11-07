## Why

The workout editor builds straight sets and pyramids, but not supersets: two exercises done back to back, round after round. Supersets are a common way to save time and to pair opposing muscles (push and pull), and they are the last block kind that the template model already reserves (`kind: 'superset'`, several items per block) but that the editor, validation and activation still reject.

## What Changes

- **New block kind in the day editor: superset**, offered only in the main workout. A superset has **exactly two exercises**, labelled A1 and A2. Letters (A, B, C…) follow the order of the supersets in the day.
- **Each exercise keeps straight sets.** A1 and A2 each have their own mode (reps or time), reps or seconds and optional weight. Pyramids inside a superset are not allowed.
- **Rounds.** Both exercises share one number of rounds (1–10). Changing it changes both.
- **Rest.** Stored in the sets, so no new field is needed:
  - A1 → A2: the transition, 0 s by default and editable.
  - After A2: the rest between rounds, 90 s by default.
- **Switching block kind.**
  - Straight → superset: the exercise becomes A1 with its current values, and the exercise picker opens to choose A2. Cancelling the picker leaves the block as it was.
  - Pyramid → superset: the pyramid first becomes straight, with the existing warning.
  - "Separar superserie", or removing one of the two exercises, turns the superset into straight blocks without losing any values.
  - A1 and A2 can be swapped.
- **Activation supports supersets.** Each session exercise of a superset carries its group letter and position. Plans from AI generation and external import are not affected.
- **Session runner (grouped cards).**
  - The two exercises of a superset are shown together with a side bar and a header such as "Superserie A · 3 rondas".
  - Each card is labelled A1 or A2.
  - A1's set rows are marked "sin descanso" when the transition is 0 s.
  - Swapping an exercise for an alternative keeps its place in the superset.
  - Completed sessions are recorded as today, one entry per exercise.
- **Two new day presets with supersets**, with reps and no weights:
  - "Torso en superseries" (barbell).
  - "Superseries con mancuernas".

Out of scope: tri-sets and giant sets (more than two exercises); supersets in the warm-up or cool-down; pyramids inside a superset; a round-by-round or guided view in the session; AI-generated supersets.

## Capabilities

### New Capabilities
- `superset-blocks`: Superset block kind in day templates. Covers the two-exercise structure, shared rounds, transition and round rest, editing and conversion to and from straight and pyramid blocks, validation, and how supersets appear in the active plan and in a session.

### Modified Capabilities
- `workout-templates`: The "Straight sets in the first version" requirement changes. The editor now offers straight, pyramid and superset blocks in the main workout (pyramids and supersets only there).
- `pyramid-blocks`: The "Pyramids in the active plan" requirement said that supersets are rejected at activation. It is replaced by "Pyramid targets in the active plan", with the same pyramid behaviour and without that rule.
- `workout-presets`: Adds the two superset day presets to the built-in catalog.

## Impact

- **Types**:
  - `src/types/plan.ts`: adds the optional superset marker (group letter and position) on `PlannedExercise`.
  - `src/types/workout-template.ts`: no shape change; the comments are updated.
- **Editor logic**: changes to `validation.ts` (superset rules replace `unsupported_block`), `compiler.ts` (supersets compile instead of throwing), `labels.ts` (superset labels).
- **UI**:
  - `DayEditorPage.vue`: "Superserie" in the block kind selector, and a superset editor component.
  - `SessionPage.vue`: grouped cards, A1/A2 labels, "sin descanso" on A1 rows, alternatives keep the marker.
  - `WorkoutPresetsPage.vue`: preview of superset blocks.
- **Data**: `src/data/workout-presets.json` gains two presets.
- No Dexie schema change and no backup format change. The new field is optional and not indexed, so data that is already stored stays valid.
- **Tests**: validation, compiler, session grouping, labels, presets integrity.
