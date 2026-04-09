import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { configureAI } from '../ai/client'

const STORAGE_KEY = 'pt-settings'

interface AppSettings {
  apiKey: string
  proxyUrl: string
  model: string
  darkMode: boolean | 'auto'
  planWeeks: number
  daysPerWeek: number
  sessionDurationMin: number
  youtubeApiKey: string
}

const defaults: AppSettings = {
  apiKey: '',
  proxyUrl: '',
  model: 'claude-sonnet-4-20250514',
  darkMode: 'auto',
  planWeeks: 12,
  daysPerWeek: 0, // 0 = automático según nivel de forma física
  sessionDurationMin: 45,
  youtubeApiKey: '',
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

  function updatePlanWeeks(weeks: number): void {
    settings.value.planWeeks = weeks
    save()
  }

  function updateDaysPerWeek(days: number): void {
    settings.value.daysPerWeek = days
    save()
  }

  function updateSessionDurationMin(minutes: number): void {
    settings.value.sessionDurationMin = minutes
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
    updatePlanWeeks,
    updateDaysPerWeek,
    updateSessionDurationMin,
  }
})
