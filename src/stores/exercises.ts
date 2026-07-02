import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Exercise } from '../types/exercise'
import type { Equipment, MuscleGroup, ExerciseCategory, ExerciseDifficulty } from '../types/enums'
import type { InjuryZone } from '../types/user'

const DIFFICULTY_RANK: Record<ExerciseDifficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
} as Record<ExerciseDifficulty, number>

export interface AlternativeContext {
  equipment: Equipment[]
  injuries?: InjuryZone[]
}

function canPerform(exercise: Exercise, equipment: Equipment[]): boolean {
  if (exercise.equipment.length === 0) return true // bodyweight
  return exercise.equipment.every(req => equipment.includes(req as Equipment))
}

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
    return allExercises.value.filter(e => canPerform(e, equipment))
  }

  /**
   * Similar exercises the user can actually perform, for swapping a planned
   * exercise. Anchored on the source's primaryMuscle, filtered by available
   * equipment and injuries, ranked by category / compound / difficulty proximity.
   * Pure and offline — no AI call. Returns [] when nothing qualifies.
   */
  function findAlternatives(
    exerciseId: string,
    context: AlternativeContext,
    limit = 5,
  ): Exercise[] {
    const source = getById(exerciseId)
    if (!source) return []

    const injured = new Set((context.injuries ?? []).map(i => i.muscleGroup))
    const sourceRank = DIFFICULTY_RANK[source.difficulty] ?? 0

    const candidates = allExercises.value.filter(e => {
      if (e.id === source.id) return false
      if (e.primaryMuscle !== source.primaryMuscle) return false
      if (!canPerform(e, context.equipment)) return false
      // Exclude if the exercise works any injured muscle group.
      if (e.muscleGroups.some(g => injured.has(g))) return false
      return true
    })

    const score = (e: Exercise): number => {
      let s = 0
      if (e.category === source.category) s += 2
      if (e.isCompound === source.isCompound) s += 1
      s -= Math.abs((DIFFICULTY_RANK[e.difficulty] ?? 0) - sourceRank)
      return s
    }

    return candidates
      .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
      .slice(0, limit)
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
    findAlternatives,
    filterByMuscle,
    filterByCategory,
    searchByName,
    categories,
    muscleGroups,
  }
})
