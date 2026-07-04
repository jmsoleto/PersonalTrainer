<template>
  <PageShell :loading="store.loading">

    <!-- ── Header ────────────────────────────────────────────────── -->
    <header class="ch-header">
      <span class="ch-overline">Objetivos</span>
      <h1 class="ch-title">Retos</h1>
    </header>

    <!-- ── Registrar actividad ───────────────────────────────────── -->
    <router-link to="/activity" class="ch-log-btn">
      <q-icon name="add" size="18px" />
      Registrar día de ejercicio
    </router-link>
    <p class="ch-log-hint">
      Suma un día de senderismo, bici, natación o carrera y contará para tus retos.
    </p>

    <!-- ── Activos ───────────────────────────────────────────────── -->
    <template v-if="activeProgress.length > 0">
      <span class="ch-section-label">En curso</span>
      <div v-for="p in activeProgress" :key="p.accepted.id" class="ch-active-card">
        <div class="ch-active-top">
          <div class="ch-active-icon"><q-icon :name="p.def.icon" size="20px" /></div>
          <div class="ch-active-info">
            <span class="ch-active-name">{{ p.def.name }}</span>
            <span class="ch-active-remaining">{{ remainingLabel(p.accepted.windowEnd) }}</span>
          </div>
          <button class="ch-abandon-btn" title="Abandonar reto" @click="confirmAbandon(p.accepted.id!)">
            <q-icon name="close" size="16px" />
          </button>
        </div>
        <div class="ch-progress-bar">
          <div class="ch-progress-fill" :style="{ width: `${Math.round(p.ratio * 100)}%` }" />
        </div>
        <div class="ch-progress-legend">
          <span class="ch-progress-value">{{ formatNum(p.current) }} / {{ formatNum(p.target) }} {{ p.def.unit ?? '' }}</span>
          <span class="ch-progress-pct">{{ Math.round(p.ratio * 100) }}%</span>
        </div>
      </div>
    </template>

    <!-- ── Catálogo ──────────────────────────────────────────────── -->
    <span class="ch-section-label">Catálogo</span>
    <div v-for="def in store.definitions" :key="def.id" class="ch-cat-card">
      <div class="ch-cat-icon"><q-icon :name="def.icon" size="22px" /></div>
      <div class="ch-cat-main">
        <span class="ch-cat-name">{{ def.name }}</span>
        <p class="ch-cat-desc">{{ def.description }}</p>
        <div class="ch-cat-meta">
          <span class="ch-cat-pill">{{ formatNum(def.target) }} {{ def.unit ?? '' }}</span>
          <span class="ch-cat-pill">{{ windowLabel(def.window) }}</span>
        </div>
      </div>
      <button
        v-if="store.isActive(def.id)"
        class="ch-accept-btn ch-accept-btn--done"
        disabled
      >
        <q-icon name="check" size="16px" /> Activo
      </button>
      <button v-else class="ch-accept-btn" @click="openAccept(def.id)">
        Aceptar
      </button>
    </div>

    <!-- ── Historial ─────────────────────────────────────────────── -->
    <template v-if="store.history.length > 0">
      <span class="ch-section-label">Historial</span>
      <div v-for="h in store.history" :key="h.id" class="ch-hist-card">
        <q-icon :name="statusMeta(h.status).icon" size="18px" :class="`ch-hist-icon ch-hist-icon--${h.status}`" />
        <span class="ch-hist-name">{{ store.getDefinition(h.challengeId)?.name ?? h.challengeId }}</span>
        <span :class="`ch-hist-status ch-hist-status--${h.status}`">{{ statusMeta(h.status).label }}</span>
      </div>
    </template>

    <!-- ── Accept dialog (baseline) ──────────────────────────────── -->
    <q-dialog v-model="showAccept" persistent>
      <div class="ch-dialog">
        <div class="ch-dialog-header">
          <span class="ch-dialog-title">Aceptar reto</span>
          <button class="ch-icon-btn" @click="showAccept = false"><q-icon name="close" size="18px" /></button>
        </div>
        <div class="ch-dialog-body">
          <p class="ch-dialog-name">{{ pendingDef?.name }}</p>
          <p class="ch-dialog-desc">{{ pendingDef?.description }}</p>

          <div v-if="pendingDef?.allowsBaseline" class="ch-field">
            <label class="ch-field-label">Punto de partida (opcional)</label>
            <input v-model.number="baseline" type="number" min="0" class="ch-input" placeholder="0" />
            <span class="ch-field-hint">
              Si ya llevas parte del reto hecho, indícalo aquí (p. ej. días ya entrenados este año).
            </span>
          </div>
        </div>
        <div class="ch-dialog-footer">
          <button class="ch-btn ch-btn--ghost" @click="showAccept = false">Cancelar</button>
          <button class="ch-btn ch-btn--cta" @click="doAccept">Empezar reto</button>
        </div>
      </div>
    </q-dialog>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useChallengesStore } from '../stores/challenges'
