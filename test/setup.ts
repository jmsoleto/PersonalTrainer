import 'fake-indexeddb/auto'
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach } from 'vitest'
import { db } from '../src/db'

beforeEach(async () => {
  setActivePinia(createPinia())

  // Clear all tables before each test
  await db.userProfiles.clear()
  await db.trainingPlans.clear()
  await db.completedSessions.clear()
  await db.unlockedAchievements.clear()
  await db.bodyMeasurements.clear()
})
