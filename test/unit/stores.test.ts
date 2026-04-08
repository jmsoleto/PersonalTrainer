import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore } from '../../src/stores/user'
import { useMeasurementsStore } from '../../src/stores/measurements'
import { useAchievementsStore } from '../../src/stores/achievements'
import {
  Gender,
  FitnessLevel,
  FitnessGoal,
  Equipment,
  MuscleGroup,
} from '../../src/types/enums'
import type { InjuryZone } from '../../src/types/user'

// ---------------------------------------------------------------------------
// User Store
// ---------------------------------------------------------------------------
describe('useUserStore', () => {
  it('createUser creates a user with all fields and returns profile with id', async () => {
    const store = useUserStore()

    const profile = await store.createUser({
      name: 'Test User',
      gender: Gender.Male,
      age: 30,
      weightKg: 80,
      heightCm: 180,
      fitnessLevel: FitnessLevel.Beginner,
      goals: [FitnessGoal.GainMuscle],
      equipment: [Equipment.Dumbbells, Equipment.Bench],
    })

    expect(profile.id).toBeDefined()
    expect(profile.name).toBe('Test User')
    expect(profile.gender).toBe(Gender.Male)
    expect(profile.age).toBe(30)
    expect(profile.weightKg).toBe(80)
    expect(profile.heightCm).toBe(180)
    expect(profile.fitnessLevel).toBe(FitnessLevel.Beginner)
    expect(profile.goals).toEqual([FitnessGoal.GainMuscle])
    expect(profile.equipment).toEqual([Equipment.Dumbbells, Equipment.Bench])
    expect(profile.injuries).toEqual([])
    expect(profile.unitSystem).toBe('metric')
    expect(profile.createdAt).toBeDefined()
    expect(profile.updatedAt).toBeDefined()

    // Also reflected in store state
    expect(store.currentUser).toEqual(profile)
  })

  it('loadUser loads a previously created user', async () => {
    const store = useUserStore()

    await store.createUser({
      name: 'Jane',
      gender: Gender.Female,
      age: 25,
      weightKg: 60,
      heightCm: 165,
      fitnessLevel: FitnessLevel.Intermediate,
      goals: [FitnessGoal.LoseWeight, FitnessGoal.ImproveEndurance],
      equipment: [Equipment.BodyweightOnly],
      unitSystem: 'imperial',
    })

    // Reset store state to simulate a fresh load
    store.currentUser = null

    await store.loadUser()

    expect(store.currentUser).not.toBeNull()
    expect(store.currentUser!.name).toBe('Jane')
    expect(store.currentUser!.gender).toBe(Gender.Female)
    expect(store.currentUser!.age).toBe(25)
    expect(store.currentUser!.unitSystem).toBe('imperial')
  })

  it('updateEquipment updates equipment and returns the previous list', async () => {
    const store = useUserStore()

    await store.createUser({
      name: 'Equipment User',
      gender: Gender.Male,
      age: 28,
      weightKg: 75,
      heightCm: 175,
      fitnessLevel: FitnessLevel.Advanced,
      goals: [FitnessGoal.Strength],
      equipment: [Equipment.Dumbbells],
    })

    const previous = await store.updateEquipment([
      Equipment.Barbell,
      Equipment.Bench,
      Equipment.PullUpBar,
    ])

    expect(previous).toEqual([Equipment.Dumbbells])
    expect(store.currentUser!.equipment).toEqual([
      Equipment.Barbell,
      Equipment.Bench,
      Equipment.PullUpBar,
    ])
  })

  it('updateInjuries updates the injuries array', async () => {
    const store = useUserStore()

    await store.createUser({
      name: 'Injury User',
      gender: Gender.Other,
      age: 35,
      weightKg: 70,
      heightCm: 170,
      fitnessLevel: FitnessLevel.Beginner,
      goals: [FitnessGoal.GeneralFitness],
      equipment: [Equipment.YogaMat],
    })

    const injuries: InjuryZone[] = [
      {
        muscleGroup: MuscleGroup.Shoulders,
        severity: 'mild',
        notes: 'Minor discomfort',
        dateMarked: '2026-04-01',
      },
      {
        muscleGroup: MuscleGroup.Hamstrings,
        severity: 'moderate',
        dateMarked: '2026-04-02',
      },
    ]

    await store.updateInjuries(injuries)

    expect(store.currentUser!.injuries).toEqual(injuries)
    expect(store.currentUser!.injuries).toHaveLength(2)
  })

  it('updateGoals updates the goals array', async () => {
    const store = useUserStore()

    await store.createUser({
      name: 'Goals User',
      gender: Gender.Male,
      age: 40,
      weightKg: 90,
      heightCm: 185,
      fitnessLevel: FitnessLevel.Intermediate,
      goals: [FitnessGoal.LoseWeight],
      equipment: [Equipment.Dumbbells],
    })

    await store.updateGoals([
      FitnessGoal.GainMuscle,
      FitnessGoal.Strength,
      FitnessGoal.Flexibility,
    ])

    expect(store.currentUser!.goals).toEqual([
      FitnessGoal.GainMuscle,
      FitnessGoal.Strength,
      FitnessGoal.Flexibility,
    ])
  })
})

