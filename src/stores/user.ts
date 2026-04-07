import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import type { UserProfile, InjuryZone } from '../types/user'
import type { Equipment, FitnessGoal, FitnessLevel, Gender, UnitSystem } from '../types/enums'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<UserProfile | null>(null)
  const loading = ref(false)

  async function loadUser(): Promise<void> {
    loading.value = true
    try {
      const users = await db.userProfiles.toArray()
      currentUser.value = users[0] ?? null
    } finally {
      loading.value = false
    }
  }

  async function createUser(data: {
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
    return profile
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

  return {
    currentUser,
    loading,
    loadUser,
    createUser,
    updateProfile,
    updateEquipment,
    updateInjuries,
    updateGoals,
  }
})
