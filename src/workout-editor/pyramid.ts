import type {
  ExerciseMode,
  PyramidConfig,
  PyramidPoint,
  PyramidVariant,
  SetSpec,
} from '../types/workout-template'
import type { PlannedTechnique } from '../types/plan'

/**
 * Pure pyramid generation. The block's sets are the source of truth; these
 * helpers only turn editor parameters into sets (and back into defaults).
 */

export const PYRAMID_MIN_SETS = 2
export const PYRAMID_MAX_SETS = 10
export const TRIANGLE_MIN_STEPS = 2
export const TRIANGLE_MAX_STEPS = 5
export const DROP_MIN_DROPS = 1
export const DROP_MAX_DROPS = 4
export const DROP_MIN_PERCENT = 10
export const DROP_MAX_PERCENT = 40
export const DROP_DEFAULT_PERCENT = 20
export const WEIGHT_STEP_KG = 2.5

const DEFAULT_REPS = 10
const DEFAULT_SECONDS = 30
const DEFAULT_REST = 90
const DEFAULT_DROP_START_KG = 20

export const TECHNIQUE_BY_VARIANT: Record<PyramidVariant, PlannedTechnique> = {
  ascending: 'pyramid_ascending',
  descending: 'pyramid_descending',
  triangle: 'pyramid_triangle',
  drop: 'drop_set',
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Nearest multiple of 2.5 kg (ties round up), at least 2.5 kg. */
export function roundWeight(kg: number): number {
  const rounded = Math.round(kg / WEIGHT_STEP_KG) * WEIGHT_STEP_KG
  return Math.max(WEIGHT_STEP_KG, Number(rounded.toFixed(2)))
}

export function roundReps(reps: number): number {
  return Math.max(1, Math.round(reps))
}

/** Nearest 5 s, at least 5 s. */
export function roundSeconds(seconds: number): number {
  return Math.max(5, Math.round(seconds / 5) * 5)
}

function roundValue(mode: ExerciseMode, value: number): number {
  return mode === 'reps' ? roundReps(value) : roundSeconds(value)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function makeSet(mode: ExerciseMode, value: number, weightKg: number | undefined, restSeconds: number): SetSpec {
  const set: SetSpec = mode === 'reps' ? { reps: value } : { durationSeconds: value }
  if (weightKg !== undefined) set.weightKg = weightKg
  set.restSeconds = restSeconds
  return set
}

/** Sets spread evenly from `a` to `b` (inclusive). A missing weight on one end uses the other end's. */
function spread(mode: ExerciseMode, a: PyramidPoint, b: PyramidPoint, count: number, rest: number): SetSpec[] {
  const wa = a.weightKg ?? b.weightKg
  const wb = b.weightKg ?? a.weightKg
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1)
    const value = roundValue(mode, lerp(a.value, b.value, t))
    const weight = wa === undefined || wb === undefined ? undefined : roundWeight(lerp(wa, wb, t))
    return makeSet(mode, value, weight, rest)
  })
}

/** Generates the sets for a pyramid config. Drop sets are always in reps mode. */
export function generatePyramidSets(mode: ExerciseMode, config: PyramidConfig): SetSpec[] {
  switch (config.variant) {
    case 'ascending':
    case 'descending': {
      const p = config.params
      return spread(mode, p.first, p.last, clamp(p.setCount, PYRAMID_MIN_SETS, PYRAMID_MAX_SETS), p.restSeconds)
    }
    case 'triangle': {
      const p = config.params
      const rising = spread(mode, p.base, p.peak, clamp(p.steps, TRIANGLE_MIN_STEPS, TRIANGLE_MAX_STEPS), p.restSeconds)
      const falling = rising.slice(0, -1).reverse().map(s => ({ ...s }))
      return [...rising, ...falling]
    }
    case 'drop': {
      const p = config.params
      const drops = clamp(p.drops, DROP_MIN_DROPS, DROP_MAX_DROPS)
      const factor = 1 - p.dropPercent / 100
      const reps = roundReps(p.reps)
      const sets: SetSpec[] = []
      let weight = roundWeight(p.startWeightKg)
      for (let i = 0; i <= drops; i++) {
        if (i > 0) weight = roundWeight(weight * factor)
        sets.push(makeSet('reps', reps, weight, i === drops ? p.finalRestSeconds : 0))
      }
      return sets
    }
  }
}

/**
 * Default config for a variant, seeded from existing sets (e.g. converting a
 * straight block): same set count, first = last = the current first set.
 */
export function defaultPyramidConfig(
  variant: PyramidVariant,
  mode: ExerciseMode,
  fromSets: SetSpec[] = [],
): PyramidConfig {
  const first = fromSets[0] ?? {}
  const value = mode === 'reps' ? (first.reps ?? DEFAULT_REPS) : (first.durationSeconds ?? DEFAULT_SECONDS)
  const point: PyramidPoint = first.weightKg !== undefined ? { value, weightKg: first.weightKg } : { value }
  const rest = first.restSeconds ?? DEFAULT_REST
  const count = fromSets.length || 4

  switch (variant) {
    case 'ascending':
    case 'descending':
      return {
        variant,
        manual: false,
        params: {
          setCount: clamp(count, PYRAMID_MIN_SETS, PYRAMID_MAX_SETS),
          first: { ...point },
          last: { ...point },
          restSeconds: rest,
        },
      }
    case 'triangle':
      return {
        variant,
        manual: false,
        params: {
          steps: clamp(Math.ceil((count + 1) / 2), TRIANGLE_MIN_STEPS, TRIANGLE_MAX_STEPS),
          base: { ...point },
          peak: { ...point },
          restSeconds: rest,
        },
      }
    case 'drop':
      return {
        variant,
        manual: false,
        params: {
          startWeightKg: first.weightKg ?? DEFAULT_DROP_START_KG,
          drops: 2,
          dropPercent: DROP_DEFAULT_PERCENT,
          reps: first.reps ?? DEFAULT_REPS,
          finalRestSeconds: rest,
        },
      }
  }
}
