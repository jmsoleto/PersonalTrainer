import type { UserProfile } from '../types/user'
import type { Exercise } from '../types/exercise'
import type { Week, PlannedExercise } from '../types/plan'
import { callClaude, TruncationError } from './client'
import { buildChunkedSystemPrompt, buildChunkUserPrompt } from './prompts/plan-generation'
import { parsePlanResponse } from './parsers/plan-parser'
import type { ChunkRange } from './prompts/plan-generation'

export interface ChunkProgress {
  currentChunk: number
  totalChunks: number
  weeksCompleted: number
  status: 'generating' | 'retrying' | 'merging'
}

export type ProgressCallback = (progress: ChunkProgress) => void

const CHUNKS: ChunkRange[] = [
  { start: 1, end: 4 },
  { start: 5, end: 8 },
  { start: 9, end: 12 },
]

const MAX_RETRIES = 2

export async function generatePlanChunked(
  profile: UserProfile,
  availableExercises: Exercise[],
  onProgress?: ProgressCallback,
): Promise<Week[]> {
  const systemPrompt = buildChunkedSystemPrompt()
  const allWeeks: Week[] = []
  let previousSummary: string | undefined

  for (let i = 0; i < CHUNKS.length; i++) {
    const chunk = CHUNKS[i]

    onProgress?.({
      currentChunk: i + 1,
      totalChunks: CHUNKS.length,
      weeksCompleted: allWeeks.length,
      status: 'generating',
    })

    const weeks = await generateChunkWithRetry(
      systemPrompt,
      profile,
      availableExercises,
      chunk,
      previousSummary,
      i + 1,
      onProgress,
    )

    allWeeks.push(...weeks)
    previousSummary = buildChunkSummary(weeks)
  }

  // Final merge notification
  onProgress?.({
    currentChunk: CHUNKS.length,
    totalChunks: CHUNKS.length,
    weeksCompleted: 12,
    status: 'merging',
  })

  // Validate final plan has 12 sequential weeks
  if (allWeeks.length !== 12) {
    throw new Error(`Plan generation produced ${allWeeks.length} weeks instead of 12`)
  }

  for (let i = 0; i < 12; i++) {
    if (allWeeks[i].weekNumber !== i + 1) {
      allWeeks[i].weekNumber = i + 1
    }
  }

  return allWeeks
}

async function generateChunkWithRetry(
  systemPrompt: string,
  profile: UserProfile,
  availableExercises: Exercise[],
  chunk: ChunkRange,
  previousSummary: string | undefined,
  chunkNumber: number,
  onProgress?: ProgressCallback,
): Promise<Week[]> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      onProgress?.({
        currentChunk: chunkNumber,
        totalChunks: CHUNKS.length,
        weeksCompleted: (chunkNumber - 1) * 4,
        status: 'retrying',
      })
    }

    try {
      const userPrompt = buildChunkUserPrompt(profile, availableExercises, chunk, previousSummary)
      const response = await callClaude(systemPrompt, userPrompt, { maxTokens: 16000 })
      return parsePlanResponse(response.text, chunk)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))

      // If truncated, try splitting the chunk into two halves
      if (e instanceof TruncationError && chunk.end - chunk.start >= 3) {
        try {
          return await generateChunkInHalves(
            systemPrompt,
            profile,
            availableExercises,
            chunk,
            previousSummary,
          )
        } catch {
          // If halving also fails, continue with retry loop
        }
      }
    }
  }

  throw new Error(
    `Failed to generate weeks ${chunk.start}-${chunk.end} after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
  )
}

async function generateChunkInHalves(
  systemPrompt: string,
  profile: UserProfile,
  availableExercises: Exercise[],
  chunk: ChunkRange,
  previousSummary: string | undefined,
): Promise<Week[]> {
  const mid = Math.floor((chunk.start + chunk.end) / 2)
  const firstHalf: ChunkRange = { start: chunk.start, end: mid }
  const secondHalf: ChunkRange = { start: mid + 1, end: chunk.end }

  // Generate first half
  const firstPrompt = buildChunkUserPrompt(profile, availableExercises, firstHalf, previousSummary)
  const firstResponse = await callClaude(systemPrompt, firstPrompt, { maxTokens: 16000 })
  const firstWeeks = parsePlanResponse(firstResponse.text, firstHalf)

  // Generate second half with summary of first
  const firstSummary = buildChunkSummary(firstWeeks)
  const combinedSummary = previousSummary
    ? `${previousSummary}\n\n${firstSummary}`
    : firstSummary

  const secondPrompt = buildChunkUserPrompt(profile, availableExercises, secondHalf, combinedSummary)
  const secondResponse = await callClaude(systemPrompt, secondPrompt, { maxTokens: 16000 })
  const secondWeeks = parsePlanResponse(secondResponse.text, secondHalf)

  return [...firstWeeks, ...secondWeeks]
}

function buildChunkSummary(weeks: Week[]): string {
  const themes = weeks.map(w => `Semana ${w.weekNumber}: ${w.theme}`)

  // Collect unique exercises used in main workouts
  const exerciseSet = new Set<string>()
  const volumeData: { sets: number; reps: number }[] = []
  const muscleGroups = new Set<string>()

  for (const week of weeks) {
    for (const day of week.days) {
      if (day.session) {
        day.session.targetMuscleGroups.forEach(mg => muscleGroups.add(mg))

        for (const ex of day.session.mainWorkout) {
          exerciseSet.add(`${ex.exerciseId} (${ex.exerciseName})`)
          if (ex.reps) {
            volumeData.push({ sets: ex.sets, reps: ex.reps })
          }
        }
      }
    }
  }

  // Calculate average volume
  const avgSets = volumeData.length > 0
    ? Math.round(volumeData.reduce((s, v) => s + v.sets, 0) / volumeData.length)
    : 3
  const avgReps = volumeData.length > 0
    ? Math.round(volumeData.reduce((s, v) => s + v.reps, 0) / volumeData.length)
    : 10

  // Detect training split pattern
  const splitDays: string[] = []
  const firstWeek = weeks[0]
  if (firstWeek) {
    for (const day of firstWeek.days) {
      if (day.session && day.dayType === 'training') {
        splitDays.push(day.session.targetMuscleGroups.join('/'))
      }
    }
  }

  return `### Semanas ${weeks[0]?.weekNumber}-${weeks[weeks.length - 1]?.weekNumber}
- Temas: ${themes.join('; ')}
- Patron de entrenamiento: ${splitDays.join(' | ')}
- Grupos musculares trabajados: ${Array.from(muscleGroups).join(', ')}
- Ejercicios principales usados: ${Array.from(exerciseSet).slice(0, 15).join(', ')}
- Volumen promedio: ${avgSets} series x ${avgReps} repeticiones
- Ultima semana del bloque: Semana ${weeks[weeks.length - 1]?.weekNumber}`
}
