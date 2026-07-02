<template>
  <PageShell :loading="!exercisesStore.loaded">

    <!-- ── Cabecera ───────────────────────────────────────────── -->
    <header class="el-header">
      <span class="el-overline">Biblioteca</span>
      <h1 class="el-title">Ejercicios</h1>
    </header>

    <!-- ── Búsqueda ──────────────────────────────────────────── -->
    <div class="el-search-wrap">
      <span class="material-symbols-outlined el-search-icon">search</span>
      <input
        v-model="searchQuery"
        class="el-search"
        type="text"
        placeholder="Buscar ejercicio..."
      />
      <button v-if="searchQuery" class="el-search-clear" @click="searchQuery = ''">
        <span class="material-symbols-outlined" style="font-size:16px">close</span>
      </button>
    </div>

    <!-- ── Filtros ─────────────────────────────────────────────── -->
    <div class="el-filters">
      <!-- Músculo principal -->
      <div class="el-filter-wrap">
        <select v-model="filterMuscle" class="el-select">
          <option value="">Músculo</option>
          <option v-for="o in muscleOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <span class="material-symbols-outlined el-select-arrow">expand_more</span>
      </div>
      <!-- Dificultad -->
      <div class="el-filter-wrap">
        <select v-model="filterDifficulty" class="el-select">
          <option value="">Nivel</option>
          <option v-for="o in difficultyOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <span class="material-symbols-outlined el-select-arrow">expand_more</span>
      </div>
      <!-- Aparato -->
      <div class="el-filter-wrap">
        <select v-model="filterEquipment" class="el-select">
          <option value="">Aparato</option>
          <option value="__bodyweight__">Sin material</option>
          <option v-for="o in equipmentOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <span class="material-symbols-outlined el-select-arrow">expand_more</span>
      </div>
    </div>

    <!-- ── Conteo ─────────────────────────────────────────────── -->
    <p class="el-count">{{ filteredExercises.length }} ejercicios</p>

    <!-- ── Lista ──────────────────────────────────────────────── -->
    <q-virtual-scroll
      v-if="filteredExercises.length > 0"
      :items="filteredExercises"
      v-slot="{ item: exercise }"
      style="max-height: calc(100vh - 340px)"
    >
      <router-link
        :key="exercise.id"
        :to="`/exercises/${exercise.id}`"
        class="el-item"
      >
        <!-- Icono de categoría con color por dificultad -->
        <div :class="['el-item-icon', difficultyIconClass(exercise.difficulty)]">
          <span class="material-symbols-outlined" style="font-size:20px">{{ getCategoryIcon(exercise.category) }}</span>
        </div>

        <!-- Info -->
        <div class="el-item-info">
          <span class="el-item-name">{{ exercise.name }}</span>
          <span class="el-item-meta">{{ muscleLabel(exercise.primaryMuscle) }}</span>
        </div>

        <!-- Dificultad + chevron -->
        <div class="el-item-side">
          <span :class="['el-diff', difficultyBadgeClass(exercise.difficulty)]">
            {{ difficultyLabel[exercise.difficulty] ?? exercise.difficulty }}
          </span>
          <span class="material-symbols-outlined el-chevron">chevron_right</span>
        </div>
      </router-link>
    </q-virtual-scroll>

    <!-- ── Sin resultados ──────────────────────────────────────── -->
    <div v-if="filteredExercises.length === 0 && exercisesStore.loaded" class="el-empty">
      <span class="el-empty-watermark">?</span>
      <div class="el-empty-icon-wrap">
        <span class="material-symbols-outlined el-empty-icon" style="font-size:32px">search_off</span>
      </div>
      <h2 class="el-empty-title">Sin resultados</h2>
      <p class="el-empty-desc">Prueba con otro nombre o cambia los filtros.</p>
    </div>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import { useExercisesStore } from '../stores/exercises'
import type { Exercise } from '../types/exercise'

const exercisesStore  = useExercisesStore()
const searchQuery     = ref('')
const filterMuscle    = ref('')
const filterDifficulty = ref('')
const filterEquipment = ref('')

onMounted(() => exercisesStore.loadExercises())

