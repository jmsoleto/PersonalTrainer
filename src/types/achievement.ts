import type { MuscleGroup } from './enums'

export type AchievementCategory = 'consistency' | 'volume' | 'milestone' | 'streak'

export type AchievementConditionType =
  | 'sessions_completed'
  | 'streak_days'
  | 'total_reps'
  | 'total_weight'
  | 'exercise_specific'
  | 'weeks_completed'
  | 'measurements_logged'
  | 'challenges_completed'
  | 'challenge_specific'

export interface AchievementCondition {
  type: AchievementConditionType
  threshold: number
  exerciseId?: string
  muscleGroup?: MuscleGroup
  challengeId?: string
}

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  condition: AchievementCondition
}

export interface UnlockedAchievement {
  id?: number
  achievementId: string
  userId: string
  unlockedAt: string
  seen: boolean
}
