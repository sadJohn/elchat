import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

// 预置后端模板：一键填充 baseURL + model，Key 仍由用户填写
const PRESETS = [
  {
    name: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-3.6-flash'
  },
  { name: 'OpenAI', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' }
]

function Field({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps): React.JSX.Element | null {
  const [baseURL, setBaseURL] = useState('')
  const [model, setModel] = useState('')
  const [proxy, setProxy] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [masked, setMasked] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setSaved(false)
    setApiKey('')
    void window.api.settings.get().then((s) => {
      setBaseURL(s.baseURL)
      setModel(s.model)
      setProxy(s.proxy)
      setMasked(s.apiKeyMasked)
    })
  }, [open])

  if (!open) return null

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.settings.save({ baseURL, model, proxy, apiKey })
      setSaved(true)
      setApiKey('')
      const s = await window.api.settings.get()
      setMasked(s.apiKeyMasked)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">设置</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.name}
                variant="outline"
                size="sm"
                onClick={() => {
                  setBaseURL(p.baseURL)
                  setModel(p.model)
                }}
              >
                {p.name}
              </Button>
            ))}
          </div>

          <Field label="API Key">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={masked ? `已保存（${masked}），留空不修改` : '粘贴你的 API Key'}
            />
          </Field>
          <Field label="Base URL">
            <Input
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://…/v1"
            />
          </Field>
          <Field label="模型">
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-3.6-flash"
            />
          </Field>
          <Field label="代理（可选）">
            <Input
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              placeholder="http://127.0.0.1:7890"
            />
          </Field>

          {saved && <p className="text-xs text-emerald-600">已保存，即时生效</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
