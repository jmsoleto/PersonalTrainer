<template>
  <PageShell :loading="loading">
    <!-- Empty state -->
    <div v-if="!loading && sessions.length === 0" class="text-center q-pt-xl">
      <q-icon name="bar_chart" size="64px" color="grey-6" />
      <h5 class="q-mt-md text-grey-6">Sin datos todavia</h5>
      <p class="text-grey-7">Completa tu primera sesion para ver estadisticas</p>
    </div>

    <div v-else-if="!loading">
      <!-- Summary Cards -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-6 col-md-3">
          <q-card flat bordered class="text-center q-pa-md">
            <div class="text-h4 text-primary">{{ totalSessions }}</div>
            <div class="text-caption text-grey-7">Sesiones totales</div>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered class="text-center q-pa-md">
            <div class="text-h4 text-primary">{{ totalReps.toLocaleString() }}</div>
            <div class="text-caption text-grey-7">Repeticiones</div>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered class="text-center q-pa-md">
            <div class="text-h4 text-primary">{{ totalWeight.toLocaleString() }}</div>
            <div class="text-caption text-grey-7">Peso total (kg)</div>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered class="text-center q-pa-md">
            <div class="text-h4 text-primary">{{ currentStreak }}</div>
            <div class="text-caption text-grey-7">Racha actual (dias)</div>
          </q-card>
        </div>
      </div>

      <!-- Volume per Muscle Group -->
      <q-card flat bordered class="q-mb-lg q-pa-md">
        <div class="text-subtitle1 text-weight-medium q-mb-md">Volumen por grupo muscular</div>
        <Bar :data="volumeChartData" :options="barOptions" />
      </q-card>

      <!-- Weekly Adherence -->
      <q-card flat bordered class="q-mb-lg q-pa-md">
        <div class="text-subtitle1 text-weight-medium q-mb-md">Adherencia semanal</div>
        <Bar :data="adherenceChartData" :options="adherenceOptions" />
      </q-card>

      <!-- Difficulty Trend -->
      <q-card flat bordered class="q-mb-lg q-pa-md">
        <div class="text-subtitle1 text-weight-medium q-mb-md">Tendencia de dificultad</div>
        <Line :data="difficultyChartData" :options="lineOptions" />
      </q-card>
    </div>
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
  Legend,
  Filler,
} from 'chart.js'
import PageShell from '../components/layout/PageShell.vue'
import { useSessionStore } from '../stores/session'
import { usePlanStore } from '../stores/plan'
import type { CompletedSession } from '../types/plan'
import { MuscleGroup } from '../types/enums'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const sessionStore = useSessionStore()
const planStore = usePlanStore()

const loading = ref(true)
const sessions = ref<CompletedSession[]>([])

const muscleGroupLabels: Record<string, string> = {
  [MuscleGroup.Chest]: 'Pecho',
  [MuscleGroup.Back]: 'Espalda',
  [MuscleGroup.Shoulders]: 'Hombros',
  [MuscleGroup.Biceps]: 'Biceps',
  [MuscleGroup.Triceps]: 'Triceps',
  [MuscleGroup.Forearms]: 'Antebrazos',
  [MuscleGroup.Core]: 'Core',
  [MuscleGroup.Quads]: 'Cuadriceps',
  [MuscleGroup.Hamstrings]: 'Isquiotibiales',
  [MuscleGroup.Glutes]: 'Gluteos',
  [MuscleGroup.Calves]: 'Pantorrillas',
  [MuscleGroup.FullBody]: 'Cuerpo completo',
}

onMounted(async () => {
  await planStore.loadActivePlan()
  if (planStore.activePlan) {
    sessions.value = await sessionStore.getCompletedSessions(planStore.activePlan.id)
  }
  loading.value = false
})

// --- Summary computeds ---

const totalSessions = computed(() => sessions.value.length)

const totalReps = computed(() =>
  sessions.value.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (eSum, ex) =>
          eSum + ex.sets.filter(set => set.completed).reduce((sSum, set) => sSum + (set.reps ?? 0), 0),
        0,
      ),
    0,
  ),
)

