<template>
  <PageShell :loading="loading">
    <template v-if="notFound">
      <div class="we-empty">
        <div class="we-empty-icon"><q-icon name="search_off" size="26px" /></div>
        Este día no existe.
        <button class="we-btn we-btn--soft" @click="router.push('/plan/editor')">Volver a mis entrenamientos</button>
      </div>
    </template>

    <template v-else>
      <header class="we-header">
        <button class="we-back" @click="router.push('/plan/editor')"><q-icon name="arrow_back" size="16px" /> Mis entrenamientos</button>
        <span class="we-overline">{{ isNew ? 'Nuevo día' : 'Editar día' }}</span>
      </header>

      <input
        v-model="draft.name"
        class="we-input we-input--name"
        placeholder="Nombre del día (p. ej. Pierna A)"
        aria-label="Nombre del día"
        maxlength="60"
      />

      <div class="de-summary">
        <span class="we-chip">≈ {{ minutes }} min</span>
        <span class="we-chip">{{ mainCount }} ejercicios</span>
        <span v-if="usedBy.length" class="we-chip">Usado en {{ usedBy.map(u => u.name).join(', ') }}</span>
      </div>

      <div v-if="unavailableCount" class="we-notice">
        <q-icon name="warning" size="18px" />
        <span>{{ unavailableCount }} ejercicio(s) ya no están en el catálogo. Sustitúyelos o quítalos para poder activar planes con este día.</span>
      </div>

      <!-- ── Sections ─────────────────────────────────────────── -->
      <section v-for="key in SECTIONS" :key="key" class="de-section">
        <button
          type="button"
          class="de-section-header"
          :aria-expanded="open[key]"
          @click="open[key] = !open[key]"
        >
          <span :class="['de-section-icon', `de-section-icon--${key}`]"><q-icon :name="SECTION_META[key].icon" size="18px" /></span>
          <span class="de-section-title">
            {{ SECTION_META[key].label }}
            <span v-if="SECTION_META[key].optional" class="de-optional">opcional</span>
          </span>
          <span class="de-section-meta">{{ draft[key].length }} · ≈ {{ sectionMinutes(key) }} min</span>
          <q-icon :name="open[key] ? 'expand_less' : 'expand_more'" size="18px" class="de-section-chevron" />
        </button>

        <div v-show="open[key]" class="de-section-body">
          <div v-if="draft[key].length === 0" class="de-section-empty">
            {{ key === 'main' ? 'Añade al menos un ejercicio.' : 'Sin ' + SECTION_META[key].label.toLowerCase() + '.' }}
          </div>

          <div
            v-for="(block, bi) in draft[key]"
            :key="block.id"
            :class="['de-item', { 'de-item--missing': !exerciseOf(block) }]"
          >
            <div class="de-item-top">
              <div class="de-item-name-wrap">
                <span class="de-item-name">{{ exerciseOf(block)?.name ?? block.items[0].exerciseId }}</span>
                <span v-if="!exerciseOf(block)" class="we-chip we-chip--warn">No disponible</span>
                <span v-else class="de-item-muscle">{{ muscleLabel(exerciseOf(block)!.primaryMuscle) }}</span>
              </div>
              <div class="we-card-actions">
                <button class="we-icon-btn" :disabled="bi === 0" aria-label="Subir" @click="move(key, bi, -1)"><q-icon name="arrow_upward" size="16px" /></button>
                <button class="we-icon-btn" :disabled="bi === draft[key].length - 1" aria-label="Bajar" @click="move(key, bi, 1)"><q-icon name="arrow_downward" size="16px" /></button>
                <button class="we-icon-btn we-icon-btn--del" aria-label="Quitar" @click="remove(key, bi)"><q-icon name="close" size="16px" /></button>
              </div>
            </div>

            <div class="de-presc">
              <div class="de-field de-field--sets">
                <span class="de-field-label">Series</span>
                <div class="de-stepper">
                  <button type="button" aria-label="Menos series" :disabled="item(block).sets.length <= 1" @click="setCount(block, item(block).sets.length - 1)">−</button>
                  <span>{{ item(block).sets.length }}</span>
                  <button type="button" aria-label="Más series" :disabled="item(block).sets.length >= 20" @click="setCount(block, item(block).sets.length + 1)">+</button>
                </div>
              </div>

              <div class="de-field">
                <div class="de-mode" role="group" aria-label="Tipo de serie">
                  <button type="button" :class="{ on: item(block).mode === 'reps' }" @click="setMode(block, 'reps')">Reps</button>
                  <button type="button" :class="{ on: item(block).mode === 'time' }" @click="setMode(block, 'time')">Tiempo</button>
                </div>
                <input
                  v-if="item(block).mode === 'reps'"
                  :value="first(block).reps"
                  class="we-input de-num"
                  type="number" inputmode="numeric" min="1" step="1"
                  aria-label="Repeticiones"
                  @change="onField(block, 'reps', $event)"
                />
                <div v-else class="de-suffix">
                  <input
                    :value="first(block).durationSeconds"
                    class="we-input de-num"
                    type="number" inputmode="numeric" min="1" step="5"
                    aria-label="Segundos"
                    @change="onField(block, 'durationSeconds', $event)"
                  />
                  <span>s</span>
                </div>
              </div>

              <div class="de-field">
                <span class="de-field-label">Peso</span>
                <div class="de-suffix">
                  <input
                    :value="first(block).weightKg"
                    class="we-input de-num"
                    type="number" inputmode="decimal" min="0" step="0.5" placeholder="—"
                    aria-label="Peso en kg"
                    @change="onField(block, 'weightKg', $event)"
                  />
                  <span>kg</span>
                </div>
              </div>

              <div class="de-field">
                <span class="de-field-label">Descanso</span>
                <div class="de-suffix">
                  <input
                    :value="first(block).restSeconds"
                    class="we-input de-num"
                    type="number" inputmode="numeric" min="0" step="5" placeholder="0"
                    aria-label="Descanso en segundos"
                    @change="onField(block, 'restSeconds', $event)"
                  />
                  <span>s</span>
                </div>
              </div>
            </div>
          </div>

          <button class="we-btn we-btn--soft we-btn--block" @click="openPicker(key)">
            <q-icon name="add" size="18px" /> Añadir {{ key === 'main' ? 'ejercicio' : SECTION_META[key].label.toLowerCase() }}
          </button>
        </div>
      </section>

      <div class="we-footer">
        <button class="we-btn we-btn--ghost" @click="router.push('/plan/editor')">Cancelar</button>
        <button class="we-btn we-btn--cta" :disabled="saving" @click="save">
          <q-icon name="check" size="18px" /> Guardar
        </button>
      </div>

      <ExercisePickerDialog
        v-model="pickerOpen"
        :section="pickerSection"
        :exclude-ids="pickerSection === 'main' ? draft.main.flatMap(b => b.items.map(i => i.exerciseId)) : []"
        @select="addExercises"
      />
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import ExercisePickerDialog from '../components/workout-editor/ExercisePickerDialog.vue'
import { useExercisesStore } from '../stores/exercises'
import { useWorkoutTemplatesStore } from '../stores/workoutTemplates'
import type { DayContent, SectionKey, TemplateBlock, BlockItem, SetSpec, ExerciseMode } from '../types/workout-template'
import type { Exercise } from '../types/exercise'
import { TemplateValidationError, isValidSetValue } from '../workout-editor/validation'
import { estimateBlocksMinutes, estimateDayMinutes } from '../workout-editor/duration'
import { SECTION_META, muscleLabel } from '../workout-editor/labels'
import '../css/workout-editor.scss'

