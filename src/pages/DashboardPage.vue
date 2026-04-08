<template>
  <PageShell :loading="loading">
    <!-- Welcome -->
    <div class="q-mb-lg">
      <h5 class="q-mb-xs">Hola{{ userName ? ', ' + userName : '' }}</h5>
      <p class="text-grey-6">{{ todayDate }}</p>
    </div>

    <!-- No plan yet -->
    <template v-if="!planStore.activePlan">
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="text-center q-pa-xl">
          <q-icon name="rocket_launch" size="64px" color="primary" />
          <h6 class="q-mt-md">Genera tu plan de entrenamiento</h6>
          <p class="text-grey-6">
            Configura tu API key y genera tu plan personalizado de 12 semanas con IA
          </p>
          <div class="q-gutter-sm q-mt-md">
            <q-btn
              v-if="!settingsStore.settings.apiKey"
              color="grey-7"
              label="Configurar API Key"
              icon="key"
              to="/settings"
            />
            <q-btn
              color="primary"
              label="Generar Plan"
              icon="auto_awesome"
              :loading="planStore.generating"
              :disable="!settingsStore.settings.apiKey"
              @click="generatePlan"
            />
            <q-btn
              outline
              color="primary"
              label="Importar Plan"
              icon="upload_file"
              :loading="importingPlan"
              @click="triggerPlanImport"
            />
            <input
              ref="planFileInput"
              type="file"
              accept=".json"
              style="display: none"
              @change="handlePlanImport"
            />
          </div>

          <!-- Generation progress -->
          <div v-if="planStore.generating" class="q-mt-md">
            <q-linear-progress
              indeterminate
              color="primary"
              rounded
              class="q-mb-sm"
              style="height: 8px"
            />
            <p class="text-caption text-grey-6 text-center q-mb-none">
              {{ planStore.generationProgress?.status ?? 'Generando plan...' }}
            </p>
          </div>
        </q-card-section>
      </q-card>
    </template>

    <!-- Active plan -->
    <template v-else>
      <!-- Current week -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row items-center justify-between">
            <div>
              <div class="text-overline text-primary">SEMANA {{ planStore.getCurrentWeekNumber() }} DE {{ planStore.activePlan?.totalWeeks ?? 12 }}</div>
              <div class="text-subtitle1">{{ planStore.currentWeek?.theme || 'Plan activo' }}</div>
            </div>
            <q-circular-progress
              :value="weekProgress"
              size="56px"
              :thickness="0.3"
              color="primary"
              track-color="grey-8"
            >
              <span class="text-caption">{{ weekProgress }}%</span>
            </q-circular-progress>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions>
          <q-btn flat color="primary" label="Ver plan completo" to="/plan" />
          <q-btn
            flat
            label="Semana actual"
            :to="`/plan/week/${planStore.getCurrentWeekNumber()}`"
          />
        </q-card-actions>
      </q-card>

      <!-- Today's session -->
      <q-card v-if="todaySession" flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-overline">HOY</div>
          <div class="text-h6">{{ todaySession.title }}</div>
          <div class="text-grey-6">
            {{ todaySession.estimatedDurationMinutes }} min ·
            {{ todaySession.mainWorkout.length }} ejercicios
          </div>
          <div class="q-mt-sm">
            <q-chip
              v-for="mg in todaySession.targetMuscleGroups"
              :key="mg"
              dense
              size="sm"
              outline
            >
              {{ mg }}
            </q-chip>
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn
            color="primary"
            label="Empezar sesion"
            icon="play_arrow"
            :to="`/plan/session/${todaySession.id}`"
          />
        </q-card-actions>
      </q-card>

      <q-card v-else flat bordered class="q-mb-md">
        <q-card-section class="text-center">
          <q-icon name="spa" size="36px" color="green" />
          <p class="q-mt-sm text-grey-6">Hoy es dia de descanso</p>
        </q-card-section>
      </q-card>
    </template>

    <!-- Quick actions -->
    <div class="row q-col-gutter-md q-mt-sm">
      <div class="col-6">
        <q-card flat bordered clickable class="cursor-pointer" @click="$router.push('/measurements')">
          <q-card-section class="text-center">
            <q-icon name="straighten" size="28px" color="blue" />
            <div class="text-caption q-mt-xs">Medidas</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6">
        <q-card flat bordered clickable class="cursor-pointer" @click="$router.push('/achievements')">
          <q-card-section class="text-center">
            <q-icon name="emoji_events" size="28px" color="amber" />
            <div class="text-caption q-mt-xs">Logros</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6">
        <q-card flat bordered clickable class="cursor-pointer" @click="$router.push('/exercises')">
          <q-card-section class="text-center">
            <q-icon name="fitness_center" size="28px" color="orange" />
            <div class="text-caption q-mt-xs">Ejercicios</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6">
        <q-card flat bordered clickable class="cursor-pointer" @click="$router.push('/stats')">
          <q-card-section class="text-center">
            <q-icon name="bar_chart" size="28px" color="purple" />
            <div class="text-caption q-mt-xs">Estadisticas</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import { useUserStore } from '../stores/user'
