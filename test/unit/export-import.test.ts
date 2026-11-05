import { describe, it, expect } from 'vitest'
import { db } from '../../src/db'
import { exportAllData, importAllData } from '../../src/db/export-import'
import type { ExportData } from '../../src/db/export-import'

describe('export/import', () => {
  it('exports empty database', async () => {
    const data = await exportAllData()
    expect(data.version).toBe(3)
    expect(data.exportedAt).toBeTruthy()
    expect(data.userProfiles).toEqual([])
    expect(data.trainingPlans).toEqual([])
    expect(data.completedSessions).toEqual([])
    expect(data.unlockedAchievements).toEqual([])
    expect(data.bodyMeasurements).toEqual([])
    expect(data.manualActivities).toEqual([])
    expect(data.acceptedChallenges).toEqual([])
    expect(data.dayTemplates).toEqual([])
    expect(data.weekTemplates).toEqual([])
    expect(data.planTemplates).toEqual([])
  })

  it('exports and imports data round-trip', async () => {
    // Add some test data
    await db.userProfiles.add({
      id: 'user-1',
      name: 'Test User',
      gender: 'male',
      age: 30,
      weightKg: 80,
      heightCm: 180,
      fitnessLevel: 'intermediate',
      goals: ['gain_muscle'],
      equipment: ['dumbbells'],
      injuries: [],
      unitSystem: 'metric',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    } as never)

    await db.bodyMeasurements.add({
      id: 'meas-1',
      userId: 'user-1',
      date: '2026-01-01',
      weightKg: 80,
      waistCm: 85,
    } as never)

    await db.unlockedAchievements.add({
      achievementId: 'ach_first_session',
      userId: 'user-1',
      unlockedAt: '2026-01-01T12:00:00Z',
      seen: true,
    })

    // Export
    const exported = await exportAllData()
    expect(exported.userProfiles).toHaveLength(1)
    expect(exported.bodyMeasurements).toHaveLength(1)
    expect(exported.unlockedAchievements).toHaveLength(1)

    // Clear DB
    await db.userProfiles.clear()
    await db.bodyMeasurements.clear()
    await db.unlockedAchievements.clear()

    // Verify cleared
    expect(await db.userProfiles.count()).toBe(0)
    expect(await db.bodyMeasurements.count()).toBe(0)

    // Import
    await importAllData(exported)

    // Verify restored
    expect(await db.userProfiles.count()).toBe(1)
    expect(await db.bodyMeasurements.count()).toBe(1)
    expect(await db.unlockedAchievements.count()).toBe(1)

    const user = await db.userProfiles.get('user-1')
    expect(user?.age).toBe(30)
    expect(user?.weightKg).toBe(80)
  })

  it('rejects unsupported version', async () => {
    const data: ExportData = {
      version: 99 as never,
      exportedAt: new Date().toISOString(),
      userProfiles: [],
      trainingPlans: [],
      completedSessions: [],
      unlockedAchievements: [],
      bodyMeasurements: [],
    }
    await expect(importAllData(data)).rejects.toThrow('Unsupported export version')
  })

  it('clears existing data before importing', async () => {
    // Add pre-existing data
    await db.bodyMeasurements.add({
      id: 'old-1',
      date: '2025-01-01',
      weightKg: 70,
    } as never)

    const importData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      userProfiles: [],
      trainingPlans: [],
      completedSessions: [],
      unlockedAchievements: [],
      bodyMeasurements: [{ id: 'new-1', userId: 'user-x', date: '2026-06-01', weightKg: 75 }],
    }

    await importAllData(importData)

    const measurements = await db.bodyMeasurements.toArray()
    expect(measurements).toHaveLength(1)
    expect(measurements[0].id).toBe('new-1')
  })

  it('round-trips workout templates with their references (v3)', async () => {
    const now = '2026-11-03T00:00:00Z'
    const day = {
      id: 'day-1', userId: 'user-1', name: 'Pierna A',
      warmup: [],
      main: [{ id: 'b1', kind: 'straight', items: [{ exerciseId: 'ex_bodyweight_squat', mode: 'reps', sets: [{ reps: 10, weightKg: 40, restSeconds: 90 }] }] }],
      cooldown: [],
      createdAt: now, updatedAt: now,
    }
    const week = {
      id: 'week-1', userId: 'user-1', name: 'Base',
      slots: [{ kind: 'training', dayTemplateId: 'day-1' }, { kind: 'rest' }, { kind: 'rest' }, { kind: 'rest' }, { kind: 'rest' }, { kind: 'rest' }, { kind: 'rest' }],
      createdAt: now, updatedAt: now,
    }
    const plan = { id: 'plan-1', userId: 'user-1', name: 'Mi plan', weekTemplateIds: ['week-1', 'week-1'], createdAt: now, updatedAt: now }
    await db.dayTemplates.add(day as never)
    await db.weekTemplates.add(week as never)
    await db.planTemplates.add(plan as never)

    const exported = JSON.parse(JSON.stringify(await exportAllData())) as ExportData
    await db.dayTemplates.clear()
    await db.weekTemplates.clear()
    await db.planTemplates.clear()

    await importAllData(exported)

    expect(await db.dayTemplates.get('day-1')).toEqual(day)
    expect(await db.weekTemplates.get('week-1')).toEqual(week)
    expect(await db.planTemplates.get('plan-1')).toEqual(plan)
  })

  it('imports a v2 backup (no templates) leaving an empty library', async () => {
    await db.dayTemplates.add({ id: 'stale', userId: 'u', name: 'x', warmup: [], main: [], cooldown: [], createdAt: '', updatedAt: '' } as never)
    const v2: ExportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      userProfiles: [],
      trainingPlans: [],
      completedSessions: [],
      unlockedAchievements: [],
      bodyMeasurements: [{ id: 'm1', userId: 'u', date: '2026-06-01', weightKg: 75 }],
      manualActivities: [],
      acceptedChallenges: [],
    }
    await importAllData(v2)
    expect(await db.bodyMeasurements.count()).toBe(1)
    expect(await db.dayTemplates.count()).toBe(0)
    expect(await db.weekTemplates.count()).toBe(0)
    expect(await db.planTemplates.count()).toBe(0)
  })
})
