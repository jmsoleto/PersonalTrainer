<template>
  <PageShell :loading="loading">
    <div v-if="!session" class="text-center q-pa-xl">
      <q-icon name="fitness_center" size="64px" color="grey-6" />
      <h6 class="q-mt-md text-grey-6">Sesion no encontrada</h6>
      <q-btn color="primary" label="Volver al plan" to="/plan" class="q-mt-md" />
    </div>

    <template v-else>
      <!-- Header with progress -->
      <div class="q-mb-md">
        <div class="row items-center q-mb-sm">
          <q-btn flat round icon="arrow_back" @click="$router.back()" />
          <div class="text-h6 q-ml-sm">{{ session.title }}</div>
        </div>
        <div class="text-caption text-grey-6 q-ml-lg q-mb-sm">
          ~{{ session.estimatedDurationMinutes }} min &bull;
          {{ session.targetMuscleGroups.join(', ') }}
        </div>
        <q-linear-progress
          :value="sessionStore.totalSetsCount > 0 ? sessionStore.completedSetsCount / sessionStore.totalSetsCount : 0"
          color="primary"
          size="8px"
          rounded
          class="q-mx-md"
        />
        <div class="text-caption text-center text-grey-6 q-mt-xs">
          {{ sessionStore.completedSetsCount }} / {{ sessionStore.totalSetsCount }} sets completados
        </div>
      </div>

      <!-- Warmup section -->
      <q-expansion-item
        icon="wb_sunny"
        label="Calentamiento"
        :caption="`${session.warmup.durationMinutes} min`"
        header-class="text-primary"
        class="q-mb-sm"
      >
        <q-card>
          <q-card-section>
            <q-list dense>
              <q-item v-for="ex in session.warmup.exercises" :key="ex.exerciseId">
                <q-item-section>
                  <q-item-label>{{ ex.exerciseName }}</q-item-label>
                  <q-item-label caption>
                    <span v-if="ex.durationSeconds">{{ ex.durationSeconds }}s</span>
                    <span v-else>{{ ex.sets }} x {{ ex.reps }}</span>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <!-- Main exercises -->
      <div class="text-subtitle1 q-mb-sm q-mt-md">Ejercicios principales</div>
      <q-card
        v-for="exercise in sessionStore.currentSession?.exercises"
        :key="exercise.exerciseId"
        flat bordered
        class="q-mb-md"
        :class="{ 'bg-grey-2': isSkipped(exercise.exerciseId) }"
      >
        <q-card-section>
          <div class="row items-center justify-between">
            <div>
              <div class="text-subtitle2">{{ exercise.exerciseName }}</div>
              <div v-if="getPlannedExercise(exercise.exerciseId)?.notes" class="text-caption text-grey-6">
                {{ getPlannedExercise(exercise.exerciseId)?.notes }}
              </div>
            </div>
            <div class="row items-center">
              <q-btn
                flat dense round
                icon="info_outline"
                color="grey-6"
                @click="openExerciseInfo(exercise.exerciseId)"
              >
                <q-tooltip>Ver instrucciones y video</q-tooltip>
              </q-btn>
              <q-btn
                flat dense round
                :icon="isSkipped(exercise.exerciseId) ? 'undo' : 'skip_next'"
                :color="isSkipped(exercise.exerciseId) ? 'primary' : 'grey-6'"
                @click="toggleSkip(exercise.exerciseId)"
              >
                <q-tooltip>{{ isSkipped(exercise.exerciseId) ? 'Restaurar' : 'Saltar ejercicio' }}</q-tooltip>
              </q-btn>
            </div>
          </div>

          <template v-if="!isSkipped(exercise.exerciseId)">
            <div
              v-for="set in exercise.sets"
              :key="set.setNumber"
              class="row items-center q-gutter-sm q-mt-sm"
            >
              <div class="text-caption text-grey-6" style="min-width: 50px">
                Set {{ set.setNumber }}
              </div>

              <q-input
                v-if="getPlannedExercise(exercise.exerciseId)?.reps"
                v-model.number="set.reps"
                type="number"
                dense outlined
                label="Reps"
                :placeholder="String(getPlannedExercise(exercise.exerciseId)?.reps ?? '')"
                style="max-width: 80px"
              />

              <q-input
                v-if="getPlannedExercise(exercise.exerciseId)?.targetWeightKg !== undefined || getPlannedExercise(exercise.exerciseId)?.reps"
                v-model.number="set.weightKg"
                type="number"
                dense outlined
                label="Kg"
                :placeholder="String(getPlannedExercise(exercise.exerciseId)?.targetWeightKg ?? '')"
                style="max-width: 80px"
              />

              <q-input
                v-if="getPlannedExercise(exercise.exerciseId)?.durationSeconds"
                v-model.number="set.durationSeconds"
                type="number"
                dense outlined
                label="Seg"
                :placeholder="String(getPlannedExercise(exercise.exerciseId)?.durationSeconds ?? '')"
                style="max-width: 80px"
              />

              <q-btn
                :icon="set.completed ? 'check_circle' : 'radio_button_unchecked'"
                :color="set.completed ? 'green' : 'grey-5'"
                flat round dense
                @click="toggleSet(exercise.exerciseId, set.setNumber, set)"
              />
            </div>
          </template>
        </q-card-section>
      </q-card>

      <!-- Cooldown section -->
      <q-expansion-item
        icon="ac_unit"
        label="Enfriamiento"
        :caption="`${session.cooldown.durationMinutes} min`"
        header-class="text-blue-grey"
        class="q-mb-xl"
      >
        <q-card>
          <q-card-section>
            <q-list dense>
              <q-item v-for="ex in session.cooldown.exercises" :key="ex.exerciseId">
                <q-item-section>
                  <q-item-label>{{ ex.exerciseName }}</q-item-label>
                  <q-item-label caption>
                    <span v-if="ex.durationSeconds">{{ ex.durationSeconds }}s</span>
                    <span v-else>{{ ex.sets }} x {{ ex.reps }}</span>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <!-- Rest Timer FAB -->
      <q-page-sticky position="bottom-right" :offset="[18, 90]">
        <q-btn
          fab
          round
          color="accent"
          icon="timer"
          @click="showRestTimer = true"
        >
          <q-tooltip>Temporizador de descanso</q-tooltip>
        </q-btn>
      </q-page-sticky>

      <!-- Rest Timer Dialog -->
      <q-dialog v-model="showRestTimer">
        <RestTimer @close="showRestTimer = false" />
      </q-dialog>

      <!-- Complete session FAB -->
      <q-page-sticky position="bottom" :offset="[0, 18]">
        <q-btn
          fab
          color="primary"
          icon="check"
          label="Completar"
          @click="completeSession"
        />
      </q-page-sticky>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import RestTimer from '../components/session/RestTimer.vue'
