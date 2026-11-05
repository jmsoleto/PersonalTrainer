<template>
  <PageShell :loading="loading">
    <div v-if="notFound" class="we-empty">
      <div class="we-empty-icon"><q-icon name="search_off" size="26px" /></div>
      Este plan no existe.
      <button class="we-btn we-btn--soft" @click="router.push('/plan/editor?tab=plans')">Volver</button>
    </div>

    <template v-else>
      <header class="we-header">
        <button class="we-back" @click="router.push('/plan/editor?tab=plans')"><q-icon name="arrow_back" size="16px" /> Mis entrenamientos</button>
        <span class="we-overline">{{ isNew ? 'Nuevo plan' : 'Editar plan' }}</span>
      </header>

      <input v-model="name" class="we-input we-input--name" placeholder="Nombre del plan" aria-label="Nombre del plan" maxlength="60" />

      <div class="pe-summary">
        <span class="we-chip">{{ weekIds.length }} / {{ MAX_PLAN_WEEKS }} semanas</span>
        <span class="we-chip">{{ totalSessions }} sesiones</span>
      </div>

      <div v-if="store.weeks.length === 0" class="we-notice we-notice--info">
        <q-icon name="info" size="18px" />
        <span>Primero crea una semana (o duplica un preset de semana) para añadirla al plan.</span>
      </div>

      <span class="we-section-label">Semanas del plan</span>
      <div v-if="weekIds.length === 0" class="we-empty">Añade semanas en el orden en que quieres hacerlas.</div>

      <ol class="pe-list">
        <li v-for="(wid, i) in weekIds" :key="i" :class="['we-card', { 'pe-missing': !store.getWeek(wid) }]">
          <span class="pe-num">{{ i + 1 }}</span>
          <div class="we-card-main">
            <span class="we-card-title">{{ store.getWeek(wid)?.name ?? 'Semana eliminada' }}</span>
            <div v-if="store.getWeek(wid)" class="we-week-strip" aria-hidden="true">
              <span
                v-for="(slot, d) in store.getWeek(wid)!.slots"
                :key="d"
                :class="['we-week-cell', `we-week-cell--${slot.kind}`]"
              >{{ WEEKDAYS_SHORT[d] }}</span>
            </div>
          </div>
          <div class="pe-actions">
            <button class="we-icon-btn" :disabled="i === 0" aria-label="Subir" @click="move(i, -1)"><q-icon name="arrow_upward" size="16px" /></button>
            <button class="we-icon-btn" :disabled="i === weekIds.length - 1" aria-label="Bajar" @click="move(i, 1)"><q-icon name="arrow_downward" size="16px" /></button>
            <button class="we-icon-btn" :disabled="weekIds.length >= MAX_PLAN_WEEKS" aria-label="Repetir semana" @click="duplicateAt(i)"><q-icon name="content_copy" size="15px" /></button>
            <button class="we-icon-btn we-icon-btn--del" aria-label="Quitar semana" @click="weekIds.splice(i, 1)"><q-icon name="close" size="16px" /></button>
          </div>
        </li>
      </ol>

      <div v-if="store.weeks.length" class="pe-add">
        <select v-model="toAdd" class="we-select" aria-label="Semana a añadir">
          <option v-for="w in store.weeks" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
        <button class="we-btn we-btn--soft" :disabled="!toAdd || weekIds.length >= MAX_PLAN_WEEKS" @click="addWeek">
          <q-icon name="add" size="18px" /> Añadir
        </button>
      </div>

      <div class="we-footer">
        <button class="we-btn we-btn--ghost" :disabled="saving" @click="save">Guardar</button>
        <button class="we-btn we-btn--cta" :disabled="saving || weekIds.length === 0" @click="startActivation">
          <q-icon name="play_arrow" size="18px" /> Activar plan
        </button>
      </div>
    </template>

    <!-- ── Activation dialog ──────────────────────────────────── -->
    <q-dialog v-model="activateOpen">
      <div class="we-dialog">
        <div class="we-dialog-header">
          <span class="we-dialog-title">Activar «{{ name }}»</span>
          <button class="we-icon-btn" aria-label="Cerrar" @click="activateOpen = false"><q-icon name="close" size="18px" /></button>
        </div>
        <div class="we-dialog-body">
          <span class="we-field-label">¿Cuándo empiezas?</span>
          <button
            v-for="opt in startOptions"
            :key="opt.value"
            type="button"
            :class="['we-option', { 'we-option--active': startOption === opt.value }]"
            @click="startOption = opt.value"
          >
            <q-icon :name="startOption === opt.value ? 'radio_button_checked' : 'radio_button_unchecked'" size="20px" />
            <span>{{ opt.label }}<span class="we-option-sub">{{ opt.sub }}</span></span>
          </button>
          <div v-if="startOption === 'this_week' && lateInWeek" class="we-notice we-notice--info">
            <q-icon name="info" size="18px" />
            <span>Los días de esta semana que ya han pasado contarán como pasados. Quizá prefieras empezar el próximo lunes.</span>
          </div>
          <div v-if="planStore.activePlan" class="we-notice">
            <q-icon name="swap_horiz" size="18px" />
            <span>Sustituirá a tu plan actual «{{ planStore.activePlan.name }}». Tu historial de sesiones se conserva.</span>
          </div>
          <div v-if="activationIssues.length" class="we-notice">
            <q-icon name="error_outline" size="18px" />
            <div>
              <div>No se puede activar. Revisa:</div>
              <ul class="pe-issues">
                <li v-for="(issue, k) in activationIssues" :key="k">
                  <a href="#" @click.prevent="goToIssue(issue)">{{ issueLabel(issue) }}</a>: {{ issue.message }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="we-dialog-footer">
          <button class="we-btn we-btn--ghost" @click="activateOpen = false">Cancelar</button>
          <button class="we-btn we-btn--cta" :disabled="activating" @click="activate">Activar</button>
        </div>
      </div>
    </q-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useWorkoutTemplatesStore } from '../stores/workoutTemplates'
