import type {
  DayContent,
  TemplateBlock,
  WeekSlot,
  WeekTemplate,
  PlanTemplate,
  DayTemplate,
  SectionKey,
} from '../types/workout-template'
import { WEEK_LENGTH, MAX_PLAN_WEEKS } from '../types/workout-template'
import { PYRAMID_MIN_SETS, PYRAMID_MAX_SETS, WEIGHT_STEP_KG } from './pyramid'
import { SUPERSET_ITEMS, SUPERSET_MIN_ROUNDS, SUPERSET_MAX_ROUNDS } from './superset'

export type TemplateType = 'day' | 'week' | 'plan'

export type IssueCode =
  | 'empty_name'
  | 'empty_main'
  | 'empty_block'
  | 'unsupported_block'
  | 'pyramid_outside_main'
  | 'pyramid_set_count'
  | 'pyramid_missing_config'
  | 'drop_requires_weight'
  | 'drop_not_decreasing'
  | 'superset_outside_main'
  | 'superset_item_count'
  | 'superset_uneven_rounds'
  | 'superset_round_count'
  | 'no_sets'
  | 'invalid_value'
  | 'unknown_exercise'
  | 'duplicate_exercise'
  | 'invalid_slot_count'
  | 'no_training_day'
  | 'missing_day'
  | 'empty_plan'
  | 'too_many_weeks'
  | 'missing_week'
  | 'missing_plan'

export interface TemplateIssue {
  templateType: TemplateType
  /** Template id, or a preset id when validating presets. */
  templateId: string
  templateName?: string
  code: IssueCode
  message: string
  section?: SectionKey
  exerciseId?: string
}

export interface ValidationOptions {
  /** When provided, exercise ids are checked against the catalog. */
  exerciseExists?: (id: string) => boolean
}

const SECTION_LABEL: Record<SectionKey, string> = {
  warmup: 'calentamiento',
  main: 'principal',
  cooldown: 'estiramientos',
}

