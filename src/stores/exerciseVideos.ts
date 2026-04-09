import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db/index'
import type { ExerciseVideoRecord } from '../db/index'
import { useSettingsStore } from './settings'

export const useExerciseVideosStore = defineStore('exerciseVideos', () => {
  const settingsStore = useSettingsStore()
  // In-memory cache: exerciseId -> record
  const cache = ref<Record<string, ExerciseVideoRecord>>({})
  const searching = ref<Record<string, boolean>>({})

  async function loadVideo(exerciseId: string): Promise<ExerciseVideoRecord | undefined> {
    if (cache.value[exerciseId]) return cache.value[exerciseId]
    const record = await db.exerciseVideos.get(exerciseId)
    if (record) {
      cache.value[exerciseId] = record
    }
    return record
  }

  async function searchAndSaveVideo(exerciseId: string, exerciseName: string): Promise<string | null> {
    const apiKey = settingsStore.settings.youtubeApiKey
    if (!apiKey) return null

    searching.value[exerciseId] = true
    try {
      const existing = await loadVideo(exerciseId)
      const blacklisted = existing?.blacklistedVideoIds ?? []

      const query = encodeURIComponent(`${exerciseName} ejercicio como hacer`)
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=10&key=${apiKey}`

      const response = await fetch(url)
      if (!response.ok) throw new Error(`YouTube API error: ${response.status}`)

      const data = await response.json()
      const items: Array<{ id: { videoId: string } }> = data.items ?? []
      const videoId = items.find(item => !blacklisted.includes(item.id.videoId))?.id.videoId ?? null

      const record: ExerciseVideoRecord = {
        exerciseId,
        videoId,
        blacklistedVideoIds: blacklisted,
      }
      await db.exerciseVideos.put(record)
      cache.value[exerciseId] = record
      return videoId
    } finally {
      searching.value[exerciseId] = false
    }
  }

  async function deleteVideo(exerciseId: string): Promise<void> {
    const existing = await loadVideo(exerciseId)
    if (!existing?.videoId) return

    const record: ExerciseVideoRecord = {
      exerciseId,
      videoId: null,
      blacklistedVideoIds: [...(existing.blacklistedVideoIds ?? []), existing.videoId],
    }
    await db.exerciseVideos.put(record)
    cache.value[exerciseId] = record
  }

  function isSearching(exerciseId: string): boolean {
    return searching.value[exerciseId] ?? false
  }

  function getVideoId(exerciseId: string): string | null | undefined {
    return cache.value[exerciseId]?.videoId
  }

  return {
    loadVideo,
    searchAndSaveVideo,
    deleteVideo,
    isSearching,
    getVideoId,
    cache,
  }
})
