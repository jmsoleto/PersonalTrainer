<template>
  <PageShell :loading="loading">
    <header class="we-header">
      <button class="we-back" @click="router.push('/plan')"><q-icon name="arrow_back" size="16px" /> Mi plan</button>
      <span class="we-overline">Editor</span>
      <h1 class="we-title">Mis entrenamientos</h1>
    </header>
    <p class="we-intro">Crea días, combínalos en semanas y monta tu propio plan. Todo se guarda solo en este dispositivo.</p>

    <div class="we-tabs" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.value"
        role="tab"
        :aria-selected="tab === t.value"
        :class="['we-tab', { 'we-tab--active': tab === t.value }]"
        @click="setTab(t.value)"
      >{{ t.label }} <span class="wl-count">{{ counts[t.value] }}</span></button>
    </div>

    <div class="we-btn-row">
      <button class="we-btn we-btn--cta" @click="createNew"><q-icon name="add" size="18px" /> {{ NEW_LABEL[tab] }}</button>
      <button class="we-btn we-btn--soft" @click="router.push(`/plan/editor/presets${tab === 'weeks' ? '?tab=weeks' : ''}`)">
        <q-icon name="auto_awesome" size="18px" /> Presets
      </button>
    </div>

    <!-- ── Days ───────────────────────────────────────────── -->
    <template v-if="tab === 'days'">
      <div v-if="store.days.length === 0" class="we-empty">
        <div class="we-empty-icon"><q-icon name="fitness_center" size="26px" /></div>
        Aún no tienes días. Crea uno o duplica un preset para empezar.
      </div>
      <div v-for="d in sortedDays" :key="d.id" class="we-card we-card--click" @click="router.push(`/plan/editor/day/${d.id}`)">
        <div class="we-card-icon"><q-icon name="fitness_center" size="20px" /></div>
        <div class="we-card-main">
          <span class="we-card-title">{{ d.name }}</span>
          <span class="we-card-sub">{{ countItems(d.main) }} ejercicios · ≈ {{ estimateDayMinutes(d) }} min</span>
          <div class="we-chips">
            <span v-if="d.warmup.length" class="we-chip">Calentamiento</span>
            <span v-if="d.cooldown.length" class="we-chip">Estiramientos</span>
            <span v-for="m in dayMuscles(d)" :key="m" class="we-chip">{{ muscleLabel(m) }}</span>
          </div>
        </div>
        <div class="we-card-actions" @click.stop>
          <button class="we-icon-btn" aria-label="Duplicar" @click="duplicate('day', d.id)"><q-icon name="content_copy" size="15px" /></button>
          <button class="we-icon-btn we-icon-btn--del" aria-label="Eliminar" @click="confirmDelete('day', d.id, d.name)"><q-icon name="delete" size="16px" /></button>
        </div>
      </div>
    </template>

    <!-- ── Weeks ──────────────────────────────────────────── -->
    <template v-else-if="tab === 'weeks'">
      <div v-if="store.weeks.length === 0" class="we-empty">
        <div class="we-empty-icon"><q-icon name="date_range" size="26px" /></div>
        Aún no tienes semanas. Combina tus días o duplica un preset de semana.
      </div>
      <div v-for="w in sortedWeeks" :key="w.id" class="we-card we-card--click" @click="router.push(`/plan/editor/week/${w.id}`)">
        <div class="we-card-icon"><q-icon name="date_range" size="20px" /></div>
        <div class="we-card-main">
          <span class="we-card-title">{{ w.name }}</span>
          <span class="we-card-sub">{{ w.slots.filter(s => s.kind === 'training').length }} días de entrenamiento</span>
          <div class="we-week-strip" aria-hidden="true">
            <span v-for="(slot, i) in w.slots" :key="i" :class="['we-week-cell', `we-week-cell--${slot.kind}`]">{{ WEEKDAYS_SHORT[i] }}</span>
          </div>
        </div>
        <div class="we-card-actions" @click.stop>
          <button class="we-icon-btn" aria-label="Duplicar" @click="duplicate('week', w.id)"><q-icon name="content_copy" size="15px" /></button>
          <button class="we-icon-btn we-icon-btn--del" aria-label="Eliminar" @click="confirmDelete('week', w.id, w.name)"><q-icon name="delete" size="16px" /></button>
        </div>
      </div>
    </template>

    <!-- ── Plans ──────────────────────────────────────────── -->
    <template v-else>
      <div v-if="store.plans.length === 0" class="we-empty">
        <div class="we-empty-icon"><q-icon name="calendar_month" size="26px" /></div>
        Aún no tienes planes. Ordena tus semanas en un plan y actívalo.
      </div>
      <div v-for="p in sortedPlans" :key="p.id" class="we-card we-card--click" @click="router.push(`/plan/editor/plan/${p.id}`)">
        <div class="we-card-icon"><q-icon name="calendar_month" size="20px" /></div>
        <div class="we-card-main">
          <span class="we-card-title">{{ p.name }}</span>
          <span class="we-card-sub">{{ p.weekTemplateIds.length }} semanas</span>
          <div class="we-chips">
            <span v-if="planStore.activePlan?.planTemplateId === p.id" class="we-chip we-chip--accent">Activo</span>
          </div>
        </div>
        <div class="we-card-actions" @click.stop>
          <button class="we-icon-btn" aria-label="Duplicar" @click="duplicate('plan', p.id)"><q-icon name="content_copy" size="15px" /></button>
          <button class="we-icon-btn we-icon-btn--del" aria-label="Eliminar" @click="confirmDelete('plan', p.id, p.name)"><q-icon name="delete" size="16px" /></button>
        </div>
      </div>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useWorkoutTemplatesStore, type DeleteResult } from '../stores/workoutTemplates'
