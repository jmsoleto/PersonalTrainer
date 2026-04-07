import type { Week } from '../../types/plan'

export interface WeekRange {
  start: number
  end: number
}

export function parsePlanResponse(raw: string, expectedWeekRange?: WeekRange): Week[] {
  // Strip markdown code fences if present
  let jsonStr = raw.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    // Try to extract JSON from surrounding text
    const match = jsonStr.match(/\{[\s\S]*\}/)
    if (!match) {
      const preview = raw.substring(0, 200)
      throw new Error(`No valid JSON found in AI response. Preview: ${preview}`)
    }
    try {
      parsed = JSON.parse(match[0])
    } catch {
      const preview = raw.substring(0, 200)
      throw new Error(`Invalid JSON in AI response. Preview: ${preview}`)
    }
  }

  const data = parsed as Record<string, unknown>

  if (!data.weeks || !Array.isArray(data.weeks)) {
    throw new Error('Response missing "weeks" array')
  }

  const weeks = data.weeks as Week[]

  // Validate expected week count if range provided
  if (expectedWeekRange) {
    const expectedCount = expectedWeekRange.end - expectedWeekRange.start + 1
    if (weeks.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} weeks (${expectedWeekRange.start}-${expectedWeekRange.end}), got ${weeks.length}`,
      )
    }
  }

  // Validate basic structure
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i]

    if (typeof week.weekNumber !== 'number' || !week.theme || !Array.isArray(week.days)) {
      throw new Error(`Invalid week structure at week ${week.weekNumber}`)
    }

    // Renumber weeks if they don't match expected range
    if (expectedWeekRange) {
      const expectedWeekNum = expectedWeekRange.start + i
      if (week.weekNumber !== expectedWeekNum) {
        week.weekNumber = expectedWeekNum
      }
    }

    if (week.days.length !== 7) {
      throw new Error(`Week ${week.weekNumber} must have exactly 7 days, got ${week.days.length}`)
    }

    for (const day of week.days) {
      if (!['training', 'active_rest', 'rest'].includes(day.dayType)) {
        throw new Error(`Invalid dayType "${day.dayType}" at week ${week.weekNumber} day ${day.dayNumber}`)
      }

      if (day.dayType !== 'rest' && !day.session) {
        throw new Error(`Missing session for ${day.dayType} day at week ${week.weekNumber} day ${day.dayNumber}`)
      }

      // Ensure session IDs exist
      if (day.session && !day.session.id) {
        day.session.id = `s-w${week.weekNumber}-d${day.dayNumber}`
      }
    }
  }

  return weeks
}
