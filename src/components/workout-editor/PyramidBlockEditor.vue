<template>
  <div class="pb">
    <!-- Variant -->
    <div class="pb-variants" role="radiogroup" aria-label="Tipo de pirámide">
      <button
        v-for="v in VARIANTS"
        :key="v"
        type="button"
        role="radio"
        :aria-checked="config.variant === v"
        :class="['pb-variant', { on: config.variant === v }]"
        @click="changeVariant(v)"
      >{{ PYRAMID_VARIANT_LABELS[v] }}</button>
    </div>

    <!-- Mode (not for drop sets) -->
    <div v-if="config.variant !== 'drop'" class="pb-row">
      <div class="pb-mode" role="group" aria-label="Tipo de serie">
        <button type="button" :class="{ on: item.mode === 'reps' }" @click="changeMode('reps')">Reps</button>
        <button type="button" :class="{ on: item.mode === 'time' }" @click="changeMode('time')">Tiempo</button>
      </div>
    </div>

    <!-- Parameters -->
    <div class="pb-params">
      <template v-if="config.variant === 'ascending' || config.variant === 'descending'">
        <div class="pb-field">
          <span class="pb-label">Series</span>
          <div class="pb-stepper">
            <button type="button" aria-label="Menos series" :disabled="config.params.setCount <= PYRAMID_MIN_SETS" @click="stepParam('setCount', -1, PYRAMID_MIN_SETS, PYRAMID_MAX_SETS)">−</button>
            <span>{{ config.params.setCount }}</span>
            <button type="button" aria-label="Más series" :disabled="config.params.setCount >= PYRAMID_MAX_SETS" @click="stepParam('setCount', 1, PYRAMID_MIN_SETS, PYRAMID_MAX_SETS)">+</button>
          </div>
        </div>
        <PointFields label="Primera" :point="config.params.first" :mode="item.mode" @change="(f, e) => onPoint('first', f, e)" />
        <PointFields label="Última" :point="config.params.last" :mode="item.mode" @change="(f, e) => onPoint('last', f, e)" />
        <div class="pb-field">
          <span class="pb-label">Descanso</span>
          <div class="pb-suffix">
            <input :value="config.params.restSeconds" class="we-input pb-num" type="number" inputmode="numeric" min="0" step="5" aria-label="Descanso en segundos" @change="onRest('restSeconds', $event)" />
            <span>s</span>
          </div>
        </div>
      </template>

      <template v-else-if="config.variant === 'triangle'">
        <div class="pb-field">
          <span class="pb-label">Subida</span>
          <div class="pb-stepper">
            <button type="button" aria-label="Menos escalones" :disabled="config.params.steps <= TRIANGLE_MIN_STEPS" @click="stepParam('steps', -1, TRIANGLE_MIN_STEPS, TRIANGLE_MAX_STEPS)">−</button>
            <span>{{ config.params.steps }}</span>
            <button type="button" aria-label="Más escalones" :disabled="config.params.steps >= TRIANGLE_MAX_STEPS" @click="stepParam('steps', 1, TRIANGLE_MIN_STEPS, TRIANGLE_MAX_STEPS)">+</button>
          </div>
          <span class="pb-hint">{{ config.params.steps * 2 - 1 }} series</span>
        </div>
        <PointFields label="Base" :point="config.params.base" :mode="item.mode" @change="(f, e) => onPoint('base', f, e)" />
        <PointFields label="Pico" :point="config.params.peak" :mode="item.mode" @change="(f, e) => onPoint('peak', f, e)" />
        <div class="pb-field">
          <span class="pb-label">Descanso</span>
          <div class="pb-suffix">
            <input :value="config.params.restSeconds" class="we-input pb-num" type="number" inputmode="numeric" min="0" step="5" aria-label="Descanso en segundos" @change="onRest('restSeconds', $event)" />
            <span>s</span>
          </div>
        </div>
      </template>

      <template v-else-if="config.variant === 'drop'">
        <div class="pb-field">
          <span class="pb-label">Peso inicial</span>
          <div class="pb-suffix">
            <input :value="config.params.startWeightKg" class="we-input pb-num" type="number" inputmode="decimal" min="0" step="2.5" aria-label="Peso inicial en kg" @change="onDropWeight($event)" />
            <span>kg</span>
          </div>
        </div>
        <div class="pb-field">
          <span class="pb-label">Bajadas</span>
          <div class="pb-stepper">
            <button type="button" aria-label="Menos bajadas" :disabled="config.params.drops <= DROP_MIN_DROPS" @click="stepParam('drops', -1, DROP_MIN_DROPS, DROP_MAX_DROPS)">−</button>
            <span>{{ config.params.drops }}</span>
            <button type="button" aria-label="Más bajadas" :disabled="config.params.drops >= DROP_MAX_DROPS" @click="stepParam('drops', 1, DROP_MIN_DROPS, DROP_MAX_DROPS)">+</button>
          </div>
        </div>
        <div class="pb-field">
          <span class="pb-label">Bajar</span>
          <div class="pb-stepper">
            <button type="button" aria-label="Bajar menos" :disabled="config.params.dropPercent <= DROP_MIN_PERCENT" @click="stepParam('dropPercent', -5, DROP_MIN_PERCENT, DROP_MAX_PERCENT)">−</button>
            <span>{{ config.params.dropPercent }}%</span>
            <button type="button" aria-label="Bajar más" :disabled="config.params.dropPercent >= DROP_MAX_PERCENT" @click="stepParam('dropPercent', 5, DROP_MIN_PERCENT, DROP_MAX_PERCENT)">+</button>
          </div>
        </div>
        <div class="pb-field">
          <span class="pb-label">Reps</span>
          <input :value="config.params.reps" class="we-input pb-num" type="number" inputmode="numeric" min="1" step="1" aria-label="Repeticiones por tramo" @change="onDropReps($event)" />
        </div>
        <div class="pb-field">
          <span class="pb-label">Descanso final</span>
          <div class="pb-suffix">
            <input :value="config.params.finalRestSeconds" class="we-input pb-num" type="number" inputmode="numeric" min="0" step="5" aria-label="Descanso final en segundos" @change="onRest('finalRestSeconds', $event)" />
            <span>s</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Set table -->
    <div class="pb-table" role="table" aria-label="Series">
      <div class="pb-tr pb-th" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">{{ item.mode === 'reps' ? 'Reps' : 'Seg' }}</span>
        <span role="columnheader">Kg</span>
        <span role="columnheader">Desc.</span>
        <span />
      </div>
      <div v-for="(set, i) in item.sets" :key="i" class="pb-tr" role="row">
        <span class="pb-idx">{{ i + 1 }}</span>
        <input
          :value="item.mode === 'reps' ? set.reps : set.durationSeconds"
          class="we-input pb-cell" type="number" inputmode="numeric" min="1"
          :aria-label="`${item.mode === 'reps' ? 'Repeticiones' : 'Segundos'} serie ${i + 1}`"
          @change="onCell(i, item.mode === 'reps' ? 'reps' : 'durationSeconds', $event)"
        />
        <input
          :value="set.weightKg" placeholder="—"
          class="we-input pb-cell" type="number" inputmode="decimal" min="0" step="0.5"
          :aria-label="`Peso serie ${i + 1}`"
          @change="onCell(i, 'weightKg', $event)"
        />
        <input
          :value="set.restSeconds" placeholder="0"
          class="we-input pb-cell" type="number" inputmode="numeric" min="0" step="5"
          :aria-label="`Descanso serie ${i + 1}`"
          @change="onCell(i, 'restSeconds', $event)"
        />
        <button type="button" class="we-icon-btn pb-del" :disabled="item.sets.length <= PYRAMID_MIN_SETS" :aria-label="`Quitar serie ${i + 1}`" @click="removeSet(i)">
          <q-icon name="close" size="14px" />
        </button>
      </div>
    </div>

    <div class="pb-actions">
      <button type="button" class="we-btn we-btn--soft pb-small" :disabled="item.sets.length >= PYRAMID_MAX_SETS" @click="addSet">
        <q-icon name="add" size="16px" /> Serie
      </button>
      <template v-if="config.manual">
        <span class="we-chip we-chip--accent">Ajustada a mano</span>
        <button type="button" class="we-btn we-btn--ghost pb-small" @click="regenerate">
          <q-icon name="refresh" size="16px" /> Regenerar
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, type PropType } from 'vue'
import { useQuasar } from 'quasar'
import type {
  TemplateBlock,
  BlockItem,
  PyramidConfig,
  PyramidVariant,
  PyramidPoint,
  ExerciseMode,
  SetSpec,
} from '../../types/workout-template'
import {
  generatePyramidSets,
  defaultPyramidConfig,
  PYRAMID_MIN_SETS,
  PYRAMID_MAX_SETS,
  TRIANGLE_MIN_STEPS,
  TRIANGLE_MAX_STEPS,
  DROP_MIN_DROPS,
  DROP_MAX_DROPS,
  DROP_MIN_PERCENT,
  DROP_MAX_PERCENT,
} from '../../workout-editor/pyramid'
import { isValidSetValue } from '../../workout-editor/validation'
import { PYRAMID_VARIANT_LABELS } from '../../workout-editor/labels'

