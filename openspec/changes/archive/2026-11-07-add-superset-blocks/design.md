## Context

This change builds on `add-workout-editor` and `add-pyramid-blocks` (both archived 2026-11-05). See proposal.md for the motivation. The relevant current state:

- **The template model already fits supersets.** `BlockKind` includes `'superset'`, and `TemplateBlock.items` is an array. `TemplateBlock.restAfterSeconds` exists but no editor writes it.
- **Superset blocks are rejected in two places.** `validateDay` reports `unsupported_block`, and `compileBlocks` throws. Everything else in the compiler already loops over `block.items`.
- **The duration estimate** sums each set's work and `restSeconds`, item by item. It is correct for supersets as long as the rests live in the sets.
- **The session runner is a free-order list of cards**, one per `CompletedExercise`, with a manual rest timer. `SessionPage` finds the `PlannedExercise` for a card by `exerciseId` (`getPlannedExercise`). `session.ts` also keys `logSet`, `replaceExercise` and `skipExercise` by `exerciseId`. Validation already forbids repeating an exercise within a section.
- **The exercise picker** (`ExercisePickerDialog`) returns a list of ids (multi-select) and takes `excludeIds`.
- **`PlannedExercise` has several producers**: AI generation, external import, the compiler and the alternatives swap (`buildReplacement` in `SessionPage`).

## Goals / Non-Goals

**Goals:**
- No change to the stored template shape and no Dexie migration.
- Superset letters can never go out of sync with the block order.
- Plans that are already stored keep working; only the compiler writes the new marker.

**Non-Goals:**
- A round-by-round or guided runner, or an automatic rest timer.
- Changing `CompletedSession`, stats, achievements or challenges.
- Generalising to N exercises. The data model allows it; validation and the UI limit it to two.

## Decisions

### D1. Rests live in the sets, not in new block fields

A superset is `{ kind: 'superset', items: [A1, A2] }`, both items with the same number of sets.
- `A1.sets[i].restSeconds` is the **transition** (default 0).
- `A2.sets[i].restSeconds` is the **rest between rounds** (default 90).

The editor writes the same value to every set of an item, as it does for straight blocks. `restAfterSeconds` stays unused.

- *Why*: the duration estimate, the compiler (`restSeconds` from `sets[0]`) and the session already read the rest from the sets. They give the right result with no change.
- *Alternative considered*: `transitionSeconds` / `roundRestSeconds` fields on `TemplateBlock`. Rejected: they would duplicate what the sets say, and the estimate and compiler would need special cases.

### D2. Letters are derived from order, never stored

`supersetLetters(blocks): Map<blockId, string>` walks the main workout and gives A, B, C… to superset blocks only. The editor, the presets preview and the compiler all use it.

- *Why*: reordering, deleting or converting a block can never leave two supersets with the same letter or a gap.
- *Alternative considered*: storing `label` on the block. Rejected for that reason.

### D3. `PlannedExercise.superset?: { group: string; position: 1 | 2 }`

The compiler emits A1 then A2 consecutively and stamps both with the group letter (from D2) and their position. The field is optional and absent everywhere else, so AI and imported plans are unaffected.

- *Alternative considered*: a `groups` array on `PlannedSession`. Rejected: the swap would have to keep two structures in sync, and every producer of `PlannedSession` would have to know about it.

### D4. Validation codes

`unsupported_block` is kept only for unknown kinds. The superset rules add:

| Code | When |
|---|---|
| `superset_outside_main` | superset in the warm-up or cool-down |
| `superset_item_count` | not exactly 2 items |
| `superset_uneven_rounds` | the two items have a different number of sets |
| `superset_round_count` | rounds outside 1–10 |

A pyramid config on a superset is reported by the existing `pyramid_missing_config`. Repeated exercises are reported by the existing `duplicate_exercise`. Supersets go through the same per-set checks as straight blocks (positive reps or seconds, rest ≥ 0).

### D5. Editor: a `SupersetBlockEditor` component and a single-pick picker

