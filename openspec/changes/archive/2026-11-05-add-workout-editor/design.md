## Context

See proposal.md for motivation. Requirements are in `specs/workout-templates` and `specs/workout-presets`.

Current state that shapes the approach:

- **Persistence** is Dexie/IndexedDB (`src/db/index.ts`, currently schema v4). Every user-owned table carries `userId`. Plans live in `trainingPlans` and only one has `status = 'active'` per user. Generating or importing a plan marks the previous active plans as `abandoned` (`src/stores/plan.ts`).
- **Plan model** (`src/types/plan.ts`): `TrainingPlan → weeks[] → days[] (dayNumber 1..7 = Mon..Sun, dayType) → session: PlannedSession { warmup: SessionSegment, mainWorkout: PlannedExercise[], cooldown: SessionSegment }`. A `PlannedExercise` is uniform across sets: `sets`, `reps?`, `durationSeconds?`, `restSeconds`, `targetWeightKg?`.
- **Today resolution**: `DashboardPage` picks `currentWeek.days.find(d => d.dayNumber === weekday)`. `getCurrentWeekNumber()` derives the week from `startDate` and clamps it to `[1, 12]`.
- **Catalog**: 273 exercises in `src/data/exercises.json`, with `category` ∈ {strength, cardio, flexibility, balance, plyometric, warmup, cooldown}, `muscleGroups`, `primaryMuscle` and `equipment[]` (empty = bodyweight).
- **Backups**: `src/db/export-import.ts`, format `version: 1 | 2` with optional tables for backward compatibility.
- **Recalculation** (`planStore.recalculatePlan`) is triggered from `EquipmentPage`, `InjuryPage` and `SessionCompletePage`.

## Goals / Non-Goals

**Goals:**
- A template model whose stored shape does not change when pyramids and supersets arrive. Only the editor UI and the compiler grow.
- Zero changes to the session runner, timer, `CompletedSession`, achievements and challenges for v1.
- Templates stay editable without breaking a plan in progress.

**Non-Goals:**
- Pyramid and superset editing, and the runner support they need.
- Automatic progression between weeks (e.g. +2.5 kg/week).
- Custom exercises outside the catalog.
- Sharing templates between users or devices beyond the existing JSON backup.
- AI-assisted editing of templates.

## Decisions

### D1. Library uses references; activation compiles a snapshot

Week slots reference day templates by id, and plan templates reference week templates by id. Activation deep-copies everything into a `TrainingPlan`.

- *Why*: inside the library, editing "Pierna A" should update every week that uses it, which is what users expect while designing. A plan in progress must stay stable, because `CompletedSession.plannedSessionId` and the user's history point into it.
- *Alternative*: copy on insert, where a week embeds its days. Rejected: it duplicates data and editing a day would not propagate.
- *Alternative*: the active plan reads templates live. Rejected: edits would rewrite past and future sessions of a plan in progress and break history, and the runner would need to know about templates.

### D2. Block / item / set model, stored per set

```ts
// src/types/workout-template.ts
type BlockKind = 'straight' | 'pyramid' | 'superset'   // v1 editor: 'straight' only
type ExerciseMode = 'reps' | 'time'

interface SetSpec { reps?: number; durationSeconds?: number; weightKg?: number; restSeconds?: number }
interface BlockItem { exerciseId: string; mode: ExerciseMode; sets: SetSpec[]; notes?: string }
interface TemplateBlock { id: string; kind: BlockKind; items: BlockItem[]; restAfterSeconds?: number }

interface DayTemplate {
  id: string; userId: string; name: string; notes?: string
  warmup: TemplateBlock[]; main: TemplateBlock[]; cooldown: TemplateBlock[]  // empty = section omitted
  presetId?: string            // origin, informational only
  createdAt: string; updatedAt: string
}

type WeekSlot =
  | { kind: 'training'; dayTemplateId: string }
  | { kind: 'active_rest'; dayTemplateId?: string }
  | { kind: 'rest' }

interface WeekTemplate { id: string; userId: string; name: string; slots: WeekSlot[] /* length 7, Mon..Sun */; presetId?: string; createdAt: string; updatedAt: string }
interface PlanTemplate { id: string; userId: string; name: string; weekTemplateIds: string[] /* 1..52 */; createdAt: string; updatedAt: string }
```

