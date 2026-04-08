import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import { useUserStore } from '../../src/stores/user'
import { useAchievementsStore } from '../../src/stores/achievements'
import { useMeasurementsStore } from '../../src/stores/measurements'
import { checkAchievements } from '../../src/composables/useAchievementChecker'
import { SessionDifficulty, Gender, FitnessLevel, FitnessGoal, Equipment } from '../../src/types/enums'
import type { CompletedSession } from '../../src/types/plan'

async function ensureActiveUser() {
  const userStore = useUserStore()
  if (!userStore.currentUser) {
    const user = await userStore.createUser({
      name: 'Test User',
      gender: Gender.Male,
      age: 30,
      weightKg: 80,
      heightCm: 180,
      fitnessLevel: FitnessLevel.Beginner,
      goals: [FitnessGoal.GeneralFitness],
      equipment: [Equipment.BodyweightOnly],
    })
    // Add a plan so completedSessions with planId 'plan-1' are associated to this user
    await db.trainingPlans.put({
      id: 'plan-1',
      userId: user.id,
      name: 'Test Plan',
      totalWeeks: 12,
      startDate: '2026-01-01T00:00:00Z',
      status: 'active',
      generatedAt: '2026-01-01T00:00:00Z',
      basedOn: { profile: { gender: 'male', age: 30, weightKg: 80, heightCm: 180, fitnessLevel: 'beginner' }, goals: [], equipment: [], injuries: [], feedbackHistory: [] },
      weeks: [],
    } as any)
  }
}

function makeSession(overrides: Partial<CompletedSession> = {}): CompletedSession {
  return {
    id: crypto.randomUUID(),
    planId: 'plan-1',
    plannedSessionId: 'ps-1',
    weekNumber: 1,
    dayNumber: 1,
    startedAt: '2026-01-01T10:00:00Z',
    completedAt: '2026-01-01T11:00:00Z',
    difficultyRating: SessionDifficulty.JustRight,
    exercises: [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Press de banca',
        sets: [
          { setNumber: 1, reps: 10, weightKg: 50, completed: true },
          { setNumber: 2, reps: 8, weightKg: 50, completed: true },
        ],
      },
    ],
    skippedExercises: [],
    ...overrides,
  }
}

describe('checkAchievements', () => {
  beforeEach(async () => {
    await ensureActiveUser()
  })

  it('unlocks first session achievement after 1 session', async () => {
    const achievementsStore = useAchievementsStore()
    await achievementsStore.loadUnlocked()

    await db.completedSessions.add(makeSession())

    const unlocked = await checkAchievements()
    const ids = unlocked.map(u => u.achievementId)
    expect(ids).toContain('ach_first_session')
  })

  it('unlocks 5 sessions achievement', async () => {
    const achievementsStore = useAchievementsStore()
    await achievementsStore.loadUnlocked()

    for (let i = 0; i < 5; i++) {
      await db.completedSessions.add(makeSession({
        id: crypto.randomUUID(),
        completedAt: `2026-01-0${i + 1}T11:00:00Z`,
      }))
    }

    const unlocked = await checkAchievements()
    const ids = unlocked.map(u => u.achievementId)
    expect(ids).toContain('ach_first_session')
    expect(ids).toContain('ach_5_sessions')
  })

  it('unlocks streak achievement for consecutive days', async () => {
    const achievementsStore = useAchievementsStore()
    await achievementsStore.loadUnlocked()

    for (let i = 1; i <= 3; i++) {
      await db.completedSessions.add(makeSession({
        id: crypto.randomUUID(),
        completedAt: `2026-01-0${i}T11:00:00Z`,
      }))
    }

    const unlocked = await checkAchievements()
    const ids = unlocked.map(u => u.achievementId)
    expect(ids).toContain('ach_streak_3')
  })

  it('unlocks reps achievement based on total reps', async () => {
    const achievementsStore = useAchievementsStore()
    await achievementsStore.loadUnlocked()

    // 10 sessions x 2 sets x 10 reps = 200 reps total
    for (let i = 0; i < 10; i++) {
      await db.completedSessions.add(makeSession({
        id: crypto.randomUUID(),
        exercises: [{
          exerciseId: 'ex-1',
          exerciseName: 'Squat',
          sets: [
            { setNumber: 1, reps: 10, weightKg: 0, completed: true },
            { setNumber: 2, reps: 10, weightKg: 0, completed: true },
          ],
        }],
      }))
    }

    const unlocked = await checkAchievements()
    const ids = unlocked.map(u => u.achievementId)
    expect(ids).toContain('ach_100_reps')
  })

  it('unlocks measurement achievement', async () => {
    const achievementsStore = useAchievementsStore()
    const measurementsStore = useMeasurementsStore()
    await achievementsStore.loadUnlocked()

    await measurementsStore.addMeasurement({
      date: '2026-01-01',
      weightKg: 75,
    })

    const unlocked = await checkAchievements()
    const ids = unlocked.map(u => u.achievementId)
    expect(ids).toContain('ach_first_measurement')
  })

  it('does not re-unlock already unlocked achievements', async () => {
    const achievementsStore = useAchievementsStore()
    await achievementsStore.loadUnlocked()

    await db.completedSessions.add(makeSession())
    const first = await checkAchievements()
    expect(first.some(u => u.achievementId === 'ach_first_session')).toBe(true)

    // Check again - should not unlock again
    const second = await checkAchievements()
    expect(second.some(u => u.achievementId === 'ach_first_session')).toBe(false)
  })
})
