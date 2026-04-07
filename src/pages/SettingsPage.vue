<template>
  <PageShell>
    <div class="text-h6 q-mb-md">Ajustes</div>

    <!-- API Configuration -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Configuracion de IA</div>

        <q-input
          v-model="settingsStore.settings.apiKey"
          :type="showApiKey ? 'text' : 'password'"
          outlined
          label="API Key"
          class="q-mb-sm"
        >
          <template #append>
            <q-icon
              :name="showApiKey ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showApiKey = !showApiKey"
            />
          </template>
        </q-input>

        <q-input
          v-model="settingsStore.settings.proxyUrl"
          outlined
          label="Proxy URL (opcional)"
          placeholder="https://my-proxy.example.com"
          class="q-mb-sm"
        />

        <q-select
          v-model="settingsStore.settings.model"
          :options="modelOptions"
          outlined
          label="Modelo"
          emit-value
          map-options
        />
      </q-card-section>
    </q-card>

    <!-- Appearance -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Apariencia</div>
        <q-btn-toggle
          v-model="darkModeValue"
          toggle-color="primary"
          :options="[
            { label: 'Claro', value: false, icon: 'light_mode' },
            { label: 'Auto', value: 'auto', icon: 'brightness_auto' },
            { label: 'Oscuro', value: true, icon: 'dark_mode' },
          ]"
          spread
        />
      </q-card-section>
    </q-card>

    <!-- Units -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Unidades</div>
        <q-btn-toggle
          v-model="unitSystem"
          toggle-color="primary"
          :options="[
            { label: 'Metrico (kg/cm)', value: 'metric' },
            { label: 'Imperial (lb/in)', value: 'imperial' },
          ]"
          spread
        />
      </q-card-section>
    </q-card>

    <!-- Data management -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Datos</div>
        <div class="row q-gutter-sm">
          <q-btn
            outline
            color="primary"
            icon="download"
            label="Exportar datos"
            :loading="exporting"
            @click="handleExport"
          />
          <q-btn
            outline
            color="primary"
            icon="upload"
            label="Importar datos"
            :loading="importing"
            @click="triggerImport"
          />
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImport"
        />
      </q-card-section>
    </q-card>
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

const $q = useQuasar()
const settingsStore = useSettingsStore()

const darkModeValue = computed({
  get: () => settingsStore.settings.darkMode,
  set: (val: boolean | 'auto') => {
    settingsStore.settings.darkMode = val
    $q.dark.set(val)
  },
})

const showApiKey = ref(false)
const exporting = ref(false)
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const unitSystem = ref<UnitSystem>('metric')

const modelOptions = [
  { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
  { label: 'Claude Haiku 3.5', value: 'claude-3-5-haiku-20241022' },
  { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
]

async function handleExport(): Promise<void> {
  exporting.value = true
  try {
    const data = await exportAllData()
    downloadJson(data)
    $q.notify({ type: 'positive', message: 'Datos exportados correctamente' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al exportar datos' })
  } finally {
    exporting.value = false
  }
}

function triggerImport(): void {
  fileInput.value?.click()
}

async function handleImport(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  importing.value = true
  try {
    const text = await file.text()
    const data: ExportData = JSON.parse(text)
    await importAllData(data)
    $q.notify({ type: 'positive', message: 'Datos importados correctamente' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al importar datos. Verifica el archivo.' })
  } finally {
    importing.value = false
    target.value = ''
  }
}
</script>
