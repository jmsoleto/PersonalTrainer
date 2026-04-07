<template>
  <q-page class="q-pa-md">
    <div v-if="loading" class="flex flex-center" style="min-height: 200px">
      <q-spinner-dots color="primary" size="40px" />
    </div>
    <slot v-else />
  </q-page>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  loading?: boolean
}>(), {
  loading: false,
})
</script>
