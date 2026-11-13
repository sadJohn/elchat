import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

const PRESETS = [
  { name: '默认助手', prompt: '' },
  {
    name: '资深程序员',
    prompt:
      '你是一位资深软件工程师，回答技术问题时给出清晰、准确、可执行的方案，并解释关键设计取舍。'
  },
  {
    name: '中文翻译',
    prompt:
      '你是一名专业翻译，把用户输入翻译成地道的中文；若输入已是中文，则翻译成英文。只输出译文。'
  },
  {
    name: '写作助手',
    prompt: '你是一名写作助手，帮助用户润色、扩写、精简文字，风格清晰自然。'
  }
]

interface SystemPromptDialogProps {
  open: boolean
  onClose: () => void
  initialPrompt: string
  onSave: (prompt: string) => Promise<void>
}

export function SystemPromptDialog({
  open,
  onClose,
  initialPrompt,
  onSave
}: SystemPromptDialogProps): React.JSX.Element | null {
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setPrompt(initialPrompt)
  }, [open, initialPrompt])

  if (!open) return null

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await onSave(prompt.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">系统提示词</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
            <X className="size-4" />
          </Button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          设定 AI 的角色与行为，仅对当前会话生效。留空则使用默认。
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.name} variant="outline" size="sm" onClick={() => setPrompt(p.prompt)}>
              {p.name}
            </Button>
          ))}
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：你是一位资深前端工程师…"
          rows={6}
          className="resize-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
