import type { Week } from '../../types/plan'

export function parsePlanResponse(raw: string): Week[] {
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
      throw new Error('No valid JSON found in AI response')
    }
    parsed = JSON.parse(match[0])
  }

  const data = parsed as Record<string, unknown>

  if (!data.weeks || !Array.isArray(data.weeks)) {
    throw new Error('Response missing "weeks" array')
  }

  const weeks = data.weeks as Week[]

  // Validate basic structure
  for (const week of weeks) {
    if (typeof week.weekNumber !== 'number' || !week.theme || !Array.isArray(week.days)) {
      throw new Error(`Invalid week structure at week ${week.weekNumber}`)
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