import ExerciseInfoDialog from '../components/session/ExerciseInfoDialog.vue'
import { usePlanStore } from '../stores/plan'
import { useSessionStore } from '../stores/session'
import { useExercisesStore } from '../stores/exercises'
import type { PlannedSession, PlannedExercise, CompletedSet } from '../types/plan'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const planStore = usePlanStore()
const sessionStore = useSessionStore()
const exercisesStore = useExercisesStore()
const loading = ref(true)
const session = ref<PlannedSession | undefined>(undefined)
const showRestTimer = ref(false)

function openExerciseInfo(exerciseId: string): void {
  const exercise = exercisesStore.getById(exerciseId)
  if (!exercise) return
  $q.dialog({ component: ExerciseInfoDialog, componentProps: { exercise } })
}

function getPlannedExercise(exerciseId: string): PlannedExercise | undefined {
  return session.value?.mainWorkout.find(e => e.exerciseId === exerciseId)
}

function isSkipped(exerciseId: string): boolean {
  return sessionStore.currentSession?.skippedExercises.includes(exerciseId) ?? false
}

function toggleSkip(exerciseId: string): void {
  if (!sessionStore.currentSession) return
  if (isSkipped(exerciseId)) {
    const idx = sessionStore.currentSession.skippedExercises.indexOf(exerciseId)
    if (idx >= 0) sessionStore.currentSession.skippedExercises.splice(idx, 1)
  } else {
    sessionStore.skipExercise(exerciseId)
  }
}

function toggleSet(exerciseId: string, setNumber: number, set: CompletedSet): void {
  if (set.completed) {
    set.completed = false
  } else {
    sessionStore.logSet(exerciseId, setNumber, {
      reps: set.reps,
      weightKg: set.weightKg,
      durationSeconds: set.durationSeconds,
    })
  }
}

function completeSession(): void {
  router.push(`/plan/session/${route.params.sessionId}/complete`)
}

onMounted(async () => {
  await Promise.all([planStore.loadActivePlan(), exercisesStore.loadExercises()])
  const sessionId = route.params.sessionId as string
  session.value = planStore.getSession(sessionId)

  if (session.value && planStore.activePlan && !sessionStore.isActive) {
    // Find which week/day this session belongs to
    let weekNumber = 1
    let dayNumber = 1
    for (const week of planStore.activePlan.weeks) {
      for (const day of week.days) {
        if (day.session?.id === sessionId) {
          weekNumber = week.weekNumber
          dayNumber = day.dayNumber
          break
        }
      }
    }
    sessionStore.startSession(planStore.activePlan.id, session.value, weekNumber, dayNumber)
  }

  loading.value = false
})
</script>
