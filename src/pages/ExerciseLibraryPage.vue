<template>
  <PageShell :loading="!exercisesStore.loaded">
    <!-- Search bar -->
    <q-input
      v-model="searchQuery"
      outlined
      dense
      placeholder="Buscar ejercicio..."
      class="q-mb-md"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
      <template v-if="searchQuery" #append>
        <q-icon name="close" class="cursor-pointer" @click="searchQuery = ''" />
      </template>
    </q-input>

    <!-- Filters -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-6">
        <q-select
          v-model="filterMuscle"
          :options="muscleOptions"
          label="Musculo"
          emit-value
          map-options
          outlined
          dense
          clearable
        />
      </div>
      <div class="col-6">
        <q-select
          v-model="filterCategory"
          :options="categoryOptions"
          label="Categoria"
          emit-value
          map-options
          outlined
          dense
          clearable
        />
      </div>
    </div>

    <!-- Results count -->
    <p class="text-grey-6 q-mb-sm text-caption">
      {{ filteredExercises.length }} ejercicios
    </p>

    <!-- Exercise list (virtual scroll for performance) -->
    <q-virtual-scroll
      :items="filteredExercises"
      separator
      v-slot="{ item: exercise }"
      style="max-height: calc(100vh - 280px)"
    >
      <q-item
        :key="exercise.id"
        clickable
        :to="`/exercises/${exercise.id}`"
      >
        <q-item-section avatar>
          <q-icon
            :name="getCategoryIcon(exercise.category)"
            :color="getDifficultyColor(exercise.difficulty)"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ exercise.name }}</q-item-label>
          <q-item-label caption>
            {{ exercise.primaryMuscle }} · {{ exercise.difficulty }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="chevron_right" color="grey-6" />
        </q-item-section>
      </q-item>
    </q-virtual-scroll>

    <div v-if="filteredExercises.length === 0" class="text-center q-pa-xl">
      <q-icon name="search_off" size="48px" color="grey-6" />
      <p class="text-grey-6 q-mt-md">No se encontraron ejercicios</p>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import { useExercisesStore } from '../stores/exercises'
import type { Exercise } from '../types/exercise'

const exercisesStore = useExercisesStore()
const searchQuery = ref('')
const filterMuscle = ref<string | null>(null)
const filterCategory = ref<string | null>(null)

onMounted(() => exercisesStore.loadExercises())

const muscleOptions = [
  { label: 'Pecho', value: 'chest' },
  { label: 'Espalda', value: 'back' },
  { label: 'Hombros', value: 'shoulders' },
  { label: 'Biceps', value: 'biceps' },
  { label: 'Triceps', value: 'triceps' },
  { label: 'Core', value: 'core' },
  { label: 'Cuadriceps', value: 'quads' },
  { label: 'Isquiotibiales', value: 'hamstrings' },
  { label: 'Gluteos', value: 'glutes' },
  { label: 'Gemelos', value: 'calves' },
]

const categoryOptions = [
  { label: 'Fuerza', value: 'strength' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Flexibilidad', value: 'flexibility' },
  { label: 'Equilibrio', value: 'balance' },
  { label: 'Calentamiento', value: 'warmup' },
  { label: 'Vuelta a la calma', value: 'cooldown' },
]

const filteredExercises = computed(() => {
  let results: Exercise[] = exercisesStore.allExercises

  if (searchQuery.value) {
    results = exercisesStore.searchByName(searchQuery.value)
  }

  if (filterMuscle.value) {
    results = results.filter(e =>
      (e.muscleGroups as string[]).includes(filterMuscle.value!),
    )
  }

  if (filterCategory.value) {
    results = results.filter(e => e.category === filterCategory.value)
  }

  return results
})

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    strength: 'fitness_center',
    cardio: 'directions_run',
    flexibility: 'self_improvement',
    balance: 'balance',
    plyometric: 'trending_up',
    warmup: 'wb_sunny',
    cooldown: 'nightlight',
  }
  return icons[category] || 'fitness_center'
}

function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    beginner: 'green',
    intermediate: 'orange',
    advanced: 'red',
  }
  return colors[difficulty] || 'grey'
}
</script>
