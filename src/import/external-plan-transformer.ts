import type {
  ExternalPlanRoot,
  ExternalPhase,
  ExternalSession,
  ExternalExercise,
  ExternalMainSegment,
} from './external-plan-types'
import type {
  TrainingPlan,
  Week,
  DayPlan,
  PlannedSession,
  PlannedExercise,
  SessionSegment,
  PlanContext,
} from '../types/plan'
import { DayType, Equipment, FitnessLevel, FitnessGoal, Gender } from '../types/enums'
import type { MuscleGroup, PlanStatus } from '../types/enums'

interface ExerciseLookup {
  getById(id: string): { name: string; primaryMuscle: string; muscleGroups: string[] } | undefined
}

const EQUIPMENT_MAP: Record<string, Equipment> = {
  bodyweight: Equipment.BodyweightOnly,
  resistance_bands: Equipment.ResistanceBands,
  mat: Equipment.YogaMat,
  kettlebell: Equipment.Kettlebell,
  dumbbells: Equipment.Dumbbells,
  barbell: Equipment.Barbell,
  pull_up_bar: Equipment.PullUpBar,
  bench: Equipment.Bench,
}

const FITNESS_LEVEL_MAP: Record<string, FitnessLevel> = {
  low: FitnessLevel.Beginner,
  medium: FitnessLevel.Intermediate,
  high: FitnessLevel.Advanced,
  beginner: FitnessLevel.Beginner,
  intermediate: FitnessLevel.Intermediate,
  advanced: FitnessLevel.Advanced,
}

// Training day slots per frequency (day numbers 1=Mon..7=Sun)
const TRAINING_DAYS: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
}

