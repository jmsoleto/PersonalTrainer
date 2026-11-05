## Context

This change builds on `add-workout-editor` (archived 2026-11-05). See proposal.md for the motivation. The relevant current state:

- **Templates already store one prescription per set.** `TemplateBlock { kind, items: [{ exerciseId, mode, sets: SetSpec[] }] }`. `BlockKind` already includes `'pyramid'`.
- **Validation and the compiler reject anything that is not straight.**
  - `validateDay` has a `straightOnly` option that defaults to true. It reports `unsupported_block`.
  - `compileBlocks` throws on any kind other than `straight`. It also collapses each item to `sets[0]`, so a `PlannedExercise` carries a single prescription (`sets`, `reps | durationSeconds`, `targetWeightKg`, `restSeconds`).
- **The session runner** (`session.ts` `startSession` and `replaceExercise`) builds N identical `CompletedSet` skeletons from that single prescription. `CompletedSet` is already per set.
- **The rest timer is manual** (a floating button). It does not read `restSeconds`, so a different rest per set only affects what is displayed.
- **`PlannedExercise` has several producers**: AI generation, external import, the compiler and the alternatives swap. Several screens read only its single-prescription fields.

## Goals / Non-Goals

**Goals:**
- Templates keep storing sets as the single source of truth. The compiler, validation and duration estimate keep reading sets and need no knowledge of variants.
- Plans that are already stored, whether AI-generated, imported or custom, keep working with no migration.
- The generator is a pure, unit-tested module, separate from the Vue editor.

**Non-Goals:**
- Making the rest timer automatic or per set.
- A dedicated drop-set layout in the runner.
- Changing `CompletedSession`, stats, achievements or challenges.

## Decisions

### D1. `PyramidConfig` lives on the block; sets stay the source of truth

```ts
// src/types/workout-template.ts
type PyramidVariant = 'ascending' | 'descending' | 'triangle' | 'drop'

interface LinearPyramidParams {             // ascending / descending
  setCount: number                          // 2–10
  first: { value: number; weightKg?: number }  // value = reps or seconds (by item.mode)
  last:  { value: number; weightKg?: number }
  restSeconds: number
}
interface TrianglePyramidParams {
  steps: number                             // 2–5 → 2*steps-1 sets
  base: { value: number; weightKg?: number }
  peak: { value: number; weightKg?: number }
  restSeconds: number
}
interface DropSetParams {
  startWeightKg: number                     // required
  drops: number                             // 1–4
  dropPercent: number                       // 10–40, default 20
  reps: number
  finalRestSeconds: number
}

type PyramidConfig =
  | { variant: 'ascending' | 'descending'; params: LinearPyramidParams; manual: boolean }
  | { variant: 'triangle'; params: TrianglePyramidParams; manual: boolean }
  | { variant: 'drop'; params: DropSetParams; manual: boolean }

interface TemplateBlock { /* …existing… */ pyramid?: PyramidConfig }  // present iff kind === 'pyramid'
```

- **Why sets stay the truth:** hand-adjusted pyramids exist, and their values cannot be derived from the parameters. If params were the truth, every consumer (compiler, duration estimate, preview, validation) would need the generator. With sets as the truth, only the editor needs it.
- **What `params` and `manual` are for:** `params` lets the editor reopen with the user's inputs. `manual` stops a parameter change from silently overwriting values the user typed by hand.
- **Alternative rejected:** storing only sets and inferring the parameters back. That cannot be done reliably after rounding and manual edits.
- **Storage impact:** no Dexie schema change, because the field is optional and not indexed. The backup format stays at version 3, since the new field travels inside the existing template rows.

### D2. Pure generator: `src/workout-editor/pyramid.ts`

- `generatePyramidSets(mode, config): SetSpec[]` and `defaultPyramidConfig(variant, mode, fromSets)`. The second one serves both the straight → pyramid conversion and the initial defaults.
- **Linear variants:** the value of set `i` is `first + (last − first) · i / (n − 1)`, rounded.
- **Triangle:** generates `steps` sets from base to peak, then mirrors them without repeating the peak.
- **Drop set:** `w₀ = start`, `wₖ = round2_5(wₖ₋₁ · (1 − p))`. Rest is 0 on every stage except the last, which gets `finalRestSeconds`.
- **Rounding helpers:**
  - `round2_5` rounds to the nearest multiple of 2.5. A tie rounds up. The minimum is 2.5 when a weight is present.
  - Reps round to an integer with a minimum of 1.
  - Seconds round to the nearest 5 s with a minimum of 5.
- **Variant directions are defaults only.** `defaultPyramidConfig` gives ascending a rising weight and falling reps, and descending the opposite. The generator does not check the direction (spec: the variant describes intent).

### D3. Validation rules

`validateDay` gets a per-section rule in place of `straightOnly`:

| Section | Allowed kinds |
|---|---|
| warmup / cooldown | `straight` |
| main | `straight`, `pyramid` |
| any | `superset` → `unsupported_block` |

New issue codes:
- `pyramid_outside_main`: a pyramid in the warm-up or cool-down.
- `pyramid_set_count`: fewer than 2 or more than 10 sets.
- `pyramid_missing_config`: a pyramid block without `pyramid`, or a `pyramid` config on a block that is not a pyramid.
- `drop_requires_weight`: a drop set without weight, or not in reps mode.
- `drop_not_decreasing`: a stage that is not lighter than the previous one, or a stage under 2.5 kg.

Validation checks the stored **sets**, not the params. Drop-set checks run on the stored stages. The existing `isValidSetValue` already checks each individual value.

### D4. `PlannedExercise` gains optional per-set targets

