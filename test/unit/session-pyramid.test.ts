import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore, buildSetSkeleton } from '../../src/stores/session'
import { MuscleGroup } from '../../src/types/enums'
import type { PlannedExercise, PlannedSession } from '../../src/types/plan'

const pyramid: PlannedExercise = {
  exerciseId: 'ex_barbell_bench_press',
  exerciseName: 'Press de Banca con Barra',
  sets: 4,
  reps: 12,
  targetWeightKg: 40,
  restSeconds: 90,
  technique: 'pyramid_ascending',
  setDetails: [
    { reps: 12, targetWeightKg: 40, restSeconds: 90 },
    { reps: 10, targetWeightKg: 45, restSeconds: 90 },
    { reps: 8, targetWeightKg: 50, restSeconds: 90 },
    { reps: 6, targetWeightKg: 55, restSeconds: 90 },
  ],
}

const straight: PlannedExercise = {
  exerciseId: 'ex_plank', exerciseName: 'Plancha', sets: 3, durationSeconds: 45, restSeconds: 30,
}

function session(main: PlannedExercise[]): PlannedSession {
  return {
    id: 's1', title: 'S', targetMuscleGroups: [MuscleGroup.Chest], estimatedDurationMinutes: 30,
    warmup: { exercises: [], durationMinutes: 0 },
    mainWorkout: main,
    cooldown: { exercises: [], durationMinutes: 0 },
  }
}

describe('buildSetSkeleton', () => {
  it('pre-fills each pyramid set with its own target', () => {
    expect(buildSetSkeleton(pyramid).map(s => [s.setNumber, s.reps, s.weightKg])).toEqual([
      [1, 12, 40], [2, 10, 45], [3, 8, 50], [4, 6, 55],
    ])
  })

  it('repeats the summary when there are no per-set details (unchanged behaviour)', () => {
    expect(buildSetSkeleton(straight)).toEqual([1, 2, 3].map(n => ({
      setNumber: n, reps: undefined, weightKg: undefined, durationSeconds: 45, completed: false, rpe: undefined,
    })))
  })
})

describe('session store with pyramids', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts a session with per-set targets', () => {
    const store = useSessionStore()
    store.startSession('p1', session([pyramid, straight]), 1, 1)
    const [press, plank] = store.currentSession!.exercises
    expect(press.sets.map(s => s.weightKg)).toEqual([40, 45, 50, 55])
    expect(plank.sets.every(s => s.durationSeconds === 45)).toBe(true)
  })

  it('swapping keeps the per-set targets of the replacement', () => {
    const store = useSessionStore()
    store.startSession('p1', session([pyramid]), 1, 1)
    const replacement: PlannedExercise = {
      ...pyramid,
      exerciseId: 'ex_standard_push_up',
      exerciseName: 'Flexión Estándar',
      targetWeightKg: undefined,
      setDetails: pyramid.setDetails!.map(({ reps, restSeconds }) => ({ reps, restSeconds })),
    }
    store.replaceExercise('ex_barbell_bench_press', replacement)
    const ex = store.currentSession!.exercises[0]
    expect(ex.exerciseId).toBe('ex_standard_push_up')
    expect(ex.sets.map(s => s.reps)).toEqual([12, 10, 8, 6])
    expect(ex.sets.every(s => s.weightKg === undefined)).toBe(true)
  })
})