const SECTIONS: SectionKey[] = ['warmup', 'main', 'cooldown']

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const exercisesStore = useExercisesStore()
const store = useWorkoutTemplatesStore()

const dayId = computed(() => String(route.params.id))
const isNew = computed(() => dayId.value === 'new')
const loading = ref(true)
const notFound = ref(false)
const saving = ref(false)

const draft = reactive<DayContent>({ name: '', warmup: [], main: [], cooldown: [] })
const open = reactive<Record<SectionKey, boolean>>({ warmup: false, main: true, cooldown: false })
let snapshot = ''

const serialize = () => JSON.stringify(draft)
const dirty = computed(() => serialize() !== snapshot)

onMounted(async () => {
  await Promise.all([exercisesStore.loadExercises(), store.ensureLoaded()])
  if (!isNew.value) {
    const existing = store.getDay(dayId.value)
    if (!existing) {
      notFound.value = true
    } else {
      const copy = JSON.parse(JSON.stringify(existing)) as DayContent
      draft.name = copy.name
      draft.notes = copy.notes
      draft.warmup = copy.warmup
      draft.main = copy.main
      draft.cooldown = copy.cooldown
      open.warmup = copy.warmup.length > 0
      open.cooldown = copy.cooldown.length > 0
    }
  }
  snapshot = serialize()
  loading.value = false
})

