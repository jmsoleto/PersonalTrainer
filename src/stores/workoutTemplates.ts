import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { useUserStore } from './user'
import type {
  DayContent,
  DayTemplate,
  WeekTemplate,
  WeekSlot,
  PlanTemplate,
  TemplateBlock,
} from '../types/workout-template'
import {
  validateDay,
  validateWeek,
  validatePlan,
  TemplateValidationError,
} from '../workout-editor/validation'
import { getDayPreset, getWeekPreset } from '../workout-editor/presets'

export interface TemplateRef {
  id: string
  name: string
}

export type DeleteResult = { deleted: true } | { deleted: false; usedBy: TemplateRef[] }

export const COPY_SUFFIX = ' (copia)'

/** Plain deep copy: drops Vue proxies so IndexedDB can structured-clone it. */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function newId(): string {
  return crypto.randomUUID()
}

/** Copies blocks giving each one a fresh id. */
function cloneBlocks(blocks: TemplateBlock[]): TemplateBlock[] {
  return plain(blocks).map(b => ({ ...b, id: newId() }))
}

function cloneDayContent(content: DayContent): DayContent {
  return {
    name: content.name,
    ...(content.notes ? { notes: content.notes } : {}),
    warmup: cloneBlocks(content.warmup),
    main: cloneBlocks(content.main),
    cooldown: cloneBlocks(content.cooldown),
  }
}

