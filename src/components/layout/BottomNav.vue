<template>
  <q-footer elevated class="bg-dark">
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      narrow-indicator
    >
      <q-route-tab
        name="dashboard"
        icon="home"
        label="Inicio"
        to="/dashboard"
      />
      <q-route-tab
        name="plan"
        icon="calendar_month"
        label="Plan"
        to="/plan"
      />
      <q-route-tab
        name="exercises"
        icon="fitness_center"
        label="Ejercicios"
        to="/exercises"
      />
      <q-route-tab
        name="stats"
        icon="bar_chart"
        label="Stats"
        to="/stats"
      />
      <q-route-tab
        name="profile"
        icon="person"
        label="Perfil"
        to="/profile"
      />
    </q-tabs>
  </q-footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('dashboard')
</script>
