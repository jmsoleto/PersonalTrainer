<template>
  <PageShell :loading="loading">

    <!-- ── Estado vacío ───────────────────────────────────────── -->
    <div v-if="!planStore.activePlan" class="po-empty">
      <span class="po-empty-watermark">—</span>
      <div class="po-empty-icon-wrap">
        <span class="material-symbols-outlined po-empty-icon">calendar_month</span>
      </div>
      <h2 class="po-empty-title">Sin plan activo</h2>
      <p class="po-empty-desc">Genera o importa un plan desde el dashboard para empezar.</p>
      <router-link to="/dashboard" class="po-btn po-btn--cta">
        <span class="material-symbols-outlined" style="font-size:18px">arrow_back</span>
        Ir al dashboard
      </router-link>
    </div>

    <!-- ── Plan activo ────────────────────────────────────────── -->
    <template v-else>

      <!-- ── Héroe ─────────────────────────────────────────────── -->
      <header class="po-hero">
        <span class="po-hero-overline">Tu ruta crítica</span>
        <h1 class="po-hero-title">{{ planStore.activePlan.name }}</h1>
        <p class="po-hero-sub">
          {{ planStore.activePlan.weeks.length }} semanas · Semana {{ currentWeek }} en curso
        </p>
      </header>

      <!-- ── Fases + semanas ────────────────────────────────────── -->
      <div class="po-phases">
        <template v-for="(phase, pi) in phases" :key="pi">

          <!-- Separador entre fases (no antes de la primera) -->
          <div v-if="pi > 0" class="po-phase-sep">
            <span class="po-phase-line" />
            <span class="po-phase-label">Fase: {{ phase.phaseName }}</span>
            <span class="po-phase-line" />
          </div>

          <!-- Lista de semanas -->
          <ul class="po-list">
            <li
              v-for="week in phase.weeks"
              :key="week.weekNumber"
              :class="['po-week', weekStateClass(week.weekNumber)]"
              @click="$router.push(`/plan/week/${week.weekNumber}`)"
            >
              <!-- Cuerpo izquierdo -->
              <div class="po-week-body">
                <!-- Fase + badge ACTUAL -->
                <div class="po-week-top">
                  <span
                    v-if="week.weekNumber === currentWeek"
                    class="po-actual-badge"
                  >Actual</span>
                  <span class="po-week-phase-name">{{ phase.phaseName }}</span>
                </div>
                <!-- Título de semana -->
                <span class="po-week-title">Semana {{ week.weekNumber }}</span>
                <!-- Días -->
                <span class="po-week-days">
                  {{ week.days.filter(d => d.dayType === 'training').length }} días de entrenamiento
                </span>
              </div>

              <!-- Acción derecha -->
              <div class="po-week-action">
                <button
                  v-if="week.weekNumber === currentWeek"
                  class="po-play-btn"
                  @click.stop="$router.push(`/plan/week/${week.weekNumber}`)"
                >
                  <span class="material-symbols-outlined">play_arrow</span>
                </button>
                <span
                  v-else
                  class="material-symbols-outlined po-chevron"
                >chevron_right</span>
              </div>
            </li>
          </ul>

        </template>
      </div>

      <!-- Enlace de depuración -->
      <div class="po-debug-link">
        <router-link to="/plan/debug" class="po-debug-btn">
          <span class="material-symbols-outlined" style="font-size:16px">bug_report</span>
          Debug estructura del plan
        </router-link>
      </div>

    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import { usePlanStore } from '../stores/plan'
import type { Week } from '../types/plan'

const planStore = usePlanStore()
const loading   = ref(true)

const currentWeek = computed(() => planStore.getCurrentWeekNumber())

// ── Extrae el nombre limpio de la fase del campo theme ───────────
// Formato AI:       "Adaptación — objetivo largo..."
// Formato importado: "Fase 1: Adaptación"
function getPhaseName(theme: string): string {
  if (theme.includes(' — ')) {
    return theme.split(' — ')[0].trim()
  }
  const colonIdx = theme.indexOf(': ')
  if (colonIdx !== -1) {
    return theme.substring(colonIdx + 2).trim()
  }
  return theme.trim()
}

interface PhaseGroup {
  phaseNum: number
  phaseName: string
  weeks: Week[]
}

const phases = computed<PhaseGroup[]>(() => {
  if (!planStore.activePlan) return []
  const groups: PhaseGroup[] = []
  let lastTheme = ''

  for (const week of planStore.activePlan.weeks) {
    const theme = week.theme ?? ''
    if (theme !== lastTheme) {
      groups.push({
        phaseNum: groups.length + 1,
        phaseName: getPhaseName(theme),
        weeks: [],
      })
      lastTheme = theme
    }
    groups[groups.length - 1].weeks.push(week)
  }
  return groups
})

function weekStateClass(weekNumber: number): string {
  if (weekNumber === currentWeek.value) return 'po-week--current'
  if (weekNumber < currentWeek.value)  return 'po-week--done'
  return ''
}

