import type {
  TrainingPlan,
  Week,
  DayPlan,
  PlannedSession,
  PlannedExercise,
  PlannedSet,
  PlanContext,
} from '../types/plan'
import type { Exercise } from '../types/exercise'
import type { MuscleGroup } from '../types/enums'
import { DayType } from '../types/enums'
import type { DayTemplate, TemplateBlock, WeekSlot } from '../types/workout-template'
import { validatePlanTree, TemplateValidationError, type PlanTree } from './validation'
import { estimateBlocksMinutes, estimateDayMinutes } from './duration'
import { TECHNIQUE_BY_VARIANT } from './pyramid'
import { supersetLetters } from './superset'

export interface CompileOptions {
  userId: string
  startDate: Date
  basedOn: PlanContext
  getExercise: (id: string) => Exercise | undefined
  /** Injected for deterministic tests. */
  newId?: () => string
  now?: Date
}

function compileBlocks(blocks: TemplateBlock[], getExercise: CompileOptions['getExercise']): PlannedExercise[] {
  const out: PlannedExercise[] = []
  const letters = supersetLetters(blocks)
  for (const block of blocks) {
    if (block.kind !== 'straight' && block.kind !== 'pyramid' && block.kind !== 'superset') {
      // Guarded by validation; kept so an unknown kind never drops data silently.
      throw new TemplateValidationError([{
        templateType: 'day', templateId: block.id, code: 'unsupported_block',
        message: `Tipo de bloque no soportado: ${String(block.kind)}`,
      }])
    }
    for (const [index, item] of block.items.entries()) {
      const first = item.sets[0] ?? {}
      const planned: PlannedExercise = {
        exerciseId: item.exerciseId,
        exerciseName: getExercise(item.exerciseId)?.name ?? item.exerciseId,
        sets: item.sets.length,
        restSeconds: first.restSeconds ?? 0,
      }
      if (item.mode === 'reps') planned.reps = first.reps
      else planned.durationSeconds = first.durationSeconds
      if (first.weightKg !== undefined) planned.targetWeightKg = first.weightKg
      if (item.notes) planned.notes = item.notes
      if (block.kind === 'pyramid' && block.pyramid) {
        planned.technique = TECHNIQUE_BY_VARIANT[block.pyramid.variant]
        planned.setDetails = item.sets.map(set => {
          const detail: PlannedSet = { restSeconds: set.restSeconds ?? 0 }
          if (item.mode === 'reps') detail.reps = set.reps
          else detail.durationSeconds = set.durationSeconds
          if (set.weightKg !== undefined) detail.targetWeightKg = set.weightKg
          return detail
        })
      }
      const group = letters.get(block.id)
      if (block.kind === 'superset' && group) {
        planned.superset = { group, position: index === 0 ? 1 : 2 }
      }
      out.push(planned)
    }
  }
  return out
}

function targetMuscles(day: DayTemplate, getExercise: CompileOptions['getExercise']): MuscleGroup[] {
  const set = new Set<MuscleGroup>()
  for (const block of day.main) {
    for (const item of block.items) {
      for (const m of getExercise(item.exerciseId)?.muscleGroups ?? []) set.add(m)
    }
  }
  return [...set]
}

/** Compiles a day template into a session. `sessionId` must be unique within the plan. */
export function compileDay(day: DayTemplate, sessionId: string, getExercise: CompileOptions['getExercise']): PlannedSession {
  return {
    id: sessionId,
    title: day.name,
    targetMuscleGroups: targetMuscles(day, getExercise),
    estimatedDurationMinutes: estimateDayMinutes(day),
    warmup: {
      exercises: compileBlocks(day.warmup, getExercise),
      durationMinutes: estimateBlocksMinutes(day.warmup),
    },
    mainWorkout: compileBlocks(day.main, getExercise),
    cooldown: {
      exercises: compileBlocks(day.cooldown, getExercise),
      durationMinutes: estimateBlocksMinutes(day.cooldown),
    },
  }
}

function compileSlot(
  slot: WeekSlot,
  dayNumber: number,
  sessionId: string,
  days: Map<string, DayTemplate>,
  getExercise: CompileOptions['getExercise'],
): DayPlan {
  if (slot.kind === 'rest') return { dayNumber, dayType: DayType.Rest }
  const day = slot.dayTemplateId ? days.get(slot.dayTemplateId) : undefined
  const dayType = slot.kind === 'training' ? DayType.Training : DayType.ActiveRest
  if (!day) return { dayNumber, dayType }
  return { dayNumber, dayType, session: compileDay(day, sessionId, getExercise) }
}

/**
 * Compiles a plan template (and the weeks/days it references) into a
 * self-contained TrainingPlan snapshot. Pure: no persistence, no store access.
 * Throws TemplateValidationError when anything referenced is invalid.
 */
export function compilePlanTemplate(tree: PlanTree, opts: CompileOptions): TrainingPlan {
  const issues = validatePlanTree(tree, id => opts.getExercise(id) !== undefined)
  if (issues.length > 0) throw new TemplateValidationError(issues)

  const newId = opts.newId ?? (() => crypto.randomUUID())
  const planId = newId()

  const weeks: Week[] = tree.plan.weekTemplateIds.map((weekId, i) => {
    const week = tree.weeks.get(weekId)!
    const weekNumber = i + 1
    return {
      weekNumber,
      theme: week.name,
      days: week.slots.map((slot, j) =>
        compileSlot(slot, j + 1, `${planId}-w${weekNumber}-d${j + 1}`, tree.days, opts.getExercise),
      ),
    }
  })

  return {
    id: planId,
    userId: opts.userId,
    name: tree.plan.name,
    totalWeeks: weeks.length,
    startDate: opts.startDate.toISOString(),
    status: 'active',
    generatedAt: (opts.now ?? new Date()).toISOString(),
    basedOn: opts.basedOn,
    weeks,
    source: 'custom',
    planTemplateId: tree.plan.id,
  }
}