- *Why per set*: a pyramid is "straight with sets that differ" and a superset is "a block with several items". Both fit this shape, so no data migration is needed later. In v1 a straight block's UI edits one prescription and writes it to all N sets.
- *Alternative*: a discriminated union per kind with different payloads (e.g. `{ kind: 'straight', sets: 4, reps: 10 }`). Rejected: every future kind would need its own storage shape and conversions.
- Empty arrays represent an omitted warm-up or cool-down, so there is no `undefined` vs `[]` ambiguity.

### D3. Compiler: a pure function from templates to `TrainingPlan`

`compilePlanTemplate(plan, weeks, days, catalog, { userId, startDate }) → TrainingPlan` lives in `src/workout-editor/compiler.ts`. It has no Dexie or Pinia access, so it is unit-testable in isolation.

Mapping:

| Template | TrainingPlan |
|---|---|
| `weekTemplateIds[i]` | `weeks[i]` with `weekNumber = i + 1`, `theme = week.name` |
| `slots[j]` | `days[j]` with `dayNumber = j + 1` (1 = Monday) |
| slot `training` | `dayType: training`, `session` compiled from the day |
| slot `active_rest` | `dayType: active_rest`, with a `session` only if a `dayTemplateId` is set |
| slot `rest` | `dayType: rest`, no session |
| day `warmup` / `main` / `cooldown` | `warmup.exercises` / `mainWorkout` / `cooldown.exercises` |
| straight item | `PlannedExercise { sets: n, reps or durationSeconds, targetWeightKg, restSeconds }` from `sets[0]` |

- **Session ids** are fresh per compiled occurrence (`${planId}-w${week}-d${day}`), even when the same day template appears several times. The runner and `CompletedSession` look sessions up by id, so ids must be unique within the plan.
- **`exerciseName`** is resolved from the catalog at compile time, as the existing plan model expects.
- **`targetMuscleGroups`** is the union of `muscleGroups` of the main items.
- **`estimatedDurationMinutes`** = Σ over sets of (reps × 3 s, or `durationSeconds`) + rest, rounded up. The same estimate is shown in the editor.
- **`SessionSegment.durationMinutes`** is computed the same way per segment.
- A non-straight block makes compilation fail with a typed error. v1 cannot create one, but the guard stops a future partial rollout from silently dropping data.
- Unknown `exerciseId`, a missing day or week reference, or an empty main section produce a typed validation error listing the template ids at fault. The UI uses it for the "which template needs fixing" message.

### D4. Activation and plan identity

- `TrainingPlan` gains `source?: 'ai' | 'import' | 'custom'`. AI generation sets `'ai'` and external import sets `'import'`. A missing value is treated as non-custom, so existing plans stay recalculable.
- Custom plans get `planTemplateId?: string` for traceability (e.g. "reactivate"). It is not used for behavior.
- `basedOn: PlanContext` is filled from the current profile, goals, equipment and injuries, the same as for imported plans, so stats and screens that read it keep working.
- `planStore.activateCustomPlan(planTemplateId, startOption)` loads the templates, compiles them, abandons other active plans and stores the result. This mirrors `importExternalPlan`.
- **Start date**: `startDate` is normalized to Monday 00:00 local time, either of the current week ("esta semana") or the next one ("próximo lunes"). This keeps `getCurrentWeekNumber()` week boundaries aligned with `dayNumber`. Without it, activating on a Wednesday would split weeks mid-week.
- `getCurrentWeekNumber()` clamps to `activePlan.totalWeeks` instead of `12`. This also benefits AI plans.

### D5. Recalculation is hidden for custom plans

A computed `planStore.canRecalculate` (`activePlan && activePlan.source !== 'custom'`) gates the recalculation prompts in the three pages. `recalculatePlan` returns early for custom plans as a defensive check.

### D6. Storage and store

- Dexie **v5**, additive: `dayTemplates: 'id, userId, updatedAt'`, `weekTemplates: 'id, userId, updatedAt'`, `planTemplates: 'id, userId, updatedAt'`. References are kept inside the documents, with no join tables. Reverse lookups ("where is this used?") scan the user's weeks or plans in memory, which is cheap at this scale (tens of templates).
- `src/stores/workoutTemplates.ts` loads the current user's three collections and exposes CRUD, `duplicate*`, `usagesOfDay(id)`, `usagesOfWeek(id)`, `deleteDay/Week/Plan` (rejects when usages exist) and `duplicateFromPreset(dayPresetId | weekPresetId)`.
- Ids use `crypto.randomUUID()`, matching the plan store.

