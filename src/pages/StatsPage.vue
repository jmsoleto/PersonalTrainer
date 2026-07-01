<template>
  <PageShell :loading="loading">

    <!-- ── Empty state ──────────────────────────────────────────── -->
    <div v-if="!loading && sessions.length === 0" class="st-empty">
      <div class="st-empty-icon"><q-icon name="bar_chart" size="28px" /></div>
      <span class="st-empty-title">Sin datos todavía</span>
      <span class="st-empty-desc">Completa tu primera sesión para ver estadísticas</span>
    </div>

    <template v-else-if="!loading">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <header class="st-header">
        <span class="st-overline">Análisis</span>
        <h1 class="st-title">Estadísticas</h1>
      </header>

      <!-- ── Summary grid ──────────────────────────────────────── -->
      <div class="st-summary">
        <div class="st-stat">
          <span class="st-stat-val">{{ totalSessions }}</span>
          <span class="st-stat-label">Sesiones</span>
        </div>
        <div class="st-stat">
          <span class="st-stat-val">{{ totalReps.toLocaleString() }}</span>
          <span class="st-stat-label">Reps totales</span>
        </div>
        <div class="st-stat">
          <span class="st-stat-val">{{ totalWeight.toLocaleString() }}</span>
          <span class="st-stat-label">Peso total (kg)</span>
        </div>
        <div class="st-stat">
          <span class="st-stat-val">{{ currentStreak }}</span>
          <span class="st-stat-label">Racha (días)</span>
        </div>
      </div>

      <!-- ── Weekly adherence ───────────────────────────────────── -->
      <div class="st-chart-card">
        <span class="st-chart-label">Adherencia semanal</span>
        <Bar :data="adherenceChartData" :options="adherenceOptions" />
      </div>

      <!-- ── Daily difficulty trend ─────────────────────────────── -->
      <div class="st-chart-card">
        <span class="st-chart-label">Tendencia de dificultad</span>
        <div class="st-scroll-wrap">
          <div class="st-scroll-inner" :style="{ width: difficultyScrollWidth }">
            <Line :data="dailyDifficultyData" :options="dailyDifficultyOptions" />
          </div>
        </div>
      </div>

    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import PageShell from '../components/layout/PageShell.vue'
import { useSessionStore } from '../stores/session'
import { usePlanStore } from '../stores/plan'
import type { CompletedSession } from '../types/plan'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Filler)

const sessionStore = useSessionStore()
const planStore    = usePlanStore()
const loading      = ref(true)
const sessions     = ref<CompletedSession[]>([])


onMounted(async () => {
  await planStore.loadActivePlan()
  if (planStore.activePlan) sessions.value = await sessionStore.getCompletedSessions(planStore.activePlan.id)
  loading.value = false
})

const totalSessions = computed(() => sessions.value.length)

const totalReps = computed(() =>
  sessions.value.reduce((sum, s) =>
    sum + s.exercises.reduce((eSum, ex) =>
      eSum + ex.sets.filter(set => set.completed).reduce((sSum, set) => sSum + (set.reps ?? 0), 0), 0), 0))

const totalWeight = computed(() =>
  sessions.value.reduce((sum, s) =>
    sum + s.exercises.reduce((eSum, ex) =>
      eSum + ex.sets.filter(set => set.completed).reduce((sSum, set) => sSum + (set.reps ?? 0) * (set.weightKg ?? 0), 0), 0), 0))

const currentStreak = computed(() => {
  if (sessions.value.length === 0) return 0
  const dates = sessions.value
    .map(s => { const d = new Date(s.completedAt); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() })
    .filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a)
  const today = new Date()
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const oneDay = 86400000
  if (dates[0] < todayMs - oneDay) return 0
  let streak = 1
  for (let i = 0; i < dates.length - 1; i++) {
    if (dates[i] - dates[i + 1] === oneDay) streak++
    else break
  }
  return streak
})


const sessionsPerWeek = computed(() => {
  const weekMap: Record<number, number> = {}
  for (const s of sessions.value) weekMap[s.weekNumber] = (weekMap[s.weekNumber] ?? 0) + 1
  return weekMap
})

