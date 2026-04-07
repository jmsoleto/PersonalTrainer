<template>
  <q-card style="min-width: 320px">
    <q-card-section class="text-center">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6">Temporizador de descanso</div>
        <q-btn flat round dense icon="close" @click="$emit('close')" />
      </div>

      <!-- Circular progress with time -->
      <div class="q-my-lg flex flex-center">
        <q-circular-progress
          :value="progressValue"
          size="180px"
          :thickness="0.15"
          color="primary"
          track-color="grey-3"
          show-value
        >
          <div class="text-h3 text-weight-bold">{{ formattedTime }}</div>
        </q-circular-progress>
      </div>

      <!-- Completed message -->
      <div v-if="completed" class="text-positive text-h6 q-mb-md">
        Descanso completado!
      </div>

      <!-- Preset buttons -->
      <div class="row justify-center q-gutter-sm q-mb-lg">
        <q-btn
          v-for="preset in presets"
          :key="preset"
          outline
          rounded
          color="primary"
          :label="`${preset}s`"
          @click="startTimer(preset)"
        />
      </div>

      <!-- Controls -->
      <div class="row justify-center q-gutter-md">
        <q-btn
          round
          :icon="isRunning ? 'pause' : 'play_arrow'"
          color="primary"
          size="lg"
          :disable="seconds === 0 && !isRunning"
          @click="isRunning ? pause() : (seconds > 0 ? resume() : null)"
        />
        <q-btn
          round
          icon="stop"
          color="negative"
          size="lg"
          :disable="seconds === 0 && !isRunning"
          @click="handleReset"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTimer } from '../../composables/useTimer'

defineEmits<{
  close: []
}>()

const presets = [30, 60, 90, 120]
const totalDuration = ref(0)
const completed = ref(false)

const { seconds, isRunning, start, pause, resume, reset, formattedTime } = useTimer(() => {
  navigator.vibrate?.(200)
  completed.value = true
})

const progressValue = computed(() => {
  if (totalDuration.value === 0) return 0
  return (seconds.value / totalDuration.value) * 100
})

function startTimer(duration: number) {
  completed.value = false
  totalDuration.value = duration
  start(duration)
}

function handleReset() {
  completed.value = false
  totalDuration.value = 0
  reset()
}
</script>
