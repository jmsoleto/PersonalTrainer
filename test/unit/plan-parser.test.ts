import { describe, it, expect } from 'vitest'
import { parsePlanResponse } from '../../src/ai/parsers/plan-parser'

const makeWeek = (weekNumber: number) => ({
  weekNumber,
  theme: `Semana ${weekNumber}`,
  days: Array.from({ length: 7 }, (_, i) => ({
    dayNumber: i + 1,
    dayType: i < 4 ? 'training' : i === 4 ? 'active_rest' : 'rest',
    ...(i <= 4
      ? {
          session: {
            id: `s-w${weekNumber}-d${i + 1}`,
            title: `Sesion ${i + 1}`,
            targetMuscleGroups: ['chest'],
            estimatedDurationMinutes: 45,
            warmup: { durationMinutes: 5, exercises: [] },
            mainWorkout: [],
            cooldown: { durationMinutes: 5, exercises: [] },
          },
        }
      : {}),
  })),
})

describe('parsePlanResponse', () => {
  it('parses valid JSON response', () => {
    const input = JSON.stringify({ weeks: [makeWeek(1)] })
    const result = parsePlanResponse(input)
    expect(result).toHaveLength(1)
    expect(result[0].weekNumber).toBe(1)
    expect(result[0].days).toHaveLength(7)
  })

  it('strips markdown code fences', () => {
    const json = JSON.stringify({ weeks: [makeWeek(1)] })
    const input = '```json\n' + json + '\n```'
    const result = parsePlanResponse(input)
    expect(result).toHaveLength(1)
  })

  it('extracts JSON from surrounding text', () => {
    const json = JSON.stringify({ weeks: [makeWeek(1)] })
    const input = 'Here is the plan:\n' + json + '\nHope this helps!'
    const result = parsePlanResponse(input)
    expect(result).toHaveLength(1)
  })

  it('throws on missing weeks array', () => {
    expect(() => parsePlanResponse('{"plan": []}')).toThrow('missing "weeks" array')
  })

  it('throws on invalid JSON', () => {
    expect(() => parsePlanResponse('not json at all')).toThrow()
  })

  it('throws on invalid week structure', () => {
    const input = JSON.stringify({ weeks: [{ weekNumber: 'abc' }] })
    expect(() => parsePlanResponse(input)).toThrow('Invalid week structure')
  })

  it('throws on wrong number of days', () => {
    const week = makeWeek(1)
    week.days = week.days.slice(0, 5)
    const input = JSON.stringify({ weeks: [week] })
    expect(() => parsePlanResponse(input)).toThrow('must have exactly 7 days')
  })

  it('throws on invalid dayType', () => {
    const week = makeWeek(1)
    ;(week.days[0] as Record<string, unknown>).dayType = 'invalid'
    const input = JSON.stringify({ weeks: [week] })
    expect(() => parsePlanResponse(input)).toThrow('Invalid dayType')
  })

  it('auto-generates session IDs when missing', () => {
    const week = makeWeek(1)
    delete (week.days[0].session as Record<string, unknown>).id
    const input = JSON.stringify({ weeks: [week] })
    const result = parsePlanResponse(input)
    expect(result[0].days[0].session?.id).toBe('s-w1-d1')
  })

  it('parses multiple weeks', () => {
    const input = JSON.stringify({
      weeks: [makeWeek(1), makeWeek(2), makeWeek(3)],
    })
    const result = parsePlanResponse(input)
    expect(result).toHaveLength(3)
    expect(result[2].weekNumber).toBe(3)
  })
})
