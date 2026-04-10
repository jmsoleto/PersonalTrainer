<template>
  <div class="eq-root">
    <p class="eq-hint">Selecciona el material del que dispones</p>

    <div class="eq-grid">
      <button
        v-for="item in equipmentOptions"
        :key="item.value"
        :class="['eq-card', { 'eq-card--selected': isSelected(item.value) }]"
        type="button"
        @click="toggleEquipment(item.value)"
      >
        <q-icon
          :name="item.icon"
          size="32px"
          :class="['eq-icon', { 'eq-icon--selected': isSelected(item.value) }]"
        />
        <span class="eq-label">{{ item.label }}</span>

        <span v-if="isSelected(item.value)" class="eq-check">
          <q-icon name="check" size="12px" />
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Equipment } from '../../types/enums'

const emit = defineEmits<{ update: [equipment: Equipment[]] }>()

const selected = ref<Equipment[]>([Equipment.BodyweightOnly])

const equipmentOptions = [
  { label: 'Peso corporal',    value: Equipment.BodyweightOnly,    icon: 'accessibility_new' },
  { label: 'Mancuernas',       value: Equipment.Dumbbells,         icon: 'fitness_center' },
  { label: 'Barra olímpica',   value: Equipment.Barbell,           icon: 'horizontal_rule' },
  { label: 'Kettlebell',       value: Equipment.Kettlebell,        icon: 'sports_martial_arts' },
  { label: 'Bandas elásticas', value: Equipment.ResistanceBands,   icon: 'cable' },
  { label: 'Barra dominadas',  value: Equipment.PullUpBar,         icon: 'drag_handle' },
  { label: 'Banco',            value: Equipment.Bench,             icon: 'weekend' },
  { label: 'Esterilla',        value: Equipment.YogaMat,           icon: 'self_improvement' },
]

function isSelected(e: Equipment) { return selected.value.includes(e) }

function toggleEquipment(equipment: Equipment) {
  if (equipment === Equipment.BodyweightOnly) {
    selected.value = [Equipment.BodyweightOnly]
    return
  }
  const filtered = selected.value.filter(e => e !== Equipment.BodyweightOnly)
  const idx = filtered.indexOf(equipment)
  idx === -1 ? filtered.push(equipment) : filtered.splice(idx, 1)
  selected.value = filtered.length === 0 ? [Equipment.BodyweightOnly] : filtered
}

watch(selected, (val) => emit('update', [...val]), { deep: true, immediate: true })
</script>

<style scoped>
.eq-root {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.eq-hint {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
  margin: 0;
}

.eq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

/* ── Card ────────────────────────────────────────────────────── */
.eq-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 1rem;
  border: none;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.eq-card:hover {
  background-color: var(--k-surface-high);
  transform: translateY(-1px);
}

.eq-card--selected {
  background-color: var(--k-surface-high);
  box-shadow: inset 0 0 0 1px rgba(255, 86, 44, 0.35);
}

/* ── Icon ────────────────────────────────────────────────────── */
.eq-icon {
  color: var(--k-surface-bright);
  transition: color 0.15s ease;
}

.eq-icon--selected {
  color: var(--k-primary-container);
}

/* ── Label ───────────────────────────────────────────────────── */
.eq-label {
  font-family: var(--k-font-headline);
  font-size: var(--k-body-md);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  line-height: 1.2;
}

/* ── Check badge ─────────────────────────────────────────────── */
.eq-check {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 20px;
  height: 20px;
  border-radius: var(--k-radius-sm);
  background-color: var(--k-primary-container);
  color: var(--k-on-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
