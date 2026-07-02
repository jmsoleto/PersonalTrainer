import { describe, it, expect, beforeEach } from 'vitest'
import { useExercisesStore } from '../../src/stores/exercises'
import { Equipment, MuscleGroup } from '../../src/types/enums'
import type { InjuryZone } from '../../src/types/user'

const ALL_EQUIPMENT = Object.values(Equipment)
const DIFFICULTY_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 }

describe('exercises store — filterByEquipment', () => {
  let store: ReturnType<typeof useExercisesStore>

  beforeEach(async () => {
    store = useExercisesStore()
    await store.loadExercises()
  })

  it('returns equipment-based exercises the user can perform', () => {
    const withDumbbells = store.filterByEquipment([
      Equipment.Dumbbells,
      Equipment.BodyweightOnly,
    ])
    // At least one exercise that actually requires dumbbells is included.
    expect(withDumbbells.some(e => e.equipment.includes(Equipment.Dumbbells))).toBe(true)
  })

  it('excludes exercises whose equipment the user lacks', () => {
    const bodyweightOnly = store.filterByEquipment([Equipment.BodyweightOnly])
    // No returned exercise requires equipment beyond bodyweight.
    expect(bodyweightOnly.every(e => e.equipment.length === 0)).toBe(true)
  })

  it('always includes bodyweight (no-equipment) exercises', () => {
    const result = store.filterByEquipment([Equipment.BodyweightOnly])
    expect(result.some(e => e.equipment.length === 0)).toBe(true)
  })
})

describe('exercises store — findAlternatives', () => {
  let store: ReturnType<typeof useExercisesStore>
  // A known chest, bodyweight, strength, compound, beginner exercise.
  const SOURCE = 'ex_standard_push_up'

  beforeEach(async () => {
    store = useExercisesStore()
    await store.loadExercises()
  })

  it('returns alternatives that share the source primaryMuscle, excluding the source', () => {
    const source = store.getById(SOURCE)!
    const alts = store.findAlternatives(SOURCE, { equipment: ALL_EQUIPMENT })
    expect(alts.length).toBeGreaterThan(0)
    expect(alts.every(a => a.primaryMuscle === source.primaryMuscle)).toBe(true)
    expect(alts.some(a => a.id === SOURCE)).toBe(false)
  })

  it('respects available equipment', () => {
    const alts = store.findAlternatives(SOURCE, { equipment: [Equipment.BodyweightOnly] })
    expect(alts.every(a => a.equipment.length === 0)).toBe(true)
  })

  it('excludes candidates working an injured muscle group', () => {
    const injuries: InjuryZone[] = [
      { muscleGroup: MuscleGroup.Chest, severity: 'moderate', dateMarked: '2026-01-01' },
    ]
    // Every chest alternative works the chest, so an chest injury clears them all.
    const alts = store.findAlternatives(SOURCE, { equipment: ALL_EQUIPMENT, injuries })
    expect(alts).toEqual([])
  })

  it('returns [] for an unknown exercise id', () => {
    expect(store.findAlternatives('does_not_exist', { equipment: ALL_EQUIPMENT })).toEqual([])
  })

  it('respects the limit', () => {
    const alts = store.findAlternatives(SOURCE, { equipment: ALL_EQUIPMENT }, 3)
    expect(alts.length).toBeLessThanOrEqual(3)
  })

  it('ranks by descending similarity (category, compound, difficulty proximity)', () => {
    const source = store.getById(SOURCE)!
    const alts = store.findAlternatives(SOURCE, { equipment: ALL_EQUIPMENT }, 50)
    const srcRank = DIFFICULTY_RANK[source.difficulty]
    const score = (e: typeof source) =>
      (e.category === source.category ? 2 : 0) +
      (e.isCompound === source.isCompound ? 1 : 0) -
      Math.abs(DIFFICULTY_RANK[e.difficulty] - srcRank)
    const scores = alts.map(score)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!)
    }
  })
})
