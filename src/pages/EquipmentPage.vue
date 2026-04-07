<template>
  <PageShell :loading="loading">
    <div class="text-h6 q-mb-md">Mi Equipamiento</div>
    <p class="text-grey-6 q-mb-lg">Selecciona el material del que dispones</p>

    <div class="row q-col-gutter-md q-mb-lg">
      <div
        v-for="item in equipmentOptions"
        :key="item.value"
        class="col-6"
      >
        <q-card
          :class="[
            'cursor-pointer equip-card',
            isSelected(item.value) ? 'selected' : '',
          ]"
          flat
          bordered
          @click="toggleEquipment(item.value)"
        >
          <q-card-section class="text-center">
            <q-icon
              :name="item.icon"
              size="36px"
              :color="isSelected(item.value) ? 'primary' : 'grey-6'"
            />
            <div class="q-mt-sm text-subtitle2">{{ item.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

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
import { Equipment } from '../types/enums'

const $q = useQuasar()
const userStore = useUserStore()
const planStore = usePlanStore()

const selected = ref<Equipment[]>([])
const saving = ref(false)
const originalEquipment = ref<Equipment[]>([])

const loading = computed(() => userStore.loading)

const equipmentOptions = [
  { label: 'Solo peso corporal', value: Equipment.BodyweightOnly, icon: 'accessibility_new' },
  { label: 'Mancuernas', value: Equipment.Dumbbells, icon: 'fitness_center' },
  { label: 'Barra olimpica', value: Equipment.Barbell, icon: 'horizontal_rule' },
  { label: 'Kettlebell', value: Equipment.Kettlebell, icon: 'sports_martial_arts' },
  { label: 'Bandas elasticas', value: Equipment.ResistanceBands, icon: 'cable' },
  { label: 'Barra dominadas', value: Equipment.PullUpBar, icon: 'drag_handle' },
  { label: 'Banco', value: Equipment.Bench, icon: 'weekend' },
  { label: 'Esterilla', value: Equipment.YogaMat, icon: 'self_improvement' },
]

const equipmentLabelMap: Record<string, string> = Object.fromEntries(
  equipmentOptions.map((o) => [o.value, o.label]),
)

const hasChanges = computed(() => {
  if (selected.value.length !== originalEquipment.value.length) return true
  const sorted1 = [...selected.value].sort()
  const sorted2 = [...originalEquipment.value].sort()
  return sorted1.some((v, i) => v !== sorted2[i])
})

function isSelected(equipment: Equipment): boolean {
  return selected.value.includes(equipment)
}

function toggleEquipment(equipment: Equipment) {
  if (equipment === Equipment.BodyweightOnly) {
    selected.value = [Equipment.BodyweightOnly]
    return
  }

  const filtered = selected.value.filter((e) => e !== Equipment.BodyweightOnly)
  const idx = filtered.indexOf(equipment)
  if (idx === -1) {
    filtered.push(equipment)
  } else {
    filtered.splice(idx, 1)
  }

  selected.value = filtered.length === 0 ? [Equipment.BodyweightOnly] : filtered
}

async function save() {
  saving.value = true
  try {
    const previous = await userStore.updateEquipment([...selected.value])
    originalEquipment.value = [...selected.value]

    $q.notify({ type: 'positive', message: 'Equipamiento actualizado' })

    if (planStore.activePlan && previous) {
      const added = selected.value.filter((e) => !previous.includes(e))
      const removed = previous.filter((e) => !selected.value.includes(e))

      if (added.length > 0 || removed.length > 0) {
        const parts: string[] = []
        if (removed.length > 0) {
          parts.push('eliminado ' + removed.map((e) => equipmentLabelMap[e] || e).join(', '))
        }
        if (added.length > 0) {
          parts.push('agregado ' + added.map((e) => equipmentLabelMap[e] || e).join(', '))
        }
        const reason = 'Cambio de equipamiento: ' + parts.join('; ')

        $q.dialog({
          title: 'Recalcular plan',
          message: 'Tu equipamiento ha cambiado. Quieres recalcular tu plan de entrenamiento?',
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
    $q.notify({ type: 'negative', message: 'Error al guardar el equipamiento' })
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
    selected.value = [...userStore.currentUser.equipment]
    originalEquipment.value = [...userStore.currentUser.equipment]
  }
})
</script>

<style scoped lang="scss">
.equip-card {
  transition: all 0.2s ease;

  &.selected {
    border-color: var(--q-primary);
    background-color: rgba(233, 69, 96, 0.1);
  }

  &:hover {
    transform: translateY(-2px);
  }
}
</style>
