<template>
  <PageShell :loading="!exercise">
    <template v-if="exercise">

      <!-- ── Header ─────────────────────────────────────────── -->
      <header class="ed-header">
        <router-link to="/exercises" class="ed-back" aria-label="Volver">
          <q-icon name="arrow_back" size="20px" />
        </router-link>
        <div class="ed-header-text">
          <div class="ed-badges">
            <span :class="['ed-badge', `ed-badge--${exercise.difficulty}`]">
              {{ difficultyLabel[exercise.difficulty] ?? exercise.difficulty }}
            </span>
            <span class="ed-badge ed-badge--neutral">{{ categoryLabel[exercise.category] ?? exercise.category }}</span>
            <span v-if="exercise.isCompound" class="ed-badge ed-badge--compound">Compuesto</span>
          </div>
          <h1 class="ed-title">{{ exercise.name }}</h1>
          <p class="ed-desc">{{ exercise.description }}</p>
        </div>
      </header>

      <!-- ── Músculos ───────────────────────────────────────── -->
      <section class="ed-section">
        <span class="ed-section-label">Músculos implicados</span>
        <div class="ed-chips">
          <span
            v-for="muscle in exercise.muscleGroups"
            :key="muscle"
            :class="['ed-chip', muscle === exercise.primaryMuscle ? 'ed-chip--primary' : '']"
          >
            <q-icon v-if="muscle === exercise.primaryMuscle" name="star" size="11px" />
            {{ getMuscleLabel(muscle) }}
          </span>
        </div>
      </section>

      <!-- ── Equipamiento ───────────────────────────────────── -->
      <section class="ed-section">
        <span class="ed-section-label">Equipamiento</span>
        <div v-if="exercise.equipment.length === 0" class="ed-no-equip">
          <q-icon name="accessibility_new" size="16px" />
          Solo peso corporal
        </div>
        <div v-else class="ed-chips">
          <span v-for="equip in exercise.equipment" :key="equip" class="ed-chip">
            {{ getEquipmentLabel(equip) }}
          </span>
        </div>
      </section>

      <!-- ── Instrucciones ──────────────────────────────────── -->
      <section class="ed-section">
        <span class="ed-section-label">Instrucciones</span>
        <ol class="ed-steps">
          <li v-for="(step, index) in exercise.instructions" :key="index" class="ed-step">
            <span class="ed-step-num">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="ed-step-text">{{ step }}</span>
          </li>
        </ol>
      </section>

      <!-- ── Video ─────────────────────────────────────────── -->
      <section class="ed-section">
        <span class="ed-section-label">Video</span>
        <ExerciseVideoSection
          :exercise-id="exercise.id"
          :exercise-name="exercise.name"
        />
      </section>

      <!-- ── Tags ──────────────────────────────────────────── -->
      <div v-if="exercise.tags?.length" class="ed-tags">
        <span v-for="tag in exercise.tags" :key="tag" class="ed-tag">#{{ tag }}</span>
      </div>

    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from '../components/layout/PageShell.vue'
import ExerciseVideoSection from '../components/exercises/ExerciseVideoSection.vue'
import { useExercisesStore } from '../stores/exercises'

const route          = useRoute()
const exercisesStore = useExercisesStore()

onMounted(() => exercisesStore.loadExercises())

const exercise = computed(() => exercisesStore.getById(route.params.id as string))

const difficultyLabel: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

const categoryLabel: Record<string, string> = {
  strength:    'Fuerza',
  cardio:      'Cardio',
  flexibility: 'Flexibilidad',
  balance:     'Equilibrio',
  plyometric:  'Pliométrico',
  warmup:      'Calentamiento',
  cooldown:    'Vuelta a la calma',
}

const muscleLabels: Record<string, string> = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros',
  biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebrazos',
  core: 'Core', quads: 'Cuádriceps', hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos', calves: 'Gemelos', full_body: 'Cuerpo completo',
}

function getMuscleLabel(muscle: string): string { return muscleLabels[muscle] || muscle }

const equipmentLabels: Record<string, string> = {
  dumbbells: 'Mancuernas', resistance_bands: 'Bandas elásticas',
  pull_up_bar: 'Barra dominadas', bench: 'Banco',
  barbell: 'Barra olímpica', kettlebell: 'Kettlebell',
  yoga_mat: 'Esterilla', bodyweight_only: 'Peso corporal',
}

function getEquipmentLabel(equip: string): string { return equipmentLabels[equip] || equip }
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════════════════ */
.ed-header {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  margin-bottom: 1rem;
}

.ed-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest);
  color: var(--k-secondary);
  text-decoration: none;
  margin-top: 0.2rem;
  transition: background-color 0.15s ease;
}
.ed-back:hover { background-color: var(--k-surface-bright); color: var(--k-on-surface); }

.ed-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Badges de dificultad / categoría */
.ed-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.ed-badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: var(--k-radius-sm);
  font-family: var(--k-font-body);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
}

.ed-badge--beginner {
  background-color: rgba(166, 200, 255, 0.12);
  color: var(--k-tertiary);
}
.ed-badge--intermediate {
  background-color: rgba(255, 180, 162, 0.12);
  color: var(--k-primary);
}
.ed-badge--advanced {
  background-color: rgba(255, 86, 44, 0.12);
  color: var(--k-primary-container);
}
.ed-badge--neutral {
  background-color: var(--k-surface-highest);
  color: var(--k-secondary);
}
.ed-badge--compound {
  background-color: rgba(166, 200, 255, 0.12);
  color: var(--k-tertiary);
}

.ed-title {
  font-family: var(--k-font-headline);
  font-size: var(--k-headline-md);
  font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-on-surface);
  margin: 0;
  line-height: 1.15;
}

.ed-desc {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
  margin: 0;
  line-height: 1.6;
}

/* ══════════════════════════════════════════════════════════════
   SECCIONES
══════════════════════════════════════════════════════════════ */
.ed-section {
  background-color: var(--k-surface-container);
  border-radius: var(--k-radius-md);
  padding: 1rem;
  margin-bottom: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ed-section-label {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  font-weight: 500;
  letter-spacing: var(--k-tracking-label);
  text-transform: uppercase;
  color: var(--k-secondary);
}

/* ── Chips de músculos / equipamiento ────────────────────────── */
.ed-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.ed-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.625rem;
  border-radius: var(--k-radius-sm);
  background-color: var(--k-surface-highest);
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  color: var(--k-on-surface-variant);
}

.ed-chip--primary {
  background-color: rgba(255, 86, 44, 0.12);
  color: var(--k-primary-container);
}

/* Sin equipamiento */
.ed-no-equip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-secondary);
}

/* ══════════════════════════════════════════════════════════════
   INSTRUCCIONES
══════════════════════════════════════════════════════════════ */
.ed-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ed-step {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}

.ed-step-num {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high);
  font-family: var(--k-font-headline);
  font-size: var(--k-label-md);
  font-weight: 700;
  letter-spacing: var(--k-tracking-headline);
  color: var(--k-primary-container);
}

.ed-step-text {
  font-family: var(--k-font-body);
  font-size: var(--k-body-md);
  color: var(--k-on-surface);
  line-height: 1.6;
  padding-top: 0.375rem;
}

/* ══════════════════════════════════════════════════════════════
   TAGS
══════════════════════════════════════════════════════════════ */
.ed-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.ed-tag {
  font-family: var(--k-font-body);
  font-size: var(--k-label-md);
  color: var(--k-outline);
  letter-spacing: var(--k-tracking-label);
}
</style>
