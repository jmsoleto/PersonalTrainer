<template>
  <q-page class="flex flex-center" style="min-height: 100vh">
    <div class="full-width q-pa-lg" style="max-width: 500px">
      <!-- Header -->
      <div class="text-center q-mb-xl">
        <q-icon name="fitness_center" size="56px" color="primary" />
        <h4 class="q-mt-sm q-mb-none text-weight-bold">Personal Trainer</h4>
        <p class="text-grey-6">Tu entrenador personal con IA</p>
      </div>

      <!-- Stepper -->
      <q-stepper
        v-model="step"
        vertical
        color="primary"
        animated
        flat
      >
        <!-- Step 1: Profile -->
        <q-step
          :name="1"
          title="Tu perfil"
          icon="person"
          :done="step > 1"
        >
          <ProfileForm @update="onProfileUpdate" />
          <q-stepper-navigation>
            <q-btn
              color="primary"
              label="Siguiente"
              @click="step = 2"
            />
          </q-stepper-navigation>
        </q-step>

        <!-- Step 2: Goals -->
        <q-step
          :name="2"
          title="Tus objetivos"
          icon="flag"
          :done="step > 2"
        >
          <GoalSelector @update="onGoalsUpdate" />
          <q-stepper-navigation>
            <q-btn
              color="primary"
              label="Siguiente"
              :disable="goals.length === 0"
              @click="step = 3"
            />
            <q-btn
              flat
              color="primary"
              label="Atras"
              class="q-ml-sm"
              @click="step = 1"
            />
          </q-stepper-navigation>
        </q-step>

        <!-- Step 3: Equipment -->
        <q-step
          :name="3"
          title="Tu equipamiento"
          icon="inventory_2"
          :done="step > 3"
        >
          <EquipmentSelector @update="onEquipmentUpdate" />
          <q-stepper-navigation>
            <q-btn
              color="primary"
              label="Crear mi plan"
              :loading="creating"
              @click="finishOnboarding"
            />
            <q-btn
              flat
              color="primary"
              label="Atras"
              class="q-ml-sm"
              @click="step = 2"
            />
          </q-stepper-navigation>
        </q-step>
      </q-stepper>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import ProfileForm from '../components/onboarding/ProfileForm.vue'
import GoalSelector from '../components/onboarding/GoalSelector.vue'
import EquipmentSelector from '../components/onboarding/EquipmentSelector.vue'
import type { Gender, FitnessLevel, FitnessGoal, Equipment } from '../types/enums'

const router = useRouter()
const userStore = useUserStore()

const step = ref(1)
const creating = ref(false)

const profileData = ref({
  name: '',
  gender: 'male' as Gender,
  age: 30,
  weightKg: 70,
  heightCm: 170,
  fitnessLevel: 'beginner' as FitnessLevel,
})

const goals = ref<FitnessGoal[]>([])
const equipment = ref<Equipment[]>([])

function onProfileUpdate(data: typeof profileData.value) {
  profileData.value = data
}

function onGoalsUpdate(g: FitnessGoal[]) {
  goals.value = g
}

function onEquipmentUpdate(e: Equipment[]) {
  equipment.value = e
}

async function finishOnboarding() {
  creating.value = true
  try {
    const data = {
      name: profileData.value.name || 'Usuario',
      gender: profileData.value.gender,
      age: profileData.value.age,
      weightKg: profileData.value.weightKg,
      heightCm: profileData.value.heightCm,
      fitnessLevel: profileData.value.fitnessLevel,
      goals: [...goals.value],
      equipment: [...equipment.value],
    }
    await userStore.createUser(data)
    router.push('/dashboard')
  } catch (e) {
    console.error('Onboarding error:', e)
  } finally {
    creating.value = false
  }
}
</script>
