<template>
  <PageShell :loading="loading">

    <!-- ── Semana no encontrada ──────────────────────────────── -->
    <div v-if="!week" class="wv-empty">
      <div class="wv-empty-icon-wrap">
        <span class="material-symbols-outlined wv-empty-icon">calendar_month</span>
      </div>
      <h2 class="wv-empty-title">Semana no encontrada</h2>
      <p class="wv-empty-desc">Esta semana no existe en tu plan activo.</p>
      <router-link to="/plan" class="wv-btn wv-btn--cta">
        <span class="material-symbols-outlined" style="font-size:18px">arrow_back</span>
        Volver al plan
      </router-link>
    </div>

    <!-- ── Vista de semana ───────────────────────────────────── -->
    <template v-else>

      <!-- Botón volver -->
      <router-link to="/plan" class="wv-back">
        <span class="material-symbols-outlined">arrow_back</span>
      </router-link>

      <!-- ── Héroe ─────────────────────────────────────────────── -->
      <header class="wv-hero">
        <div class="wv-hero-row">
          <h1 class="wv-hero-title">Semana {{ week.weekNumber }}</h1>
          <span class="wv-hero-pct">{{ progressPct }}%</span>
        </div>

        <!-- Barra de progreso -->
        <div class="wv-progress-track">
          <div class="wv-progress-fill" :style="{ width: progressPct + '%' }" />
        </div>

        <!-- Mensaje motivacional -->
        <p class="wv-hero-msg" v-if="progressPct > 0">
          ¡Sigue así! Estás al
          <strong style="color: var(--k-primary-container)">{{ progressPct }}%</strong>
          de tu objetivo semanal.
        </p>
        <p class="wv-hero-msg" v-else>
          Empieza la semana con todo. ¡Tú puedes!
        </p>
      </header>

      <!-- ── Lista de días ─────────────────────────────────────── -->
      <ul class="wv-days">
        <li
          v-for="day in week.days"
          :key="day.dayNumber"
          :class="['wv-day', dayCardClass(day)]"
          @click="day.dayType === 'training' && day.session && $router.push(`/plan/session/${day.session.id}`)"
        >
          <!-- Icono izquierdo -->
          <div :class="['wv-icon-box', dayIconBoxClass(day)]">
            <span class="material-symbols-outlined wv-icon-symbol">
              {{ dayIcon(day) }}
            </span>
          </div>

          <!-- Info central -->
          <div class="wv-day-info">
            <div class="wv-day-top">
              <span :class="['wv-day-label', dayLabelClass(day)]">
                {{ dayLabel(day.dayNumber) }}{{ isToday(day.dayNumber) ? ' (Hoy)' : '' }}
              </span>
              <span :class="['wv-day-badge', dayBadgeClass(day)]">
                {{ dayBadgeText(day) }}
              </span>
            </div>
            <span :class="['wv-day-name', dayNameClass(day)]">
              {{ dayTitle(day) }}
            </span>
          </div>
        </li>
      </ul>

    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from '../components/layout/PageShell.vue'
import { usePlanStore } from '../stores/plan'
import { db } from '../db'
import type { Week, DayPlan } from '../types/plan'

const route     = useRoute()
const planStore = usePlanStore()
const loading   = ref(true)
const week      = ref<Week | undefined>(undefined)
const completedDayNumbers = ref<Set<number>>(new Set())

// ── Día de la semana actual (1=Lun … 7=Dom) ──────────────────────
const todayDayNum = computed(() => {
  const d = new Date().getDay() // 0=Dom, 1=Lun … 6=Sáb
  return d === 0 ? 7 : d
})

const isCurrentWeek = computed(() =>
  week.value?.weekNumber === planStore.getCurrentWeekNumber(),
)

function isToday(dayNumber: number): boolean {
  return isCurrentWeek.value && dayNumber === todayDayNum.value
}

function isCompleted(dayNumber: number): boolean {
  return completedDayNumbers.value.has(dayNumber)
}

// Primer día de entrenamiento no completado >= hoy (en semana actual)
const nextTrainingDayNum = computed(() => {
  if (!week.value || !isCurrentWeek.value) return null
  const trainingDays = week.value.days
    .filter(d => d.dayType === 'training' && !isCompleted(d.dayNumber))
    .map(d => d.dayNumber)
    .sort((a, b) => a - b)

  // Primer día >= hoy
  const fromToday = trainingDays.find(n => n >= todayDayNum.value)
  return fromToday ?? trainingDays[0] ?? null
})

// ── Progreso ─────────────────────────────────────────────────────
const progressPct = computed(() => {
  if (!week.value) return 0
  const total = week.value.days.filter(d => d.dayType === 'training').length
  if (total === 0) return 0
  return Math.round((completedDayNumbers.value.size / total) * 100)
})