onBeforeRouteLeave((_to, _from, next) => {
  if (!dirty.value || notFound.value) return next()
  $q.dialog({
    title: 'Cambios sin guardar',
    message: '¿Salir sin guardar los cambios de este día?',
    cancel: { label: 'Seguir editando', flat: true },
    ok: { label: 'Salir', color: 'negative' },
  }).onOk(() => next()).onCancel(() => next(false))
})

// ── Derived ─────────────────────────────────────────────────────
const minutes = computed(() => estimateDayMinutes(draft))
const mainCount = computed(() => draft.main.reduce((n, b) => n + b.items.length, 0))
const usedBy = computed(() => (isNew.value ? [] : store.usagesOfDay(dayId.value)))
const unavailableCount = computed(() =>
  SECTIONS.flatMap(k => draft[k]).filter(b => !exerciseOf(b)).length,
)
const sectionMinutes = (key: SectionKey) => estimateBlocksMinutes(draft[key])

function item(block: TemplateBlock): BlockItem {
  return block.items[0]
}
function first(block: TemplateBlock): SetSpec {
  return block.items[0].sets[0] ?? {}
}
function exerciseOf(block: TemplateBlock): Exercise | undefined {
  return exercisesStore.getById(block.items[0].exerciseId)
}

// ── Straight-set editing: every change applies to all sets ──────
function setCount(block: TemplateBlock, n: number) {
  const it = item(block)
  const template = { ...first(block) }
  it.sets = Array.from({ length: Math.max(1, Math.min(20, n)) }, () => ({ ...template }))
}

function setMode(block: TemplateBlock, mode: ExerciseMode) {
  const it = item(block)
  if (it.mode === mode) return
  it.mode = mode
  it.sets = it.sets.map(s => {
    const next: SetSpec = { ...s }
    if (mode === 'time') {
      delete next.reps
      next.durationSeconds = next.durationSeconds ?? 30
    } else {
      delete next.durationSeconds
      next.reps = next.reps ?? 10
    }
    return next
  })
}

type Field = 'reps' | 'durationSeconds' | 'weightKg' | 'restSeconds'

function onField(block: TemplateBlock, field: Field, event: Event) {
  const input = event.target as HTMLInputElement
  const raw = input.value.trim()
  const optional = field === 'weightKg' || field === 'restSeconds'
  const it = item(block)

  if (raw === '' && optional) {
    it.sets = it.sets.map(s => {
      const next = { ...s }
      delete next[field]
      return next
    })
    return
  }
  const value = Number(raw)
  if (!isValidSetValue(field, value)) {
    // Reject and restore the previous valid value
    const previous = first(block)[field]
    input.value = previous === undefined ? '' : String(previous)
    $q.notify({ type: 'warning', message: field === 'restSeconds' ? 'El descanso no puede ser negativo' : 'El valor debe ser mayor que 0' })
    return
  }
  it.sets = it.sets.map(s => ({ ...s, [field]: value }))
}

// ── Adding / moving / removing ─────────────────────────────────
const pickerOpen = ref(false)
const pickerSection = ref<SectionKey>('main')

function openPicker(key: SectionKey) {
  pickerSection.value = key
  pickerOpen.value = true
}

function defaultItem(exerciseId: string, section: SectionKey): BlockItem {
  const ex = exercisesStore.getById(exerciseId)
  if (section !== 'main') {
    return { exerciseId, mode: 'time', sets: [{ durationSeconds: 30 }] }
  }
  if (ex && (ex.category === 'cardio' || ex.category === 'flexibility' || ex.category === 'balance')) {
    return { exerciseId, mode: 'time', sets: Array.from({ length: 3 }, () => ({ durationSeconds: 30, restSeconds: 30 })) }
  }
  return { exerciseId, mode: 'reps', sets: Array.from({ length: 3 }, () => ({ reps: 10, restSeconds: 60 })) }
}

function addExercises(ids: string[]) {
  const key = pickerSection.value
  for (const id of ids) {
    draft[key].push({ id: crypto.randomUUID(), kind: 'straight', items: [defaultItem(id, key)] })
  }
  open[key] = true
}

