import { describe, it, expect } from 'vitest'
import { formatPrescription, formatPlannedPrescription, formatKg } from '../../src/workout-editor/labels'
import type { PlannedExercise } from '../../src/types/plan'

const base = { exerciseId: 'x', exerciseName: 'X', restSeconds: 90 }

describe('formatPlannedPrescription', () => {
  it('straight prescription keeps the existing header text', () => {
    expect(formatPlannedPrescription({ ...base, sets: 3, reps: 10, targetWeightKg: 40, restSeconds: 60 }))
      .toBe('3 series × 10 reps · 40 kg · Descanso 60s')
    expect(formatPlannedPrescription({ ...base, sets: 3, durationSeconds: 45, restSeconds: 0 }))
      .toBe('3 series × 45s')
  })

  it('pyramid with weights: "12/10/8/6 reps · 40→55 kg"', () => {
    const p: PlannedExercise = {
      ...base, sets: 4, reps: 12, targetWeightKg: 40, technique: 'pyramid_ascending',
      setDetails: [[12, 40], [10, 45], [8, 50], [6, 55]].map(([reps, w]) => ({ reps, targetWeightKg: w, restSeconds: 90 })),
    }
    expect(formatPlannedPrescription(p)).toBe('12/10/8/6 reps · 40→55 kg · Descanso 90s')
  })

  it('time pyramid: "30/45/60 s"', () => {
    const p: PlannedExercise = {
      ...base, sets: 3, durationSeconds: 30, technique: 'pyramid_ascending',
      setDetails: [30, 45, 60].map(d => ({ durationSeconds: d, restSeconds: 0 })),
    }
    expect(formatPlannedPrescription(p)).toBe('30/45/60 s')
  })

  it('drop set: "Drop set · 10/10/10 · 60→37,5 kg"', () => {
    const p: PlannedExercise = {
      ...base, sets: 3, reps: 10, targetWeightKg: 60, technique: 'drop_set',
      setDetails: [[60, 0], [47.5, 0], [37.5, 120]].map(([w, r]) => ({ reps: 10, targetWeightKg: w, restSeconds: r })),
    }
    expect(formatPlannedPrescription(p)).toBe('Drop set · 10/10/10 · 60→37,5 kg')
  })

  it('triangle shows base→peak', () => {
    const p: PlannedExercise = {
      ...base, sets: 5, reps: 12, technique: 'pyramid_triangle',
      setDetails: [[12, 40], [10, 50], [8, 60], [10, 50], [12, 40]].map(([reps, w]) => ({ reps, targetWeightKg: w, restSeconds: 90 })),
    }
    expect(formatPlannedPrescription(p)).toBe('12/10/8/10/12 reps · 40→60 kg · Descanso 90s')
  })
})

describe('formatPrescription (templates)', () => {
  it('straight output is unchanged', () => {
    expect(formatPrescription('reps', [{ reps: 10, weightKg: 40, restSeconds: 90 }, { reps: 10, weightKg: 40, restSeconds: 90 }]))
      .toBe('2 × 10 · 40 kg · desc. 90″')
  })

  it('pyramid shows the variant and per-set values', () => {
    const sets = [12, 10, 8, 10, 12].map(reps => ({ reps, restSeconds: 90 }))
    expect(formatPrescription('reps', sets, 'triangle')).toBe('Triángulo · 12/10/8/10/12')
    expect(formatPrescription('time', [30, 45, 60].map(d => ({ durationSeconds: d })), 'ascending')).toBe('Ascendente · 30/45/60″')
  })

  it('uses a comma decimal', () => {
    expect(formatKg(37.5)).toBe('37,5')
  })
})
