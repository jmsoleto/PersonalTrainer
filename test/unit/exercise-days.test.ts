import { describe, it, expect } from 'vitest'
import { exerciseDays, longestStreak, isoToDay } from '../../src/composables/useExerciseDays'
import type { CompletedSession } from '../../src/types/plan'
import type { ManualActivity } from '../../src/types/activity'

function session(completedAt: string): CompletedSession {
  return {
    id: crypto.randomUUID(),
    planId: 'plan-1',
    plannedSessionId: 'ps-1',
    weekNumber: 1,
    dayNumber: 1,
    startedAt: completedAt,
    completedAt,
    difficultyRating: 3,
    exercises: [],
    skippedExercises: [],
  } as CompletedSession
}

function activity(date: string, type: ManualActivity['type'] = 'running'): ManualActivity {
  return { userId: 'u1', date, type, createdAt: date + 'T00:00:00Z' }
}

describe('exerciseDays', () => {
  it('dedupes a session and an activity on the same day into one', () => {
    const days = exerciseDays(
      [session('2026-03-10T18:00:00Z')],
      [activity('2026-03-10')],
    )
    expect(days.size).toBe(1)
    expect(days.has('2026-03-10')).toBe(true)
  })

  it('counts an activity-only day', () => {
    const days = exerciseDays([], [activity('2026-03-11')])
    expect(days.has('2026-03-11')).toBe(true)
    expect(days.size).toBe(1)
  })

  it('counts a session-only day', () => {
    const days = exerciseDays([session('2026-03-12T09:00:00Z')], [])
    expect(days.has('2026-03-12')).toBe(true)
  })

  it('restricts to the inclusive window', () => {
    const days = exerciseDays(
      [session('2026-01-01T09:00:00Z')],
      [activity('2026-03-15'), activity('2026-12-31')],
      { start: '2026-03-01', end: '2026-06-30' },
    )
    expect(days.has('2026-03-15')).toBe(true)
    expect(days.has('2026-01-01')).toBe(false)
    expect(days.has('2026-12-31')).toBe(false)
    expect(days.size).toBe(1)
  })

  it('isoToDay extracts the calendar day', () => {
    expect(isoToDay('2026-03-10T18:30:00Z')).toBe('2026-03-10')
  })
})

describe('longestStreak', () => {
  it('returns 0 for no days', () => {
    expect(longestStreak([])).toBe(0)
  })

  it('finds the longest consecutive run', () => {
    expect(longestStreak(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-10'])).toBe(3)
  })

  it('treats gaps as breaking the streak', () => {
    expect(longestStreak(['2026-03-01', '2026-03-03', '2026-03-04'])).toBe(2)
  })

  it('ignores duplicate days', () => {
    expect(longestStreak(['2026-03-01', '2026-03-01', '2026-03-02'])).toBe(2)
  })
})
