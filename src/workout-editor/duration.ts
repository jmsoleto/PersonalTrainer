import type { DayContent, TemplateBlock } from '../types/workout-template'

/** Approximate time per repetition, used only for display estimates. */
export const SECONDS_PER_REP = 3

export function estimateBlocksSeconds(blocks: TemplateBlock[]): number {
  let total = 0
  for (const block of blocks) {
    for (const item of block.items) {
      for (const set of item.sets) {
        total += item.mode === 'time'
          ? (set.durationSeconds ?? 0)
          : (set.reps ?? 0) * SECONDS_PER_REP
        total += set.restSeconds ?? 0
      }
    }
    total += block.restAfterSeconds ?? 0
  }
  return total
}

export function secondsToMinutes(seconds: number): number {
  return Math.ceil(seconds / 60)
}

export function estimateBlocksMinutes(blocks: TemplateBlock[]): number {
  return secondsToMinutes(estimateBlocksSeconds(blocks))
}

/** Approximate total minutes of a day (warm-up + main + cool-down). */
export function estimateDayMinutes(day: Pick<DayContent, 'warmup' | 'main' | 'cooldown'>): number {
  return secondsToMinutes(
    estimateBlocksSeconds(day.warmup) + estimateBlocksSeconds(day.main) + estimateBlocksSeconds(day.cooldown),
  )
}
