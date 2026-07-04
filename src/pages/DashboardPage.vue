<template>
  <PageShell :loading="loading">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <header class="db-header">
      <div class="db-header-text">
        <p class="db-date">{{ todayDate }}</p>
        <h1 class="db-greeting">
          Hola<span v-if="userName">, {{ userName }}</span>
        </h1>
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════════
         ESTADO: SIN PLAN
    ════════════════════════════════════════════════════════════ -->
    <template v-if="!planStore.activePlan">

      <!-- Hero vacío -->
      <section class="db-empty-hero">
        <span class="db-empty-watermark">00</span>

        <div class="db-empty-icon-wrap">
          <q-icon name="rocket_launch" size="36px" class="db-empty-icon" />
        </div>

        <h2 class="db-empty-title">Genera tu plan<br>de entrenamiento</h2>
        <p class="db-empty-desc">
          Crea tu plan personalizado de 12 semanas con IA.<br>
          Solo necesitas tu API key de Claude.
        </p>

        <!-- Acciones -->
        <div class="db-empty-actions">
          <router-link
            v-if="!settingsStore.settings.apiKey"
            to="/settings"
            class="db-btn db-btn--secondary"
          >
            <q-icon name="key" size="18px" />
            Configurar API Key
          </router-link>

          <button
            class="db-btn db-btn--cta"
            :disabled="!settingsStore.settings.apiKey || planStore.generating"
            @click="generatePlan"
          >
            <q-spinner-dots v-if="planStore.generating" size="18px" color="white" />
            <template v-else>
              <q-icon name="auto_awesome" size="18px" />
              Generar Plan
            </template>
          </button>

          <button
            class="db-btn db-btn--ghost"
            :disabled="importingPlan"
            @click="triggerPlanImport"
          >
            <q-spinner-dots v-if="importingPlan" size="18px" />
            <template v-else>
              <q-icon name="upload_file" size="18px" />
              Importar Plan
            </template>
          </button>
        </div>

        <!-- Progreso de generación -->
        <div v-if="planStore.generating" class="db-gen-progress">
          <div class="db-gen-bar">
            <div class="db-gen-bar-fill" />
          </div>
          <p class="db-gen-status">
            {{ planStore.generationProgress?.status ?? 'Generando plan...' }}
          </p>
        </div>

        <input
          ref="planFileInput"
          type="file"
          accept=".json"
          style="display:none"
          @change="handlePlanImport"
        />
      </section>

    </template>

    <!-- ═══════════════════════════════════════════════════════════
         ESTADO: CON PLAN ACTIVO
    ════════════════════════════════════════════════════════════ -->
    <template v-else>

      <!-- Semana actual -->
      <section class="db-card db-week-card">
        <div class="db-week-info">
          <span class="db-overline">
            Semana {{ planStore.getCurrentWeekNumber() }} de {{ planStore.activePlan?.totalWeeks ?? 12 }}
          </span>
          <h2 class="db-week-theme">
            {{ planStore.currentWeek?.theme || 'Plan activo' }}
          </h2>
        </div>

        <!-- Progress ring -->
        <div
          class="db-ring"
          :style="{ '--prog': weekProgress }"
          aria-label="`${weekProgress}% completado`"
        >
          <span class="db-ring-value">{{ weekProgress }}<span class="db-ring-pct">%</span></span>
        </div>
      </section>

      <!-- Accesos semana -->
      <div class="db-week-links">
        <router-link to="/plan" class="db-link-btn">
          Ver plan completo
          <q-icon name="chevron_right" size="18px" />
        </router-link>
        <router-link :to="`/plan/week/${planStore.getCurrentWeekNumber()}`" class="db-link-btn">
          Semana actual
          <q-icon name="chevron_right" size="18px" />
        </router-link>
      </div>

      <!-- Sesión de hoy -->
      <section v-if="todaySession" class="db-card db-session-card">
        <span class="db-overline db-overline--accent">Hoy</span>
        <h2 class="db-session-title">{{ todaySession.title }}</h2>

        <div class="db-session-meta">
          <span class="db-meta-pill">
            <q-icon name="timer" size="14px" />
            {{ todaySession.estimatedDurationMinutes }} min
          </span>
          <span class="db-meta-pill">
            <q-icon name="fitness_center" size="14px" />
            {{ todaySession.mainWorkout.length }} ejercicios
          </span>
        </div>

        <div class="db-muscle-chips">
          <span
            v-for="mg in todaySession.targetMuscleGroups"
            :key="mg"
            class="db-chip"
          >{{ mg }}</span>
        </div>

        <router-link
          :to="`/plan/session/${todaySession.id}`"
          class="db-btn db-btn--cta db-session-cta"
        >
          <q-icon name="play_arrow" size="20px" />
          Empezar sesión
        </router-link>
      </section>

      <!-- Día de descanso -->
      <section v-else class="db-card db-rest-card">
        <q-icon name="spa" size="32px" class="db-rest-icon" />
        <div>
          <h3 class="db-rest-title">Día de descanso</h3>
          <p class="db-rest-desc">Descansa y recupera. Mañana volvemos.</p>
        </div>
      </section>

    </template>

    <!-- ── Retos activos ───────────────────────────────────────── -->
    <template v-if="activeChallenges.length > 0">
      <div class="db-quick-label db-challenges-label">
        <span class="db-overline">Mis retos</span>
        <router-link to="/challenges" class="db-challenges-link">
          Ver todos <q-icon name="chevron_right" size="16px" />
        </router-link>
      </div>
      <router-link
        v-for="p in activeChallenges"
        :key="p.accepted.id"
        to="/challenges"
        class="db-card db-challenge-card"
      >
        <div class="db-challenge-icon"><q-icon :name="p.def.icon" size="20px" /></div>
        <div class="db-challenge-main">
          <div class="db-challenge-top">
            <span class="db-challenge-name">{{ p.def.name }}</span>
            <span class="db-challenge-count">{{ formatChallengeNum(p.current) }}/{{ formatChallengeNum(p.target) }}</span>
          </div>
          <div class="db-challenge-bar">
            <div class="db-challenge-fill" :style="{ width: `${Math.round(p.ratio * 100)}%` }" />
          </div>
          <span class="db-challenge-remaining">{{ challengeRemaining(p.accepted.windowEnd) }}</span>
        </div>
      </router-link>
    </template>

    <!-- ── Acciones rápidas (siempre visibles) ─────────────────── -->
    <div class="db-quick-label">
      <span class="db-overline">Acceso rápido</span>
    </div>
    <div class="db-quick-grid">
      <button class="db-quick-tile" @click="$router.push('/challenges')">
        <q-icon name="military_tech" size="26px" class="db-quick-icon" style="color: #ffd166" />
        <span class="db-quick-name">Retos</span>
      </button>
      <button class="db-quick-tile" @click="$router.push('/activity')">
        <q-icon name="directions_run" size="26px" class="db-quick-icon" style="color: var(--k-tertiary)" />
        <span class="db-quick-name">Actividad</span>
      </button>
      <button class="db-quick-tile" @click="$router.push('/measurements')">
        <q-icon name="straighten" size="26px" class="db-quick-icon" style="color: var(--k-tertiary)" />
        <span class="db-quick-name">Medidas</span>
      </button>
      <button class="db-quick-tile" @click="$router.push('/achievements')">
        <q-icon name="emoji_events" size="26px" class="db-quick-icon" style="color: #ffd166" />
        <span class="db-quick-name">Logros</span>
      </button>
      <button class="db-quick-tile" @click="$router.push('/exercises')">
        <q-icon name="fitness_center" size="26px" class="db-quick-icon" style="color: var(--k-primary)" />
        <span class="db-quick-name">Ejercicios</span>
      </button>
      <button class="db-quick-tile" @click="$router.push('/stats')">
        <q-icon name="bar_chart" size="26px" class="db-quick-icon" style="color: var(--k-primary-container)" />
        <span class="db-quick-name">Estadísticas</span>
      </button>
    </div>

  </PageShell>

  <GeneratePlanDialog
    v-model="showGenerateDialog"
    @confirm="handleGenerateConfirm"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import GeneratePlanDialog from '../components/plan/GeneratePlanDialog.vue'
