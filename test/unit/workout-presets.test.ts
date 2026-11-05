import { describe, it, expect } from 'vitest'
import exercisesJson from '../../src/data/exercises.json'
import type { Exercise } from '../../src/types/exercise'
import { Equipment } from '../../src/types/enums'
import {
  dayPresets,
  weekPresets,
  getDayPreset,
  requiredEquipment,
  missingEquipment,
  dayPresetsOfWeek,
} from '../../src/workout-editor/presets'
import { validateDay } from '../../src/workout-editor/validation'
import { generatePyramidSets } from '../../src/workout-editor/pyramid'

const catalog = new Map((exercisesJson as Exercise[]).map(e => [e.id, e]))
const getExercise = (id: string) => catalog.get(id)

const allItems = (blocks: { items: { exerciseId: string; sets: { weightKg?: number }[] }[] }[]) =>
  blocks.flatMap(b => b.items)

describe('workout presets catalog integrity', () => {
  it('ships the 12 day presets and 3 week presets with unique ids', () => {
    expect(dayPresets).toHaveLength(12)
    expect(weekPresets).toHaveLength(3)
    const ids = [...dayPresets, ...weekPresets].map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(dayPresets.filter(p => p.group === 'muscle').map(p => p.name)).toEqual([
      'Pecho y tríceps', 'Espalda y bíceps', 'Pierna', 'Hombros', 'Core exprés', 'Cuerpo completo',
    ])
    expect(dayPresets.filter(p => p.group === 'category').map(p => p.name)).toEqual([
      'Cardio HIIT', 'Pliometría', 'Movilidad y flexibilidad', 'Equilibrio',
      'Fuerza en pirámide', 'Pirámide con mancuernas',
    ])
  })

  for (const preset of dayPresets) {
    describe(preset.name, () => {
      it('references only catalog exercises', () => {
        const unknown = allItems([...preset.warmup, ...preset.main, ...preset.cooldown])
          .map(i => i.exerciseId)
          .filter(id => !catalog.has(id))
        expect(unknown).toEqual([])
      })

      it('uses warm-up exercises in the warm-up', () => {
        for (const item of allItems(preset.warmup)) {
          expect(catalog.get(item.exerciseId)?.category, item.exerciseId).toBe('warmup')
        }
      })

      it('uses stretching exercises in the cool-down', () => {
        for (const item of allItems(preset.cooldown)) {
          expect(['cooldown', 'flexibility'], item.exerciseId).toContain(catalog.get(item.exerciseId)?.category)
        }
      })

      it('has a main workout and prescribes no weight', () => {
        expect(allItems(preset.main).length).toBeGreaterThan(0)
        const weighted = allItems([...preset.warmup, ...preset.main, ...preset.cooldown])
          .filter(i => i.sets.some(s => s.weightKg !== undefined))
        expect(weighted).toEqual([])
      })

      it('pyramid blocks match their generator config and include no drop sets', () => {
        for (const block of [...preset.warmup, ...preset.main, ...preset.cooldown]) {
          if (block.kind !== 'pyramid') continue
          expect(block.pyramid, block.id).toBeDefined()
          expect(block.pyramid!.variant, block.id).not.toBe('drop')
          expect(block.pyramid!.manual, block.id).toBe(false)
          const it0 = block.items[0]
          expect(it0.sets, block.id).toEqual(generatePyramidSets(it0.mode, block.pyramid!))
        }
      })

      it('passes template validation', () => {
        expect(validateDay(preset, { exerciseExists: id => catalog.has(id) })).toEqual([])
      })
    })
  }

  for (const week of weekPresets) {
    it(`week "${week.name}" has 7 slots referencing known day presets`, () => {
      expect(week.slots).toHaveLength(7)
      expect(week.slots.some(s => s.kind === 'training')).toBe(true)
      for (const slot of week.slots) {
        if (slot.kind !== 'rest' && slot.dayPresetId) {
          expect(getDayPreset(slot.dayPresetId), slot.dayPresetId).toBeDefined()
        }
      }
    })
  }
})

describe('preset equipment', () => {
  it('derives required equipment from the exercises', () => {
    const back = getDayPreset('preset_day_back_biceps')!
    expect(requiredEquipment(back, getExercise).sort()).toEqual([Equipment.Bench, Equipment.Dumbbells].sort())
    expect(requiredEquipment(getDayPreset('preset_day_shoulders')!, getExercise)).toEqual([Equipment.Dumbbells])
    expect(requiredEquipment(getDayPreset('preset_day_legs')!, getExercise)).toEqual([])
  })

  it('reports what the user is missing', () => {
    const back = getDayPreset('preset_day_back_biceps')!
    expect(missingEquipment(back, [Equipment.Bench], getExercise)).toEqual([Equipment.Dumbbells])
    expect(missingEquipment(back, [Equipment.Dumbbells, Equipment.Bench], getExercise)).toEqual([])
  })

  it('lists the distinct day presets of a week', () => {
    const split = weekPresets.find(w => w.id === 'preset_week_split_4')!
    expect(dayPresetsOfWeek(split)).toHaveLength(6)
  })
})

describe('pyramid presets', () => {
  const barbell = getDayPreset('preset_day_pyramid_barbell')!
  const dumbbell = getDayPreset('preset_day_pyramid_dumbbell')!

  it('use triangle, ascending and descending pyramids in the main workout', () => {
    for (const preset of [barbell, dumbbell]) {
      const variants = preset.main.filter(b => b.kind === 'pyramid').map(b => b.pyramid!.variant)
      expect(variants).toEqual(expect.arrayContaining(['triangle', 'ascending', 'descending']))
    }
  })

  it('the dumbbell preset includes a bodyweight reps pyramid and a time pyramid', () => {
    const pyramids = dumbbell.main.filter(b => b.kind === 'pyramid')
    expect(pyramids.some(b => b.items[0].mode === 'reps' && getExercise(b.items[0].exerciseId)!.equipment.length === 0)).toBe(true)
    expect(pyramids.some(b => b.items[0].mode === 'time')).toBe(true)
  })

  it('the barbell preset requires a barbell', () => {
    expect(requiredEquipment(barbell, getExercise)).toContain(Equipment.Barbell)
    expect(missingEquipment(barbell, [], getExercise)).toContain(Equipment.Barbell)
  })
})