/**
 * Editor for a pyramid block. Mutates the (reactive) block in place, like the
 * straight-set row in DayEditorPage. Sets are the source of truth; the config
 * only remembers the generator inputs and whether the sets were hand-edited.
 */
const props = defineProps({
  block: { type: Object as PropType<TemplateBlock>, required: true },
})

const VARIANTS: PyramidVariant[] = ['ascending', 'descending', 'triangle', 'drop']

const $q = useQuasar()
const item = computed<BlockItem>(() => props.block.items[0])
const config = computed<PyramidConfig>(() => props.block.pyramid!)

// ── Small sub-component: value + weight of one end of the range ──
const PointFields = defineComponent({
  props: {
    label: { type: String, required: true },
    point: { type: Object as PropType<PyramidPoint>, required: true },
    mode: { type: String as PropType<ExerciseMode>, required: true },
  },
  emits: ['change'],
  setup(p, { emit }) {
    return () => h('div', { class: 'pb-field pb-point' }, [
      h('span', { class: 'pb-label' }, p.label),
      h('div', { class: 'pb-pair' }, [
        h('div', { class: 'pb-suffix' }, [
          h('input', {
            class: 'we-input pb-num', type: 'number', inputmode: 'numeric', min: 1,
            step: p.mode === 'reps' ? 1 : 5, value: p.point.value,
            'aria-label': `${p.label}: ${p.mode === 'reps' ? 'repeticiones' : 'segundos'}`,
            onChange: (e: Event) => emit('change', 'value', e),
          }),
          h('span', p.mode === 'reps' ? 'rep' : 's'),
        ]),
        h('div', { class: 'pb-suffix' }, [
          h('input', {
            class: 'we-input pb-num', type: 'number', inputmode: 'decimal', min: 0, step: 2.5,
            value: p.point.weightKg, placeholder: '—',
            'aria-label': `${p.label}: peso en kg`,
            onChange: (e: Event) => emit('change', 'weightKg', e),
          }),
          h('span', 'kg'),
        ]),
      ]),
    ])
  },
})

