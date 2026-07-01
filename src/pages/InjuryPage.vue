<template>
  <PageShell :loading="loading">

    <header class="ip-header">
      <span class="ip-overline">Mi perfil</span>
      <h1 class="ip-title">Lesiones</h1>
      <p class="ip-desc">Marca las zonas con molestias para adaptar tu plan.</p>
    </header>

    <ul class="ip-list">
      <li
        v-for="group in muscleGroups"
        :key="group.value"
        :class="['ip-item', { 'ip-item--injured': isInjured(group.value) }]"
      >
        <!-- Fila principal (clic para expandir) -->
        <button class="ip-row" @click="toggleExpand(group.value)">
          <div :class="['ip-row-icon', isInjured(group.value) ? 'ip-row-icon--injured' : '']">
            <q-icon :name="isInjured(group.value) ? 'warning' : 'check_circle_outline'" size="18px" />
          </div>
          <span class="ip-row-name">{{ group.label }}</span>
          <q-icon
            :name="expanded.includes(group.value) ? 'expand_less' : 'expand_more'"
            size="18px" class="ip-row-chevron"
          />
        </button>

        <!-- Detalle expandible -->
        <div v-if="expanded.includes(group.value)" class="ip-detail">
          <!-- Toggle lesionado -->
          <button
            :class="['ip-toggle', { 'ip-toggle--on': isInjured(group.value) }]"
            type="button"
            @click="toggleInjury(group.value, !isInjured(group.value))"
          >
            <span class="ip-toggle-track">
              <span class="ip-toggle-thumb" />
            </span>
            <span class="ip-toggle-label">Zona lesionada</span>
          </button>

          <template v-if="isInjured(group.value)">
            <!-- Severidad -->
            <div class="ip-severity-wrap">
              <span class="ip-sub-label">Severidad</span>
              <div class="ip-severity-row">
                <button
                  v-for="opt in severityOptions"
                  :key="opt.value"
                  :class="['ip-sev-btn', { 'ip-sev-btn--active': getInjury(group.value)?.severity === opt.value }]"
                  @click="updateSeverity(group.value, opt.value as InjurySeverity)"
                >{{ opt.label }}</button>
              </div>
            </div>

            <!-- Notas -->
            <div class="ip-notes-wrap">
              <span class="ip-sub-label">Notas (opcional)</span>
              <textarea
                :value="getInjury(group.value)?.notes ?? ''"
                class="ip-textarea"
                placeholder="Describe la molestia..."
                rows="2"
                @input="updateNotes(group.value, ($event.target as HTMLTextAreaElement).value)"
              />
            </div>
          </template>
        </div>
      </li>
    </ul>

    <button
      class="ip-btn ip-btn--cta"
      :disabled="!hasChanges || saving"
      @click="save"
    >
      <q-spinner-dots v-if="saving" size="18px" color="white" />
      <template v-else><q-icon name="check" size="18px" /> Guardar cambios</template>
    </button>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useUserStore } from '../stores/user'
import { usePlanStore } from '../stores/plan'
import { MuscleGroup } from '../types/enums'
import type { InjurySeverity } from '../types/enums'
import type { InjuryZone } from '../types/user'

const $q        = useQuasar()
const userStore = useUserStore()
const planStore = usePlanStore()

const injuries         = ref<InjuryZone[]>([])
const originalInjuries = ref<InjuryZone[]>([])
const saving           = ref(false)
const expanded         = ref<MuscleGroup[]>([])
const loading          = computed(() => userStore.loading)

const muscleGroups = [
  { label: 'Pecho',          value: MuscleGroup.Chest },
  { label: 'Espalda',        value: MuscleGroup.Back },
  { label: 'Hombros',        value: MuscleGroup.Shoulders },
  { label: 'Bíceps',         value: MuscleGroup.Biceps },
  { label: 'Tríceps',        value: MuscleGroup.Triceps },
  { label: 'Antebrazos',     value: MuscleGroup.Forearms },
  { label: 'Core / Abdomen', value: MuscleGroup.Core },
  { label: 'Cuádriceps',     value: MuscleGroup.Quads },
  { label: 'Isquiotibiales', value: MuscleGroup.Hamstrings },
  { label: 'Glúteos',        value: MuscleGroup.Glutes },
  { label: 'Pantorrillas',   value: MuscleGroup.Calves },
  { label: 'Cuerpo completo',value: MuscleGroup.FullBody },
]
const muscleGroupLabelMap = Object.fromEntries(muscleGroups.map(g => [g.value, g.label]))

const severityOptions = [
  { label: 'Leve',     value: 'mild' },
  { label: 'Moderada', value: 'moderate' },
  { label: 'Severa',   value: 'severe' },
]

const hasChanges = computed(() =>
  JSON.stringify(injuries.value.map(i => ({ m: i.muscleGroup, s: i.severity, n: i.notes })).sort((a,b) => a.m.localeCompare(b.m))) !==
  JSON.stringify(originalInjuries.value.map(i => ({ m: i.muscleGroup, s: i.severity, n: i.notes })).sort((a,b) => a.m.localeCompare(b.m)))
)

function isInjured(g: MuscleGroup) { return injuries.value.some(i => i.muscleGroup === g) }
function getInjury(g: MuscleGroup) { return injuries.value.find(i => i.muscleGroup === g) }

function toggleExpand(g: MuscleGroup) {
  const idx = expanded.value.indexOf(g)
  idx === -1 ? expanded.value.push(g) : expanded.value.splice(idx, 1)
}

