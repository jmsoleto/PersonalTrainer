import { describe, it, expect } from 'vitest'
import exercisesJson from '../../src/data/exercises.json'
import type { Exercise } from '../../src/types/exercise'
import type { PlanContext } from '../../src/types/plan'
import { DayType, Gender, FitnessLevel } from '../../src/types/enums'
import type {
  DayTemplate,
  WeekTemplate,
  PlanTemplate,
  TemplateBlock,
  WeekSlot,
} from '../../src/types/workout-template'
import {
  validateDay,
  validateWeek,
  validatePlan,
  validatePlanTree,
  TemplateValidationError,
} from '../../src/workout-editor/validation'
import { estimateBlocksSeconds, estimateDayMinutes } from '../../src/workout-editor/duration'
import { compilePlanTemplate } from '../../src/workout-editor/compiler'
import { mondayOf, resolvePlanStart } from '../../src/workout-editor/dates'

const catalog = new Map((exercisesJson as Exercise[]).map(e => [e.id, e]))
const getExercise = (id: string) => catalog.get(id)
const exists = (id: string) => catalog.has(id)

const NOW = '2026-11-03T10:00:00.000Z'

function straight(exerciseId: string, n: number, set: { reps?: number; durationSeconds?: number; weightKg?: number; restSeconds?: number }, id = exerciseId): TemplateBlock {
  return {
    id: `b-${id}`,
    kind: 'straight',
    items: [{
      exerciseId,
      mode: set.durationSeconds !== undefined ? 'time' : 'reps',
      sets: Array.from({ length: n }, () => ({ ...set })),
    }],
  }
}

