import type { AIClientConfig } from './types'

let config: AIClientConfig | null = null

export function configureAI(cfg: AIClientConfig): void {
  config = cfg
}

export function getAIConfig(): AIClientConfig | null {
  return config
}

export async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!config) {
    throw new Error('AI client not configured. Set your API key in Settings.')
  }

  const baseUrl = config.proxyUrl || 'https://api.anthropic.com'
  const model = config.model || 'claude-sonnet-4-20250514'

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
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

  return content.text
}
