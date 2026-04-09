<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card style="min-width: 350px; max-width: 500px; width: 90vw">
      <q-card-section>
        <div class="text-h6">Configurar plan</div>
        <div class="text-caption text-grey-6">Personaliza los parámetros antes de generar</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <!-- Semanas -->
        <div class="q-mb-md">
          <div class="row justify-between items-center q-mb-xs">
            <span class="text-body2">Duración del plan</span>
            <span class="text-body2 text-weight-medium text-primary">{{ form.weeks }} semanas</span>
          </div>
          <q-slider
            v-model="form.weeks"
            :min="4"
            :max="24"
            :step="1"
            color="primary"
            track-color="grey-3"
          />
          <div class="row justify-between text-caption text-grey-6">
            <span>4</span>
            <span>24</span>
          </div>
        </div>

        <!-- Días por semana -->
        <q-select
          v-model="form.daysPerWeek"
          :options="daysOptions"
          label="Días por semana"
          emit-value
          map-options
          outlined
          dense
          class="q-mb-md"
        />

        <!-- Duración de sesión -->
        <div class="q-mb-md">
          <div class="row justify-between items-center q-mb-xs">
            <span class="text-body2">Duración por sesión</span>
            <span class="text-body2 text-weight-medium text-primary">{{ form.sessionDurationMin }} min</span>
          </div>
          <q-slider
            v-model="form.sessionDurationMin"
            :min="20"
            :max="120"
            :step="5"
            color="primary"
            track-color="grey-3"
          />
          <div class="row justify-between text-caption text-grey-6">
            <span>20 min</span>
            <span>120 min</span>
          </div>
        </div>

        <!-- Estilo de entrenamiento -->
        <q-select
          v-model="form.trainingStyle"
          :options="trainingStyleOptions"
          label="Estilo de entrenamiento (opcional)"
          emit-value
          map-options
          outlined
          dense
          clearable
          class="q-mb-md"
        />

        <!-- Notas adicionales -->
        <q-input
          v-model="form.additionalNotes"
          label="Notas adicionales (opcional)"
          type="textarea"
          autogrow
          outlined
          dense
          placeholder="Ej: prefiero ejercicios compuestos, evitar saltos, entrenar por la mañana..."
        />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Cancelar" @click="handleCancel" />
        <q-btn color="primary" label="Generar" icon="auto_awesome" @click="handleConfirm" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useSettingsStore } from '../../stores/settings'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [params: {
    weeks: number
    daysPerWeek: number
    sessionDurationMin: number
    trainingStyle: string
    additionalNotes: string
  }]
}>()

const settingsStore = useSettingsStore()

const form = reactive({
  weeks: settingsStore.settings.planWeeks,
  daysPerWeek: settingsStore.settings.daysPerWeek,
  sessionDurationMin: settingsStore.settings.sessionDurationMin,
  trainingStyle: '',
  additionalNotes: '',
})

watch(() => props.modelValue, (open) => {
  if (open) {
    form.weeks = settingsStore.settings.planWeeks
    form.daysPerWeek = settingsStore.settings.daysPerWeek
    form.sessionDurationMin = settingsStore.settings.sessionDurationMin
    form.trainingStyle = ''
    form.additionalNotes = ''
  }
})

const daysOptions = [
  { label: 'Auto (según nivel de forma)', value: 0 },
  { label: '1 día', value: 1 },
  { label: '2 días', value: 2 },
  { label: '3 días', value: 3 },
  { label: '4 días', value: 4 },
  { label: '5 días', value: 5 },
  { label: '6 días', value: 6 },
  { label: '7 días', value: 7 },
]

const trainingStyleOptions = [
  { label: 'Sin preferencia', value: '' },
  { label: 'Funcional', value: 'Funcional' },
  { label: 'Culturismo (Bodybuilding)', value: 'Culturismo' },
  { label: 'Fuerza (Powerlifting)', value: 'Fuerza' },
  { label: 'Resistencia / Cardio', value: 'Resistencia' },
  { label: 'HIIT', value: 'HIIT' },
  { label: 'Calistenia', value: 'Calistenia' },
  { label: 'Yoga y Movilidad', value: 'Yoga y Movilidad' },
]

function handleCancel() {
  emit('update:modelValue', false)
}

function handleConfirm() {
  emit('confirm', {
    weeks: form.weeks,
    daysPerWeek: form.daysPerWeek,
    sessionDurationMin: form.sessionDurationMin,
    trainingStyle: form.trainingStyle,
    additionalNotes: form.additionalNotes,
  })
  emit('update:modelValue', false)
}
</script>
