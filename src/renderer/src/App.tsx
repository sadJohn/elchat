import { useEffect, useRef, useState } from 'react'
import { Bot, Moon, Settings, Sun } from 'lucide-react'
import { useChat } from './hooks/useChat'
import { useTheme } from './hooks/useTheme'
import { ChatMessage } from './components/ChatMessage'
import { MessageInput } from './components/MessageInput'
import { Sidebar } from './components/Sidebar'
import { SettingsDialog } from './components/SettingsDialog'
import { SystemPromptDialog } from './components/SystemPromptDialog'
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
    removeConversation,
    renameConversation,
    setSystemPrompt
  } = useChat()
  const { theme, toggleTheme } = useTheme()
  const currentConv = conversations.find((c) => c.id === currentId)
  const currentTitle = currentConv?.title ?? '对话'
  const bottomRef = useRef<HTMLDivElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)

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
        onRename={renameConversation}
      />

      <div className="flex flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <span className="text-sm font-semibold">elchat</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="切换主题">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPromptOpen(true)}
              aria-label="系统提示词"
            >
              <Bot className="size-4" />
            </Button>
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
      <SystemPromptDialog
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        initialPrompt={currentConv?.systemPrompt ?? ''}
        onSave={setSystemPrompt}
      />
    </div>
  )
}

export default App
