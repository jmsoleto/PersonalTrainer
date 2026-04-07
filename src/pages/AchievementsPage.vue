<template>
  <PageShell :loading="store.loading">
    <div class="q-mb-md text-center">
      <q-icon name="emoji_events" size="40px" color="amber" />
      <div class="text-h6 q-mt-sm">
        {{ store.unlockedCount }} / {{ store.totalCount }} logros desbloqueados
      </div>
    </div>

    <q-tabs
      v-model="selectedCategory"
      dense
      active-color="primary"
      indicator-color="primary"
      align="justify"
      narrow-indicator
      class="q-mb-md"
    >
      <q-tab name="all" label="Todos" />
      <q-tab name="milestone" label="Hitos" />
      <q-tab name="streak" label="Racha" />
      <q-tab name="volume" label="Volumen" />
      <q-tab name="consistency" label="Constancia" />
    </q-tabs>

    <div class="row q-col-gutter-sm">
      <div
        v-for="def in filteredDefinitions"
        :key="def.id"
        class="col-6"
      >
        <q-card
          flat
          bordered
          :class="['full-height', { 'locked-card': !store.isUnlocked(def.id) }]"
        >
          <q-card-section class="text-center q-pa-sm">
            <q-avatar
              :color="store.isUnlocked(def.id) ? categoryColor(def.category) : 'grey-4'"
              :text-color="store.isUnlocked(def.id) ? 'white' : 'grey-6'"
              size="48px"
            >
              <q-icon :name="def.icon" size="24px" />
            </q-avatar>

            <div class="text-subtitle2 q-mt-sm">{{ def.name }}</div>
            <div class="text-caption text-grey-7 q-mt-xs">{{ def.description }}</div>

            <div
              v-if="store.isUnlocked(def.id)"
              class="text-caption text-positive q-mt-xs"
            >
              Desbloqueado: {{ formatDate(getUnlockDate(def.id)) }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import { useAchievementsStore } from '../stores/achievements'
import type { AchievementCategory } from '../types/achievement'

const store = useAchievementsStore()
const selectedCategory = ref<string>('all')

const filteredDefinitions = computed(() => {
  if (selectedCategory.value === 'all') return store.definitions
  return store.definitions.filter(d => d.category === selectedCategory.value)
})

function categoryColor(category: AchievementCategory): string {
  const colors: Record<AchievementCategory, string> = {
    milestone: 'amber-8',
    streak: 'deep-orange',
    volume: 'blue',
    consistency: 'green',
  }
  return colors[category]
}

function getUnlockDate(achievementId: string): string {
  const item = store.unlocked.find(u => u.achievementId === achievementId)
  return item?.unlockedAt ?? ''
}

function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

onMounted(async () => {
  await store.loadUnlocked()
  await store.markAllSeen()
})
</script>

<style scoped>
.locked-card {
  opacity: 0.5;
}
</style>
