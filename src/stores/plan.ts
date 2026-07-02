import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db'
import { callClaude } from '../ai/client'
import {
  buildSystemPrompt as buildRecalcSystemPrompt,
  buildRecalculationPrompt,
} from '../ai/prompts/plan-recalculation'
import { parsePlanResponse } from '../ai/parsers/plan-parser'
import { generatePlanFromPhases } from '../ai/phase-generator'
import { transformExternalPlan, validateExternalPlanJson } from '../import/external-plan-transformer'
import type { ExternalPlanRoot } from '../import/external-plan-types'
import { useUserStore } from './user'
import { useExercisesStore } from './exercises'
import { useSettingsStore } from './settings'
import type { TrainingPlan, Week, CompletedSession, PlannedSession, PlannedExercise } from '../types/plan'
import { FitnessGoal, FitnessLevel, type PlanStatus } from '../types/enums'

const GOAL_PLAN_NAMES: Record<FitnessGoal, string> = {
  [FitnessGoal.Strength]: 'Ruta de fuerza',
  [FitnessGoal.GainMuscle]: 'Ruta de hipertrofia',
  [FitnessGoal.LoseWeight]: 'Ruta de definición',
  [FitnessGoal.ImproveEndurance]: 'Ruta de resistencia',
  [FitnessGoal.Flexibility]: 'Ruta de movilidad',
  [FitnessGoal.GeneralFitness]: 'Ruta de fitness',
}

function buildPlanName(goals: FitnessGoal[], userName: string): string {
  const primaryGoal = goals[0]
  const base = primaryGoal ? GOAL_PLAN_NAMES[primaryGoal] : 'Tu ruta'
  return `${base} · ${userName}`
}

const DAYS_PER_LEVEL: Record<FitnessLevel, number> = {
  [FitnessLevel.Beginner]: 3,
  [FitnessLevel.Intermediate]: 4,
  [FitnessLevel.Advanced]: 5,
}

