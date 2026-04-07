export interface ExternalPlanRoot {
  plan: ExternalPlan
}

export interface ExternalPlan {
  title: string
  profile: ExternalProfile
  session_duration_min: { min: number; max: number }
  frequency_per_week: number
  phases: ExternalPhase[]
}

export interface ExternalProfile {
  age: number
  weight_kg: number
  fitness_level: string
  equipment: string[]
}

export interface ExternalPhase {
  phase: number
  name: string
  weeks: number[]
  goal: string
  sessions: ExternalSession[]
}

export interface ExternalSession {
  session_id: string
  name: string
  duration_min: number
  circuit?: boolean
  warmup: ExternalSegment
  main: ExternalMainSegment
  cooldown: ExternalSegment
}

export interface ExternalSegment {
  duration_min: number
  exercises: ExternalExercise[]
}

export interface ExternalMainSegment extends ExternalSegment {
  rest_between_sets_sec?: number | { min: number; max: number }
  rest_between_exercises_sec?: number | { min: number; max: number }
  rest_between_rounds_sec?: number
  rounds?: number
}

export interface ExternalExercise {
  exercise_id: string
  sets?: number
  reps?: number
  duration_sec?: number
  each_side?: boolean
}
