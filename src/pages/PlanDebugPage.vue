<template>
  <PageShell :loading="loading">

    <!-- Header -->
    <header class="dbg-header">
      <router-link to="/plan" class="dbg-back">
        <span class="material-symbols-outlined">arrow_back</span>
      </router-link>
      <div class="dbg-header-text">
        <span class="dbg-overline">Herramienta de depuración</span>
        <h1 class="dbg-title">Estructura del Plan</h1>
      </div>
      <button class="dbg-copy-btn" @click="copyJson" :title="copied ? 'Copiado' : 'Copiar JSON'">
        <span class="material-symbols-outlined">{{ copied ? 'check' : 'content_copy' }}</span>
      </button>
    </header>

    <!-- Sin plan -->
    <div v-if="!planStore.activePlan" class="dbg-empty">
      No hay plan activo.
      <router-link to="/dashboard">Ir al dashboard</router-link>
    </div>

    <!-- Plan info -->
    <template v-else>
      <div class="dbg-meta">
        <span class="dbg-meta-item">ID: <code>{{ planStore.activePlan.id }}</code></span>
        <span class="dbg-meta-item">Semanas: {{ planStore.activePlan.weeks.length }}</span>
        <span class="dbg-meta-item">Inicio: {{ planStore.activePlan.startDate }}</span>
      </div>

      <!-- Semanas -->
      <div v-for="week in planStore.activePlan.weeks" :key="week.weekNumber" class="dbg-week">
        <div class="dbg-week-header">
          <span class="dbg-week-num">Semana {{ week.weekNumber }}</span>
          <span class="dbg-week-theme">{{ week.theme }}</span>
        </div>

        <div
          v-for="day in week.days.filter(d => d.dayType === 'training')"
          :key="day.dayNumber"
          :class="['dbg-day', isDuplicateSession(week.weekNumber, day.dayNumber) ? 'dbg-day--duplicate' : '']"
        >
          <!-- Cabecera del día -->
          <div class="dbg-day-header">
            <span class="dbg-day-num">Día {{ day.dayNumber }}</span>
            <code class="dbg-session-id">{{ day.session?.id }}</code>
            <span class="dbg-session-title">{{ day.session?.title }}</span>
            <span v-if="isDuplicateSession(week.weekNumber, day.dayNumber)" class="dbg-dup-badge">
              IDÉNTICA
            </span>
          </div>

          <!-- Ejercicios -->
          <table class="dbg-table" v-if="day.session">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Sets</th>
                <th>Reps / Seg</th>
                <th>Descanso</th>
                <th>Kg</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(ex, idx) in day.session.mainWorkout"
                :key="idx"
                :class="isExDuplicate(week.weekNumber, day.dayNumber, idx) ? 'dbg-row--dup' : ''"
              >
                <td><code class="dbg-ex-id">{{ ex.exerciseId }}</code><br><span class="dbg-ex-name">{{ ex.exerciseName }}</span></td>
                <td>{{ ex.sets }}</td>
                <td>{{ ex.reps != null ? ex.reps + ' reps' : ex.durationSeconds != null ? ex.durationSeconds + ' s' : '—' }}</td>
                <td>{{ ex.restSeconds }}s</td>
                <td>{{ ex.targetWeightKg ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import { usePlanStore } from '../stores/plan'

const planStore = usePlanStore()
const loading   = ref(true)
const copied    = ref(false)

onMounted(async () => {
  await planStore.loadActivePlan()
  loading.value = false
})

// Serializa los ejercicios de un día como string para comparar
function sessionFingerprint(weekNumber: number, dayNumber: number): string {
  const week = planStore.activePlan?.weeks.find(w => w.weekNumber === weekNumber)
  const day  = week?.days.find(d => d.dayNumber === dayNumber)
  if (!day?.session) return ''
  return JSON.stringify(
    day.session.mainWorkout.map(e => ({
      id:   e.exerciseId,
      sets: e.sets,
      reps: e.reps,
      dur:  e.durationSeconds,
      kg:   e.targetWeightKg,
    }))
  )
}

// ¿La sesión de esta semana/día es idéntica a la de la semana anterior?
function isDuplicateSession(weekNumber: number, dayNumber: number): boolean {
  if (weekNumber <= 1) return false
  return sessionFingerprint(weekNumber, dayNumber) === sessionFingerprint(weekNumber - 1, dayNumber)
}

// ¿El ejercicio en posición idx es idéntico al de la semana anterior?
function isExDuplicate(weekNumber: number, dayNumber: number, exIndex: number): boolean {
  if (weekNumber <= 1) return false
  const prevWeek = planStore.activePlan?.weeks.find(w => w.weekNumber === weekNumber - 1)
  const prevDay  = prevWeek?.days.find(d => d.dayNumber === dayNumber)
  const prevEx   = prevDay?.session?.mainWorkout[exIndex]
  const currWeek = planStore.activePlan?.weeks.find(w => w.weekNumber === weekNumber)
  const currDay  = currWeek?.days.find(d => d.dayNumber === dayNumber)
  const currEx   = currDay?.session?.mainWorkout[exIndex]
  if (!prevEx || !currEx) return false
  return prevEx.exerciseId  === currEx.exerciseId  &&
         prevEx.sets        === currEx.sets         &&
         prevEx.reps        === currEx.reps         &&
         prevEx.durationSeconds === currEx.durationSeconds &&
         prevEx.targetWeightKg  === currEx.targetWeightKg
}

async function copyJson() {
  if (!planStore.activePlan) return
  try {
    await navigator.clipboard.writeText(JSON.stringify(planStore.activePlan.weeks, null, 2))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback: print to console
    console.log('Plan weeks:', planStore.activePlan.weeks)
  }
}
</script>

<style scoped>
.dbg-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.dbg-back {
  display: inline-flex;
  align-items: center;
  color: var(--k-secondary);
  text-decoration: none;
  flex-shrink: 0;
}
.dbg-back .material-symbols-outlined { font-size: 22px !important; }
.dbg-header-text { flex: 1; }
.dbg-overline {
  display: block;
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-secondary);
}
.dbg-title {
  font-family: var(--k-font-headline);
  font-size: var(--k-headline-md);
  font-weight: 700;
  color: var(--k-on-surface);
  margin: 0;
}
.dbg-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
  color: var(--k-secondary);
  cursor: pointer;
  flex-shrink: 0;
}
.dbg-copy-btn:hover { background-color: var(--k-surface-highest); color: var(--k-on-surface); }

