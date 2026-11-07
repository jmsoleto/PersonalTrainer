import { describe, it, expect } from 'vitest'
import type { BlockItem, DayTemplate, TemplateBlock } from '../../src/types/workout-template'
import { validateDay } from '../../src/workout-editor/validation'
import { estimateBlocksSeconds, SECONDS_PER_REP } from '../../src/workout-editor/duration'
import {
  supersetLetters,
  toSuperset,
  setRounds,
  setTransition,
  setRoundRest,
  swapItems,
  splitSuperset,
  removeSupersetItem,
  roundsOf,
  transitionOf,
  roundRestOf,
} from '../../src/workout-editor/superset'

const straight = (id: string, exerciseId: string, sets = 3, reps = 10, weightKg?: number, restSeconds = 60): TemplateBlock => ({
  id,
  kind: 'straight',
  items: [{ exerciseId, mode: 'reps', sets: Array.from({ length: sets }, () => ({ reps, weightKg, restSeconds })) }],
})

const superset = (id: string, a: string, b: string, rounds = 3): TemplateBlock => ({
  id,
  kind: 'superset',
  items: [
    { exerciseId: a, mode: 'reps', sets: Array.from({ length: rounds }, () => ({ reps: 10, weightKg: 40, restSeconds: 0 })) },
    { exerciseId: b, mode: 'time', sets: Array.from({ length: rounds }, () => ({ durationSeconds: 30, restSeconds: 90 })) },
  ],
})

const row: BlockItem = { exerciseId: 'ex_barbell_bent_over_row', mode: 'reps', sets: [{ reps: 10, restSeconds: 60 }] }

describe('supersetLetters', () => {
  it('letters supersets in order and skips other blocks', () => {
    const letters = supersetLetters([superset('s1', 'a', 'b'), straight('x', 'c'), superset('s2', 'd', 'e')])
    expect([...letters.entries()]).toEqual([['s1', 'A'], ['s2', 'B']])
  })
})

describe('toSuperset', () => {
  it('keeps the straight exercise as A1 and adds A2 with the same rounds and default rests', () => {
    const block = straight('b', 'ex_barbell_bench_press', 4, 10, 40)
    toSuperset(block, row)
    expect(block.kind).toBe('superset')
    expect(roundsOf(block)).toBe(4)
    expect(block.items.map(i => i.exerciseId)).toEqual(['ex_barbell_bench_press', 'ex_barbell_bent_over_row'])
    expect(block.items[0].sets.every(s => s.reps === 10 && s.weightKg === 40)).toBe(true)
    expect(block.items[1].sets).toHaveLength(4)
    expect(block.items[1].sets.every(s => s.reps === 10 && s.weightKg === undefined)).toBe(true)
    expect(transitionOf(block)).toBe(0)
    expect(roundRestOf(block)).toBe(90)
  })

  it('drops a leftover pyramid config', () => {
    const block: TemplateBlock = { ...straight('b', 'a'), pyramid: { variant: 'ascending', manual: false, params: { setCount: 3, first: { value: 10 }, last: { value: 10 }, restSeconds: 60 } } }
    toSuperset(block, row)
    expect(block.pyramid).toBeUndefined()
  })
})

describe('editing a superset', () => {
  it('changing rounds changes both items and keeps their prescription', () => {
    const block = superset('s', 'a', 'b', 3)
    setRounds(block, 4)
    expect(block.items[0].sets).toHaveLength(4)
    expect(block.items[1].sets).toHaveLength(4)
    expect(block.items[0].sets[3]).toEqual({ reps: 10, weightKg: 40, restSeconds: 0 })
    expect(block.items[1].sets[3]).toEqual({ durationSeconds: 30, restSeconds: 90 })
    setRounds(block, 30)
    expect(roundsOf(block)).toBe(10)
  })

  it('transition and round rest apply to every set of their item', () => {
    const block = superset('s', 'a', 'b')
    setTransition(block, 15)
    setRoundRest(block, 120)
    expect(block.items[0].sets.every(s => s.restSeconds === 15)).toBe(true)
    expect(block.items[1].sets.every(s => s.restSeconds === 120)).toBe(true)
  })

  it('swap keeps the rests by position', () => {
    const block = superset('s', 'a', 'b')
    setTransition(block, 10)
    swapItems(block)
    expect(block.items.map(i => i.exerciseId)).toEqual(['b', 'a'])
    expect(block.items[0].sets.every(s => s.restSeconds === 10 && s.durationSeconds === 30)).toBe(true)
    expect(block.items[1].sets.every(s => s.restSeconds === 90 && s.reps === 10)).toBe(true)
  })
})

