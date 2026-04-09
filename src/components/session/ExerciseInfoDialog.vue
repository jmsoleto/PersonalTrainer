<template>
  <q-dialog ref="dialogRef" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card style="max-width: 600px; width: 100%; margin: auto;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ exercise.name }}</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="onDialogHide" />
      </q-card-section>

      <q-card-section class="q-pt-sm scroll" style="max-height: calc(100vh - 80px)">
        <!-- Video -->
        <div class="text-subtitle2 q-mb-sm">Video</div>
        <ExerciseVideoSection
          :exercise-id="exercise.id"
          :exercise-name="exercise.name"
          class="q-mb-md"
        />

        <!-- Instructions -->
        <div class="text-subtitle2 q-mb-sm">Instrucciones</div>
        <q-list dense>
          <q-item
            v-for="(step, index) in exercise.instructions"
            :key="index"
            class="q-px-none"
          >
            <q-item-section avatar style="min-width: 36px">
              <q-avatar color="primary" text-color="white" size="26px" font-size="12px">
                {{ index + 1 }}
              </q-avatar>
            </q-item-section>
            <q-item-section>{{ step }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import ExerciseVideoSection from '../exercises/ExerciseVideoSection.vue'
import type { Exercise } from '../../types/exercise'

defineProps<{ exercise: Exercise }>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide } = useDialogPluginComponent()
</script>
