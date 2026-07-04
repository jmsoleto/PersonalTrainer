import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import { useUserStore } from '../../src/stores/user'
import { useChallengesStore } from '../../src/stores/challenges'
import { useAchievementsStore } from '../../src/stores/achievements'
import { checkChallenges } from '../../src/composables/useChallengeChecker'
import { checkAchievements } from '../../src/composables/useAchievementChecker'
import { Gender, FitnessLevel, FitnessGoal, Equipment, SessionDifficulty } from '../../src/types/enums'
import type { CompletedSession } from '../../src/types/plan'

async function ensureUser() {
  const userStore = useUserStore()
  const user = await userStore.createUser({
    name: 'Test', gender: Gender.Male, age: 30, weightKg: 80, heightCm: 180,
    fitnessLevel: FitnessLevel.Beginner, goals: [FitnessGoal.GeneralFitness], equipment: [Equipment.BodyweightOnly],
  })
  await db.trainingPlans.put({
    id: 'plan-1', userId: user.id, name: 'P', totalWeeks: 12,
    startDate: '2026-01-01T00:00:00Z', status: 'active', generatedAt: '2026-01-01T00:00:00Z',
    basedOn: { profile: { gender: 'male', age: 30, weightKg: 80, heightCm: 180, fitnessLevel: 'beginner' }, goals: [], equipment: [], injuries: [], feedbackHistory: [] },
    weeks: [],
  } as never)
  return user
}

function session(completedAt: string): CompletedSession {
  return {
    id: crypto.randomUUID(), planId: 'plan-1', plannedSessionId: 'ps', weekNumber: 1, dayNumber: 1,
    startedAt: completedAt, completedAt, difficultyRating: SessionDifficulty.JustRight,
    exercises: [{ exerciseId: 'ex', exerciseName: 'X', sets: [{ setNumber: 1, reps: 5, completed: true }] }],
    skippedExercises: [],
  }
}

describe('challenge-derived achievements', () => {
  beforeEach(async () => { await ensureUser() })

  it('unlocks the generic "first challenge" achievement when a challenge completes', async () => {
    const challenges = useChallengesStore()
    const achievements = useAchievementsStore()
    await challenges.loadAccepted()
    await achievements.loadUnlocked()

    const rec = await challenges.accept('chl_12_sessions_30d')
    const start = new Date(rec!.windowStart + 'T10:00:00Z')
    for (let i = 0; i < 12; i++) {
      const d = new Date(start); d.setUTCDate(d.getUTCDate() + i)
      await db.completedSessions.add(session(d.toISOString()))
    }
    await checkChallenges()

    const unlocked = await checkAchievements()
    const ids = unlocked.map(u => u.achievementId)
    expect(ids).toContain('ach_first_challenge')
  })

  it('unlocks a challenge-specific achievement for the 200-day challenge', async () => {
    const challenges = useChallengesStore()
    const achievements = useAchievementsStore()
    await challenges.loadAccepted()
    await achievements.loadUnlocked()

    // Accept with a baseline already at/over target so it completes immediately
    await challenges.accept('chl_200_days_year', 200)
    await checkChallenges()

    const unlocked = await checkAchievements()
    const ids = unlocked.map(u => u.achievementId)
    expect(ids).toContain('ach_first_challenge')
    expect(ids).toContain('ach_challenge_200_days')
  })

  it('does not unlock challenge achievements while none are completed', async () => {
    const challenges = useChallengesStore()
    const achievements = useAchievementsStore()
    await challenges.loadAccepted()
    await achievements.loadUnlocked()

    await challenges.accept('chl_200_days_year', 10) // far from target
    await checkChallenges()

    const unlocked = await checkAchievements()
    const ids = unlocked.map(u => u.achievementId)
    expect(ids).not.toContain('ach_first_challenge')
    expect(ids).not.toContain('ach_challenge_200_days')
  })
})