describe('leaving a superset', () => {
  it('split gives two straight blocks with each item values; A1 keeps the transition as rest', () => {
    const block = superset('s', 'a', 'b', 3)
    const [first, second] = splitSuperset(block, () => 'new')
    expect(first).toEqual({ id: 's', kind: 'straight', items: [block.items[0]] })
    expect(second.id).toBe('new')
    expect(second.kind).toBe('straight')
    expect(second.items[0].sets).toEqual(block.items[1].sets)
    expect(first.items[0].sets.every(s => s.restSeconds === 0)).toBe(true)
    expect(first.items[0]).not.toBe(block.items[0])
  })

  it('removing A2 leaves A1 as a straight block', () => {
    const block = superset('s', 'a', 'b')
    const left = removeSupersetItem(block, 1)
    expect(left.kind).toBe('straight')
    expect(left.items.map(i => i.exerciseId)).toEqual(['a'])
    expect(left.items[0].sets).toEqual(block.items[0].sets)
  })
})

// ---------------------------------------------------------------- validation

function dayWith(blocks: Partial<Pick<DayTemplate, 'warmup' | 'main' | 'cooldown'>>): DayTemplate {
  return { id: 'd1', userId: 'u1', name: 'Día', createdAt: '', updatedAt: '', warmup: [], main: [], cooldown: [], ...blocks }
}
const codes = (d: DayTemplate) => validateDay(d).map(i => i.code)

describe('superset validation', () => {
  it('accepts a superset with one reps item and one time item', () => {
    expect(codes(dayWith({ main: [superset('s', 'ex_a', 'ex_b')] }))).toEqual([])
  })

  it('rejects supersets outside the main workout', () => {
    const d = dayWith({ main: [straight('m', 'ex_m')], cooldown: [superset('s', 'ex_a', 'ex_b')] })
    expect(codes(d)).toContain('superset_outside_main')
    const w = dayWith({ main: [straight('m', 'ex_m')], warmup: [superset('s', 'ex_a', 'ex_b')] })
    expect(codes(w)).toContain('superset_outside_main')
  })

  it('rejects anything other than exactly two exercises', () => {
    const one: TemplateBlock = { ...superset('s', 'ex_a', 'ex_b'), items: [superset('s', 'ex_a', 'ex_b').items[0]] }
    expect(codes(dayWith({ main: [one] }))).toContain('superset_item_count')
    const base = superset('s', 'ex_a', 'ex_b')
    const three: TemplateBlock = { ...base, items: [...base.items, { ...base.items[0], exerciseId: 'ex_c' }] }
    expect(codes(dayWith({ main: [three] }))).toContain('superset_item_count')
  })

  it('rejects uneven rounds', () => {
    const block = superset('s', 'ex_a', 'ex_b', 3)
    block.items[1].sets.push({ durationSeconds: 30, restSeconds: 90 })
    expect(codes(dayWith({ main: [block] }))).toContain('superset_uneven_rounds')
  })

  it('rejects more than 10 rounds', () => {
    expect(codes(dayWith({ main: [superset('s', 'ex_a', 'ex_b', 11)] }))).toContain('superset_round_count')
  })

  it('reports duplicates inside a superset and against other blocks', () => {
    expect(codes(dayWith({ main: [superset('s', 'ex_a', 'ex_a')] }))).toContain('duplicate_exercise')
    expect(codes(dayWith({ main: [straight('x', 'ex_b'), superset('s', 'ex_a', 'ex_b')] }))).toContain('duplicate_exercise')
  })

  it('applies the per-set value checks', () => {
    const block = superset('s', 'ex_a', 'ex_b')
    block.items[1].sets[0].durationSeconds = 0
    expect(codes(dayWith({ main: [block] }))).toContain('invalid_value')
  })
})

describe('superset duration estimate', () => {
  it('counts both exercises, the transition and the round rest once per round', () => {
    const block: TemplateBlock = {
      id: 's',
      kind: 'superset',
      items: [
        { exerciseId: 'a', mode: 'reps', sets: Array.from({ length: 3 }, () => ({ reps: 10, restSeconds: 0 })) },
        { exerciseId: 'b', mode: 'reps', sets: Array.from({ length: 3 }, () => ({ reps: 10, restSeconds: 90 })) },
      ],
    }
    expect(estimateBlocksSeconds([block])).toBe(3 * (10 * SECONDS_PER_REP + 10 * SECONDS_PER_REP + 90))
  })
})
