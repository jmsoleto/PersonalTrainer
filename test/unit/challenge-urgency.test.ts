import { describe, it, expect } from 'vitest'
import { daysRemaining, isUrgent } from '../../src/composables/useChallengeChecker'

/** A YYYY-MM-DD string exactly `offset` days from local today. */
function dayFromToday(offset: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

describe('daysRemaining', () => {
  it('is 0 for a window ending today', () => {
    expect(daysRemaining(dayFromToday(0))).toBe(0)
  })

  it('counts whole days ahead', () => {
    expect(daysRemaining(dayFromToday(1))).toBe(1)
    expect(daysRemaining(dayFromToday(12))).toBe(12)
  })

  it('is negative once the window has closed', () => {
    expect(daysRemaining(dayFromToday(-1))).toBe(-1)
  })
})

describe('isUrgent', () => {
  it('is urgent when 3 or fewer days remain', () => {
    expect(isUrgent(3, 0.1)).toBe(true)
    expect(isUrgent(0, 0.1)).toBe(true)
    expect(isUrgent(-2, 0.1)).toBe(true)
  })

  it('is not urgent with more than 3 days and a low ratio', () => {
    expect(isUrgent(4, 0.1)).toBe(false)
    expect(isUrgent(30, 0.84)).toBe(false)
  })

  it('is urgent when nearly complete regardless of days left', () => {
    expect(isUrgent(30, 0.85)).toBe(true)
    expect(isUrgent(100, 0.99)).toBe(true)
  })

  it('treats the boundaries (days=3, ratio=0.85) as urgent', () => {
    expect(isUrgent(3, 0.85)).toBe(true)
  })
})
