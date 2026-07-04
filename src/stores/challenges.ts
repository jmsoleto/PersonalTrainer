import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db'
import { useUserStore } from './user'
import challengesData from '../data/challenges.json'
import type {
  ChallengeDefinition,
  ChallengeWindow,
  AcceptedChallenge,
} from '../types/challenge'

/** Format a Date as YYYY-MM-DD using its LOCAL components (no UTC shift). */
function formatLocalDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add N days to a YYYY-MM-DD date, returning a YYYY-MM-DD string. */
function addDays(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return formatLocalDay(d)
}

/** Last calendar day (YYYY-MM-DD) of the month containing `day`. */
function lastDayOfMonth(day: string): string {
  const d = new Date(day + 'T00:00:00')
  // Day 0 of next month = last day of this month
  return formatLocalDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/**
 * Resolve a challenge window into concrete inclusive [start, end] calendar days,
 * given the acceptance moment.
 */
export function resolveWindow(
  window: ChallengeWindow,
  acceptedAt: string,
): { windowStart: string; windowEnd: string } {
  const acceptDay = acceptedAt.slice(0, 10)
  const d = new Date(acceptDay + 'T00:00:00')
  const year = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')

  switch (window.type) {
    case 'calendar_year':
      return { windowStart: `${year}-01-01`, windowEnd: `${year}-12-31` }
    case 'calendar_month':
      return { windowStart: `${year}-${mm}-01`, windowEnd: lastDayOfMonth(acceptDay) }
    case 'rolling_days':
    case 'fixed_from_accept':
      return {
        windowStart: acceptDay,
        windowEnd: addDays(acceptDay, window.lengthDays ?? 0),
      }
  }
}

export const useChallengesStore = defineStore('challenges', () => {
  const definitions = ref<ChallengeDefinition[]>(challengesData as ChallengeDefinition[])
  const accepted = ref<AcceptedChallenge[]>([])
  const loading = ref(false)

  const active = computed(() => accepted.value.filter(c => c.status === 'active'))
  const history = computed(() =>
    accepted.value
      .filter(c => c.status !== 'active')
      .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? '')),
  )

  const activeChallengeIds = computed(
    () => new Set(active.value.map(c => c.challengeId)),
  )

  function getDefinition(id: string): ChallengeDefinition | undefined {
    return definitions.value.find(d => d.id === id)
  }

  function isActive(challengeId: string): boolean {
    return activeChallengeIds.value.has(challengeId)
  }

  async function loadAccepted(): Promise<void> {
    const userStore = useUserStore()
    loading.value = true
    try {
      if (!userStore.currentUser) {
        accepted.value = []
        return
      }
      accepted.value = await db.acceptedChallenges
        .where('userId').equals(userStore.currentUser.id)
        .toArray()
    } finally {
      loading.value = false
    }
  }

  /**
   * Accept a challenge. Resolves its window at acceptance time and stores the
   * optional manual baseline (ignored unless the definition allows it). A
   * challenge that is already active for this user is not accepted twice.
   */
  async function accept(challengeId: string, baseline = 0): Promise<AcceptedChallenge | null> {
    const userStore = useUserStore()
    if (!userStore.currentUser) return null

    const def = getDefinition(challengeId)
    if (!def) return null
    if (isActive(challengeId)) return null

    const acceptedAt = new Date().toISOString()
    const { windowStart, windowEnd } = resolveWindow(def.window, acceptedAt)

    const record: AcceptedChallenge = {
      challengeId,
      userId: userStore.currentUser.id,
      acceptedAt,
      windowStart,
      windowEnd,
      baseline: def.allowsBaseline ? Math.max(0, baseline || 0) : 0,
      status: 'active',
    }
    const id = await db.acceptedChallenges.add(record)
    record.id = id as number
    accepted.value.push(record)
    return record
  }

  async function abandon(id: number): Promise<void> {
    const resolvedAt = new Date().toISOString()
    await db.acceptedChallenges.update(id, { status: 'abandoned', resolvedAt })
    const idx = accepted.value.findIndex(c => c.id === id)
    if (idx >= 0) {
      accepted.value[idx] = { ...accepted.value[idx], status: 'abandoned', resolvedAt }
    }
  }

  /** Persist a status resolution computed by the checker. */
  async function resolveStatus(
    id: number,
    status: AcceptedChallenge['status'],
  ): Promise<void> {
    const resolvedAt = new Date().toISOString()
    await db.acceptedChallenges.update(id, { status, resolvedAt })
    const idx = accepted.value.findIndex(c => c.id === id)
    if (idx >= 0) {
      accepted.value[idx] = { ...accepted.value[idx], status, resolvedAt }
    }
  }

  return {
    definitions,
    accepted,
    loading,
    active,
    history,
    activeChallengeIds,
    getDefinition,
    isActive,
    loadAccepted,
    accept,
    abandon,
    resolveStatus,
  }
})