import { usePlanStore } from '../stores/plan'
import { useSettingsStore } from '../stores/settings'
import { useSessionStore } from '../stores/session'
import { Notify } from 'quasar'

const userStore = useUserStore()
const planStore = usePlanStore()
const settingsStore = useSettingsStore()
const sessionStore = useSessionStore()
const loading = ref(true)

onMounted(async () => {
  await Promise.all([
    userStore.loadUser(),
    planStore.loadActivePlan(),
  ])
  await loadWeekProgress()
  loading.value = false
})

const userName = computed(() => {
  return userStore.currentUser?.name ?? ''
})

const todayDate = computed(() => {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
})

const todaySession = computed(() => {
  if (!planStore.currentWeek) return null
  const dayOfWeek = new Date().getDay() || 7 // 1=Mon ... 7=Sun
  const today = planStore.currentWeek.days.find(d => d.dayNumber === dayOfWeek)
  return today?.session ?? null
})

const weekProgress = computed(() => {
  if (!planStore.currentWeek || !planStore.activePlan) return 0
  const weekNum = planStore.getCurrentWeekNumber()
  const trainingDays = planStore.currentWeek.days.filter(d => d.dayType === 'training').length
  if (trainingDays === 0) return 100
  const completedCount = completedThisWeek.value
  return Math.round((completedCount / trainingDays) * 100)
})

const importingPlan = ref(false)
const planFileInput = ref<HTMLInputElement | null>(null)
const completedThisWeek = ref(0)

async function loadWeekProgress() {
  if (!planStore.activePlan) return
  const weekNum = planStore.getCurrentWeekNumber()
  const sessions = await sessionStore.getCompletedSessions(planStore.activePlan.id)
  completedThisWeek.value = sessions.filter(s => s.weekNumber === weekNum).length
}

function triggerPlanImport(): void {
  planFileInput.value?.click()
}

async function handlePlanImport(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  importingPlan.value = true
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    await planStore.importExternalPlan(data)
    await loadWeekProgress()
    Notify.create({
      message: 'Plan importado correctamente',
      color: 'positive',
      icon: 'check_circle',
    })
  } catch (e) {
    Notify.create({
      message: e instanceof Error ? e.message : 'Error al importar el plan',
      color: 'negative',
      icon: 'error',
    })
  } finally {
    importingPlan.value = false
    target.value = ''
  }
}

async function generatePlan() {
  try {
    await planStore.generatePlan()
    Notify.create({
      message: 'Plan generado correctamente',
      color: 'positive',
      icon: 'check_circle',
    })
  } catch (e) {
    Notify.create({
      message: planStore.error || 'Error al generar el plan',
      color: 'negative',
      icon: 'error',
    })
  }
}
</script>
