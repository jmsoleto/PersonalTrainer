import { useAchievementsStore } from '../stores/achievements'
import { useMeasurementsStore } from '../stores/measurements'
import { useUserStore } from '../stores/user'
import { db } from '../db'
import { isoToDay, longestStreak } from './useExerciseDays'
import type { UnlockedAchievement } from '../types/achievement'
import type { CompletedSession } from '../types/plan'

interface SessionStats {
  totalSessions: number
  totalReps: number
  totalWeight: number
  maxStreak: number
  weeksCompleted: Set<number>
}

function computeStats(sessions: CompletedSession[]): SessionStats {
  let totalReps = 0
  let totalWeight = 0
  const weeksCompleted = new Set<number>()

  for (const session of sessions) {
    weeksCompleted.add(session.weekNumber)
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (set.completed) {
          totalReps += set.reps ?? 0
          totalWeight += (set.reps ?? 0) * (set.weightKg ?? 0)
        }
      }
    }
  }

  return {
    totalSessions: sessions.length,
    totalReps,
    totalWeight,
    maxStreak: longestStreak(sessions.map(s => isoToDay(s.completedAt))),
    weeksCompleted,
  }
}

export async function checkAchievements(): Promise<UnlockedAchievement[]> {
  const achievementsStore = useAchievementsStore()
  const measurementsStore = useMeasurementsStore()
  const userStore = useUserStore()

  if (!userStore.currentUser) return []

  // Get plans belonging to this user, then sessions for those plans
  const userPlans = await db.trainingPlans
    .where('userId').equals(userStore.currentUser.id)
    .toArray()
  const planIds = new Set(userPlans.map(p => p.id))

  const allSessions = await db.completedSessions.toArray()
  const sessions = allSessions.filter(s => planIds.has(s.planId))

  const stats = computeStats(sessions)
  const measurementCount = measurementsStore.measurements.length
    || (await db.bodyMeasurements.where('userId').equals(userStore.currentUser.id).count())

  // Completed challenges for this user (for challenge-derived achievements)
  const completedChallenges = await db.acceptedChallenges
    .where('userId').equals(userStore.currentUser.id)
    .filter(c => c.status === 'completed')
    .toArray()
  const completedChallengeIds = new Set(completedChallenges.map(c => c.challengeId))

  const newlyUnlocked: UnlockedAchievement[] = []

  for (const def of achievementsStore.definitions) {
    if (achievementsStore.isUnlocked(def.id)) continue

    let met = false
    switch (def.condition.type) {
      case 'sessions_completed':
        met = stats.totalSessions >= def.condition.threshold
        break
      case 'streak_days':
        met = stats.maxStreak >= def.condition.threshold
        break
      case 'total_reps':
        met = stats.totalReps >= def.condition.threshold
        break
      case 'total_weight':
        met = stats.totalWeight >= def.condition.threshold
        break
      case 'weeks_completed':
        met = stats.weeksCompleted.size >= def.condition.threshold
        break
      case 'measurements_logged':
        met = measurementCount >= def.condition.threshold
        break
      case 'challenges_completed':
        met = completedChallengeIds.size >= def.condition.threshold
        break
      case 'challenge_specific':
        met = def.condition.challengeId
          ? completedChallengeIds.has(def.condition.challengeId)
          : false
        break
    }

    if (met) {
      const unlocked = await achievementsStore.unlock(def.id)
      if (unlocked) newlyUnlocked.push(unlocked)
    }
  }

  return newlyUnlocked
}
