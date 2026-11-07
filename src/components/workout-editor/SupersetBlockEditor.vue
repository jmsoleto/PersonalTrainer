<template>
  <div class="ss">
    <template v-for="(it, index) in block.items" :key="`${it.exerciseId}-${index}`">
      <div class="ss-item">
        <div class="ss-item-top">
          <span class="ss-tag">{{ letter }}{{ index + 1 }}</span>
          <span class="ss-item-name-wrap">
            <span class="ss-item-name">{{ exerciseOf(it)?.name ?? it.exerciseId }}</span>
            <span v-if="!exerciseOf(it)" class="we-chip we-chip--warn">No disponible</span>
            <span v-else class="ss-item-muscle">{{ muscleLabel(exerciseOf(it)!.primaryMuscle) }}</span>
          </span>
          <button class="we-icon-btn" :aria-label="`Cambiar ejercicio ${letter}${index + 1}`" @click="emit('change-exercise', index)">
            <q-icon name="sync" size="16px" />
          </button>
          <button class="we-icon-btn we-icon-btn--del" :aria-label="`Quitar ${letter}${index + 1} de la superserie`" @click="emit('remove-item', index)">
            <q-icon name="close" size="16px" />
          </button>
        </div>

        <div class="ss-fields">
          <div class="ss-field">
            <div class="ss-mode" role="group" :aria-label="`Tipo de serie de ${letter}${index + 1}`">
              <button type="button" :class="{ on: it.mode === 'reps' }" @click="setMode(it, 'reps')">Reps</button>
              <button type="button" :class="{ on: it.mode === 'time' }" @click="setMode(it, 'time')">Tiempo</button>
            </div>
            <input
              v-if="it.mode === 'reps'"
              :value="it.sets[0]?.reps"
              class="we-input ss-num"
              type="number" inputmode="numeric" min="1" step="1"
              :aria-label="`Repeticiones de ${letter}${index + 1}`"
              @change="onField(it, 'reps', $event)"
            />
            <div v-else class="ss-suffix">
              <input
                :value="it.sets[0]?.durationSeconds"
                class="we-input ss-num"
                type="number" inputmode="numeric" min="1" step="5"
                :aria-label="`Segundos de ${letter}${index + 1}`"
                @change="onField(it, 'durationSeconds', $event)"
              />
              <span>s</span>
            </div>
          </div>
          <div class="ss-field">
            <span class="ss-label">Peso</span>
            <div class="ss-suffix">
              <input
                :value="it.sets[0]?.weightKg"
                class="we-input ss-num"
                type="number" inputmode="decimal" min="0" step="0.5" placeholder="—"
                :aria-label="`Peso de ${letter}${index + 1} en kg`"
                @change="onField(it, 'weightKg', $event)"
              />
              <span>kg</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="index === 0" class="ss-transition">
        <q-icon name="south" size="14px" />
        <span>Paso a {{ letter }}2</span>
        <div class="ss-suffix">
          <input
            :value="transitionOf(block)"
            class="we-input ss-num ss-num--small"
            type="number" inputmode="numeric" min="0" step="5"
            aria-label="Descanso entre ejercicios en segundos"
            @change="onRest('transition', $event)"
          />
          <span>s</span>
        </div>
        <button class="we-icon-btn ss-swap" aria-label="Intercambiar A1 y A2" @click="swapItems(block)">
          <q-icon name="swap_vert" size="16px" />
        </button>
      </div>
    </template>

    <div class="ss-bottom">
      <div class="ss-field">
        <span class="ss-label">Rondas</span>
        <div class="ss-stepper">
          <button type="button" aria-label="Menos rondas" :disabled="rounds <= SUPERSET_MIN_ROUNDS" @click="setRounds(block, rounds - 1)">−</button>
          <span>{{ rounds }}</span>
          <button type="button" aria-label="Más rondas" :disabled="rounds >= SUPERSET_MAX_ROUNDS" @click="setRounds(block, rounds + 1)">+</button>
        </div>
      </div>
      <div class="ss-field">
        <span class="ss-label">Descanso entre rondas</span>
        <div class="ss-suffix">
          <input
            :value="roundRestOf(block)"
            class="we-input ss-num"
            type="number" inputmode="numeric" min="0" step="5"
            aria-label="Descanso entre rondas en segundos"
            @change="onRest('round', $event)"
          />
          <span>s</span>
        </div>
      </div>
    </div>

    <button class="we-btn we-btn--ghost ss-separate" @click="emit('separate')">
      <q-icon name="call_split" size="16px" /> Separar superserie
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useExercisesStore } from '../../stores/exercises'
import type { BlockItem, ExerciseMode, SetSpec, TemplateBlock } from '../../types/workout-template'
import type { Exercise } from '../../types/exercise'
import { isValidSetValue } from '../../workout-editor/validation'
import { muscleLabel } from '../../workout-editor/labels'
import {
  SUPERSET_MIN_ROUNDS,
  SUPERSET_MAX_ROUNDS,
  roundsOf,
  transitionOf,
  roundRestOf,
  setRounds,
  setTransition,
  setRoundRest,
  swapItems,
} from '../../workout-editor/superset'
import '../../css/workout-editor.scss'

