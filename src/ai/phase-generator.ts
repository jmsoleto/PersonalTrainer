import type { UserProfile } from '../types/user'
import type { Exercise } from '../types/exercise'
import type { Week } from '../types/plan'
import type { SystemMessage } from './client'
import { callClaude } from './client'
import {
  buildPhaseSystemPrompt,
  buildPhaseCatalogMessage,
  buildPhaseUserPrompt,
  type PlanParams,
} from './prompts/phase-plan-generation'
import { parsePhasePlanResponse, transformPhasesToWeeks } from './parsers/phase-plan-transformer'

export type { PlanParams }

export async function generatePlanFromPhases(
  profile: UserProfile,
  availableExercises: Exercise[],
  params: PlanParams,
  onProgress?: (status: string) => void,
): Promise<Week[]> {
  onProgress?.('Preparando catálogo de ejercicios...')

  const system: SystemMessage[] = [
    { type: 'text', text: buildPhaseSystemPrompt() },
    buildPhaseCatalogMessage(availableExercises),
  ]

  const userPrompt = buildPhaseUserPrompt(profile, params)

  onProgress?.('Generando plan con IA...')

  const response = await callClaude(system, userPrompt, { maxTokens: 12000 })

  onProgress?.('Procesando respuesta...')

  const phaseOutput = parsePhasePlanResponse(response.text)
  const weeks = transformPhasesToWeeks(phaseOutput, availableExercises, params.daysPerWeek)

  if (weeks.length === 0) {
    throw new Error('El plan generado no contiene semanas')
  }

  // Log cache stats in development
  const { cacheCreationTokens, cacheReadTokens, inputTokens, outputTokens } = response.usage
  console.info(
    `[AI] Tokens — input: ${inputTokens}, output: ${outputTokens}, ` +
    `cache_creation: ${cacheCreationTokens}, cache_read: ${cacheReadTokens}`,
  )

  return weeks
}