// ── Helpers ─────────────────────────────────────────────────────
function writeSets(sets: SetSpec[]) {
  item.value.sets = sets
}

function regenerateFrom(next: PyramidConfig) {
  props.block.pyramid = { ...next, manual: false } as PyramidConfig
  writeSets(generatePyramidSets(item.value.mode, props.block.pyramid))
}

/** Runs `apply` (which mutates a copy of the config) and regenerates; asks first if hand-edited. */
function changeConfig(apply: (cfg: PyramidConfig) => void, onCancel?: () => void) {
  const run = () => {
    const next = JSON.parse(JSON.stringify(config.value)) as PyramidConfig
    apply(next)
    regenerateFrom(next)
  }
  if (!config.value.manual) return run()
  $q.dialog({
    title: 'Regenerar series',
    message: 'Has ajustado las series a mano. Si cambias este parámetro se volverán a generar y perderás esos cambios.',
    cancel: { label: 'Mantener mis series', flat: true },
    ok: { label: 'Regenerar', color: 'primary' },
  }).onOk(run).onCancel(() => onCancel?.())
}

function reject(input: HTMLInputElement, previous: number | undefined, message = 'El valor debe ser mayor que 0') {
  input.value = previous === undefined ? '' : String(previous)
  $q.notify({ type: 'warning', message })
}

