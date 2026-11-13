import type { Message } from '../types'
import { Markdown } from './Markdown'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: Message
  onRegenerate?: () => void
}

export function ChatMessage({ message, onRegenerate }: ChatMessageProps): React.JSX.Element {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
          message.error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
        )}
      >
        {message.error ? (
          <p>{message.error}</p>
        ) : message.content ? (
          <>
            <Markdown content={message.content} />
            {message.streaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-current align-text-bottom" />
            )}
          </>
        ) : message.streaming ? (
          <span className="text-muted-foreground">思考中…</span>
        ) : null}
      </div>

      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <RefreshCw className="size-3.5" />
          {message.error ? '重试' : '重新生成'}
        </Button>
      )}
    </div>
  )
}