### D7. Presets as static JSON in the template shape

`src/data/workout-presets.json` holds `{ dayPresets: DayPreset[], weekPresets: WeekPreset[] }`. A `DayPreset` is a `DayTemplate` without `userId` or timestamps, plus `group: 'muscle' | 'category'`, `targetMuscleGroups` and `estimatedMinutes`. A `WeekPreset` uses `dayPresetId` in its slots. Required equipment is **derived** from the exercises' `equipment`, not declared, so it cannot drift from the catalog.

Duplicating a week preset creates day templates for the distinct day presets it uses, then the week template with remapped ids. It always creates new copies and never reuses earlier copies, which keeps the operation predictable.

Day presets (v1). Sets are straight, rest is in seconds, and weights are empty.

| id | Nombre | Grupo | Calentamiento | Principal | Estiramientos |
|---|---|---|---|---|---|
| `preset_day_chest_triceps` | Pecho y tríceps | muscle | arm_circles 1×30″, scapular_push_up 1×10 | standard_push_up 4×12 r60 · wide_push_up 3×10 r60 · diamond_push_up 3×8 r60 · bodyweight_dip 3×10 r60 | chest_stretch 1×30″, tricep_stretch 1×30″ |
| `preset_day_back_biceps` | Espalda y bíceps | muscle | cat_cow 1×10, arm_circles 1×30″ | dumbbell_bent_over_row 4×10 r90 · dumbbell_single_arm_row 3×10 r60 · superman 3×15 r45 · dumbbell_bicep_curl 3×12 r60 · dumbbell_hammer_curl 3×12 r60 | child_pose 1×45″, spinal_twist 1×30″ |
| `preset_day_legs` | Pierna | muscle | leg_swing 1×10, hip_circle 1×10, high_knee_march 1×30″ | bodyweight_squat 4×15 r60 · forward_lunge 3×10 r60 · glute_bridge 3×15 r45 · wall_sit 3×45″ r45 · calf_raise 3×20 r30 | standing_quad_stretch 1×30″, hamstring_stretch 1×30″, pigeon_stretch 1×45″ |
| `preset_day_shoulders` | Hombros | muscle | arm_circles 1×30″, shoulder_shrug 1×15 | pike_push_up 3×8 r60 · dumbbell_shoulder_press 4×10 r90 · dumbbell_lateral_raise 3×12 r60 · dumbbell_rear_delt_fly 3×12 r60 | shoulder_cross_stretch 1×30″, neck_stretch 1×30″ |
| `preset_day_core_express` | Core exprés | muscle | torso_twist 1×30″ | plank 3×45″ r30 · side_plank 3×30″ r30 · bicycle_crunch 3×20 r30 · plank_shoulder_tap 3×16 r30 · mountain_climber 3×30″ r30 | cobra_stretch 1×30″ |
| `preset_day_full_body` | Cuerpo completo | muscle | world_greatest_stretch 1×10, arm_circles 1×30″ | bodyweight_squat 3×15 r60 · standard_push_up 3×10 r60 · reverse_lunge 3×10 r60 · superman 3×12 r45 · plank 3×40″ r30 · burpee 3×8 r60 | child_pose 1×45″, hamstring_stretch 1×30″ |
| `preset_day_hiit` | Cardio HIIT | category | high_knee_march 1×30″, a_skip 1×30″ | jumping_jack 4×40″ r20 · high_knees 4×40″ r20 · burpee 4×30″ r20 · mountain_climber 4×40″ r20 · butt_kick 4×40″ r20 | hamstring_stretch 1×30″, standing_quad_stretch 1×30″ |
| `preset_day_plyo` | Pliometría | category | leg_swing 1×10, lateral_shuffle 1×30″ | jump_squat 4×10 r60 · skater_jump 3×12 r60 · broad_jump 3×8 r90 · jump_lunge 3×10 r60 | calf_stretch 1×30″, figure_four_stretch 1×30″ |
| `preset_day_mobility` | Movilidad y flexibilidad | category | cat_cow 1×10 | downward_dog 2×45″ · warrior_one 2×45″ · warrior_two 2×45″ · thoracic_rotation 2×45″ · 90_90_stretch 2×45″ · happy_baby 2×45″ · seated_twist 2×45″ (r15) | butterfly_stretch 1×45″ |
| `preset_day_balance` | Equilibrio | category | ankle_circle 1×30″, hip_circle 1×10 | single_leg_stand 3×30″ r20 · tree_pose 3×30″ r20 · warrior_three 3×20″ r20 · single_leg_deadlift 3×10 r45 | hamstring_stretch 1×30″ |

