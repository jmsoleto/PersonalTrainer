<template>
  <PageShell :loading="loading">

    <!-- ── Empty state ──────────────────────────────────────────── -->
    <div v-if="!loading && !session" class="sp-empty">
      <div class="sp-empty-icon"><q-icon name="fitness_center" size="28px" /></div>
      <span class="sp-empty-title">Sesión no encontrada</span>
      <router-link to="/plan" class="sp-btn sp-btn--cta">Volver al plan</router-link>
    </div>

    <template v-else-if="session">

      <!-- ── Header ───────────────────────────────────────────────── -->
      <header class="sp-header">
        <button class="sp-back" @click="$router.back()">
          <q-icon name="arrow_back" size="20px" />
        </button>
        <div class="sp-header-text">
          <span class="sp-overline">Sesión activa</span>
          <h1 class="sp-title">{{ session.title }}</h1>
          <span class="sp-meta">~{{ session.estimatedDurationMinutes }} min · {{ session.targetMuscleGroups.join(', ') }}</span>
        </div>
      </header>

      <!-- ── Progress bar ──────────────────────────────────────────── -->
      <div class="sp-progress-wrap">
        <div class="sp-progress-track">
          <div
            class="sp-progress-fill"
            :style="{ width: sessionStore.totalSetsCount > 0 ? (sessionStore.completedSetsCount / sessionStore.totalSetsCount * 100) + '%' : '0%' }"
          />
        </div>
        <span class="sp-progress-label">{{ sessionStore.completedSetsCount }} / {{ sessionStore.totalSetsCount }} sets</span>
      </div>

      <!-- ── Warmup ─────────────────────────────────────────────────── -->
      <div class="sp-section">
        <button class="sp-section-header" @click="warmupOpen = !warmupOpen">
          <div class="sp-section-icon sp-section-icon--warm">
            <q-icon name="wb_sunny" size="18px" />
          </div>
          <div class="sp-section-info">
            <span class="sp-section-name">Calentamiento</span>
            <span class="sp-section-meta">{{ session.warmup.durationMinutes }} min</span>
          </div>
          <q-icon :name="warmupOpen ? 'expand_less' : 'expand_more'" size="18px" class="sp-section-chevron" />
        </button>
        <div v-if="warmupOpen" class="sp-section-body">
          <button
            v-for="ex in session.warmup.exercises"
            :key="ex.exerciseId"
            class="sp-warmup-row"
            :class="{ 'sp-warmup-row--clickable': hasDetail(ex.exerciseId) }"
            type="button"
            @click="openExerciseInfo(ex.exerciseId)"
          >
            <span class="sp-warmup-name">{{ ex.exerciseName }}</span>
            <span class="sp-warmup-right">
              <span class="sp-warmup-detail">
                <template v-if="ex.durationSeconds">{{ ex.durationSeconds }}s</template>
                <template v-else>{{ ex.sets }} × {{ ex.reps }}</template>
              </span>
              <q-icon v-if="hasDetail(ex.exerciseId)" name="info_outline" size="16px" class="sp-warmup-info" />
            </span>
          </button>
        </div>
      </div>

      <!-- ── Main exercises ─────────────────────────────────────────── -->
      <div class="sp-ex-label">Ejercicios principales</div>

      <div
        v-for="exercise in sessionStore.currentSession?.exercises"
        :key="exercise.exerciseId"
        :class="['sp-ex-card', { 'sp-ex-card--skipped': isSkipped(exercise.exerciseId) }]"
      >
        <!-- Exercise header row -->
        <div class="sp-ex-header">
          <div class="sp-ex-info">
            <span class="sp-ex-name">{{ exercise.exerciseName }}</span>
            <span class="sp-ex-plan">
              {{ getPlannedExercise(exercise.exerciseId)?.sets }} series
              <template v-if="getPlannedExercise(exercise.exerciseId)?.reps"> × {{ getPlannedExercise(exercise.exerciseId)?.reps }} reps</template>
              <template v-if="getPlannedExercise(exercise.exerciseId)?.durationSeconds"> × {{ getPlannedExercise(exercise.exerciseId)?.durationSeconds }}s</template>
              <template v-if="getPlannedExercise(exercise.exerciseId)?.targetWeightKg"> · {{ getPlannedExercise(exercise.exerciseId)?.targetWeightKg }} kg</template>
              <template v-if="getPlannedExercise(exercise.exerciseId)?.restSeconds"> · Descanso {{ getPlannedExercise(exercise.exerciseId)?.restSeconds }}s</template>
            </span>
            <span v-if="getPlannedExercise(exercise.exerciseId)?.notes" class="sp-ex-notes">
              {{ getPlannedExercise(exercise.exerciseId)?.notes }}
            </span>
          </div>
          <div class="sp-ex-actions">
            <button class="sp-icon-btn" @click="openExerciseInfo(exercise.exerciseId)">
              <q-icon name="info_outline" size="18px" />
            </button>
            <button
              :class="['sp-icon-btn', { 'sp-icon-btn--active': isSkipped(exercise.exerciseId) }]"
              @click="toggleSkip(exercise.exerciseId)"
            >
              <q-icon :name="isSkipped(exercise.exerciseId) ? 'undo' : 'skip_next'" size="18px" />
            </button>
          </div>
        </div>

        <template v-if="!isSkipped(exercise.exerciseId)">
          <!-- Column headers -->
          <div class="sp-set-cols">
            <span class="sp-set-col-set" />
            <span v-if="getPlannedExercise(exercise.exerciseId)?.reps" class="sp-set-col-label">REPS</span>
            <span v-if="getPlannedExercise(exercise.exerciseId)?.targetWeightKg !== undefined" class="sp-set-col-label">KG</span>
            <span v-if="getPlannedExercise(exercise.exerciseId)?.durationSeconds" class="sp-set-col-label">SEG</span>
            <span class="sp-set-col-check" />
          </div>

          <!-- Set rows -->
          <div
            v-for="set in exercise.sets"
            :key="set.setNumber"
            :class="['sp-set-row', { 'sp-set-row--done': set.completed }]"
          >
            <span class="sp-set-num">{{ set.setNumber }}</span>

            <input
              v-if="getPlannedExercise(exercise.exerciseId)?.reps"
              v-model.number="set.reps"
              type="number"
              class="sp-set-input"
            />
            <input
              v-if="getPlannedExercise(exercise.exerciseId)?.targetWeightKg !== undefined"
              v-model.number="set.weightKg"
              type="number"
              class="sp-set-input"
            />
            <input
              v-if="getPlannedExercise(exercise.exerciseId)?.durationSeconds"
              v-model.number="set.durationSeconds"
              type="number"
              class="sp-set-input"
            />

            <button
              :class="['sp-set-check', { 'sp-set-check--done': set.completed }]"
              @click="toggleSet(exercise.exerciseId, set.setNumber, set)"
            >
              <q-icon :name="set.completed ? 'check' : ''" size="14px" />
            </button>
          </div>
        </template>
      </div>

      <!-- ── Cooldown ─────────────────────────────────────────────── -->
      <div class="sp-section">
        <button class="sp-section-header" @click="cooldownOpen = !cooldownOpen">
          <div class="sp-section-icon sp-section-icon--cool">
            <q-icon name="ac_unit" size="18px" />
          </div>
          <div class="sp-section-info">
            <span class="sp-section-name">Enfriamiento</span>
            <span class="sp-section-meta">{{ session.cooldown.durationMinutes }} min</span>
          </div>
          <q-icon :name="cooldownOpen ? 'expand_less' : 'expand_more'" size="18px" class="sp-section-chevron" />
        </button>
        <div v-if="cooldownOpen" class="sp-section-body">
          <button
            v-for="ex in session.cooldown.exercises"
            :key="ex.exerciseId"
            class="sp-warmup-row"
            :class="{ 'sp-warmup-row--clickable': hasDetail(ex.exerciseId) }"
            type="button"
            @click="openExerciseInfo(ex.exerciseId)"
          >
            <span class="sp-warmup-name">{{ ex.exerciseName }}</span>
            <span class="sp-warmup-right">
              <span class="sp-warmup-detail">
                <template v-if="ex.durationSeconds">{{ ex.durationSeconds }}s</template>
                <template v-else>{{ ex.sets }} × {{ ex.reps }}</template>
              </span>
              <q-icon v-if="hasDetail(ex.exerciseId)" name="info_outline" size="16px" class="sp-warmup-info" />
            </span>
          </button>
        </div>
      </div>

      <!-- ── Bottom spacer for FAB area ───────────────────────────── -->
      <div style="height: 96px" />

      <!-- ── Rest Timer Dialog ─────────────────────────────────────── -->
      <q-dialog v-model="showRestTimer">
        <RestTimer @close="showRestTimer = false" />
      </q-dialog>

      <!-- ── Fixed bottom bar ──────────────────────────────────────── -->
      <div class="sp-fab-bar">
        <button class="sp-fab-timer" @click="showRestTimer = true">
          <span class="material-symbols-outlined" style="font-size:22px">timer</span>
        </button>
        <button class="sp-fab-complete" @click="completeSession">
          <span class="material-symbols-outlined" style="font-size:18px">check</span>
          Completar sesión
        </button>
      </div>

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
const warmupOpen = ref(false)
const cooldownOpen = ref(false)

