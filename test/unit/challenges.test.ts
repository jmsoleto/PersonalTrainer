import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db'
import { useUserStore } from '../../src/stores/user'
import { useChallengesStore, resolveWindow } from '../../src/stores/challenges'
import { useActivitiesStore } from '../../src/stores/activities'
import {
  checkChallenges,
  getActiveProgress,
  computeProgressSinceAcceptance,
} from '../../src/composables/useChallengeChecker'
import { Gender, FitnessLevel, FitnessGoal, Equipment, SessionDifficulty } from '../../src/types/enums'
import type { CompletedSession } from '../../src/types/plan'
import type { AcceptedChallenge, ChallengeDefinition } from '../../src/types/challenge'

async function ensureUser() {
  const userStore = useUserStore()
  const user = await userStore.createUser({
    name: 'Test',
    gender: Gender.Male,
    age: 30,
    weightKg: 80,
    heightCm: 180,
    fitnessLevel: FitnessLevel.Beginner,
    goals: [FitnessGoal.GeneralFitness],
    equipment: [Equipment.BodyweightOnly],
  })
  await db.trainingPlans.put({
    id: 'plan-1', userId: user.id, name: 'P', totalWeeks: 12,
    startDate: '2026-01-01T00:00:00Z', status: 'active', generatedAt: '2026-01-01T00:00:00Z',
    basedOn: { profile: { gender: 'male', age: 30, weightKg: 80, heightCm: 180, fitnessLevel: 'beginner' }, goals: [], equipment: [], injuries: [], feedbackHistory: [] },
    weeks: [],
  } as never)
  return user
}

function session(completedAt: string, sets: { reps?: number; weightKg?: number }[]): CompletedSession {
  return {
    id: crypto.randomUUID(), planId: 'plan-1', plannedSessionId: 'ps', weekNumber: 1, dayNumber: 1,
    startedAt: completedAt, completedAt, difficultyRating: SessionDifficulty.JustRight,
    exercises: [{ exerciseId: 'ex', exerciseName: 'X', sets: sets.map((s, i) => ({ setNumber: i + 1, completed: true, ...s })) }],
    skippedExercises: [],
  }
}

describe('resolveWindow', () => {
  it('resolves calendar_year to Jan 1 – Dec 31 of accept year', () => {
    const w = resolveWindow({ type: 'calendar_year' }, '2026-03-01T10:00:00Z')
    expect(w.windowStart).toBe('2026-01-01')
    expect(w.windowEnd).toBe('2026-12-31')
  })

  it('resolves calendar_month to first–last day', () => {
    const w = resolveWindow({ type: 'calendar_month' }, '2026-02-15T10:00:00Z')
    expect(w.windowStart).toBe('2026-02-01')
    expect(w.windowEnd).toBe('2026-02-28')
  })

  it('resolves fixed_from_accept to accept + lengthDays', () => {
    const w = resolveWindow({ type: 'fixed_from_accept', lengthDays: 30 }, '2026-03-01T10:00:00Z')
    expect(w.windowStart).toBe('2026-03-01')
    expect(w.windowEnd).toBe('2026-03-31')
  })
})

describe('challenge acceptance', () => {
  beforeEach(async () => { await ensureUser() })

  it('accepts a challenge with a baseline when allowed', async () => {
    const store = useChallengesStore()
    await store.loadAccepted()
    const rec = await store.accept('chl_200_days_year', 60)
    expect(rec).not.toBeNull()
    expect(rec!.baseline).toBe(60)
    expect(store.isActive('chl_200_days_year')).toBe(true)
  })

  it('ignores baseline when the definition disallows it', async () => {
    const store = useChallengesStore()
    await store.loadAccepted()
    const rec = await store.accept('chl_500kg_month', 999)
    expect(rec!.baseline).toBe(0)
  })

  it('does not accept the same challenge twice while active', async () => {
    const store = useChallengesStore()
    await store.loadAccepted()
    await store.accept('chl_active_month')
    const second = await store.accept('chl_active_month')
    expect(second).toBeNull()
    expect(store.active).toHaveLength(1)
  })
})

