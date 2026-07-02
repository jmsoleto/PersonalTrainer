import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db'
import type {
  PlannedSession,
  PlannedExercise,
  CompletedSession,
  CompletedExercise,
  CompletedSet,
} from '../types/plan'
import { SessionDifficulty } from '../types/enums'

export const useSessionStore = defineStore('session', () => {
  const currentSession = ref<{
    planId: string
    planned: PlannedSession
    weekNumber: number
    dayNumber: number
    startedAt: string
    exercises: CompletedExercise[]
    skippedExercises: string[]
  } | null>(null)

  function startSession(
    planId: string,
    planned: PlannedSession,
    weekNumber: number,
    dayNumber: number,
  ): void {
    currentSession.value = {
      planId,
      planned,
      weekNumber,
      dayNumber,
      startedAt: new Date().toISOString(),
      exercises: planned.mainWorkout.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          setNumber: i + 1,
          reps: ex.reps,
          weightKg: ex.targetWeightKg,
          durationSeconds: ex.durationSeconds,
          completed: false,
          rpe: undefined,
        })),
      })),
      skippedExercises: [],
    }
  }

  function logSet(
    exerciseId: string,
    setNumber: number,
    data: Partial<CompletedSet>,
  ): void {
    if (!currentSession.value) return

    const exercise = currentSession.value.exercises.find(
      e => e.exerciseId === exerciseId,
    )
    if (!exercise) return

    const set = exercise.sets.find(s => s.setNumber === setNumber)
    if (!set) return

    Object.assign(set, data, { completed: true })
  }

  /**
   * Replace an exercise in the active session with a new prescription, rebuilding
   * its logged-set skeleton (any sets logged on the original are reset). Mirrors
   * the skeleton construction in startSession.
   */
  function replaceExercise(originalExerciseId: string, replacement: PlannedExercise): void {
    if (!currentSession.value) return
    const skeleton: CompletedExercise = {
      exerciseId: replacement.exerciseId,
      exerciseName: replacement.exerciseName,
      sets: Array.from({ length: replacement.sets }, (_, i) => ({
        setNumber: i + 1,
        reps: replacement.reps,
        weightKg: replacement.targetWeightKg,
        durationSeconds: replacement.durationSeconds,
        completed: false,
        rpe: undefined,
      })),
    }
    const idx = currentSession.value.exercises.findIndex(
      e => e.exerciseId === originalExerciseId,
    )
    if (idx >= 0) currentSession.value.exercises.splice(idx, 1, skeleton)

    // Drop the original from skipped, if present.
    const s = currentSession.value.skippedExercises.indexOf(originalExerciseId)
    if (s >= 0) currentSession.value.skippedExercises.splice(s, 1)
  }

  function skipExercise(exerciseId: string): void {
    if (!currentSession.value) return
    if (!currentSession.value.skippedExercises.includes(exerciseId)) {
      currentSession.value.skippedExercises.push(exerciseId)
    }
  }

  async function completeSession(
    difficultyRating: SessionDifficulty,
    feedback?: string,
  ): Promise<CompletedSession> {
    if (!currentSession.value) throw new Error('No active session')

    const completed: CompletedSession = {
      id: crypto.randomUUID(),
      planId: currentSession.value.planId,
      plannedSessionId: currentSession.value.planned.id,
      weekNumber: currentSession.value.weekNumber,
      dayNumber: currentSession.value.dayNumber,
      startedAt: currentSession.value.startedAt,
      completedAt: new Date().toISOString(),
      difficultyRating,
      feedback,
      exercises: JSON.parse(JSON.stringify(currentSession.value.exercises)),
      skippedExercises: JSON.parse(JSON.stringify(currentSession.value.skippedExercises)),
    }

    await db.completedSessions.add(completed)
    currentSession.value = null

    return completed
  }

  function cancelSession(): void {
    currentSession.value = null
  }

  async function getCompletedSessions(planId: string): Promise<CompletedSession[]> {
    return db.completedSessions.where('planId').equals(planId).toArray()
  }

  async function getSessionByDay(
    planId: string,
    weekNumber: number,
    dayNumber: number,
  ): Promise<CompletedSession | undefined> {
    const sessions = await db.completedSessions
      .where('[weekNumber+dayNumber]')
      .equals([weekNumber, dayNumber])
      .toArray()
    return sessions.find(s => s.planId === planId)
  }

  const isActive = computed(() => currentSession.value !== null)

  const completedSetsCount = computed(() => {
    if (!currentSession.value) return 0
    return currentSession.value.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0,
    )
  })

  const totalSetsCount = computed(() => {
    if (!currentSession.value) return 0
    return currentSession.value.exercises.reduce(
      (sum, ex) => sum + ex.sets.length,
      0,
    )
  })

  return {
    currentSession,
    isActive,
    completedSetsCount,
    totalSetsCount,
    startSession,
    logSet,
    replaceExercise,
    skipExercise,
    completeSession,
    cancelSession,
    getCompletedSessions,
    getSessionByDay,
  }
})