function move(key: SectionKey, index: number, delta: number) {
  const list = draft[key]
  const target = index + delta
  if (target < 0 || target >= list.length) return
  const [b] = list.splice(index, 1)
  list.splice(target, 0, b)
}

function remove(key: SectionKey, index: number) {
  draft[key].splice(index, 1)
}

// ── Save ────────────────────────────────────────────────────────
async function save() {
  saving.value = true
  try {
    const saved = await store.saveDay({ ...draft, ...(isNew.value ? {} : { id: dayId.value }) })
    snapshot = serialize()
    $q.notify({ type: 'positive', message: 'Día guardado' })
    if (isNew.value) await router.replace(`/plan/editor/day/${saved.id}`)
  } catch (e) {
    if (e instanceof TemplateValidationError) {
      $q.notify({ type: 'negative', message: e.issues[0].message })
    } else {
      $q.notify({ type: 'negative', message: 'Error al guardar el día' })
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.de-summary { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.6rem 0 0.75rem; }

.de-section { background-color: var(--k-surface-container); border-radius: var(--k-radius-lg); margin-bottom: 0.75rem; overflow: hidden; }
.de-section-header {
  width: 100%; display: flex; align-items: center; gap: 0.6rem; padding: 0.85rem 1rem;
  background: none; border: none; cursor: pointer; color: var(--k-on-surface); text-align: left;
}
.de-section-icon {
  width: 32px; height: 32px; border-radius: var(--k-radius-md); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background-color: var(--k-surface-high); color: var(--k-primary-container);
}
.de-section-icon--warmup { color: #ffb74d; }
.de-section-icon--cooldown { color: var(--k-tertiary); }
.de-section-title { flex: 1; font-family: var(--k-font-headline); font-size: var(--k-body-lg); font-weight: 600; }
.de-optional {
  margin-left: 0.35rem; font-family: var(--k-font-body); font-size: 0.65rem; font-weight: 500;
  text-transform: uppercase; letter-spacing: var(--k-tracking-label); color: var(--k-outline);
}
.de-section-meta { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.de-section-chevron { color: var(--k-secondary); }
.de-section-body { padding: 0 0.75rem 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
.de-section-empty { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-outline); padding: 0.25rem 0.25rem 0.25rem; }

.de-item { background-color: var(--k-surface-high); border-radius: var(--k-radius-md); padding: 0.7rem; border: 1px solid transparent; }
.de-item--missing { border-color: var(--k-urgent); }
.de-item-top { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.6rem; }
.de-item-name-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; align-items: flex-start; }
.de-item-name { font-family: var(--k-font-body); font-size: var(--k-body-md); font-weight: 600; color: var(--k-on-surface); }
.de-item-muscle { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }

.de-presc { display: grid; grid-template-columns: auto 1fr 1fr 1fr; gap: 0.45rem; align-items: end; }
@media (max-width: 380px) { .de-presc { grid-template-columns: 1fr 1fr; } }
.de-field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.de-field-label {
  font-family: var(--k-font-body); font-size: 0.65rem; font-weight: 500;
  text-transform: uppercase; letter-spacing: var(--k-tracking-label); color: var(--k-secondary);
  line-height: 22px;
}
.de-num { padding: 0.5rem; text-align: center; font-family: var(--k-font-headline); font-weight: 600; }
.de-suffix { display: flex; align-items: center; gap: 0.25rem; }
.de-suffix span { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }

.de-stepper { display: flex; align-items: center; background-color: var(--k-surface-highest); border-radius: var(--k-radius-md); }
.de-stepper button {
  width: 30px; height: 36px; border: none; background: none; cursor: pointer;
  color: var(--k-on-surface); font-size: 1.1rem;
}
.de-stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
.de-stepper span { min-width: 1.4rem; text-align: center; font-family: var(--k-font-headline); font-weight: 700; color: var(--k-on-surface); }

.de-mode { display: flex; background-color: var(--k-surface-highest); border-radius: var(--k-radius-sm); padding: 2px; height: 22px; }
.de-mode button {
  flex: 1; border: none; background: none; cursor: pointer; border-radius: 3px; padding: 0;
  font-family: var(--k-font-body); font-size: 0.62rem; font-weight: 600; text-transform: uppercase;
  color: var(--k-secondary);
}
.de-mode button.on { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }
</style>