// ── Opciones de filtros (valores canónicos del enum) ────────────
const muscleOptions = [
  { label: 'Pecho',           value: 'chest' },
  { label: 'Espalda',         value: 'back' },
  { label: 'Hombros',         value: 'shoulders' },
  { label: 'Bíceps',          value: 'biceps' },
  { label: 'Tríceps',         value: 'triceps' },
  { label: 'Antebrazos',      value: 'forearms' },
  { label: 'Core',            value: 'core' },
  { label: 'Cuádriceps',      value: 'quads' },
  { label: 'Isquiotibiales',  value: 'hamstrings' },
  { label: 'Glúteos',         value: 'glutes' },
  { label: 'Gemelos',         value: 'calves' },
  { label: 'Cuerpo completo', value: 'full_body' },
]

const difficultyOptions = [
  { label: 'Principiante', value: 'beginner'     },
  { label: 'Intermedio',   value: 'intermediate' },
  { label: 'Avanzado',     value: 'advanced'     },
]

const equipmentOptions = [
  { label: 'Mancuernas',      value: 'dumbbells'        },
  { label: 'Barra',           value: 'barbell'          },
  { label: 'Kettlebell',      value: 'kettlebell'       },
  { label: 'Bandas elásticas',value: 'resistance_bands' },
  { label: 'Barra dominadas', value: 'pull_up_bar'      },
  { label: 'Banco',           value: 'bench'            },
  { label: 'Esterilla',       value: 'yoga_mat'         },
]

// ── Labels ──────────────────────────────────────────────────────
const difficultyLabel: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

function muscleLabel(m: string): string {
  return muscleOptions.find(o => o.value === m)?.label ?? m
}

// ── Clases por dificultad ────────────────────────────────────────
function difficultyIconClass(d: string): string {
  if (d === 'beginner')     return 'el-item-icon--beginner'
  if (d === 'intermediate') return 'el-item-icon--intermediate'
  if (d === 'advanced')     return 'el-item-icon--advanced'
  return ''
}
function difficultyBadgeClass(d: string): string {
  if (d === 'beginner')     return 'el-diff--beginner'
  if (d === 'intermediate') return 'el-diff--intermediate'
  if (d === 'advanced')     return 'el-diff--advanced'
  return ''
}

// ── Icono por categoría (valores canónicos del enum) ─────────────
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    strength:    'fitness_center',
    cardio:      'directions_run',
    flexibility: 'self_improvement',
    balance:     'balance',
    plyometric:  'bolt',
    warmup:      'wb_sunny',
    cooldown:    'nightlight',
  }
  return icons[category] ?? 'fitness_center'
}

// ── Filtrado ─────────────────────────────────────────────────────
const filteredExercises = computed(() => {
  let results: Exercise[] = searchQuery.value
    ? exercisesStore.searchByName(searchQuery.value)
    : exercisesStore.allExercises

  if (filterMuscle.value)
    results = results.filter(e => e.primaryMuscle === filterMuscle.value)

  if (filterDifficulty.value)
    results = results.filter(e => e.difficulty === filterDifficulty.value)

  if (filterEquipment.value) {
    if (filterEquipment.value === '__bodyweight__')
      results = results.filter(e => !e.equipment || e.equipment.length === 0)
    else
      results = results.filter(e => e.equipment?.includes(filterEquipment.value as never))
  }

  return results
})
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   CABECERA
══════════════════════════════════════════════════════════════ */
.el-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
}

.el-overline {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-primary-container);
}

.el-title {
  font-family: var(--k-font-headline);
  font-size: 2.25rem;
  font-weight: 700;
  font-style: italic;
  text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0;
  line-height: 1.05;
}

/* ══════════════════════════════════════════════════════════════
   BÚSQUEDA
══════════════════════════════════════════════════════════════ */
.el-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.el-search-icon {
  position: absolute;
  left: 0.875rem;
  color: var(--k-outline);
  pointer-events: none;
  font-size: 18px !important;
}

