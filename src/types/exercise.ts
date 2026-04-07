import type { MuscleGroup, ExerciseDifficulty, ExerciseCategory, Equipment } from './enums'

export interface Exercise {
  id: string
  name: string
  description: string
  instructions: string[]
  muscleGroups: MuscleGroup[]
  primaryMuscle: MuscleGroup
  difficulty: ExerciseDifficulty
  equipment: Equipment[]
  category: ExerciseCategory
  isCompound: boolean
  tags: string[]
  imageUrl?: string
  videoUrl?: string
}
