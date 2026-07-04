import type { CompletedSession } from '../types/plan'
import type { ManualActivity } from '../types/activity'

/** Inclusive date window expressed as YYYY-MM-DD strings. */
export interface DateWindow {
  start: string
  end: string
}

/** Extract the local calendar day (YYYY-MM-DD) from an ISO timestamp. */
export function isoToDay(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * The distinct set of calendar days (YYYY-MM-DD) on which the user either
 * completed a plan session OR logged a manual activity. Two qualifying events
 * on the same day collapse to a single exercise day. Optionally restricted to
 * an inclusive date window.
 */
export function exerciseDays(
  sessions: CompletedSession[],
  activities: ManualActivity[],
  window?: DateWindow,
): Set<string> {
  const days = new Set<string>()
  for (const s of sessions) days.add(isoToDay(s.completedAt))
  for (const a of activities) days.add(a.date)

  if (!window) return days

  const filtered = new Set<string>()
  for (const d of days) {
    if (d >= window.start && d <= window.end) filtered.add(d)
  }
  return filtered
}

/**
 * Longest run of consecutive calendar days within the given set of days.
 * Returns 0 for an empty set.
 */
export function longestStreak(days: Set<string> | string[]): number {
  const sorted = [...new Set(days)].sort()
  if (sorted.length === 0) return 0

  let maxStreak = 1
  let currentStreak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00')
    const curr = new Date(sorted[i] + 'T00:00:00')
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else if (diff !== 0) {
      currentStreak = 1
    }
  }
  return maxStreak
}
