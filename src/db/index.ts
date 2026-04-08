import Dexie, { type Table } from 'dexie'
import type { UserProfile } from '../types/user'
import type { TrainingPlan, CompletedSession } from '../types/plan'
import type { UnlockedAchievement } from '../types/achievement'
import type { BodyMeasurement } from '../types/measurement'

class PersonalTrainerDB extends Dexie {
  userProfiles!: Table<UserProfile>
  trainingPlans!: Table<TrainingPlan>
  completedSessions!: Table<CompletedSession>
  unlockedAchievements!: Table<UnlockedAchievement>
  bodyMeasurements!: Table<BodyMeasurement>

  constructor() {
    super('PersonalTrainerDB')

    this.version(1).stores({
      userProfiles: 'id, createdAt',
      trainingPlans: 'id, userId, status, startDate',
      completedSessions: 'id, planId, [weekNumber+dayNumber], startedAt',
      unlockedAchievements: 'achievementId, unlockedAt',
      bodyMeasurements: 'id, date',
    })

    this.version(2).stores({
      userProfiles: 'id, createdAt',
      trainingPlans: 'id, userId, status, startDate',
      completedSessions: 'id, planId, [weekNumber+dayNumber], startedAt',
      unlockedAchievements: '++id, achievementId, userId, [achievementId+userId], unlockedAt',
      bodyMeasurements: 'id, userId, date',
    }).upgrade(async tx => {
      // Find the first user to assign as owner of orphaned data
      const users = await tx.table('userProfiles').toArray()
      const defaultUserId = users[0]?.id ?? 'migrated-user'

      // Add name to existing users without one
      await tx.table('userProfiles').toCollection().modify(user => {
        if (!user.name) {
          user.name = 'Usuario'
        }
      })

      // Add userId to existing body measurements
      await tx.table('bodyMeasurements').toCollection().modify(m => {
        if (!m.userId) {
          m.userId = defaultUserId
        }
      })

      // Add userId to existing unlocked achievements
      await tx.table('unlockedAchievements').toCollection().modify(a => {
        if (!a.userId) {
          a.userId = defaultUserId
        }
      })
    })
  }
}

export const db = new PersonalTrainerDB()