import { useAchievementsStore } from '../stores/achievements'
import { checkChallenges, getActiveProgress, type ChallengeProgress } from '../composables/useChallengeChecker'
import { checkAchievements } from '../composables/useAchievementChecker'
import type { ChallengeStatus, ChallengeWindow } from '../types/challenge'

const $q = useQuasar()
const store = useChallengesStore()
const achievementsStore = useAchievementsStore()

const activeProgress = ref<ChallengeProgress[]>([])

const showAccept = ref(false)
const pendingId = ref<string | null>(null)
const baseline = ref<number | undefined>(undefined)

const pendingDef = ref<ReturnType<typeof store.getDefinition>>(undefined)

/** Resolve challenges then any challenge-derived achievements, notifying both. */
async function resolveRewards(notifyChallenges: boolean) {
  const completed = await checkChallenges()
  if (notifyChallenges) {
    for (const c of completed) {
      const def = store.getDefinition(c.challengeId)
      if (def) $q.notify({ type: 'positive', icon: def.icon, message: `Reto completado: ${def.name}`, caption: def.description, timeout: 4000 })
    }
  }
  if (completed.length > 0) {
    await achievementsStore.loadUnlocked()
    const unlocked = await checkAchievements()
    for (const a of unlocked) {
      const def = achievementsStore.getDefinition(a.achievementId)
      if (def) $q.notify({ type: 'positive', icon: def.icon, message: `Logro desbloqueado: ${def.name}`, caption: def.description, timeout: 4000 })
    }
  }
}

async function refresh() {
  await store.loadAccepted()
  await resolveRewards(false)   // resolve silent completions/deadlines quietly on mount
  activeProgress.value = await getActiveProgress()
}

function openAccept(id: string) {
  pendingId.value = id
  pendingDef.value = store.getDefinition(id)
  baseline.value = undefined
  showAccept.value = true
}

async function doAccept() {
  if (!pendingId.value) return
  await store.accept(pendingId.value, baseline.value ?? 0)
  showAccept.value = false
  $q.notify({ type: 'positive', message: 'Reto aceptado' })
  await resolveRewards(true)    // a baseline may already complete the challenge
  activeProgress.value = await getActiveProgress()
}

function confirmAbandon(id: number) {
  $q.dialog({
    title: 'Abandonar reto',
    message: '¿Seguro que quieres abandonar este reto? Perderás su progreso.',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Abandonar', color: 'negative' },
  }).onOk(async () => {
    await store.abandon(id)
    activeProgress.value = await getActiveProgress()
    $q.notify({ type: 'positive', message: 'Reto abandonado' })
  })
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function windowLabel(w: ChallengeWindow): string {
  switch (w.type) {
    case 'calendar_year': return 'Año natural'
    case 'calendar_month': return 'Este mes'
    case 'rolling_days': return `${w.lengthDays} días`
    case 'fixed_from_accept': return `${w.lengthDays} días`
  }
}

function remainingLabel(windowEnd: string): string {
  const end = new Date(windowEnd + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const days = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Finalizado'
  if (days === 0) return 'Último día'
  if (days === 1) return 'Queda 1 día'
  return `Quedan ${days} días`
}

function statusMeta(status: ChallengeStatus): { label: string; icon: string } {
  switch (status) {
    case 'completed': return { label: 'Completado', icon: 'emoji_events' }
    case 'failed':    return { label: 'No superado', icon: 'cancel' }
    case 'abandoned': return { label: 'Abandonado', icon: 'remove_circle_outline' }
    default:          return { label: 'Activo', icon: 'bolt' }
  }
}

onMounted(refresh)
</script>

<style scoped>
.ch-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
.ch-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.ch-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}
.ch-section-label {
  display: block; font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
  margin: 1.25rem 0 0.5rem;
}

/* Registrar actividad */
.ch-log-btn {
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  width: 100%; padding: 0.8rem 1rem; border-radius: var(--k-radius-md);
  background: var(--k-gradient-cta); color: var(--k-on-primary-container); text-decoration: none;
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); transition: opacity 0.15s ease;
}
.ch-log-btn:hover { opacity: 0.9; }
.ch-log-hint {
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary);
  margin: 0.5rem 0 0; text-align: center; line-height: 1.4;
}