```ts
interface PlannedSet { reps?: number; durationSeconds?: number; targetWeightKg?: number; restSeconds: number }
interface PlannedExercise {
  /* …existing fields unchanged… */
  setDetails?: PlannedSet[]      // when present: length === sets; overrides the single prescription per set
  technique?: 'pyramid_ascending' | 'pyramid_descending' | 'pyramid_triangle' | 'drop_set'
}
```

- The compiler fills `setDetails` and `technique` for pyramid blocks. It still fills the summary fields from `sets[0]`: `reps` or `durationSeconds`, `targetWeightKg`, `restSeconds`. Screens that know nothing about pyramids then show sensible values.
- Straight blocks, AI plans and imported plans never set these fields, so their behaviour is unchanged.
- The compiler stops throwing on `pyramid` and keeps throwing on `superset`.
- **Alternative rejected:** changing `sets` from a number to an array. That is a breaking change for AI parsing, imports, stored plans and every reader.

### D5. Session runner: one skeleton builder

- `session.ts` builds skeletons in two places today: `startSession` and `replaceExercise`. Both get the same helper, `buildSetSkeleton(planned)`. It uses `setDetails[i]` when present and otherwise repeats the single prescription, as now.
- `SessionPage.vue`:
  - The header summary comes from a pure `formatPlannedPrescription(planned)` in `labels.ts` (unit-tested):
    - pyramids: "12/10/8/6 reps · 40→55 kg" or "30/45/60 s";
    - drop sets: "Drop set · 10/10/10 · 60→37,5 kg".
  - The reps, kg and seconds column headers are decided as today. "Has weight" now means any set has a target weight.
  - A set row whose planned `restSeconds` is 0 and whose exercise is a drop set shows "sin descanso".
- `buildReplacement` (alternatives) copies `setDetails` and `technique`. When the alternative is not a weighted movement, it removes `targetWeightKg` from every planned set.
- Display uses a comma decimal ("37,5 kg"), the same as the rest of the Spanish UI.

### D6. Editor UI: `PyramidBlockEditor.vue` inside `DayEditorPage`

- A block kind selector (Series iguales / Pirámide) appears only on main-workout rows.
- The pyramid editor has:
  - a variant chooser (Ascendente / Descendente / Triángulo / Drop set);
  - the parameter fields for the chosen variant;
  - a mode toggle (reps/time), hidden for drop sets;
  - the editable set table (#, reps or s, kg, rest) with "+ Serie" and remove buttons;
  - an "Ajustada a mano" chip together with a "Regenerar" action.
- **Regeneration:**
  - When `manual` is false, a parameter change regenerates the sets right away.
  - When `manual` is true, a parameter change asks for confirmation through the existing dialog pattern. If the user cancels, the parameter goes back to its previous value.
  - Editing a cell sets `manual = true`. Adding or removing a set does the same.
- **Conversions:**
  - Straight → pyramid calls `defaultPyramidConfig('ascending', mode, currentSets)`, so first equals last equals the current values.
  - Pyramid → straight asks for confirmation, then repeats `sets[0]` N times and drops `pyramid`.
- Changing the variant regenerates from the new variant's defaults, seeded with the current first set. If the pyramid is marked manual, the user confirms first.
- The editor reuses the `we-*` styles. On a 360 px screen the table is 4 compact columns, the same density as the straight-set row.

### D7. Presets

- Two new entries go in `src/data/workout-presets.json`, both with `group: 'category'`. They use the same block shape with the `pyramid` config filled in and no weights.
  - **"Fuerza en pirámide"**:
    - `ex_barbell_back_squat`: triangle, 3 steps, 12 → 8;
    - `ex_barbell_bench_press`: ascending, 4 sets, 12 → 6;
    - `ex_barbell_bent_over_row`: descending, 4 sets, 6 → 12;
    - `ex_barbell_romanian_deadlift`: straight 3 × 10.
  - **"Pirámide con mancuernas"**:
    - `ex_dumbbell_goblet_squat`: triangle;
    - `ex_dumbbell_bench_press`: ascending;
    - `ex_dumbbell_bent_over_row`: descending;
    - `ex_standard_push_up`: descending bodyweight, 15 → 8;
    - `ex_plank`: time pyramid, ascending 30 → 60 s.
  - Warm-up and cool-down are straight, taken from the existing presets.
- The preset integrity test is extended. Every pyramid preset block must equal `generatePyramidSets(config)`, so the stored sets and the params cannot drift apart.
- The preview uses `formatPrescription`, extended to show the variant and the per-set values.

## Risks / Trade-offs

- [Params and sets drift apart, for example after a buggy edit path] → Sets are always authoritative. `manual` covers intended drift. The preset test catches drift in shipped data.
- [Screens that read only `reps`/`targetWeightKg` show the first set only (Dashboard and PlanOverview previews, the AI recalculation context)] → An acceptable summary. AI recalculation is already disabled for custom plans, and those are the only plans with pyramids.
- [Rounding to 2.5 kg is wrong for small dumbbells or microplates] → The user can retouch any set by hand. A configurable step is deferred.
- [An older app build opens a backup that contains pyramids] → It imports the data, because the format version is unchanged. Its validation then flags those blocks as `unsupported_block`, so the plan cannot be activated or saved there. Nothing is lost silently.
- [The drop-set rows read as separate sets in history and volume stats] → Intended. Each stage is real work, and `CompletedSet` stays one row per stage.

## Migration Plan

No data migration. Ship the generator, validation and compiler first: once validation accepts pyramids, any stored pyramid data can be compiled. Then ship the runner, the editor UI and the presets. Rollback means reverting the code. Templates that contain pyramids then become `unsupported_block` and stay stored, untouched.
