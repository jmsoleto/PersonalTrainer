<template>
  <PageShell :loading="loading">
    <template v-if="userStore.currentUser">

      <!-- ── Avatar + nombre ────────────────────────────────── -->
      <header class="pp-header">
        <div class="pp-avatar">
          {{ userStore.currentUser.name.charAt(0).toUpperCase() }}
        </div>
        <div class="pp-header-text">
          <span class="pp-overline">Perfil</span>
          <h1 class="pp-name">{{ userStore.currentUser.name }}</h1>
          <span class="pp-level">{{ levelLabel }}</span>
        </div>
      </header>

      <!-- ── Info básica ────────────────────────────────────── -->
      <section class="pp-section">
        <span class="pp-section-label">Datos personales</span>
        <div class="pp-rows">
          <div class="pp-row">
            <q-icon name="person" size="18px" class="pp-row-icon" />
            <span class="pp-row-key">Género</span>
            <span class="pp-row-val">{{ genderLabel }}</span>
          </div>
          <div class="pp-row">
            <q-icon name="cake" size="18px" class="pp-row-icon" />
            <span class="pp-row-key">Edad</span>
            <span class="pp-row-val">{{ userStore.currentUser.age }} años</span>
          </div>
          <div class="pp-row">
            <q-icon name="monitor_weight" size="18px" class="pp-row-icon" />
            <span class="pp-row-key">Peso</span>
            <span class="pp-row-val">{{ userStore.currentUser.weightKg }} kg</span>
          </div>
          <div class="pp-row">
            <q-icon name="height" size="18px" class="pp-row-icon" />
            <span class="pp-row-key">Altura</span>
            <span class="pp-row-val">{{ userStore.currentUser.heightCm }} cm</span>
          </div>
          <div class="pp-row">
            <q-icon name="speed" size="18px" class="pp-row-icon" />
            <span class="pp-row-key">Nivel</span>
            <span class="pp-row-val">{{ levelLabel }}</span>
          </div>
        </div>
      </section>

      <!-- ── Objetivos ──────────────────────────────────────── -->
      <section class="pp-section">
        <span class="pp-section-label">Objetivos</span>
        <div class="pp-chips">
          <span v-for="goal in userStore.currentUser.goals" :key="goal" class="pp-chip">
            {{ goalLabels[goal] || goal }}
          </span>
        </div>
      </section>

      <!-- ── Navegación ─────────────────────────────────────── -->
      <ul class="pp-nav">
        <li>
          <router-link to="/profile/equipment" class="pp-nav-item">
            <div class="pp-nav-icon" style="background-color: rgba(255,86,44,0.12)">
              <q-icon name="inventory_2" size="18px" style="color: var(--k-primary-container)" />
            </div>
            <div class="pp-nav-info">
              <span class="pp-nav-name">Equipamiento</span>
              <span class="pp-nav-meta">{{ userStore.currentUser.equipment.length }} elementos</span>
            </div>
            <q-icon name="chevron_right" size="18px" class="pp-nav-chevron" />
          </router-link>
        </li>
        <li>
          <router-link to="/profile/injuries" class="pp-nav-item">
            <div class="pp-nav-icon" style="background-color: rgba(255,180,162,0.12)">
              <q-icon name="healing" size="18px" style="color: var(--k-primary)" />
            </div>
            <div class="pp-nav-info">
              <span class="pp-nav-name">Lesiones / Restricciones</span>
              <span class="pp-nav-meta">{{ userStore.currentUser.injuries.length }} activas</span>
            </div>
            <q-icon name="chevron_right" size="18px" class="pp-nav-chevron" />
          </router-link>
        </li>
        <li>
          <router-link to="/measurements" class="pp-nav-item">
            <div class="pp-nav-icon" style="background-color: rgba(166,200,255,0.12)">
              <q-icon name="straighten" size="18px" style="color: var(--k-tertiary)" />
            </div>
            <div class="pp-nav-info">
              <span class="pp-nav-name">Medidas corporales</span>
            </div>
            <q-icon name="chevron_right" size="18px" class="pp-nav-chevron" />
          </router-link>
        </li>
        <li>
          <router-link to="/settings" class="pp-nav-item">
            <div class="pp-nav-icon" style="background-color: var(--k-surface-high)">
              <q-icon name="settings" size="18px" style="color: var(--k-secondary)" />
            </div>
            <div class="pp-nav-info">
              <span class="pp-nav-name">Ajustes</span>
            </div>
            <q-icon name="chevron_right" size="18px" class="pp-nav-chevron" />
          </router-link>
        </li>

        <!-- Separador tonal -->
        <div class="pp-sep" />

        <li>
          <button class="pp-nav-item pp-nav-item--btn" @click="switchUser">
            <div class="pp-nav-icon" style="background-color: rgba(255,180,162,0.12)">
              <q-icon name="swap_horiz" size="18px" style="color: var(--k-primary)" />
            </div>
            <div class="pp-nav-info">
              <span class="pp-nav-name">Cambiar de usuario</span>
              <span class="pp-nav-meta">Seleccionar otro perfil</span>
            </div>
            <q-icon name="chevron_right" size="18px" class="pp-nav-chevron" />
          </button>
        </li>
      </ul>

    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageShell from '../components/layout/PageShell.vue'
