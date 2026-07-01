<template>
  <PageShell :loading="store.loading">

    <!-- ── Header ────────────────────────────────────────────────── -->
    <header class="mp-header">
      <span class="mp-overline">Seguimiento</span>
      <h1 class="mp-title">Medidas corporales</h1>
    </header>

    <!-- ── CTA ───────────────────────────────────────────────────── -->
    <div class="mp-cta-row">
      <button class="mp-btn mp-btn--cta" @click="showForm = true">
        <q-icon name="add" size="18px" />
        Nueva medida
      </button>
      <button class="mp-btn mp-btn--ghost mp-btn--rand" @click="generateRandom" title="Generar medida aleatoria para pruebas">
        <q-icon name="casino" size="18px" />
      </button>
    </div>

    <!-- ── Charts ────────────────────────────────────────────────── -->
    <template v-if="metricCharts.length > 0">
      <div v-for="chart in metricCharts" :key="chart.label" class="mp-chart-card">
        <span class="mp-chart-label">{{ chart.label }}</span>
        <Line :data="chart.chartData" :options="chart.options" />
      </div>
    </template>
    <p v-else-if="store.sorted.length >= 1" class="mp-hint">
      Registra al menos 2 medidas para ver gráficas de evolución.
    </p>

    <!-- ── History label ─────────────────────────────────────────── -->
    <span class="mp-section-label">Historial</span>

    <!-- ── Empty state ───────────────────────────────────────────── -->
    <div v-if="store.sorted.length === 0" class="mp-empty">
      <div class="mp-empty-icon"><q-icon name="straighten" size="26px" /></div>
      <span class="mp-empty-text">Sin medidas registradas</span>
    </div>

    <!-- ── Measurement cards ─────────────────────────────────────── -->
    <div
      v-for="m in reversedMeasurements"
      :key="m.id"
      class="mp-card"
    >
      <div class="mp-card-header">
        <span class="mp-card-date">{{ formatDate(m.date) }}</span>
        <div class="mp-card-actions">
          <button class="mp-icon-btn" @click="editMeasurement(m)">
            <q-icon name="edit" size="16px" />
          </button>
          <button class="mp-icon-btn mp-icon-btn--del" @click="confirmDelete(m.id)">
            <q-icon name="delete" size="16px" />
          </button>
        </div>
      </div>
      <div class="mp-card-stats">
        <span v-if="m.weightKg" class="mp-stat"><span class="mp-stat-val">{{ m.weightKg }}</span> kg</span>
        <span v-if="m.bodyFatPercent" class="mp-stat"><span class="mp-stat-val">{{ m.bodyFatPercent }}</span>% grasa</span>
        <span v-if="m.waistCm" class="mp-stat"><span class="mp-stat-val">{{ m.waistCm }}</span> cm cintura</span>
        <span v-if="m.chestCm" class="mp-stat"><span class="mp-stat-val">{{ m.chestCm }}</span> cm pecho</span>
        <span v-if="m.leftArmCm" class="mp-stat"><span class="mp-stat-val">{{ m.leftArmCm }}</span> cm brazo izq</span>
        <span v-if="m.rightArmCm" class="mp-stat"><span class="mp-stat-val">{{ m.rightArmCm }}</span> cm brazo der</span>
        <span v-if="m.leftThighCm" class="mp-stat"><span class="mp-stat-val">{{ m.leftThighCm }}</span> cm muslo izq</span>
        <span v-if="m.rightThighCm" class="mp-stat"><span class="mp-stat-val">{{ m.rightThighCm }}</span> cm muslo der</span>
        <span v-if="m.hipsCm" class="mp-stat"><span class="mp-stat-val">{{ m.hipsCm }}</span> cm cadera</span>
      </div>
      <p v-if="m.notes" class="mp-card-notes">{{ m.notes }}</p>
    </div>

    <!-- ── Add / Edit dialog ──────────────────────────────────────── -->
    <q-dialog v-model="showForm" persistent>
      <div class="mp-dialog">
        <div class="mp-dialog-header">
          <span class="mp-dialog-title">{{ editingId ? 'Editar medida' : 'Nueva medida' }}</span>
          <button class="mp-icon-btn" @click="closeForm"><q-icon name="close" size="18px" /></button>
        </div>

        <div class="mp-dialog-body">
          <!-- Date -->
          <div class="mp-field">
            <label class="mp-field-label">Fecha</label>
            <input v-model="form.date" type="date" class="mp-input" />
          </div>

          <!-- Weight + body fat -->
          <div class="mp-row2">
            <div class="mp-field">
              <label class="mp-field-label">Peso (kg)</label>
              <input v-model.number="form.weightKg" type="number" class="mp-input" placeholder="—" />
            </div>
            <div class="mp-field">
              <label class="mp-field-label">Grasa (%)</label>
              <input v-model.number="form.bodyFatPercent" type="number" class="mp-input" placeholder="—" />
            </div>
          </div>

          <!-- Waist + chest -->
          <div class="mp-row2">
            <div class="mp-field">
              <label class="mp-field-label">Cintura (cm)</label>
              <input v-model.number="form.waistCm" type="number" class="mp-input" placeholder="—" />
            </div>
            <div class="mp-field">
              <label class="mp-field-label">Pecho (cm)</label>
              <input v-model.number="form.chestCm" type="number" class="mp-input" placeholder="—" />
            </div>
          </div>

          <!-- Arms -->
          <div class="mp-row2">
            <div class="mp-field">
              <label class="mp-field-label">Brazo izq (cm)</label>
              <input v-model.number="form.leftArmCm" type="number" class="mp-input" placeholder="—" />
            </div>
            <div class="mp-field">
              <label class="mp-field-label">Brazo der (cm)</label>
              <input v-model.number="form.rightArmCm" type="number" class="mp-input" placeholder="—" />
            </div>
          </div>

          <!-- Thighs -->
          <div class="mp-row2">
            <div class="mp-field">
              <label class="mp-field-label">Muslo izq (cm)</label>
              <input v-model.number="form.leftThighCm" type="number" class="mp-input" placeholder="—" />
            </div>
            <div class="mp-field">
              <label class="mp-field-label">Muslo der (cm)</label>
              <input v-model.number="form.rightThighCm" type="number" class="mp-input" placeholder="—" />
            </div>
          </div>

          <!-- Hips -->
          <div class="mp-field">
            <label class="mp-field-label">Cadera (cm)</label>
            <input v-model.number="form.hipsCm" type="number" class="mp-input" placeholder="—" />
          </div>

          <!-- Notes -->
          <div class="mp-field">
            <label class="mp-field-label">Notas (opcional)</label>
            <textarea v-model="form.notes" class="mp-textarea" rows="2" placeholder="Observaciones..." />
          </div>
        </div>

        <div class="mp-dialog-footer">
          <button class="mp-btn mp-btn--ghost" @click="closeForm">Cancelar</button>
          <button class="mp-btn mp-btn--cta" @click="saveMeasurement">
            {{ editingId ? 'Guardar' : 'Registrar' }}
          </button>
        </div>
      </div>
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
  type TooltipItem,
} from 'chart.js'
import PageShell from '../components/layout/PageShell.vue'
import { useMeasurementsStore } from '../stores/measurements'
import { checkAchievements } from '../composables/useAchievementChecker'
import type { BodyMeasurement } from '../types/measurement'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip)

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

