import type { Week } from '../types/plan'

export interface AIGeneratePlanRequest {
  systemPrompt: string
  userPrompt: string
}

export interface AIGeneratePlanResponse {
  weeks: Week[]
}

export interface AIClientConfig {
  apiKey: string
  proxyUrl?: string
  model?: string
}
