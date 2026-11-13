import { useCallback, useEffect, useRef, useState } from 'react'
import type { Conversation, Message } from '../types'

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function toMessages(rows: Array<{ id: string; role: 'user' | 'assistant'; content: string }>): Message[] {
  return rows.map((m) => ({ id: m.id, role: m.role, content: m.content }))
}

interface UseChatResult {
  conversations: Conversation[]
  currentId: string | null
  messages: Message[]
  streaming: boolean
  send: (text: string) => void
  stop: () => void
  newConversation: () => void
  selectConversation: (id: string) => void
  removeConversation: (id: string) => void
}

export function useChat(): UseChatResult {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const streamIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  const refreshConversations = useCallback(async (): Promise<void> => {
    setConversations(await window.api.conversations.list())
  }, [])

  // 订阅主进程推送的流式事件
  useEffect(() => {
    const offDelta = window.api.chat.onDelta(({ streamId, content }) => {
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
      void refreshConversations()
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
  }, [refreshConversations])

  // 初始化：加载会话列表，恢复最近会话或新建
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    void (async () => {
      const list = await window.api.conversations.list()
      setConversations(list)
      if (list.length > 0) {
        const first = list[0]
        setCurrentId(first.id)
        setMessages(toMessages(await window.api.conversations.messages(first.id)))
      } else {
        const conv = await window.api.conversations.create()
        setConversations([conv])
        setCurrentId(conv.id)
      }
    })()
  }, [])

  const newConversation = useCallback(async (): Promise<void> => {
    if (streaming) return
    const conv = await window.api.conversations.create()
    setConversations((prev) => [conv, ...prev])
    setCurrentId(conv.id)
    setMessages([])
  }, [streaming])

  const selectConversation = useCallback(
    async (id: string): Promise<void> => {
      if (streaming || id === currentId) return
      setCurrentId(id)
      setMessages(toMessages(await window.api.conversations.messages(id)))
    },
    [streaming, currentId]
  )

  const removeConversation = useCallback(
    async (id: string): Promise<void> => {
      await window.api.conversations.remove(id)
      const rest = conversations.filter((c) => c.id !== id)
      setConversations(rest)

      if (currentId === id) {
        if (rest.length > 0) {
          setCurrentId(rest[0].id)
          setMessages(toMessages(await window.api.conversations.messages(rest[0].id)))
        } else {
          const conv = await window.api.conversations.create()
          setConversations([conv])
          setCurrentId(conv.id)
          setMessages([])
        }
      }
    },
    [conversations, currentId]
  )

  const send = useCallback(
    (text: string): void => {
      const trimmed = text.trim()
      if (!trimmed || streaming || !currentId) return

      const userMsg: Message = { id: uid(), role: 'user', content: trimmed }
      const assistantMsg: Message = { id: uid(), role: 'assistant', content: '', streaming: true }
      setMessages((prev) => [...prev, userMsg, assistantMsg])

      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))

      setStreaming(true)
      window.api.chat
        .start({ conversationId: currentId, messages: history })
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
    [messages, streaming, currentId]
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

  return {
    conversations,
    currentId,
    messages,
    streaming,
    send,
    stop,
    newConversation,
    selectConversation,
    removeConversation
  }
}
