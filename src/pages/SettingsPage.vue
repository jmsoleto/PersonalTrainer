<template>
  <PageShell>

    <header class="st-header">
      <span class="st-overline">Configuración</span>
      <h1 class="st-title">Ajustes</h1>
    </header>

    <!-- ── IA ────────────────────────────────────────────────── -->
    <section class="st-section">
      <span class="st-section-label">Configuración de IA</span>

      <div class="st-field">
        <label class="st-label">API Key</label>
        <div class="st-input-wrap">
          <input
            v-model="settingsStore.settings.apiKey"
            :type="showApiKey ? 'text' : 'password'"
            class="st-input"
            placeholder="sk-ant-..."
            autocomplete="off"
          />
          <button class="st-eye" @click="showApiKey = !showApiKey">
            <q-icon :name="showApiKey ? 'visibility_off' : 'visibility'" size="18px" />
          </button>
        </div>
      </div>

      <div class="st-field">
        <label class="st-label">Proxy URL (opcional)</label>
        <input
          v-model="settingsStore.settings.proxyUrl"
          class="st-input"
          type="url"
          placeholder="https://my-proxy.example.com"
        />
      </div>

      <div class="st-field">
        <label class="st-label">Modelo</label>
        <div class="st-select-wrap">
          <select v-model="settingsStore.settings.model" class="st-input st-select">
            <option v-for="o in modelOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <q-icon name="expand_more" size="16px" class="st-select-arrow" />
        </div>
      </div>
    </section>

    <!-- ── YouTube ────────────────────────────────────────────── -->
    <section class="st-section">
      <span class="st-section-label">YouTube</span>
      <div class="st-field">
        <label class="st-label">YouTube Data API v3 Key</label>
        <div class="st-input-wrap">
          <input
            v-model="settingsStore.settings.youtubeApiKey"
            :type="showYoutubeKey ? 'text' : 'password'"
            class="st-input"
            placeholder="AIza..."
            autocomplete="off"
          />
          <button class="st-eye" @click="showYoutubeKey = !showYoutubeKey">
            <q-icon :name="showYoutubeKey ? 'visibility_off' : 'visibility'" size="18px" />
          </button>
        </div>
        <p class="st-hint">Necesaria para buscar videos de ejercicios automáticamente.</p>
      </div>
    </section>

    <!-- ── Apariencia ─────────────────────────────────────────── -->
    <section class="st-section">
      <span class="st-section-label">Apariencia</span>
      <div class="st-toggle-group">
        <button
          v-for="opt in darkModeOptions"
          :key="String(opt.value)"
          :class="['st-toggle-btn', { 'st-toggle-btn--active': darkModeValue === opt.value }]"
          @click="darkModeValue = opt.value"
        >
          <q-icon :name="opt.icon" size="18px" />
          {{ opt.label }}
        </button>
      </div>
    </section>

    <!-- ── Unidades ───────────────────────────────────────────── -->
    <section class="st-section">
      <span class="st-section-label">Unidades</span>
      <div class="st-toggle-group">
        <button
          :class="['st-toggle-btn', { 'st-toggle-btn--active': unitSystem === 'metric' }]"
          @click="unitSystem = 'metric'"
        >Métrico (kg / cm)</button>
        <button
          :class="['st-toggle-btn', { 'st-toggle-btn--active': unitSystem === 'imperial' }]"
          @click="unitSystem = 'imperial'"
        >Imperial (lb / in)</button>
      </div>
    </section>

    <!-- ── Datos ──────────────────────────────────────────────── -->
    <section class="st-section">
      <span class="st-section-label">Datos</span>
      <div class="st-data-btns">
        <button class="st-btn st-btn--ghost" :disabled="exporting" @click="handleExport">
          <q-spinner-dots v-if="exporting" size="16px" />
          <template v-else><q-icon name="download" size="18px" /> Exportar</template>
        </button>
        <button class="st-btn st-btn--ghost" :disabled="importing" @click="triggerImport">
          <q-spinner-dots v-if="importing" size="16px" />
          <template v-else><q-icon name="upload" size="18px" /> Importar</template>
        </button>
      </div>
      <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleImport" />
    </section>

  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import PageShell from '../components/layout/PageShell.vue'
import { useSettingsStore } from '../stores/settings'
import { exportAllData, importAllData, downloadJson } from '../db/export-import'
import type { ExportData } from '../db/export-import'
import type { UnitSystem } from '../types/enums'

const $q            = useQuasar()
const settingsStore = useSettingsStore()

const showApiKey    = ref(false)
const showYoutubeKey = ref(false)
const exporting     = ref(false)
const importing     = ref(false)
const fileInput     = ref<HTMLInputElement | null>(null)
const unitSystem    = ref<UnitSystem>('metric')