/* Meta info */
.dbg-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-bottom: 1.25rem;
  padding: 0.75rem 1rem;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
}
.dbg-meta-item {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  color: var(--k-secondary);
}
.dbg-meta-item code {
  font-size: 0.75rem;
  color: var(--k-on-surface);
  background: var(--k-surface-high);
  padding: 0.1em 0.4em;
  border-radius: 4px;
}

/* Week block */
.dbg-week {
  margin-bottom: 1.5rem;
}
.dbg-week-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.dbg-week-num {
  font-family: var(--k-font-headline);
  font-size: var(--k-title-lg);
  font-weight: 700;
  color: var(--k-on-surface);
  flex-shrink: 0;
}
.dbg-week-theme {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  color: var(--k-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Day block */
.dbg-day {
  margin-bottom: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  border-left: 3px solid transparent;
}
.dbg-day--duplicate {
  border-left-color: #f59e0b;
  background-color: rgba(245, 158, 11, 0.06);
}
.dbg-day-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}
.dbg-day-num {
  font-family: var(--k-font-headline);
  font-size: var(--k-body-md);
  font-weight: 700;
  color: var(--k-on-surface);
  flex-shrink: 0;
}
.dbg-session-id {
  font-size: 0.72rem;
  background: var(--k-surface-high);
  color: var(--k-secondary);
  padding: 0.15em 0.5em;
  border-radius: 4px;
  flex-shrink: 0;
}
.dbg-session-title {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-on-surface);
  flex: 1;
}
.dbg-dup-badge {
  font-family: var(--k-font-body);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  padding: 0.2em 0.6em;
  border-radius: 4px;
  flex-shrink: 0;
}

/* Table */
.dbg-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
}
.dbg-table th {
  text-align: left;
  font-weight: 600;
  color: var(--k-secondary);
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid var(--k-surface-high);
}
.dbg-table td {
  padding: 0.3rem 0.5rem;
  color: var(--k-on-surface);
  vertical-align: top;
}
.dbg-table tr:not(:last-child) td {
  border-bottom: 1px solid var(--k-surface-container);
}
.dbg-row--dup td {
  background: rgba(245, 158, 11, 0.08);
}
.dbg-ex-id {
  font-size: 0.7rem;
  color: var(--k-secondary);
}
.dbg-ex-name {
  font-size: var(--k-label-md);
  color: var(--k-on-surface);
}

/* Empty */
.dbg-empty {
  padding: 2rem;
  text-align: center;
  color: var(--k-secondary);
  font-family: var(--k-font-body);
}
.dbg-empty a { color: var(--k-primary-container); }
</style>
