import type { AIClientConfig } from './types'

let config: AIClientConfig | null = null

export function configureAI(cfg: AIClientConfig): void {
  config = cfg
}

export function getAIConfig(): AIClientConfig | null {
  return config
}

export interface SystemMessage {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

export interface ClaudeResponse {
  text: string
  stopReason: string
  usage: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
  }
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

/**
 * Reads a streaming SSE response and reconstructs the full text + metadata.
 * Streaming keeps the connection alive so the browser doesn't timeout on long generations.
 */
async function readStream(response: Response): Promise<ClaudeResponse> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Response body is not readable')
  }

  const decoder = new TextDecoder()
  let fullText = ''
  let stopReason = 'unknown'
  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationTokens = 0
  let cacheReadTokens = 0
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE lines
    const lines = buffer.split('\n')
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const event = JSON.parse(data)

        switch (event.type) {
          case 'content_block_delta':
            if (event.delta?.type === 'text_delta') {
              fullText += event.delta.text
            }
            break

          case 'message_delta':
            if (event.delta?.stop_reason) {
              stopReason = event.delta.stop_reason
            }
            if (event.usage) {
              outputTokens = event.usage.output_tokens ?? outputTokens
            }
            break

          case 'message_start':
            if (event.message?.usage) {
              inputTokens = event.message.usage.input_tokens ?? 0
              cacheCreationTokens = event.message.usage.cache_creation_input_tokens ?? 0
              cacheReadTokens = event.message.usage.cache_read_input_tokens ?? 0
            }
            break
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  if (stopReason === 'max_tokens') {
    throw new TruncationError(fullText)
  }

  return {
    text: fullText,
    stopReason,
    usage: { inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens },
  }
}

export async function callClaude(
  system: string | SystemMessage[],
  userPrompt: string,
  options?: { maxTokens?: number },
): Promise<ClaudeResponse> {
  if (!config) {
    throw new Error('AI client not configured. Set your API key in Settings.')
  }

  const baseUrl = config.proxyUrl || 'https://api.anthropic.com'
  const model = config.model || 'claude-sonnet-4-6'
  const maxTokens = options?.maxTokens ?? 16000
  const usesCaching = Array.isArray(system)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }

  if (usesCaching) {
    headers['anthropic-beta'] = 'prompt-caching-2024-07-31'
  }

  const response = await fetchWithRetry(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error (${response.status}): ${error}`)
  }

  return readStream(response)
}