const darkModeOptions = [
  { label: 'Claro',  value: false,   icon: 'light_mode' },
  { label: 'Auto',   value: 'auto',  icon: 'brightness_auto' },
  { label: 'Oscuro', value: true,    icon: 'dark_mode' },
]

const modelOptions = [
  { label: 'Claude Opus 4.8',   value: 'claude-opus-4-8' },
  { label: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
  { label: 'Claude Haiku 4.5',  value: 'claude-haiku-4-5' },
]

const darkModeValue = computed({
  get: () => settingsStore.settings.darkMode,
  set: (val: boolean | 'auto') => { settingsStore.settings.darkMode = val; $q.dark.set(val) },
})

async function handleExport() {
  exporting.value = true
  try { downloadJson(await exportAllData()); $q.notify({ type: 'positive', message: 'Datos exportados correctamente' }) }
  catch { $q.notify({ type: 'negative', message: 'Error al exportar datos' }) }
  finally { exporting.value = false }
}

function triggerImport() { fileInput.value?.click() }

async function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const data: ExportData = JSON.parse(await file.text())
    await importAllData(data)
    $q.notify({ type: 'positive', message: 'Datos importados correctamente' })
  } catch { $q.notify({ type: 'negative', message: 'Error al importar datos. Verifica el archivo.' }) }
  finally { importing.value = false; (event.target as HTMLInputElement).value = '' }
}
</script>

<style scoped>
.st-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.5rem; }
.st-overline {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-primary-container);
}
.st-title {
  font-family: var(--k-font-headline); font-size: 2.25rem; font-weight: 700;
  font-style: italic; text-transform: uppercase;
  letter-spacing: var(--k-tracking-headline); color: var(--k-on-surface); margin: 0; line-height: 1.05;
}

/* Sección */
.st-section {
  background-color: var(--k-surface-container); border-radius: var(--k-radius-md);
  padding: 1rem; margin-bottom: 0.625rem;
  display: flex; flex-direction: column; gap: 0.875rem;
}
.st-section-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
}

/* Fields */
.st-field { display: flex; flex-direction: column; gap: 0.35rem; }
.st-label {
  font-family: var(--k-font-body); font-size: var(--k-label-md); font-weight: 500;
  letter-spacing: var(--k-tracking-label); text-transform: uppercase; color: var(--k-secondary);
}
.st-hint { font-family: var(--k-font-body); font-size: var(--k-label-md); color: var(--k-outline); margin: 0; }

.st-input-wrap { position: relative; }
.st-input {
  width: 100%; padding: 0.75rem 1rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-highest); color: var(--k-on-surface);
  font-family: var(--k-font-body); font-size: var(--k-body-md); outline: none;
  appearance: none; -webkit-appearance: none; box-sizing: border-box;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.st-input:focus { background-color: var(--k-surface-bright); box-shadow: 0 0 0 1px rgba(255,86,44,0.4); }
.st-input::placeholder { color: var(--k-outline); }
.st-input-wrap .st-input { padding-right: 2.75rem; }

.st-eye {
  position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--k-outline); cursor: pointer; padding: 0.25rem;
  display: flex; align-items: center; transition: color 0.15s ease;
}
.st-eye:hover { color: var(--k-on-surface); }

.st-select-wrap { position: relative; }
.st-select { padding-right: 2.25rem; cursor: pointer; }
.st-select option { background-color: var(--k-surface-highest); color: var(--k-on-surface); }
.st-select-arrow {
  position: absolute; right: 0.625rem; top: 50%; transform: translateY(-50%);
  color: var(--k-outline); pointer-events: none;
}

/* Toggle group */
.st-toggle-group { display: flex; border-radius: var(--k-radius-md); overflow: hidden; gap: 0.25rem; }
.st-toggle-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.35rem;
  padding: 0.7rem 0.5rem; border: none; border-radius: var(--k-radius-md);
  background-color: var(--k-surface-high); color: var(--k-secondary);
  font-family: var(--k-font-body); font-size: var(--k-body-md); cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.st-toggle-btn--active { background-color: var(--k-primary-container); color: var(--k-on-primary-container); }

/* Data buttons */
.st-data-btns { display: flex; gap: 0.625rem; }
.st-btn {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.75rem 1rem; border-radius: var(--k-radius-md);
  font-family: var(--k-font-headline); font-size: var(--k-body-md); font-weight: 600;
  letter-spacing: var(--k-tracking-headline); cursor: pointer;
  transition: background-color 0.15s ease;
}
.st-btn--ghost {
  background-color: transparent; color: var(--k-secondary);
  border: 1px solid var(--k-ghost-border);
}
.st-btn--ghost:hover:not(:disabled) { background-color: var(--k-surface-container); }
.st-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
