import presetsJson from '../data/workout-presets.json'
import type { Exercise } from '../types/exercise'
import type { Equipment } from '../types/enums'
import type { DayContent, DayPreset, WeekPreset, WorkoutPresetsCatalog } from '../types/workout-template'

const catalog = presetsJson as unknown as WorkoutPresetsCatalog

export const dayPresets: readonly DayPreset[] = catalog.dayPresets
export const weekPresets: readonly WeekPreset[] = catalog.weekPresets

export function getDayPreset(id: string): DayPreset | undefined {
  return dayPresets.find(p => p.id === id)
}

export function getWeekPreset(id: string): WeekPreset | undefined {
  return weekPresets.find(p => p.id === id)
}

function exerciseIdsOf(day: Pick<DayContent, 'warmup' | 'main' | 'cooldown'>): string[] {
  return [...day.warmup, ...day.main, ...day.cooldown].flatMap(b => b.items.map(i => i.exerciseId))
}

/**
 * Equipment a day needs, derived from its exercises (so it never drifts from
 * the catalog). Bodyweight exercises have an empty `equipment` list.
 */
export function requiredEquipment(
  day: Pick<DayContent, 'warmup' | 'main' | 'cooldown'>,
  getExercise: (id: string) => Exercise | undefined,
): Equipment[] {
  const set = new Set<Equipment>()
  for (const id of exerciseIdsOf(day)) {
    for (const eq of getExercise(id)?.equipment ?? []) set.add(eq)
  }
  return [...set]
}

export function missingEquipment(
  day: Pick<DayContent, 'warmup' | 'main' | 'cooldown'>,
  userEquipment: readonly Equipment[],
  getExercise: (id: string) => Exercise | undefined,
): Equipment[] {
  return requiredEquipment(day, getExercise).filter(eq => !userEquipment.includes(eq))
}

/** Distinct day presets used by a week preset, in slot order. */
export function dayPresetsOfWeek(week: WeekPreset): DayPreset[] {
  const ids: string[] = []
  for (const slot of week.slots) {
    if (slot.kind !== 'rest' && slot.dayPresetId && !ids.includes(slot.dayPresetId)) ids.push(slot.dayPresetId)
  }
  return ids.map(id => getDayPreset(id)).filter((p): p is DayPreset => !!p)
}
