import { useAchievementsStore } from '../stores/achievements'
import { useMeasurementsStore } from '../stores/measurements'
import { db } from '../db'
import type { AchievementDefinition, UnlockedAchievement } from '../types/achievement'
import type { CompletedSession } from '../types/plan'

interface SessionStats {
  totalSessions: number
  totalReps: number
  totalWeight: number
  maxStreak: number
  weeksCompleted: Set<number>
}

function computeStreak(sessions: CompletedSession[]): number {
  if (sessions.length === 0) return 0

  const dates = [...new Set(
    sessions.map(s => s.completedAt.slice(0, 10)),
  )].sort()

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

    if (diff === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
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
    maxStreak: computeStreak(sessions),
    weeksCompleted,
  }
}

export async function checkAchievements(): Promise<UnlockedAchievement[]> {
  const achievementsStore = useAchievementsStore()
  const measurementsStore = useMeasurementsStore()

  const sessions = await db.completedSessions.toArray()
  const stats = computeStats(sessions)
  const measurementCount = measurementsStore.measurements.length
    || (await db.bodyMeasurements.count())

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
    }

    if (met) {
      const unlocked = await achievementsStore.unlock(def.id)
      if (unlocked) newlyUnlocked.push(unlocked)
    }
  }

  return newlyUnlocked
}
