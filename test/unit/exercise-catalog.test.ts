import { describe, it, expect } from 'vitest'
import exercises from '../../src/data/exercises.json'
import type { Exercise } from '../../src/types/exercise'
import {
  Equipment,
  MuscleGroup,
  ExerciseDifficulty,
} from '../../src/types/enums'

const CATEGORY_VALUES = [
  'strength', 'cardio', 'flexibility', 'balance', 'plyometric', 'warmup', 'cooldown',
]

const catalog = exercises as Exercise[]
const equipmentValues = new Set<string>(Object.values(Equipment))
const muscleValues = new Set<string>(Object.values(MuscleGroup))
const difficultyValues = new Set<string>(Object.values(ExerciseDifficulty))

// Guards against Spanish-language regressions and synonym duplicates in the catalog.
describe('exercise catalog vocabulary', () => {
  it('uses only canonical Equipment enum values', () => {
    for (const ex of catalog) {
      for (const e of ex.equipment) {
        expect(equipmentValues, `${ex.id} equipment=${e}`).toContain(e)
      }
    }
  })

  it('uses only canonical MuscleGroup enum values for primaryMuscle and muscleGroups', () => {
    for (const ex of catalog) {
      expect(muscleValues, `${ex.id} primaryMuscle=${ex.primaryMuscle}`).toContain(ex.primaryMuscle)
      for (const g of ex.muscleGroups) {
        expect(muscleValues, `${ex.id} muscleGroups=${g}`).toContain(g)
      }
    }
  })

  it('uses only canonical ExerciseCategory values', () => {
    for (const ex of catalog) {
      expect(CATEGORY_VALUES, `${ex.id} category=${ex.category}`).toContain(ex.category)
    }
  })

  it('uses only canonical ExerciseDifficulty enum values', () => {
    for (const ex of catalog) {
      expect(difficultyValues, `${ex.id} difficulty=${ex.difficulty}`).toContain(ex.difficulty)
    }
  })

  it('has no duplicate/synonym equipment vocabulary', () => {
    const used = new Set(catalog.flatMap(ex => ex.equipment))
    // Legacy Spanish synonyms that must no longer appear.
    for (const legacy of ['banco', 'banda_elástica', 'barra_dominadas', 'mancuernas', 'barra']) {
      expect(used).not.toContain(legacy)
    }
  })
})