export function validateExternalPlanJson(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['El archivo no contiene un objeto JSON válido'] }
  }

  const root = data as Record<string, unknown>
  if (!root.plan || typeof root.plan !== 'object') {
    errors.push('Falta la propiedad "plan" en el JSON')
    return { valid: false, errors }
  }

  const plan = root.plan as Record<string, unknown>

  if (!Array.isArray(plan.phases) || plan.phases.length === 0) {
    errors.push('El plan debe tener al menos una fase en "phases"')
  }

  if (typeof plan.frequency_per_week !== 'number' || plan.frequency_per_week < 2 || plan.frequency_per_week > 6) {
    errors.push('"frequency_per_week" debe ser un número entre 2 y 6')
  }

  if (Array.isArray(plan.phases)) {
    for (const phase of plan.phases as Record<string, unknown>[]) {
      if (!Array.isArray(phase.weeks) || phase.weeks.length === 0) {
        errors.push(`Fase ${phase.phase ?? '?'}: falta "weeks"`)
      }
      if (!Array.isArray(phase.sessions) || phase.sessions.length === 0) {
        errors.push(`Fase ${phase.phase ?? '?'}: falta "sessions"`)
      }
      if (Array.isArray(phase.sessions)) {
        for (const session of phase.sessions as Record<string, unknown>[]) {
          if (!session.warmup || !session.main || !session.cooldown) {
            errors.push(`Sesión ${session.session_id ?? '?'}: falta warmup, main o cooldown`)
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

export function transformExternalPlan(
  data: ExternalPlanRoot,
  userId: string,
  exercises: ExerciseLookup,
): TrainingPlan {
  const ext = data.plan
  const frequency = ext.frequency_per_week
  const trainingSlots = TRAINING_DAYS[frequency] ?? TRAINING_DAYS[3]

  const weeks: Week[] = []

  for (const phase of ext.phases) {
    for (const weekNum of phase.weeks) {
      const week = buildWeek(weekNum, phase, trainingSlots, exercises)
      weeks.push(week)
    }
  }

  // Sort by week number
  weeks.sort((a, b) => a.weekNumber - b.weekNumber)

  const basedOn: PlanContext = {
    profile: {
      gender: Gender.PreferNotToSay,
      age: ext.profile.age,
      weightKg: ext.profile.weight_kg,
      heightCm: 0,
      fitnessLevel: FITNESS_LEVEL_MAP[ext.profile.fitness_level] ?? FitnessLevel.Beginner,
    },
    goals: [FitnessGoal.GeneralFitness],
    equipment: ext.profile.equipment
      .map(e => EQUIPMENT_MAP[e])
      .filter((e): e is Equipment => e !== undefined),
    injuries: [],
    feedbackHistory: [],
  }

  return {
    id: crypto.randomUUID(),
    userId,
    name: ext.title || `Plan importado ${new Date().toLocaleDateString('es-ES')}`,
    totalWeeks: weeks.length,
    startDate: new Date().toISOString(),
    status: 'active' as PlanStatus,
    generatedAt: new Date().toISOString(),
    basedOn,
    weeks,
  }
}

function buildWeek(
  weekNumber: number,
  phase: ExternalPhase,
  trainingSlots: number[],
  exercises: ExerciseLookup,
): Week {
  const days: DayPlan[] = []

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const slotIndex = trainingSlots.indexOf(dayNum)

    if (slotIndex !== -1 && slotIndex < phase.sessions.length) {
      const extSession = phase.sessions[slotIndex]
      days.push({
        dayNumber: dayNum,
        dayType: DayType.Training,
        session: buildSession(extSession, weekNumber, dayNum, exercises),
      })
    } else if (dayNum === 6) {
      days.push({ dayNumber: dayNum, dayType: DayType.ActiveRest })
    } else {
      days.push({ dayNumber: dayNum, dayType: DayType.Rest })
    }
  }

  return {
    weekNumber,
    theme: `Fase ${phase.phase}: ${phase.name}`,
    days,
  }
}

function buildSession(
  ext: ExternalSession,
  weekNumber: number,
  dayNumber: number,
  exercises: ExerciseLookup,
): PlannedSession {
  const mainRestSec = extractRestSeconds(ext.main.rest_between_sets_sec)
  const isCircuit = ext.circuit === true
  const rounds = ext.main.rounds ?? 1

  const warmup = buildSegment(ext.warmup.exercises, 0, exercises)
  const cooldown = buildSegment(ext.cooldown.exercises, 0, exercises)

  const mainExercises = ext.main.exercises.map(ex => {
    const sets = isCircuit ? rounds : (ex.sets ?? 1)
    return buildExercise(ex, mainRestSec, exercises, sets)
  })

  // Derive target muscle groups from main exercises
  const muscleGroups = new Set<string>()
  for (const ex of ext.main.exercises) {
    const catalogEntry = exercises.getById(ex.exercise_id)
    if (catalogEntry) {
      muscleGroups.add(catalogEntry.primaryMuscle)
    }
  }

  return {
    id: `s-w${weekNumber}-d${dayNumber}`,
    title: ext.name,
    targetMuscleGroups: Array.from(muscleGroups) as MuscleGroup[],
    estimatedDurationMinutes: ext.duration_min,
    warmup: { exercises: warmup, durationMinutes: ext.warmup.duration_min },
    mainWorkout: mainExercises,
    cooldown: { exercises: cooldown, durationMinutes: ext.cooldown.duration_min },
  }
}

function buildSegment(
  extExercises: ExternalExercise[],
  restSeconds: number,
  exercises: ExerciseLookup,
): PlannedExercise[] {
  return extExercises.map(ex => buildExercise(ex, restSeconds, exercises))
}

function buildExercise(
  ext: ExternalExercise,
  restSeconds: number,
  exercises: ExerciseLookup,
  overrideSets?: number,
): PlannedExercise {
  const catalogEntry = exercises.getById(ext.exercise_id)

  if (!catalogEntry) {
    console.warn(`[import] Ejercicio no encontrado en catálogo: ${ext.exercise_id}`)
  }

  const name = catalogEntry?.name ?? formatExerciseId(ext.exercise_id)

  const result: PlannedExercise = {
    exerciseId: ext.exercise_id,
    exerciseName: name,
    sets: overrideSets ?? ext.sets ?? 1,
    restSeconds,
  }

  if (ext.reps !== undefined) {
    result.reps = ext.reps
  }
  if (ext.duration_sec !== undefined) {
    result.durationSeconds = ext.duration_sec
  }
  if (ext.each_side) {
    result.notes = 'Cada lado'
  }

  return result
}

function extractRestSeconds(rest: number | { min: number; max: number }): number {
  if (typeof rest === 'number') return rest
  return rest.min
}

function formatExerciseId(id: string): string {
  return id
    .replace(/^ex_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
