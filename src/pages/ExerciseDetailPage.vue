<template>
  <PageShell :loading="!exercise">
    <template v-if="exercise">
      <!-- Header -->
      <div class="q-mb-lg">
        <div class="row items-center q-mb-sm">
          <q-chip
            :color="getDifficultyColor(exercise.difficulty)"
            text-color="white"
            dense
            class="q-mr-sm"
          >
            {{ exercise.difficulty }}
          </q-chip>
          <q-chip outline dense>
            {{ exercise.category }}
          </q-chip>
          <q-chip v-if="exercise.isCompound" outline dense color="purple" class="q-ml-sm">
            Compuesto
          </q-chip>
        </div>
        <h5 class="q-mt-sm q-mb-xs">{{ exercise.name }}</h5>
        <p class="text-grey-6">{{ exercise.description }}</p>
      </div>

      <!-- Muscles -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Musculos implicados</div>
          <div class="row q-gutter-sm">
            <q-chip
              v-for="muscle in exercise.muscleGroups"
              :key="muscle"
              dense
              :color="muscle === exercise.primaryMuscle ? 'primary' : 'grey-8'"
              text-color="white"
            >
              {{ muscle === exercise.primaryMuscle ? '★ ' : '' }}{{ getMuscleLabel(muscle) }}
            </q-chip>
          </div>
        </q-card-section>
      </q-card>

      <!-- Equipment -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Equipamiento necesario</div>
          <div v-if="exercise.equipment.length === 0" class="text-grey-6">
            Sin equipamiento (peso corporal)
          </div>
          <div v-else class="row q-gutter-sm">
            <q-chip
              v-for="equip in exercise.equipment"
              :key="equip"
              dense
              outline
            >
              {{ getEquipmentLabel(equip) }}
            </q-chip>
          </div>
        </q-card-section>
      </q-card>

      <!-- Instructions -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-md">Instrucciones</div>
          <q-list>
            <q-item v-for="(step, index) in exercise.instructions" :key="index" class="q-px-none">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="28px">
                  {{ index + 1 }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                {{ step }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <!-- Tags -->
      <div class="q-mb-md">
        <q-chip
          v-for="tag in exercise.tags"
          :key="tag"
          dense
          outline
          color="grey-7"
          class="q-mr-xs"
        >
          {{ tag }}
        </q-chip>
      </div>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from '../components/layout/PageShell.vue'
import { useExercisesStore } from '../stores/exercises'

const route = useRoute()
const exercisesStore = useExercisesStore()

onMounted(() => exercisesStore.loadExercises())

const exercise = computed(() => {
  const id = route.params.id as string
  return exercisesStore.getById(id)
})

function getDifficultyColor(difficulty: string): string {
  return { beginner: 'green', intermediate: 'orange', advanced: 'red' }[difficulty] || 'grey'
}

const muscleLabels: Record<string, string> = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Antebrazos',
  core: 'Core', quads: 'Cuadriceps', hamstrings: 'Isquiotibiales',
  glutes: 'Gluteos', calves: 'Gemelos', full_body: 'Cuerpo completo',
}

function getMuscleLabel(muscle: string): string {
  return muscleLabels[muscle] || muscle
}

const equipmentLabels: Record<string, string> = {
  dumbbells: 'Mancuernas', resistance_bands: 'Bandas elasticas',
  pull_up_bar: 'Barra dominadas', bench: 'Banco',
  barbell: 'Barra olimpica', kettlebell: 'Kettlebell',
  yoga_mat: 'Esterilla', bodyweight_only: 'Peso corporal',
}

function getEquipmentLabel(equip: string): string {
  return equipmentLabels[equip] || equip
}
</script>
