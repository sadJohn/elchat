import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message } from '../types'

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface UseChatResult {
  messages: Message[]
  streaming: boolean
  send: (text: string) => void
  stop: () => void
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const streamIdRef = useRef<string | null>(null)

  useEffect(() => {
    const offDelta = window.api.chat.onDelta(({ streamId, content }) => {
      // 绑定首个到达的流，避免与 start 返回的 streamId 产生竞态
      if (streamIdRef.current !== null && streamIdRef.current !== streamId) return
      streamIdRef.current = streamId
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (!last || last.role !== 'assistant' || !last.streaming) return prev
        const next = prev.slice()
        next[next.length - 1] = { ...last, content: last.content + content }
        return next
      })
    })

    const offDone = window.api.chat.onDone(({ streamId }) => {
      if (streamIdRef.current !== streamId) return
      streamIdRef.current = null
      setStreaming(false)
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (!last || !last.streaming) return prev
        const next = prev.slice()
        next[next.length - 1] = { ...last, streaming: false }
        return next
      })
    })

    const offError = window.api.chat.onError(({ streamId, error }) => {
      if (streamIdRef.current !== streamId) return
      streamIdRef.current = null
      setStreaming(false)
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (!last || !last.streaming) return prev
        const next = prev.slice()
        next[next.length - 1] = { ...last, streaming: false, error }
        return next
      })
    })

    return () => {
      offDelta()
      offDone()
      offError()
    }
  }, [])

  const send = useCallback(
    (text: string): void => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return

      const userMsg: Message = { id: uid(), role: 'user', content: trimmed }
      const assistantMsg: Message = { id: uid(), role: 'assistant', content: '', streaming: true }
      setMessages((prev) => [...prev, userMsg, assistantMsg])

      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))

      setStreaming(true)
      window.api.chat
        .start(history)
        .then((streamId) => {
          if (streamIdRef.current === null) streamIdRef.current = streamId
        })
        .catch((err: unknown) => {
          setStreaming(false)
          const message = err instanceof Error ? err.message : String(err)
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (!last || !last.streaming) return prev
            const next = prev.slice()
            next[next.length - 1] = { ...last, streaming: false, error: message }
            return next
          })
        })
    },
    [messages, streaming]
  )

  const stop = useCallback((): void => {
    if (streamIdRef.current !== null) {
      window.api.chat.abort(streamIdRef.current)
      streamIdRef.current = null
    }
    setStreaming(false)
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (!last || !last.streaming) return prev
      const next = prev.slice()
      next[next.length - 1] = { ...last, streaming: false }
      return next
    })
  }, [])

  return { messages, streaming, send, stop }
}