export const useWorkoutTemplatesStore = defineStore('workoutTemplates', () => {
  const days = ref<DayTemplate[]>([])
  const weeks = ref<WeekTemplate[]>([])
  const plans = ref<PlanTemplate[]>([])
  const loadedForUserId = ref<string | null>(null)

  function requireUserId(): string {
    const id = useUserStore().currentUser?.id
    if (!id) throw new Error('No user profile found')
    return id
  }

  async function load(): Promise<void> {
    const userId = useUserStore().currentUser?.id ?? null
    if (!userId) {
      days.value = []
      weeks.value = []
      plans.value = []
      loadedForUserId.value = null
      return
    }
    const [d, w, p] = await Promise.all([
      db.dayTemplates.where('userId').equals(userId).toArray(),
      db.weekTemplates.where('userId').equals(userId).toArray(),
      db.planTemplates.where('userId').equals(userId).toArray(),
    ])
    days.value = d
    weeks.value = w
    plans.value = p
    loadedForUserId.value = userId
  }

  /** Loads the library if it has not been loaded for the current user yet. */
  async function ensureLoaded(): Promise<void> {
    const userStore = useUserStore()
    // Deep links (e.g. reloading /plan/editor/day/:id) arrive before any page loaded the user.
    if (!userStore.currentUser) await userStore.loadUser()
    const userId = userStore.currentUser?.id ?? null
    if (loadedForUserId.value === null || loadedForUserId.value !== userId) {
      await load()
    }
  }

  const getDay = (id: string) => days.value.find(d => d.id === id)
  const getWeek = (id: string) => weeks.value.find(w => w.id === id)
  const getPlan = (id: string) => plans.value.find(p => p.id === id)

  function upsertLocal<T extends { id: string }>(list: T[], item: T): void {
    const idx = list.findIndex(x => x.id === item.id)
    if (idx >= 0) list.splice(idx, 1, item)
    else list.push(item)
  }

  // ---------------------------------------------------------------- days

  async function saveDay(input: DayContent & { id?: string; presetId?: string }): Promise<DayTemplate> {
    const userId = requireUserId()
    const now = new Date().toISOString()
    const existing = input.id ? getDay(input.id) : undefined
    const day: DayTemplate = plain({
      id: existing?.id ?? input.id ?? newId(),
      userId,
      name: input.name.trim(),
      ...(input.notes ? { notes: input.notes } : {}),
      warmup: input.warmup,
      main: input.main,
      cooldown: input.cooldown,
      ...(input.presetId ?? existing?.presetId ? { presetId: input.presetId ?? existing?.presetId } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    const issues = validateDay(day)
    if (issues.length > 0) throw new TemplateValidationError(issues)
    await db.dayTemplates.put(day)
    upsertLocal(days.value, day)
    return day
  }

  async function duplicateDay(id: string): Promise<DayTemplate> {
    const source = getDay(id)
    if (!source) throw new Error('Day template not found')
    return saveDay({ ...cloneDayContent(source), name: source.name + COPY_SUFFIX })
  }

  function usagesOfDay(id: string): TemplateRef[] {
    return weeks.value
      .filter(w => w.slots.some(s => s.kind !== 'rest' && s.dayTemplateId === id))
      .map(w => ({ id: w.id, name: w.name }))
  }

  async function deleteDay(id: string): Promise<DeleteResult> {
    const usedBy = usagesOfDay(id)
    if (usedBy.length > 0) return { deleted: false, usedBy }
    await db.dayTemplates.delete(id)
    days.value = days.value.filter(d => d.id !== id)
    return { deleted: true }
  }

  // --------------------------------------------------------------- weeks

  async function saveWeek(input: { id?: string; name: string; slots: WeekSlot[]; presetId?: string }): Promise<WeekTemplate> {
    const userId = requireUserId()
    const now = new Date().toISOString()
    const existing = input.id ? getWeek(input.id) : undefined
    const week: WeekTemplate = plain({
      id: existing?.id ?? input.id ?? newId(),
      userId,
      name: input.name.trim(),
      slots: input.slots,
      ...(input.presetId ?? existing?.presetId ? { presetId: input.presetId ?? existing?.presetId } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    const issues = validateWeek(week, dayId => !!getDay(dayId))
    if (issues.length > 0) throw new TemplateValidationError(issues)
    await db.weekTemplates.put(week)
    upsertLocal(weeks.value, week)
    return week
  }

  async function duplicateWeek(id: string): Promise<WeekTemplate> {
    const source = getWeek(id)
    if (!source) throw new Error('Week template not found')
    return saveWeek({ name: source.name + COPY_SUFFIX, slots: plain(source.slots) })
  }

  function usagesOfWeek(id: string): TemplateRef[] {
    return plans.value
      .filter(p => p.weekTemplateIds.includes(id))
      .map(p => ({ id: p.id, name: p.name }))
  }

  async function deleteWeek(id: string): Promise<DeleteResult> {
    const usedBy = usagesOfWeek(id)
    if (usedBy.length > 0) return { deleted: false, usedBy }
    await db.weekTemplates.delete(id)
    weeks.value = weeks.value.filter(w => w.id !== id)
    return { deleted: true }
  }

  // --------------------------------------------------------------- plans

  async function savePlan(input: { id?: string; name: string; weekTemplateIds: string[] }): Promise<PlanTemplate> {
    const userId = requireUserId()
    const now = new Date().toISOString()
    const existing = input.id ? getPlan(input.id) : undefined
    const plan: PlanTemplate = plain({
      id: existing?.id ?? input.id ?? newId(),
      userId,
      name: input.name.trim(),
      weekTemplateIds: input.weekTemplateIds,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    const issues = validatePlan(plan, weekId => !!getWeek(weekId))
    if (issues.length > 0) throw new TemplateValidationError(issues)
    await db.planTemplates.put(plan)
    upsertLocal(plans.value, plan)
    return plan
  }

  async function duplicatePlan(id: string): Promise<PlanTemplate> {
    const source = getPlan(id)
    if (!source) throw new Error('Plan template not found')
    return savePlan({ name: source.name + COPY_SUFFIX, weekTemplateIds: [...source.weekTemplateIds] })
  }

  /** Plans are never referenced by other templates; activated plans are snapshots. */
  async function deletePlan(id: string): Promise<DeleteResult> {
    await db.planTemplates.delete(id)
    plans.value = plans.value.filter(p => p.id !== id)
    return { deleted: true }
  }

  // ------------------------------------------------------------- presets

  async function duplicateDayPreset(presetId: string): Promise<DayTemplate> {
    const preset = getDayPreset(presetId)
    if (!preset) throw new Error(`Unknown day preset: ${presetId}`)
    return saveDay({ ...cloneDayContent(preset), presetId })
  }

  /** Creates fresh day copies for every day preset used, then the week. */
  async function duplicateWeekPreset(presetId: string): Promise<WeekTemplate> {
    const preset = getWeekPreset(presetId)
    if (!preset) throw new Error(`Unknown week preset: ${presetId}`)

    const idMap = new Map<string, string>()
    for (const slot of preset.slots) {
      if (slot.kind === 'rest' || !slot.dayPresetId || idMap.has(slot.dayPresetId)) continue
      const day = await duplicateDayPreset(slot.dayPresetId)
      idMap.set(slot.dayPresetId, day.id)
    }

    const slots: WeekSlot[] = preset.slots.map(slot => {
      if (slot.kind === 'rest') return { kind: 'rest' }
      if (slot.kind === 'training') return { kind: 'training', dayTemplateId: idMap.get(slot.dayPresetId)! }
      return slot.dayPresetId
        ? { kind: 'active_rest', dayTemplateId: idMap.get(slot.dayPresetId)! }
        : { kind: 'active_rest' }
    })
    return saveWeek({ name: preset.name, slots, presetId })
  }

  return {
    days,
    weeks,
    plans,
    load,
    ensureLoaded,
    getDay,
    getWeek,
    getPlan,
    saveDay,
    duplicateDay,
    usagesOfDay,
    deleteDay,
    saveWeek,
    duplicateWeek,
    usagesOfWeek,
    deleteWeek,
    savePlan,
    duplicatePlan,
    deletePlan,
    duplicateDayPreset,
    duplicateWeekPreset,
  }
})
