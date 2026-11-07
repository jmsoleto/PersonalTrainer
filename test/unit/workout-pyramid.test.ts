import { describe, it, expect } from 'vitest'
import type { PyramidConfig, TemplateBlock, DayTemplate, SetSpec } from '../../src/types/workout-template'
import { validateDay } from '../../src/workout-editor/validation'
import {
  generatePyramidSets,
  defaultPyramidConfig,
  roundWeight,
  roundReps,
  roundSeconds,
} from '../../src/workout-editor/pyramid'

const linear = (
  variant: 'ascending' | 'descending',
  setCount: number,
  first: { value: number; weightKg?: number },
  last: { value: number; weightKg?: number },
  restSeconds = 90,
): PyramidConfig => ({ variant, manual: false, params: { setCount, first, last, restSeconds } })

describe('rounding', () => {
  it('rounds weight to the nearest 2.5 kg with a 2.5 kg floor', () => {
    expect(roundWeight(43.33)).toBe(42.5)
    expect(roundWeight(46.67)).toBe(47.5)
    expect(roundWeight(48)).toBe(47.5)
    expect(roundWeight(38)).toBe(37.5)
    expect(roundWeight(1.25)).toBe(2.5)
    expect(roundWeight(0.4)).toBe(2.5)
  })

  it('rounds reps to integers (min 1) and seconds to 5 s (min 5)', () => {
    expect(roundReps(12.67)).toBe(13)
    expect(roundReps(0.2)).toBe(1)
    expect(roundSeconds(37)).toBe(35)
    expect(roundSeconds(38)).toBe(40)
    expect(roundSeconds(1)).toBe(5)
  })
})

describe('generatePyramidSets', () => {
  it('ascending pyramid with weight: 12×40, 10×45, 8×50, 6×55', () => {
    const sets = generatePyramidSets('reps', linear('ascending', 4, { value: 12, weightKg: 40 }, { value: 6, weightKg: 55 }))
    expect(sets).toEqual([
      { reps: 12, weightKg: 40, restSeconds: 90 },
      { reps: 10, weightKg: 45, restSeconds: 90 },
      { reps: 8, weightKg: 50, restSeconds: 90 },
      { reps: 6, weightKg: 55, restSeconds: 90 },
    ])
  })

  it('rounds generated weights: 40 → 50 kg in 4 sets', () => {
    const sets = generatePyramidSets('reps', linear('ascending', 4, { value: 10, weightKg: 40 }, { value: 10, weightKg: 50 }))
    expect(sets.map(s => s.weightKg)).toEqual([40, 42.5, 47.5, 50])
  })

  it('bodyweight descending pyramid: 15 → 8 without weight', () => {
    const sets = generatePyramidSets('reps', linear('descending', 4, { value: 15 }, { value: 8 }, 60))
    expect(sets.map(s => s.reps)).toEqual([15, 13, 10, 8])
    expect(sets.every(s => s.weightKg === undefined)).toBe(true)
  })

  it('time pyramid: 30 → 60 s in 3 sets, no reps', () => {
    const sets = generatePyramidSets('time', linear('ascending', 3, { value: 30 }, { value: 60 }, 45))
    expect(sets.map(s => s.durationSeconds)).toEqual([30, 45, 60])
    expect(sets.every(s => s.reps === undefined)).toBe(true)
  })

  it('triangle with 3 steps has 5 sets mirroring the rising ones', () => {
    const sets = generatePyramidSets('reps', {
      variant: 'triangle',
      manual: false,
      params: { steps: 3, base: { value: 12, weightKg: 40 }, peak: { value: 8, weightKg: 60 }, restSeconds: 90 },
    })
    expect(sets.map(s => `${s.reps}x${s.weightKg}`)).toEqual(['12x40', '10x50', '8x60', '10x50', '12x40'])
    expect(sets[3]).toEqual(sets[1])
    expect(sets[3]).not.toBe(sets[1])
  })

  it('drop set: 60 kg, 2 drops of 20 % → 60 / 47.5 / 37.5 with rests 0 / 0 / 120', () => {
    const sets = generatePyramidSets('reps', {
      variant: 'drop',
      manual: false,
      params: { startWeightKg: 60, drops: 2, dropPercent: 20, reps: 10, finalRestSeconds: 120 },
    })
    expect(sets).toEqual([
      { reps: 10, weightKg: 60, restSeconds: 0 },
      { reps: 10, weightKg: 47.5, restSeconds: 0 },
      { reps: 10, weightKg: 37.5, restSeconds: 120 },
    ])
  })

  it('drop set ignores time mode', () => {
    const sets = generatePyramidSets('time', {
      variant: 'drop',
      manual: false,
      params: { startWeightKg: 30, drops: 1, dropPercent: 20, reps: 8, finalRestSeconds: 90 },
    })
    expect(sets.every(s => s.reps === 8 && s.durationSeconds === undefined)).toBe(true)
  })

  it('clamps the set count to 2..10', () => {
    expect(generatePyramidSets('reps', linear('ascending', 1, { value: 10 }, { value: 5 }))).toHaveLength(2)
    expect(generatePyramidSets('reps', linear('ascending', 30, { value: 10 }, { value: 5 }))).toHaveLength(10)
  })
})