/** Edits a superset block in place. Removing, separating and changing exercises are done by the page. */
const props = defineProps<{ block: TemplateBlock; letter: string }>()

const emit = defineEmits<{
  (e: 'change-exercise', index: number): void
  (e: 'remove-item', index: number): void
  (e: 'separate'): void
}>()

const $q = useQuasar()
const exercisesStore = useExercisesStore()

const rounds = computed(() => roundsOf(props.block))

function exerciseOf(it: BlockItem): Exercise | undefined {
  return exercisesStore.getById(it.exerciseId)
}

function setMode(it: BlockItem, mode: ExerciseMode) {
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

function onField(it: BlockItem, field: 'reps' | 'durationSeconds' | 'weightKg', event: Event) {
  const input = event.target as HTMLInputElement
  const raw = input.value.trim()
  if (raw === '' && field === 'weightKg') {
    it.sets = it.sets.map(s => {
      const next = { ...s }
      delete next.weightKg
      return next
    })
    return
  }
  const value = Number(raw)
  if (!isValidSetValue(field, value)) {
    const previous = it.sets[0]?.[field]
    input.value = previous === undefined ? '' : String(previous)
    $q.notify({ type: 'warning', message: 'El valor debe ser mayor que 0' })
    return
  }
  it.sets = it.sets.map(s => ({ ...s, [field]: value }))
}

function onRest(which: 'transition' | 'round', event: Event) {
  const input = event.target as HTMLInputElement
  const value = Number(input.value.trim() === '' ? 0 : input.value)
  if (!isValidSetValue('restSeconds', value)) {
    input.value = String(which === 'transition' ? transitionOf(props.block) : roundRestOf(props.block))
    $q.notify({ type: 'warning', message: 'El descanso no puede ser negativo' })
    return
  }
  if (which === 'transition') setTransition(props.block, value)
  else setRoundRest(props.block, value)
}
</script>

<style>
/* Prefixed instead of scoped, like PyramidBlockEditor. */
.ss { display: flex; flex-direction: column; gap: 0.45rem; border-left: 3px solid var(--k-primary-container); padding-left: 0.6rem; }
.ss-item { background-color: var(--k-surface-highest); border-radius: var(--k-radius-md); padding: 0.55rem; display: flex; flex-direction: column; gap: 0.45rem; }
.ss-item-top { display: flex; align-items: center; gap: 0.4rem; }
.ss-tag {
  flex-shrink: 0; min-width: 1.9rem; text-align: center; padding: 0.15rem 0.3rem; border-radius: var(--k-radius-sm);
  background-color: var(--k-primary-container); color: var(--k-on-primary-container);
  font-family: var(--k-font-headline); font-size: var(--k-label-md); font-weight: 700;
}
.ss-item-name-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; align-items: flex-start; }
.ss-item-name { font-family: var(--k-font-body); font-size: var(--k-body-md); font-weight: 600; color: var(--k-on-surface); }
.ss-item-muscle { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }

.ss-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; align-items: end; }
.ss-field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.ss-label {
  font-family: var(--k-font-body); font-size: 0.65rem; font-weight: 500;
  text-transform: uppercase; letter-spacing: var(--k-tracking-label); color: var(--k-secondary);
}
.ss-mode { display: flex; background-color: var(--k-surface-high); border-radius: var(--k-radius-sm); padding: 2px; height: 22px; }
.ss-mode button {
  flex: 1; border: none; background: none; cursor: pointer; border-radius: 3px; padding: 0;
  font-family: var(--k-font-body); font-size: 0.62rem; font-weight: 600; text-transform: uppercase; color: var(--k-secondary);
}
.ss-mode button.on { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }
.ss-num { padding: 0.45rem 0.3rem; text-align: center; font-family: var(--k-font-headline); font-weight: 600; min-width: 0; width: 100%; }
.ss-num--small { width: 4.2rem; }
.ss-suffix { display: flex; align-items: center; gap: 0.2rem; min-width: 0; }
.ss-suffix span { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }

.ss-transition {
  display: flex; align-items: center; gap: 0.4rem; padding: 0 0.3rem;
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary);
}
.ss-transition > span { flex: 1; }
.ss-swap { margin-left: 0.2rem; }

.ss-bottom { display: grid; grid-template-columns: auto 1fr; gap: 0.6rem; align-items: end; margin-top: 0.2rem; }
.ss-stepper { display: flex; align-items: center; background-color: var(--k-surface-highest); border-radius: var(--k-radius-md); }
.ss-stepper button { width: 30px; height: 34px; border: none; background: none; cursor: pointer; color: var(--k-on-surface); font-size: 1.1rem; }
.ss-stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
.ss-stepper span { min-width: 1.4rem; text-align: center; font-family: var(--k-font-headline); font-weight: 700; color: var(--k-on-surface); }

.ss-separate { align-self: flex-start; padding: 0.4rem 0.6rem; font-size: var(--k-label-md); }
</style>