All names refer to `ex_<name>`, `ex_warmup_<name>`, `ex_cooldown_<name>`, `ex_flexibility_<name>` or `ex_balance_<name>` ids that currently exist in the catalog. Equipment derived: back/biceps → dumbbells, bench; shoulders → dumbbells; all others bodyweight.

Week presets (v1):

| id | Nombre | L | M | X | J | V | S | D |
|---|---|---|---|---|---|---|---|---|
| `preset_week_full_body_3` | Full body 3 días | Cuerpo completo | rest | Cuerpo completo | rest | Cuerpo completo | active_rest: Movilidad | rest |
| `preset_week_split_4` | Split 4 días | Pecho y tríceps | Pierna | active_rest: Movilidad | Espalda y bíceps | Hombros | Core exprés | rest |
| `preset_week_conditioning_4` | Acondicionamiento 4 días | Cardio HIIT | Core exprés | rest | Pliometría | Cuerpo completo | active_rest: Equilibrio | rest |

(`Split 4 días` has four strength days plus a short core day on Saturday. The name refers to the four main sessions.)

### D8. UI structure

Routes under `/plan/editor`, reached from a "Crear mi plan" entry on `PlanOverviewPage` and the dashboard's plan card. The bottom navigation is unchanged.

```
/plan/editor                 Library: tabs Días · Semanas · Planes, "+ Nuevo", "Presets"
/plan/editor/day/:id         Day editor: 3 collapsible sections; "+ Añadir" opens the exercise picker
/plan/editor/week/:id        Week editor: 7 rows Mon..Sun, each a picker (día / descanso activo / descanso)
/plan/editor/plan/:id        Plan editor: ordered week list (reorder, duplicate, remove), "Activar"
/plan/editor/presets         Presets browser: Por grupo muscular · Por categoría · Semanas
```

- **Exercise picker**: a dialog that reuses the filter logic from `ExerciseLibraryPage` (muscle group, category, search), with the category defaults from the spec. Multi-select adds several exercises in one go.
- **Straight set row**: `series × [reps|tiempo] · kg · descanso`, with a reps/time toggle. Steppers for small integers and a numeric input for kg. Values below 1 are rejected (spec).
- Saving is explicit (a "Guardar" button). Leaving with unsaved changes asks for confirmation. This is less surprising than autosave while a template is still invalid (e.g. empty main).

### D9. Backup format v3

`ExportData.version` becomes `1 | 2 | 3`, with optional `dayTemplates`, `weekTemplates` and `planTemplates`. Import follows the existing pattern: older versions restore without the tables. Presets are static and are not exported.

## Risks / Trade-offs

- [The catalog renames or removes an exercise used in templates] → The editor marks the item as unavailable and activation refuses (spec). The preset integrity test catches it for built-ins in CI.
- [Duration estimate is approximate (3 s per rep)] → It is labelled "aprox." and only used for display.
- [`getCurrentWeekNumber` change affects AI plans] → The change only raises the cap from 12 to `totalWeeks`. AI plans are ≤ 12 weeks, so their behavior is unchanged. Covered by a unit test.
- [Monday normalization means "esta semana" activated on Saturday lands on week 1 day 6] → This is intended: earlier days of week 1 show as past. The activation dialog explains it and suggests "próximo lunes" from Thursday onwards.
- [Stored per-set data makes it possible to save a straight block whose sets differ (e.g. via import)] → The straight-block editor normalizes to `sets[0]` on edit. The compiler uses `sets[0]` for straight blocks.
- [Large week/plan reference scans] → Linear scans over a user's templates (tens of items) are negligible. They can be revisited with multi-entry indexes if libraries grow.

## Migration Plan

- Dexie v5 is additive, so there is no data transformation. Rollback is to ship the previous build. Unused tables do no harm.
- `source` is optional on `TrainingPlan`. No backfill is needed.
- Export format v3 is read by the new build. Older builds **reject** a v3 backup, because `importAllData` only accepts versions 1 and 2. This is acceptable: backups move forward (old → new) and the app updates as a whole. Import also clears the template tables before restoring, as it does for every other table.
