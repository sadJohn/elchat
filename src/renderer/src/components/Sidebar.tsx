import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import type { Conversation } from '../types'

interface SidebarProps {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRemove: (id: string) => void
  onRename: (id: string, title: string) => void
}

export function Sidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  onRemove,
  onRename
}: SidebarProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startRename = (c: Conversation): void => {
    setEditingId(c.id)
    setEditValue(c.title)
  }

  const commitRename = (id: string): void => {
    const value = editValue.trim()
    if (value) onRename(id, value)
    setEditingId(null)
  }

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
            className={cn('group flex items-center rounded-md', c.id === currentId && 'bg-accent')}
          >
            {editingId === c.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(c.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onBlur={() => commitRename(c.id)}
                className="mx-1 flex-1 rounded-md border bg-background px-2 py-1 text-sm outline-none"
              />
            ) : (
              <button
                onClick={() => onSelect(c.id)}
                onDoubleClick={() => startRename(c)}
                className="flex-1 truncate rounded-md px-3 py-2 text-left text-sm hover:bg-accent/60"
                title={c.title}
              >
                {c.title}
              </button>
            )}
            <button
              onClick={() => startRename(c)}
              className="hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground group-hover:block"
              aria-label="重命名会话"
            >
              <Pencil className="size-3.5" />
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