describe('defaultPyramidConfig', () => {
  it('straight 4 × 10 × 40 kg → ascending 4 sets, 10 → 10, 40 → 40 kg', () => {
    const straight = Array.from({ length: 4 }, () => ({ reps: 10, weightKg: 40, restSeconds: 90 }))
    const config = defaultPyramidConfig('ascending', 'reps', straight)
    expect(config).toEqual({
      variant: 'ascending',
      manual: false,
      params: { setCount: 4, first: { value: 10, weightKg: 40 }, last: { value: 10, weightKg: 40 }, restSeconds: 90 },
    })
    expect(generatePyramidSets('reps', config)).toEqual(straight)
  })

  it('time mode seeds seconds', () => {
    const config = defaultPyramidConfig('descending', 'time', [{ durationSeconds: 45, restSeconds: 30 }])
    expect(config.variant).toBe('descending')
    if (config.variant !== 'descending') return
    expect(config.params.first).toEqual({ value: 45 })
    expect(config.params.setCount).toBe(2)
  })

  it('drop set seeds weight, reps and rest from the first set', () => {
    const config = defaultPyramidConfig('drop', 'reps', [{ reps: 8, weightKg: 50, restSeconds: 120 }])
    expect(config).toEqual({
      variant: 'drop',
      manual: false,
      params: { startWeightKg: 50, drops: 2, dropPercent: 20, reps: 8, finalRestSeconds: 120 },
    })
  })

  it('triangle steps derive from the set count', () => {
    const config = defaultPyramidConfig('triangle', 'reps', Array.from({ length: 5 }, () => ({ reps: 10 })))
    if (config.variant !== 'triangle') throw new Error('expected triangle')
    expect(config.params.steps).toBe(3)
  })
})

// ---------------------------------------------------------------- validation

function pyramidBlock(config: PyramidConfig, sets?: SetSpec[], mode: 'reps' | 'time' = 'reps', exerciseId = 'ex_barbell_curl'): TemplateBlock {
  return {
    id: `b_${exerciseId}`,
    kind: 'pyramid',
    pyramid: config,
    items: [{ exerciseId, mode, sets: sets ?? generatePyramidSets(mode, config) }],
  }
}

function dayWith(blocks: Partial<Pick<DayTemplate, 'warmup' | 'main' | 'cooldown'>>): DayTemplate {
  return {
    id: 'd1', userId: 'u1', name: 'Día', createdAt: '', updatedAt: '',
    warmup: [], main: [], cooldown: [], ...blocks,
  }
}