const totalWeight = computed(() =>
  sessions.value.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (eSum, ex) =>
          eSum +
          ex.sets
            .filter(set => set.completed)
            .reduce((sSum, set) => sSum + (set.reps ?? 0) * (set.weightKg ?? 0), 0),
        0,
      ),
    0,
  ),
)

const currentStreak = computed(() => {
  if (sessions.value.length === 0) return 0

  const dates = sessions.value
    .map(s => {
      const d = new Date(s.completedAt)
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b - a)

  const today = new Date()
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const oneDay = 24 * 60 * 60 * 1000

  // Streak must include today or yesterday
  if (dates[0] < todayMs - oneDay) return 0

  let streak = 1
  for (let i = 0; i < dates.length - 1; i++) {
    if (dates[i] - dates[i + 1] === oneDay) {
      streak++
    } else {
      break
    }
  }
  return streak
})

// --- Volume per muscle group ---

const volumePerMuscleGroup = computed(() => {
  const volumes: Record<string, number> = {}

  if (!planStore.activePlan) return volumes

  for (const session of sessions.value) {
    // Find the planned session to get targetMuscleGroups
    const planned = planStore.getSession(session.plannedSessionId)
    if (!planned) continue

    const sessionVolume = session.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter(set => set.completed)
          .reduce((sSum, set) => sSum + (set.reps ?? 0) * (set.weightKg ?? 0), 0),
      0,
    )

    // Distribute volume across target muscle groups
    const groups = planned.targetMuscleGroups
    if (groups.length === 0) continue
    const perGroup = sessionVolume / groups.length

    for (const group of groups) {
      volumes[group] = (volumes[group] ?? 0) + perGroup
    }
  }

  return volumes
})

const volumeChartData = computed(() => {
  const entries = Object.entries(volumePerMuscleGroup.value).filter(([, v]) => v > 0)
  entries.sort((a, b) => b[1] - a[1])

  return {
    labels: entries.map(([key]) => muscleGroupLabels[key] ?? key),
    datasets: [
      {
        label: 'Volumen (reps x kg)',
        data: entries.map(([, v]) => Math.round(v)),
        backgroundColor: 'rgba(25, 118, 210, 0.7)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }
})

// --- Weekly adherence ---

const sessionsPerWeek = computed(() => {
  const weekMap: Record<number, number> = {}
  for (const s of sessions.value) {
    weekMap[s.weekNumber] = (weekMap[s.weekNumber] ?? 0) + 1
  }
  return weekMap
})

const adherenceChartData = computed(() => {
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1)
  return {
    labels: weeks.map(w => `Sem ${w}`),
    datasets: [
      {
        label: 'Sesiones completadas',
        data: weeks.map(w => sessionsPerWeek.value[w] ?? 0),
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }
})

// --- Difficulty trend ---

const avgDifficultyPerWeek = computed(() => {
  const weekMap: Record<number, { sum: number; count: number }> = {}
  for (const s of sessions.value) {
    if (!weekMap[s.weekNumber]) {
      weekMap[s.weekNumber] = { sum: 0, count: 0 }
    }
    weekMap[s.weekNumber].sum += s.difficultyRating
    weekMap[s.weekNumber].count++
  }
  const result: Record<number, number> = {}
  for (const [week, { sum, count }] of Object.entries(weekMap)) {
    result[Number(week)] = Math.round((sum / count) * 10) / 10
  }
  return result
})

const difficultyChartData = computed(() => {
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1)
  const data = weeks.map(w => avgDifficultyPerWeek.value[w] ?? null)

  return {
    labels: weeks.map(w => `Sem ${w}`),
    datasets: [
      {
        label: 'Dificultad promedio',
        data,
        borderColor: 'rgba(255, 152, 0, 1)',
        backgroundColor: 'rgba(255, 152, 0, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(255, 152, 0, 1)',
        spanGaps: true,
      },
    ],
  }
})

// --- Chart options ---

const barOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
}

const adherenceOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1, precision: 0 },
    },
  },
}

const lineOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      min: 1,
      max: 5,
      ticks: {
        stepSize: 1,
        callback: (value: number | string) => {
          const labels: Record<number, string> = {
            1: 'Muy facil',
            2: 'Facil',
            3: 'Adecuado',
            4: 'Dificil',
            5: 'Muy dificil',
          }
          return labels[Number(value)] ?? value
        },
      },
    },
  },
}
</script>
