import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db'
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
    loading.value = true
    try {
      unlocked.value = await db.unlockedAchievements.toArray()
    } finally {
      loading.value = false
    }
  }

  async function unlock(achievementId: string): Promise<UnlockedAchievement | null> {
    if (unlockedIds.value.has(achievementId)) return null

    const achievement: UnlockedAchievement = {
      achievementId,
      unlockedAt: new Date().toISOString(),
      seen: false,
    }
    await db.unlockedAchievements.add(achievement)
    unlocked.value.push(achievement)
    return achievement
  }

  async function markSeen(achievementId: string): Promise<void> {
    await db.unlockedAchievements.update(achievementId, { seen: true })
    const item = unlocked.value.find(u => u.achievementId === achievementId)
    if (item) item.seen = true
  }

  async function markAllSeen(): Promise<void> {
    const unseen = unlocked.value.filter(u => !u.seen)
    for (const item of unseen) {
      await db.unlockedAchievements.update(item.achievementId, { seen: true })
      item.seen = true
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