const adherenceChartData = computed(() => {
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1)
  return {
    labels: weeks.map(w => `Sem ${w}`),
    datasets: [{
      label: 'Sesiones completadas',
      data: weeks.map(w => sessionsPerWeek.value[w] ?? 0),
      backgroundColor: 'rgba(166,200,255,0.7)',
      borderColor: '#a6c8ff',
      borderWidth: 1, borderRadius: 4,
    }],
  }
})

const MIN_PX_PER_DAY = 48

const dailyDifficultyData = computed(() => {
  const dayMap: Record<string, { sum: number; count: number }> = {}
  for (const s of sessions.value) {
    const date = s.completedAt.slice(0, 10)
    if (!dayMap[date]) dayMap[date] = { sum: 0, count: 0 }
    dayMap[date].sum += s.difficultyRating
    dayMap[date].count++
  }
  const sortedDays = Object.keys(dayMap).sort()
  return {
    labels: sortedDays.map(d => {
      const dt = new Date(d + 'T00:00:00')
      return dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    }),
    datasets: [{
      label: 'Dificultad',
      data: sortedDays.map(d => Math.round((dayMap[d].sum / dayMap[d].count) * 10) / 10),
      borderColor: '#ffb4a2',
      backgroundColor: 'rgba(255,180,162,0.1)',
      fill: true, tension: 0.35,
      pointRadius: 5, pointHoverRadius: 7,
      pointBackgroundColor: '#ffb4a2',
    }],
  }
})

const difficultyScrollWidth = computed(() => {
  const days = dailyDifficultyData.value.labels.length
  return Math.max(300, days * MIN_PX_PER_DAY) + 'px'
})

const xTicks = { color: '#c1c7cf', font: { family: 'Inter', size: 11 } }
const yTicks = { color: '#c1c7cf', font: { family: 'Inter', size: 11 }, precision: 0 }
const gridColor = 'rgba(255,255,255,0.04)'

const adherenceOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: xTicks, grid: { color: gridColor } },
    y: { beginAtZero: true, ticks: { ...yTicks, stepSize: 1 }, grid: { color: gridColor } },
  },
}

const dailyDifficultyOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: xTicks, grid: { color: gridColor } },
    y: {
      min: 1, max: 5,
      ticks: {
        color: '#c1c7cf', font: { family: 'Inter', size: 11 }, stepSize: 1,
        callback: (value: number | string) => ({
          1: 'Muy fácil', 2: 'Fácil', 3: 'Adecuado', 4: 'Difícil', 5: 'Muy difícil',
        })[Number(value)] ?? value,
      },
      grid: { color: gridColor },
    },
  },
}
</script>

<style scoped>
/* ── Empty ───────────────────────────────────────────────────── */
.st-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  padding: 3rem 1rem; text-align: center;
}
.st-empty-icon {
  width: 56px; height: 56px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container); color: var(--k-secondary);
  display: flex; align-items: center; justify-content: center;
}
.st-empty-title {
  font-family: var(--k-font-headline); font-size: var(--k-headline-md); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.st-empty-desc { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); }

/* ── Header ──────────────────────────────────────────────────── */
.st-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.25rem; }
.st-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.st-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}

/* ── Summary grid ────────────────────────────────────────────── */
.st-summary {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; margin-bottom: 1rem;
}
.st-stat {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem;
}
.st-stat-val {
  font-family: var(--k-font-headline); font-size: var(--k-headline-md); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-primary-container);
}
.st-stat-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary);
}

/* ── Chart card ──────────────────────────────────────────────── */
.st-chart-card {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 1rem; margin-bottom: 0.625rem;
}
.st-chart-label {
  display: block; font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin-bottom: 0.875rem;
}

/* ── Scrollable difficulty chart ─────────────────────────────── */
.st-scroll-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -1rem;
  padding: 0 1rem;
}
.st-scroll-inner {
  height: 220px;
  min-width: 100%;
}
</style>
