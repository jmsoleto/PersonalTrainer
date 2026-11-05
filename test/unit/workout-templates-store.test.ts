import { describe, it, expect, vi } from 'vitest'
import { db } from '../../src/db'
import { useUserStore } from '../../src/stores/user'
import { useWorkoutTemplatesStore, COPY_SUFFIX } from '../../src/stores/workoutTemplates'
import { usePlanStore } from '../../src/stores/plan'
import { Gender, FitnessLevel, FitnessGoal, DayType } from '../../src/types/enums'
import type { DayContent, WeekSlot, TemplateBlock } from '../../src/types/workout-template'
import type { TrainingPlan } from '../../src/types/plan'
import { TemplateValidationError } from '../../src/workout-editor/validation'

vi.mock('../../src/ai/client', () => ({
  callClaude: vi.fn(async () => { throw new Error('AI must not be called') }),
}))
import { callClaude } from '../../src/ai/client'

async function createUser(name: string) {
  return useUserStore().createUser({
    name,
    gender: Gender.Female,
    age: 30,
    weightKg: 60,
    heightCm: 165,
    fitnessLevel: FitnessLevel.Intermediate,
    goals: [FitnessGoal.Strength],
    equipment: [],
  })
}

function straight(exerciseId: string, n: number, reps: number): TemplateBlock {
  return { id: crypto.randomUUID(), kind: 'straight', items: [{ exerciseId, mode: 'reps', sets: Array.from({ length: n }, () => ({ reps, restSeconds: 60 })) }] }
}

function dayContent(name: string): DayContent {
  return { name, warmup: [], main: [straight('ex_bodyweight_squat', 4, 10)], cooldown: [] }
}

const rest: WeekSlot = { kind: 'rest' }
const weekOf = (dayId: string): WeekSlot[] => [{ kind: 'training', dayTemplateId: dayId }, rest, rest, rest, rest, rest, rest]

describe('Dexie v5 template tables', () => {
  it('stores and reads one record per table', async () => {
    await db.dayTemplates.put({ id: 'd', userId: 'u', ...dayContent('D'), createdAt: '', updatedAt: '' })
    await db.weekTemplates.put({ id: 'w', userId: 'u', name: 'W', slots: weekOf('d'), createdAt: '', updatedAt: '' })
    await db.planTemplates.put({ id: 'p', userId: 'u', name: 'P', weekTemplateIds: ['w'], createdAt: '', updatedAt: '' })
    expect((await db.dayTemplates.get('d'))?.name).toBe('D')
    expect((await db.weekTemplates.where('userId').equals('u').toArray())).toHaveLength(1)
    expect((await db.planTemplates.get('p'))?.weekTemplateIds).toEqual(['w'])
  })
})

