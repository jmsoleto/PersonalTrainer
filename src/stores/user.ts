import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import type { UserProfile, InjuryZone } from '../types/user'
import type { Equipment, FitnessGoal, FitnessLevel, Gender, UnitSystem } from '../types/enums'

const ACTIVE_USER_KEY = 'pt-active-user-id'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<UserProfile | null>(null)
  const allUsers = ref<UserProfile[]>([])
  const loading = ref(false)

  function getStoredActiveUserId(): string | null {
    return localStorage.getItem(ACTIVE_USER_KEY)
  }

  function setStoredActiveUserId(id: string | null): void {
    if (id) {
      localStorage.setItem(ACTIVE_USER_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY)
    }
  }

  async function loadAllUsers(): Promise<void> {
    allUsers.value = await db.userProfiles.orderBy('createdAt').toArray()
  }

  async function loadUser(): Promise<void> {
    loading.value = true
    try {
      await loadAllUsers()
      const storedId = getStoredActiveUserId()
      if (storedId) {
        const found = allUsers.value.find(u => u.id === storedId)
        if (found) {
          currentUser.value = found
          return
        }
      }
      // Fallback to first user
      currentUser.value = allUsers.value[0] ?? null
      if (currentUser.value) {
        setStoredActiveUserId(currentUser.value.id)
      }
    } finally {
      loading.value = false
    }
  }

  async function selectUser(userId: string): Promise<void> {
    await loadAllUsers()
    const user = allUsers.value.find(u => u.id === userId)
    if (user) {
      currentUser.value = user
      setStoredActiveUserId(user.id)
    }
  }

  async function createUser(data: {
    name: string
    gender: Gender
    age: number
    weightKg: number
    heightCm: number
    fitnessLevel: FitnessLevel
    goals: FitnessGoal[]
    equipment: Equipment[]
    unitSystem?: UnitSystem
  }): Promise<UserProfile> {
    const now = new Date().toISOString()
    const profile: UserProfile = {
      id: crypto.randomUUID(),
      name: data.name,
      gender: data.gender,
      age: data.age,
      weightKg: data.weightKg,
      heightCm: data.heightCm,
      fitnessLevel: data.fitnessLevel,
      goals: data.goals,
      equipment: data.equipment,
      injuries: [],
      unitSystem: data.unitSystem ?? 'metric',
      createdAt: now,
      updatedAt: now,
    }

    await db.userProfiles.add(profile)
    currentUser.value = profile
    setStoredActiveUserId(profile.id)
    await loadAllUsers()
    return profile
  }

  async function deleteUser(userId: string): Promise<void> {
    await db.userProfiles.delete(userId)
    // Clean up user's data
    await db.trainingPlans.where('userId').equals(userId).delete()
    await db.bodyMeasurements.where('userId').equals(userId).delete()
    await db.unlockedAchievements.where('userId').equals(userId).delete()
    await db.manualActivities.where('userId').equals(userId).delete()
    await db.acceptedChallenges.where('userId').equals(userId).delete()

    if (currentUser.value?.id === userId) {
      currentUser.value = null
      setStoredActiveUserId(null)
    }
    await loadAllUsers()
  }

  async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!currentUser.value) return

    const updated = JSON.parse(JSON.stringify({
      ...currentUser.value,
      ...updates,
      updatedAt: new Date().toISOString(),
    }))

    await db.userProfiles.put(updated)
    currentUser.value = updated
    // Update in allUsers too
    const idx = allUsers.value.findIndex(u => u.id === updated.id)
    if (idx >= 0) allUsers.value[idx] = updated
  }

  async function updateEquipment(equipment: Equipment[]): Promise<Equipment[] | undefined> {
    const previous = currentUser.value?.equipment
    await updateProfile({ equipment })
    return previous
  }

  async function updateInjuries(injuries: InjuryZone[]): Promise<void> {
    await updateProfile({ injuries })
  }

  async function updateGoals(goals: FitnessGoal[]): Promise<void> {
    await updateProfile({ goals })
  }

  function logout(): void {
    currentUser.value = null
    setStoredActiveUserId(null)
  }

  return {
    currentUser,
    allUsers,
    loading,
    loadUser,
    loadAllUsers,
    selectUser,
    createUser,
    deleteUser,
    updateProfile,
    updateEquipment,
    updateInjuries,
    updateGoals,
    logout,
  }
})
