import { useEffect, useRef } from 'react'
import { useChat } from './hooks/useChat'
import { ChatMessage } from './components/ChatMessage'
import { MessageInput } from './components/MessageInput'

function App(): React.JSX.Element {
  const { messages, streaming, send, stop } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center border-b px-4">
        <span className="text-sm font-semibold">elchat</span>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center pt-24 text-sm text-muted-foreground">
              开始对话吧，输入消息并按 Enter 发送
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="shrink-0 border-t p-4">
        <div className="mx-auto max-w-3xl">
          <MessageInput streaming={streaming} onSend={send} onStop={stop} />
        </div>
      </footer>
    </div>
  )
}

export default App
