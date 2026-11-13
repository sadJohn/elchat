import { Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import type { Conversation } from '../types'

interface SidebarProps {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRemove: (id: string) => void
}

export function Sidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  onRemove
}: SidebarProps): React.JSX.Element {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/30">
      <div className="flex h-12 items-center justify-between border-b px-3">
        <span className="text-sm font-semibold">会话</span>
        <Button onClick={onNew} variant="ghost" size="icon" aria-label="新建会话">
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">暂无会话</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              'group flex items-center rounded-md',
              c.id === currentId && 'bg-accent'
            )}
          >
            <button
              onClick={() => onSelect(c.id)}
              className="flex-1 truncate rounded-md px-3 py-2 text-left text-sm hover:bg-accent/60"
              title={c.title}
            >
              {c.title}
            </button>
            <button
              onClick={() => onRemove(c.id)}
              className="hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive group-hover:block"
              aria-label="删除会话"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
