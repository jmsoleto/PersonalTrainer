<template>
  <PageShell :loading="loading">

    <!-- Estado vacío -->
    <div v-if="!sessionStore.currentSession" class="sc-empty">
      <span class="sc-empty-watermark">—</span>
      <div class="sc-empty-icon-wrap">
        <q-icon name="check_circle" size="32px" class="sc-empty-icon" />
      </div>
      <h2 class="sc-empty-title">Sin sesión activa</h2>
      <p class="sc-empty-desc">No hay ninguna sesión en curso para completar.</p>
      <router-link to="/plan" class="sc-btn sc-btn--cta">
        <q-icon name="arrow_back" size="18px" />
        Volver al plan
      </router-link>
    </div>

    <template v-else>

      <!-- ── Celebración ─────────────────────────────────────── -->
      <div class="sc-hero">
        <div class="sc-trophy-wrap">
          <q-icon name="emoji_events" size="40px" class="sc-trophy-icon" />
        </div>
        <h1 class="sc-title">Sesión<br>completada</h1>
        <p class="sc-subtitle">{{ sessionStore.currentSession.planned.title }}</p>
      </div>

      <!-- ── Stats 2×2 ──────────────────────────────────────── -->
      <div class="sc-stats">
        <div class="sc-stat">
          <q-icon name="timer" size="20px" class="sc-stat-icon" />
          <span class="sc-stat-value">{{ duration }}</span>
          <span class="sc-stat-label">Duración</span>
        </div>
        <div class="sc-stat">
          <q-icon name="fitness_center" size="20px" class="sc-stat-icon" />
          <span class="sc-stat-value">{{ exercisesCompleted }}</span>
          <span class="sc-stat-label">Ejercicios</span>
        </div>
        <div class="sc-stat">
          <q-icon name="format_list_numbered" size="20px" class="sc-stat-icon" />
          <span class="sc-stat-value">{{ sessionStore.completedSetsCount }}</span>
          <span class="sc-stat-label">Sets</span>
        </div>
        <div class="sc-stat">
          <q-icon name="repeat" size="20px" class="sc-stat-icon" />
          <span class="sc-stat-value">{{ totalReps }}</span>
          <span class="sc-stat-label">Reps totales</span>
        </div>
      </div>

      <!-- ── Dificultad ─────────────────────────────────────── -->
      <section class="sc-section">
        <span class="sc-section-label">¿Cómo fue la dificultad?</span>
        <div class="sc-diff-row">
          <button
            v-for="level in difficultyLevels"
            :key="level.value"
            :class="['sc-diff-btn', { 'sc-diff-btn--active': difficulty === level.value }]"
            type="button"
            :title="level.label"
            @click="difficulty = level.value"
          >
            <span class="sc-diff-emoji">{{ level.emoji }}</span>
            <span class="sc-diff-label">{{ level.label }}</span>
          </button>
        </div>
      </section>

      <!-- ── Comentarios ────────────────────────────────────── -->
      <section class="sc-section">
        <span class="sc-section-label">Comentarios (opcional)</span>
        <textarea
          v-model="feedback"
          class="sc-textarea"
          placeholder="¿Cómo te sentiste? ¿Algo que ajustar?"
          rows="3"
        />
      </section>

      <!-- ── CTA ────────────────────────────────────────────── -->
      <button
        class="sc-btn sc-btn--cta sc-btn--full"
        :disabled="difficulty === null || saving"
        @click="save"
      >
        <q-spinner-dots v-if="saving" size="18px" color="white" />
        <template v-else>
          <q-icon name="check" size="18px" />
          Guardar
        </template>
      </button>

    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useSessionStore } from '../stores/session'
import { usePlanStore } from '../stores/plan'
import { useAchievementsStore } from '../stores/achievements'
import { checkAchievements } from '../composables/useAchievementChecker'
import { SessionDifficulty } from '../types/enums'
import { db } from '../db'

const $q               = useQuasar()
const router           = useRouter()
const sessionStore     = useSessionStore()
const planStore        = usePlanStore()
const achievementsStore = useAchievementsStore()
const loading          = ref(false)
const saving           = ref(false)
const difficulty       = ref<SessionDifficulty | null>(null)
const feedback         = ref('')

const difficultyLevels = [
  { value: SessionDifficulty.TooEasy,  emoji: '😴', label: 'Muy fácil' },
  { value: SessionDifficulty.Easy,     emoji: '😊', label: 'Fácil' },
  { value: SessionDifficulty.JustRight,emoji: '💪', label: 'Justo' },
  { value: SessionDifficulty.Hard,     emoji: '😤', label: 'Difícil' },
  { value: SessionDifficulty.TooHard,  emoji: '🥵', label: 'Muy difícil' },
]

const duration = computed(() => {
  if (!sessionStore.currentSession) return '0 min'
  const mins = Math.round((Date.now() - new Date(sessionStore.currentSession.startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
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
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.completed && set.reps ? set.reps : 0), 0), 0
  )
})

async function save() {
  if (difficulty.value === null) return
  saving.value = true
  try {
    await sessionStore.completeSession(difficulty.value, feedback.value || undefined)
    await achievementsStore.loadUnlocked()
    const newAchievements = await checkAchievements()
    for (const a of newAchievements) {
      const def = achievementsStore.getDefinition(a.achievementId)
      if (def) $q.notify({ type: 'positive', icon: def.icon, message: `Logro desbloqueado: ${def.name}`, caption: def.description, timeout: 4000 })
    }
    await checkDifficultyTrend()
    router.push('/plan')
  } catch (e) {
    console.error('Error completing session:', e)
  } finally {
    saving.value = false
  }
}