import { useUserStore } from '../stores/user'
import { Gender, FitnessLevel, FitnessGoal } from '../types/enums'

const router    = useRouter()
const userStore = useUserStore()
const loading   = computed(() => userStore.loading)

const genderLabel = computed(() => ({
  [Gender.Male]: 'Masculino', [Gender.Female]: 'Femenino',
  [Gender.Other]: 'Otro', [Gender.PreferNotToSay]: 'Prefiero no decirlo',
})[userStore.currentUser?.gender ?? ''] ?? '')

const levelLabel = computed(() => ({
  [FitnessLevel.Beginner]: 'Principiante',
  [FitnessLevel.Intermediate]: 'Intermedio',
  [FitnessLevel.Advanced]: 'Avanzado',
})[userStore.currentUser?.fitnessLevel ?? ''] ?? '')

const goalLabels: Record<string, string> = {
  [FitnessGoal.LoseWeight]: 'Perder peso',
  [FitnessGoal.GainMuscle]: 'Ganar músculo',
  [FitnessGoal.ImproveEndurance]: 'Mejorar resistencia',
  [FitnessGoal.Flexibility]: 'Flexibilidad',
  [FitnessGoal.GeneralFitness]: 'Fitness general',
  [FitnessGoal.Strength]: 'Fuerza',
}

function switchUser() { userStore.logout(); router.push('/users') }

onMounted(async () => { if (!userStore.currentUser) await userStore.loadUser() })
</script>

<style scoped>
.pp-header {
  display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem;
}
.pp-avatar {
  width: 56px; height: 56px; flex-shrink: 0; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-primary);
  font-family: var(--k-font-headline); font-size: var(--k-headline-md); font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.pp-header-text { display: flex; flex-direction: column; gap: 0.2rem; }
.pp-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.pp-name {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}
.pp-level { font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); }

/* Sección */
.pp-section {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 1rem; margin-bottom: 0.625rem;
  display: flex; flex-direction: column; gap: 0.75rem;
}
.pp-section-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
}
.pp-rows { display: flex; flex-direction: column; gap: 0; }
.pp-row {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--k-surface-highest);
}
.pp-row:last-child { border-bottom: none; padding-bottom: 0; }
.pp-row:first-child { padding-top: 0; }
.pp-row-icon { color: var(--k-secondary); flex-shrink: 0; }
.pp-row-key {
  font-family: var(--k-font-body); font-size: var(--k-body-md); color: var(--k-secondary); flex: 1;
}
.pp-row-val {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}

/* Chips de objetivos */
.pp-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.pp-chip {
  padding: 0.25rem 0.625rem; border-radius: var(--k-radius-sm);
  background-color: rgba(255,86,44,0.12); color: var(--k-primary-container);
  font-family: var(--k-font-body); font-size: var(--k-label-md); letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
}

/* Navegación */
.pp-nav { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.pp-sep { height: 1px; background-color: var(--k-surface-high); margin: 0.25rem 0; }
.pp-nav-item {
  display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem;
  border-radius: var(--k-radius-md); background-color: var(--k-surface-container);
  text-decoration: none; transition: background-color 0.15s ease;
}
.pp-nav-item--btn { width: 100%; border: none; cursor: pointer; text-align: left; }
.pp-nav-item:hover { background-color: var(--k-surface-high); }
.pp-nav-icon {
  width: 36px; height: 36px; flex-shrink: 0; border-radius: var(--k-radius-md);
  display: flex; align-items: center; justify-content: center;
}
.pp-nav-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.pp-nav-name {
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface);
}
.pp-nav-meta { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-secondary); }
.pp-nav-chevron { color: var(--k-surface-bright); }
</style>
