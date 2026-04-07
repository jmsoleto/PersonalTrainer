import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Exercise } from '../types/exercise'
import type { Equipment, MuscleGroup, ExerciseCategory } from '../types/enums'

export const useExercisesStore = defineStore('exercises', () => {
  const allExercises = ref<Exercise[]>([])
  const loaded = ref(false)

  async function loadExercises(): Promise<void> {
    if (loaded.value) return
    const data = await import('../data/exercises.json')
    allExercises.value = data.default as Exercise[]
    loaded.value = true
  }

  function getById(id: string): Exercise | undefined {
    return allExercises.value.find(e => e.id === id)
  }

  function filterByEquipment(equipment: Equipment[]): Exercise[] {
    return allExercises.value.filter(e => {
      if (e.equipment.length === 0) return true // bodyweight exercises
      return e.equipment.every(req => equipment.includes(req as Equipment))
    })
  }

  function filterByMuscle(muscle: MuscleGroup): Exercise[] {
    return allExercises.value.filter(e =>
      (e.muscleGroups as string[]).includes(muscle),
    )
  }

  function filterByCategory(category: ExerciseCategory): Exercise[] {
    return allExercises.value.filter(e => e.category === category)
  }

  function searchByName(query: string): Exercise[] {
    const q = query.toLowerCase()
    return allExercises.value.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.tags.some(t => t.includes(q)),
    )
  }

  const categories = computed(() => {
    const cats = new Set(allExercises.value.map(e => e.category))
    return Array.from(cats)
  })

  const muscleGroups = computed(() => {
    const groups = new Set(allExercises.value.flatMap(e => e.muscleGroups))
    return Array.from(groups)
  })

  return {
    allExercises,
    loaded,
    loadExercises,
    getById,
    filterByEquipment,
    filterByMuscle,
    filterByCategory,
    searchByName,
    categories,
    muscleGroups,
  }
})
