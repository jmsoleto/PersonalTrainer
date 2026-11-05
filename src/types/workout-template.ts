import type { MuscleGroup } from './enums'

/**
 * User-built workout templates (device-local, per user).
 *
 * Stored shape is per-set so pyramids (sets that differ) and supersets
 * (several items in one block) fit without a data migration. The v1 editor
 * only creates `straight` blocks.
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

export interface TemplateBlock {
  id: string
  kind: BlockKind
  items: BlockItem[]
  restAfterSeconds?: number
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
