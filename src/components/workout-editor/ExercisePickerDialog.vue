<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" @before-show="reset">
    <div class="we-dialog xp-dialog">
      <div class="we-dialog-header">
        <span class="we-dialog-title">{{ title ?? `Añadir a ${meta.label.toLowerCase()}` }}</span>
        <button class="we-icon-btn" aria-label="Cerrar" @click="close"><q-icon name="close" size="18px" /></button>
      </div>

      <div class="we-dialog-body">
        <input v-model="search" class="we-input" type="search" placeholder="Buscar ejercicio…" aria-label="Buscar ejercicio" />

        <div class="we-field">
          <span class="we-field-label">Grupo muscular</span>
          <div class="xp-filter-row">
            <button
              v-for="m in MUSCLE_OPTIONS"
              :key="m.value"
              type="button"
              :class="['xp-filter', { 'xp-filter--on': muscle === m.value }]"
              :aria-pressed="muscle === m.value"
              @click="muscle = muscle === m.value ? '' : m.value"
            >{{ m.label }}</button>
          </div>
        </div>

        <div class="we-field">
          <span class="we-field-label xp-cat-label">
            Categoría
            <button v-if="categories.length" type="button" class="xp-clear" @click="categories = []">Quitar filtro</button>
          </span>
          <div class="xp-filter-row">
            <button
              v-for="c in CATEGORY_OPTIONS"
              :key="c.value"
              type="button"
              :class="['xp-filter', { 'xp-filter--on': categories.includes(c.value) }]"
              :aria-pressed="categories.includes(c.value)"
              @click="toggleCategory(c.value)"
            >{{ c.label }}</button>
          </div>
        </div>

        <span class="xp-count">{{ results.length }} ejercicios</span>

        <ul class="xp-list">
          <li v-for="ex in results" :key="ex.id">
            <button
              type="button"
              :class="['xp-item', { 'xp-item--on': selected.includes(ex.id), 'xp-item--off': isExcluded(ex.id) }]"
              :disabled="isExcluded(ex.id)"
              @click="toggle(ex.id)"
            >
              <q-icon :name="single ? 'add_circle_outline' : (selected.includes(ex.id) ? 'check_circle' : 'radio_button_unchecked')" size="20px" class="xp-check" />
              <span class="xp-item-main">
                <span class="xp-item-name">{{ ex.name }}</span>
                <span class="xp-item-sub">
                  {{ muscleLabel(ex.primaryMuscle) }} · {{ categoryLabel(ex.category) }}
                  <template v-if="ex.equipment.length"> · {{ ex.equipment.map(equipmentLabel).join(', ') }}</template>
                  <template v-if="isExcluded(ex.id)"> · ya añadido</template>
                </span>
              </span>
            </button>
          </li>
        </ul>
        <div v-if="results.length === 0" class="we-empty">Ningún ejercicio coincide con los filtros</div>
      </div>

      <div class="we-dialog-footer">
        <button class="we-btn we-btn--ghost" @click="close">Cancelar</button>
        <button v-if="!single" class="we-btn we-btn--cta" :disabled="selected.length === 0" @click="confirm">
          Añadir{{ selected.length ? ` (${selected.length})` : '' }}
        </button>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExercisesStore } from '../../stores/exercises'
import type { ExerciseCategory } from '../../types/enums'
import type { SectionKey } from '../../types/workout-template'
import {
  MUSCLE_OPTIONS,
  CATEGORY_OPTIONS,
  SECTION_META,
  muscleLabel,
  categoryLabel,
  equipmentLabel,
} from '../../workout-editor/labels'
import '../../css/workout-editor.scss'

const props = defineProps<{
  modelValue: boolean
  section: SectionKey
  /** Exercise ids that cannot be added again (e.g. already in the main workout). */
  excludeIds?: string[]
  /** Single pick: choosing an exercise selects it and closes the dialog. */
  single?: boolean
  /** Overrides the default "Añadir a …" title. */
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', exerciseIds: string[]): void
}>()

const exercisesStore = useExercisesStore()
onMounted(() => exercisesStore.loadExercises())

const meta = computed(() => SECTION_META[props.section])
const search = ref('')
const muscle = ref('')
const categories = ref<ExerciseCategory[]>([])
const selected = ref<string[]>([])

function reset() {
  search.value = ''
  muscle.value = ''
  categories.value = [...meta.value.defaultCategories]
  selected.value = []
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const results = computed(() => {
  const q = normalize(search.value.trim())
  return exercisesStore.allExercises.filter(ex => {
    if (q && !normalize(ex.name).includes(q)) return false
    if (muscle.value && !ex.muscleGroups.includes(muscle.value as never) && ex.primaryMuscle !== muscle.value) return false
    if (categories.value.length && !categories.value.includes(ex.category)) return false
    return true
  })
})

function isExcluded(id: string): boolean {
  return props.excludeIds?.includes(id) ?? false
}

function toggleCategory(c: ExerciseCategory) {
  categories.value = categories.value.includes(c)
    ? categories.value.filter(x => x !== c)
    : [...categories.value, c]
}

function toggle(id: string) {
  if (props.single) {
    emit('select', [id])
    close()
    return
  }
  selected.value = selected.value.includes(id)
    ? selected.value.filter(x => x !== id)
    : [...selected.value, id]
}

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  emit('select', [...selected.value])
  close()
}
</script>

<style scoped>
.xp-dialog { max-height: 92vh; }
.xp-filter-row { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.xp-filter {
  padding: 0.3rem 0.6rem; border: none; border-radius: 999px; cursor: pointer;
  background-color: var(--k-surface-high); color: var(--k-secondary);
  font-family: var(--k-font-body); font-size: var(--k-label-md);
}
.xp-filter--on { background-color: rgba(255, 86, 44, 0.18); color: var(--k-primary-container); }
.xp-cat-label { display: flex; align-items: center; justify-content: space-between; }
.xp-clear {
  background: none; border: none; cursor: pointer; padding: 0; text-transform: none; letter-spacing: 0;
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-primary-container);
}
.xp-count { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-outline); }
.xp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.xp-item {
  width: 100%; display: flex; align-items: center; gap: 0.6rem; text-align: left;
  padding: 0.6rem 0.7rem; border: 1px solid transparent; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container); color: var(--k-on-surface); cursor: pointer;
}
.xp-item--on { border-color: var(--k-primary-container); background-color: rgba(255, 86, 44, 0.08); }
.xp-item--off { opacity: 0.45; cursor: not-allowed; }
.xp-check { color: var(--k-secondary); flex-shrink: 0; }
.xp-item--on .xp-check { color: var(--k-primary-container); }
.xp-item-main { display: flex; flex-direction: column; min-width: 0; }
.xp-item-name { font-family: var(--k-font-body); font-size: var(--k-body-md); font-weight: 500; }
.xp-item-sub { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
</style>
