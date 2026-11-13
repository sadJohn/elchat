import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from './ui/button'
import { toMarkdown, toJson } from '@/lib/export'
import type { Message } from '../types'

interface ExportButtonProps {
  title: string
  messages: Message[]
  disabled?: boolean
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || '对话'
}

export function ExportButton({ title, messages, disabled }: ExportButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  const save = async (format: 'markdown' | 'json'): Promise<void> => {
    setOpen(false)
    const base = safeFileName(title)
    if (format === 'markdown') {
      await window.api.export.save({
        content: toMarkdown(title, messages),
        defaultName: `${base}.md`,
        filterName: 'Markdown',
        extensions: ['md']
      })
    } else {
      await window.api.export.save({
        content: toJson(title, messages),
        defaultName: `${base}.json`,
        filterName: 'JSON',
        extensions: ['json']
      })
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="导出对话"
      >
        <Download className="size-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border bg-background p-1 shadow-lg">
            <button
              onClick={() => save('markdown')}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              导出为 Markdown
            </button>
            <button
              onClick={() => save('json')}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              导出为 JSON
            </button>
          </div>
        </>
      )}
    </div>
  )
}