.el-search {
  width: 100%;
  padding: 0.75rem 2.75rem;
  border-radius: var(--k-radius-md);
  border: none;
  background-color: var(--k-surface-highest);
  color: var(--k-on-surface);
  font-family: var(--k-font-body);
  font-size: var(--k-body-lg);
  outline: none;
  box-sizing: border-box;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.el-search:focus {
  background-color: var(--k-surface-bright);
  box-shadow: 0 0 0 1px rgba(255, 86, 44, 0.4);
}

.el-search::placeholder { color: var(--k-outline); }

.el-search-clear {
  position: absolute;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--k-outline);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--k-radius-sm);
  transition: color 0.15s ease;
}
.el-search-clear:hover { color: var(--k-on-surface); }

/* ══════════════════════════════════════════════════════════════
   FILTROS
══════════════════════════════════════════════════════════════ */
.el-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.el-filter-wrap {
  flex: 1;
  position: relative;
  min-width: 0;
}

.el-select {
  width: 100%;
  padding: 0.6rem 1.75rem 0.6rem 0.625rem;
  border-radius: var(--k-radius-md);
  border: none;
  background-color: var(--k-surface-highest);
  color: var(--k-on-surface);
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.el-select:focus { background-color: var(--k-surface-bright); }

.el-select option {
  background-color: var(--k-surface-highest);
  color: var(--k-on-surface);
}

.el-select-arrow {
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--k-outline);
  pointer-events: none;
  font-size: 16px !important;
}

/* ══════════════════════════════════════════════════════════════
   CONTEO
══════════════════════════════════════════════════════════════ */
.el-count {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-secondary);
  margin: 0 0 0.625rem;
}

/* ══════════════════════════════════════════════════════════════
   ÍTEM DE EJERCICIO
══════════════════════════════════════════════════════════════ */
.el-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 0.75rem;
  border-radius: var(--k-radius-md);
  text-decoration: none;
  transition: background-color 0.15s ease;
  margin-bottom: 0.375rem;
  background-color: var(--k-surface-container);
}
.el-item:hover { background-color: var(--k-surface-high); }

/* Icono con color por dificultad */
.el-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--k-radius-md);
}

.el-item-icon--beginner {
  background-color: rgba(166, 200, 255, 0.15);
  color: var(--k-tertiary);
}
.el-item-icon--intermediate {
  background-color: rgba(255, 180, 162, 0.15);
  color: var(--k-primary);
}
.el-item-icon--advanced {
  background-color: rgba(255, 86, 44, 0.15);
  color: var(--k-primary-container);
}

/* Info central */
.el-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.el-item-name {
  font-family: var(--k-font-headline);
  font-size: var(--k-body-lg);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.el-item-meta {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-secondary);
}

/* Lado derecho */
.el-item-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  flex-shrink: 0;
}

/* Píldora de dificultad */
.el-diff {
  font-family: var(--k-font-body);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: var(--k-radius-sm);
}

.el-diff--beginner {
  background-color: rgba(166, 200, 255, 0.18);
  color: var(--k-tertiary);
}
.el-diff--intermediate {
  background-color: rgba(255, 180, 162, 0.18);
  color: var(--k-primary);
}
.el-diff--advanced {
  background-color: rgba(255, 86, 44, 0.18);
  color: var(--k-primary-container);
}

.el-chevron {
  color: var(--k-secondary);
  font-size: 18px !important;
}

/* ══════════════════════════════════════════════════════════════
   ESTADO VACÍO
══════════════════════════════════════════════════════════════ */
.el-empty {
  position: relative;
  overflow: hidden;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-low);
  padding: 2rem 1.5rem 1.75rem;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.el-empty-watermark {
  position: absolute;
  top: -1.5rem;
  right: 0.75rem;
  font-family: var(--k-font-headline);
  font-size: 8rem;
  font-weight: 700;
  color: var(--k-on-surface);
  opacity: 0.04;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.el-empty-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
}

.el-empty-icon  { color: var(--k-secondary); }

.el-empty-title {
  font-family: var(--k-font-headline);
  font-size: var(--k-headline-md);
  font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0;
}

.el-empty-desc {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
  margin: 0;
  line-height: 1.6;
}
</style>