function day(id: string, overrides: Partial<DayTemplate> = {}): DayTemplate {
  return {
    id,
    userId: 'u1',
    name: `Día ${id}`,
    warmup: [],
    main: [straight('ex_bodyweight_squat', 4, { reps: 10, weightKg: 40, restSeconds: 90 })],
    cooldown: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

const REST: WeekSlot = { kind: 'rest' }

function week(id: string, slots: WeekSlot[]): WeekTemplate {
  return { id, userId: 'u1', name: `Semana ${id}`, slots, createdAt: NOW, updatedAt: NOW }
}

function plan(weekTemplateIds: string[]): PlanTemplate {
  return { id: 'p1', userId: 'u1', name: 'Mi plan', weekTemplateIds, createdAt: NOW, updatedAt: NOW }
}

const basedOn: PlanContext = {
  profile: { gender: Gender.Male, age: 30, weightKg: 80, heightCm: 180, fitnessLevel: FitnessLevel.Intermediate },
  goals: [],
  equipment: [],
  injuries: [],
  feedbackHistory: [],
}

let idCounter = 0
const opts = () => ({
  userId: 'u1',
  startDate: new Date(2026, 10, 9),
  basedOn,
  getExercise,
  newId: () => `id${++idCounter}`,
  now: new Date(NOW),
})

// ---------------------------------------------------------------------------
describe('validateDay', () => {
  it('accepts a day with only main exercises', () => {
    expect(validateDay(day('d1'), { exerciseExists: exists })).toEqual([])
  })

  it('rejects an empty main workout', () => {
    const issues = validateDay(day('d1', { main: [] }))
    expect(issues.map(i => i.code)).toContain('empty_main')
  })

  it('rejects an empty name', () => {
    expect(validateDay(day('d1', { name: '  ' })).map(i => i.code)).toContain('empty_name')
  })

  it('rejects zero/negative reps, seconds and kg', () => {
    for (const set of [{ reps: 0 }, { reps: -3 }, { reps: 10, weightKg: 0 }, { durationSeconds: 0 }]) {
      const issues = validateDay(day('d1', { main: [straight('ex_plank', 3, set)] }))
      expect(issues.map(i => i.code)).toContain('invalid_value')
    }
  })

  it('allows a rest of 0 seconds', () => {
    const issues = validateDay(day('d1', { main: [straight('ex_plank', 3, { durationSeconds: 30, restSeconds: 0 })] }))
    expect(issues).toEqual([])
  })

  it('flags unknown exercises when a catalog is given', () => {
    const issues = validateDay(day('d1', { main: [straight('ex_does_not_exist', 3, { reps: 10 })] }), { exerciseExists: exists })
    expect(issues.map(i => i.code)).toEqual(['unknown_exercise'])
    expect(issues[0].exerciseId).toBe('ex_does_not_exist')
  })

  it('flags the same exercise twice in the main workout', () => {
    const issues = validateDay(day('d1', {
      main: [straight('ex_plank', 3, { durationSeconds: 30 }, 'a'), straight('ex_plank', 2, { durationSeconds: 20 }, 'b')],
    }))
    expect(issues.map(i => i.code)).toContain('duplicate_exercise')
  })

  it('rejects superset blocks', () => {
    const block: TemplateBlock = { ...straight('ex_plank', 3, { durationSeconds: 30 }), kind: 'superset' }
    expect(validateDay(day('d1', { main: [block] })).map(i => i.code)).toContain('unsupported_block')
  })
})

describe('validateWeek / validatePlan', () => {
  const training: WeekSlot = { kind: 'training', dayTemplateId: 'd1' }

  it('requires 7 slots and at least one training day', () => {
    expect(validateWeek(week('w1', [training, REST, REST, REST, REST, REST, REST]))).toEqual([])
    expect(validateWeek(week('w1', [training])).map(i => i.code)).toContain('invalid_slot_count')
    const allRest = Array.from({ length: 7 }, (): WeekSlot => ({ kind: 'active_rest' }))
    expect(validateWeek(week('w1', allRest)).map(i => i.code)).toContain('no_training_day')
  })

  it('flags missing day references', () => {
    const w = week('w1', [training, REST, REST, REST, REST, REST, REST])
    expect(validateWeek(w, () => false).map(i => i.code)).toContain('missing_day')
  })

  it('enforces 1..52 weeks and existing references', () => {
    expect(validatePlan(plan([])).map(i => i.code)).toContain('empty_plan')
    expect(validatePlan(plan(Array(53).fill('w1'))).map(i => i.code)).toContain('too_many_weeks')
    expect(validatePlan(plan(Array(52).fill('w1')))).toEqual([])
    expect(validatePlan(plan(['w1']), () => false).map(i => i.code)).toContain('missing_week')
  })

  it('validatePlanTree reports the day that needs fixing', () => {
    const bad = day('d1', { name: 'Pierna A', main: [straight('ex_gone', 3, { reps: 10 })] })
    const tree = {
      plan: plan(['w1']),
      weeks: new Map([['w1', week('w1', [{ kind: 'training', dayTemplateId: 'd1' }, REST, REST, REST, REST, REST, REST])]]),
      days: new Map([['d1', bad]]),
    }
    const issues = validatePlanTree(tree, exists)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ templateType: 'day', templateId: 'd1', templateName: 'Pierna A', code: 'unknown_exercise' })
  })
})

// ---------------------------------------------------------------------------
describe('duration estimate', () => {
  it('counts 3 s per rep, durations and rests', () => {
    // 4 × (10 reps × 3 s + 90 s) = 480 s
    expect(estimateBlocksSeconds([straight('ex_bodyweight_squat', 4, { reps: 10, restSeconds: 90 })])).toBe(480)
    // 3 × (45 s + 30 s) = 225 s
    expect(estimateBlocksSeconds([straight('ex_plank', 3, { durationSeconds: 45, restSeconds: 30 })])).toBe(225)
  })

  it('rounds the day total up to minutes', () => {
    const d = day('d1', {
      warmup: [straight('ex_warmup_arm_circles', 1, { durationSeconds: 30 })],
      cooldown: [straight('ex_cooldown_chest_stretch', 1, { durationSeconds: 30 })],
    })
    // 480 + 30 + 30 = 540 s = 9 min
    expect(estimateDayMinutes(d)).toBe(9)
  })
})

