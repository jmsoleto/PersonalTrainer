export type PlanStartOption = 'this_week' | 'next_monday'

/** Monday 00:00 (local time) of the week containing `date`. */
export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = d.getDay() || 7 // 1 = Monday .. 7 = Sunday
  d.setDate(d.getDate() - (weekday - 1))
  return d
}

/**
 * Start date of a custom plan: always a Monday, so plan weeks line up with
 * `DayPlan.dayNumber` (1 = Monday .. 7 = Sunday).
 */
export function resolvePlanStart(option: PlanStartOption, now: Date = new Date()): Date {
  const monday = mondayOf(now)
  if (option === 'next_monday') monday.setDate(monday.getDate() + 7)
  return monday
}
