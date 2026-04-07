<template>
  <q-header elevated class="bg-dark">
    <q-toolbar>
      <q-btn
        v-if="canGoBack"
        flat
        dense
        round
        icon="arrow_back"
        @click="router.back()"
      />

      <q-toolbar-title class="text-weight-bold">
        {{ pageTitle }}
      </q-toolbar-title>

      <q-btn flat dense round icon="person" to="/profile" />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const pageTitle = computed(() => (route.meta.title as string) || 'Personal Trainer')

const canGoBack = computed(() => {
  const noBackRoutes = ['/dashboard', '/onboarding']
  return !noBackRoutes.includes(route.path)
})
</script>