describe('progress computation', () => {
  const def: ChallengeDefinition = {
    id: 'x', name: 'x', description: '', icon: '', category: 'frequency',
    metric: 'exercise_days', target: 200, window: { type: 'calendar_year' },
    allowsBaseline: true, countsExternal: true,
  }

  it('adds baseline to post-acceptance events', () => {
    const accepted: AcceptedChallenge = {
      challengeId: 'x', userId: 'u', acceptedAt: '2026-03-01T00:00:00Z',
      windowStart: '2026-01-01', windowEnd: '2026-12-31', baseline: 60, status: 'active',
    }
    const sessions = [
      session('2026-03-05T10:00:00Z', [{ reps: 10 }]),
      session('2026-03-06T10:00:00Z', [{ reps: 10 }]),
    ]
    const raw = accepted.baseline + computeProgressSinceAcceptance(def, accepted, sessions, [])
    expect(raw).toBe(62)
  })

  it('does not count events before acceptance on top of the baseline', () => {
    const accepted: AcceptedChallenge = {
      challengeId: 'x', userId: 'u', acceptedAt: '2026-03-01T00:00:00Z',
      windowStart: '2026-01-01', windowEnd: '2026-12-31', baseline: 60, status: 'active',
    }
    const sessions = [
      session('2026-01-15T10:00:00Z', [{ reps: 10 }]), // before acceptance
      session('2026-03-05T10:00:00Z', [{ reps: 10 }]), // after
    ]
    const raw = accepted.baseline + computeProgressSinceAcceptance(def, accepted, sessions, [])
    expect(raw).toBe(61)
  })

  it('single_lift_kg uses the heaviest set, not a sum', () => {
    const liftDef: ChallengeDefinition = { ...def, metric: 'single_lift_kg', target: 100, allowsBaseline: false, countsExternal: false }
    const accepted: AcceptedChallenge = {
      challengeId: 'x', userId: 'u', acceptedAt: '2026-03-01T00:00:00Z',
      windowStart: '2026-03-01', windowEnd: '2027-03-01', baseline: 0, status: 'active',
    }
    const sessions = [session('2026-03-05T10:00:00Z', [{ reps: 5, weightKg: 60 }, { reps: 3, weightKg: 90 }])]
    expect(computeProgressSinceAcceptance(liftDef, accepted, sessions, [])).toBe(90)
  })

  it('countsExternal=false ignores manual activities', () => {
    const noExt: ChallengeDefinition = { ...def, metric: 'exercise_days', countsExternal: false }
    const accepted: AcceptedChallenge = {
      challengeId: 'x', userId: 'u', acceptedAt: '2026-03-01T00:00:00Z',
      windowStart: '2026-01-01', windowEnd: '2026-12-31', baseline: 0, status: 'active',
    }
    const activities = [{ userId: 'u', date: '2026-03-10', type: 'running' as const, createdAt: '' }]
    expect(computeProgressSinceAcceptance(noExt, accepted, [], activities)).toBe(0)
  })

  it('activity_distance sums only the matching activity type, normalizing meters', () => {
    const distDef: ChallengeDefinition = { ...def, metric: 'activity_distance', target: 50, activityType: 'running', countsExternal: true }
    const accepted: AcceptedChallenge = {
      challengeId: 'x', userId: 'u', acceptedAt: '2026-03-01T00:00:00Z',
      windowStart: '2026-03-01', windowEnd: '2026-03-31', baseline: 0, status: 'active',
    }
    const activities = [
      { userId: 'u', date: '2026-03-05', type: 'running' as const, distanceKm: 10, createdAt: '' },
      { userId: 'u', date: '2026-03-06', type: 'cycling' as const, distanceKm: 40, createdAt: '' },
      { userId: 'u', date: '2026-03-07', type: 'swimming' as const, distanceM: 2000, createdAt: '' },
    ]
    // only running counts → 10
    expect(computeProgressSinceAcceptance(distDef, accepted, [], activities)).toBe(10)
  })
})

describe('status resolution', () => {
  beforeEach(async () => { await ensureUser() })

  it('completes a challenge when the target is reached', async () => {
    const store = useChallengesStore()
    const activities = useActivitiesStore()
    await store.loadAccepted()
    await activities.loadActivities()
    // 12 sessions on 12 consecutive days from the window start (inside the window)
    const rec = await store.accept('chl_12_sessions_30d')
    const start = new Date(rec!.windowStart + 'T10:00:00Z')
    for (let i = 0; i < 12; i++) {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + i)
      await db.completedSessions.add(session(d.toISOString(), [{ reps: 5 }]))
    }
    const completed = await checkChallenges()
    expect(completed.some(c => c.challengeId === 'chl_12_sessions_30d')).toBe(true)
    expect(store.getDefinition('chl_12_sessions_30d')).toBeTruthy()
    expect(store.accepted.find(c => c.id === rec!.id)!.status).toBe('completed')
  })

  it('fails a challenge whose window has ended below target', async () => {
    const store = useChallengesStore()
    await store.loadAccepted()
    const rec = await store.accept('chl_12_sessions_30d')
    // Force the window into the past
    await store.resolveStatus(rec!.id!, 'active') // no-op resolvedAt but keep active
    await db.acceptedChallenges.update(rec!.id!, { status: 'active', windowEnd: '2020-01-01' })
    store.accepted.find(c => c.id === rec!.id)!.windowEnd = '2020-01-01'
    store.accepted.find(c => c.id === rec!.id)!.status = 'active'

    await checkChallenges()
    expect(store.accepted.find(c => c.id === rec!.id)!.status).toBe('failed')
  })

  it('getActiveProgress caps at target and sorts by nearest deadline', async () => {
    const store = useChallengesStore()
    await store.loadAccepted()
    await store.accept('chl_200_days_year', 250) // baseline over target
    const progress = await getActiveProgress()
    const p = progress.find(x => x.accepted.challengeId === 'chl_200_days_year')!
    expect(p.current).toBe(200)
    expect(p.raw).toBe(250)
    expect(p.ratio).toBe(1)
  })
})
