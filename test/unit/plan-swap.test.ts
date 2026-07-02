import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanStore } from '../../src/stores/plan'
import { useUserStore } from '../../src/stores/user'
import { db } from '../../src/db'
import {
  Gender, FitnessLevel, FitnessGoal, Equipment, MuscleGroup,
} from '../../src/types/enums'
import type { TrainingPlan, PlannedExercise, PlannedSession } from '../../src/types/plan'

function plannedExercise(id: string): PlannedExercise {
  return { exerciseId: id, exerciseName: id, sets: 3, reps: 10, restSeconds: 60 }
}

function session(id: string, main: PlannedExercise[]): PlannedSession {
  return {
    id, title: id, targetMuscleGroups: [MuscleGroup.Chest], estimatedDurationMinutes: 30,
    warmup: { exercises: [], durationMinutes: 5 },
    mainWorkout: main,
    cooldown: { exercises: [], durationMinutes: 5 },
  }
}

async function seedPlan(userId: string): Promise<TrainingPlan> {
  const plan: TrainingPlan = {
    id: 'plan1', userId, name: 'Test', totalWeeks: 1,
    startDate: new Date().toISOString(), status: 'active',
    generatedAt: new Date().toISOString(),
    basedOn: {
      profile: { gender: Gender.Male, age: 30, weightKg: 80, heightCm: 180, fitnessLevel: FitnessLevel.Beginner },
      goals: [FitnessGoal.GeneralFitness], equipment: [Equipment.BodyweightOnly], injuries: [], feedbackHistory: [],
    },
    weeks: [{
      weekNumber: 1, theme: 't',
      days: [
        { dayNumber: 1, dayType: 'training' as never, session: session('s1', [plannedExercise('exA'), plannedExercise('exB')]) },
        { dayNumber: 2, dayType: 'training' as never, session: session('s2', [plannedExercise('exA')]) },
      ],
    }],
  }
  await db.trainingPlans.add(plan)
  return plan
}

describe('plan store — swapPlannedExercise', () => {
  let userId: string

  beforeEach(async () => {
    const userStore = useUserStore()
    const profile = await userStore.createUser({
      name: 'U', gender: Gender.Male, age: 30, weightKg: 80, heightCm: 180,
      fitnessLevel: FitnessLevel.Beginner, goals: [FitnessGoal.GeneralFitness],
      equipment: [Equipment.BodyweightOnly],
    })
    userId = profile.id
    await seedPlan(userId)
  })

  it('replaces the exercise for that session and persists to the DB', async () => {
    const planStore = usePlanStore()
    await planStore.loadActivePlan()

    await planStore.swapPlannedExercise('s1', 'exA', plannedExercise('exC'))

    // In-memory plan reflects the swap on s1 only.
    const s1 = planStore.getSession('s1')!
    expect(s1.mainWorkout.map(e => e.exerciseId)).toEqual(['exC', 'exB'])

    // Persisted: reload from the DB confirms the swap survived.
    const stored = await db.trainingPlans.get('plan1')
    const storedS1 = stored!.weeks[0]!.days[0]!.session!
    expect(storedS1.mainWorkout.map(e => e.exerciseId)).toEqual(['exC', 'exB'])
  })

  it('does not touch the same exercise on other days', async () => {
    const planStore = usePlanStore()
    await planStore.loadActivePlan()

    await planStore.swapPlannedExercise('s1', 'exA', plannedExercise('exC'))

    const stored = await db.trainingPlans.get('plan1')
    const storedS2 = stored!.weeks[0]!.days[1]!.session!
    expect(storedS2.mainWorkout.map(e => e.exerciseId)).toEqual(['exA'])
  })

  it('inherits the original prescription position and is a no-op for unknown ids', async () => {
    const planStore = usePlanStore()
    await planStore.loadActivePlan()

    await planStore.swapPlannedExercise('s1', 'not_here', plannedExercise('exC'))
    const s1 = planStore.getSession('s1')!
    expect(s1.mainWorkout.map(e => e.exerciseId)).toEqual(['exA', 'exB'])
  })
})