describe('useWorkoutTemplatesStore', () => {
  it('creates, updates and persists a day template', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    await store.load()

    const day = await store.saveDay(dayContent('Pierna A'))
    expect(day.id).toBeTruthy()
    expect(store.days).toHaveLength(1)

    const updated = await store.saveDay({ ...day, name: 'Pierna A+', main: [straight('ex_bodyweight_squat', 5, 12)] })
    expect(updated.id).toBe(day.id)
    expect(updated.createdAt).toBe(day.createdAt)
    const stored = await db.dayTemplates.get(day.id)
    expect(stored?.name).toBe('Pierna A+')
    expect(stored?.main[0].items[0].sets).toHaveLength(5)
  })

  it('refuses a day without main exercises', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    await expect(store.saveDay({ name: 'Vacío', warmup: [], main: [], cooldown: [] })).rejects.toBeInstanceOf(TemplateValidationError)
    expect(await db.dayTemplates.count()).toBe(0)
  })

  it('isolates templates per user', async () => {
    const userStore = useUserStore()
    const a = await createUser('A')
    const store = useWorkoutTemplatesStore()
    await store.load()
    await store.saveDay(dayContent('Pierna A'))

    await createUser('B')
    await store.ensureLoaded()
    expect(store.days).toEqual([])

    await userStore.selectUser(a.id)
    await store.ensureLoaded()
    expect(store.days.map(d => d.name)).toEqual(['Pierna A'])
  })

  it('duplicates days, weeks and plans with a "(copia)" name', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    const day = await store.saveDay(dayContent('Pierna A'))
    const copy = await store.duplicateDay(day.id)
    expect(copy.id).not.toBe(day.id)
    expect(copy.name).toBe('Pierna A' + COPY_SUFFIX)
    expect(copy.main[0].items).toEqual(day.main[0].items)

    // editing the copy does not touch the original
    await store.saveDay({ ...copy, main: [straight('ex_plank', 1, 1)] })
    expect(store.getDay(day.id)?.main[0].items[0].exerciseId).toBe('ex_bodyweight_squat')

    const week = await store.saveWeek({ name: 'Base', slots: weekOf(day.id) })
    const weekCopy = await store.duplicateWeek(week.id)
    expect(weekCopy.slots).toEqual(week.slots) // still references the same day

    const plan = await store.savePlan({ name: 'Plan', weekTemplateIds: [week.id, week.id] })
    const planCopy = await store.duplicatePlan(plan.id)
    expect(planCopy.weekTemplateIds).toEqual([week.id, week.id])
    expect(planCopy.name).toBe('Plan' + COPY_SUFFIX)
  })

  it('refuses weeks without training days and plans over 52 weeks', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    const day = await store.saveDay(dayContent('D'))
    await expect(store.saveWeek({ name: 'X', slots: Array(7).fill(rest) })).rejects.toBeInstanceOf(TemplateValidationError)
    const week = await store.saveWeek({ name: 'W', slots: weekOf(day.id) })
    await expect(store.savePlan({ name: 'P', weekTemplateIds: Array(53).fill(week.id) })).rejects.toBeInstanceOf(TemplateValidationError)
  })

  it('blocks deleting a day used by a week and lists where it is used', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    const day = await store.saveDay(dayContent('Pierna A'))
    const week = await store.saveWeek({ name: 'Semana base', slots: weekOf(day.id) })

    const result = await store.deleteDay(day.id)
    expect(result).toEqual({ deleted: false, usedBy: [{ id: week.id, name: 'Semana base' }] })
    expect(await db.dayTemplates.get(day.id)).toBeDefined()

    const unused = await store.saveDay(dayContent('Suelto'))
    expect(await store.deleteDay(unused.id)).toEqual({ deleted: true })
    expect(await db.dayTemplates.get(unused.id)).toBeUndefined()
  })

  it('blocks deleting a week used by a plan', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    const day = await store.saveDay(dayContent('D'))
    const week = await store.saveWeek({ name: 'W', slots: weekOf(day.id) })
    const plan = await store.savePlan({ name: 'Mi plan', weekTemplateIds: [week.id] })
    expect(await store.deleteWeek(week.id)).toEqual({ deleted: false, usedBy: [{ id: plan.id, name: 'Mi plan' }] })
  })

  it('duplicates a day preset into the library', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    const day = await store.duplicateDayPreset('preset_day_core_express')
    expect(day.name).toBe('Core exprés')
    expect(day.presetId).toBe('preset_day_core_express')
    expect(day.main.length).toBeGreaterThan(0)
    expect(await db.dayTemplates.count()).toBe(1)
  })

  it('duplicates a week preset creating fresh day copies', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    const week = await store.duplicateWeekPreset('preset_week_split_4')
    expect(week.name).toBe('Split 4 días')
    expect(store.days).toHaveLength(6)
    const dayIds = new Set(store.days.map(d => d.id))
    for (const slot of week.slots) {
      if (slot.kind !== 'rest' && slot.dayTemplateId) expect(dayIds.has(slot.dayTemplateId)).toBe(true)
    }
    expect(week.slots[2]).toMatchObject({ kind: 'active_rest' })
    expect(week.slots[6]).toEqual({ kind: 'rest' })
  })
})

