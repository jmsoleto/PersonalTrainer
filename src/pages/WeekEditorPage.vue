<template>
  <PageShell :loading="loading">
    <div v-if="notFound" class="we-empty">
      <div class="we-empty-icon"><q-icon name="search_off" size="26px" /></div>
      Esta semana no existe.
      <button class="we-btn we-btn--soft" @click="router.push('/plan/editor?tab=weeks')">Volver</button>
    </div>

    <template v-else>
      <header class="we-header">
        <button class="we-back" @click="router.push('/plan/editor?tab=weeks')"><q-icon name="arrow_back" size="16px" /> Mis entrenamientos</button>
        <span class="we-overline">{{ isNew ? 'Nueva semana' : 'Editar semana' }}</span>
      </header>

      <input v-model="name" class="we-input we-input--name" placeholder="Nombre de la semana" aria-label="Nombre de la semana" maxlength="60" />

      <div v-if="store.days.length === 0" class="we-notice we-notice--info" style="margin-top: 0.75rem">
        <q-icon name="info" size="18px" />
        <span>Primero crea algún día de entrenamiento (o duplica un preset) para asignarlo a la semana.</span>
      </div>

      <div class="wk-summary">
        <span class="we-chip">{{ trainingCount }} días de entrenamiento</span>
        <span class="we-chip">≈ {{ weekMinutes }} min/semana</span>
        <span v-if="usedBy.length" class="we-chip">Usada en {{ usedBy.map(u => u.name).join(', ') }}</span>
      </div>

      <ul class="wk-days">
        <li v-for="(slot, i) in slots" :key="i" class="wk-day">
          <div class="wk-day-head">
            <span class="wk-day-name">{{ WEEKDAYS[i] }}</span>
            <div class="wk-kind" role="group" :aria-label="`Tipo de día para ${WEEKDAYS[i]}`">
              <button
                v-for="k in KINDS"
                :key="k.value"
                type="button"
                :class="{ on: slot.kind === k.value, [`on--${k.value}`]: slot.kind === k.value }"
                @click="setKind(i, k.value)"
              >{{ k.label }}</button>
            </div>
          </div>

          <div v-if="slot.kind !== 'rest'" class="wk-day-body">
            <select
              class="we-select"
              :value="slot.dayTemplateId ?? ''"
              :aria-label="`Día asignado a ${WEEKDAYS[i]}`"
              @change="setDay(i, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">{{ slot.kind === 'training' ? 'Elige un día…' : 'Sin sesión (descanso libre)' }}</option>
              <option v-for="d in store.days" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
            <span v-if="slot.dayTemplateId && store.getDay(slot.dayTemplateId)" class="wk-day-sub">
              {{ dayMeta(slot.dayTemplateId) }}
            </span>
            <span v-else-if="slot.kind === 'training'" class="wk-day-sub wk-day-sub--warn">Falta asignar un día</span>
          </div>
        </li>
      </ul>

      <button class="we-btn we-btn--soft we-btn--block" @click="router.push('/plan/editor/day/new')">
        <q-icon name="add" size="18px" /> Crear un día nuevo
      </button>

      <div class="we-footer">
        <button class="we-btn we-btn--ghost" @click="router.push('/plan/editor?tab=weeks')">Cancelar</button>
        <button class="we-btn we-btn--cta" :disabled="saving" @click="save"><q-icon name="check" size="18px" /> Guardar</button>
      </div>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useWorkoutTemplatesStore } from '../stores/workoutTemplates'
import type { WeekSlot } from '../types/workout-template'
import { TemplateValidationError } from '../workout-editor/validation'
import { estimateDayMinutes } from '../workout-editor/duration'
import { WEEKDAYS } from '../workout-editor/labels'
import '../css/workout-editor.scss'

type EditableSlot = { kind: WeekSlot['kind']; dayTemplateId?: string }

const KINDS: { value: WeekSlot['kind']; label: string }[] = [
  { value: 'training', label: 'Entreno' },
  { value: 'active_rest', label: 'Activo' },
  { value: 'rest', label: 'Descanso' },
]

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const store = useWorkoutTemplatesStore()

const weekId = computed(() => String(route.params.id))
const isNew = computed(() => weekId.value === 'new')
const loading = ref(true)
const notFound = ref(false)
const saving = ref(false)

const name = ref('')
const slots = ref<EditableSlot[]>(Array.from({ length: 7 }, () => ({ kind: 'rest' })))
let snapshot = ''
const serialize = () => JSON.stringify({ n: name.value, s: slots.value })

