import OpenAI, { APIError } from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart
} from 'openai/resources/chat/completions'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { loadConfig } from '../config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: string[]
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
        return 'API Key 无效或已过期，请在设置中检查'
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
    // 带图片的用户消息转成 OpenAI 多模态 content 数组（text + image_url）
    const apiMessages: ChatCompletionMessageParam[] = messages.map(
      (m): ChatCompletionMessageParam => {
        if (m.role === 'user' && m.images && m.images.length > 0) {
          const parts: ChatCompletionContentPart[] = [
            { type: 'text', text: m.content },
            ...m.images.map((url): ChatCompletionContentPart => ({
              type: 'image_url',
              image_url: { url }
            }))
          ]
          return { role: 'user', content: parts }
        }
        return { role: m.role, content: m.content }
      }
    )

    const stream = await getClient().chat.completions.create(
      {
        model,
        messages: apiMessages,
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
