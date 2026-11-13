import OpenAI, { APIError } from 'openai'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { loadConfig } from '../config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamHandlers {
  onDelta: (text: string) => void
  onDone: (fullText: string) => void
  onError: (message: string) => void
}

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const { apiKey, baseURL, proxy } = loadConfig()

    if (proxy) {
      client = new OpenAI({
        apiKey,
        baseURL,
        // undici 与标准 fetch 运行时兼容，仅类型声明有差异
        fetch: undiciFetch as never,
        fetchOptions: {
          dispatcher: new ProxyAgent(proxy)
        }
      })
    } else {
      client = new OpenAI({ apiKey, baseURL })
    }
  }
  return client
}

export function resetClient(): void {
  client = null
}

export function friendlyError(err: unknown): string {
  if (err instanceof APIError) {
    switch (err.status) {
      case 401:
        return 'API Key 无效或已过期，请检查 config.json 中的 apiKey'
      case 402:
        return '账户余额不足（402）'
      case 429:
        return '请求过于频繁或额度不足（429）'
      default:
        if (err.status >= 500) return `服务端错误（${err.status}），请稍后重试`
        return err.message || `请求失败（${err.status}）`
    }
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return '已停止生成'
  }
  return err instanceof Error ? err.message : String(err)
}

export async function streamChat(
  messages: ChatMessage[],
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<void> {
  const { model } = loadConfig()
  try {
    const stream = await getClient().chat.completions.create(
      {
        model,
        messages,
        stream: true
      },
      { signal }
    )

    let full = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        full += delta
        handlers.onDelta(delta)
      }
    }
    handlers.onDone(full)
  } catch (err) {
    handlers.onError(friendlyError(err))
  }
}
