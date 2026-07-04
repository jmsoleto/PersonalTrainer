import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore } from '../../src/stores/user'
import { useActivitiesStore } from '../../src/stores/activities'
import { Gender, FitnessLevel, FitnessGoal, Equipment } from '../../src/types/enums'

async function makeUser(name: string) {
  const userStore = useUserStore()
  return userStore.createUser({
    name,
    gender: Gender.Male,
    age: 30,
    weightKg: 80,
    heightCm: 180,
    fitnessLevel: FitnessLevel.Beginner,
    goals: [FitnessGoal.GeneralFitness],
    equipment: [Equipment.BodyweightOnly],
  })
}

describe('activities store', () => {
  beforeEach(async () => {
    await makeUser('A')
  })

  it('adds an activity for the current user', async () => {
    const store = useActivitiesStore()
    const created = await store.addActivity({ date: '2026-03-10', type: 'running', distanceKm: 8 })
    expect(created).not.toBeNull()
    expect(created!.id).toBeTypeOf('number')
    await store.loadActivities()
    expect(store.activities).toHaveLength(1)
    expect(store.activities[0].distanceKm).toBe(8)
  })

  it('stores swimming distance in meters', async () => {
    const store = useActivitiesStore()
    await store.addActivity({ date: '2026-03-11', type: 'swimming', distanceM: 1500 })
    await store.loadActivities()
    expect(store.activities[0].distanceM).toBe(1500)
  })

  it('deletes an activity', async () => {
    const store = useActivitiesStore()
    const a = await store.addActivity({ date: '2026-03-10', type: 'hiking' })
    await store.deleteActivity(a!.id!)
    expect(store.activities.find(x => x.id === a!.id)).toBeUndefined()
  })

  it('isolates activities per user', async () => {
    const store = useActivitiesStore()
    await store.addActivity({ date: '2026-03-10', type: 'running' })

    const userStore = useUserStore()
    const b = await makeUser('B')
    await userStore.selectUser(b.id)
    await store.loadActivities()
    expect(store.activities).toHaveLength(0)

    await store.addActivity({ date: '2026-03-12', type: 'cycling', distanceKm: 20 })
    await store.loadActivities()
    expect(store.activities).toHaveLength(1)
    expect(store.activities[0].type).toBe('cycling')
  })
})
