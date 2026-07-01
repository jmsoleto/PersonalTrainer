<template>
  <nav class="bn-bar">
    <router-link
      v-for="item in tabs"
      :key="item.to"
      :to="item.to"
      class="bn-tab"
      :class="{ 'bn-tab--active': isActive(item.to) }"
    >
      <span class="material-symbols-outlined bn-icon">{{ item.icon }}</span>
      <span class="bn-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { to: '/dashboard', icon: 'home',           label: 'Inicio'     },
  { to: '/plan',      icon: 'event_note',      label: 'Plan'       },
  { to: '/exercises', icon: 'fitness_center',  label: 'Ejercicios' },
  { to: '/stats',     icon: 'monitoring',      label: 'Stats'      },
  { to: '/profile',   icon: 'person',          label: 'Perfil'     },
]

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<style scoped>
.bn-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  align-items: stretch;
  background-color: var(--k-surface-low);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  /* Subtle top separator via tonal shift — no border */
  box-shadow: 0 -1px 0 0 var(--k-surface-container);
}

.bn-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.625rem 0.25rem;
  text-decoration: none;
  color: var(--k-secondary);
  transition: color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.bn-tab--active {
  color: var(--k-primary-container);
}

.bn-icon {
  font-size: 22px;
  transition: font-variation-settings 0.15s ease;
}

.bn-tab--active .bn-icon {
  font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}

.bn-label {
  font-family: var(--k-font-body);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  line-height: 1;
}
</style>