import { usePlanStore } from '../stores/plan'
import { MAX_PLAN_WEEKS } from '../types/workout-template'
import { TemplateValidationError, type TemplateIssue } from '../workout-editor/validation'
import type { PlanStartOption } from '../workout-editor/dates'
import { WEEKDAYS_SHORT } from '../workout-editor/labels'
import '../css/workout-editor.scss'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const store = useWorkoutTemplatesStore()
const planStore = usePlanStore()

const planId = ref(String(route.params.id))
const isNew = computed(() => planId.value === 'new')
const loading = ref(true)
const notFound = ref(false)
const saving = ref(false)

const name = ref('')
const weekIds = ref<string[]>([])
const toAdd = ref('')
let snapshot = ''
let skipLeaveGuard = false
const serialize = () => JSON.stringify({ n: name.value, w: weekIds.value })

onMounted(async () => {
  await store.ensureLoaded()
  if (!isNew.value) {
    const existing = store.getPlan(planId.value)
    if (!existing) notFound.value = true
    else {
      name.value = existing.name
      weekIds.value = [...existing.weekTemplateIds]
    }
  }
  toAdd.value = store.weeks[0]?.id ?? ''
  snapshot = serialize()
  loading.value = false
})

onBeforeRouteLeave((_to, _from, next) => {
  if (skipLeaveGuard || serialize() === snapshot || notFound.value) return next()
  $q.dialog({
    title: 'Cambios sin guardar',
    message: '¿Salir sin guardar los cambios de este plan?',
    cancel: { label: 'Seguir editando', flat: true },
    ok: { label: 'Salir', color: 'negative' },
  }).onOk(() => next()).onCancel(() => next(false))
})

const totalSessions = computed(() =>
  weekIds.value.reduce((n, id) => n + (store.getWeek(id)?.slots.filter(s => s.kind !== 'rest' && s.dayTemplateId).length ?? 0), 0),
)