const codes = (d: DayTemplate) => validateDay(d).map(i => i.code)
const drop = (startWeightKg: number, drops: number, dropPercent: number): PyramidConfig =>
  ({ variant: 'drop', manual: false, params: { startWeightKg, drops, dropPercent, reps: 10, finalRestSeconds: 120 } })

describe('pyramid validation', () => {
  it('accepts every variant in the main workout', () => {
    const blocks = [
      pyramidBlock(linear('ascending', 4, { value: 12, weightKg: 40 }, { value: 6, weightKg: 55 }), undefined, 'reps', 'ex_a'),
      pyramidBlock(linear('descending', 3, { value: 60 }, { value: 30 }), undefined, 'time', 'ex_b'),
      pyramidBlock({ variant: 'triangle', manual: false, params: { steps: 3, base: { value: 12 }, peak: { value: 8 }, restSeconds: 60 } }, undefined, 'reps', 'ex_c'),
      pyramidBlock(drop(60, 2, 20), undefined, 'reps', 'ex_d'),
    ]
    expect(codes(dayWith({ main: blocks }))).toEqual([])
  })

  it('rejects pyramids outside the main workout', () => {
    const block = pyramidBlock(linear('ascending', 3, { value: 10 }, { value: 6 }))
    const d = dayWith({ main: [pyramidBlock(linear('ascending', 3, { value: 10 }, { value: 6 }), undefined, 'reps', 'ex_x')], warmup: [block] })
    expect(codes(d)).toContain('pyramid_outside_main')
  })

  it('rejects a pyramid without config, or config on a straight block', () => {
    const noConfig: TemplateBlock = { ...pyramidBlock(linear('ascending', 3, { value: 10 }, { value: 6 })), pyramid: undefined }
    expect(codes(dayWith({ main: [noConfig] }))).toContain('pyramid_missing_config')
    const straightWithConfig: TemplateBlock = { ...pyramidBlock(linear('ascending', 3, { value: 10 }, { value: 6 })), kind: 'straight' }
    expect(codes(dayWith({ main: [straightWithConfig] }))).toContain('pyramid_missing_config')
  })

  it('rejects fewer than 2 or more than 10 sets', () => {
    const cfg = linear('ascending', 3, { value: 10 }, { value: 6 })
    expect(codes(dayWith({ main: [pyramidBlock(cfg, [{ reps: 10 }])] }))).toContain('pyramid_set_count')
    const eleven = Array.from({ length: 11 }, () => ({ reps: 10 }))
    expect(codes(dayWith({ main: [pyramidBlock(cfg, eleven)] }))).toContain('pyramid_set_count')
  })

  it('rejects a drop set without weight', () => {
    const block = pyramidBlock(drop(60, 2, 20), [{ reps: 10, restSeconds: 0 }, { reps: 10, restSeconds: 90 }])
    expect(codes(dayWith({ main: [block] }))).toContain('drop_requires_weight')
  })

  it('rejects a drop set in time mode', () => {
    const block = pyramidBlock(drop(60, 1, 20), [{ durationSeconds: 30, weightKg: 60 }, { durationSeconds: 30, weightKg: 47.5 }], 'time')
    expect(codes(dayWith({ main: [block] }))).toContain('drop_requires_weight')
  })

  it('rejects 5 kg with 3 drops of 10 % (stages do not decrease)', () => {
    const block = pyramidBlock(drop(5, 3, 10))
    expect(codes(dayWith({ main: [block] }))).toContain('drop_not_decreasing')
  })

  it('rejects a pyramid config on a superset', () => {
    const block: TemplateBlock = {
      id: 's', kind: 'superset', pyramid: linear('ascending', 3, { value: 10 }, { value: 6 }),
      items: ['ex_a', 'ex_b'].map(exerciseId => ({ exerciseId, mode: 'reps' as const, sets: [{ reps: 10 }] })),
    }
    expect(codes(dayWith({ main: [block] }))).toEqual(['pyramid_missing_config'])
  })
})
