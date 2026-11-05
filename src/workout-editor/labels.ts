import type { ExerciseCategory } from '../types/enums'
import type { SectionKey } from '../types/workout-template'

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

/** "4 × 10 · 40 kg · 90″" style summary of a straight prescription. */
export function formatPrescription(
  mode: 'reps' | 'time',
  sets: { reps?: number; durationSeconds?: number; weightKg?: number; restSeconds?: number }[],
): string {
  const first = sets[0] ?? {}
  const parts = [`${sets.length} × ${mode === 'reps' ? (first.reps ?? '–') : `${first.durationSeconds ?? '–'}″`}`]
  if (first.weightKg) parts.push(`${first.weightKg} kg`)
  if (first.restSeconds) parts.push(`desc. ${first.restSeconds}″`)
  return parts.join(' · ')
}
