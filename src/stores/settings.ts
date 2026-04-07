import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { configureAI } from '../ai/client'

const STORAGE_KEY = 'pt-settings'

interface AppSettings {
  apiKey: string
  proxyUrl: string
  model: string
  darkMode: boolean | 'auto'
}

const defaults: AppSettings = {
  apiKey: '',
  proxyUrl: '',
  model: 'claude-sonnet-4-20250514',
  darkMode: 'auto',
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadFromStorage())

  function loadFromStorage(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...defaults, ...JSON.parse(raw) }
    } catch { /* ignore */ }
    return { ...defaults }
  }

  function save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    applyAIConfig()
  }

  function applyAIConfig(): void {
    if (settings.value.apiKey) {
      configureAI({
        apiKey: settings.value.apiKey,
        proxyUrl: settings.value.proxyUrl || undefined,
        model: settings.value.model || undefined,
      })
    }
  }

  function updateApiKey(key: string): void {
    settings.value.apiKey = key
    save()
  }

  function updateProxyUrl(url: string): void {
    settings.value.proxyUrl = url
    save()
  }

  function updateModel(model: string): void {
    settings.value.model = model
    save()
  }

  // Apply config on init
  applyAIConfig()

  // Persist on changes
  watch(settings, save, { deep: true })

  return {
    settings,
    updateApiKey,
    updateProxyUrl,
    updateModel,
  }
})
