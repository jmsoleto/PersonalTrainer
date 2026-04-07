<template>
  <PageShell :loading="store.loading">
    <div class="text-h6 q-mb-md">Medidas Corporales</div>

    <!-- Add measurement button -->
    <q-btn
      color="primary"
      icon="add"
      label="Nueva medida"
      unelevated
      class="q-mb-lg full-width"
      @click="showForm = true"
    />

    <!-- Charts section -->
    <template v-if="store.sorted.length >= 2">
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Evolucion de peso</div>
          <Line :data="weightChartData" :options="chartOptions" />
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Medidas corporales</div>
          <Line :data="bodyChartData" :options="chartOptions" />
        </q-card-section>
      </q-card>
    </template>

    <div v-else-if="store.sorted.length === 1" class="text-caption text-grey-6 text-center q-mb-md">
      Registra al menos 2 medidas para ver graficas de evolucion
    </div>

    <!-- Measurement history -->
    <div class="text-subtitle1 q-mb-sm">Historial</div>

    <div v-if="store.sorted.length === 0" class="text-center q-pa-lg">
      <q-icon name="straighten" size="48px" color="grey-5" />
      <p class="text-grey-6 q-mt-sm">Sin medidas registradas</p>
    </div>

    <q-card
      v-for="m in reversedMeasurements"
      :key="m.id"
      flat bordered
      class="q-mb-sm"
    >
      <q-card-section>
        <div class="row items-center justify-between q-mb-xs">
          <div class="text-subtitle2">{{ formatDate(m.date) }}</div>
          <div>
            <q-btn flat round dense icon="edit" size="sm" @click="editMeasurement(m)" />
            <q-btn flat round dense icon="delete" size="sm" color="negative" @click="confirmDelete(m.id)" />
          </div>
        </div>
        <div class="row q-gutter-md text-caption">
          <span v-if="m.weightKg"><strong>Peso:</strong> {{ m.weightKg }} kg</span>
          <span v-if="m.bodyFatPercent"><strong>Grasa:</strong> {{ m.bodyFatPercent }}%</span>
          <span v-if="m.waistCm"><strong>Cintura:</strong> {{ m.waistCm }} cm</span>
          <span v-if="m.chestCm"><strong>Pecho:</strong> {{ m.chestCm }} cm</span>
          <span v-if="m.leftArmCm"><strong>Brazo izq:</strong> {{ m.leftArmCm }} cm</span>
          <span v-if="m.rightArmCm"><strong>Brazo der:</strong> {{ m.rightArmCm }} cm</span>
          <span v-if="m.leftThighCm"><strong>Muslo izq:</strong> {{ m.leftThighCm }} cm</span>
          <span v-if="m.rightThighCm"><strong>Muslo der:</strong> {{ m.rightThighCm }} cm</span>
          <span v-if="m.hipsCm"><strong>Cadera:</strong> {{ m.hipsCm }} cm</span>
        </div>
        <div v-if="m.notes" class="text-caption text-grey-6 q-mt-xs">{{ m.notes }}</div>
      </q-card-section>
    </q-card>

    <!-- Add/Edit dialog -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">{{ editingId ? 'Editar medida' : 'Nueva medida' }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="form.date"
            label="Fecha"
            type="date"
            dense outlined
            class="q-mb-sm"
          />
          <div class="row q-gutter-sm">
            <q-input
              v-model.number="form.weightKg"
              label="Peso (kg)"
              type="number"
              dense outlined
              class="col"
            />
            <q-input
              v-model.number="form.bodyFatPercent"
              label="Grasa (%)"
              type="number"
              dense outlined
              class="col"
            />
          </div>
          <div class="row q-gutter-sm q-mt-xs">
            <q-input
              v-model.number="form.waistCm"
              label="Cintura (cm)"
              type="number"
              dense outlined
              class="col"
            />
            <q-input
              v-model.number="form.chestCm"
              label="Pecho (cm)"
              type="number"
              dense outlined
              class="col"
            />
          </div>
          <div class="row q-gutter-sm q-mt-xs">
            <q-input
              v-model.number="form.leftArmCm"
              label="Brazo izq (cm)"
              type="number"
              dense outlined
              class="col"
            />
            <q-input
              v-model.number="form.rightArmCm"
              label="Brazo der (cm)"
              type="number"
              dense outlined
              class="col"
            />
          </div>
          <div class="row q-gutter-sm q-mt-xs">
            <q-input
              v-model.number="form.leftThighCm"
              label="Muslo izq (cm)"
              type="number"
              dense outlined
              class="col"
            />
            <q-input
              v-model.number="form.rightThighCm"
              label="Muslo der (cm)"
              type="number"
              dense outlined
              class="col"
            />
          </div>
          <div class="row q-gutter-sm q-mt-xs">
            <q-input
              v-model.number="form.hipsCm"
              label="Cadera (cm)"
              type="number"
              dense outlined
              class="col"
            />
          </div>
          <q-input
            v-model="form.notes"
            label="Notas (opcional)"
            type="textarea"
            autogrow
            dense outlined
            class="q-mt-sm"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="closeForm" />
          <q-btn color="primary" :label="editingId ? 'Guardar' : 'Registrar'" @click="saveMeasurement" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import PageShell from '../components/layout/PageShell.vue'
