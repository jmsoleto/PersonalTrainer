import type { Week, DayPlan, PlannedSession, PlannedExercise, SessionSegment } from '../../types/plan'
import type { Exercise } from '../../types/exercise'
import { DayType } from '../../types/enums'

// ---------------------------------------------------------------------------
// Types for the compact phase-based AI output
// ---------------------------------------------------------------------------

/** Compact exercise format returned by the AI */
interface CompactExercise {
  id: string       // exercise_id
  s?: number       // sets
  r?: number       // reps
  sec?: number     // duration_sec
  es?: boolean     // each_side
}

/** Compact session: warmup/cooldown defined once, main varies per week */
interface CompactSession {
  id: string                   // session letter: "A", "B", …
  name: string
  dur: number                  // duration_min
  rest: [number, number]       // [min, max] rest between sets in seconds
  wu: CompactExercise[]        // warmup exercises (same every week)
  cd: CompactExercise[]        // cooldown exercises (same every week)
  weeks: CompactExercise[][]   // main exercises per week (index = position in phase.weeks)
}

interface CompactPhase {
  phase: number
  name: string
  weeks: number[]
  goal: string
  sessions: CompactSession[]
}

export interface PhaseOutput {
  phases: CompactPhase[]
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

const WARMUP_COOLDOWN_DURATION_MIN = 5

function mapCompactExercise(
  ce: CompactExercise,
  restSeconds: number,
  exerciseMap: Map<string, string>,
): PlannedExercise {
  return {
    exerciseId: ce.id,
    exerciseName: exerciseMap.get(ce.id) ?? ce.id,
    sets: ce.s ?? 1,
    reps: ce.r,
    durationSeconds: ce.sec,
    restSeconds,
    notes: ce.es ? 'Cada lado' : undefined,
  }
}

function mapCompactSegment(
  exercises: CompactExercise[],
  exerciseMap: Map<string, string>,
): SessionSegment {
  return {
    durationMinutes: WARMUP_COOLDOWN_DURATION_MIN,
    exercises: exercises.map(ce => mapCompactExercise(ce, 0, exerciseMap)),
  }
}

function mapCompactSession(
  session: CompactSession,
  weekPos: number,
  weekNumber: number,
  dayNumber: number,
  exerciseMap: Map<string, string>,
): PlannedSession {
  const restSeconds = session.rest?.[0] ?? 60
  const weekExercises = session.weeks[weekPos] ?? session.weeks[0] ?? []
  const mainExercises: PlannedExercise[] = weekExercises.map(ce =>
    mapCompactExercise(ce, restSeconds, exerciseMap),
  )

  return {
    id: `s-w${weekNumber}-d${dayNumber}`,
    title: session.name,
    targetMuscleGroups: [],
    estimatedDurationMinutes: session.dur,
    warmup: mapCompactSegment(session.wu ?? [], exerciseMap),
    mainWorkout: mainExercises,
    cooldown: mapCompactSegment(session.cd ?? [], exerciseMap),
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

    for (let weekIdx = 0; weekIdx < phase.weeks.length; weekIdx++) {
      const weekNumber = phase.weeks[weekIdx]
      const days: DayPlan[] = []

      for (let dayNumber = 1; dayNumber <= 7; dayNumber++) {
        const trainingIndex = trainingDays.indexOf(dayNumber)
        const isTrainingDay = trainingIndex !== -1

        if (isTrainingDay) {
          // Rotate through session templates; pick week-specific main exercises
          const session = sessions[trainingIndex % sessions.length]
          days.push({
            dayNumber,
            dayType: DayType.Training,
            session: mapCompactSession(session, weekIdx, weekNumber, dayNumber, exerciseMap),
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