function hasDetail(exerciseId: string): boolean {
  return exercisesStore.getById(exerciseId) !== undefined
}

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

  const isCorrectSession = sessionStore.currentSession?.planned.id === sessionId
  if (session.value && planStore.activePlan && !isCorrectSession) {
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

<style scoped>
/* ── Empty ───────────────────────────────────────────────────── */
.sp-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  padding: 3rem 1rem; text-align: center;
}
.sp-empty-icon {
  width: 56px; height: 56px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container); color: var(--k-secondary);
  display: flex; align-items: center; justify-content: center;
}
.sp-empty-title {
  font-family: var(--k-font-headline); font-size: var(--k-body-lg); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-secondary);
}

/* ── Header ──────────────────────────────────────────────────── */
.sp-header { display: flex; align-items: flex-start; gap: 0.875rem; margin-bottom: 1rem; }
.sp-back {
  flex-shrink: 0; margin-top: 0.25rem;
  width: 36px; height: 36px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container); border: none; cursor: pointer;
  color: var(--k-secondary); display: flex; align-items: center; justify-content: center;
  transition: background-color 0.15s ease;
}
.sp-back:hover { background-color: var(--k-surface-high); }
.sp-header-text { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
.sp-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.sp-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}
.sp-meta { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }

/* ── Progress ────────────────────────────────────────────────── */
.sp-progress-wrap { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
.sp-progress-track {
  flex: 1; height: 6px; border-radius: 3px; background-color: var(--k-surface-highest); overflow: hidden;
}
.sp-progress-fill {
  height: 100%; background: var(--k-gradient-cta); border-radius: 3px;
  transition: width 0.3s ease;
}
.sp-progress-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); white-space: nowrap;
}