import { useMeasurementsStore } from '../stores/measurements'
import { checkAchievements } from '../composables/useAchievementChecker'
import type { BodyMeasurement } from '../types/measurement'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const $q = useQuasar()
const store = useMeasurementsStore()

const showForm = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  weightKg: undefined as number | undefined,
  bodyFatPercent: undefined as number | undefined,
  waistCm: undefined as number | undefined,
  chestCm: undefined as number | undefined,
  leftArmCm: undefined as number | undefined,
  rightArmCm: undefined as number | undefined,
  leftThighCm: undefined as number | undefined,
  rightThighCm: undefined as number | undefined,
  hipsCm: undefined as number | undefined,
  notes: '',
})

const form = ref(emptyForm())

const reversedMeasurements = computed(() => [...store.sorted].reverse())

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  scales: {
    y: { beginAtZero: false },
  },
}

const weightChartData = computed(() => {
  const data = store.sorted.filter(m => m.weightKg)
  return {
    labels: data.map(m => formatDate(m.date)),
    datasets: [
      {
        label: 'Peso (kg)',
        data: data.map(m => m.weightKg ?? null),
        borderColor: '#E94560',
        backgroundColor: 'rgba(233, 69, 96, 0.1)',
        tension: 0.3,
        fill: true,
      },
      ...(data.some(m => m.bodyFatPercent)
        ? [{
            label: 'Grasa corporal (%)',
            data: data.map(m => m.bodyFatPercent ?? null),
            borderColor: '#FFA726',
            backgroundColor: 'rgba(255, 167, 38, 0.1)',
            tension: 0.3,
            fill: false,
          }]
        : []),
    ],
  }
})

const bodyChartData = computed(() => {
  const data = store.sorted
  const datasets: { label: string; data: (number | null)[]; borderColor: string; tension: number }[] = []
  const colors = ['#42A5F5', '#66BB6A', '#AB47BC', '#EF5350', '#FFA726', '#26C6DA', '#8D6E63']

  const fields: { key: keyof BodyMeasurement; label: string }[] = [
    { key: 'waistCm', label: 'Cintura' },
    { key: 'chestCm', label: 'Pecho' },
    { key: 'leftArmCm', label: 'Brazo izq' },
    { key: 'rightArmCm', label: 'Brazo der' },
    { key: 'leftThighCm', label: 'Muslo izq' },
    { key: 'rightThighCm', label: 'Muslo der' },
    { key: 'hipsCm', label: 'Cadera' },
  ]

  fields.forEach((field, i) => {
    if (data.some(m => m[field.key] !== undefined)) {
      datasets.push({
        label: field.label + ' (cm)',
        data: data.map(m => (m[field.key] as number | undefined) ?? null),
        borderColor: colors[i % colors.length],
        tension: 0.3,
      })
    }
  })

  return {
    labels: data.map(m => formatDate(m.date)),
    datasets,
  }
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function editMeasurement(m: BodyMeasurement) {
  editingId.value = m.id
  form.value = {
    date: m.date,
    weightKg: m.weightKg,
    bodyFatPercent: m.bodyFatPercent,
    waistCm: m.waistCm,
    chestCm: m.chestCm,
    leftArmCm: m.leftArmCm,
    rightArmCm: m.rightArmCm,
    leftThighCm: m.leftThighCm,
    rightThighCm: m.rightThighCm,
    hipsCm: m.hipsCm,
    notes: m.notes ?? '',
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  form.value = emptyForm()
}

function buildMeasurementData(): Omit<BodyMeasurement, 'id'> {
  const data: Record<string, unknown> = { date: form.value.date }
  if (form.value.weightKg) data.weightKg = form.value.weightKg
  if (form.value.bodyFatPercent) data.bodyFatPercent = form.value.bodyFatPercent
  if (form.value.waistCm) data.waistCm = form.value.waistCm
  if (form.value.chestCm) data.chestCm = form.value.chestCm
  if (form.value.leftArmCm) data.leftArmCm = form.value.leftArmCm
  if (form.value.rightArmCm) data.rightArmCm = form.value.rightArmCm
  if (form.value.leftThighCm) data.leftThighCm = form.value.leftThighCm
  if (form.value.rightThighCm) data.rightThighCm = form.value.rightThighCm
  if (form.value.hipsCm) data.hipsCm = form.value.hipsCm
  if (form.value.notes) data.notes = form.value.notes
  return data as Omit<BodyMeasurement, 'id'>
}

async function saveMeasurement() {
  try {
    const data = buildMeasurementData()
    if (editingId.value) {
      await store.updateMeasurement(editingId.value, data)
      $q.notify({ type: 'positive', message: 'Medida actualizada' })
    } else {
      await store.addMeasurement(data)
      $q.notify({ type: 'positive', message: 'Medida registrada' })
      checkAchievements()
    }
    closeForm()
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar la medida' })
  }
}

function confirmDelete(id: string) {
  $q.dialog({
    title: 'Eliminar medida',
    message: 'Estas seguro de que quieres eliminar esta medida?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
  }).onOk(async () => {
    await store.deleteMeasurement(id)
    $q.notify({ type: 'positive', message: 'Medida eliminada' })
  })
}

onMounted(() => {
  store.loadMeasurements()
})
</script>
