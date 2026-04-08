<template>
  <PageShell :loading="loading">
    <template v-if="userStore.currentUser">
      <!-- User header with avatar -->
      <div class="row items-center q-mb-lg">
        <q-avatar color="primary" text-color="white" size="56px" class="q-mr-md">
          {{ userStore.currentUser.name.charAt(0).toUpperCase() }}
        </q-avatar>
        <div>
          <div class="text-h6">{{ userStore.currentUser.name }}</div>
          <div class="text-caption text-grey-6">{{ levelLabel }}</div>
        </div>
      </div>

      <!-- Profile info cards -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <q-list>
            <q-item>
              <q-item-section avatar><q-icon name="person" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Genero</q-item-label>
                <q-item-label>{{ genderLabel }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="cake" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Edad</q-item-label>
                <q-item-label>{{ userStore.currentUser.age }} anos</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="monitor_weight" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Peso</q-item-label>
                <q-item-label>{{ userStore.currentUser.weightKg }} kg</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="height" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Altura</q-item-label>
                <q-item-label>{{ userStore.currentUser.heightCm }} cm</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="speed" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Nivel</q-item-label>
                <q-item-label>{{ levelLabel }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <!-- Goals -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Objetivos</div>
          <q-chip
            v-for="goal in userStore.currentUser.goals"
            :key="goal"
            color="primary"
            text-color="white"
            dense
          >
            {{ goalLabels[goal] || goal }}
          </q-chip>
        </q-card-section>
      </q-card>

      <!-- Navigation cards -->
      <q-list>
        <q-item clickable to="/profile/equipment">
          <q-item-section avatar><q-icon name="inventory_2" color="primary" /></q-item-section>
          <q-item-section>
            <q-item-label>Equipamiento</q-item-label>
            <q-item-label caption>{{ userStore.currentUser.equipment.length }} elementos</q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
        <q-item clickable to="/profile/injuries">
          <q-item-section avatar><q-icon name="healing" color="red" /></q-item-section>
          <q-item-section>
            <q-item-label>Lesiones / Restricciones</q-item-label>
            <q-item-label caption>{{ userStore.currentUser.injuries.length }} activas</q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
        <q-item clickable to="/measurements">
          <q-item-section avatar><q-icon name="straighten" color="blue" /></q-item-section>
          <q-item-section>
            <q-item-label>Medidas corporales</q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
        <q-item clickable to="/settings">
          <q-item-section avatar><q-icon name="settings" color="grey" /></q-item-section>
          <q-item-section>
            <q-item-label>Ajustes</q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>

        <q-separator class="q-my-sm" />

        <q-item clickable @click="switchUser">
          <q-item-section avatar><q-icon name="swap_horiz" color="orange" /></q-item-section>
          <q-item-section>
            <q-item-label>Cambiar de usuario</q-item-label>
            <q-item-label caption>Seleccionar otro perfil</q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
      </q-list>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageShell from '../components/layout/PageShell.vue'
import { useUserStore } from '../stores/user'
import { Gender, FitnessLevel, FitnessGoal } from '../types/enums'

const router = useRouter()
const userStore = useUserStore()

const loading = computed(() => userStore.loading)

const genderLabel = computed(() => {
  const map: Record<string, string> = {
    [Gender.Male]: 'Masculino',
    [Gender.Female]: 'Femenino',
    [Gender.Other]: 'Otro',
    [Gender.PreferNotToSay]: 'Prefiero no decirlo',
  }
  return map[userStore.currentUser?.gender ?? ''] ?? ''
})

const levelLabel = computed(() => {
  const map: Record<string, string> = {
    [FitnessLevel.Beginner]: 'Principiante',
    [FitnessLevel.Intermediate]: 'Intermedio',
    [FitnessLevel.Advanced]: 'Avanzado',
  }
  return map[userStore.currentUser?.fitnessLevel ?? ''] ?? ''
})

const goalLabels: Record<string, string> = {
  [FitnessGoal.LoseWeight]: 'Perder peso',
  [FitnessGoal.GainMuscle]: 'Ganar musculo',
  [FitnessGoal.ImproveEndurance]: 'Mejorar resistencia',
  [FitnessGoal.Flexibility]: 'Flexibilidad',
  [FitnessGoal.GeneralFitness]: 'Fitness general',
  [FitnessGoal.Strength]: 'Fuerza',
}

function switchUser() {
  userStore.logout()
  router.push('/users')
}

onMounted(async () => {
  if (!userStore.currentUser) {
    await userStore.loadUser()
  }
})
</script>
