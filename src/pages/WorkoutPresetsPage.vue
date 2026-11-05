<template>
  <PageShell :loading="loading">
    <header class="we-header">
      <button class="we-back" @click="router.push('/plan/editor')"><q-icon name="arrow_back" size="16px" /> Mis entrenamientos</button>
      <span class="we-overline">Presets</span>
      <h1 class="we-title">Para empezar</h1>
    </header>
    <p class="we-intro">Sesiones listas para usar. Duplica la que quieras y ajústala a tu gusto; el preset original no cambia. Los pesos quedan vacíos para que pongas los tuyos.</p>

    <div class="we-tabs" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.value"
        role="tab"
        :aria-selected="tab === t.value"
        :class="['we-tab', { 'we-tab--active': tab === t.value }]"
        @click="tab = t.value"
      >{{ t.label }}</button>
    </div>

    <!-- ── Day presets ─────────────────────────────────────── -->
    <template v-if="tab !== 'weeks'">
      <article v-for="p in visibleDays" :key="p.id" class="wp-card">
        <button type="button" class="wp-card-head" :aria-expanded="expanded === p.id" @click="toggle(p.id)">
          <span class="we-card-icon"><q-icon :name="p.icon ?? 'fitness_center'" size="20px" /></span>
          <span class="we-card-main">
            <span class="we-card-title">{{ p.name }}</span>
            <span class="we-card-sub">{{ p.description }}</span>
            <span class="we-chips">
              <span class="we-chip">≈ {{ estimateDayMinutes(p) }} min</span>
              <span v-for="m in p.targetMuscleGroups" :key="m" class="we-chip">{{ muscleLabel(m) }}</span>
              <span v-for="eq in missingFor(p)" :key="eq" class="we-chip we-chip--warn">Requiere {{ equipmentLabel(eq).toLowerCase() }}</span>
            </span>
          </span>
          <q-icon :name="expanded === p.id ? 'expand_less' : 'expand_more'" size="20px" class="wp-chevron" />
        </button>

        <div v-if="expanded === p.id" class="wp-preview">
          <div v-for="key in SECTIONS" :key="key">
            <template v-if="p[key].length">
              <span class="wp-section">{{ SECTION_META[key].label }}</span>
              <ul class="wp-items">
                <li v-for="b in p[key]" :key="b.id">
                  <span>{{ exerciseName(b.items[0].exerciseId) }}</span>
                  <span class="wp-presc">{{ formatPrescription(b.items[0].mode, b.items[0].sets, b.kind === 'pyramid' ? b.pyramid?.variant : undefined) }}</span>
                </li>
              </ul>
            </template>
          </div>
          <button class="we-btn we-btn--cta we-btn--block" :disabled="busy" @click="useDay(p.id)">
            <q-icon name="content_copy" size="18px" /> Duplicar y editar
          </button>
        </div>
      </article>
    </template>

    <!-- ── Week presets ────────────────────────────────────── -->
    <template v-else>
      <article v-for="w in weekPresets" :key="w.id" class="wp-card">
        <button type="button" class="wp-card-head" :aria-expanded="expanded === w.id" @click="toggle(w.id)">
          <span class="we-card-icon"><q-icon name="date_range" size="20px" /></span>
          <span class="we-card-main">
            <span class="we-card-title">{{ w.name }}</span>
            <span class="we-card-sub">{{ w.description }}</span>
            <span class="we-week-strip" aria-hidden="true">
              <span v-for="(slot, i) in w.slots" :key="i" :class="['we-week-cell', `we-week-cell--${slot.kind}`]">{{ WEEKDAYS_SHORT[i] }}</span>
            </span>
          </span>
          <q-icon :name="expanded === w.id ? 'expand_less' : 'expand_more'" size="20px" class="wp-chevron" />
        </button>

        <div v-if="expanded === w.id" class="wp-preview">
          <ul class="wp-items">
            <li v-for="(slot, i) in w.slots" :key="i">
              <span class="wp-weekday">{{ WEEKDAYS[i] }}</span>
              <span class="wp-presc">{{ slotLabel(slot) }}</span>
            </li>
          </ul>
          <div v-if="weekMissing(w).length" class="we-notice">
            <q-icon name="warning" size="18px" />
            <span>Algunas sesiones requieren {{ weekMissing(w).map(e => equipmentLabel(e).toLowerCase()).join(', ') }}, que no tienes en tu perfil.</span>
          </div>
          <p class="wp-note">Se crearán {{ dayPresetsOfWeek(w).length }} días en tu biblioteca y una semana que los usa.</p>
          <button class="we-btn we-btn--cta we-btn--block" :disabled="busy" @click="useWeek(w.id)">
            <q-icon name="content_copy" size="18px" /> Duplicar y editar
          </button>
        </div>
      </article>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useWorkoutTemplatesStore } from '../stores/workoutTemplates'
