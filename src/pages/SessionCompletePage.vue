<template>
  <PageShell :loading="loading">
    <div v-if="!sessionStore.currentSession" class="text-center q-pa-xl">
      <q-icon name="check_circle" size="64px" color="grey-6" />
      <h6 class="q-mt-md text-grey-6">No hay sesion activa</h6>
      <q-btn color="primary" label="Volver al plan" to="/plan" class="q-mt-md" />
    </div>

    <template v-else>
      <div class="text-center q-mb-lg">
        <q-icon name="emoji_events" size="64px" color="amber" />
        <div class="text-h5 q-mt-md">Sesion completada!</div>
        <div class="text-subtitle1 text-grey-6">{{ sessionStore.currentSession.planned.title }}</div>
      </div>

      <!-- Stats -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-6">
          <q-card flat bordered class="text-center q-pa-md">
            <q-icon name="timer" size="24px" color="primary" />
            <div class="text-h6">{{ duration }}</div>
            <div class="text-caption text-grey-6">Duracion</div>
          </q-card>
        </div>
        <div class="col-6">
          <q-card flat bordered class="text-center q-pa-md">
            <q-icon name="fitness_center" size="24px" color="primary" />
            <div class="text-h6">{{ exercisesCompleted }}</div>
            <div class="text-caption text-grey-6">Ejercicios</div>
          </q-card>
        </div>
        <div class="col-6">
          <q-card flat bordered class="text-center q-pa-md">
            <q-icon name="format_list_numbered" size="24px" color="primary" />
            <div class="text-h6">{{ sessionStore.completedSetsCount }}</div>
            <div class="text-caption text-grey-6">Sets completados</div>
          </q-card>
        </div>
        <div class="col-6">
          <q-card flat bordered class="text-center q-pa-md">
            <q-icon name="repeat" size="24px" color="primary" />
            <div class="text-h6">{{ totalReps }}</div>
            <div class="text-caption text-grey-6">Reps totales</div>
          </q-card>
        </div>
      </div>

      <!-- Difficulty rating -->
      <div class="text-subtitle1 q-mb-sm">Como fue la dificultad?</div>
      <div class="row justify-center q-gutter-sm q-mb-lg">
        <q-btn
          v-for="level in difficultyLevels"
          :key="level.value"
          :outline="difficulty !== level.value"
          :color="difficulty === level.value ? 'primary' : 'grey-5'"
          round
          size="lg"
          @click="difficulty = level.value"
        >
          <span style="font-size: 24px">{{ level.emoji }}</span>
          <q-tooltip>{{ level.label }}</q-tooltip>
        </q-btn>
      </div>

      <!-- Feedback -->
      <q-input
        v-model="feedback"
        type="textarea"
        outlined
        label="Comentarios (opcional)"
        placeholder="Como te sentiste? Algo que ajustar?"
        class="q-mb-lg"
        autogrow
      />

      <!-- Save button -->
      <q-btn
        color="primary"
        label="Guardar"
        class="full-width"
        size="lg"
        :loading="saving"
        :disable="difficulty === null"
        @click="save"
      />
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageShell from '../components/layout/PageShell.vue'
import { useQuasar } from 'quasar'
import { useSessionStore } from '../stores/session'
import { usePlanStore } from '../stores/plan'
import { useAchievementsStore } from '../stores/achievements'
import { checkAchievements } from '../composables/useAchievementChecker'
import { SessionDifficulty } from '../types/enums'
import { db } from '../db'

const $q = useQuasar()
const router = useRouter()
const sessionStore = useSessionStore()
const planStore = usePlanStore()
const achievementsStore = useAchievementsStore()
const loading = ref(false)
const saving = ref(false)
const difficulty = ref<SessionDifficulty | null>(null)
const feedback = ref('')

const difficultyLevels = [
  { value: SessionDifficulty.TooEasy, emoji: '😴', label: 'Muy facil' },
  { value: SessionDifficulty.Easy, emoji: '😊', label: 'Facil' },
  { value: SessionDifficulty.JustRight, emoji: '💪', label: 'Justo' },
  { value: SessionDifficulty.Hard, emoji: '😤', label: 'Dificil' },
  { value: SessionDifficulty.TooHard, emoji: '🥵', label: 'Muy dificil' },
]

const duration = computed(() => {
  if (!sessionStore.currentSession) return '0 min'
  const start = new Date(sessionStore.currentSession.startedAt)
  const now = new Date()
  const mins = Math.round((now.getTime() - start.getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hrs}h ${remainMins}m`
})

const exercisesCompleted = computed(() => {
  if (!sessionStore.currentSession) return 0
  const skipped = sessionStore.currentSession.skippedExercises
  return sessionStore.currentSession.exercises.filter(
    e => !skipped.includes(e.exerciseId) && e.sets.some(s => s.completed)
  ).length
})

const totalReps = computed(() => {
  if (!sessionStore.currentSession) return 0
  return sessionStore.currentSession.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce(
      (setSum, s) => setSum + (s.completed && s.reps ? s.reps : 0), 0
    ), 0
  )
})

async function save(): Promise<void> {
  if (difficulty.value === null) return
  saving.value = true
  try {
    await sessionStore.completeSession(
      difficulty.value,
      feedback.value || undefined,
    )

    // Check for newly unlocked achievements
    await achievementsStore.loadUnlocked()
    const newAchievements = await checkAchievements()
    for (const a of newAchievements) {
      const def = achievementsStore.getDefinition(a.achievementId)
      if (def) {
        $q.notify({
          type: 'positive',
          icon: def.icon,
          message: `Logro desbloqueado: ${def.name}`,
          caption: def.description,
          timeout: 4000,
        })
      }
    }

    // Check if 3+ consecutive sessions had extreme difficulty -> suggest recalculation
    await checkDifficultyTrend()

    router.push('/plan')
  } catch (e) {
    console.error('Error completing session:', e)
  } finally {
    saving.value = false
  }
}

async function checkDifficultyTrend(): Promise<void> {
  if (!planStore.activePlan) return
  const sessions = await db.completedSessions
    .where('planId')
    .equals(planStore.activePlan.id)
    .toArray()

  if (sessions.length < 3) return

  const recent = sessions
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 3)

  const allTooHard = recent.every(s => s.difficultyRating >= 4)
  const allTooEasy = recent.every(s => s.difficultyRating <= 2)

  if (!allTooHard && !allTooEasy) return

  const trend = allTooHard ? 'dificiles' : 'faciles'
  const reason = allTooHard
    ? 'Ultimas 3 sesiones valoradas como dificiles/muy dificiles - reducir intensidad'
    : 'Ultimas 3 sesiones valoradas como faciles/muy faciles - aumentar intensidad'

  $q.dialog({
    title: 'Ajustar plan?',
    message: `Tus ultimas 3 sesiones fueron ${trend}. Quieres recalcular el plan para ajustar la intensidad?`,
    cancel: { label: 'No', flat: true },
    ok: { label: 'Recalcular', color: 'primary' },
  }).onOk(async () => {
    try {
      await planStore.recalculatePlan(reason)
      $q.notify({ type: 'positive', message: 'Plan recalculado correctamente' })
    } catch {
      $q.notify({ type: 'negative', message: 'Error al recalcular el plan' })
    }
  })
}
</script>