function isPositive(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

function isNonNegative(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

/** Validates one value of a set prescription. Returns true if acceptable. */
export function isValidSetValue(field: 'reps' | 'durationSeconds' | 'weightKg' | 'restSeconds', value: unknown): boolean {
  if (field === 'restSeconds') return isNonNegative(value)
  if (field === 'weightKg') return isPositive(value)
  return isPositive(value) && Number.isInteger(value)
}

function validateBlocks(
  blocks: TemplateBlock[],
  section: SectionKey,
  base: Pick<TemplateIssue, 'templateType' | 'templateId' | 'templateName'>,
  opts: ValidationOptions,
): TemplateIssue[] {
  const issues: TemplateIssue[] = []
  const seen = new Set<string>()

  for (const block of blocks) {
    // Straight everywhere; pyramids and supersets in the main workout only.
    if (block.kind === 'superset') {
      issues.push(...validateSuperset(block, section, base))
    } else if (block.kind !== 'straight' && block.kind !== 'pyramid') {
      issues.push({ ...base, section, code: 'unsupported_block', message: `Tipo de bloque no soportado: ${String(block.kind)}` })
    }
    if (block.kind === 'pyramid') {
      issues.push(...validatePyramid(block, section, base))
    } else if (block.pyramid) {
      issues.push({ ...base, section, code: 'pyramid_missing_config', message: 'Configuración de pirámide en un bloque que no es pirámide' })
    }
    if (block.items.length === 0) {
      issues.push({ ...base, section, code: 'empty_block', message: `Hay un bloque vacío en ${SECTION_LABEL[section]}` })
    }
    for (const item of block.items) {
      if (opts.exerciseExists && !opts.exerciseExists(item.exerciseId)) {
        issues.push({ ...base, section, exerciseId: item.exerciseId, code: 'unknown_exercise', message: `Ejercicio no disponible: ${item.exerciseId}` })
      }
      if (seen.has(item.exerciseId)) {
        issues.push({ ...base, section, exerciseId: item.exerciseId, code: 'duplicate_exercise', message: `Ejercicio repetido en ${SECTION_LABEL[section]}` })
      }
      seen.add(item.exerciseId)

      if (item.sets.length === 0) {
        issues.push({ ...base, section, exerciseId: item.exerciseId, code: 'no_sets', message: 'Cada ejercicio necesita al menos una serie' })
        continue
      }
      const bad = item.sets.some(set => {
        const main = item.mode === 'reps'
          ? isValidSetValue('reps', set.reps)
          : isValidSetValue('durationSeconds', set.durationSeconds)
        const weightOk = set.weightKg === undefined || isValidSetValue('weightKg', set.weightKg)
        const restOk = set.restSeconds === undefined || isValidSetValue('restSeconds', set.restSeconds)
        return !main || !weightOk || !restOk
      })
      if (bad) {
        issues.push({ ...base, section, exerciseId: item.exerciseId, code: 'invalid_value', message: 'Repeticiones, tiempo y peso deben ser mayores que 0' })
      }
    }
  }
  return issues
}

function validatePyramid(
  block: TemplateBlock,
  section: SectionKey,
  base: Pick<TemplateIssue, 'templateType' | 'templateId' | 'templateName'>,
): TemplateIssue[] {
  const issues: TemplateIssue[] = []
  if (section !== 'main') {
    issues.push({ ...base, section, code: 'pyramid_outside_main', message: `Las pirámides solo se permiten en el entrenamiento principal, no en ${SECTION_LABEL[section]}` })
  }
  if (!block.pyramid) {
    issues.push({ ...base, section, code: 'pyramid_missing_config', message: 'A la pirámide le falta su configuración' })
    return issues
  }
  for (const item of block.items) {
    const n = item.sets.length
    if (n < PYRAMID_MIN_SETS || n > PYRAMID_MAX_SETS) {
      issues.push({ ...base, section, exerciseId: item.exerciseId, code: 'pyramid_set_count', message: `Una pirámide necesita entre ${PYRAMID_MIN_SETS} y ${PYRAMID_MAX_SETS} series` })
    }
    if (block.pyramid.variant !== 'drop') continue
    if (item.mode !== 'reps' || item.sets.some(set => set.weightKg === undefined)) {
      issues.push({ ...base, section, exerciseId: item.exerciseId, code: 'drop_requires_weight', message: 'Un drop set necesita peso y repeticiones' })
      continue
    }
    const decreasing = item.sets.every((set, i) =>
      set.weightKg! >= WEIGHT_STEP_KG && (i === 0 || set.weightKg! < item.sets[i - 1].weightKg!))
    if (!decreasing) {
      issues.push({ ...base, section, exerciseId: item.exerciseId, code: 'drop_not_decreasing', message: 'Cada tramo del drop set debe pesar menos que el anterior y al menos 2,5 kg' })
    }
  }
  return issues
}

function validateSuperset(
  block: TemplateBlock,
  section: SectionKey,
  base: Pick<TemplateIssue, 'templateType' | 'templateId' | 'templateName'>,
): TemplateIssue[] {
  const issues: TemplateIssue[] = []
  if (section !== 'main') {
    issues.push({ ...base, section, code: 'superset_outside_main', message: `Las superseries solo se permiten en el entrenamiento principal, no en ${SECTION_LABEL[section]}` })
  }
  if (block.items.length !== SUPERSET_ITEMS) {
    issues.push({ ...base, section, code: 'superset_item_count', message: 'Una superserie debe tener exactamente 2 ejercicios' })
    return issues
  }
  const [a, b] = block.items
  if (a.sets.length !== b.sets.length) {
    issues.push({ ...base, section, code: 'superset_uneven_rounds', message: 'Los dos ejercicios de una superserie deben tener las mismas rondas' })
  }
  const rounds = Math.max(a.sets.length, b.sets.length)
  if (rounds < SUPERSET_MIN_ROUNDS || rounds > SUPERSET_MAX_ROUNDS) {
    issues.push({ ...base, section, code: 'superset_round_count', message: `Una superserie necesita entre ${SUPERSET_MIN_ROUNDS} y ${SUPERSET_MAX_ROUNDS} rondas` })
  }
  return issues
}

/** Validates a day's content. `id` identifies the template (or preset) in issues. */
export function validateDay(
  day: DayContent & { id: string },
  opts: ValidationOptions = {},
): TemplateIssue[] {
  const base = { templateType: 'day' as const, templateId: day.id, templateName: day.name }
  const issues: TemplateIssue[] = []
  if (!day.name.trim()) {
    issues.push({ ...base, code: 'empty_name', message: 'El día necesita un nombre' })
  }
  const mainItems = day.main.reduce((n, b) => n + b.items.length, 0)
  if (mainItems === 0) {
    issues.push({ ...base, section: 'main', code: 'empty_main', message: 'El entrenamiento principal necesita al menos un ejercicio' })
  }
  // Duplicates only matter in the main workout (the session runner keys
  // main exercises by id); warm-up/cool-down lists are informational.
  issues.push(...validateBlocks(day.warmup, 'warmup', base, opts).filter(i => i.code !== 'duplicate_exercise'))
  issues.push(...validateBlocks(day.main, 'main', base, opts))
  issues.push(...validateBlocks(day.cooldown, 'cooldown', base, opts).filter(i => i.code !== 'duplicate_exercise'))
  return issues
}

function slotDayId(slot: WeekSlot): string | undefined {
  return slot.kind === 'rest' ? undefined : slot.dayTemplateId
}

export function validateWeek(
  week: Pick<WeekTemplate, 'id' | 'name' | 'slots'>,
  dayExists?: (id: string) => boolean,
): TemplateIssue[] {
  const base = { templateType: 'week' as const, templateId: week.id, templateName: week.name }
  const issues: TemplateIssue[] = []
  if (!week.name.trim()) {
    issues.push({ ...base, code: 'empty_name', message: 'La semana necesita un nombre' })
  }
  if (week.slots.length !== WEEK_LENGTH) {
    issues.push({ ...base, code: 'invalid_slot_count', message: 'La semana debe tener 7 días' })
  }
  if (!week.slots.some(s => s.kind === 'training')) {
    issues.push({ ...base, code: 'no_training_day', message: 'La semana necesita al menos un día de entrenamiento' })
  }
  if (dayExists) {
    for (const slot of week.slots) {
      const id = slotDayId(slot)
      if (id && !dayExists(id)) {
        issues.push({ ...base, code: 'missing_day', message: 'La semana usa un día que ya no existe' })
        break
      }
    }
  }
  return issues
}

export function validatePlan(
  plan: Pick<PlanTemplate, 'id' | 'name' | 'weekTemplateIds'>,
  weekExists?: (id: string) => boolean,
): TemplateIssue[] {
  const base = { templateType: 'plan' as const, templateId: plan.id, templateName: plan.name }
  const issues: TemplateIssue[] = []
  if (!plan.name.trim()) {
    issues.push({ ...base, code: 'empty_name', message: 'El plan necesita un nombre' })
  }
  if (plan.weekTemplateIds.length === 0) {
    issues.push({ ...base, code: 'empty_plan', message: 'El plan necesita al menos una semana' })
  }
  if (plan.weekTemplateIds.length > MAX_PLAN_WEEKS) {
    issues.push({ ...base, code: 'too_many_weeks', message: `Un plan admite como máximo ${MAX_PLAN_WEEKS} semanas` })
  }
  if (weekExists && plan.weekTemplateIds.some(id => !weekExists(id))) {
    issues.push({ ...base, code: 'missing_week', message: 'El plan usa una semana que ya no existe' })
  }
  return issues
}

export interface PlanTree {
  plan: PlanTemplate
  weeks: Map<string, WeekTemplate>
  days: Map<string, DayTemplate>
}

/**
 * Full validation for activation: the plan, every week it references and
 * every day those weeks reference, including the catalog check.
 */
export function validatePlanTree(tree: PlanTree, exerciseExists: (id: string) => boolean): TemplateIssue[] {
  const issues: TemplateIssue[] = [...validatePlan(tree.plan, id => tree.weeks.has(id))]
  const checkedWeeks = new Set<string>()
  const checkedDays = new Set<string>()

  for (const weekId of tree.plan.weekTemplateIds) {
    const week = tree.weeks.get(weekId)
    if (!week || checkedWeeks.has(weekId)) continue
    checkedWeeks.add(weekId)
    issues.push(...validateWeek(week, id => tree.days.has(id)))

    for (const slot of week.slots) {
      const dayId = slotDayId(slot)
      if (!dayId || checkedDays.has(dayId)) continue
      checkedDays.add(dayId)
      const day = tree.days.get(dayId)
      if (day) issues.push(...validateDay(day, { exerciseExists }))
    }
  }
  return issues
}

export class TemplateValidationError extends Error {
  constructor(public readonly issues: TemplateIssue[]) {
    super(issues.map(i => (i.templateName ? `${i.templateName}: ${i.message}` : i.message)).join('\n'))
    this.name = 'TemplateValidationError'
  }
}