export const usePlanStore = defineStore('plan', () => {
  const activePlan = ref<TrainingPlan | null>(null)
  const generating = ref(false)
  const error = ref<string | null>(null)
  const generationProgress = ref<{ status: string } | null>(null)

  async function loadActivePlan(): Promise<void> {
    const userStore = useUserStore()
    if (!userStore.currentUser) {
      activePlan.value = null
      return
    }
    const plans = await db.trainingPlans
      .where('userId').equals(userStore.currentUser.id)
      .filter(p => p.status === 'active')
      .toArray()
    activePlan.value = plans[0] ?? null
  }

  interface GenerateOptions {
    trainingStyle?: string
    additionalNotes?: string
  }

  async function generatePlan(options: GenerateOptions = {}): Promise<TrainingPlan> {
    const userStore = useUserStore()
    const exercisesStore = useExercisesStore()

    if (!userStore.currentUser) throw new Error('No user profile found')

    generating.value = true
    error.value = null
    generationProgress.value = null

    try {
      await exercisesStore.loadExercises()

      const availableExercises = exercisesStore.filterByEquipment(
        userStore.currentUser.equipment,
      )

      const settingsStore = useSettingsStore()
      const daysPerWeek = settingsStore.settings.daysPerWeek > 0
        ? settingsStore.settings.daysPerWeek
        : DAYS_PER_LEVEL[userStore.currentUser.fitnessLevel]

      const planParams = {
        weeks: settingsStore.settings.planWeeks,
        daysPerWeek,
        sessionDurationMin: settingsStore.settings.sessionDurationMin,
        trainingStyle: options.trainingStyle,
        additionalNotes: options.additionalNotes,
      }

      const weeks = await generatePlanFromPhases(
        userStore.currentUser,
        availableExercises,
        planParams,
        (status) => {
          generationProgress.value = { status }
        },
      )

      const plan: TrainingPlan = {
        id: crypto.randomUUID(),
        userId: userStore.currentUser.id,
        name: buildPlanName(userStore.currentUser.goals, userStore.currentUser.name),
        totalWeeks: planParams.weeks,
        startDate: new Date().toISOString(),
        status: 'active' as PlanStatus,
        generatedAt: new Date().toISOString(),
        basedOn: {
          profile: {
            gender: userStore.currentUser.gender,
            age: userStore.currentUser.age,
            weightKg: userStore.currentUser.weightKg,
            heightCm: userStore.currentUser.heightCm,
            fitnessLevel: userStore.currentUser.fitnessLevel,
          },
          goals: [...userStore.currentUser.goals],
          equipment: [...userStore.currentUser.equipment],
          injuries: [...userStore.currentUser.injuries],
          feedbackHistory: [],
        },
        weeks,
      }

      // Deactivate any existing active plans
      const existingPlans = await db.trainingPlans.where('status').equals('active').toArray()
      for (const p of existingPlans) {
        await db.trainingPlans.update(p.id, { status: 'abandoned' })
      }

      await db.trainingPlans.add(plan)
      activePlan.value = plan

      return plan
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error generating plan'
      throw e
    } finally {
      generating.value = false
      generationProgress.value = null
    }
  }

  async function recalculatePlan(reason: string): Promise<void> {
    const userStore = useUserStore()
    const exercisesStore = useExercisesStore()

    if (!activePlan.value || !userStore.currentUser) return

    generating.value = true
    error.value = null

    try {
      await exercisesStore.loadExercises()

      const availableExercises = exercisesStore.filterByEquipment(
        userStore.currentUser.equipment,
      )

      const completedSessions = await db.completedSessions
        .where('planId')
        .equals(activePlan.value.id)
        .toArray()

      const systemPrompt = buildRecalcSystemPrompt()
      const userPrompt = buildRecalculationPrompt(
        userStore.currentUser,
        activePlan.value,
        completedSessions,
        availableExercises,
        reason,
      )

      const response = await callClaude(systemPrompt, userPrompt)
      const newWeeks = parsePlanResponse(response.text)

      // Replace remaining weeks
      const currentWeekNum = getCurrentWeekNumber()
      const updatedWeeks = [
        ...activePlan.value.weeks.filter(w => w.weekNumber <= currentWeekNum),
        ...newWeeks,
      ]

      const updated: TrainingPlan = {
        ...activePlan.value,
        weeks: updatedWeeks,
        basedOn: {
          ...activePlan.value.basedOn,
          equipment: [...userStore.currentUser.equipment],
          injuries: [...userStore.currentUser.injuries],
        },
      }

      await db.trainingPlans.put(updated)
      activePlan.value = updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error recalculating plan'
      throw e
    } finally {
      generating.value = false
    }
  }

  async function importExternalPlan(jsonData: unknown): Promise<TrainingPlan> {
    const userStore = useUserStore()
    const exercisesStore = useExercisesStore()

    generating.value = true
    error.value = null

    try {
      const validation = validateExternalPlanJson(jsonData)
      if (!validation.valid) {
        throw new Error(`JSON inválido: ${validation.errors.join(', ')}`)
      }

      await exercisesStore.loadExercises()

      const userId = userStore.currentUser?.id ?? crypto.randomUUID()
      const plan = transformExternalPlan(jsonData as ExternalPlanRoot, userId, exercisesStore)

      // Deactivate any existing active plans
      const existingPlans = await db.trainingPlans.where('status').equals('active').toArray()
      for (const p of existingPlans) {
        await db.trainingPlans.update(p.id, { status: 'abandoned' })
      }

      await db.trainingPlans.add(plan)
      activePlan.value = plan

      return plan
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al importar plan'
      throw e
    } finally {
      generating.value = false
    }
  }

  function getCurrentWeekNumber(): number {
    if (!activePlan.value) return 1
    const start = new Date(activePlan.value.startDate)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
    return Math.min(Math.max(week, 1), 12)
  }

  function getWeek(weekNumber: number): Week | undefined {
    return activePlan.value?.weeks.find(w => w.weekNumber === weekNumber)
  }

  function getSession(sessionId: string): PlannedSession | undefined {
    if (!activePlan.value) return undefined
    for (const week of activePlan.value.weeks) {
      for (const day of week.days) {
        if (day.session?.id === sessionId) {
          return day.session
        }
      }
    }
    return undefined
  }

  /**
   * Replace a planned main-workout exercise for a specific session (i.e. one
   * day of one week) and persist the plan. The change is scoped to that session
   * only; the same exercise on other days/weeks is untouched.
   */
  async function swapPlannedExercise(
    sessionId: string,
    originalExerciseId: string,
    replacement: PlannedExercise,
  ): Promise<void> {
    if (!activePlan.value) return
    const planned = getSession(sessionId)
    if (!planned) return
    const idx = planned.mainWorkout.findIndex(e => e.exerciseId === originalExerciseId)
    if (idx < 0) return
    planned.mainWorkout.splice(idx, 1, replacement)
    // Persist a plain snapshot — IndexedDB cannot structured-clone the reactive proxy.
    await db.trainingPlans.put(JSON.parse(JSON.stringify(activePlan.value)) as TrainingPlan)
  }

  const currentWeek = computed(() => getWeek(getCurrentWeekNumber()))

  return {
    activePlan,
    generating,
    error,
    generationProgress,
    currentWeek,
    loadActivePlan,
    generatePlan,
    importExternalPlan,
    recalculatePlan,
    getCurrentWeekNumber,
    getWeek,
    getSession,
    swapPlannedExercise,
  }
})
