import type { MuscleGroup } from './enums'

/**
 * User-built workout templates (device-local, per user).
 *
 * Stored shape is per-set so pyramids (sets that differ) and supersets
 * (several items in one block) fit without a data migration. The editor
 * creates `straight` blocks and, in the main workout, `pyramid` blocks.
 */

export type BlockKind = 'straight' | 'pyramid' | 'superset'

export type ExerciseMode = 'reps' | 'time'

export interface SetSpec {
  reps?: number
  durationSeconds?: number
  weightKg?: number
  restSeconds?: number
}

export interface BlockItem {
  exerciseId: string
  mode: ExerciseMode
  sets: SetSpec[]
  notes?: string
}

export type PyramidVariant = 'ascending' | 'descending' | 'triangle' | 'drop'

/** One end of a generated range. `value` is reps or seconds, by the item's mode. */
export interface PyramidPoint {
  value: number
  weightKg?: number
}

/** Ascending / descending: values spread evenly from `first` to `last`. */
export interface LinearPyramidParams {
  setCount: number
  first: PyramidPoint
  last: PyramidPoint
  restSeconds: number
}

/** Triangle: `steps` sets from base to peak, then mirrored back (2·steps − 1 sets). */
export interface TrianglePyramidParams {
  steps: number
  base: PyramidPoint
  peak: PyramidPoint
  restSeconds: number
}

/** Drop set: start weight, then `drops` stages each `dropPercent` lighter, no rest between. */
export interface DropSetParams {
  startWeightKg: number
  drops: number
  dropPercent: number
  reps: number
  finalRestSeconds: number
}

/**
 * Editor-only description of how a pyramid's sets were generated. The block's
 * sets remain the source of truth; `manual` means the user retouched them.
 */
export type PyramidConfig =
  | { variant: 'ascending' | 'descending'; params: LinearPyramidParams; manual: boolean }
  | { variant: 'triangle'; params: TrianglePyramidParams; manual: boolean }
  | { variant: 'drop'; params: DropSetParams; manual: boolean }

export interface TemplateBlock {
  id: string
  kind: BlockKind
  items: BlockItem[]
  restAfterSeconds?: number
  /** Present if and only if `kind === 'pyramid'`. */
  pyramid?: PyramidConfig
}

/** Content of a day, shared by user templates and built-in presets. */
export interface DayContent {
  name: string
  notes?: string
  /** Empty array = no warm-up. */
  warmup: TemplateBlock[]
  main: TemplateBlock[]
  /** Empty array = no cool-down / stretching. */
  cooldown: TemplateBlock[]
}

export type SectionKey = 'warmup' | 'main' | 'cooldown'

export interface DayTemplate extends DayContent {
  id: string
  userId: string
  /** Preset this template was duplicated from (informational only). */
  presetId?: string
  createdAt: string
  updatedAt: string
}

export type WeekSlot =
  | { kind: 'training'; dayTemplateId: string }
  | { kind: 'active_rest'; dayTemplateId?: string }
  | { kind: 'rest' }

export interface WeekTemplate {
  id: string
  userId: string
  name: string
  /** Exactly 7 slots, Monday..Sunday. */
  slots: WeekSlot[]
  presetId?: string
  createdAt: string
  updatedAt: string
}

export interface PlanTemplate {
  id: string
  userId: string
  name: string
  /** Ordered, 1..52 entries; the same week may repeat. */
  weekTemplateIds: string[]
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Built-in presets (read-only, src/data/workout-presets.json)
// ---------------------------------------------------------------------------

export type PresetGroup = 'muscle' | 'category'

export interface DayPreset extends DayContent {
  id: string
  group: PresetGroup
  description?: string
  icon?: string
  targetMuscleGroups: MuscleGroup[]
}

export type WeekPresetSlot =
  | { kind: 'training'; dayPresetId: string }
  | { kind: 'active_rest'; dayPresetId?: string }
  | { kind: 'rest' }

export interface WeekPreset {
  id: string
  name: string
  description?: string
  slots: WeekPresetSlot[]
}

export interface WorkoutPresetsCatalog {
  dayPresets: DayPreset[]
  weekPresets: WeekPreset[]
}

export const WEEK_LENGTH = 7
export const MAX_PLAN_WEEKS = 52
