<template>
  <q-page class="flex flex-center" style="min-height: 100vh">
    <div class="full-width q-pa-lg" style="max-width: 500px">
      <!-- Header -->
      <div class="text-center q-mb-xl">
        <q-icon name="fitness_center" size="56px" color="primary" />
        <h4 class="q-mt-sm q-mb-none text-weight-bold">Personal Trainer</h4>
        <p class="text-grey-6">Selecciona tu perfil o crea uno nuevo</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center q-pa-xl">
        <q-spinner-dots size="40px" color="primary" />
      </div>

      <template v-else>
        <!-- Existing users -->
        <q-list v-if="userStore.allUsers.length > 0" class="q-mb-lg">
          <q-item
            v-for="user in userStore.allUsers"
            :key="user.id"
            clickable
            class="q-mb-sm rounded-borders"
            style="border: 1px solid rgba(255,255,255,0.1)"
            @click="selectUser(user.id)"
          >
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white" size="48px">
                {{ user.name.charAt(0).toUpperCase() }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium text-body1">{{ user.name }}</q-item-label>
              <q-item-label caption>
                {{ levelLabels[user.fitnessLevel] || user.fitnessLevel }} · {{ user.age }} anos · {{ user.weightKg }} kg
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                size="sm"
                @click.stop="confirmDelete(user)"
              />
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Empty state -->
        <div v-else class="text-center q-pa-lg q-mb-lg">
          <q-icon name="group_add" size="64px" color="grey-6" />
          <p class="text-grey-6 q-mt-md">No hay usuarios todavia. Crea tu primer perfil.</p>
        </div>

        <!-- Create new user button -->
        <q-btn
          color="primary"
          label="Crear nuevo usuario"
          icon="person_add"
          class="full-width"
          size="lg"
          @click="$router.push('/onboarding')"
        />
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
    message: `¿Seguro que quieres eliminar a "${user.name}"? Se borraran todos sus datos (plan, medidas, logros).`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    await userStore.deleteUser(user.id)
  })
}
</script>