function move(i: number, delta: number) {
  const j = i + delta
  if (j < 0 || j >= weekIds.value.length) return
  const [w] = weekIds.value.splice(i, 1)
  weekIds.value.splice(j, 0, w)
}

function duplicateAt(i: number) {
  if (weekIds.value.length >= MAX_PLAN_WEEKS) return
  weekIds.value.splice(i + 1, 0, weekIds.value[i])
}

function addWeek() {
  if (!toAdd.value || weekIds.value.length >= MAX_PLAN_WEEKS) return
  weekIds.value.push(toAdd.value)
}

async function persist(): Promise<string | null> {
  saving.value = true
  try {
    const saved = await store.savePlan({ name: name.value, weekTemplateIds: [...weekIds.value], ...(isNew.value ? {} : { id: planId.value }) })
    snapshot = serialize()
    if (isNew.value) {
      planId.value = saved.id
      await router.replace(`/plan/editor/plan/${saved.id}`)
    }
    return saved.id
  } catch (e) {
    $q.notify({ type: 'negative', message: e instanceof TemplateValidationError ? e.issues[0].message : 'Error al guardar el plan' })
    return null
  } finally {
    saving.value = false
  }
}

async function save() {
  if (await persist()) $q.notify({ type: 'positive', message: 'Plan guardado' })
}

// ── Activation ──────────────────────────────────────────────────
const activateOpen = ref(false)
const activating = ref(false)
const startOption = ref<PlanStartOption>('next_monday')
const activationIssues = ref<TemplateIssue[]>([])
const weekday = new Date().getDay() || 7
const lateInWeek = weekday >= 4

const startOptions: { value: PlanStartOption; label: string; sub: string }[] = [
  { value: 'this_week', label: 'Esta semana', sub: 'La semana 1 es la actual (desde el lunes)' },
  { value: 'next_monday', label: 'El próximo lunes', sub: 'La semana 1 empieza el lunes que viene' },
]

async function startActivation() {
  // Activation reads the saved templates, so save pending edits first.
  if (isNew.value || serialize() !== snapshot) {
    if (!(await persist())) return
  }
  activationIssues.value = []
  startOption.value = lateInWeek ? 'next_monday' : 'this_week'
  activateOpen.value = true
}

async function activate() {
  activating.value = true
  activationIssues.value = []
  try {
    await planStore.activateCustomPlan(planId.value, startOption.value)
    activateOpen.value = false
    $q.notify({ type: 'positive', icon: 'rocket_launch', message: `Plan «${name.value}» activado` })
    skipLeaveGuard = true
    await router.push('/dashboard')
  } catch (e) {
    if (e instanceof TemplateValidationError) activationIssues.value = e.issues
    else $q.notify({ type: 'negative', message: 'Error al activar el plan' })
  } finally {
    activating.value = false
  }
}

function issueLabel(issue: TemplateIssue): string {
  const kind = issue.templateType === 'day' ? 'Día' : issue.templateType === 'week' ? 'Semana' : 'Plan'
  return issue.templateName ? `${kind} «${issue.templateName}»` : kind
}

function goToIssue(issue: TemplateIssue) {
  activateOpen.value = false
  if (issue.templateType === 'plan') return
  router.push(`/plan/editor/${issue.templateType}/${issue.templateId}`)
}
</script>

<style scoped>
.pe-summary { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.6rem 0 0.25rem; }
.pe-list { list-style: none; margin: 0; padding: 0; }
.pe-num {
  width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%;
  background-color: var(--k-surface-high); color: var(--k-on-surface);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--k-font-headline); font-weight: 700; font-size: var(--k-label-md);
}
.pe-actions { display: grid; grid-template-columns: repeat(2, 32px); gap: 0.25rem; flex-shrink: 0; }
.pe-missing { border: 1px solid var(--k-urgent); }
.pe-add { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.pe-add .we-select { flex: 1; }
.pe-issues { margin: 0.35rem 0 0; padding-left: 1rem; }
.pe-issues a { color: inherit; font-weight: 600; }
</style>
