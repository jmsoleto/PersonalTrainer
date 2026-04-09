<template>
  <div>
    <!-- Video loaded -->
    <div v-if="videoId" class="video-wrapper q-mb-sm">
      <iframe
        :src="`https://www.youtube-nocookie.com/embed/${videoId}`"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        style="width: 100%; aspect-ratio: 16/9; border-radius: 8px;"
      />
      <div class="row justify-end q-mt-xs">
        <q-btn
          flat dense
          color="negative"
          icon="delete"
          label="Eliminar video"
          size="sm"
          @click="confirmDelete"
        />
      </div>
    </div>

    <!-- No video yet -->
    <div v-else class="text-center q-py-md">
      <div v-if="hasApiKey">
        <q-btn
          outline
          color="red-7"
          icon="smart_display"
          label="Buscar en YouTube"
          :loading="isSearching"
          @click="search"
        />
        <div v-if="searchError" class="text-negative text-caption q-mt-sm">
          {{ searchError }}
        </div>
        <div v-else-if="!isSearching" class="text-caption text-grey-6 q-mt-sm">
          Se buscará el mejor video para este ejercicio
        </div>
      </div>
      <div v-else class="text-caption text-grey-6">
        Configura una YouTube API key en
        <router-link to="/settings" class="text-primary">Ajustes</router-link>
        para ver videos de ejercicios
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useExerciseVideosStore } from '../../stores/exerciseVideos'
import { useSettingsStore } from '../../stores/settings'

const props = defineProps<{
  exerciseId: string
  exerciseName: string
}>()

const $q = useQuasar()
const videosStore = useExerciseVideosStore()
const settingsStore = useSettingsStore()

const searchError = ref<string | null>(null)

const videoId = computed(() => videosStore.getVideoId(props.exerciseId) ?? null)
const isSearching = computed(() => videosStore.isSearching(props.exerciseId))
const hasApiKey = computed(() => !!settingsStore.settings.youtubeApiKey)

async function loadVideo(): Promise<void> {
  await videosStore.loadVideo(props.exerciseId)
}

async function search(): Promise<void> {
  searchError.value = null
  try {
    await videosStore.searchAndSaveVideo(props.exerciseId, props.exerciseName)
  } catch (e) {
    searchError.value = 'No se pudo buscar el video. Verifica tu API key de YouTube.'
  }
}

function confirmDelete(): void {
  $q.dialog({
    title: 'Eliminar video',
    message: '¿Eliminar este video? No volverá a sugerirse.',
    cancel: true,
    persistent: false,
  }).onOk(async () => {
    await videosStore.deleteVideo(props.exerciseId)
  })
}

onMounted(loadVideo)
watch(() => props.exerciseId, loadVideo)
</script>
