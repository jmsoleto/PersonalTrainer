<template>
  <PageShell :loading="store.loading">

    <!-- ── Header ────────────────────────────────────────────────── -->
    <header class="al-header">
      <span class="al-overline">Actividad</span>
      <h1 class="al-title">Mi actividad</h1>
    </header>

    <p class="al-intro">
      Registra el deporte que haces por tu cuenta: senderismo, bici, natación, carrera…
      Cada día cuenta para tus retos.
    </p>

    <!-- ── CTA ───────────────────────────────────────────────────── -->
    <div class="al-cta-row">
      <button class="al-btn al-btn--cta" @click="openNew">
        <q-icon name="add" size="18px" />
        Registrar actividad
      </button>
    </div>

    <!-- ── History label ─────────────────────────────────────────── -->
    <span class="al-section-label">Historial</span>

    <!-- ── Empty state ───────────────────────────────────────────── -->
    <div v-if="store.sorted.length === 0" class="al-empty">
      <div class="al-empty-icon"><q-icon name="directions_run" size="26px" /></div>
      <span class="al-empty-text">Sin actividades registradas</span>
    </div>

    <!-- ── Activity cards ────────────────────────────────────────── -->
    <div v-for="a in store.sorted" :key="a.id" class="al-card">
      <div class="al-card-icon"><q-icon :name="typeMeta(a.type).icon" size="20px" /></div>
      <div class="al-card-main">
        <div class="al-card-top">
          <span class="al-card-type">{{ typeMeta(a.type).label }}</span>
          <span class="al-card-date">{{ formatDate(a.date) }}</span>
        </div>
        <div class="al-card-stats">
          <span v-if="a.distanceKm" class="al-stat"><span class="al-stat-val">{{ a.distanceKm }}</span> km</span>
          <span v-if="a.distanceM" class="al-stat"><span class="al-stat-val">{{ a.distanceM }}</span> m</span>
          <span v-if="a.durationMin" class="al-stat"><span class="al-stat-val">{{ a.durationMin }}</span> min</span>
        </div>
        <p v-if="a.note" class="al-card-note">{{ a.note }}</p>
      </div>
      <div class="al-card-actions">
        <button class="al-icon-btn" @click="openEdit(a)"><q-icon name="edit" size="16px" /></button>
        <button class="al-icon-btn al-icon-btn--del" @click="confirmDelete(a.id!)"><q-icon name="delete" size="16px" /></button>
      </div>
    </div>

    <!-- ── Add / Edit dialog ─────────────────────────────────────── -->
    <q-dialog v-model="showForm" persistent>
      <div class="al-dialog">
        <div class="al-dialog-header">
          <span class="al-dialog-title">{{ editingId ? 'Editar actividad' : 'Nueva actividad' }}</span>
          <button class="al-icon-btn" @click="closeForm"><q-icon name="close" size="18px" /></button>
        </div>

        <div class="al-dialog-body">
          <!-- Type picker -->
          <div class="al-field">
            <label class="al-field-label">Tipo</label>
            <div class="al-type-grid">
              <button
                v-for="t in TYPES"
                :key="t.value"
                type="button"
                :class="['al-type-btn', { 'al-type-btn--active': form.type === t.value }]"
                @click="form.type = t.value"
              >
                <q-icon :name="t.icon" size="20px" />
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>

          <!-- Date -->
          <div class="al-field">
            <label class="al-field-label">Fecha</label>
            <input v-model="form.date" type="date" class="al-input" />
          </div>

          <!-- Distance + duration -->
          <div class="al-row2">
            <div class="al-field">
              <label class="al-field-label">
                Distancia ({{ form.type === 'swimming' ? 'm' : 'km' }})
              </label>
              <input v-model.number="form.distance" type="number" min="0" class="al-input" placeholder="—" />
            </div>
            <div class="al-field">
              <label class="al-field-label">Duración (min)</label>
              <input v-model.number="form.durationMin" type="number" min="0" class="al-input" placeholder="—" />
            </div>
          </div>

          <!-- Note -->
          <div class="al-field">
            <label class="al-field-label">Nota (opcional)</label>
            <textarea v-model="form.note" class="al-textarea" rows="2" placeholder="Observaciones..." />
          </div>
        </div>

        <div class="al-dialog-footer">
          <button class="al-btn al-btn--ghost" @click="closeForm">Cancelar</button>
          <button class="al-btn al-btn--cta" @click="save">
            {{ editingId ? 'Guardar' : 'Registrar' }}
          </button>
        </div>
      </div>
    </q-dialog>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useActivitiesStore } from '../stores/activities'
