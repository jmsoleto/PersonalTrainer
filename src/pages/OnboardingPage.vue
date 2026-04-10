<template>
  <q-page class="ob-page">
    <div class="ob-container">

      <!-- Step indicator -->
      <div class="ob-indicator">
        <div class="ob-dots">
          <span
            v-for="n in 3"
            :key="n"
            :class="['ob-dot', { 'ob-dot--active': step === n, 'ob-dot--done': step > n }]"
          />
        </div>
        <span class="ob-count">{{ String(step).padStart(2, '0') }} / 03</span>
      </div>

      <!-- Step header -->
      <div class="ob-step-header">
        <p class="ob-step-label">{{ stepLabels[step - 1] }}</p>
        <h1 class="ob-step-title">{{ stepTitles[step - 1] }}</h1>
      </div>

      <!-- Step content -->
      <div class="ob-step-body">
        <ProfileForm    v-if="step === 1" @update="onProfileUpdate" />
        <GoalSelector   v-else-if="step === 2" @update="onGoalsUpdate" />
        <EquipmentSelector v-else-if="step === 3" @update="onEquipmentUpdate" />
      </div>

      <!-- Navigation -->
      <div class="ob-nav">
        <button
          v-if="step > 1"
          class="ob-btn ob-btn--back"
          @click="step--"
        >
          <q-icon name="arrow_back" size="18px" />
          Atrás
        </button>
        <div v-else class="ob-nav-spacer" />

        <button
          class="ob-btn ob-btn--next"
          :disabled="(step === 2 && goals.length === 0) || creating"
          @click="handleNext"
        >
          <q-spinner-dots v-if="creating" size="20px" color="white" />
          <template v-else>
            {{ step === 3 ? 'Crear mi plan' : 'Continuar' }}
            <q-icon :name="step === 3 ? 'check' : 'arrow_forward'" size="18px" />
          </template>
        </button>
      </div>

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

const stepLabels  = ['Paso 01', 'Paso 02', 'Paso 03']
const stepTitles  = ['Tu perfil', 'Tus objetivos', 'Tu equipamiento']

const profileData = ref({
  name: '',
  gender: 'male' as Gender,
  age: 30,
  weightKg: 70,
  heightCm: 170,
  fitnessLevel: 'beginner' as FitnessLevel,
})

const goals     = ref<FitnessGoal[]>([])
const equipment = ref<Equipment[]>([])

function onProfileUpdate(data: typeof profileData.value) { profileData.value = data }
function onGoalsUpdate(g: FitnessGoal[])                { goals.value = g }
function onEquipmentUpdate(e: Equipment[])               { equipment.value = e }

function handleNext() {
  if (step.value < 3) { step.value++; return }
  finishOnboarding()
}

async function finishOnboarding() {
  creating.value = true
  try {
    await userStore.createUser({
      name:         profileData.value.name || 'Usuario',
      gender:       profileData.value.gender,
      age:          profileData.value.age,
      weightKg:     profileData.value.weightKg,
      heightCm:     profileData.value.heightCm,
      fitnessLevel: profileData.value.fitnessLevel,
      goals:        [...goals.value],
      equipment:    [...equipment.value],
    })
    router.push('/dashboard')
  } catch (e) {
    console.error('Onboarding error:', e)
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────── */
.ob-page {
  min-height: 100vh;
  background-color: var(--k-surface);
}

.ob-container {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* ── Step indicator ──────────────────────────────────────────── */
.ob-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ob-dots {
  display: flex;
  gap: 6px;
}

.ob-dot {
  width: 24px;
  height: 4px;
  border-radius: 2px;
  background-color: var(--k-surface-high);
  transition: background-color 0.25s ease, width 0.25s ease;
}

.ob-dot--active {
  background-color: var(--k-primary-container);
  width: 40px;
}

.ob-dot--done {
  background-color: var(--k-primary);
}

.ob-count {
  font-family: var(--k-font-headline);
  font-size: var(--k-label-md);
  font-weight: 600;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-secondary);
}

/* ── Step header ─────────────────────────────────────────────── */
.ob-step-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ob-step-label {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-primary-container);
  margin: 0;
}

.ob-step-title {
  font-family: var(--k-font-headline);
  font-size: var(--k-headline-lg);
  font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0;
  line-height: 1.1;
}

/* ── Step content ────────────────────────────────────────────── */
.ob-step-body {
  flex: 1;
}

/* ── Navigation ──────────────────────────────────────────────── */
.ob-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
}

.ob-nav-spacer {
  flex: 1;
}

.ob-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline);
  font-size: var(--k-body-md);
  font-weight: 600;
  letter-spacing: var(--k-tracking-headline);
  cursor: pointer;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.ob-btn--back {
  background-color: var(--k-surface-highest);
  color: var(--k-secondary);
  flex-shrink: 0;
}

.ob-btn--back:hover {
  background-color: var(--k-surface-bright);
}

.ob-btn--next {
  background: var(--k-gradient-cta);
  color: var(--k-on-primary-container);
  flex: 1;
  justify-content: center;
}

.ob-btn--next:hover:not(:disabled) {
  opacity: 0.9;
}

.ob-btn--next:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
