<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <router-view />
    </q-page-container>

    <BottomNav v-if="!hideChrome" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/layout/BottomNav.vue'

const route = useRoute()

const hideChrome = computed(() => route.meta.hideChrome === true)
</script>