import { useChallengesStore } from '../stores/challenges'
import { useAchievementsStore } from '../stores/achievements'
import { checkChallenges } from '../composables/useChallengeChecker'
import { checkAchievements } from '../composables/useAchievementChecker'
import type { ActivityType, ManualActivity } from '../types/activity'

const $q = useQuasar()
const store = useActivitiesStore()
const challengesStore = useChallengesStore()
const achievementsStore = useAchievementsStore()

const TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'running',  label: 'Carrera',    icon: 'directions_run' },
  { value: 'cycling',  label: 'Bici',       icon: 'directions_bike' },
  { value: 'swimming', label: 'Natación',   icon: 'pool' },
  { value: 'hiking',   label: 'Senderismo', icon: 'hiking' },
  { value: 'other',    label: 'Otro',       icon: 'sports' },
]

function typeMeta(t: ActivityType) {
  return TYPES.find(x => x.value === t) ?? TYPES[TYPES.length - 1]
}

const showForm = ref(false)
const editingId = ref<number | null>(null)

const emptyForm = () => ({
  type: 'running' as ActivityType,
  date: new Date().toISOString().slice(0, 10),
  distance: undefined as number | undefined,
  durationMin: undefined as number | undefined,
  note: '',
})
const form = ref(emptyForm())

function openNew() {
  editingId.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(a: ManualActivity) {
  editingId.value = a.id ?? null
  form.value = {
    type: a.type,
    date: a.date,
    distance: a.type === 'swimming' ? a.distanceM : a.distanceKm,
    durationMin: a.durationMin,
    note: a.note ?? '',
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  form.value = emptyForm()
}

function buildData(): Omit<ManualActivity, 'id' | 'userId' | 'createdAt'> {
  const data: Omit<ManualActivity, 'id' | 'userId' | 'createdAt'> = {
    date: form.value.date,
    type: form.value.type,
  }
  if (form.value.distance) {
    if (form.value.type === 'swimming') data.distanceM = form.value.distance
    else data.distanceKm = form.value.distance
  }
  if (form.value.durationMin) data.durationMin = form.value.durationMin
  if (form.value.note) data.note = form.value.note
  return data
}

async function runChallengeCheck() {
  await challengesStore.loadAccepted()
  const completed = await checkChallenges()
  for (const c of completed) {
    const def = challengesStore.getDefinition(c.challengeId)
    if (def) $q.notify({ type: 'positive', icon: def.icon, message: `Reto completado: ${def.name}`, caption: def.description, timeout: 4000 })
  }
  // A completed challenge may in turn unlock an achievement
  if (completed.length > 0) {
    await achievementsStore.loadUnlocked()
    const unlocked = await checkAchievements()
    for (const a of unlocked) {
      const def = achievementsStore.getDefinition(a.achievementId)
      if (def) $q.notify({ type: 'positive', icon: def.icon, message: `Logro desbloqueado: ${def.name}`, caption: def.description, timeout: 4000 })
    }
  }
}

async function save() {
  try {
    const data = buildData()
    if (editingId.value) {
      await store.updateActivity(editingId.value, data)
      $q.notify({ type: 'positive', message: 'Actividad actualizada' })
    } else {
      await store.addActivity(data)
      $q.notify({ type: 'positive', message: 'Actividad registrada' })
    }
    closeForm()
    await runChallengeCheck()
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar la actividad' })
  }
}

function confirmDelete(id: number) {
  $q.dialog({
    title: 'Eliminar actividad',
    message: '¿Seguro que quieres eliminar esta actividad?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
  }).onOk(async () => {
    await store.deleteActivity(id)
    $q.notify({ type: 'positive', message: 'Actividad eliminada' })
    await runChallengeCheck()
  })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(() => { store.loadActivities() })
</script>

<style scoped>
.al-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
.al-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.al-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}
.al-intro {
  font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary);
  margin: 0 0 1rem; line-height: 1.5;
}

.al-cta-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.al-section-label {
  display: block; font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
  margin: 1rem 0 0.5rem;
}

.al-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.625rem;
  padding: 2.5rem 1rem; text-align: center;
}
.al-empty-icon {
  width: 52px; height: 52px; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container); color: var(--k-secondary);
  display: flex; align-items: center; justify-content: center;
}
.al-empty-text { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); }

