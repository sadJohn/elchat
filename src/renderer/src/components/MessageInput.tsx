import { useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Send, Square } from 'lucide-react'

interface MessageInputProps {
  streaming: boolean
  onSend: (text: string) => void
  onStop: () => void
}

export function MessageInput({ streaming, onSend, onStop }: MessageInputProps): React.JSX.Element {
  const [text, setText] = useState('')

  const submit = (): void => {
    const value = text.trim()
    if (!value) return
    onSend(value)
    setText('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming) submit()
    }
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="输入消息…（Enter 发送，Shift+Enter 换行）"
        rows={1}
        className="min-h-12 flex-1 resize-none"
      />
      {streaming ? (
        <Button onClick={onStop} variant="outline" size="icon" aria-label="停止生成">
          <Square className="size-4" />
        </Button>
      ) : (
        <Button onClick={submit} size="icon" disabled={!text.trim()} aria-label="发送">
          <Send className="size-4" />
        </Button>
      )}
    </div>
  )
}
