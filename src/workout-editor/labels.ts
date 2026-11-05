import type { ExerciseCategory } from '../types/enums'
import type { SectionKey, PyramidVariant } from '../types/workout-template'
import type { PlannedExercise, PlannedTechnique } from '../types/plan'

export const MUSCLE_OPTIONS = [
  { label: 'Pecho', value: 'chest' },
  { label: 'Espalda', value: 'back' },
  { label: 'Hombros', value: 'shoulders' },
  { label: 'Bíceps', value: 'biceps' },
  { label: 'Tríceps', value: 'triceps' },
  { label: 'Antebrazos', value: 'forearms' },
  { label: 'Core', value: 'core' },
  { label: 'Cuádriceps', value: 'quads' },
  { label: 'Isquiotibiales', value: 'hamstrings' },
  { label: 'Glúteos', value: 'glutes' },
  { label: 'Gemelos', value: 'calves' },
  { label: 'Cuerpo completo', value: 'full_body' },
] as const

export const CATEGORY_OPTIONS: { label: string; value: ExerciseCategory }[] = [
  { label: 'Fuerza', value: 'strength' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Pliometría', value: 'plyometric' },
  { label: 'Equilibrio', value: 'balance' },
  { label: 'Flexibilidad', value: 'flexibility' },
  { label: 'Calentamiento', value: 'warmup' },
  { label: 'Estiramiento', value: 'cooldown' },
]

export const EQUIPMENT_LABELS: Record<string, string> = {
  dumbbells: 'Mancuernas',
  barbell: 'Barra',
  kettlebell: 'Kettlebell',
  resistance_bands: 'Bandas elásticas',
  pull_up_bar: 'Barra de dominadas',
  bench: 'Banco',
  yoga_mat: 'Esterilla',
  bodyweight_only: 'Peso corporal',
}

export const SECTION_META: Record<SectionKey, { label: string; icon: string; optional: boolean; defaultCategories: ExerciseCategory[] }> = {
  warmup: { label: 'Calentamiento', icon: 'wb_sunny', optional: true, defaultCategories: ['warmup'] },
  main: { label: 'Principal', icon: 'fitness_center', optional: false, defaultCategories: [] },
  cooldown: { label: 'Estiramientos', icon: 'self_improvement', optional: true, defaultCategories: ['cooldown', 'flexibility'] },
}

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function muscleLabel(value: string): string {
  return MUSCLE_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function equipmentLabel(value: string): string {
  return EQUIPMENT_LABELS[value] ?? value
}

export const PYRAMID_VARIANT_LABELS: Record<PyramidVariant, string> = {
  ascending: 'Ascendente',
  descending: 'Descendente',
  triangle: 'Triángulo',
  drop: 'Drop set',
}

export const TECHNIQUE_LABELS: Record<PlannedTechnique, string> = {
  pyramid_ascending: 'Pirámide ascendente',
  pyramid_descending: 'Pirámide descendente',
  pyramid_triangle: 'Pirámide en triángulo',
  drop_set: 'Drop set',
}

/** Spanish decimal: 37.5 → "37,5". */
export function formatKg(kg: number): string {
  return String(kg).replace('.', ',')
}

type SetLike = { reps?: number; durationSeconds?: number; weightKg?: number; restSeconds?: number }

/** "40→55 kg" (or "40 kg" if constant). Triangles show base→peak. Empty if no weight. */
function weightRange(weights: (number | undefined)[], peak: boolean): string {
  const ws = weights.filter((w): w is number => w !== undefined)
  if (ws.length === 0) return ''
  const first = ws[0]
  const end = peak ? ws[Math.floor((ws.length - 1) / 2)] : ws[ws.length - 1]
  return first === end && ws.every(w => w === first) ? `${formatKg(first)} kg` : `${formatKg(first)}→${formatKg(end)} kg`
}

function valuesList(mode: 'reps' | 'time', sets: SetLike[]): string {
  return sets.map(s => (mode === 'reps' ? s.reps : s.durationSeconds) ?? '–').join('/')
}

/**
 * Template prescription summary. Straight: "4 × 10 · 40 kg · desc. 90″".
 * Pyramid: "Triángulo · 12/10/8/10/12 · 40→60 kg".
 */
export function formatPrescription(mode: 'reps' | 'time', sets: SetLike[], variant?: PyramidVariant): string {
  const first = sets[0] ?? {}
  if (variant) {
    const parts = [PYRAMID_VARIANT_LABELS[variant], `${valuesList(mode, sets)}${mode === 'time' ? '″' : ''}`]
    const kg = weightRange(sets.map(s => s.weightKg), variant === 'triangle')
    if (kg) parts.push(kg)
    return parts.join(' · ')
  }
  const parts = [`${sets.length} × ${mode === 'reps' ? (first.reps ?? '–') : `${first.durationSeconds ?? '–'}″`}`]
  if (first.weightKg) parts.push(`${formatKg(first.weightKg)} kg`)
  if (first.restSeconds) parts.push(`desc. ${first.restSeconds}″`)
  return parts.join(' · ')
}

/**
 * Session header summary of a planned exercise.
 * Straight: "3 series × 10 reps · 40 kg · Descanso 60s".
 * Pyramid: "12/10/8/6 reps · 40→55 kg · Descanso 90s"; time: "30/45/60 s".
 * Drop set: "Drop set · 10/10/10 · 60→37,5 kg".
 */
export function formatPlannedPrescription(planned: PlannedExercise): string {
  const details = planned.setDetails
  if (!details || details.length === 0) {
    let out = `${planned.sets} series`
    if (planned.reps) out += ` × ${planned.reps} reps`
    if (planned.durationSeconds) out += ` × ${planned.durationSeconds}s`
    if (planned.targetWeightKg) out += ` · ${formatKg(planned.targetWeightKg)} kg`
    if (planned.restSeconds) out += ` · Descanso ${planned.restSeconds}s`
    return out
  }
  const isTime = details.some(d => d.durationSeconds !== undefined)
  const list = details.map(d => (isTime ? d.durationSeconds : d.reps) ?? '–').join('/')
  const kg = weightRange(details.map(d => d.targetWeightKg), planned.technique === 'pyramid_triangle')
  if (planned.technique === 'drop_set') {
    return ['Drop set', list, kg].filter(Boolean).join(' · ')
  }
  const parts = [`${list} ${isTime ? 's' : 'reps'}`]
  if (kg) parts.push(kg)
  const rests = new Set(details.map(d => d.restSeconds))
  if (rests.size === 1 && details[0].restSeconds > 0) parts.push(`Descanso ${details[0].restSeconds}s`)
  return parts.join(' · ')
}
