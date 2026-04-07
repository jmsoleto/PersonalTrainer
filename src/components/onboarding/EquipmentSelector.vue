<template>
  <div>
    <h6 class="q-mb-md">Tu equipamiento</h6>
    <p class="text-grey-6 q-mb-lg">Selecciona el material del que dispones</p>

    <div class="row q-col-gutter-md">
      <div
        v-for="item in equipmentOptions"
        :key="item.value"
        class="col-6"
      >
        <q-card
          :class="[
            'cursor-pointer equip-card',
            isSelected(item.value) ? 'selected' : ''
          ]"
          flat
          bordered
          @click="toggleEquipment(item.value)"
        >
          <q-card-section class="text-center">
            <q-icon :name="item.icon" size="36px" :color="isSelected(item.value) ? 'primary' : 'grey-6'" />
            <div class="q-mt-sm text-subtitle2">{{ item.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Equipment } from '../../types/enums'

const emit = defineEmits<{
  update: [equipment: Equipment[]]
}>()

const selected = ref<Equipment[]>([Equipment.BodyweightOnly])

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

function isSelected(equipment: Equipment): boolean {
  return selected.value.includes(equipment)
}

function toggleEquipment(equipment: Equipment) {
  // If selecting bodyweight only, clear everything else
  if (equipment === Equipment.BodyweightOnly) {
    selected.value = [Equipment.BodyweightOnly]
    return
  }

  // If selecting any other equipment, remove bodyweight-only
  const filtered = selected.value.filter(e => e !== Equipment.BodyweightOnly)

  const idx = filtered.indexOf(equipment)
  if (idx === -1) {
    filtered.push(equipment)
  } else {
    filtered.splice(idx, 1)
  }

  // If nothing selected, default back to bodyweight
  selected.value = filtered.length === 0 ? [Equipment.BodyweightOnly] : filtered
}

watch(selected, (val) => {
  emit('update', [...val])
}, { deep: true, immediate: true })
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