onMounted(async () => {
  await planStore.loadActivePlan()
  loading.value = false
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   ESTADO VACÍO
══════════════════════════════════════════════════════════════ */
.po-empty {
  position: relative; overflow: hidden; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-low); padding: 2rem 1.5rem 1.75rem;
  margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem;
}
.po-empty-watermark {
  position: absolute; top: -1.5rem; right: 0.75rem;
  font-family: var(--k-font-headline); font-size: 8rem; font-weight: 700;
  color: var(--k-on-surface); opacity: 0.04; line-height: 1;
  pointer-events: none; user-select: none;
}
.po-empty-icon-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
}
.po-empty-icon { color: var(--k-secondary); font-size: 28px !important; }
.po-empty-title {
  font-family: var(--k-font-headline); font-size: var(--k-headline-md); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0;
}
.po-empty-desc {
  font-family: var(--k-font-body); font-size: var(--k-body-md);
  color: var(--k-secondary); margin: 0; line-height: 1.6;
}

/* ══════════════════════════════════════════════════════════════
   HÉROE
══════════════════════════════════════════════════════════════ */
.po-hero {
  margin-bottom: 1.75rem;
}
.po-hero-overline {
  display: block;
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 600;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase;
  color: var(--k-primary-container); margin-bottom: 0.25rem;
}
.po-hero-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; letter-spacing: var(--k-tracking-headline);
  text-transform: uppercase; color: var(--k-on-surface);
  margin: 0 0 0.4rem; line-height: 1.05;
}
.po-hero-sub {
  font-family: var(--k-font-body); font-size: var(--k-body-md);
  color: var(--k-secondary); margin: 0;
}

/* ══════════════════════════════════════════════════════════════
   SEPARADOR DE FASE
══════════════════════════════════════════════════════════════ */
.po-phase-sep {
  display: flex; align-items: center; gap: 0.75rem;
  margin: 1rem 0 0.5rem;
}
.po-phase-line {
  flex: 1; height: 1px; background-color: var(--k-surface-high);
}
.po-phase-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase;
  color: var(--k-secondary); white-space: nowrap;
}

/* ══════════════════════════════════════════════════════════════
   LISTA DE SEMANAS
══════════════════════════════════════════════════════════════ */
.po-phases { display: flex; flex-direction: column; }

.po-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.375rem;
}

/* ── Card de semana ─────────────────────────────────────────── */
.po-week {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding: 0.875rem 1rem;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  cursor: pointer; transition: background-color 0.15s ease;
  border-left: 3px solid transparent;
}
.po-week:hover { background-color: var(--k-surface-high); }

.po-week--done { opacity: 0.42; }

.po-week--current {
  border-left-color: var(--k-primary-container);
  background-color: rgba(255, 86, 44, 0.07);
}
.po-week--current:hover { background-color: rgba(255, 86, 44, 0.12); }

/* ── Cuerpo izquierdo ───────────────────────────────────────── */
.po-week-body {
  display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 0;
}

/* Fila superior: badge + nombre de fase */
.po-week-top {
  display: flex; align-items: center; gap: 0.4rem;
}
.po-actual-badge {
  font-family: var(--k-font-headline); font-size: 0.625rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  background-color: var(--k-primary-container); color: var(--k-on-primary-container);
  padding: 0.1rem 0.4rem; border-radius: var(--k-radius-sm);
  line-height: 1.6; flex-shrink: 0;
}
.po-week-phase-name {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase;
  color: var(--k-primary-container);
}

/* Título de semana — protagonista */
.po-week-title {
  font-family: var(--k-font-headline); font-size: 1.5rem; font-weight: 700;
  letter-spacing: var(--k-tracking-headline); text-transform: uppercase;
  color: var(--k-on-surface); line-height: 1.1;
}
.po-week--done .po-week-title { color: var(--k-secondary); }

/* Días de entrenamiento */
.po-week-days {
  font-family: var(--k-font-body); font-size: var(--k-body-md);
  color: var(--k-secondary);
}

/* ── Acción derecha ─────────────────────────────────────────── */
.po-week-action {
  flex-shrink: 0; display: flex; align-items: center;
}

/* Botón play (semana actual) */
.po-play-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px;
  background: var(--k-gradient-cta); border: none; border-radius: var(--k-radius-md);
  cursor: pointer; transition: opacity 0.15s ease;
}
.po-play-btn:hover { opacity: 0.85; }
.po-play-btn .material-symbols-outlined {
  color: var(--k-on-primary-container);
  font-size: 24px !important;
  font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}

/* Chevron (otras semanas) */
.po-chevron {
  color: var(--k-secondary); font-size: 20px !important;
}

/* ══════════════════════════════════════════════════════════════
   BOTÓN CTA (empty state)
══════════════════════════════════════════════════════════════ */
.po-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.8rem 1.25rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer;
  text-decoration: none; transition: opacity 0.15s ease; align-self: flex-start;
}
.po-btn--cta { background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
.po-btn--cta:hover { opacity: 0.9; }

/* ══════════════════════════════════════════════════════════════
   DEBUG LINK
══════════════════════════════════════════════════════════════ */
.po-debug-link {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}
.po-debug-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: var(--k-radius-md);
  background-color: transparent;
  color: var(--k-secondary);
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  text-decoration: none;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}
.po-debug-btn:hover { opacity: 1; }
</style>