interface MetricConfig {
  key: keyof BodyMeasurement
  label: string
  unit: string
  color: string
  bgColor?: string
}

const METRIC_CONFIGS: MetricConfig[] = [
  { key: 'weightKg',       label: 'Peso',            unit: 'kg', color: '#FF562C',  bgColor: 'rgba(255,86,44,0.08)' },
  { key: 'bodyFatPercent', label: 'Grasa corporal',  unit: '%',  color: '#ffb4a2',  bgColor: 'rgba(255,180,162,0.06)' },
  { key: 'waistCm',        label: 'Cintura',         unit: 'cm', color: '#a6c8ff' },
  { key: 'chestCm',        label: 'Pecho',           unit: 'cm', color: '#ff9c6e' },
  { key: 'leftArmCm',      label: 'Brazo izquierdo', unit: 'cm', color: '#ffb4a2' },
  { key: 'rightArmCm',     label: 'Brazo derecho',   unit: 'cm', color: '#c1c7cf' },
  { key: 'leftThighCm',    label: 'Muslo izquierdo', unit: 'cm', color: '#7ecfff' },
  { key: 'rightThighCm',   label: 'Muslo derecho',   unit: 'cm', color: '#ae887f' },
  { key: 'hipsCm',         label: 'Cadera',          unit: 'cm', color: '#FF562C',  bgColor: 'rgba(255,86,44,0.06)' },
]

