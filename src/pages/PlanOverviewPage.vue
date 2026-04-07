<template>
  <PageShell :loading="loading">
    <div v-if="!planStore.activePlan" class="text-center q-pa-xl">
      <q-icon name="calendar_month" size="64px" color="grey-6" />
      <h6 class="q-mt-md text-grey-6">No tienes un plan activo</h6>
      <q-btn color="primary" label="Ir al dashboard" to="/dashboard" class="q-mt-md" />
    </div>

    <template v-else>
      <div class="text-h6 q-mb-md">{{ planStore.activePlan.name }}</div>
      <div class="row q-col-gutter-md">
        <div v-for="week in planStore.activePlan.weeks" :key="week.weekNumber" class="col-6 col-md-4">
          <q-card
            flat bordered clickable class="cursor-pointer"
            :class="{ 'border-primary': week.weekNumber === planStore.getCurrentWeekNumber() }"
            @click="$router.push(`/plan/week/${week.weekNumber}`)"
          >
            <q-card-section>
              <div class="row items-center justify-between">
                <q-badge :color="getWeekColor(week.weekNumber)" :label="`Semana ${week.weekNumber}`" />
                <q-icon v-if="week.weekNumber < planStore.getCurrentWeekNumber()" name="check_circle" color="green" />
              </div>
              <div class="text-subtitle2 q-mt-sm">{{ week.theme }}</div>
              <div class="text-caption text-grey-6">
                {{ week.days.filter(d => d.dayType === 'training').length }} dias de entrenamiento
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import { usePlanStore } from '../stores/plan'

const planStore = usePlanStore()
const loading = ref(true)

function getWeekColor(weekNumber: number): string {
  const current = planStore.getCurrentWeekNumber()
  if (weekNumber === current) return 'primary'
  if (weekNumber < current) return 'green'
  return 'grey-7'
}

onMounted(async () => {
  await planStore.loadActivePlan()
  loading.value = false
})
</script>
