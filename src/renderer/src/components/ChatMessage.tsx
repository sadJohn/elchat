import type { Message } from '../types'
import { Markdown } from './Markdown'
import { cn } from '@/lib/utils'

export function ChatMessage({ message }: { message: Message }): React.JSX.Element {
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
    <div className="flex justify-start">
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
    </div>
  )
}
