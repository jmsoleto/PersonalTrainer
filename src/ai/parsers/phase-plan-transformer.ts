import type { Week, DayPlan, PlannedSession, PlannedExercise, SessionSegment } from '../../types/plan'
import type { Exercise } from '../../types/exercise'
import { DayType } from '../../types/enums'

// ---------------------------------------------------------------------------
// Types for the phase-based AI output
// ---------------------------------------------------------------------------

interface PhaseExercise {
  exercise_id: string
  sets?: number
  reps?: number
  duration_sec?: number
  each_side?: boolean
}

interface PhaseWarmupCooldown {
  duration_min: number
  exercises: PhaseExercise[]
}

interface PhaseMain {
  duration_min: number
  rest_between_sets_sec: { min: number; max: number }
  exercises: PhaseExercise[]
}

interface PhaseSession {
  session_id: string
  name: string
  duration_min: number
  warmup: PhaseWarmupCooldown
  main: PhaseMain
  cooldown: PhaseWarmupCooldown
}

interface Phase {
  phase: number
  name: string
  weeks: number[]
  goal: string
  sessions: PhaseSession[]
}

export interface PhaseOutput {
  phases: Phase[]
}

// ---------------------------------------------------------------------------
// Day spacing patterns by daysPerWeek
// ---------------------------------------------------------------------------

const DAY_PATTERNS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
}

function getTrainingDays(daysPerWeek: number): number[] {
  const clamped = Math.min(Math.max(daysPerWeek, 1), 7)
  return DAY_PATTERNS[clamped] ?? DAY_PATTERNS[3]
}

// ---------------------------------------------------------------------------
// Exercise name lookup
// ---------------------------------------------------------------------------

function buildExerciseMap(exercises: Exercise[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const ex of exercises) {
    map.set(ex.id, ex.name)
  }
  return map
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapPhaseExercise(
  pe: PhaseExercise,
  restSeconds: number,
  exerciseMap: Map<string, string>,
): PlannedExercise {
  return {
    exerciseId: pe.exercise_id,
    exerciseName: exerciseMap.get(pe.exercise_id) ?? pe.exercise_id,
    sets: pe.sets ?? 1,
    reps: pe.reps,
    durationSeconds: pe.duration_sec,
    restSeconds,
    notes: pe.each_side ? 'Cada lado' : undefined,
  }
}

function mapSegment(
  phaseSegment: PhaseWarmupCooldown,
  exerciseMap: Map<string, string>,
): SessionSegment {
  return {
    durationMinutes: phaseSegment.duration_min,
    exercises: phaseSegment.exercises.map(pe =>
      mapPhaseExercise(pe, 0, exerciseMap),
    ),
  }
}

function mapPhaseSession(
  ps: PhaseSession,
  weekNumber: number,
  dayNumber: number,
  exerciseMap: Map<string, string>,
): PlannedSession {
  const restSeconds = ps.main.rest_between_sets_sec?.min ?? 60
  const mainExercises: PlannedExercise[] = ps.main.exercises.map(pe =>
    mapPhaseExercise(pe, restSeconds, exerciseMap),
  )

  return {
    id: `s-w${weekNumber}-d${dayNumber}`,
    title: ps.name,
    targetMuscleGroups: [],
    estimatedDurationMinutes: ps.duration_min,
    warmup: mapSegment(ps.warmup, exerciseMap),
    mainWorkout: mainExercises,
    cooldown: mapSegment(ps.cooldown, exerciseMap),
  }
}

// ---------------------------------------------------------------------------
// Main transformer
// ---------------------------------------------------------------------------

export function parsePhasePlanResponse(raw: string): PhaseOutput {
  let jsonStr = raw.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error(`No valid JSON found in AI response. Preview: ${raw.substring(0, 200)}`)
    }
    try {
      parsed = JSON.parse(match[0])
    } catch {
      throw new Error(`Invalid JSON in AI response. Preview: ${raw.substring(0, 200)}`)
    }
  }

  const data = parsed as Record<string, unknown>
  if (!data.phases || !Array.isArray(data.phases)) {
    throw new Error('Response missing "phases" array')
  }

  return data as unknown as PhaseOutput
}

export function transformPhasesToWeeks(
  phaseOutput: PhaseOutput,
  exercises: Exercise[],
  daysPerWeek: number,
): Week[] {
  const exerciseMap = buildExerciseMap(exercises)
  const trainingDays = getTrainingDays(daysPerWeek)
  const weeks: Week[] = []

  for (const phase of phaseOutput.phases) {
    const sessions = phase.sessions
    if (!sessions || sessions.length === 0) {
      throw new Error(`Phase ${phase.phase} has no sessions`)
    }

    for (const weekNumber of phase.weeks) {
      const days: DayPlan[] = []

      for (let dayNumber = 1; dayNumber <= 7; dayNumber++) {
        const trainingIndex = trainingDays.indexOf(dayNumber)
        const isTrainingDay = trainingIndex !== -1

        if (isTrainingDay) {
          // Rotate through session templates
          const session = sessions[trainingIndex % sessions.length]
          days.push({
            dayNumber,
            dayType: DayType.Training,
            session: mapPhaseSession(session, weekNumber, dayNumber, exerciseMap),
          })
        } else {
          // Non-training days adjacent to training days are active_rest, others are full rest
          const nearTraining = trainingDays.some(td => Math.abs(td - dayNumber) <= 1)
          days.push({
            dayNumber,
            dayType: nearTraining ? DayType.ActiveRest : DayType.Rest,
          })
        }
      }

      weeks.push({
        weekNumber,
        theme: `${phase.name} — ${phase.goal}`,
        days,
      })
    }
  }

  // Ensure weeks are sorted by weekNumber
  weeks.sort((a, b) => a.weekNumber - b.weekNumber)

  return weeks
}