/** Restores the input to the value currently in the config (after a cancelled confirm). */
function restore(input: HTMLInputElement, value: number | undefined) {
  input.value = value === undefined ? '' : String(value)
}

// ── Parameter handlers ─────────────────────────────────────────
type StepKey = 'setCount' | 'steps' | 'drops' | 'dropPercent'

function stepParam(key: StepKey, delta: number, min: number, max: number) {
  changeConfig(cfg => {
    const params = cfg.params as unknown as Record<StepKey, number>
    params[key] = Math.min(max, Math.max(min, params[key] + delta))
  })
}

function onPoint(which: 'first' | 'last' | 'base' | 'peak', field: 'value' | 'weightKg', event: Event) {
  const input = event.target as HTMLInputElement
  const params = config.value.params as unknown as Record<string, PyramidPoint>
  const previous = params[which][field]
  const raw = input.value.trim()

  if (field === 'weightKg' && raw === '') {
    changeConfig(cfg => {
      const p = (cfg.params as unknown as Record<string, PyramidPoint>)[which]
      delete p.weightKg
    }, () => restore(input, previous))
    return
  }
  const value = Number(raw)
  const valid = field === 'weightKg'
    ? isValidSetValue('weightKg', value)
    : isValidSetValue(item.value.mode === 'reps' ? 'reps' : 'durationSeconds', value)
  if (!valid) return reject(input, previous)
  changeConfig(cfg => {
    (cfg.params as unknown as Record<string, PyramidPoint>)[which][field] = value
  }, () => restore(input, previous))
}

function onRest(key: 'restSeconds' | 'finalRestSeconds', event: Event) {
  const input = event.target as HTMLInputElement
  const params = config.value.params as unknown as Record<string, number>
  const previous = params[key]
  const value = input.value.trim() === '' ? 0 : Number(input.value)
  if (!isValidSetValue('restSeconds', value)) return reject(input, previous, 'El descanso no puede ser negativo')
  changeConfig(cfg => { (cfg.params as unknown as Record<string, number>)[key] = value }, () => restore(input, previous))
}

function onDropWeight(event: Event) {
  const input = event.target as HTMLInputElement
  if (config.value.variant !== 'drop') return
  const previous = config.value.params.startWeightKg
  const value = Number(input.value)
  if (input.value.trim() === '' || !isValidSetValue('weightKg', value)) {
    return reject(input, previous, 'Un drop set necesita un peso inicial mayor que 0')
  }
  changeConfig(cfg => { if (cfg.variant === 'drop') cfg.params.startWeightKg = value }, () => restore(input, previous))
}

function onDropReps(event: Event) {
  const input = event.target as HTMLInputElement
  if (config.value.variant !== 'drop') return
  const previous = config.value.params.reps
  const value = Number(input.value)
  if (!isValidSetValue('reps', value)) return reject(input, previous)
  changeConfig(cfg => { if (cfg.variant === 'drop') cfg.params.reps = value }, () => restore(input, previous))
}

function changeVariant(variant: PyramidVariant) {
  if (config.value.variant === variant) return
  changeConfig(cfg => {
    const mode: ExerciseMode = variant === 'drop' ? 'reps' : item.value.mode
    if (variant === 'drop') item.value.mode = 'reps'
    Object.assign(cfg, defaultPyramidConfig(variant, mode, item.value.sets))
  })
}

function changeMode(mode: ExerciseMode) {
  if (item.value.mode === mode) return
  changeConfig(cfg => {
    item.value.mode = mode
    // Re-seed values for the new unit; keep set count, weights and rest.
    const seed = item.value.sets.map(s => {
      const next: SetSpec = { ...s }
      delete next.reps
      delete next.durationSeconds
      return next
    })
    Object.assign(cfg, defaultPyramidConfig(cfg.variant, mode, seed))
  })
}

function regenerate() {
  changeConfig(() => {})
}

// ── Manual set edits ───────────────────────────────────────────
type Field = 'reps' | 'durationSeconds' | 'weightKg' | 'restSeconds'

