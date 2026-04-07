<template>
  <PageShell :loading="loading">
    <div class="text-h6 q-mb-md">Lesiones / Restricciones</div>
    <p class="text-grey-6 q-mb-lg">
      Marca las zonas donde tienes molestias o lesiones para adaptar tu plan
    </p>

    <q-list separator class="q-mb-lg">
      <q-expansion-item
        v-for="group in muscleGroups"
        :key="group.value"
        :label="group.label"
        :icon="isInjured(group.value) ? 'warning' : 'check_circle_outline'"
        :header-class="isInjured(group.value) ? 'text-negative' : ''"
        group="injuries"
      >
        <q-card>
          <q-card-section>
            <q-toggle
              :model-value="isInjured(group.value)"
              label="Zona lesionada"
              color="negative"
              @update:model-value="(val: boolean) => toggleInjury(group.value, val)"
            />

            <template v-if="isInjured(group.value)">
              <div class="q-mt-md q-mb-sm text-subtitle2">Severidad</div>
              <q-option-group
                :model-value="getInjury(group.value)?.severity"
                :options="severityOptions"
                color="negative"
                inline
                @update:model-value="(val: string) => updateSeverity(group.value, val as InjurySeverity)"
              />

              <q-input
                :model-value="getInjury(group.value)?.notes ?? ''"
                label="Notas (opcional)"
                type="textarea"
                autogrow
                outlined
                dense
                class="q-mt-md"
                @update:model-value="(val: string | number | null) => updateNotes(group.value, String(val ?? ''))"
              />
            </template>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-list>

    <q-btn
      label="Guardar cambios"
      color="primary"
      class="full-width"
      unelevated
      :loading="saving"
      :disable="!hasChanges"
      @click="save"
    />
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

const $q = useQuasar()
const userStore = useUserStore()
const planStore = usePlanStore()

const injuries = ref<InjuryZone[]>([])
const originalInjuries = ref<InjuryZone[]>([])
const saving = ref(false)

const loading = computed(() => userStore.loading)

const muscleGroups: { label: string; value: MuscleGroup }[] = [
  { label: 'Pecho', value: MuscleGroup.Chest },
  { label: 'Espalda', value: MuscleGroup.Back },
  { label: 'Hombros', value: MuscleGroup.Shoulders },
  { label: 'Biceps', value: MuscleGroup.Biceps },
  { label: 'Triceps', value: MuscleGroup.Triceps },
  { label: 'Antebrazos', value: MuscleGroup.Forearms },
  { label: 'Core / Abdomen', value: MuscleGroup.Core },
  { label: 'Cuadriceps', value: MuscleGroup.Quads },
  { label: 'Isquiotibiales', value: MuscleGroup.Hamstrings },
  { label: 'Gluteos', value: MuscleGroup.Glutes },
  { label: 'Pantorrillas', value: MuscleGroup.Calves },
  { label: 'Cuerpo completo', value: MuscleGroup.FullBody },
]

const muscleGroupLabelMap: Record<string, string> = Object.fromEntries(
  muscleGroups.map((g) => [g.value, g.label]),
)

const severityOptions = [
  { label: 'Leve', value: 'mild' },
  { label: 'Moderada', value: 'moderate' },
  { label: 'Severa', value: 'severe' },
]

const hasChanges = computed(() => {
  return JSON.stringify(
    injuries.value.map((i) => ({ m: i.muscleGroup, s: i.severity, n: i.notes })).sort((a, b) => a.m.localeCompare(b.m)),
  ) !== JSON.stringify(
    originalInjuries.value.map((i) => ({ m: i.muscleGroup, s: i.severity, n: i.notes })).sort((a, b) => a.m.localeCompare(b.m)),
  )
})

function isInjured(group: MuscleGroup): boolean {
  return injuries.value.some((i) => i.muscleGroup === group)
}

function getInjury(group: MuscleGroup): InjuryZone | undefined {
  return injuries.value.find((i) => i.muscleGroup === group)
}

function toggleInjury(group: MuscleGroup, active: boolean) {
  if (active) {
    injuries.value.push({
      muscleGroup: group,
      severity: 'mild' as InjurySeverity,
      notes: '',
      dateMarked: new Date().toISOString(),
    })
  } else {
    injuries.value = injuries.value.filter((i) => i.muscleGroup !== group)
  }
}

function updateSeverity(group: MuscleGroup, severity: InjurySeverity) {
  const injury = injuries.value.find((i) => i.muscleGroup === group)
  if (injury) {
    injury.severity = severity
  }
}

function updateNotes(group: MuscleGroup, notes: string) {
  const injury = injuries.value.find((i) => i.muscleGroup === group)
  if (injury) {
    injury.notes = notes
  }
}

async function save() {
  saving.value = true
  try {
    await userStore.updateInjuries([...injuries.value])
    const prevGroups = originalInjuries.value.map((i) => i.muscleGroup)
    const newGroups = injuries.value.map((i) => i.muscleGroup)
    originalInjuries.value = JSON.parse(JSON.stringify(injuries.value))

    $q.notify({ type: 'positive', message: 'Lesiones actualizadas' })

    if (planStore.activePlan) {
      const added = newGroups.filter((g) => !prevGroups.includes(g))
      const removed = prevGroups.filter((g) => !newGroups.includes(g))
      const changed = newGroups.filter((g) => {
        const prev = originalInjuries.value.find((i) => i.muscleGroup === g)
        const curr = injuries.value.find((i) => i.muscleGroup === g)
        return prev && curr && prev.severity !== curr.severity
      })

      if (added.length > 0 || removed.length > 0 || changed.length > 0) {
        const parts: string[] = []
        if (added.length > 0) {
          parts.push('nueva lesion en ' + added.map((g) => muscleGroupLabelMap[g] || g).join(', '))
        }
        if (removed.length > 0) {
          parts.push('recuperado en ' + removed.map((g) => muscleGroupLabelMap[g] || g).join(', '))
        }
        if (changed.length > 0) {
          parts.push('cambio de severidad en ' + changed.map((g) => muscleGroupLabelMap[g] || g).join(', '))
        }
        const reason = 'Cambio de lesiones: ' + parts.join('; ')

        $q.dialog({
          title: 'Recalcular plan',
          message: 'Tus lesiones han cambiado. Quieres recalcular tu plan de entrenamiento?',
          cancel: { label: 'No', flat: true },
          ok: { label: 'Recalcular', color: 'primary' },
          persistent: false,
        }).onOk(async () => {
          try {
            await planStore.recalculatePlan(reason)
            $q.notify({ type: 'positive', message: 'Plan recalculado correctamente' })
          } catch {
            $q.notify({ type: 'negative', message: 'Error al recalcular el plan' })
          }
        })
      }
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Error al guardar las lesiones' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!userStore.currentUser) {
    await userStore.loadUser()
  }
  if (!planStore.activePlan) {
    await planStore.loadActivePlan()
  }
  if (userStore.currentUser) {
    injuries.value = JSON.parse(JSON.stringify(userStore.currentUser.injuries))
    originalInjuries.value = JSON.parse(JSON.stringify(userStore.currentUser.injuries))
  }
})
</script>
