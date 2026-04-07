<template>
  <div>
    <h6 class="q-mb-md">Tus objetivos</h6>
    <p class="text-grey-6 q-mb-lg">Selecciona uno o varios objetivos</p>

    <div class="row q-col-gutter-md">
      <div
        v-for="goal in goalOptions"
        :key="goal.value"
        class="col-6"
      >
        <q-card
          :class="[
            'cursor-pointer goal-card',
            selected.includes(goal.value) ? 'selected' : ''
          ]"
          flat
          bordered
          @click="toggleGoal(goal.value)"
        >
          <q-card-section class="text-center">
            <q-icon :name="goal.icon" size="36px" :color="selected.includes(goal.value) ? 'primary' : 'grey-6'" />
            <div class="q-mt-sm text-subtitle2">{{ goal.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { FitnessGoal } from '../../types/enums'

const emit = defineEmits<{
  update: [goals: FitnessGoal[]]
}>()

const selected = ref<FitnessGoal[]>([])

const goalOptions = [
  { label: 'Perder peso', value: FitnessGoal.LoseWeight, icon: 'monitor_weight' },
  { label: 'Ganar musculo', value: FitnessGoal.GainMuscle, icon: 'fitness_center' },
  { label: 'Resistencia', value: FitnessGoal.ImproveEndurance, icon: 'directions_run' },
  { label: 'Flexibilidad', value: FitnessGoal.Flexibility, icon: 'self_improvement' },
  { label: 'Fuerza', value: FitnessGoal.Strength, icon: 'flash_on' },
  { label: 'Fitness general', value: FitnessGoal.GeneralFitness, icon: 'favorite' },
]

function toggleGoal(goal: FitnessGoal) {
  const idx = selected.value.indexOf(goal)
  if (idx === -1) {
    selected.value.push(goal)
  } else {
    selected.value.splice(idx, 1)
  }
}

watch(selected, (val) => {
  emit('update', [...val])
}, { deep: true })
</script>

<style scoped lang="scss">
.goal-card {
  transition: all 0.2s ease;

  &.selected {
    border-color: var(--q-primary);
    background-color: rgba(233, 69, 96, 0.1);
  }

  &:hover {
    transform: translateY(-2px);
  }
}
</style>
