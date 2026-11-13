import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { useChat } from './hooks/useChat'
import { ChatMessage } from './components/ChatMessage'
import { MessageInput } from './components/MessageInput'
import { Sidebar } from './components/Sidebar'
import { SettingsDialog } from './components/SettingsDialog'
import { ExportButton } from './components/ExportButton'
import { Button } from './components/ui/button'

function App(): React.JSX.Element {
  const {
    conversations,
    currentId,
    messages,
    streaming,
    send,
    stop,
    regenerate,
    newConversation,
    selectConversation,
    removeConversation
  } = useChat()
  const currentTitle = conversations.find((c) => c.id === currentId)?.title ?? '对话'
  const bottomRef = useRef<HTMLDivElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={selectConversation}
        onNew={newConversation}
        onRemove={removeConversation}
      />

      <div className="flex flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <span className="text-sm font-semibold">elchat</span>
          <div className="flex items-center gap-1">
            <ExportButton
              title={currentTitle}
              messages={messages}
              disabled={messages.length === 0 || streaming}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="设置"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center pt-24 text-sm text-muted-foreground">
                开始对话吧，输入消息并按 Enter 发送
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage
                key={m.id}
                message={m}
                onRegenerate={
                  i === messages.length - 1 && m.role === 'assistant' && !m.streaming
                    ? regenerate
                    : undefined
                }
              />
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

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default App