import { useExercisesStore } from '../stores/exercises'
import { useUserStore } from '../stores/user'
import type { DayPreset, WeekPreset, WeekPresetSlot, SectionKey } from '../types/workout-template'
import type { Equipment } from '../types/enums'
import { dayPresets, weekPresets, getDayPreset, missingEquipment, dayPresetsOfWeek } from '../workout-editor/presets'
import { estimateDayMinutes } from '../workout-editor/duration'
import { SECTION_META, WEEKDAYS, WEEKDAYS_SHORT, muscleLabel, equipmentLabel, formatPrescription } from '../workout-editor/labels'
import '../css/workout-editor.scss'

type Tab = 'muscle' | 'category' | 'weeks'
const TABS: { value: Tab; label: string }[] = [
  { value: 'muscle', label: 'Por músculo' },
  { value: 'category', label: 'Por categoría' },
  { value: 'weeks', label: 'Semanas' },
]
const SECTIONS: SectionKey[] = ['warmup', 'main', 'cooldown']

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const store = useWorkoutTemplatesStore()
const exercisesStore = useExercisesStore()
const userStore = useUserStore()

const loading = ref(true)
const busy = ref(false)
const tab = ref<Tab>(route.query.tab === 'weeks' ? 'weeks' : 'muscle')
const expanded = ref<string | null>(null)

onMounted(async () => {
  await Promise.all([store.ensureLoaded(), exercisesStore.loadExercises()])
  loading.value = false
})

const visibleDays = computed(() => dayPresets.filter(p => p.group === tab.value))
const userEquipment = computed<Equipment[]>(() => userStore.currentUser?.equipment ?? [])
const getExercise = (id: string) => exercisesStore.getById(id)

function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id
}

function exerciseName(id: string): string {
  return exercisesStore.getById(id)?.name ?? id
}

function missingFor(p: DayPreset): Equipment[] {
  return missingEquipment(p, userEquipment.value, getExercise)
}

function weekMissing(w: WeekPreset): Equipment[] {
  return [...new Set(dayPresetsOfWeek(w).flatMap(missingFor))]
}

function slotLabel(slot: WeekPresetSlot): string {
  if (slot.kind === 'rest') return 'Descanso'
  const name = slot.dayPresetId ? getDayPreset(slot.dayPresetId)?.name : undefined
  return slot.kind === 'training' ? (name ?? '—') : `Descanso activo${name ? ` · ${name}` : ''}`
}

async function useDay(id: string) {
  busy.value = true
  try {
    const day = await store.duplicateDayPreset(id)
    $q.notify({ type: 'positive', message: `«${day.name}» añadido a tus días` })
    await router.push(`/plan/editor/day/${day.id}`)
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo duplicar el preset' })
  } finally {
    busy.value = false
  }
}

async function useWeek(id: string) {
  busy.value = true
  try {
    const week = await store.duplicateWeekPreset(id)
    $q.notify({ type: 'positive', message: `«${week.name}» añadida a tus semanas` })
    await router.push(`/plan/editor/week/${week.id}`)
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo duplicar el preset' })
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.wp-card { background-color: var(--k-surface-container); border-radius: var(--k-radius-md); margin-bottom: 0.5rem; overflow: hidden; }
.wp-card-head {
  width: 100%; display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem 1rem;
  background: none; border: none; cursor: pointer; text-align: left; color: inherit;
}
.wp-chevron { color: var(--k-secondary); margin-top: 0.6rem; }
.wp-preview { padding: 0 1rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.wp-section {
  display: block; margin: 0.4rem 0 0.25rem; font-family: var(--k-font-body); font-size: var(--k-label-md);
  font-weight: 500; letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.wp-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.wp-items li {
  display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.35rem 0;
  border-bottom: 1px solid var(--k-surface-high);
  font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-on-surface);
}
.wp-presc { color: var(--k-secondary); white-space: nowrap; font-size: var(--k-label-md); }
.wp-weekday { font-weight: 600; }
.wp-note { margin: 0; font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
</style>
