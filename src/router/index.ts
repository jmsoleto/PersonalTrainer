import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/users',
    },
    {
      path: '/users',
      component: () => import('../pages/UserSelectPage.vue'),
      meta: { hideChrome: true, title: 'Seleccionar Usuario', public: true },
    },
    {
      path: '/onboarding',
      component: () => import('../pages/OnboardingPage.vue'),
      meta: { hideChrome: true, title: 'Nuevo Usuario', public: true },
    },
    {
      path: '/dashboard',
      component: () => import('../pages/DashboardPage.vue'),
      meta: { title: 'Dashboard' },
    },
    {
      path: '/plan',
      component: () => import('../pages/PlanOverviewPage.vue'),
      meta: { title: 'Mi Plan' },
    },
    {
      path: '/plan/week/:weekNumber',
      component: () => import('../pages/WeekViewPage.vue'),
      meta: { title: 'Semana' },
    },
    {
      path: '/plan/debug',
      component: () => import('../pages/PlanDebugPage.vue'),
      meta: { title: 'Debug Plan' },
    },
    {
      path: '/plan/session/:sessionId',
      component: () => import('../pages/SessionPage.vue'),
      meta: { title: 'Sesion' },
    },
    {
      path: '/plan/session/:sessionId/complete',
      component: () => import('../pages/SessionCompletePage.vue'),
      meta: { title: 'Sesion Completada' },
    },
    {
      path: '/exercises',
      component: () => import('../pages/ExerciseLibraryPage.vue'),
      meta: { title: 'Ejercicios' },
    },
    {
      path: '/exercises/:id',
      component: () => import('../pages/ExerciseDetailPage.vue'),
      meta: { title: 'Ejercicio' },
    },
    {
      path: '/stats',
      component: () => import('../pages/StatsPage.vue'),
      meta: { title: 'Estadisticas' },
    },
    {
      path: '/measurements',
      component: () => import('../pages/MeasurementsPage.vue'),
      meta: { title: 'Medidas' },
    },
    {
      path: '/achievements',
      component: () => import('../pages/AchievementsPage.vue'),
      meta: { title: 'Logros' },
    },
    {
      path: '/profile',
      component: () => import('../pages/ProfilePage.vue'),
      meta: { title: 'Mi Perfil' },
    },
    {
      path: '/profile/equipment',
      component: () => import('../pages/EquipmentPage.vue'),
      meta: { title: 'Equipamiento' },
    },
    {
      path: '/profile/injuries',
      component: () => import('../pages/InjuryPage.vue'),
      meta: { title: 'Lesiones' },
    },
    {
      path: '/settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { title: 'Ajustes' },
    },
  ],
})

// Navigation guard: redirect to user select if no active user
router.beforeEach(async (to) => {
  if (to.meta.public) return true

  const activeUserId = localStorage.getItem('pt-active-user-id')
  if (!activeUserId) {
    return '/users'
  }
  return true
})

export default router