/* Active cards */
.ch-active-card {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 1rem; margin-bottom: 0.625rem; display: flex; flex-direction: column; gap: 0.75rem;
}
.ch-active-top { display: flex; align-items: center; gap: 0.75rem; }
.ch-active-icon {
  width: 40px; height: 40px; flex-shrink: 0; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); color: var(--k-primary-container);
  display: flex; align-items: center; justify-content: center;
}
.ch-active-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.ch-active-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-lg); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.ch-active-remaining { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.ch-abandon-btn {
  width: 30px; height: 30px; flex-shrink: 0; border-radius: var(--k-radius-sm);
  background-color: var(--k-surface-high); border: none; cursor: pointer; color: var(--k-secondary);
  display: flex; align-items: center; justify-content: center;
}
.ch-progress-bar { height: 8px; border-radius: 4px; background-color: var(--k-surface-high); overflow: hidden; }
.ch-progress-fill { height: 100%; border-radius: 4px; background: var(--k-gradient-cta); transition: width 0.3s ease; }
.ch-progress-legend { display: flex; align-items: baseline; justify-content: space-between; }
.ch-progress-value {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600; color: var(--k-on-surface);
}
.ch-progress-pct { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-primary-container); }

/* Catalog cards */
.ch-cat-card {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 0.875rem 1rem; margin-bottom: 0.5rem; display: flex; align-items: flex-start; gap: 0.75rem;
}
.ch-cat-icon {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); color: var(--k-primary-container);
  display: flex; align-items: center; justify-content: center;
}
.ch-cat-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.ch-cat-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.ch-cat-desc { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); margin: 0; line-height: 1.45; }
.ch-cat-meta { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.15rem; }
.ch-cat-pill {
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-on-surface-variant);
  background-color: var(--k-surface-highest); border-radius: var(--k-radius-sm); padding: 0.2rem 0.5rem;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase;
}
.ch-accept-btn {
  flex-shrink: 0; align-self: center; padding: 0.5rem 0.9rem; border: none; border-radius: var(--k-radius-md);
  background: var(--k-gradient-cta); color: var(--k-on-primary-container); cursor: pointer;
  font-family: var(--k-font-headline); font-size: var(--k-label-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
}
.ch-accept-btn--done {
  background: var(--k-surface-highest); color: var(--k-secondary); cursor: default;
  display: inline-flex; align-items: center; gap: 0.25rem;
}

/* History */
.ch-hist-card {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 0.75rem 1rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.625rem;
}
.ch-hist-icon--completed { color: #ffd166; }
.ch-hist-icon--failed { color: rgba(255,86,44,0.8); }
.ch-hist-icon--abandoned { color: var(--k-outline); }
.ch-hist-name {
  flex: 1; min-width: 0; font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ch-hist-status { font-family: var(--k-font-body); font-size: var(--k-label-md); }
.ch-hist-status--completed { color: #ffd166; }
.ch-hist-status--failed { color: rgba(255,86,44,0.8); }
.ch-hist-status--abandoned { color: var(--k-outline); }

/* Dialog */
.ch-dialog {
  width: min(420px, calc(100vw - 2rem));
  background-color: var(--k-surface-low); border-radius: var(--k-radius-lg);
  display: flex; flex-direction: column; max-height: 85vh;
}
.ch-dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1rem 0.75rem; }
.ch-dialog-title {
  font-family: var(--k-font-headline); font-size: var(--k-title-lg); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.ch-dialog-body { padding: 0 1rem 0.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
.ch-dialog-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-lg); font-weight: 600; color: var(--k-on-surface); margin: 0;
}
.ch-dialog-desc { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); margin: 0; line-height: 1.5; }
.ch-dialog-footer {
  display: flex; gap: 0.625rem; padding: 0.875rem 1rem 1rem; border-top: 1px solid var(--k-surface-highest);
}
.ch-field { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.25rem; }
.ch-field-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
}
.ch-field-hint { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-outline); line-height: 1.4; }
.ch-input {
  width: 100%; padding: 0.625rem 0.75rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-on-surface);
  font-family: var(--k-font-body); font-size: var(--k-body-md); outline: none; box-sizing: border-box;
}
.ch-input:focus { background-color: var(--k-surface-bright); box-shadow: 0 0 0 1px rgba(255,86,44,0.4); }
.ch-icon-btn {
  width: 30px; height: 30px; border-radius: var(--k-radius-sm); background-color: var(--k-surface-high);
  border: none; cursor: pointer; color: var(--k-secondary); display: flex; align-items: center; justify-content: center;
}
.ch-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; flex: 1;
  padding: 0.75rem 1rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer; transition: opacity 0.15s ease;
}
.ch-btn--cta { background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
.ch-btn--ghost { background-color: transparent; color: var(--k-secondary); border: 1px solid var(--k-ghost-border); }
</style>