// ---------------------------------------------------------------------------
// Helper: create a user and set it as active before measurement/achievement tests
// ---------------------------------------------------------------------------
async function ensureActiveUser() {
  const userStore = useUserStore()
  if (!userStore.currentUser) {
    await userStore.createUser({
      name: 'Test User',
      gender: Gender.Male,
      age: 30,
      weightKg: 80,
      heightCm: 180,
      fitnessLevel: FitnessLevel.Beginner,
      goals: [FitnessGoal.GeneralFitness],
      equipment: [Equipment.BodyweightOnly],
    })
  }
}

// ---------------------------------------------------------------------------
// Measurements Store
// ---------------------------------------------------------------------------
describe('useMeasurementsStore', () => {
  beforeEach(async () => {
    await ensureActiveUser()
  })

  it('addMeasurement adds a measurement to DB and store', async () => {
    const store = useMeasurementsStore()

    const measurement = await store.addMeasurement({
      date: '2026-04-01',
      weightKg: 80,
      bodyFatPercent: 18,
      waistCm: 85,
    })

    expect(measurement.id).toBeDefined()
    expect(measurement.userId).toBeDefined()
    expect(measurement.date).toBe('2026-04-01')
    expect(measurement.weightKg).toBe(80)
    expect(measurement.bodyFatPercent).toBe(18)
    expect(store.measurements).toHaveLength(1)
    expect(store.measurements[0]).toEqual(measurement)
  })

  it('loadMeasurements loads measurements from DB', async () => {
    const store = useMeasurementsStore()

    await store.addMeasurement({ date: '2026-03-01', weightKg: 82 })
    await store.addMeasurement({ date: '2026-04-01', weightKg: 80 })

    // Reset store state to simulate a fresh load
    store.measurements = []

    await store.loadMeasurements()

    expect(store.measurements).toHaveLength(2)
  })

  it('updateMeasurement updates a specific measurement', async () => {
    const store = useMeasurementsStore()

    const m = await store.addMeasurement({
      date: '2026-04-01',
      weightKg: 80,
      notes: 'Morning weight',
    })

    await store.updateMeasurement(m.id, { weightKg: 79.5, notes: 'Corrected' })

    expect(store.measurements[0].weightKg).toBe(79.5)
    expect(store.measurements[0].notes).toBe('Corrected')
  })

  it('deleteMeasurement removes a measurement', async () => {
    const store = useMeasurementsStore()

    const m1 = await store.addMeasurement({ date: '2026-04-01', weightKg: 80 })
    const m2 = await store.addMeasurement({ date: '2026-04-02', weightKg: 79 })

    await store.deleteMeasurement(m1.id)

    expect(store.measurements).toHaveLength(1)
    expect(store.measurements[0].id).toBe(m2.id)
  })

  it('sorted returns measurements sorted by date', async () => {
    const store = useMeasurementsStore()

    await store.addMeasurement({ date: '2026-04-03', weightKg: 78 })
    await store.addMeasurement({ date: '2026-04-01', weightKg: 80 })
    await store.addMeasurement({ date: '2026-04-02', weightKg: 79 })

    const dates = store.sorted.map(m => m.date)
    expect(dates).toEqual(['2026-04-01', '2026-04-02', '2026-04-03'])
  })

  it('latest returns the most recent measurement', async () => {
    const store = useMeasurementsStore()

    await store.addMeasurement({ date: '2026-04-01', weightKg: 80 })
    await store.addMeasurement({ date: '2026-04-03', weightKg: 78 })
    await store.addMeasurement({ date: '2026-04-02', weightKg: 79 })

    expect(store.latest).not.toBeNull()
    expect(store.latest!.date).toBe('2026-04-03')
    expect(store.latest!.weightKg).toBe(78)
  })

  it('latest returns null when there are no measurements', () => {
    const store = useMeasurementsStore()
    expect(store.latest).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Achievements Store
// ---------------------------------------------------------------------------
describe('useAchievementsStore', () => {
  beforeEach(async () => {
    await ensureActiveUser()
  })

  it('loadUnlocked loads unlocked achievements from DB', async () => {
    const store = useAchievementsStore()

    // Unlock one, then reset and reload
    await store.unlock('ach_first_session')
    store.unlocked = []

    await store.loadUnlocked()

    expect(store.unlocked).toHaveLength(1)
    expect(store.unlocked[0].achievementId).toBe('ach_first_session')
  })

  it('unlock creates a new unlocked achievement and returns it', async () => {
    const store = useAchievementsStore()

    const result = await store.unlock('ach_first_session')

    expect(result).not.toBeNull()
    expect(result!.achievementId).toBe('ach_first_session')
    expect(result!.userId).toBeDefined()
    expect(result!.unlockedAt).toBeDefined()
    expect(result!.seen).toBe(false)
    expect(store.unlocked).toHaveLength(1)
  })

  it('unlock returns null for an already unlocked achievement', async () => {
    const store = useAchievementsStore()

    await store.unlock('ach_5_sessions')
    const duplicate = await store.unlock('ach_5_sessions')

    expect(duplicate).toBeNull()
    expect(store.unlocked).toHaveLength(1)
  })

  it('markSeen marks an achievement as seen', async () => {
    const store = useAchievementsStore()

    await store.unlock('ach_streak_3')
    expect(store.unseenCount).toBe(1)

    await store.markSeen('ach_streak_3')

    const item = store.unlocked.find(u => u.achievementId === 'ach_streak_3')
    expect(item!.seen).toBe(true)
    expect(store.unseenCount).toBe(0)
  })

  it('isUnlocked returns correct boolean', async () => {
    const store = useAchievementsStore()

    expect(store.isUnlocked('ach_100_reps')).toBe(false)

    await store.unlock('ach_100_reps')

    expect(store.isUnlocked('ach_100_reps')).toBe(true)
    expect(store.isUnlocked('ach_500_reps')).toBe(false)
  })

  it('getDefinition returns the achievement definition by id', () => {
    const store = useAchievementsStore()

    const def = store.getDefinition('ach_first_session')

    expect(def).toBeDefined()
    expect(def!.id).toBe('ach_first_session')
    expect(def!.name).toBe('Primer Paso')
    expect(def!.category).toBe('milestone')
    expect(def!.condition.type).toBe('sessions_completed')
    expect(def!.condition.threshold).toBe(1)
  })

  it('getDefinition returns undefined for unknown id', () => {
    const store = useAchievementsStore()

    expect(store.getDefinition('nonexistent')).toBeUndefined()
  })
})
