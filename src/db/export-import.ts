import { db } from './index'

export interface ExportData {
  version: 1
  exportedAt: string
  userProfiles: unknown[]
  trainingPlans: unknown[]
  completedSessions: unknown[]
  unlockedAchievements: unknown[]
  bodyMeasurements: unknown[]
}

export async function exportAllData(): Promise<ExportData> {
  const [userProfiles, trainingPlans, completedSessions, unlockedAchievements, bodyMeasurements] =
    await Promise.all([
      db.userProfiles.toArray(),
      db.trainingPlans.toArray(),
      db.completedSessions.toArray(),
      db.unlockedAchievements.toArray(),
      db.bodyMeasurements.toArray(),
    ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userProfiles,
    trainingPlans,
    completedSessions,
    unlockedAchievements,
    bodyMeasurements,
  }
}

export async function importAllData(data: ExportData): Promise<void> {
  if (data.version !== 1) {
    throw new Error(`Unsupported export version: ${data.version}`)
  }

  await db.transaction(
    'rw',
    [db.userProfiles, db.trainingPlans, db.completedSessions, db.unlockedAchievements, db.bodyMeasurements],
    async () => {
      await db.userProfiles.clear()
      await db.trainingPlans.clear()
      await db.completedSessions.clear()
      await db.unlockedAchievements.clear()
      await db.bodyMeasurements.clear()

      await db.userProfiles.bulkAdd(data.userProfiles as never[])
      await db.trainingPlans.bulkAdd(data.trainingPlans as never[])
      await db.completedSessions.bulkAdd(data.completedSessions as never[])
      await db.unlockedAchievements.bulkAdd(data.unlockedAchievements as never[])
      await db.bodyMeasurements.bulkAdd(data.bodyMeasurements as never[])
    },
  )
}

export function downloadJson(data: ExportData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `personal-trainer-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
