import { describe, it, expect } from 'vitest'
import { transformPhasesToWeeks, type PhaseOutput } from '../../src/ai/parsers/phase-plan-transformer'
import type { Exercise } from '../../src/types/exercise'

const phaseOutput: PhaseOutput = {
  phases: [
    {
      phase: 1,
      name: 'Adaptación',
      weeks: [1],
      goal: 'base',
      sessions: [
        {
          id: 'A',
          name: 'Tren superior',
          dur: 45,
          rest: [60, 90],
          wu: [],
          cd: [],
          weeks: [
            [
              { id: 'ex_press', s: 3, r: 10, w: 40 },
              { id: 'ex_pushup', s: 3, r: 12 },
            ],
          ],
        },
      ],
    },
  ],
}

describe('transformPhasesToWeeks — recommended weight', () => {
  const main = () => {
    const weeks = transformPhasesToWeeks(phaseOutput, [] as Exercise[], 1)
    const trainingDay = weeks[0].days.find(d => d.session)
    return trainingDay!.session!.mainWorkout
  }

  it('maps compact "w" to targetWeightKg', () => {
    expect(main()[0].targetWeightKg).toBe(40)
  })

  it('leaves targetWeightKg undefined when "w" is absent', () => {
    expect(main()[1].targetWeightKg).toBeUndefined()
  })
})
