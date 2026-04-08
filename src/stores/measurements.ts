import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db'
import { useUserStore } from './user'
import type { BodyMeasurement } from '../types/measurement'

export const useMeasurementsStore = defineStore('measurements', () => {
  const measurements = ref<BodyMeasurement[]>([])
  const loading = ref(false)

  const sorted = computed(() =>
    [...measurements.value].sort((a, b) => a.date.localeCompare(b.date)),
  )

  const latest = computed(() =>
    sorted.value.length > 0 ? sorted.value[sorted.value.length - 1] : null,
  )

  async function loadMeasurements(): Promise<void> {
    const userStore = useUserStore()
    loading.value = true
    try {
      if (!userStore.currentUser) {
        measurements.value = []
        return
      }
      measurements.value = await db.bodyMeasurements
        .where('userId').equals(userStore.currentUser.id)
        .sortBy('date')
    } finally {
      loading.value = false
    }
  }

  async function addMeasurement(data: Omit<BodyMeasurement, 'id' | 'userId'>): Promise<BodyMeasurement> {
    const userStore = useUserStore()
    if (!userStore.currentUser) throw new Error('No active user')
    const measurement: BodyMeasurement = {
      ...data,
      id: crypto.randomUUID(),
      userId: userStore.currentUser.id,
    }
    await db.bodyMeasurements.add(measurement)
    measurements.value.push(measurement)
    return measurement
  }

  async function updateMeasurement(id: string, data: Partial<BodyMeasurement>): Promise<void> {
    await db.bodyMeasurements.update(id, data)
    const idx = measurements.value.findIndex(m => m.id === id)
    if (idx >= 0) {
      measurements.value[idx] = { ...measurements.value[idx], ...data }
    }
  }

  async function deleteMeasurement(id: string): Promise<void> {
    await db.bodyMeasurements.delete(id)
    measurements.value = measurements.value.filter(m => m.id !== id)
  }

  return {
    measurements,
    loading,
    sorted,
    latest,
    loadMeasurements,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
  }
})