import { useUserStore } from '../stores/user'
import { usePlanStore } from '../stores/plan'
import { useSettingsStore } from '../stores/settings'
import { useSessionStore } from '../stores/session'
import { useChallengesStore } from '../stores/challenges'
import { useAchievementsStore } from '../stores/achievements'
import { checkChallenges, getActiveProgress, type ChallengeProgress } from '../composables/useChallengeChecker'
import { checkAchievements } from '../composables/useAchievementChecker'
import { Notify } from 'quasar'

const userStore     = useUserStore()
const planStore     = usePlanStore()
const settingsStore = useSettingsStore()
const sessionStore  = useSessionStore()
const challengesStore = useChallengesStore()
const achievementsStore = useAchievementsStore()
const loading       = ref(true)

const activeChallenges = ref<ChallengeProgress[]>([])

onMounted(async () => {
  await Promise.all([userStore.loadUser(), planStore.loadActivePlan()])
  await loadWeekProgress()
  await loadChallenges()
  loading.value = false
})

async function loadChallenges() {
  await challengesStore.loadAccepted()
  const completed = await checkChallenges()   // resolve completed / silent deadlines
  if (completed.length > 0) {
    // Persist any challenge-derived achievement unlock (shown in the gallery)
    await achievementsStore.loadUnlocked()
    await checkAchievements()
  }
  activeChallenges.value = await getActiveProgress()
}

