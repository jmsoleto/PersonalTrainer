import type { ActivityType } from './activity'

export type ChallengeMetric =
  | 'exercise_days'
  | 'sessions'
  | 'total_reps'
  | 'total_weight'
  | 'streak_days'
  | 'single_lift_kg'
  | 'activity_distance'

export type ChallengeWindowType =
  | 'calendar_year'
  | 'calendar_month'
  | 'rolling_days'
  | 'fixed_from_accept'

export interface ChallengeWindow {
  type: ChallengeWindowType
  lengthDays?: number   // for rolling_days / fixed_from_accept
}

export type ChallengeCategory =
  | 'frequency'
  | 'volume'
  | 'strength'
  | 'endurance'
  | 'consistency'

export interface ChallengeDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: ChallengeCategory
  metric: ChallengeMetric
  target: number
  unit?: string          // display unit hint (días, kg, km, sesiones...)
  window: ChallengeWindow
  allowsBaseline: boolean
  countsExternal: boolean
  activityType?: ActivityType   // filter for activity_distance (e.g. running only)
}

export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned'

export interface AcceptedChallenge {
  id?: number
  challengeId: string
  userId: string
  acceptedAt: string    // ISO
  windowStart: string   // YYYY-MM-DD (resolved at acceptance)
  windowEnd: string     // YYYY-MM-DD
  baseline: number      // 0 unless allowsBaseline
  status: ChallengeStatus
  resolvedAt?: string   // when it became completed/failed/abandoned
}
