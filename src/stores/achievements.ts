import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db'
import { useUserStore } from './user'
import type { AchievementDefinition, UnlockedAchievement } from '../types/achievement'
import achievementsData from '../data/achievements.json'

export const useAchievementsStore = defineStore('achievements', () => {
  const definitions = ref<AchievementDefinition[]>(achievementsData as AchievementDefinition[])
  const unlocked = ref<UnlockedAchievement[]>([])
  const loading = ref(false)

  const unlockedIds = computed(() => new Set(unlocked.value.map(u => u.achievementId)))

  const unlockedCount = computed(() => unlocked.value.length)
  const totalCount = computed(() => definitions.value.length)

  const unseenCount = computed(() => unlocked.value.filter(u => !u.seen).length)

  async function loadUnlocked(): Promise<void> {
    const userStore = useUserStore()
    loading.value = true
    try {
      if (!userStore.currentUser) {
        unlocked.value = []
        return
      }
      unlocked.value = await db.unlockedAchievements
        .where('userId').equals(userStore.currentUser.id)
        .toArray()
    } finally {
      loading.value = false
    }
  }

  async function unlock(achievementId: string): Promise<UnlockedAchievement | null> {
    const userStore = useUserStore()
    if (!userStore.currentUser) return null
    if (unlockedIds.value.has(achievementId)) return null

    const achievement: UnlockedAchievement = {
      achievementId,
      userId: userStore.currentUser.id,
      unlockedAt: new Date().toISOString(),
      seen: false,
    }
    await db.unlockedAchievements.add(achievement)
    unlocked.value.push(achievement)
    return achievement
  }

  async function markSeen(achievementId: string): Promise<void> {
    const item = unlocked.value.find(u => u.achievementId === achievementId)
    if (!item || !item.id) return
    await db.unlockedAchievements.update(item.id, { seen: true })
    item.seen = true
  }

  async function markAllSeen(): Promise<void> {
    const unseen = unlocked.value.filter(u => !u.seen)
    for (const item of unseen) {
      await markSeen(item.achievementId)
    }
  }

  function getDefinition(id: string): AchievementDefinition | undefined {
    return definitions.value.find(d => d.id === id)
  }

  function isUnlocked(id: string): boolean {
    return unlockedIds.value.has(id)
  }

  return {
    definitions,
    unlocked,
    loading,
    unlockedIds,
    unlockedCount,
    totalCount,
    unseenCount,
    loadUnlocked,
    unlock,
    markSeen,
    markAllSeen,
    getDefinition,
    isUnlocked,
  }
})