// ---------------------------------------------------------------------------
describe('compilePlanTemplate', () => {
  const legs = day('legs', {
    name: 'Pierna A',
    warmup: [straight('ex_warmup_leg_swing', 1, { reps: 10 })],
    cooldown: [straight('ex_cooldown_hamstring_stretch', 1, { durationSeconds: 30 })],
  })
  const core = day('core', { name: 'Core', main: [straight('ex_plank', 3, { durationSeconds: 45, restSeconds: 30 })] })
  const mobility = day('mob', { name: 'Movilidad', main: [straight('ex_flexibility_downward_dog', 2, { durationSeconds: 45 })] })

  const base = week('base', [
    { kind: 'training', dayTemplateId: 'legs' },
    REST,
    { kind: 'training', dayTemplateId: 'core' },
    { kind: 'active_rest', dayTemplateId: 'mob' },
    { kind: 'training', dayTemplateId: 'legs' },
    { kind: 'active_rest' },
    REST,
  ])
  const deload = week('deload', [{ kind: 'training', dayTemplateId: 'core' }, REST, REST, REST, REST, REST, REST])

  function tree(weekIds = ['base', 'base', 'deload']) {
    return {
      plan: plan(weekIds),
      weeks: new Map([['base', base], ['deload', deload]]),
      days: new Map([['legs', legs], ['core', core], ['mob', mobility]]),
    }
  }

  it('produces a custom plan with repeated weeks in order', () => {
    const p = compilePlanTemplate(tree(), opts())
    expect(p.source).toBe('custom')
    expect(p.planTemplateId).toBe('p1')
    expect(p.status).toBe('active')
    expect(p.totalWeeks).toBe(3)
    expect(p.weeks.map(w => [w.weekNumber, w.theme])).toEqual([[1, 'Semana base'], [2, 'Semana base'], [3, 'Semana deload']])
    expect(p.startDate).toBe(new Date(2026, 10, 9).toISOString())
  })

  it('maps slots to weekday dayNumbers and day types', () => {
    const days = compilePlanTemplate(tree(), opts()).weeks[0].days
    expect(days.map(d => d.dayNumber)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(days.map(d => d.dayType)).toEqual([
      DayType.Training, DayType.Rest, DayType.Training, DayType.ActiveRest,
      DayType.Training, DayType.ActiveRest, DayType.Rest,
    ])
    expect(days[1].session).toBeUndefined()
    expect(days[3].session?.title).toBe('Movilidad')
    expect(days[5].session).toBeUndefined()
  })

  it('maps straight sets to PlannedExercise (reps, weight, rest)', () => {
    const session = compilePlanTemplate(tree(), opts()).weeks[0].days[0].session!
    expect(session.title).toBe('Pierna A')
    expect(session.mainWorkout).toEqual([{
      exerciseId: 'ex_bodyweight_squat',
      exerciseName: catalog.get('ex_bodyweight_squat')!.name,
      sets: 4,
      reps: 10,
      targetWeightKg: 40,
      restSeconds: 90,
    }])
    expect(session.warmup.exercises.map(e => e.exerciseId)).toEqual(['ex_warmup_leg_swing'])
    expect(session.cooldown.exercises[0]).toMatchObject({ durationSeconds: 30, sets: 1, restSeconds: 0 })
    expect(session.targetMuscleGroups).toEqual(catalog.get('ex_bodyweight_squat')!.muscleGroups)
    expect(session.estimatedDurationMinutes).toBe(estimateDayMinutes(legs))
  })

  it('maps time-based items without reps and leaves empty sections empty', () => {
    const session = compilePlanTemplate(tree(), opts()).weeks[0].days[2].session!
    expect(session.mainWorkout[0]).toMatchObject({ exerciseId: 'ex_plank', sets: 3, durationSeconds: 45, restSeconds: 30 })
    expect(session.mainWorkout[0].reps).toBeUndefined()
    expect(session.mainWorkout[0].targetWeightKg).toBeUndefined()
    expect(session.warmup).toEqual({ exercises: [], durationMinutes: 0 })
    expect(session.cooldown).toEqual({ exercises: [], durationMinutes: 0 })
  })

  it('gives every session occurrence a unique id', () => {
    const p = compilePlanTemplate(tree(), opts())
    const ids = p.weeks.flatMap(w => w.days.flatMap(d => (d.session ? [d.session.id] : [])))
    expect(ids.length).toBe(4 + 4 + 1)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is a snapshot: later template edits do not change the plan', () => {
    const t = tree()
    const p = compilePlanTemplate(t, opts())
    legs.main[0].items[0].sets[0].reps = 99
    legs.name = 'Renamed'
    base.slots[0] = REST
    const session = p.weeks[0].days[0].session!
    expect(session.title).toBe('Pierna A')
    expect(session.mainWorkout[0].reps).toBe(10)
    // restore shared fixtures
    legs.main[0].items[0].sets[0].reps = 10
    legs.name = 'Pierna A'
    base.slots[0] = { kind: 'training', dayTemplateId: 'legs' }
  })

  it('throws a TemplateValidationError for invalid content', () => {
    const t = tree()
    t.days.delete('core')
    expect(() => compilePlanTemplate(t, opts())).toThrow(TemplateValidationError)
    try {
      compilePlanTemplate(t, opts())
    } catch (e) {
      expect((e as TemplateValidationError).issues.map(i => i.code)).toContain('missing_day')
    }
  })

  it('compiles a pyramid into per-set targets with a first-set summary', () => {
    const sets = [
      { reps: 12, weightKg: 40, restSeconds: 90 },
      { reps: 10, weightKg: 45, restSeconds: 90 },
      { reps: 8, weightKg: 50, restSeconds: 90 },
      { reps: 6, weightKg: 55, restSeconds: 90 },
    ]
    const press: TemplateBlock = {
      id: 'b-press',
      kind: 'pyramid',
      pyramid: { variant: 'ascending', manual: false, params: { setCount: 4, first: { value: 12, weightKg: 40 }, last: { value: 6, weightKg: 55 }, restSeconds: 90 } },
      items: [{ exerciseId: 'ex_barbell_bench_press', mode: 'reps', sets }],
    }
    const t = tree(['deload'])
    t.days.set('core', day('core', { name: 'Core', main: [press] }))
    const ex = compilePlanTemplate(t, opts()).weeks[0].days[0].session!.mainWorkout[0]
    expect(ex).toMatchObject({ sets: 4, reps: 12, targetWeightKg: 40, restSeconds: 90, technique: 'pyramid_ascending' })
    expect(ex.setDetails).toEqual([
      { reps: 12, targetWeightKg: 40, restSeconds: 90 },
      { reps: 10, targetWeightKg: 45, restSeconds: 90 },
      { reps: 8, targetWeightKg: 50, restSeconds: 90 },
      { reps: 6, targetWeightKg: 55, restSeconds: 90 },
    ])
  })

  it('straight blocks carry no per-set details', () => {
    const ex = compilePlanTemplate(tree(), opts()).weeks[0].days[0].session!.mainWorkout[0]
    expect(ex.setDetails).toBeUndefined()
    expect(ex.technique).toBeUndefined()
  })

  it('still refuses to activate a superset', () => {
    const superset: TemplateBlock = { ...straight('ex_plank', 3, { durationSeconds: 30 }), kind: 'superset' }
    const t = tree(['deload'])
    t.days.set('core', day('core', { main: [superset] }))
    expect(() => compilePlanTemplate(t, opts())).toThrow(TemplateValidationError)
  })
})

// ---------------------------------------------------------------------------
describe('plan start date', () => {
  it('mondayOf returns the Monday 00:00 of the same week for every weekday', () => {
    // 2026-11-02 is a Monday
    for (let offset = 0; offset < 7; offset++) {
      const d = new Date(2026, 10, 2 + offset, 18, 30)
      const m = mondayOf(d)
      expect([m.getFullYear(), m.getMonth(), m.getDate(), m.getHours()]).toEqual([2026, 10, 2, 0])
    }
  })

  it('treats Sunday as the last day of the week', () => {
    const m = mondayOf(new Date(2026, 10, 8, 9))
    expect(m.getDate()).toBe(2)
  })

  it('resolves "this week" and "next Monday"', () => {
    const wednesday = new Date(2026, 10, 4, 12)
    expect(resolvePlanStart('this_week', wednesday).getDate()).toBe(2)
    expect(resolvePlanStart('next_monday', wednesday).getDate()).toBe(9)
    const monday = new Date(2026, 10, 2, 8)
    expect(resolvePlanStart('next_monday', monday).getDate()).toBe(9)
  })
})
