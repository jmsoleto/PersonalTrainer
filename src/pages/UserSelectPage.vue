<template>
  <q-page class="usp-page flex flex-center">
    <div class="usp-container">

      <!-- Header -->
      <div class="usp-header">
        <div class="usp-icon-wrap">
          <q-icon name="fitness_center" class="usp-icon" />
        </div>
        <h1 class="usp-title">Filetics<br>Trainer</h1>
        <p class="usp-subtitle">Selecciona tu perfil o crea uno nuevo</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="usp-loading">
        <q-spinner-dots size="40px" color="primary" />
      </div>

      <template v-else>
        <!-- Existing users -->
        <ul v-if="userStore.allUsers.length > 0" class="usp-list">
          <li
            v-for="user in userStore.allUsers"
            :key="user.id"
            class="usp-item"
            @click="selectUser(user.id)"
          >
            <div class="usp-avatar">
              {{ user.name.charAt(0).toUpperCase() }}
            </div>
            <div class="usp-item-info">
              <span class="usp-item-name">{{ user.name }}</span>
              <span class="usp-item-meta">
                {{ levelLabels[user.fitnessLevel] || user.fitnessLevel }}
                &nbsp;·&nbsp;{{ user.age }} años
                &nbsp;·&nbsp;{{ user.weightKg }} kg
              </span>
            </div>
            <button
              class="usp-delete"
              aria-label="Eliminar usuario"
              @click.stop="confirmDelete(user)"
            >
              <q-icon name="delete_outline" size="18px" />
            </button>
          </li>
        </ul>

        <!-- Empty state -->
        <div v-else class="usp-empty">
          <span class="usp-empty-watermark">01</span>
          <q-icon name="group_add" size="48px" class="usp-empty-icon" />
          <p class="usp-empty-text">No hay perfiles todavía.<br>Crea el primero.</p>
        </div>

        <!-- CTA -->
        <button class="usp-cta" @click="$router.push('/onboarding')">
          <q-icon name="person_add" size="20px" />
          Crear nuevo perfil
        </button>
      </template>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '../stores/user'
import type { UserProfile } from '../types/user'
import { FitnessLevel } from '../types/enums'

const router = useRouter()
const $q = useQuasar()
const userStore = useUserStore()
const loading = ref(true)

const levelLabels: Record<string, string> = {
  [FitnessLevel.Beginner]: 'Principiante',
  [FitnessLevel.Intermediate]: 'Intermedio',
  [FitnessLevel.Advanced]: 'Avanzado',
}

onMounted(async () => {
  await userStore.loadAllUsers()
  loading.value = false
})

async function selectUser(userId: string) {
  await userStore.selectUser(userId)
  router.push('/dashboard')
}

function confirmDelete(user: UserProfile) {
  $q.dialog({
    title: 'Eliminar usuario',
    message: `¿Seguro que quieres eliminar a "${user.name}"? Se borrarán todos sus datos (plan, medidas, logros).`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    await userStore.deleteUser(user.id)
  })
}
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────── */
.usp-page {
  min-height: 100vh;
  background-color: var(--k-surface);
}

.usp-container {
  width: 100%;
  max-width: 440px;
  padding: 2.5rem 1.5rem 3rem;
}

/* ── Header ──────────────────────────────────────────────────── */
.usp-header {
  margin-bottom: 2.5rem;
}

.usp-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
  margin-bottom: 1.25rem;
}

.usp-icon {
  font-size: 28px;
  color: var(--k-primary-container);
}

.usp-title {
  font-family: var(--k-font-headline);
  font-size: var(--k-headline-lg);
  font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  line-height: 1.1;
  margin: 0 0 0.75rem;
}

.usp-subtitle {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
  margin: 0;
}

/* ── Loading ─────────────────────────────────────────────────── */
.usp-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

/* ── Lista de perfiles ───────────────────────────────────────── */
.usp-list {
  list-style: none;
  margin: 0 0 1.5rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.usp-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-container);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.usp-item:hover {
  background-color: var(--k-surface-high);
}

.usp-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest);
  color: var(--k-primary);
  font-family: var(--k-font-headline);
  font-size: var(--k-title-lg);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.usp-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.usp-item-name {
  font-family: var(--k-font-headline);
  font-size: var(--k-body-lg);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.usp-item-meta {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  color: var(--k-secondary);
  text-transform: uppercase;
  letter-spacing: var(--k-tracking-label);
}

.usp-delete {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--k-radius-sm);
  background: transparent;
  color: var(--k-outline);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.usp-delete:hover {
  color: var(--k-error);
  background-color: var(--k-surface-highest);
}

/* ── Estado vacío ────────────────────────────────────────────── */
.usp-empty {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 2rem 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-low);
  overflow: hidden;
}

.usp-empty-watermark {
  position: absolute;
  top: -0.5rem;
  right: 1rem;
  font-family: var(--k-font-headline);
  font-size: 6rem;
  font-weight: 700;
  color: var(--k-on-surface);
  opacity: 0.05;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.usp-empty-icon {
  color: var(--k-surface-bright);
  margin-bottom: 0.75rem;
}

.usp-empty-text {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
  margin: 0;
  line-height: 1.6;
}

/* ── CTA ─────────────────────────────────────────────────────── */
.usp-cta {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: var(--k-radius-md);
  background: var(--k-gradient-cta);
  color: var(--k-on-primary-container);
  font-family: var(--k-font-headline);
  font-size: var(--k-body-lg);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.usp-cta:hover {
  opacity: 0.9;
}

.usp-cta:active {
  opacity: 0.8;
}
</style>
