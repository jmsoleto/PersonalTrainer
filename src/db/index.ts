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
  }
}

export const db = new PersonalTrainerDB()