/* ── Warmup / Cooldown sections ──────────────────────────────── */
.sp-section {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  overflow: hidden; margin-bottom: 0.5rem;
}
.sp-section-header {
  width: 100%; display: flex; align-items: center; gap: 0.75rem;
  padding: 0.875rem 1rem; background: none; border: none; cursor: pointer; text-align: left;
}
.sp-section-icon {
  width: 34px; height: 34px; flex-shrink: 0; border-radius: var(--k-radius-md);
  display: flex; align-items: center; justify-content: center;
}
.sp-section-icon--warm { background-color: rgba(255,180,162,0.12); color: var(--k-primary); }
.sp-section-icon--cool { background-color: rgba(166,200,255,0.12); color: var(--k-tertiary); }
.sp-section-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
.sp-section-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.sp-section-meta { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.sp-section-chevron { color: var(--k-surface-bright); }
.sp-section-body { padding: 0 1rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid var(--k-surface-highest); }
.sp-warmup-row {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.5rem 0.5rem 0; margin: 0 -0.5rem;
  background: none; border: none; text-align: left; cursor: default;
  border-radius: var(--k-radius-sm);
  transition: background-color 0.15s ease;
}
.sp-warmup-row--clickable { cursor: pointer; }
.sp-warmup-row--clickable:hover { background-color: var(--k-surface-highest); }
.sp-warmup-name { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-on-surface); }
.sp-warmup-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.sp-warmup-detail { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.sp-warmup-info { color: var(--k-primary-container); }

/* ── Exercise label ──────────────────────────────────────────── */
.sp-ex-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
  margin: 1rem 0 0.5rem;
}