.al-card {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 0.875rem 1rem; margin-bottom: 0.5rem;
  display: flex; align-items: flex-start; gap: 0.75rem;
}
.al-card-icon {
  width: 40px; height: 40px; flex-shrink: 0; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); color: var(--k-primary-container);
  display: flex; align-items: center; justify-content: center;
}
.al-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.al-card-top { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.al-card-type {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.al-card-date { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.al-card-stats { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.al-stat {
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary);
  background-color: var(--k-surface-high); border-radius: var(--k-radius-sm); padding: 0.2rem 0.5rem;
}
.al-stat-val { font-family: var(--k-font-headline); font-weight: 600; color: var(--k-on-surface); }
.al-card-note { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-outline); margin: 0; font-style: italic; }
.al-card-actions { display: flex; flex-direction: column; gap: 0.25rem; }

.al-icon-btn {
  width: 30px; height: 30px; border-radius: var(--k-radius-sm);
  background-color: var(--k-surface-high); border: none; cursor: pointer;
  color: var(--k-secondary); display: flex; align-items: center; justify-content: center;
  transition: background-color 0.15s ease;
}
.al-icon-btn--del { color: rgba(255,86,44,0.7); }
.al-icon-btn--del:hover { background-color: rgba(255,86,44,0.12); color: var(--k-primary-container); }

.al-dialog {
  width: min(420px, calc(100vw - 2rem));
  background-color: var(--k-surface-low); border-radius: var(--k-radius-lg);
  display: flex; flex-direction: column; max-height: 85vh;
}
.al-dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1rem 0.75rem; flex-shrink: 0;
}
.al-dialog-title {
  font-family: var(--k-font-headline); font-size: var(--k-title-lg); font-weight: 700;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.al-dialog-body { padding: 0 1rem 0.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
.al-dialog-footer {
  display: flex; gap: 0.625rem; padding: 0.875rem 1rem 1rem; flex-shrink: 0;
  border-top: 1px solid var(--k-surface-highest);
}

.al-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; }
.al-field { display: flex; flex-direction: column; gap: 0.3rem; }
.al-field-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
}
.al-input, .al-textarea {
  width: 100%; padding: 0.625rem 0.75rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-on-surface);
  font-family: var(--k-font-body); font-size: var(--k-body-md); outline: none;
  box-sizing: border-box; transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.al-textarea { resize: vertical; }
.al-input:focus, .al-textarea:focus { background-color: var(--k-surface-bright); box-shadow: 0 0 0 1px rgba(255,86,44,0.4); }
.al-input::placeholder, .al-textarea::placeholder { color: var(--k-outline); }

.al-type-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; }
.al-type-btn {
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  padding: 0.6rem 0.25rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-secondary); cursor: pointer;
  font-family: var(--k-font-body); font-size: 0.7rem; transition: background-color 0.15s ease, color 0.15s ease;
}
.al-type-btn--active { background-color: rgba(255,86,44,0.15); color: var(--k-primary-container); }

.al-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.75rem 1rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer; transition: opacity 0.15s ease;
}
.al-btn--cta { flex: 1; background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
.al-btn--cta:hover { opacity: 0.9; }
.al-btn--ghost { flex: 1; background-color: transparent; color: var(--k-secondary); border: 1px solid var(--k-ghost-border); }
</style>
