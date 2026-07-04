import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db'
import { useUserStore } from './user'
import type { ManualActivity } from '../types/activity'

export const useActivitiesStore = defineStore('activities', () => {
  const activities = ref<ManualActivity[]>([])
  const loading = ref(false)

  const sorted = computed(() =>
    [...activities.value].sort((a, b) => b.date.localeCompare(a.date)),
  )

  async function loadActivities(): Promise<void> {
    const userStore = useUserStore()
    loading.value = true
    try {
      if (!userStore.currentUser) {
        activities.value = []
        return
      }
      activities.value = await db.manualActivities
        .where('userId').equals(userStore.currentUser.id)
        .toArray()
    } finally {
      loading.value = false
    }
  }

  async function addActivity(
    data: Omit<ManualActivity, 'id' | 'userId' | 'createdAt'>,
  ): Promise<ManualActivity | null> {
    const userStore = useUserStore()
    if (!userStore.currentUser) return null
    const activity: ManualActivity = {
      ...data,
      userId: userStore.currentUser.id,
      createdAt: new Date().toISOString(),
    }
    const id = await db.manualActivities.add(activity)
    activity.id = id as number
    activities.value.push(activity)
    return activity
  }

  async function updateActivity(id: number, data: Partial<ManualActivity>): Promise<void> {
    await db.manualActivities.update(id, data)
    const idx = activities.value.findIndex(a => a.id === id)
    if (idx >= 0) {
      activities.value[idx] = { ...activities.value[idx], ...data }
    }
  }

  async function deleteActivity(id: number): Promise<void> {
    await db.manualActivities.delete(id)
    activities.value = activities.value.filter(a => a.id !== id)
  }

  return {
    activities,
    loading,
    sorted,
    loadActivities,
    addActivity,
    updateActivity,
    deleteActivity,
  }
})