onMounted(async () => {
  await store.ensureLoaded()
  if (!isNew.value) {
    const existing = store.getWeek(weekId.value)
    if (!existing) notFound.value = true
    else {
      name.value = existing.name
      slots.value = existing.slots.map(s => ({ kind: s.kind, ...(s.kind !== 'rest' && s.dayTemplateId ? { dayTemplateId: s.dayTemplateId } : {}) }))
    }
  }
  snapshot = serialize()
  loading.value = false
})

onBeforeRouteLeave((to, _from, next) => {
  if (serialize() === snapshot || notFound.value) return next()
  $q.dialog({
    title: 'Cambios sin guardar',
    message: to.path === '/plan/editor/day/new'
      ? 'Guarda la semana antes de crear un día, o perderás los cambios. ¿Salir igualmente?'
      : '¿Salir sin guardar los cambios de esta semana?',
    cancel: { label: 'Seguir editando', flat: true },
    ok: { label: 'Salir', color: 'negative' },
  }).onOk(() => next()).onCancel(() => next(false))
})

const trainingCount = computed(() => slots.value.filter(s => s.kind === 'training').length)
const usedBy = computed(() => (isNew.value ? [] : store.usagesOfWeek(weekId.value)))
const weekMinutes = computed(() =>
  slots.value.reduce((sum, s) => {
    const d = s.dayTemplateId ? store.getDay(s.dayTemplateId) : undefined
    return sum + (d && s.kind !== 'rest' ? estimateDayMinutes(d) : 0)
  }, 0),
)

function dayMeta(id: string): string {
  const d = store.getDay(id)
  if (!d) return ''
  const n = d.main.reduce((c, b) => c + b.items.length, 0)
  return `${n} ejercicios · ≈ ${estimateDayMinutes(d)} min`
}

function setKind(i: number, kind: WeekSlot['kind']) {
  const current = slots.value[i]
  slots.value[i] = kind === 'rest' ? { kind } : { kind, ...(current.dayTemplateId ? { dayTemplateId: current.dayTemplateId } : {}) }
}

function setDay(i: number, id: string) {
  const current = slots.value[i]
  slots.value[i] = id ? { kind: current.kind, dayTemplateId: id } : { kind: current.kind }
}

function toSlots(): WeekSlot[] | null {
  const out: WeekSlot[] = []
  for (const [i, s] of slots.value.entries()) {
    if (s.kind === 'training') {
      if (!s.dayTemplateId) {
        $q.notify({ type: 'negative', message: `Asigna un día al ${WEEKDAYS[i].toLowerCase()} o márcalo como descanso` })
        return null
      }
      out.push({ kind: 'training', dayTemplateId: s.dayTemplateId })
    } else if (s.kind === 'active_rest') {
      out.push(s.dayTemplateId ? { kind: 'active_rest', dayTemplateId: s.dayTemplateId } : { kind: 'active_rest' })
    } else {
      out.push({ kind: 'rest' })
    }
  }
  return out
}

async function save() {
  const weekSlots = toSlots()
  if (!weekSlots) return
  saving.value = true
  try {
    const saved = await store.saveWeek({ name: name.value, slots: weekSlots, ...(isNew.value ? {} : { id: weekId.value }) })
    snapshot = serialize()
    $q.notify({ type: 'positive', message: 'Semana guardada' })
    if (isNew.value) await router.replace(`/plan/editor/week/${saved.id}`)
  } catch (e) {
    $q.notify({ type: 'negative', message: e instanceof TemplateValidationError ? e.issues[0].message : 'Error al guardar la semana' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.wk-summary { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.6rem 0 0.75rem; }
.wk-days { list-style: none; margin: 0 0 0.75rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.wk-day { background-color: var(--k-surface-container); border-radius: var(--k-radius-md); padding: 0.7rem 0.8rem; }
.wk-day-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.wk-day-name { font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600; color: var(--k-on-surface); }
.wk-kind { display: flex; background-color: var(--k-surface-high); border-radius: var(--k-radius-md); padding: 2px; }
.wk-kind button {
  border: none; background: none; cursor: pointer; border-radius: var(--k-radius-sm);
  padding: 0.3rem 0.55rem; font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary);
}
.wk-kind button.on--training { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }
.wk-kind button.on--active_rest { background-color: var(--k-tertiary-container); color: #fff; }
.wk-kind button.on--rest { background-color: var(--k-surface-highest); color: var(--k-on-surface); }
.wk-day-body { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.55rem; }
.wk-day-sub { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.wk-day-sub--warn { color: var(--k-urgent); }
</style>