// ── Nombres de días ──────────────────────────────────────────────
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
function dayLabel(n: number): string {
  return DAY_NAMES[(n - 1) % 7] ?? `Día ${n}`
}

// ── Título de sesión / tipo de día ───────────────────────────────
function dayTitle(day: DayPlan): string {
  if (day.dayType === 'training' && day.session) return day.session.title
  if (day.dayType === 'active_rest') return 'Recuperación activa'
  return 'Descanso'
}

// ── Estado del día ───────────────────────────────────────────────
type DayState = 'completed' | 'today' | 'rest' | 'next' | 'upcoming'

function getDayState(day: DayPlan): DayState {
  if (day.dayType === 'training') {
    if (isCompleted(day.dayNumber)) return 'completed'
    if (isToday(day.dayNumber))     return 'today'
    if (day.dayNumber === nextTrainingDayNum.value) return 'next'
    return 'upcoming'
  }
  return 'rest'
}

// ── Clases y estilos según estado ────────────────────────────────
function dayCardClass(day: DayPlan): string {
  const s = getDayState(day)
  const clickable = day.dayType === 'training' && day.session
  return [
    `wv-day--${s}`,
    clickable ? 'wv-day--clickable' : '',
  ].filter(Boolean).join(' ')
}

function dayIconBoxClass(day: DayPlan): string {
  return `wv-icon-box--${getDayState(day)}`
}

function dayIcon(day: DayPlan): string {
  const s = getDayState(day)
  if (s === 'completed') return 'check_circle'
  if (s === 'today')     return 'play_arrow'
  if (day.dayType === 'active_rest') return 'self_improvement'
  if (day.dayType === 'rest')        return 'hotel'
  return 'fitness_center'
}

function dayLabelClass(day: DayPlan): string {
  const s = getDayState(day)
  if (s === 'today') return 'wv-day-label--today'
  return ''
}

function dayBadgeText(day: DayPlan): string {
  const s = getDayState(day)
  if (s === 'completed') return 'Completado'
  if (s === 'today')     return '● Activo'
  if (s === 'rest' && day.dayType === 'active_rest') return 'Descanso'
  if (s === 'rest')      return 'Descanso'
  if (s === 'next')      return 'Próximo'
  return ''
}

function dayBadgeClass(day: DayPlan): string {
  const s = getDayState(day)
  if (s === 'completed') return 'wv-badge--completed'
  if (s === 'today')     return 'wv-badge--today'
  if (s === 'rest')      return 'wv-badge--rest'
  if (s === 'next')      return 'wv-badge--next'
  return 'wv-badge--hidden'
}

function dayNameClass(day: DayPlan): string {
  const s = getDayState(day)
  if (s === 'completed') return 'wv-day-name--done'
  if (s === 'today')     return 'wv-day-name--today'
  if (s === 'rest' || s === 'upcoming') return 'wv-day-name--dim'
  return ''
}

// ── Carga de datos ───────────────────────────────────────────────
onMounted(async () => {
  await planStore.loadActivePlan()
  week.value = planStore.getWeek(Number(route.params.weekNumber))

  if (week.value && planStore.activePlan) {
    const sessions = await db.completedSessions
      .where('[weekNumber+dayNumber]')
      .between(
        [week.value.weekNumber, 1],
        [week.value.weekNumber, 7],
        true,
        true,
      )
      .filter(s => s.planId === planStore.activePlan!.id)
      .toArray()

    completedDayNumbers.value = new Set(sessions.map(s => s.dayNumber))
  }

  loading.value = false
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   ESTADO VACÍO
══════════════════════════════════════════════════════════════ */
.wv-empty {
  display: flex; flex-direction: column; gap: 0.75rem;
  padding: 2rem 1.5rem; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-low);
}
.wv-empty-icon-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
}
.wv-empty-icon { color: var(--k-secondary); font-size: 28px !important; }
.wv-empty-title {
  font-family: var(--k-font-headline); font-size: var(--k-headline-md); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0;
}
.wv-empty-desc {
  font-family: var(--k-font-body); font-size: var(--k-body-md);
  color: var(--k-secondary); margin: 0;
}

/* ══════════════════════════════════════════════════════════════
   BOTÓN VOLVER
══════════════════════════════════════════════════════════════ */
.wv-back {
  display: inline-flex; align-items: center; gap: 0.35rem;
  color: var(--k-secondary); text-decoration: none;
  font-family: var(--k-font-body); font-size: var(--k-body-md);
  margin-bottom: 1.25rem;
  transition: color 0.15s ease;
}
.wv-back:hover { color: var(--k-on-surface); }
.wv-back .material-symbols-outlined { font-size: 20px !important; }

