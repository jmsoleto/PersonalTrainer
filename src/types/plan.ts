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
}

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

export interface PlannedExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps?: number
  durationSeconds?: number
  restSeconds: number
  notes?: string
  targetWeightKg?: number
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
