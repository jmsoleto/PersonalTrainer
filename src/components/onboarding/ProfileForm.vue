<template>
  <div class="pf-form">

    <div class="pf-field">
      <label class="pf-label">Nombre</label>
      <input
        v-model="form.name"
        class="pf-input"
        type="text"
        placeholder="Tu nombre"
        autocomplete="given-name"
      />
    </div>

    <div class="pf-row">
      <div class="pf-field">
        <label class="pf-label">Género</label>
        <select v-model="form.gender" class="pf-input pf-select">
          <option v-for="o in genderOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <div class="pf-field">
        <label class="pf-label">Condición física</label>
        <select v-model="form.fitnessLevel" class="pf-input pf-select">
          <option v-for="o in fitnessLevelOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
    </div>

    <div class="pf-row">
      <div class="pf-field">
        <label class="pf-label">Edad</label>
        <input v-model.number="form.age" class="pf-input" type="number" min="1" max="120" />
      </div>

      <div class="pf-field">
        <label class="pf-label">{{ useImperial ? 'Peso (lbs)' : 'Peso (kg)' }}</label>
        <input v-model.number="form.weightKg" class="pf-input" type="number" min="1" />
      </div>

      <div class="pf-field">
        <label class="pf-label">{{ useImperial ? 'Altura (in)' : 'Altura (cm)' }}</label>
        <input v-model.number="form.heightCm" class="pf-input" type="number" min="1" />
      </div>
    </div>

    <!-- Imperial toggle -->
    <button
      :class="['pf-toggle', { 'pf-toggle--on': useImperial }]"
      type="button"
      @click="useImperial = !useImperial"
    >
      <span class="pf-toggle-track">
        <span class="pf-toggle-thumb" />
      </span>
      <span class="pf-toggle-label">Sistema imperial (lbs / in)</span>
    </button>

  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { Gender, FitnessLevel } from '../../types/enums'

const emit = defineEmits<{
  update: [data: {
    name: string
    gender: Gender
    age: number
    weightKg: number
    heightCm: number
    fitnessLevel: FitnessLevel
  }]
}>()

const useImperial = ref(false)

const form = reactive({
  name: '',
  gender: Gender.Male,
  age: 30,
  weightKg: 70,
  heightCm: 170,
  fitnessLevel: FitnessLevel.Beginner,
})

const genderOptions = [
  { label: 'Masculino',           value: Gender.Male },
  { label: 'Femenino',            value: Gender.Female },
  { label: 'Otro',                value: Gender.Other },
  { label: 'Prefiero no decirlo', value: Gender.PreferNotToSay },
]

const fitnessLevelOptions = [
  { label: 'Principiante', value: FitnessLevel.Beginner },
  { label: 'Intermedio',   value: FitnessLevel.Intermediate },
  { label: 'Avanzado',     value: FitnessLevel.Advanced },
]

watch(form, () => {
  const weightKg = useImperial.value ? form.weightKg * 0.453592 : form.weightKg
  const heightCm = useImperial.value ? form.heightCm * 2.54     : form.heightCm

  emit('update', {
    name:         form.name.trim(),
    gender:       form.gender,
    age:          form.age,
    weightKg:     Math.round(weightKg * 10) / 10,
    heightCm:     Math.round(heightCm * 10) / 10,
    fitnessLevel: form.fitnessLevel,
  })
}, { immediate: true, deep: true })
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────── */
.pf-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pf-row {
  display: flex;
  gap: 0.75rem;
}

.pf-row .pf-field {
  flex: 1;
}

/* ── Field ───────────────────────────────────────────────────── */
.pf-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pf-label {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-secondary);
}

.pf-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--k-radius-md);
  border: none;
  background-color: var(--k-surface-highest);
  color: var(--k-on-surface);
  font-family: var(--k-font-body);
  font-size: var(--k-body-lg);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}

.pf-input:focus {
  background-color: var(--k-surface-bright);
  box-shadow: 0 0 0 1px rgba(255, 86, 44, 0.4); /* primary-container al 40% */
}

.pf-input::placeholder {
  color: var(--k-outline);
}

/* Chrome number arrows */
.pf-input[type='number']::-webkit-inner-spin-button,
.pf-input[type='number']::-webkit-outer-spin-button {
  opacity: 0.4;
  filter: invert(1);
}

/* Select arrow */
.pf-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23c1c7cf' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 2.5rem;
  cursor: pointer;
}

.pf-select option {
  background-color: var(--k-surface-highest);
  color: var(--k-on-surface);
}

/* ── Toggle ──────────────────────────────────────────────────── */
.pf-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  margin-top: 0.25rem;
}

.pf-toggle-track {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background-color: var(--k-surface-highest);
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.pf-toggle--on .pf-toggle-track {
  background-color: var(--k-primary-container);
}

.pf-toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--k-secondary);
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.pf-toggle--on .pf-toggle-thumb {
  transform: translateX(18px);
  background-color: var(--k-on-primary-container);
}

.pf-toggle-label {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
}
</style>
