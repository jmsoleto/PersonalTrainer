import { useChallengesStore } from '../stores/challenges'
import { useActivitiesStore } from '../stores/activities'
import { useUserStore } from '../stores/user'
import { db } from '../db'
import { exerciseDays, longestStreak } from './useExerciseDays'
import type { AcceptedChallenge, ChallengeDefinition } from '../types/challenge'
import type { CompletedSession } from '../types/plan'
import type { ManualActivity } from '../types/activity'

/** Today as a YYYY-MM-DD calendar day. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Compute the raw progress of an accepted challenge, excluding the baseline.
 * All events are restricted to [max(windowStart, acceptedAt), windowEnd] so
 * that history before acceptance never double-counts against the baseline.
 */
export function computeProgressSinceAcceptance(
  def: ChallengeDefinition,
  accepted: AcceptedChallenge,
  sessions: CompletedSession[],
  activities: ManualActivity[],
): number {
  const start = maxDay(accepted.windowStart, accepted.acceptedAt.slice(0, 10))
  const end = accepted.windowEnd
  const window = { start, end }

  const inWindow = (day: string) => day >= start && day <= end
  const windowSessions = sessions.filter(s => inWindow(s.completedAt.slice(0, 10)))
  const windowActivities = def.countsExternal
    ? activities.filter(a => inWindow(a.date))
    : []

  switch (def.metric) {
    case 'exercise_days':
      return exerciseDays(windowSessions, windowActivities, window).size

    case 'sessions':
      return windowSessions.length

    case 'streak_days':
      return longestStreak(exerciseDays(windowSessions, windowActivities, window))

    case 'total_reps':
      return sumSets(windowSessions, set => set.reps ?? 0)

    case 'total_weight':
      return sumSets(windowSessions, set => (set.reps ?? 0) * (set.weightKg ?? 0))

    case 'single_lift_kg':
      return maxSet(windowSessions, set => set.weightKg ?? 0)

    case 'activity_distance':
      return sumDistance(windowActivities, def.activityType)

    default:
      return 0
  }
}

function maxDay(a: string, b: string): string {
  return a >= b ? a : b
}

function sumSets(
  sessions: CompletedSession[],
  value: (set: CompletedSession['exercises'][number]['sets'][number]) => number,
): number {
  let total = 0
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (set.completed) total += value(set)
      }
    }
  }
  return total
}

function maxSet(
  sessions: CompletedSession[],
  value: (set: CompletedSession['exercises'][number]['sets'][number]) => number,
): number {
  let max = 0
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (set.completed) max = Math.max(max, value(set))
      }
    }
  }
  return max
}

function sumDistance(activities: ManualActivity[], activityType?: string): number {
  let total = 0
  for (const a of activities) {
    if (activityType && a.type !== activityType) continue
    // Normalize to km: swimming records meters, everything else km.
    total += a.distanceKm ?? (a.distanceM ? a.distanceM / 1000 : 0)
  }
  return total
}

export interface ChallengeProgress {
  accepted: AcceptedChallenge
  def: ChallengeDefinition
  current: number   // baseline + progress, capped at target
  raw: number       // baseline + progress, uncapped
  target: number
  ratio: number     // 0..1
}

/**
 * Recompute progress for every active accepted challenge and resolve status:
 * `completed` when target reached, `failed` when the window has ended below
 * target. Returns the challenges that became completed in this pass (for a
 * celebratory toast).
 */
export async function checkChallenges(): Promise<AcceptedChallenge[]> {
  const challengesStore = useChallengesStore()
  const activitiesStore = useActivitiesStore()
  const userStore = useUserStore()

  if (!userStore.currentUser) return []

  const userPlans = await db.trainingPlans
    .where('userId').equals(userStore.currentUser.id)
    .toArray()
  const planIds = new Set(userPlans.map(p => p.id))
  const allSessions = await db.completedSessions.toArray()
  const sessions = allSessions.filter(s => planIds.has(s.planId))

  const activities = await db.manualActivities
    .where('userId').equals(userStore.currentUser.id)
    .toArray()

  const newlyCompleted: AcceptedChallenge[] = []
  const day = today()

  for (const accepted of [...challengesStore.active]) {
    const def = challengesStore.getDefinition(accepted.challengeId)
    if (!def || accepted.id === undefined) continue

    const raw = accepted.baseline + computeProgressSinceAcceptance(def, accepted, sessions, activities)

    if (raw >= def.target) {
      await challengesStore.resolveStatus(accepted.id, 'completed')
      newlyCompleted.push({ ...accepted, status: 'completed' })
    } else if (accepted.windowEnd < day) {
      await challengesStore.resolveStatus(accepted.id, 'failed')
    }
  }

  return newlyCompleted
}

/**
 * Live progress snapshot for the active challenges, without mutating status.
 * Used by the UI (Home cards, challenges page) to render progress bars.
 */
export async function getActiveProgress(): Promise<ChallengeProgress[]> {
  const challengesStore = useChallengesStore()
  const userStore = useUserStore()
  if (!userStore.currentUser) return []

  const userPlans = await db.trainingPlans
    .where('userId').equals(userStore.currentUser.id)
    .toArray()
  const planIds = new Set(userPlans.map(p => p.id))
  const allSessions = await db.completedSessions.toArray()
  const sessions = allSessions.filter(s => planIds.has(s.planId))
  const activities = await db.manualActivities
    .where('userId').equals(userStore.currentUser.id)
    .toArray()

  const out: ChallengeProgress[] = []
  for (const accepted of challengesStore.active) {
    const def = challengesStore.getDefinition(accepted.challengeId)
    if (!def) continue
    const raw = accepted.baseline + computeProgressSinceAcceptance(def, accepted, sessions, activities)
    out.push({
      accepted,
      def,
      raw,
      current: Math.min(raw, def.target),
      target: def.target,
      ratio: def.target > 0 ? Math.min(raw / def.target, 1) : 0,
    })
  }
  // Nearest deadline first
  return out.sort((a, b) => a.accepted.windowEnd.localeCompare(b.accepted.windowEnd))
}