/* ══════════════════════════════════════════════════════════════
   HÉROE
══════════════════════════════════════════════════════════════ */
.wv-hero { margin-bottom: 1.75rem; }

.wv-hero-row {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 0.5rem; margin-bottom: 0.5rem;
}
.wv-hero-title {
  font-family: var(--k-font-headline); font-size: 2.5rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface); margin: 0; line-height: 1;
}
.wv-hero-pct {
  font-family: var(--k-font-headline); font-size: var(--k-headline-md); font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-primary-container); flex-shrink: 0;
}

/* Barra de progreso */
.wv-progress-track {
  width: 100%; height: 3px; border-radius: 2px;
  background-color: var(--k-surface-highest);
  margin-bottom: 0.875rem; overflow: hidden;
}
.wv-progress-fill {
  height: 100%;
  background: var(--k-gradient-cta);
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* Mensaje motivacional */
.wv-hero-msg {
  font-family: var(--k-font-body); font-size: var(--k-body-md);
  color: var(--k-on-surface); margin: 0; line-height: 1.5;
}

/* ══════════════════════════════════════════════════════════════
   LISTA DE DÍAS
══════════════════════════════════════════════════════════════ */
.wv-days {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.375rem;
}

/* ── Card base ──────────────────────────────────────────────── */
.wv-day {
  display: flex; align-items: center; gap: 0.875rem;
  padding: 0.875rem 1rem; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  border-left: 3px solid transparent;
  transition: background-color 0.15s ease;
}
.wv-day--clickable { cursor: pointer; }
.wv-day--clickable:hover { background-color: var(--k-surface-high); }

/* Completado — sutil */
.wv-day--completed { background-color: var(--k-surface-container); }

/* Hoy — destacado */
.wv-day--today {
  border-left-color: var(--k-primary-container);
  background-color: rgba(255, 86, 44, 0.08);
}
.wv-day--today:hover { background-color: rgba(255, 86, 44, 0.13); }

/* Descanso — apagado */
.wv-day--rest { opacity: 0.6; }

/* Próximo — normal */
.wv-day--next { }

/* Por venir — apagado */
.wv-day--upcoming { opacity: 0.5; }

/* ── Caja de icono ──────────────────────────────────────────── */
.wv-icon-box {
  display: flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; flex-shrink: 0;
  border-radius: var(--k-radius-md);
}

/* Completado: verde */
.wv-icon-box--completed {
  background-color: rgba(76, 175, 80, 0.15);
}
.wv-icon-box--completed .wv-icon-symbol {
  color: #4caf50;
  font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}

/* Hoy: naranja sólido */
.wv-icon-box--today {
  background: var(--k-gradient-cta);
}
.wv-icon-box--today .wv-icon-symbol {
  color: var(--k-on-primary-container);
  font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
}

/* Descanso: azul tenue */
.wv-icon-box--rest {
  background-color: rgba(166, 200, 255, 0.12);
}
.wv-icon-box--rest .wv-icon-symbol { color: var(--k-tertiary); }

/* Próximo: gris tenue */
.wv-icon-box--next {
  background-color: var(--k-surface-high);
}
.wv-icon-box--next .wv-icon-symbol { color: var(--k-secondary); }

/* Por venir: muy apagado */
.wv-icon-box--upcoming {
  background-color: var(--k-surface-high);
}
.wv-icon-box--upcoming .wv-icon-symbol { color: var(--k-secondary); }

.wv-icon-symbol { font-size: 22px !important; }

/* ── Info del día ───────────────────────────────────────────── */
.wv-day-info {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem;
}

.wv-day-top {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
}

/* Etiqueta de día (nombre del día) */
.wv-day-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase;
  color: var(--k-secondary); flex-shrink: 0;
}
.wv-day-label--today { color: var(--k-primary-container); }

/* Badge de estado */
.wv-day-badge {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 600;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; white-space: nowrap;
}
.wv-badge--completed { color: #4caf50; }
.wv-badge--today     { color: var(--k-primary-container); }
.wv-badge--rest      { color: var(--k-tertiary); }
.wv-badge--next      { color: var(--k-secondary); }
.wv-badge--hidden    { display: none; }

/* Nombre de la sesión */
.wv-day-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-lg); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); text-transform: uppercase;
  color: var(--k-on-surface);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.wv-day-name--done  { color: var(--k-secondary); }
.wv-day-name--today { color: var(--k-on-surface); }
.wv-day-name--dim   { color: var(--k-secondary); }

/* ══════════════════════════════════════════════════════════════
   BOTONES
══════════════════════════════════════════════════════════════ */
.wv-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.8rem 1.25rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer;
  text-decoration: none; transition: opacity 0.15s ease; align-self: flex-start;
}
.wv-btn--cta { background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
.wv-btn--cta:hover { opacity: 0.9; }
</style>