async function checkDifficultyTrend() {
  if (!planStore.activePlan) return
  const sessions = await db.completedSessions.where('planId').equals(planStore.activePlan.id).toArray()
  if (sessions.length < 3) return
  const recent = sessions.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 3)
  const allTooHard = recent.every(s => s.difficultyRating >= 4)
  const allTooEasy = recent.every(s => s.difficultyRating <= 2)
  if (!allTooHard && !allTooEasy) return
  const trend = allTooHard ? 'difíciles' : 'fáciles'
  const reason = allTooHard
    ? 'Últimas 3 sesiones valoradas como difíciles/muy difíciles - reducir intensidad'
    : 'Últimas 3 sesiones valoradas como fáciles/muy fáciles - aumentar intensidad'
  $q.dialog({
    title: '¿Ajustar plan?',
    message: `Tus últimas 3 sesiones fueron ${trend}. ¿Quieres recalcular el plan?`,
    cancel: { label: 'No', flat: true },
    ok: { label: 'Recalcular', color: 'primary' },
  }).onOk(async () => {
    try { await planStore.recalculatePlan(reason); $q.notify({ type: 'positive', message: 'Plan recalculado' }) }
    catch { $q.notify({ type: 'negative', message: 'Error al recalcular' }) }
  })
}
</script>

<style scoped>
/* ── Estado vacío ────────────────────────────────────────────── */
.sc-empty {
  position: relative; overflow: hidden;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-low);
  padding: 2rem 1.5rem 1.75rem;
  display: flex; flex-direction: column; gap: 0.75rem;
}
.sc-empty-watermark {
  position: absolute; top: -1.5rem; right: 0.75rem;
  font-family: var(--k-font-headline); font-size: 8rem; font-weight: 700;
  color: var(--k-on-surface); opacity: 0.04; pointer-events: none; user-select: none;
}
.sc-empty-icon-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
}
.sc-empty-icon  { color: var(--k-secondary); }
.sc-empty-title {
  font-family: var(--k-font-headline); font-size: var(--k-headline-md); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0;
}
.sc-empty-desc  { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); margin: 0; }

/* ── Hero ────────────────────────────────────────────────────── */
.sc-hero {
  display: flex; flex-direction: column; gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.sc-trophy-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  width: 56px; height: 56px; border-radius: var(--k-radius-md);
  background-color: rgba(255, 86, 44, 0.12);
  margin-bottom: 0.25rem;
}
.sc-trophy-icon { color: var(--k-primary-container); }
.sc-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}
.sc-subtitle { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); margin: 0; }

/* ── Stats ───────────────────────────────────────────────────── */
.sc-stats {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem;
  margin-bottom: 1rem;
}
.sc-stat {
  display: flex; flex-direction: column; gap: 0.3rem;
  padding: 1rem; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
}
.sc-stat-icon { color: var(--k-primary-container); }
.sc-stat-value {
  font-family: var(--k-font-headline); font-size: var(--k-headline-md); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); line-height: 1;
}
.sc-stat-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); letter-spacing: var(--k-tracking-label);
  text-transform: uppercase; color: var(--k-secondary);
}

/* ── Secciones ───────────────────────────────────────────────── */
.sc-section {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 1rem; margin-bottom: 0.625rem;
  display: flex; flex-direction: column; gap: 0.75rem;
}
.sc-section-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
}

/* ── Dificultad ──────────────────────────────────────────────── */
.sc-diff-row { display: flex; gap: 0.5rem; }
.sc-diff-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  padding: 0.625rem 0.25rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); cursor: pointer;
  transition: background-color 0.15s ease;
}
.sc-diff-btn--active { background-color: rgba(255, 86, 44, 0.15); }
.sc-diff-emoji { font-size: 1.5rem; line-height: 1; }
.sc-diff-label {
  font-family: var(--k-font-body); font-size: 0.6rem; letter-spacing: var(--k-tracking-label);
  text-transform: uppercase; color: var(--k-secondary); text-align: center;
}
.sc-diff-btn--active .sc-diff-label { color: var(--k-primary-container); }

/* ── Textarea ────────────────────────────────────────────────── */
.sc-textarea {
  width: 100%; padding: 0.75rem 1rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-on-surface);
  font-family: var(--k-font-body); font-size: var(--k-body-md); resize: vertical;
  outline: none; box-sizing: border-box; min-height: 80px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.sc-textarea:focus { background-color: var(--k-surface-bright); box-shadow: 0 0 0 1px rgba(255,86,44,0.4); }
.sc-textarea::placeholder { color: var(--k-outline); }

/* ── Botones ─────────────────────────────────────────────────── */
.sc-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.875rem 1.5rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer; text-decoration: none;
  transition: opacity 0.15s ease; align-self: flex-start;
}
.sc-btn--cta { background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
.sc-btn--cta:hover:not(:disabled) { opacity: 0.9; }
.sc-btn--cta:disabled { opacity: 0.4; cursor: not-allowed; }
.sc-btn--full { width: 100%; margin-top: 0.5rem; }
</style>