import { useExercisesStore } from '../stores/exercises'
import { usePlanStore } from '../stores/plan'
import type { DayTemplate, TemplateBlock } from '../types/workout-template'
import type { MuscleGroup } from '../types/enums'
import { estimateDayMinutes } from '../workout-editor/duration'
import { muscleLabel, WEEKDAYS_SHORT } from '../workout-editor/labels'
import '../css/workout-editor.scss'

type Tab = 'days' | 'weeks' | 'plans'
type Kind = 'day' | 'week' | 'plan'

const TABS: { value: Tab; label: string }[] = [
  { value: 'days', label: 'Días' },
  { value: 'weeks', label: 'Semanas' },
  { value: 'plans', label: 'Planes' },
]
const NEW_LABEL: Record<Tab, string> = { days: 'Nuevo día', weeks: 'Nueva semana', plans: 'Nuevo plan' }
const KIND_OF_TAB: Record<Tab, Kind> = { days: 'day', weeks: 'week', plans: 'plan' }

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const store = useWorkoutTemplatesStore()
const exercisesStore = useExercisesStore()
const planStore = usePlanStore()

const loading = ref(true)
const tab = ref<Tab>((['days', 'weeks', 'plans'] as Tab[]).includes(route.query.tab as Tab) ? (route.query.tab as Tab) : 'days')

onMounted(async () => {
  await Promise.all([store.ensureLoaded(), exercisesStore.loadExercises(), planStore.loadActivePlan()])
  loading.value = false
})

function setTab(t: Tab) {
  tab.value = t
  router.replace({ query: t === 'days' ? {} : { tab: t } })
}

const byUpdated = <T extends { updatedAt: string }>(list: T[]) => [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
const sortedDays = computed(() => byUpdated(store.days))
const sortedWeeks = computed(() => byUpdated(store.weeks))
const sortedPlans = computed(() => byUpdated(store.plans))
const counts = computed(() => ({ days: store.days.length, weeks: store.weeks.length, plans: store.plans.length }))

const countItems = (blocks: TemplateBlock[]) => blocks.reduce((n, b) => n + b.items.length, 0)

function dayMuscles(d: DayTemplate): MuscleGroup[] {
  const set = new Set<MuscleGroup>()
  for (const b of d.main) for (const i of b.items) {
    const ex = exercisesStore.getById(i.exerciseId)
    if (ex) set.add(ex.primaryMuscle)
  }
  return [...set].slice(0, 4)
}

function createNew() {
  router.push(`/plan/editor/${KIND_OF_TAB[tab.value]}/new`)
}

async function duplicate(kind: Kind, id: string) {
  try {
    if (kind === 'day') await store.duplicateDay(id)
    else if (kind === 'week') await store.duplicateWeek(id)
    else await store.duplicatePlan(id)
    $q.notify({ type: 'positive', message: 'Copia creada' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo duplicar' })
  }
}

const KIND_LABEL: Record<Kind, string> = { day: 'día', week: 'semana', plan: 'plan' }

function confirmDelete(kind: Kind, id: string, name: string) {
  const usedBy = kind === 'day' ? store.usagesOfDay(id) : kind === 'week' ? store.usagesOfWeek(id) : []
  if (usedBy.length > 0) {
    const where = kind === 'day' ? 'las semanas' : 'los planes'
    $q.dialog({
      title: 'No se puede eliminar',
      message: `«${name}» se usa en ${where}: ${usedBy.map(u => `«${u.name}»`).join(', ')}. Quítalo de ahí antes de eliminarlo.`,
      ok: { label: 'Entendido', flat: true },
    })
    return
  }
  $q.dialog({
    title: `Eliminar ${KIND_LABEL[kind]}`,
    message: kind === 'plan'
      ? `¿Eliminar «${name}»? Si ya lo activaste, tu plan en curso no se verá afectado.`
      : `¿Eliminar «${name}»? Esta acción no se puede deshacer.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
  }).onOk(async () => {
    let result: DeleteResult
    if (kind === 'day') result = await store.deleteDay(id)
    else if (kind === 'week') result = await store.deleteWeek(id)
    else result = await store.deletePlan(id)
    $q.notify(result.deleted
      ? { type: 'positive', message: 'Eliminado' }
      : { type: 'negative', message: 'Está en uso y no se puede eliminar' })
  })
}
</script>

<style scoped>
.wl-count {
  display: inline-block; min-width: 1.2rem; margin-left: 0.2rem; padding: 0 0.3rem; border-radius: 999px;
  background-color: var(--k-surface-high); font-size: 0.7rem; color: var(--k-secondary);
}
</style>
