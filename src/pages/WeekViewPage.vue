<template>
  <PageShell :loading="loading">
    <div v-if="!week" class="text-center q-pa-xl">
      <q-icon name="view_week" size="64px" color="grey-6" />
      <h6 class="q-mt-md text-grey-6">Semana no encontrada</h6>
      <q-btn color="primary" label="Volver al plan" to="/plan" class="q-mt-md" />
    </div>

    <template v-else>
      <div class="row items-center q-mb-md">
        <q-btn flat round icon="arrow_back" to="/plan" />
        <div class="text-h6 q-ml-sm">Semana {{ week.weekNumber }} — {{ week.theme }}</div>
      </div>

      <q-list separator>
        <q-item
          v-for="day in week.days"
          :key="day.dayNumber"
          :clickable="day.dayType === 'training'"
          @click="day.dayType === 'training' && day.session && $router.push(`/plan/session/${day.session.id}`)"
        >
          <q-item-section avatar>
            <q-avatar
              :color="getDayColor(day.dayType)"
              text-color="white"
              size="40px"
            >
              <q-icon :name="getDayIcon(day.dayType)" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label>Dia {{ day.dayNumber }}</q-item-label>
            <q-item-label v-if="day.dayType === 'training' && day.session" caption>
              {{ day.session.title }}
            </q-item-label>
            <q-item-label v-else-if="day.dayType === 'active_rest'" caption>
              Descanso activo
            </q-item-label>
            <q-item-label v-else caption>
              Descanso
            </q-item-label>
          </q-item-section>

          <q-item-section v-if="day.dayType === 'training' && day.session" side>
            <div class="text-caption text-grey-6">
              {{ day.session.targetMuscleGroups.join(', ') }}
            </div>
            <div class="text-caption text-grey-7">
              ~{{ day.session.estimatedDurationMinutes }} min
            </div>
          </q-item-section>

          <q-item-section v-if="day.dayType === 'training'" side>
            <q-icon name="chevron_right" color="grey-6" />
          </q-item-section>
        </q-item>
      </q-list>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from '../components/layout/PageShell.vue'
import { usePlanStore } from '../stores/plan'
import type { Week } from '../types/plan'
import type { DayType } from '../types/enums'

const route = useRoute()
const planStore = usePlanStore()
const loading = ref(true)
const week = ref<Week | undefined>(undefined)

function getDayColor(dayType: DayType): string {
  switch (dayType) {
    case 'training': return 'primary'
    case 'active_rest': return 'orange'
    case 'rest': return 'grey-5'
    default: return 'grey-5'
  }
}

function getDayIcon(dayType: DayType): string {
  switch (dayType) {
    case 'training': return 'fitness_center'
    case 'active_rest': return 'self_improvement'
    case 'rest': return 'hotel'
    default: return 'hotel'
  }
}

onMounted(async () => {
  await planStore.loadActivePlan()
  const weekNumber = Number(route.params.weekNumber)
  week.value = planStore.getWeek(weekNumber)
  loading.value = false
})
</script>
