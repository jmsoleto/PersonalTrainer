<template>
  <PageShell :loading="store.loading">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <header class="ac-header">
      <span class="ac-overline">Logros</span>
      <h1 class="ac-title">Tus logros</h1>
      <p class="ac-count">
        <span class="ac-count-val">{{ store.unlockedCount }}</span>
        <span class="ac-count-sep"> / {{ store.totalCount }}</span>
        desbloqueados
      </p>
    </header>

    <!-- ── Filtro de categorías ───────────────────────────────── -->
    <div class="ac-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['ac-tab', { 'ac-tab--active': selectedCategory === tab.value }]"
        @click="selectedCategory = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── Grid ──────────────────────────────────────────────── -->
    <ul class="ac-grid">
      <li
        v-for="def in filteredDefinitions"
        :key="def.id"
        :class="['ac-card', { 'ac-card--locked': !store.isUnlocked(def.id) }]"
      >
        <div :class="['ac-icon-wrap', `ac-icon-wrap--${def.category}`, { 'ac-icon-wrap--locked': !store.isUnlocked(def.id) }]">
          <q-icon :name="def.icon" size="24px" />
        </div>

        <span class="ac-card-name">{{ def.name }}</span>
        <span class="ac-card-desc">{{ def.description }}</span>

        <span v-if="store.isUnlocked(def.id)" class="ac-unlock-date">
          {{ formatDate(getUnlockDate(def.id)) }}
        </span>
        <span v-else class="ac-locked-label">Bloqueado</span>
      </li>
    </ul>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageShell from '../components/layout/PageShell.vue'
import { useAchievementsStore } from '../stores/achievements'
import type { AchievementCategory } from '../types/achievement'

const store             = useAchievementsStore()
const selectedCategory  = ref('all')

const tabs = [
  { label: 'Todos',     value: 'all' },
  { label: 'Hitos',     value: 'milestone' },
  { label: 'Racha',     value: 'streak' },
  { label: 'Volumen',   value: 'volume' },
  { label: 'Constancia',value: 'consistency' },
]

const filteredDefinitions = computed(() =>
  selectedCategory.value === 'all'
    ? store.definitions
    : store.definitions.filter(d => d.category === selectedCategory.value)
)

function getUnlockDate(achievementId: string): string {
  return store.unlocked.find(u => u.achievementId === achievementId)?.unlockedAt ?? ''
}

function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

onMounted(async () => { await store.loadUnlocked(); await store.markAllSeen() })
</script>

<style scoped>
/* ── Header ──────────────────────────────────────────────────── */
.ac-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.25rem; }
.ac-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.ac-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}
.ac-count { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); margin: 0; }
.ac-count-val { font-family: var(--k-font-headline); font-weight: 700; color: var(--k-primary-container); }
.ac-count-sep { color: var(--k-surface-bright); }

/* ── Tabs ────────────────────────────────────────────────────── */
.ac-tabs {
  display: flex; gap: 0.375rem; flex-wrap: wrap; margin-bottom: 1rem;
}
.ac-tab {
  padding: 0.4rem 0.875rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-secondary);
  font-family: var(--k-font-body); font-size: var(--k-body-md); cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.ac-tab--active { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }

/* ── Grid ────────────────────────────────────────────────────── */
.ac-grid {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem;
}
.ac-card {
  display: flex; flex-direction: column; gap: 0.4rem;
  padding: 1rem; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  transition: background-color 0.15s ease;
}
.ac-card--locked { opacity: 0.45; }

/* Icono por categoría */
.ac-icon-wrap {
  width: 44px; height: 44px; border-radius: var(--k-radius-md);
  display: flex; align-items: center; justify-content: center; margin-bottom: 0.25rem;
}
.ac-icon-wrap--milestone { background-color: rgba(255,86,44,0.12); color: var(--k-primary-container); }
.ac-icon-wrap--streak    { background-color: rgba(255,180,162,0.12); color: var(--k-primary); }
.ac-icon-wrap--volume    { background-color: rgba(166,200,255,0.12); color: var(--k-tertiary); }
.ac-icon-wrap--consistency { background-color: rgba(166,200,255,0.08); color: var(--k-tertiary); }
.ac-icon-wrap--locked    { background-color: var(--k-surface-high); color: var(--k-secondary); }

.ac-card-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.ac-card-desc {
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); line-height: 1.5;
}
.ac-unlock-date {
  font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-primary); margin-top: auto;
}
.ac-locked-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); letter-spacing: var(--k-tracking-label);
  text-transform: uppercase; color: var(--k-surface-bright); margin-top: auto;
}
</style>
