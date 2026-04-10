<template>
  <div class="gs-root">
    <p class="gs-hint">Selecciona uno o varios objetivos</p>

    <div class="gs-grid">
      <button
        v-for="goal in goalOptions"
        :key="goal.value"
        :class="['gs-card', { 'gs-card--selected': selected.includes(goal.value) }]"
        type="button"
        @click="toggleGoal(goal.value)"
      >
        <q-icon
          :name="goal.icon"
          size="32px"
          :class="['gs-icon', { 'gs-icon--selected': selected.includes(goal.value) }]"
        />
        <span class="gs-label">{{ goal.label }}</span>

        <span v-if="selected.includes(goal.value)" class="gs-check">
          <q-icon name="check" size="12px" />
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { FitnessGoal } from '../../types/enums'

const emit = defineEmits<{ update: [goals: FitnessGoal[]] }>()

const selected = ref<FitnessGoal[]>([])

const goalOptions = [
  { label: 'Perder peso',     value: FitnessGoal.LoseWeight,        icon: 'monitor_weight' },
  { label: 'Ganar músculo',   value: FitnessGoal.GainMuscle,        icon: 'fitness_center' },
  { label: 'Resistencia',     value: FitnessGoal.ImproveEndurance,  icon: 'directions_run' },
  { label: 'Flexibilidad',    value: FitnessGoal.Flexibility,       icon: 'self_improvement' },
  { label: 'Fuerza',          value: FitnessGoal.Strength,          icon: 'flash_on' },
  { label: 'Fitness general', value: FitnessGoal.GeneralFitness,    icon: 'favorite' },
]

function toggleGoal(goal: FitnessGoal) {
  const idx = selected.value.indexOf(goal)
  idx === -1 ? selected.value.push(goal) : selected.value.splice(idx, 1)
}

watch(selected, (val) => emit('update', [...val]), { deep: true })
</script>

<style scoped>
.gs-root {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gs-hint {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
  margin: 0;
}

.gs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

/* ── Card ────────────────────────────────────────────────────── */
.gs-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 1rem;
  border: none;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.gs-card:hover {
  background-color: var(--k-surface-high);
  transform: translateY(-1px);
}

.gs-card--selected {
  background-color: var(--k-surface-high);
  box-shadow: inset 0 0 0 1px rgba(255, 86, 44, 0.35);
}

/* ── Icon ────────────────────────────────────────────────────── */
.gs-icon {
  color: var(--k-surface-bright);
  transition: color 0.15s ease;
}

.gs-icon--selected {
  color: var(--k-primary-container);
}

/* ── Label ───────────────────────────────────────────────────── */
.gs-label {
  font-family: var(--k-font-headline);
  font-size: var(--k-body-md);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  line-height: 1.2;
}

/* ── Check badge ─────────────────────────────────────────────── */
.gs-check {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 20px;
  height: 20px;
  border-radius: var(--k-radius-sm);
  background-color: var(--k-primary-container);
  color: var(--k-on-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
