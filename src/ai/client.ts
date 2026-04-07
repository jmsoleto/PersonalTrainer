import type { AIClientConfig } from './types'

let config: AIClientConfig | null = null

export function configureAI(cfg: AIClientConfig): void {
  config = cfg
}

export function getAIConfig(): AIClientConfig | null {
  return config
}

export interface ClaudeResponse {
  text: string
  stopReason: string
  usage: { inputTokens: number; outputTokens: number }
}

export class TruncationError extends Error {
  partialText: string
  constructor(partialText: string) {
    super('Response truncated (max_tokens reached)')
    this.name = 'TruncationError'
    this.partialText = partialText
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, init)

    if (response.status === 429 && attempt < maxRetries) {
      const waitMs = Math.pow(2, attempt) * 1000 // 1s, 2s
      await new Promise(r => setTimeout(r, waitMs))
      lastError = new Error(`Rate limited (429)`)
      continue
    }

    return response
  }

  throw lastError ?? new Error('Request failed after retries')
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number },
): Promise<ClaudeResponse> {
  if (!config) {
    throw new Error('AI client not configured. Set your API key in Settings.')
  }

  const baseUrl = config.proxyUrl || 'https://api.anthropic.com'
  const model = config.model || 'claude-sonnet-4-20250514'
  const maxTokens = options?.maxTokens ?? 16000

  const response = await fetchWithRetry(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  const content = data.content?.[0]

  if (content?.type !== 'text') {
    throw new Error('Unexpected response format from Claude API')
  }

  // Check for truncation
  if (data.stop_reason === 'max_tokens') {
    throw new TruncationError(content.text)
  }

  return {
    text: content.text,
    stopReason: data.stop_reason ?? 'unknown',
    usage: {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    },
  }
}