describe('plan store: custom plans', () => {
  async function buildPlanTemplate() {
    const store = useWorkoutTemplatesStore()
    const day = await store.saveDay(dayContent('Pierna A'))
    const week = await store.saveWeek({ name: 'Base', slots: weekOf(day.id) })
    return { store, day, week, plan: await store.savePlan({ name: 'Mi plan', weekTemplateIds: [week.id, week.id] }) }
  }

  it('activates a plan template and abandons the previous active plan', async () => {
    const user = await createUser('A')
    const planStore = usePlanStore()
    await db.trainingPlans.add({ id: 'old', userId: user.id, status: 'active', name: 'IA', weeks: [], totalWeeks: 12 } as unknown as TrainingPlan)
    await db.trainingPlans.add({ id: 'other-user', userId: 'someone-else', status: 'active', name: 'X', weeks: [], totalWeeks: 1 } as unknown as TrainingPlan)
    const { plan } = await buildPlanTemplate()

    const active = await planStore.activateCustomPlan(plan.id, 'next_monday')
    expect(active.source).toBe('custom')
    expect(active.planTemplateId).toBe(plan.id)
    expect(active.totalWeeks).toBe(2)
    expect(active.weeks[0].days[0].dayType).toBe(DayType.Training)
    expect(active.weeks[0].days[0].session?.mainWorkout[0]).toMatchObject({ sets: 4, reps: 10, restSeconds: 60 })
    expect(new Date(active.startDate).getDay()).toBe(1)
    expect(planStore.activePlan?.id).toBe(active.id)
    expect((await db.trainingPlans.get('old'))?.status).toBe('abandoned')
    expect((await db.trainingPlans.get('other-user'))?.status).toBe('active')
  })

  it('keeps the activated plan when templates are edited or the plan template deleted', async () => {
    await createUser('A')
    const planStore = usePlanStore()
    const { store, day, plan } = await buildPlanTemplate()
    const active = await planStore.activateCustomPlan(plan.id, 'this_week')

    await store.saveDay({ ...day, name: 'Cambiado', main: [straight('ex_plank', 1, 1)] })
    await store.deletePlan(plan.id)

    const stored = await db.trainingPlans.get(active.id)
    expect(stored?.weeks[0].days[0].session?.title).toBe('Pierna A')
    expect(stored?.status).toBe('active')
  })

  it('refuses activation when a referenced exercise is not in the catalog', async () => {
    await createUser('A')
    const store = useWorkoutTemplatesStore()
    const day = await store.saveDay({ name: 'Raro', warmup: [], main: [straight('ex_not_in_catalog', 3, 10)], cooldown: [] })
    const week = await store.saveWeek({ name: 'W', slots: weekOf(day.id) })
    const plan = await store.savePlan({ name: 'P', weekTemplateIds: [week.id] })
    await expect(usePlanStore().activateCustomPlan(plan.id, 'this_week')).rejects.toBeInstanceOf(TemplateValidationError)
    expect(await db.trainingPlans.count()).toBe(0)
  })

  it('does not offer or run AI recalculation for custom plans', async () => {
    await createUser('A')
    const planStore = usePlanStore()
    const { plan } = await buildPlanTemplate()
    await planStore.activateCustomPlan(plan.id, 'this_week')
    expect(planStore.canRecalculate).toBe(false)
    await planStore.recalculatePlan('Cambio de equipamiento')
    expect(callClaude).not.toHaveBeenCalled()
  })

  it('computes the current week beyond 12 for long plans', () => {
    const planStore = usePlanStore()
    const start = new Date(Date.now() - (19 * 7 + 2) * 24 * 60 * 60 * 1000)
    planStore.activePlan = { id: 'p', totalWeeks: 24, startDate: start.toISOString(), weeks: [] } as unknown as TrainingPlan
    expect(planStore.getCurrentWeekNumber()).toBe(20)

    planStore.activePlan = { id: 'p', totalWeeks: 12, startDate: new Date(Date.now() - 30 * 7 * 86400000).toISOString(), weeks: [] } as unknown as TrainingPlan
    expect(planStore.getCurrentWeekNumber()).toBe(12)
    expect(planStore.canRecalculate).toBe(true)
  })
})