function toggleInjury(g: MuscleGroup, active: boolean) {
  if (active) injuries.value.push({ muscleGroup: g, severity: 'mild' as InjurySeverity, notes: '', dateMarked: new Date().toISOString() })
  else injuries.value = injuries.value.filter(i => i.muscleGroup !== g)
}

function updateSeverity(g: MuscleGroup, severity: InjurySeverity) {
  const inj = injuries.value.find(i => i.muscleGroup === g); if (inj) inj.severity = severity
}
function updateNotes(g: MuscleGroup, notes: string) {
  const inj = injuries.value.find(i => i.muscleGroup === g); if (inj) inj.notes = notes
}

async function save() {
  saving.value = true
  try {
    await userStore.updateInjuries([...injuries.value])
    const prevGroups = originalInjuries.value.map(i => i.muscleGroup)
    const newGroups  = injuries.value.map(i => i.muscleGroup)
    originalInjuries.value = JSON.parse(JSON.stringify(injuries.value))
    $q.notify({ type: 'positive', message: 'Lesiones actualizadas' })
    if (planStore.activePlan) {
      const added   = newGroups.filter(g => !prevGroups.includes(g))
      const removed = prevGroups.filter(g => !newGroups.includes(g))
      if (added.length > 0 || removed.length > 0) {
        $q.dialog({
          title: 'Recalcular plan',
          message: 'Tus lesiones han cambiado. ¿Quieres recalcular tu plan?',
          cancel: { label: 'No', flat: true }, ok: { label: 'Recalcular', color: 'primary' },
        }).onOk(async () => {
          try { await planStore.recalculatePlan('Cambio de lesiones'); $q.notify({ type: 'positive', message: 'Plan recalculado' }) }
          catch { $q.notify({ type: 'negative', message: 'Error al recalcular' }) }
        })
      }
    }
  } catch { $q.notify({ type: 'negative', message: 'Error al guardar las lesiones' }) }
  finally { saving.value = false }
}

onMounted(async () => {
  if (!userStore.currentUser) await userStore.loadUser()
  if (!planStore.activePlan) await planStore.loadActivePlan()
  if (userStore.currentUser) {
    injuries.value = JSON.parse(JSON.stringify(userStore.currentUser.injuries))
    originalInjuries.value = JSON.parse(JSON.stringify(userStore.currentUser.injuries))
  }
})
</script>

<style scoped>
.ip-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.25rem; }
.ip-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.ip-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}
.ip-desc { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); margin: 0; }

.ip-list { list-style: none; margin: 0 0 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }

.ip-item {
  border-radius: var(--k-radius-md); background-color: var(--k-surface-container);
  overflow: hidden; transition: background-color 0.15s ease;
}
.ip-item--injured { background-color: var(--k-surface-high); box-shadow: inset 0 0 0 1px rgba(255,86,44,0.25); }

.ip-row {
  width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem;
  background: none; border: none; cursor: pointer; text-align: left;
}
.ip-row-icon {
  width: 34px; height: 34px; flex-shrink: 0; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); color: var(--k-secondary);
  display: flex; align-items: center; justify-content: center;
}
.ip-row-icon--injured { background-color: rgba(255,86,44,0.12); color: var(--k-primary-container); }
.ip-row-name {
  flex: 1; font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.ip-row-chevron { color: var(--k-surface-bright); }

.ip-detail {
  padding: 0 1rem 1rem; display: flex; flex-direction: column; gap: 0.875rem;
  border-top: 1px solid var(--k-surface-highest);
}

/* Toggle */
.ip-toggle {
  display: inline-flex; align-items: center; gap: 0.75rem;
  background: none; border: none; padding: 0.5rem 0; cursor: pointer;
}
.ip-toggle-track {
  position: relative; width: 40px; height: 22px; border-radius: 11px;
  background-color: var(--k-surface-highest); transition: background-color 0.2s ease; flex-shrink: 0;
}
.ip-toggle--on .ip-toggle-track { background-color: var(--k-primary-container); }
.ip-toggle-thumb {
  position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
  border-radius: 50%; background-color: var(--k-secondary); transition: transform 0.2s ease;
}
.ip-toggle--on .ip-toggle-thumb { transform: translateX(18px); background-color: var(--k-on-primary-container); }
.ip-toggle-label { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); }

/* Sub label */
.ip-sub-label {
  display: block; font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
  margin-bottom: 0.5rem;
}

/* Severidad */
.ip-severity-wrap { }
.ip-severity-row { display: flex; gap: 0.375rem; }
.ip-sev-btn {
  flex: 1; padding: 0.5rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-secondary);
  font-family: var(--k-font-body); font-size: var(--k-body-md); cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.ip-sev-btn--active { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }

/* Notas */
.ip-notes-wrap { }
.ip-textarea {
  width: 100%; padding: 0.75rem 1rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-on-surface);
  font-family: var(--k-font-body); font-size: var(--k-body-md); resize: vertical;
  outline: none; box-sizing: border-box;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.ip-textarea:focus { background-color: var(--k-surface-bright); box-shadow: 0 0 0 1px rgba(255,86,44,0.4); }
.ip-textarea::placeholder { color: var(--k-outline); }

/* CTA */
.ip-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.875rem; border: none; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-lg); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer; transition: opacity 0.15s ease;
}
.ip-btn--cta { background: var(--k-gradient-cta); color: var(--k-on-primary-container); }
.ip-btn--cta:hover:not(:disabled) { opacity: 0.9; }
.ip-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
