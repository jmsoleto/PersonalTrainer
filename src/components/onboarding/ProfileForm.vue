<template>
  <div>
    <h6 class="q-mb-md">Sobre ti</h6>

    <q-input
      v-model="form.name"
      label="Nombre"
      outlined
      :rules="[val => !!val && val.trim().length > 0 || 'Introduce tu nombre']"
      class="q-mb-md"
    />

    <q-select
      v-model="form.gender"
      :options="genderOptions"
      label="Genero"
      emit-value
      map-options
      outlined
      class="q-mb-md"
    />

    <q-input
      v-model.number="form.age"
      type="number"
      label="Edad"
      outlined
      :rules="[val => val > 0 && val < 120 || 'Edad no valida']"
      class="q-mb-md"
    />

    <q-input
      v-model.number="form.weightKg"
      type="number"
      :label="unitSystem === 'metric' ? 'Peso (kg)' : 'Peso (lbs)'"
      outlined
      :rules="[val => val > 0 || 'Peso no valido']"
      class="q-mb-md"
    />

    <q-input
      v-model.number="form.heightCm"
      type="number"
      :label="unitSystem === 'metric' ? 'Altura (cm)' : 'Altura (in)'"
      outlined
      :rules="[val => val > 0 || 'Altura no valida']"
      class="q-mb-md"
    />

    <q-select
      v-model="form.fitnessLevel"
      :options="fitnessLevelOptions"
      label="Condicion fisica"
      emit-value
      map-options
      outlined
      class="q-mb-md"
    />

    <q-toggle
      v-model="useImperial"
      label="Usar sistema imperial (lbs/in)"
      class="q-mb-md"
    />
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
const unitSystem = computed(() => useImperial.value ? 'imperial' : 'metric')

const form = reactive({
  name: '',
  gender: Gender.Male,
  age: 30,
  weightKg: 70,
  heightCm: 170,
  fitnessLevel: FitnessLevel.Beginner,
})

const genderOptions = [
  { label: 'Masculino', value: Gender.Male },
  { label: 'Femenino', value: Gender.Female },
  { label: 'Otro', value: Gender.Other },
  { label: 'Prefiero no decirlo', value: Gender.PreferNotToSay },
]

const fitnessLevelOptions = [
  { label: 'Principiante', value: FitnessLevel.Beginner },
  { label: 'Intermedio', value: FitnessLevel.Intermediate },
  { label: 'Avanzado', value: FitnessLevel.Advanced },
]

watch(form, () => {
  const weightKg = useImperial.value ? form.weightKg * 0.453592 : form.weightKg
  const heightCm = useImperial.value ? form.heightCm * 2.54 : form.heightCm

  emit('update', {
    name: form.name.trim(),
    gender: form.gender,
    age: form.age,
    weightKg: Math.round(weightKg * 10) / 10,
    heightCm: Math.round(heightCm * 10) / 10,
    fitnessLevel: form.fitnessLevel,
  })
}, { immediate: true, deep: true })
</script>