function buildChartOptions(unit: string) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(18,18,18,0.96)',
        titleColor: '#FF562C',
        bodyColor: '#c1c7cf',
        padding: 10,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => items[0]?.label ?? '',
          label: (item: TooltipItem<'line'>) => ` ${item.parsed.y} ${unit}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { display: false },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
      },
      y: {
        beginAtZero: false,
        ticks: { color: '#c1c7cf', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  }
}

const metricCharts = computed(() =>
  METRIC_CONFIGS.flatMap(cfg => {
    const data = store.sorted.filter(m => m[cfg.key] !== undefined)
    if (data.length < 2) return []
    return [{
      label: `${cfg.label} (${cfg.unit})`,
      chartData: {
        labels: data.map(m => formatDate(m.date)),
        datasets: [{
          label: cfg.label,
          data: data.map(m => m[cfg.key] as number),
          borderColor: cfg.color,
          backgroundColor: cfg.bgColor ?? 'transparent',
          tension: 0.35,
          fill: !!cfg.bgColor,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: buildChartOptions(cfg.unit),
    }]
  }),
)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function editMeasurement(m: BodyMeasurement) {
  editingId.value = m.id
  form.value = {
    date: m.date, weightKg: m.weightKg, bodyFatPercent: m.bodyFatPercent,
    waistCm: m.waistCm, chestCm: m.chestCm, leftArmCm: m.leftArmCm,
    rightArmCm: m.rightArmCm, leftThighCm: m.leftThighCm, rightThighCm: m.rightThighCm,
    hipsCm: m.hipsCm, notes: m.notes ?? '',
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false; editingId.value = null; form.value = emptyForm()
}

function buildMeasurementData(): Omit<BodyMeasurement, 'id' | 'userId'> {
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
  } catch { $q.notify({ type: 'negative', message: 'Error al guardar la medida' }) }
}

function generateRandom() {
  const r = (val: number, delta: number) =>
    parseFloat((val + (Math.random() * 2 - 1) * delta).toFixed(1))

  const last = store.sorted.at(-1)

  // Date: 1 week after last measurement, or today if none
  let date: string
  if (last) {
    const d = new Date(last.date + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    date = d.toISOString().slice(0, 10)
  } else {
    date = new Date().toISOString().slice(0, 10)
  }

  // Base values: either last measurement or sensible defaults
  const base = {
    weightKg:      last?.weightKg      ?? 78,
    bodyFatPercent: last?.bodyFatPercent ?? 20,
    waistCm:       last?.waistCm       ?? 82,
    chestCm:       last?.chestCm       ?? 97,
    leftArmCm:     last?.leftArmCm     ?? 34,
    rightArmCm:    last?.rightArmCm    ?? 34.5,
    leftThighCm:   last?.leftThighCm   ?? 56,
    rightThighCm:  last?.rightThighCm  ?? 56.5,
    hipsCm:        last?.hipsCm        ?? 96,
  }

  store.addMeasurement({
    date,
    weightKg:       r(base.weightKg, 0.4),
    bodyFatPercent: r(base.bodyFatPercent, 0.3),
    waistCm:        r(base.waistCm, 0.5),
    chestCm:        r(base.chestCm, 0.5),
    leftArmCm:      r(base.leftArmCm, 0.3),
    rightArmCm:     r(base.rightArmCm, 0.3),
    leftThighCm:    r(base.leftThighCm, 0.4),
    rightThighCm:   r(base.rightThighCm, 0.4),
    hipsCm:         r(base.hipsCm, 0.5),
  })
}

function confirmDelete(id: string) {
  $q.dialog({
    title: 'Eliminar medida',
    message: '¿Seguro que quieres eliminar esta medida?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
  }).onOk(async () => {
    await store.deleteMeasurement(id)
    $q.notify({ type: 'positive', message: 'Medida eliminada' })
  })
}

onMounted(() => { store.loadMeasurements() })
</script>

<style scoped>
/* ── Header ──────────────────────────────────────────────────── */
.mp-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
.mp-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.mp-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}

/* ── Chart card ──────────────────────────────────────────────── */
.mp-chart-card {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 1rem; margin-bottom: 0.625rem;
}
.mp-chart-label {
  display: block; font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin-bottom: 0.875rem;
}

/* ── Hint ────────────────────────────────────────────────────── */
.mp-hint {
  font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary);
  text-align: center; margin: 0.5rem 0 1rem;
}

/* ── Section label ───────────────────────────────────────────── */
.mp-section-label {
  display: block; font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
  margin: 1rem 0 0.5rem;
}

/* ── Empty ───────────────────────────────────────────────────── */
.mp-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
  padding: 2.5rem 1rem; text-align: center;
}
.mp-empty-icon {
  width: 52px; height: 52px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container); color: var(--k-secondary);
  display: flex; align-items: center; justify-content: center;
}
.mp-empty-text { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); }

/* ── Measurement card ────────────────────────────────────────── */
.mp-card {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 0.875rem 1rem; margin-bottom: 0.5rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.mp-card-header { display: flex; align-items: center; justify-content: space-between; }
.mp-card-date {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.mp-card-actions { display: flex; gap: 0.25rem; }
.mp-card-stats { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.mp-stat {
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary);
  background-color: var(--k-surface-high); border-radius: var(--k-radius-sm);
  padding: 0.25rem 0.5rem;
}
.mp-stat-val {
  font-family: var(--k-font-headline); font-weight: 600; color: var(--k-on-surface);
}
.mp-card-notes { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-outline); margin: 0; font-style: italic; }

/* ── Icon button ─────────────────────────────────────────────── */
.mp-icon-btn {
  width: 30px; height: 30px; border-radius: var(--k-radius-sm);
  background-color: var(--k-surface-high); border: none; cursor: pointer;
  color: var(--k-secondary); display: flex; align-items: center; justify-content: center;
  transition: background-color 0.15s ease;
}
.mp-icon-btn--del { color: rgba(255,86,44,0.7); }
.mp-icon-btn--del:hover { background-color: rgba(255,86,44,0.12); color: var(--k-primary-container); }

/* ── Dialog ──────────────────────────────────────────────────── */
.mp-dialog {
  width: min(420px, calc(100vw - 2rem));
  background-color: var(--k-surface-low); border-radius: var(--k-radius-lg);
  display: flex; flex-direction: column; max-height: 85vh;
}
.mp-dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1rem 0.75rem; flex-shrink: 0;
}
.mp-dialog-title {
  font-family: var(--k-font-headline); font-size: var(--k-title-lg); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.mp-dialog-body {
  padding: 0 1rem 0.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;
}
.mp-dialog-footer {
  display: flex; gap: 0.625rem; padding: 0.875rem 1rem 1rem; flex-shrink: 0;
  border-top: 1px solid var(--k-surface-highest);
}

/* ── Form fields ─────────────────────────────────────────────── */
.mp-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; }
.mp-field { display: flex; flex-direction: column; gap: 0.3rem; }
.mp-field-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
}
.mp-input {
  width: 100%; padding: 0.625rem 0.75rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-on-surface);
  font-family: var(--k-font-body); font-size: var(--k-body-md); outline: none;
  box-sizing: border-box; transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.mp-input:focus { background-color: var(--k-surface-bright); box-shadow: 0 0 0 1px rgba(255,86,44,0.4); }
.mp-input::placeholder { color: var(--k-outline); }
.mp-textarea {
  width: 100%; padding: 0.625rem 0.75rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-on-surface);
  font-family: var(--k-font-body); font-size: var(--k-body-md); outline: none; resize: vertical;
  box-sizing: border-box; transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.mp-textarea:focus { background-color: var(--k-surface-bright); box-shadow: 0 0 0 1px rgba(255,86,44,0.4); }
.mp-textarea::placeholder { color: var(--k-outline); }

/* ── Buttons ─────────────────────────────────────────────────── */
.mp-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.75rem 1rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer; transition: opacity 0.15s ease;
}
.mp-cta-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.mp-btn--cta { flex: 1; background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
.mp-btn--cta:hover { opacity: 0.9; }
.mp-btn--ghost {
  flex: 1; background-color: transparent; color: var(--k-secondary);
  border: 1px solid var(--k-ghost-border);
}
.mp-btn--rand { flex: 0 0 auto; width: 48px; padding: 0; }
.mp-dialog-footer .mp-btn--cta { width: auto; flex: 1; margin-bottom: 0; }
</style>
