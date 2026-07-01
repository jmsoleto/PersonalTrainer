<template>
  <PageShell :loading="loading">

    <header class="ep-header">
      <span class="ep-overline">Mi perfil</span>
      <h1 class="ep-title">Mi equipamiento</h1>
      <p class="ep-desc">Selecciona el material del que dispones.</p>
    </header>

    <ul class="ep-grid">
      <li
        v-for="item in equipmentOptions"
        :key="item.value"
        :class="['ep-card', { 'ep-card--selected': isSelected(item.value) }]"
        @click="toggleEquipment(item.value)"
      >
        <q-icon
          :name="item.icon"
          size="32px"
          :class="['ep-icon', { 'ep-icon--selected': isSelected(item.value) }]"
        />
        <span class="ep-label">{{ item.label }}</span>
        <span v-if="isSelected(item.value)" class="ep-check">
          <q-icon name="check" size="12px" />
        </span>
      </li>
    </ul>

    <button
      class="ep-btn ep-btn--cta"
      :disabled="!hasChanges || saving"
      @click="save"
    >
      <q-spinner-dots v-if="saving" size="18px" color="white" />
      <template v-else>
        <q-icon name="check" size="18px" />
        Guardar cambios
      </template>
    </button>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useUserStore } from '../stores/user'
import { usePlanStore } from '../stores/plan'
import { Equipment } from '../types/enums'

const $q        = useQuasar()
const userStore = useUserStore()
const planStore = usePlanStore()

const selected           = ref<Equipment[]>([])
const saving             = ref(false)
const originalEquipment  = ref<Equipment[]>([])
const loading            = computed(() => userStore.loading)

const equipmentOptions = [
  { label: 'Peso corporal',     value: Equipment.BodyweightOnly,  icon: 'accessibility_new' },
  { label: 'Mancuernas',        value: Equipment.Dumbbells,        icon: 'fitness_center' },
  { label: 'Barra olímpica',    value: Equipment.Barbell,          icon: 'horizontal_rule' },
  { label: 'Kettlebell',        value: Equipment.Kettlebell,       icon: 'sports_martial_arts' },
  { label: 'Bandas elásticas',  value: Equipment.ResistanceBands,  icon: 'cable' },
  { label: 'Barra dominadas',   value: Equipment.PullUpBar,        icon: 'drag_handle' },
  { label: 'Banco',             value: Equipment.Bench,            icon: 'weekend' },
  { label: 'Esterilla',         value: Equipment.YogaMat,          icon: 'self_improvement' },
]

const equipmentLabelMap = Object.fromEntries(equipmentOptions.map(o => [o.value, o.label]))

const hasChanges = computed(() => {
  if (selected.value.length !== originalEquipment.value.length) return true
  return [...selected.value].sort().some((v, i) => v !== [...originalEquipment.value].sort()[i])
})

function isSelected(e: Equipment) { return selected.value.includes(e) }

function toggleEquipment(equipment: Equipment) {
  if (equipment === Equipment.BodyweightOnly) { selected.value = [Equipment.BodyweightOnly]; return }
  const filtered = selected.value.filter(e => e !== Equipment.BodyweightOnly)
  const idx = filtered.indexOf(equipment)
  idx === -1 ? filtered.push(equipment) : filtered.splice(idx, 1)
  selected.value = filtered.length === 0 ? [Equipment.BodyweightOnly] : filtered
}

async function save() {
  saving.value = true
  try {
    const previous = await userStore.updateEquipment([...selected.value])
    originalEquipment.value = [...selected.value]
    $q.notify({ type: 'positive', message: 'Equipamiento actualizado' })
    if (planStore.activePlan && previous) {
      const added   = selected.value.filter(e => !previous.includes(e))
      const removed = previous.filter(e => !selected.value.includes(e))
      if (added.length > 0 || removed.length > 0) {
        const parts: string[] = []
        if (removed.length > 0) parts.push('eliminado ' + removed.map(e => equipmentLabelMap[e] || e).join(', '))
        if (added.length > 0)   parts.push('agregado '  + added.map(e => equipmentLabelMap[e] || e).join(', '))
        $q.dialog({
          title: 'Recalcular plan',
          message: 'Tu equipamiento ha cambiado. ¿Quieres recalcular tu plan?',
          cancel: { label: 'No', flat: true }, ok: { label: 'Recalcular', color: 'primary' },
        }).onOk(async () => {
          try { await planStore.recalculatePlan('Cambio de equipamiento: ' + parts.join('; ')); $q.notify({ type: 'positive', message: 'Plan recalculado' }) }
          catch { $q.notify({ type: 'negative', message: 'Error al recalcular' }) }
        })
      }
    }
  } catch { $q.notify({ type: 'negative', message: 'Error al guardar el equipamiento' }) }
  finally { saving.value = false }
}

onMounted(async () => {
  if (!userStore.currentUser) await userStore.loadUser()
  if (!planStore.activePlan) await planStore.loadActivePlan()
  if (userStore.currentUser) {
    selected.value = [...userStore.currentUser.equipment]
    originalEquipment.value = [...userStore.currentUser.equipment]
  }
})
</script>

<style scoped>
.ep-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.25rem; }
.ep-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.ep-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}
.ep-desc { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); margin: 0; }

.ep-grid {
  list-style: none; margin: 0 0 1.25rem; padding: 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem;
}
.ep-card {
  position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 0.6rem;
  padding: 1rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container); cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
}
.ep-card:hover  { background-color: var(--k-surface-high); transform: translateY(-1px); }
.ep-card--selected { background-color: var(--k-surface-high); box-shadow: inset 0 0 0 1px rgba(255,86,44,0.35); }

.ep-icon { color: var(--k-surface-bright); transition: color 0.15s ease; }
.ep-icon--selected { color: var(--k-primary-container); }

.ep-label {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); line-height: 1.2;
}
.ep-check {
  position: absolute; top: 0.6rem; right: 0.6rem;
  width: 20px; height: 20px; border-radius: var(--k-radius-sm);
  background-color: var(--k-primary-container); color: var(--k-on-primary-container);
  display: flex; align-items: center; justify-content: center;
}

.ep-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.875rem 1.5rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-lg); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer;
  transition: opacity 0.15s ease;
}
.ep-btn--cta { background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
.ep-btn--cta:hover:not(:disabled) { opacity: 0.9; }
.ep-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