function challengeRemaining(windowEnd: string): string {
  const end = new Date(windowEnd + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const days = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Finalizado'
  if (days === 0) return 'Último día'
  if (days === 1) return 'Queda 1 día'
  return `Quedan ${days} días`
}

function formatChallengeNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

const userName = computed(() => userStore.currentUser?.name ?? '')

const todayDate = computed(() =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
)

const todaySession = computed(() => {
  if (!planStore.currentWeek) return null
  const dayOfWeek = new Date().getDay() || 7
  return planStore.currentWeek.days.find(d => d.dayNumber === dayOfWeek)?.session ?? null
})

const weekProgress = computed(() => {
  if (!planStore.currentWeek || !planStore.activePlan) return 0
  const trainingDays = planStore.currentWeek.days.filter(d => d.dayType === 'training').length
  if (trainingDays === 0) return 100
  return Math.round((completedThisWeek.value / trainingDays) * 100)
})

const showGenerateDialog = ref(false)
const importingPlan      = ref(false)
const planFileInput      = ref<HTMLInputElement | null>(null)
const completedThisWeek  = ref(0)

async function loadWeekProgress() {
  if (!planStore.activePlan) return
  const weekNum = planStore.getCurrentWeekNumber()
  const sessions = await sessionStore.getCompletedSessions(planStore.activePlan.id)
  completedThisWeek.value = sessions.filter(s => s.weekNumber === weekNum).length
}

function triggerPlanImport() { planFileInput.value?.click() }

async function handlePlanImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importingPlan.value = true
  try {
    const data = JSON.parse(await file.text())
    await planStore.importExternalPlan(data)
    await loadWeekProgress()
    Notify.create({ message: 'Plan importado correctamente', color: 'positive', icon: 'check_circle' })
  } catch (e) {
    Notify.create({ message: e instanceof Error ? e.message : 'Error al importar el plan', color: 'negative', icon: 'error' })
  } finally {
    importingPlan.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

function generatePlan() { showGenerateDialog.value = true }

async function handleGenerateConfirm(params: {
  weeks: number; daysPerWeek: number; sessionDurationMin: number
  trainingStyle: string; additionalNotes: string
}) {
  settingsStore.updatePlanWeeks(params.weeks)
  settingsStore.updateDaysPerWeek(params.daysPerWeek)
  settingsStore.updateSessionDurationMin(params.sessionDurationMin)
  try {
    await planStore.generatePlan({ trainingStyle: params.trainingStyle || undefined, additionalNotes: params.additionalNotes || undefined })
    Notify.create({ message: 'Plan generado correctamente', color: 'positive', icon: 'check_circle' })
  } catch {
    Notify.create({ message: planStore.error || 'Error al generar el plan', color: 'negative', icon: 'error' })
  }
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════════════════ */
.db-header {
  margin-bottom: 1.75rem;
}

.db-date {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-secondary);
  margin: 0 0 0.25rem;
}

.db-greeting {
  font-family: var(--k-font-headline);
  font-size: 2.25rem;
  font-weight: 700;
  font-style: italic;
  text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0;
  line-height: 1.05;
}


/* ══════════════════════════════════════════════════════════════
   TARJETAS BASE
══════════════════════════════════════════════════════════════ */
.db-card {
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  padding: 1.25rem;
  margin-bottom: 0.75rem;
}

/* ══════════════════════════════════════════════════════════════
   ESTADO VACÍO (SIN PLAN)
══════════════════════════════════════════════════════════════ */
.db-empty-hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-low);
  padding: 2rem 1.5rem 1.75rem;
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.db-empty-watermark {
  position: absolute;
  top: -1rem;
  right: 0.75rem;
  font-family: var(--k-font-headline);
  font-size: 7rem;
  font-weight: 700;
  color: var(--k-on-surface);
  opacity: 0.04;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.db-empty-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
}

.db-empty-icon {
  color: var(--k-primary-container);
}

.db-empty-title {
  font-family: var(--k-font-headline);
  font-size: var(--k-headline-md);
  font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0;
  line-height: 1.15;
}

.db-empty-desc {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
  margin: 0;
  line-height: 1.6;
}

.db-empty-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* Barra de progreso de generación */
.db-gen-progress {
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.db-gen-bar {
  height: 6px;
  border-radius: 3px;
  background-color: var(--k-surface-high);
  overflow: hidden;
}

.db-gen-bar-fill {
  height: 100%;
  width: 40%;
  border-radius: 3px;
  background: var(--k-gradient-cta);
  animation: db-indeterminate 1.4s ease-in-out infinite;
}

@keyframes db-indeterminate {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

.db-gen-status {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  color: var(--k-secondary);
  margin: 0;
}

/* ══════════════════════════════════════════════════════════════
   SEMANA ACTUAL
══════════════════════════════════════════════════════════════ */
.db-week-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.db-week-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.db-week-theme {
  font-family: var(--k-font-headline);
  font-size: var(--k-title-lg);
  font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Progress ring via conic-gradient */
.db-ring {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: conic-gradient(
    var(--k-primary-container) calc(var(--prog, 0) * 1%),
    var(--k-surface-high) 0
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Inner circle (donut) */
.db-ring::before {
  content: '';
  position: absolute;
  inset: 7px;
  border-radius: 50%;
  background-color: var(--k-surface-container);
}

.db-ring-value {
  position: relative;
  z-index: 1;
  font-family: var(--k-font-headline);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--k-on-surface);
  letter-spacing: -0.03em;
  line-height: 1;
}

.db-ring-pct {
  font-size: 0.55rem;
  font-weight: 500;
}

/* Links de semana */
.db-week-links {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.db-link-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest);
  color: var(--k-secondary);
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.15s ease;
}
.db-link-btn:hover { background-color: var(--k-surface-bright); color: var(--k-on-surface); }

/* ══════════════════════════════════════════════════════════════
   SESIÓN DE HOY
══════════════════════════════════════════════════════════════ */
.db-session-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.db-session-title {
  font-family: var(--k-font-headline);
  font-size: var(--k-headline-md);
  font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0;
  line-height: 1.15;
}

.db-session-meta {
  display: flex;
  gap: 0.5rem;
}

.db-meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.625rem;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  color: var(--k-secondary);
}

.db-muscle-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.db-chip {
  padding: 0.2rem 0.6rem;
  border-radius: var(--k-radius-sm);
  background-color: var(--k-surface-highest);
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-on-surface-variant);
}

.db-session-cta {
  margin-top: 0.25rem;
  justify-content: center;
  text-decoration: none;
}

/* ══════════════════════════════════════════════════════════════
   DÍA DE DESCANSO
══════════════════════════════════════════════════════════════ */
.db-rest-card {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.db-rest-icon {
  color: var(--k-tertiary);
  flex-shrink: 0;
}

.db-rest-title {
  font-family: var(--k-font-headline);
  font-size: var(--k-body-lg);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0 0 0.2rem;
}

.db-rest-desc {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
  margin: 0;
}

/* ══════════════════════════════════════════════════════════════
   RETOS ACTIVOS
══════════════════════════════════════════════════════════════ */
.db-challenges-label {
  display: flex; align-items: baseline; justify-content: space-between;
}
.db-challenges-link {
  display: inline-flex; align-items: center; gap: 0.1rem;
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  color: var(--k-primary-container); text-decoration: none;
}
.db-challenge-card {
  display: flex; align-items: center; gap: 0.75rem; text-decoration: none;
}
.db-challenge-icon {
  width: 40px; height: 40px; flex-shrink: 0; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); color: #ffd166;
  display: flex; align-items: center; justify-content: center;
}
.db-challenge-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.db-challenge-top { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.db-challenge-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.db-challenge-count {
  flex-shrink: 0; font-family: var(--k-font-headline); font-size: var(--k-label-md); font-weight: 600;
  color: var(--k-primary-container);
}
.db-challenge-bar { height: 6px; border-radius: 3px; background-color: var(--k-surface-high); overflow: hidden; }
.db-challenge-fill { height: 100%; border-radius: 3px; background: var(--k-gradient-cta); transition: width 0.3s ease; }
.db-challenge-remaining { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }

/* ══════════════════════════════════════════════════════════════
   ACCIONES RÁPIDAS
══════════════════════════════════════════════════════════════ */
.db-quick-label {
  margin: 1.25rem 0 0.625rem;
}

.db-quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

.db-quick-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 1rem;
  border: none;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}
.db-quick-tile:hover { background-color: var(--k-surface-high); }

.db-quick-name {
  font-family: var(--k-font-headline);
  font-size: var(--k-body-md);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
}

/* ══════════════════════════════════════════════════════════════
   TOKENS COMPARTIDOS: OVERLINE / BOTONES
══════════════════════════════════════════════════════════════ */
.db-overline {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-secondary);
}

.db-overline--accent {
  color: var(--k-primary-container);
}

/* Botones comunes */
.db-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.8rem 1.25rem;
  border: none;
  border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline);
  font-size: var(--k-body-md);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.db-btn--cta {
  background: var(--k-gradient-cta);
  color: var(--k-on-primary-container);
}
.db-btn--cta:hover:not(:disabled) { opacity: 0.9; }

.db-btn--secondary {
  background-color: var(--k-surface-highest);
  color: var(--k-secondary);
}
.db-btn--secondary:hover { background-color: var(--k-surface-bright); color: var(--k-on-surface); }

.db-btn--ghost {
  background-color: transparent;
  color: var(--k-secondary);
  box-shadow: inset 0 0 0 1px var(--k-ghost-border);
}
.db-btn--ghost:hover { background-color: var(--k-surface-container); }

.db-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