- **`DayEditorPage` kind selector** gains "Superserie" (main only).
  - From straight: the block is kept in a "pending A2" state and the picker opens. On a pick, the block becomes `superset` with A2 from the existing `defaultItem`, resized to A1's set count, with the default rests. On cancel, nothing changes.
  - From pyramid: run the existing `toStraight` confirmation first, then continue as from straight.
- **`SupersetBlockEditor.vue`** (prop `block`, mutated in place, like `PyramidBlockEditor`):
  - the rounds stepper;
  - per item: mode toggle, value, weight, change exercise and remove;
  - the transition and round-rest fields;
  - the ⇄ swap button;
  - "Separar superserie".
  - Swapping A1 and A2 swaps the items and then rewrites the rests, so the transition and round rest stay with their positions.
- **Separate and remove** are done in `DayEditorPage`, because they replace one block with one or two blocks in the list. On separate, each new straight block keeps its item. The first block's rest is the old transition, so a 0 s transition gives 0 s rest; the user can then edit it.
- **`ExercisePickerDialog`** gets a `single` prop. It returns after the first pick. `excludeIds` are all exercise ids in the main workout.

### D6. Session: group consecutive cards by the planned marker

`SessionPage` builds a render list from `currentSession.exercises` in order. Cards whose planned exercise has the same `superset.group` are wrapped in a group container with the header "Superserie A · N rondas". N is the set count of A1. Each card shows its "A1"/"A2" tag.

"sin descanso" shows on a set row when either:
- it is a drop-set stage with 0 s rest (as today); or
- the exercise is position 1 of a superset and its rest is 0 s.

`buildReplacement` copies `superset`, so a swapped exercise stays in its group. No store change is needed: `replaceExercise` already keeps the position in the list.

### D7. Labels and preview

`labels.ts` gains `supersetHeader(letter, rounds)` ("Superserie A · 3 rondas") and a short per-item line for the presets preview: "A1 Press de Banca con Barra · 10 reps". `WorkoutPresetsPage` shows a superset as one group with its two items, using D2 for the letters.

### D8. Presets

Both presets are in the `category` group, have no weights and use a 0 s transition.

**`preset_day_superset_barbell` "Torso en superseries"**

| Block | Exercises | Prescription | Rest between rounds |
|---|---|---|---|
| A | `ex_barbell_bench_press` + `ex_barbell_bent_over_row` | 4 rounds × 10 reps | 120 s |
| B | `ex_barbell_overhead_press` + `ex_pull_up` | 3 rounds × 8 reps | 120 s |
| — | `ex_barbell_curl` (straight) | 3 × 12 | 60 s |

Requires barbell, bench and pull-up bar.

**`preset_day_superset_dumbbell` "Superseries con mancuernas"**

| Block | Exercises | Prescription | Rest between rounds |
|---|---|---|---|
| A | `ex_dumbbell_bench_press` + `ex_dumbbell_single_arm_row` | 3 × 12 | 90 s |
| B | `ex_dumbbell_lunge` + `ex_dumbbell_romanian_deadlift` | 3 × 10 | 90 s |
| C | `ex_dumbbell_bicep_curl` + `ex_dumbbell_tricep_extension` | 3 × 12 | 60 s |

Requires dumbbells and bench.

The warm-up and cool-down reuse the exercises of the existing upper-body presets. The presets test checks: valid supersets (via `validateDay`), no weights, catalog ids, and the equipment notice.

## Risks / Trade-offs

- **[Cards keyed by `exerciseId`]**: swapping A2 for an alternative that is already elsewhere in the session would collide. This is pre-existing behaviour for any swap. → Mitigation: none in this change. `findAlternatives` is unchanged and validation still forbids duplicates in templates.
- **[Free-order runner]**: nothing forces A1 → A2 → A1 order. The grouping and "sin descanso" marks only guide the user. → Accepted; a guided view is out of scope.
- **[Separating with a 0 s transition]**: A1 becomes a straight block with 0 s rest, which is unusual. → The user sees it and can edit it; this is better than inventing a value.
- **[Older app versions reading a newer backup]**: they would see `kind: 'superset'` and reject the day as `unsupported_block`. They would not crash. → Acceptable; same situation as pyramids.

## Migration Plan

None. No schema change. The new `PlannedExercise.superset` field is optional, and stored templates are already in the final shape.
