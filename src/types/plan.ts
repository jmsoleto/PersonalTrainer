import type {
  FitnessGoal,
  Equipment,
  MuscleGroup,
  DayType,
  PlanStatus,
  SessionDifficulty,
  Gender,
  FitnessLevel,
} from './enums'
import type { InjuryZone } from './user'

export interface PlanContext {
  profile: {
    gender: Gender
    age: number
    weightKg: number
    heightCm: number
    fitnessLevel: FitnessLevel
  }
  goals: FitnessGoal[]
  equipment: Equipment[]
  injuries: InjuryZone[]
  feedbackHistory: SessionFeedbackSummary[]
}

export interface SessionFeedbackSummary {
  weekNumber: number
  avgDifficulty: number
  completionRate: number
}

export interface TrainingPlan {
  id: string
  userId: string
  name: string
  totalWeeks: number
  startDate: string
  status: PlanStatus
  generatedAt: string
  basedOn: PlanContext
  weeks: Week[]
  /** Origin of the plan. Missing = legacy AI/import plan. */
  source?: PlanSource
  /** Plan template a custom plan was activated from (traceability only). */
  planTemplateId?: string
}

export type PlanSource = 'ai' | 'import' | 'custom'

export interface Week {
  weekNumber: number
  theme: string
  days: DayPlan[]
}

export interface DayPlan {
  dayNumber: number
  dayType: DayType
  session?: PlannedSession
}

export interface PlannedSession {
  id: string
  title: string
  targetMuscleGroups: MuscleGroup[]
  estimatedDurationMinutes: number
  warmup: SessionSegment
  mainWorkout: PlannedExercise[]
  cooldown: SessionSegment
}

export interface SessionSegment {
  exercises: PlannedExercise[]
  durationMinutes: number
}

/** Target of one set, used when the sets of an exercise differ (pyramids). */
export interface PlannedSet {
  reps?: number
  durationSeconds?: number
  targetWeightKg?: number
  restSeconds: number
}

export type PlannedTechnique =
  | 'pyramid_ascending'
  | 'pyramid_descending'
  | 'pyramid_triangle'
  | 'drop_set'

export interface PlannedExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  /** Summary prescription; equals the first set when `setDetails` is present. */
  reps?: number
  durationSeconds?: number
  restSeconds: number
  notes?: string
  targetWeightKg?: number
  /** Per-set targets (length === sets). Absent = every set uses the summary. */
  setDetails?: PlannedSet[]
  technique?: PlannedTechnique
  /** Superset membership: group letter (A, B…) and position (A1 / A2). */
  superset?: PlannedSuperset
}

export interface PlannedSuperset {
  group: string
  position: 1 | 2
}

export interface CompletedSession {
  id: string
  planId: string
  plannedSessionId: string
  weekNumber: number
  dayNumber: number
  startedAt: string
  completedAt: string
  difficultyRating: SessionDifficulty
  feedback?: string
  exercises: CompletedExercise[]
  skippedExercises: string[]
}

export interface CompletedExercise {
  exerciseId: string
  exerciseName: string
  sets: CompletedSet[]
}

export interface CompletedSet {
  setNumber: number
  reps?: number
  weightKg?: number
  durationSeconds?: number
  completed: boolean
  rpe?: number
}