/* ── Exercise card ───────────────────────────────────────────── */
.sp-ex-card {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  margin-bottom: 0.5rem; overflow: hidden; transition: opacity 0.2s ease;
}
.sp-ex-card--skipped { opacity: 0.45; }

.sp-ex-header {
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 0.875rem 0.875rem 0.75rem;
}
.sp-ex-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
.sp-ex-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.sp-ex-plan { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.sp-ex-notes { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-outline); font-style: italic; }

.sp-ex-actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
.sp-icon-btn {
  width: 32px; height: 32px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); border: none; cursor: pointer;
  color: var(--k-secondary); display: flex; align-items: center; justify-content: center;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.sp-icon-btn--active { background-color: rgba(255,86,44,0.12); color: var(--k-primary-container); }

/* ── Set columns ─────────────────────────────────────────────── */
.sp-set-cols {
  display: flex; align-items: center; padding: 0 0.875rem 0.375rem; gap: 0.5rem;
}
.sp-set-col-set { width: 40px; flex-shrink: 0; }
.sp-set-col-label {
  width: 72px; text-align: center; flex-shrink: 0;
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); color: var(--k-secondary);
}
.sp-set-col-check { width: 32px; flex-shrink: 0; }

/* ── Set rows ────────────────────────────────────────────────── */
.sp-set-row {
  display: flex; align-items: center; padding: 0.25rem 0.875rem; gap: 0.5rem;
  transition: opacity 0.2s ease;
}
.sp-set-row--done { opacity: 0.45; }

.sp-set-num {
  width: 40px; flex-shrink: 0;
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary);
}
.sp-set-input {
  width: 72px; flex-shrink: 0; padding: 0.5rem 0; border: none; border-radius: var(--k-radius-sm);
  background-color: var(--k-surface-highest); color: var(--k-on-surface);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  text-align: center; outline: none;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.sp-set-input:focus { background-color: var(--k-surface-bright); box-shadow: 0 0 0 1px rgba(255,86,44,0.4); }
/* Remove number arrows */
.sp-set-input::-webkit-outer-spin-button,
.sp-set-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.sp-set-input[type=number] { -moz-appearance: textfield; }

.sp-set-check {
  width: 32px; height: 32px; flex-shrink: 0; border-radius: var(--k-radius-sm);
  background-color: var(--k-surface-highest); border: none; cursor: pointer;
  color: transparent; display: flex; align-items: center; justify-content: center;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.sp-set-check--done { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }

/* ── Fixed bottom bar ────────────────────────────────────────── */
.sp-fab-bar {
  position: fixed;
  bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  left: 0; right: 0;
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.875rem 1rem;
  background: linear-gradient(to top, var(--k-surface) 80%, transparent);
  z-index: 100;
}
.sp-fab-timer {
  width: 48px; height: 48px; flex-shrink: 0; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); border: none; cursor: pointer;
  color: var(--k-secondary); display: flex; align-items: center; justify-content: center;
  transition: background-color 0.15s ease;
}
.sp-fab-timer:hover { background-color: var(--k-surface-highest); }
.sp-fab-complete {
  flex: 1; height: 48px; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  border: none; border-radius: var(--k-radius-md);
  background: var(--k-gradient-cta); color: var(--k-on-primary-container);
  font-family: var(--k-font-headline); font-size: var(--k-body-lg); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer;
  transition: opacity 0.15s ease;
}
.sp-fab-complete:hover { opacity: 0.9; }

/* ── Shared CTA ──────────────────────────────────────────────── */
.sp-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.75rem 1.5rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer; text-decoration: none;
}
.sp-btn--cta { background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
</style>