function markManual() {
  if (props.block.pyramid) props.block.pyramid.manual = true
}

function onCell(index: number, field: Field, event: Event) {
  const input = event.target as HTMLInputElement
  const raw = input.value.trim()
  const sets = item.value.sets
  const previous = sets[index][field]

  if (raw === '' && (field === 'weightKg' || field === 'restSeconds')) {
    const next = { ...sets[index] }
    delete next[field]
    sets.splice(index, 1, next)
    markManual()
    return
  }
  const value = Number(raw)
  if (!isValidSetValue(field, value)) {
    return reject(input, previous, field === 'restSeconds' ? 'El descanso no puede ser negativo' : 'El valor debe ser mayor que 0')
  }
  sets.splice(index, 1, { ...sets[index], [field]: value })
  markManual()
}

function addSet() {
  const sets = item.value.sets
  if (sets.length >= PYRAMID_MAX_SETS) return
  sets.push({ ...sets[sets.length - 1] })
  markManual()
}

function removeSet(index: number) {
  if (item.value.sets.length <= PYRAMID_MIN_SETS) return
  item.value.sets.splice(index, 1)
  markManual()
}
</script>

<style>
/* Not scoped: the inline PointFields sub-component renders pb-* elements too. Prefix keeps it local. */
.pb { display: flex; flex-direction: column; gap: 0.6rem; }

.pb-variants { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; background-color: var(--k-surface-highest); border-radius: var(--k-radius-sm); padding: 2px; }
.pb-variant {
  border: none; background: none; cursor: pointer; border-radius: 3px; padding: 0.35rem 0.1rem;
  font-family: var(--k-font-body); font-size: 0.68rem; font-weight: 600; color: var(--k-secondary);
}
.pb-variant.on { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }

.pb-row { display: flex; }
.pb-mode { display: flex; background-color: var(--k-surface-highest); border-radius: var(--k-radius-sm); padding: 2px; height: 24px; width: 140px; }
.pb-mode button {
  flex: 1; border: none; background: none; cursor: pointer; border-radius: 3px; padding: 0;
  font-family: var(--k-font-body); font-size: 0.62rem; font-weight: 600; text-transform: uppercase; color: var(--k-secondary);
}
.pb-mode button.on { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }

.pb-params { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
.pb-field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.pb-label {
  font-family: var(--k-font-body); font-size: 0.65rem; font-weight: 500;
  text-transform: uppercase; letter-spacing: var(--k-tracking-label); color: var(--k-secondary);
}
.pb-hint { font-family: var(--k-font-body); font-size: 0.7rem; color: var(--k-outline); }
.pb-num { padding: 0.45rem 0.3rem; text-align: center; font-family: var(--k-font-headline); font-weight: 600; min-width: 0; }
.pb-suffix { display: flex; align-items: center; gap: 0.2rem; min-width: 0; }
.pb-suffix span { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.pb-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; }
.pb-point .pb-num { width: 100%; }

.pb-stepper { display: flex; align-items: center; justify-content: space-between; background-color: var(--k-surface-highest); border-radius: var(--k-radius-md); }
.pb-stepper button { width: 30px; height: 34px; border: none; background: none; cursor: pointer; color: var(--k-on-surface); font-size: 1.1rem; }
.pb-stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
.pb-stepper span { text-align: center; font-family: var(--k-font-headline); font-weight: 700; color: var(--k-on-surface); }

.pb-table { display: flex; flex-direction: column; gap: 0.3rem; }
.pb-tr { display: grid; grid-template-columns: 1.4rem 1fr 1fr 1fr 28px; gap: 0.3rem; align-items: center; }
.pb-th span {
  font-family: var(--k-font-body); font-size: 0.62rem; font-weight: 500; text-transform: uppercase;
  letter-spacing: var(--k-tracking-label); color: var(--k-secondary); text-align: center;
}
.pb-idx { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); text-align: center; }
.pb-cell { padding: 0.4rem 0.2rem; text-align: center; font-family: var(--k-font-headline); font-weight: 600; min-width: 0; }
.pb-del { width: 28px; height: 28px; }

.pb-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.pb-small { padding: 0.45rem 0.7rem; font-size: var(--k-label-md); }
</style>
