import { createRouter, createWebHistory } from 'vue-router'
import { db } from '../db'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/onboarding',
      component: () => import('../pages/OnboardingPage.vue'),
      meta: { hideChrome: true, title: 'Bienvenido' },
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

// Navigation guard: redirect to onboarding if no user profile exists
router.beforeEach(async (to) => {
  if (to.path === '/onboarding') return true

  const profileCount = await db.userProfiles.count()
  if (profileCount === 0) {
    return '/onboarding'
  }
  return true
})

export default router
