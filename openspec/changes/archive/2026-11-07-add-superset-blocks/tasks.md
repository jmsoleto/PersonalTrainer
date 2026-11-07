## 1. Types and helpers

- [x] 1.1 Add `PlannedExercise.superset?: { group: string; position: 1 | 2 }` to `src/types/plan.ts`, and update the comments in `src/types/workout-template.ts`. Add a `src/workout-editor/superset.ts` module with:
  - `supersetLetters(blocks)`;
  - the rounds limits (1–10) and the default rests (transition 0 s, round rest 90 s);
  - pure helpers: build a superset from a straight block plus an A2 item, set the rounds, set the transition and round rest, swap A1/A2, and split into two straight blocks.

  Verify with a new `test/unit/workout-superset.test.ts`. It covers: letters A/B with a straight block between them; rounds change on both items; swap keeps the rests by position; split keeps each item's values with the transition as the first block's rest. `vue-tsc --noEmit` must show no new errors.

## 2. Validation, compiler and duration

- [x] 2.1 In `validation.ts`, replace the superset `unsupported_block` with `superset_outside_main`, `superset_item_count`, `superset_uneven_rounds` and `superset_round_count`. Keep `unsupported_block` for unknown kinds. Verify with unit tests for each code, plus a valid superset with one reps item and one time item. Check that `duplicate_exercise` and `pyramid_missing_config` also fire on supersets.
- [x] 2.2 In `compiler.ts`, compile supersets instead of throwing: A1 then A2, each stamped with `superset: { group, position }` using `supersetLetters`. Verify with compiler tests for the "Activating a superset" scenario and for two supersets with a straight block between them (letters A and B). The existing straight and pyramid compile tests must pass unchanged.
- [x] 2.3 Verify with a unit test that the day duration estimate for 3 rounds of A1 10 reps + A2 10 reps, 0 s transition and 90 s round rest equals 3 × (10·3 + 10·3 + 90) s. No change to `duration.ts` is expected.

## 3. Day editor

- [x] 3.1 Add a `single` prop to `ExercisePickerDialog` (return after the first pick). Verify in the dev server that the normal "+ Añadir" flow is still multi-select.
- [x] 3.2 Create `src/components/workout-editor/SupersetBlockEditor.vue` with:
  - the rounds stepper (1–10);
  - per item: the A1/A2 label, the reps/time toggle, the value, the weight, change exercise (single picker) and remove;
  - the transition and round-rest fields;
  - the ⇄ swap button;
  - "Separar superserie".

  Invalid values are rejected and the previous value kept. The remove and separate actions are emitted to the page. Verify in the dev server that each control updates both items correctly.
- [x] 3.3 Integrate it into `DayEditorPage.vue`:
  - "Superserie" in the main-only kind selector;
  - straight → superset opens the single picker, and cancel leaves the block unchanged;
  - pyramid → superset goes through the existing `toStraight` confirmation;
  - separate and remove replace the block with straight block(s) in place;
  - the superset letter shown on the row, derived from `supersetLetters`.

  Verify in the dev server:
  - a saved superset reopens with the same items, rounds and rests;
  - the letters update after reordering;
  - warm-up and cool-down rows have no kind selector.

## 4. Session runner

- [x] 4.1 Add `supersetHeader(letter, rounds)` and the per-item preview line to `labels.ts`. Verify with unit tests ("Superserie A · 3 rondas").
- [x] 4.2 Update `SessionPage.vue`:
  - group consecutive cards with the same `superset.group` under a side bar and the header;
  - show the A1/A2 tags;
  - mark A1's rows "sin descanso" when its rest is 0 s, keeping the drop-set mark;
  - make `buildReplacement` copy `superset`.

  Verify in the dev server with an active plan that has two supersets and a pyramid. The groups and marks must be correct, and swapping A2 for an alternative must keep it inside the group.

## 5. Presets

- [x] 5.1 Add "Torso en superseries" and "Superseries con mancuernas" to `src/data/workout-presets.json` with the ids and values in design D8 (group `category`, no weights, 0 s transitions, warm-up and cool-down). Extend `test/unit/workout-presets.test.ts`:
  - both presets pass `validateDay`;
  - they contain the expected number of supersets (2 and 3);
  - no preset has a weight;
  - every id is in the catalog;
  - "Torso en superseries" requires `pull_up_bar`.
- [x] 5.2 Update the `WorkoutPresetsPage.vue` preview to show each superset as one lettered group with its two items and rounds. Verify in the dev server, and confirm that duplicating "Superseries con mancuernas" gives a day with three supersets in the editor.

## 6. Verification

- [x] 6.1 Run the whole flow in the dev server at mobile size:
  - duplicate "Torso en superseries" and add weights;
  - turn a straight block into a superset in a new day, then separate it again;
  - build a 1-week plan and activate it;
  - run the session (grouped cards, A1/A2 tags, "sin descanso" on A1, swap inside a superset) and complete it;
  - confirm that the `CompletedSession` has one entry per exercise with its sets.
- [x] 6.2 Final checks:
  - `npx vitest run` passes;
  - `vue-tsc --noEmit` shows only the 3 errors that were already there;
  - `openspec validate add-superset-blocks --strict` passes.
